/**
 * 1971 Milton Bradley "Voice of the Mummy" — Multi-Transport Real-Time Multiplayer Manager (GitHub Pages Ready)
 *
 * Uses a 3-Layer Hybrid Transport so invites & room joins work 100% reliably across iPhones, cellular 5G/LTE,
 * Wi-Fi routers, background app-switching (e.g. switching to Messages to text the link), and page refreshes:
 *   1. Secure WebSocket Pub/Sub (MQTT over WSS via broker.emqx.io + broker.hivemq.com) with Retained State
 *      — never blocked by cellular Symmetric CGNAT and persists room/guest state while Host is in the Messages app!
 *   2. PeerJS WebRTC DataChannels (with Google STUN + OpenRelay TURN servers & auto-reconnect)
 *   3. BroadcastChannel for zero-latency multi-tab testing on the same device.
 */

import { pickAdventurerNames } from './board_data.js?v=38';

const PEER_PREFIX = 'votm1971-tomb-';
const MQTT_TOPIC_PREFIX = 'votm1971/v38/room';
const STORAGE_HOST_KEY = 'votm1971_active_host_session_v38';
const STORAGE_GUEST_PREFIX = 'votm1971_guest_session_v38_';
const STORAGE_PEER_ID_KEY = 'votm1971_my_peer_id_v38';

const WSS_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
};

export class MultiplayerManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // { onLobbyUpdate, onGameState, onGameEvent, onPlayerAction, onStatusChange, onGuestJoined }
    this.mode = 'local'; // 'local' | 'host' | 'guest'
    this.roomCode = null;
    this.myPeerId = this._loadOrCreatePeerId();
    this.peer = null;
    this.connections = new Map(); // guestPeerId -> DataConnection (Host only)
    this.hostConn = null; // DataConnection to Host (Guest only)
    this.outboundQueue = []; // Queued packets while Guest DataConnection is opening
    this.bc = null; // BroadcastChannel for same-device multi-tab sync
    this.mqttClients = []; // Active MQTT-over-WSS clients
    this.processedMsgIds = new Set(); // Deduplication across Hybrid Transports
    this.dispatchedEventIds = new Set(); // Secondary deduplication for GAME_EVENT callbacks
    this.guestJoinPayload = null; // Saved Guest join info for auto-reannounce on reconnect
    this.knownGuestClaims = new Map(); // peerId -> { playerName, preferredSeatId, claimedAt }
    this.isConfirmedByHost = false; // True only when Host's authoritative LOBBY_STATE includes our peerId
    this.highestHostRevision = 0; // Prevents slower MQTT brokers from overwriting newer LOBBY_STATE snapshots
    this.lastPublishedGameState = null;
    this.heartbeatTimer = null;

    const initialNames = pickAdventurerNames(4);
    this.lobbyState = {
      roomCode: null,
      hostPeerId: null,
      seats: [
        { id: 'blue', name: initialNames[0], control: 'human', peerId: 'local', ageEven: true, rightHanded: true },
        { id: 'red', name: initialNames[1], control: 'ai', peerId: null, ageEven: false, rightHanded: true },
        { id: 'yellow', name: initialNames[2], control: 'ai', peerId: null, ageEven: true, rightHanded: false },
        { id: 'green', name: initialNames[3], control: 'none', peerId: null, ageEven: false, rightHanded: true },
      ],
      connectedPeers: [],
    };

    this._bindLifecycleAutoReconnect();
  }

  _loadOrCreatePeerId() {
    try {
      let existing = sessionStorage.getItem(STORAGE_PEER_ID_KEY);
      if (!existing) {
        existing = `client-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(STORAGE_PEER_ID_KEY, existing);
      }
      return existing;
    } catch (e) {
      return `client-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  _makeMsgId() {
    return `${this.myPeerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  _isDuplicateMsg(msg) {
    if (!msg || !msg.msgId) return false;
    if (this.processedMsgIds.has(msg.msgId)) return true;
    this.processedMsgIds.add(msg.msgId);
    if (this.processedMsgIds.size > 600) {
      const first = this.processedMsgIds.values().next().value;
      this.processedMsgIds.delete(first);
    }
    return false;
  }

  /**
   * Automatically reconnects & syncs room state when user switches back from Messages app on iPhone/Mac
   * or when network connectivity resumes.
   */
  _bindLifecycleAutoReconnect() {
    const onWake = () => {
      if (this.mode === 'host' || this.mode === 'guest') {
        this.refreshRoomSync();
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onWake();
      }
    });
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    window.addEventListener('online', onWake);
  }

  /**
   * Actively pings / resyncs the room without losing the Host or Guest session.
   */
  refreshRoomSync() {
    if (!this.roomCode || this.mode === 'local') return;

    // 1. Reconnect PeerJS signaling if iOS Safari suspended it in background
    if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
      try {
        this.peer.reconnect();
      } catch (e) {
        // Ignore
      }
    }

    // 2. Ensure WSS MQTT brokers are connected and re-subscribed after background wake
    if (this.mqttClients.length === 0) {
      this._setupMqttBrokers(this.roomCode);
    } else {
      const baseTopic = `${MQTT_TOPIC_PREFIX}/${this.roomCode}`;
      for (const client of this.mqttClients) {
        if (client && !client.connected && typeof client.reconnect === 'function') {
          try {
            client.reconnect();
          } catch (e) {
            // Ignore
          }
        } else if (client && client.connected) {
          try {
            if (this.mode === 'host') {
              client.subscribe([`${baseTopic}/to-host`, `${baseTopic}/guest/+`], { qos: 1 });
            } else if (this.mode === 'guest') {
              client.subscribe(
                [`${baseTopic}/lobby`, `${baseTopic}/gamestate`, `${baseTopic}/events`, `${baseTopic}/guest/+`],
                { qos: 1 }
              );
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // 3. Re-announce state or request sync
    if (this.mode === 'host') {
      // Wait 450ms after re-subscribing so any retained /guest/+ seat claims sent while Host was in the Messages app
      // are processed BEFORE Host publishes a new retained LOBBY_STATE!
      setTimeout(() => {
        if (this.mode === 'host') {
          this._broadcastLobby();
          if (this.lastPublishedGameState) {
            this.broadcastGameState(this.lastPublishedGameState);
          }
        }
      }, 450);
    } else if (this.mode === 'guest') {
      if (this.guestJoinPayload) {
        this.sendToHost({
          type: 'JOIN_REQUEST',
          peerId: this.myPeerId,
          playerName: this.guestJoinPayload.playerName,
          preferredSeatId: this.guestJoinPayload.preferredSeatId,
        });
        this._publishRetainedGuestSeat(this.guestJoinPayload);
      } else {
        this.sendToHost({
          type: 'LOBBY_PREVIEW_REQUEST',
          peerId: this.myPeerId,
        });
      }
    }
  }

  async _ensurePeerJS() {
    if (window.Peer) return window.Peer;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      script.onload = () => resolve(window.Peer || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  async _ensureMqttJS() {
    if (window.mqtt) return window.mqtt;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mqtt@5.3.4/dist/mqtt.min.js';
      script.onload = () => resolve(window.mqtt || null);
      script.onerror = () => {
        const fallback = document.createElement('script');
        fallback.src = 'https://unpkg.com/mqtt@5.3.4/dist/mqtt.min.js';
        fallback.onload = () => resolve(window.mqtt || null);
        fallback.onerror = () => resolve(null);
        document.head.appendChild(fallback);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Saves the active Host room in localStorage and updates the URL (?room=TOMB-XXXX&host=1)
   * so clicking Browser Refresh NEVER erases the Host's room or connected players!
   */
  saveHostSession(extra = {}) {
    if (this.mode !== 'host' || !this.roomCode) return;
    try {
      const existingRaw = localStorage.getItem(STORAGE_HOST_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const payload = {
        roomCode: this.roomCode,
        hostPeerId: this.myPeerId,
        lobbyState: this.lobbyState,
        mpGameStarted: extra.mpGameStarted !== undefined ? extra.mpGameStarted : Boolean(existing.mpGameStarted),
        gameState: extra.gameState !== undefined ? extra.gameState : (this.lastPublishedGameState || existing.gameState || null),
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_HOST_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignore storage quota errors
    }
  }

  getSavedHostSession(expectedRoomCode = null) {
    try {
      const raw = localStorage.getItem(STORAGE_HOST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.roomCode || !data.lobbyState) return null;
      // Expire after 12 hours
      if (Date.now() - (data.savedAt || 0) > 12 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_HOST_KEY);
        return null;
      }
      if (expectedRoomCode && data.roomCode.toUpperCase() !== expectedRoomCode.toUpperCase()) {
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  clearSavedHostSession() {
    try {
      localStorage.removeItem(STORAGE_HOST_KEY);
      if (this.roomCode) {
        sessionStorage.removeItem(`${STORAGE_GUEST_PREFIX}${this.roomCode.toUpperCase()}`);
      }
      const url = new URL(window.location.href);
      const mpParams = ['room', 'host', 'hs', 'hn', 'hc', 'ai'];
      let changed = false;
      for (const p of mpParams) {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      // Ignore
    }
  }

  saveGuestSession(roomCode, guestInfo) {
    if (!roomCode) return;
    try {
      sessionStorage.setItem(
        `${STORAGE_GUEST_PREFIX}${roomCode.toUpperCase()}`,
        JSON.stringify({
          ...guestInfo,
          peerId: this.myPeerId,
          savedAt: Date.now(),
        })
      );
    } catch (e) {
      // Ignore
    }
  }

  getSavedGuestSession(roomCode) {
    if (!roomCode) return null;
    try {
      const raw = sessionStorage.getItem(`${STORAGE_GUEST_PREFIX}${roomCode.toUpperCase()}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Restores an active Host room after the Host clicks Browser Refresh!
   */
  async resumeHostRoom(savedSession) {
    if (!savedSession || !savedSession.roomCode) return null;
    this.disconnect(false);
    this.mode = 'host';
    this.roomCode = savedSession.roomCode;
    if (savedSession.hostPeerId) {
      this.myPeerId = savedSession.hostPeerId;
      try {
        sessionStorage.setItem(STORAGE_PEER_ID_KEY, this.myPeerId);
      } catch (e) {
        // Ignore
      }
    }
    this.lobbyState = savedSession.lobbyState;
    this.lobbyState.roomCode = this.roomCode;
    this.lobbyState.hostPeerId = this.myPeerId;
    this.lastPublishedGameState = savedSession.gameState || null;

    this._updateBrowserUrlForHost(this.roomCode);
    this.saveHostSession({
      mpGameStarted: Boolean(savedSession.mpGameStarted),
      gameState: this.lastPublishedGameState,
    });

    this._setupBroadcastChannel(this.roomCode);
    this._setupMqttBrokers(this.roomCode);
    this._startHeartbeat();
    this._emitStatus(`✅ Restored Room ${this.roomCode} — Waiting for Players / Syncing...`);
    this._broadcastLobby();

    this._initHostPeerJS(this.roomCode);
    return this.roomCode;
  }

  _updateBrowserUrlForHost(roomCode) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      url.searchParams.set('host', '1');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Generates a 4-digit Room Code and initializes Host mode with the Host's chosen Explorer seat & player count.
   */
  async hostRoom(playerName = '', options = {}) {
    const preferredSeatId = options.preferredSeatId || 'blue';
    const humanCount = Math.max(2, Math.min(4, Number(options.humanCount) || 2));
    const fillWithAi = options.fillWithAi !== undefined ? Boolean(options.fillWithAi) : true;

    this.disconnect(false);
    this.mode = 'host';
    const num = Math.floor(1000 + Math.random() * 9000);
    this.roomCode = `TOMB-${num}`;
    this.lobbyState.roomCode = this.roomCode;
    this.lobbyState.hostPeerId = this.myPeerId;
    this.lastPublishedGameState = null;

    const cleanHostInput = (playerName || '').trim();
    const isGenericHost = !cleanHostInput || /^(Host\s+Explorer|Explorer\s*\d*|Player\s*\d*)$/i.test(cleanHostInput);
    const resolvedHostName = isGenericHost ? pickAdventurerNames(1)[0] : cleanHostInput;
    const usedNames = [resolvedHostName];

    let openHumanFriendsToAssign = humanCount - 1;
    // First configure Host's preferred seat
    for (const s of this.lobbyState.seats) {
      if (s.id === preferredSeatId) {
        s.control = 'human';
        s.peerId = this.myPeerId;
        s.name = resolvedHostName;
      }
    }
    // Configure remaining seats in order
    for (const s of this.lobbyState.seats) {
      if (s.id === preferredSeatId) continue;
      if (openHumanFriendsToAssign > 0) {
        s.control = 'human';
        s.peerId = null;
        s.name = 'Waiting for Friend...';
        openHumanFriendsToAssign--;
      } else if (fillWithAi) {
        const botName = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(botName);
        s.control = 'ai';
        s.peerId = null;
        s.name = botName;
      } else {
        const unusedName = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(unusedName);
        s.control = 'none';
        s.peerId = null;
        s.name = unusedName;
      }
    }

    this._updateBrowserUrlForHost(this.roomCode);
    this.saveHostSession({ mpGameStarted: false, gameState: null });

    this._setupBroadcastChannel(this.roomCode);
    this._setupMqttBrokers(this.roomCode);
    this._startHeartbeat();
    this._emitStatus(`✅ Room ${this.roomCode} Ready — Copy or Send the Invite Link to your friends!`);
    this._broadcastLobby();

    this._initHostPeerJS(this.roomCode);
    return this.roomCode;
  }

  async _initHostPeerJS(roomCode) {
    const PeerClass = await this._ensurePeerJS();
    if (!PeerClass || this.mode !== 'host' || this.roomCode !== roomCode) return;

    const fullPeerId = `${PEER_PREFIX}${roomCode}`;
    try {
      this.peer = new PeerClass(fullPeerId, PEER_CONFIG);

      this.peer.on('open', () => {
        this._emitStatus(`✅ Room ${this.roomCode} Ready — Copy or Send the Invite Link to your friends!`);
        this._broadcastLobby();
      });

      this.peer.on('connection', (conn) => {
        this._handleIncomingPeerConnection(conn);
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          setTimeout(() => {
            try {
              this.peer.reconnect();
            } catch (e) {
              // Ignore
            }
          }, 1000);
        }
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Host notice (WSS Pub/Sub backup is active):', err?.type || err);
        this._emitStatus(`✅ Room ${this.roomCode} Live — Ready for Friends to Join!`);
      });
    } catch (e) {
      console.warn('PeerJS Host init fallback to WSS:', e);
    }
  }

  /**
   * Seeds the Guest's initial lobbyState from the Invite URL query parameters (?hs=red&hn=Daryl&hc=2&ai=1)
   * at 0ms on page load so the Host's chosen color piece is IMMEDIATELY shown as Taken even before
   * the live WebSocket/WebRTC packet arrives!
   */
  seedLobbyFromUrlParams({ roomCode, hostSeatId, hostName, humanCount, fillWithAi }) {
    if (!hostSeatId) return;
    const hCount = Math.max(2, Math.min(4, Number(humanCount) || 2));
    const useAi = fillWithAi !== undefined ? Boolean(fillWithAi) : true;
    const resolvedHostName = (hostName || '').trim() || 'Host';
    const usedNames = [resolvedHostName];
    let openHumanFriends = hCount - 1;

    this.lobbyState.roomCode = roomCode || this.roomCode;
    for (const s of this.lobbyState.seats) {
      if (s.id === hostSeatId) {
        s.control = 'human';
        s.peerId = 'host-seeded';
        s.name = resolvedHostName;
      }
    }
    for (const s of this.lobbyState.seats) {
      if (s.id === hostSeatId) continue;
      if (openHumanFriends > 0) {
        s.control = 'human';
        s.peerId = null;
        s.name = 'Waiting for Friend...';
        openHumanFriends--;
      } else if (useAi) {
        const botName = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(botName);
        s.control = 'ai';
        s.peerId = null;
        s.name = botName;
      } else {
        const unusedName = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(unusedName);
        s.control = 'none';
        s.peerId = null;
        s.name = unusedName;
      }
    }
  }
  async connectRoomPreview(rawCode) {
    const cleanCode = (rawCode || '').trim().toUpperCase();
    if (!cleanCode) return;
    const formattedCode = cleanCode.startsWith('TOMB-') ? cleanCode : `TOMB-${cleanCode}`;
    if (this.mode === 'guest' && this.roomCode === formattedCode && (this.mqttClients.length > 0 || this.peer || this.bc)) {
      this.sendToHost({
        type: 'LOBBY_PREVIEW_REQUEST',
        peerId: this.myPeerId,
      });
      return;
    }

    this.disconnect(false);
    this.mode = 'guest';
    this.roomCode = formattedCode;
    // Clear local default 'local' peerId so Guest doesn't think Blue is taken before Host state arrives
    for (const s of this.lobbyState.seats) {
      if (s.peerId === 'local') {
        s.peerId = null;
      }
    }

    this._emitStatus(`⏳ Connecting to Room ${this.roomCode}...`);
    this._setupBroadcastChannel(this.roomCode);
    this._setupMqttBrokers(this.roomCode);
    this._startHeartbeat();

    this.sendToHost({
      type: 'LOBBY_PREVIEW_REQUEST',
      peerId: this.myPeerId,
    });

    const PeerClass = await this._ensurePeerJS();
    if (PeerClass && this.mode === 'guest' && this.roomCode === formattedCode) {
      try {
        this.peer = new PeerClass(undefined, PEER_CONFIG);
        this.peer.on('open', () => {
          if (this.mode !== 'guest' || this.roomCode !== formattedCode) return;
          const hostFullId = `${PEER_PREFIX}${this.roomCode}`;
          const conn = this.peer.connect(hostFullId, { reliable: true });
          this.hostConn = conn;

          conn.on('open', () => {
            this._emitStatus(`✅ Connected to Room ${this.roomCode}!`);
            conn.send({
              type: 'LOBBY_PREVIEW_REQUEST',
              peerId: this.myPeerId,
              msgId: this._makeMsgId(),
            });
            while (this.outboundQueue.length > 0) {
              const pkt = this.outboundQueue.shift();
              conn.send(pkt);
            }
          });

          conn.on('data', (msg) => {
            if (this._isDuplicateMsg(msg)) return;
            this._handleGuestMessage(msg);
          });

          conn.on('close', () => {
            // WSS broker remains active even if direct P2P closes
          });
        });

        this.peer.on('disconnected', () => {
          if (this.peer && !this.peer.destroyed) {
            try {
              this.peer.reconnect();
            } catch (e) {
              // Ignore
            }
          }
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Guest notice (using WSS Pub/Sub):', err?.type || err);
        });
      } catch (e) {
        // Ignore PeerJS error, WSS handles it
      }
    }
  }

  /**
   * Reserves a seat while a Guest is on the Character Picker screen (or switches their pick)
   * so other Guests opening the link immediately see that color as Taken even while this Guest is typing their name!
   */
  reservePreviewSeat(seatId, playerName = '') {
    if (this.mode !== 'guest' || !this.roomCode || !seatId) return;
    const cleanName = (playerName || '').trim() || 'Explorer Joining...';
    this.isConfirmedByHost = false;
    this.guestJoinPayload = {
      peerId: this.myPeerId,
      playerName: cleanName,
      preferredSeatId: seatId,
      claimedAt: this.guestJoinPayload?.claimedAt || Date.now(),
    };
    this._applyOptimisticGuestClaim(this.myPeerId, cleanName, seatId);
    this.sendToHost({
      type: 'JOIN_REQUEST',
      peerId: this.myPeerId,
      playerName: cleanName,
      preferredSeatId: seatId,
      isPreviewHold: true,
    });
    this._publishRetainedGuestSeat(this.guestJoinPayload);
  }

  /**
   * Joins an existing Host room by Room Code with the Guest's chosen Explorer seat & name.
   */
  async joinRoom(rawCode, playerName = 'Guest Explorer', preferredSeatId = null) {
    const cleanCode = (rawCode || '').trim().toUpperCase();
    if (!cleanCode) return;
    const formattedCode = cleanCode.startsWith('TOMB-') ? cleanCode : `TOMB-${cleanCode}`;

    this.isConfirmedByHost = false;
    this.guestJoinPayload = {
      peerId: this.myPeerId,
      playerName,
      preferredSeatId,
      claimedAt: this.guestJoinPayload?.claimedAt || Date.now(),
    };
    this.saveGuestSession(formattedCode, {
      playerName,
      preferredSeatId,
      hasJoined: true,
    });

    // Optimistically reflect Guest's own seat locally right away so Guest UI never feels stuck
    this._applyOptimisticGuestClaim(this.myPeerId, playerName, preferredSeatId);

    // If not yet connected to this room, establish the connection first
    if (this.mode !== 'guest' || this.roomCode !== formattedCode || (this.mqttClients.length === 0 && !this.peer && !this.bc)) {
      await this.connectRoomPreview(formattedCode);
    }

    this.sendToHost({
      type: 'JOIN_REQUEST',
      peerId: this.myPeerId,
      playerName,
      preferredSeatId,
    });
    this._publishRetainedGuestSeat(this.guestJoinPayload);
  }

  _applyOptimisticGuestClaim(guestPeerId, playerName, preferredSeatId) {
    if (!this.lobbyState || !this.lobbyState.seats) return;
    for (const prev of this.lobbyState.seats) {
      if (prev.peerId === guestPeerId && (!preferredSeatId || prev.id !== preferredSeatId)) {
        prev.peerId = null;
        prev.control = 'human';
        prev.name = 'Waiting for Friend...';
      }
    }
    let seat = null;
    if (preferredSeatId) {
      const cand = this.lobbyState.seats.find((s) => s.id === preferredSeatId);
      if (cand && (!cand.peerId || cand.peerId === guestPeerId)) {
        seat = cand;
      }
    }
    if (!seat) {
      seat =
        this.lobbyState.seats.find((s) => s.peerId === guestPeerId) ||
        this.lobbyState.seats.find((s) => s.control === 'human' && !s.peerId) ||
        this.lobbyState.seats.find((s) => !s.peerId);
    }
    if (seat) {
      // If this guestPeerId is me and my preferredSeatId was already taken by someone else, update my preferredSeatId to the open seat
      if (guestPeerId === this.myPeerId && this.guestJoinPayload && this.guestJoinPayload.preferredSeatId !== seat.id) {
        this.guestJoinPayload.preferredSeatId = seat.id;
      }
      const prevControl = seat.control;
      if (prevControl !== 'human') {
        const emptyHumanSlot = this.lobbyState.seats.find(
          (s) => s.id !== seat.id && s.control === 'human' && !s.peerId
        );
        if (emptyHumanSlot) {
          const usedNames = this.lobbyState.seats.map((x) => x.name);
          emptyHumanSlot.control = prevControl;
          emptyHumanSlot.peerId = null;
          emptyHumanSlot.name = pickAdventurerNames(1, usedNames)[0];
        }
      }
      seat.control = 'human';
      seat.peerId = guestPeerId;
      if (playerName) seat.name = playerName;
    }
    if (this.callbacks.onLobbyUpdate) {
      this.callbacks.onLobbyUpdate(this.lobbyState);
    }
  }

  /**
   * Connects to public MQTT-over-WSS brokers so Host & Guests can exchange retained lobby state,
   * seat joins, and game events across any cellular or Wi-Fi firewall!
   */
  async _setupMqttBrokers(roomCode) {
    this._closeMqttBrokers();
    const mqttLib = await this._ensureMqttJS();
    if (!mqttLib || !this.roomCode || this.roomCode !== roomCode) return;

    const baseTopic = `${MQTT_TOPIC_PREFIX}/${roomCode}`;
    const topicLobby = `${baseTopic}/lobby`;
    const topicGameState = `${baseTopic}/gamestate`;
    const topicEvents = `${baseTopic}/events`;
    const topicToHost = `${baseTopic}/to-host`;
    const topicGuestWildcard = `${baseTopic}/guest/+`;

    for (const brokerUrl of WSS_BROKERS) {
      try {
        const client = mqttLib.connect(brokerUrl, {
          clientId: `votm-${this.myPeerId}-${Math.random().toString(36).slice(2, 6)}`,
          clean: true,
          keepalive: 30,
          protocolVersion: 4,
          reconnectPeriod: 2000,
          connectTimeout: 7000,
        });

        client.on('connect', () => {
          if (this.roomCode !== roomCode) {
            client.end(true);
            return;
          }
          if (this.mode === 'host') {
            client.subscribe([topicToHost, topicGuestWildcard], { qos: 1 });
            // Publish current authoritative Lobby State (and Game State if started) with retain: true
            this._publishMqttFromHost(client);
          } else if (this.mode === 'guest') {
            client.subscribe([topicLobby, topicGameState, topicEvents, topicGuestWildcard], { qos: 1 });
            this._emitStatus(`✅ Connected to Room ${this.roomCode}!`);
            if (this.guestJoinPayload) {
              const joinPkt = {
                type: 'JOIN_REQUEST',
                peerId: this.myPeerId,
                playerName: this.guestJoinPayload.playerName,
                preferredSeatId: this.guestJoinPayload.preferredSeatId,
                msgId: this._makeMsgId(),
                senderId: this.myPeerId,
              };
              client.publish(topicToHost, JSON.stringify(joinPkt), { qos: 1 });
              client.publish(
                `${baseTopic}/guest/${this.myPeerId}`,
                JSON.stringify(joinPkt),
                { qos: 1, retain: true }
              );
            } else {
              const previewPkt = {
                type: 'LOBBY_PREVIEW_REQUEST',
                peerId: this.myPeerId,
                msgId: this._makeMsgId(),
                senderId: this.myPeerId,
              };
              client.publish(topicToHost, JSON.stringify(previewPkt), { qos: 1 });
            }
          }
        });

        client.on('message', (topic, payloadBuf) => {
          if (this.roomCode !== roomCode) return;
          let msg = null;
          try {
            const str =
              typeof payloadBuf === 'string'
                ? payloadBuf
                : new TextDecoder('utf-8').decode(payloadBuf);
            if (!str) return;
            msg = JSON.parse(str);
          } catch (e) {
            return;
          }
          if (!msg || msg.senderId === this.myPeerId) return;

          if (this.mode === 'host') {
            if (topic === topicToHost || topic.startsWith(`${baseTopic}/guest/`)) {
              // For retained guest seat messages, allow processing if that guest isn't in that seat yet
              const isRetainedGuestTopic = topic.startsWith(`${baseTopic}/guest/`);
              if (isRetainedGuestTopic) {
                const alreadySeated = this.lobbyState.seats.find(
                  (s) => s.peerId === msg.peerId && s.name === msg.playerName && (!msg.preferredSeatId || s.id === msg.preferredSeatId)
                );
                if (alreadySeated) return;
              } else if (this._isDuplicateMsg(msg)) {
                return;
              }
              this._handleHostMessage(msg, null);
            }
          } else if (this.mode === 'guest') {
            if (topic === topicLobby || topic === topicGameState || topic === topicEvents) {
              if (topic === topicEvents && this._isDuplicateMsg(msg)) return;
              this._handleGuestMessage(msg);
            } else if (topic.startsWith(`${baseTopic}/guest/`)) {
              // Another Guest published their retained seat claim — reflect it immediately even if Host is in Messages app!
              if (msg.type === 'JOIN_REQUEST' && msg.peerId && msg.peerId !== this.myPeerId) {
                this.knownGuestClaims.set(msg.peerId, {
                  playerName: msg.playerName,
                  preferredSeatId: msg.preferredSeatId,
                  claimedAt: msg.claimedAt || Date.now(),
                });
                this._applyOptimisticGuestClaim(msg.peerId, msg.playerName, msg.preferredSeatId);
              }
            }
          }
        });

        client.on('error', () => {
          // Handled silently by multi-broker redundancy
        });

        this.mqttClients.push(client);
      } catch (e) {
        // Ignore individual broker init failure
      }
    }
  }

  _publishMqttFromHost(singleClient = null) {
    if (this.mode !== 'host' || !this.roomCode) return;
    const baseTopic = `${MQTT_TOPIC_PREFIX}/${this.roomCode}`;
    const lobbyPacket = JSON.stringify({
      type: 'LOBBY_STATE',
      lobbyState: this.lobbyState,
      senderId: this.myPeerId,
      msgId: this._makeMsgId(),
    });
    const clients = singleClient ? [singleClient] : this.mqttClients;
    for (const c of clients) {
      if (c && c.connected) {
        try {
          c.publish(`${baseTopic}/lobby`, lobbyPacket, { qos: 1, retain: true });
          if (this.lastPublishedGameState) {
            const statePacket = JSON.stringify({
              type: 'GAME_STATE',
              state: this.lastPublishedGameState,
              senderId: this.myPeerId,
              msgId: this._makeMsgId(),
            });
            c.publish(`${baseTopic}/gamestate`, statePacket, { qos: 1, retain: true });
          } else {
            // Clear any stale retained game state for this room code
            c.publish(`${baseTopic}/gamestate`, '', { qos: 1, retain: true });
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  _publishRetainedGuestSeat(guestInfo) {
    if (!this.roomCode || !guestInfo) return;
    const baseTopic = `${MQTT_TOPIC_PREFIX}/${this.roomCode}`;
    const pkt = JSON.stringify({
      type: 'JOIN_REQUEST',
      peerId: this.myPeerId,
      playerName: guestInfo.playerName,
      preferredSeatId: guestInfo.preferredSeatId,
      claimedAt: guestInfo.claimedAt || Date.now(),
      senderId: this.myPeerId,
      msgId: this._makeMsgId(),
    });
    for (const c of this.mqttClients) {
      if (c && c.connected) {
        try {
          c.publish(`${baseTopic}/guest/${this.myPeerId}`, pkt, { qos: 1, retain: true });
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  _closeMqttBrokers() {
    for (const c of this.mqttClients) {
      if (c) {
        try {
          c.end(true);
        } catch (e) {
          // Ignore
        }
      }
    }
    this.mqttClients = [];
  }

  _startHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.mode === 'guest') {
        if (this.guestJoinPayload) {
          // Always ensure all connected MQTT brokers hold our retained guest seat claim
          this._publishRetainedGuestSeat(this.guestJoinPayload);
          // Until the Host's authoritative LOBBY_STATE confirms our seat, actively re-send JOIN_REQUEST
          if (!this.isConfirmedByHost) {
            this.sendToHost({
              type: 'JOIN_REQUEST',
              peerId: this.myPeerId,
              playerName: this.guestJoinPayload.playerName,
              preferredSeatId: this.guestJoinPayload.preferredSeatId,
              claimedAt: this.guestJoinPayload.claimedAt,
            });
          }
        } else {
          this.sendToHost({
            type: 'LOBBY_PREVIEW_REQUEST',
            peerId: this.myPeerId,
          });
        }
      } else if (this.mode === 'host' && !this.lastPublishedGameState) {
        this._publishMqttFromHost();
      }
    }, 1600);
  }

  _handleIncomingPeerConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });
    conn.on('data', (msg) => {
      if (this._isDuplicateMsg(msg)) return;
      this._handleHostMessage(msg, conn);
    });
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      for (const [k, v] of this.connections.entries()) {
        if (v === conn) {
          this.connections.delete(k);
        }
      }
    });
  }

  _setupBroadcastChannel(roomCode) {
    if (this.bc) {
      this.bc.close();
    }
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(`${PEER_PREFIX}${roomCode}`);
      this.bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.senderId === this.myPeerId) return;
        if (this._isDuplicateMsg(msg)) return;
        if (this.mode === 'host') {
          this._handleHostMessage(msg, null);
        } else if (this.mode === 'guest') {
          this._handleGuestMessage(msg);
        }
      };
    }
  }

  _sendViaBroadcastChannel(payload) {
    if (this.bc) {
      this.bc.postMessage({ ...payload, senderId: this.myPeerId });
    }
  }

  _handleHostMessage(msg, conn) {
    if (msg.type === 'LOBBY_PREVIEW_REQUEST') {
      if (conn && msg.peerId) {
        if (conn.peer && conn.peer !== msg.peerId) {
          this.connections.delete(conn.peer);
        }
        this.connections.set(msg.peerId, conn);
      }
      this._broadcastLobby();
      return;
    }

    if (msg.type === 'JOIN_REQUEST') {
      const guestPeerId = msg.peerId;
      if (!guestPeerId) return;
      const preferredSeatId = msg.preferredSeatId || null;
      const rawGuest = (msg.playerName || '').trim();
      const isGenericGuest = !rawGuest || /^(Guest\s+Explorer|Explorer\s*\d*|Player\s*\d*)$/i.test(rawGuest);
      const takenNames = this.lobbyState.seats
        .filter((s) => s.peerId !== guestPeerId)
        .map((s) => s.name);
      const guestName = isGenericGuest ? pickAdventurerNames(1, takenNames)[0] : rawGuest;
      if (conn) {
        if (conn.peer && conn.peer !== guestPeerId) {
          this.connections.delete(conn.peer);
        }
        this.connections.set(guestPeerId, conn);
      }

      // Check if this guest is already seated in the exact same seat with the same name
      const existingIdenticalSeat = this.lobbyState.seats.find(
        (s) => s.peerId === guestPeerId && s.name === guestName && (!preferredSeatId || s.id === preferredSeatId)
      );

      // Free any previous seat held by this same guestPeerId if they are switching seats
      for (const prev of this.lobbyState.seats) {
        if (prev.peerId === guestPeerId && (!preferredSeatId || prev.id !== preferredSeatId)) {
          prev.peerId = null;
          prev.control = 'human';
          prev.name = 'Waiting for Friend...';
        }
      }

      // 1. Honor Guest's preferredSeatId if available (not taken by another connected human)
      let assignedSeat = null;
      if (preferredSeatId) {
        const candidate = this.lobbyState.seats.find((s) => s.id === preferredSeatId);
        if (candidate && (!candidate.peerId || candidate.peerId === guestPeerId)) {
          assignedSeat = candidate;
        }
      }

      // 2. Otherwise assign guest to an open human seat first, or any non-taken seat (NEVER overwrite another player's seat!)
      if (!assignedSeat) {
        assignedSeat =
          this.lobbyState.seats.find((s) => s.peerId === guestPeerId) ||
          this.lobbyState.seats.find((s) => s.control === 'human' && !s.peerId) ||
          this.lobbyState.seats.find((s) => !s.peerId && s.control !== 'human') ||
          this.lobbyState.seats.find((s) => !s.peerId);
      }

      if (assignedSeat) {
        // If Guest picked a seat that was previously 'ai' or 'none' (e.g. Host picked Red, Blue was 'Waiting for Friend...',
        // and Guest picked Yellow which was 'ai'), swap that 'ai'/'none' status onto the unused 'Waiting for Friend...' slot
        // so the total expected human player count stays exact!
        const prevControl = assignedSeat.control;
        if (prevControl !== 'human') {
          const unusedHumanSlot = this.lobbyState.seats.find(
            (s) => s.id !== assignedSeat.id && s.control === 'human' && !s.peerId
          );
          if (unusedHumanSlot) {
            const currentNames = this.lobbyState.seats.map((x) => x.name);
            unusedHumanSlot.control = prevControl;
            unusedHumanSlot.peerId = null;
            unusedHumanSlot.name = pickAdventurerNames(1, currentNames)[0];
          }
        }
        assignedSeat.control = 'human';
        assignedSeat.peerId = guestPeerId;
        assignedSeat.name = guestName;
      }

      this.saveHostSession();
      this._emitStatus(`🎉 ${guestName} joined as ${assignedSeat ? assignedSeat.id.toUpperCase() : 'Explorer'}!`);
      this._broadcastLobby();

      if (!msg.isPreviewHold && !existingIdenticalSeat && this.callbacks.onGuestJoined) {
        this.callbacks.onGuestJoined(guestPeerId, guestName, assignedSeat?.id);
      }
    } else if (msg.type === 'CLAIM_SEAT') {
      const { seatId, peerId, name, control, ageEven, rightHanded, exclusiveClaim } = msg;
      let seat = this.lobbyState.seats.find((s) => s.id === seatId);
      // Never allow a guest CLAIM_SEAT to overwrite a seat already owned by the Host or another Guest!
      if (seat && control === 'human' && seat.peerId && seat.peerId !== peerId) {
        seat =
          this.lobbyState.seats.find((s) => s.peerId === peerId) ||
          this.lobbyState.seats.find((s) => s.control === 'human' && !s.peerId) ||
          this.lobbyState.seats.find((s) => !s.peerId);
      }
      if (seat) {
        const targetPrevControl = seat.control;
        if (exclusiveClaim && peerId) {
          for (const prev of this.lobbyState.seats) {
            if (prev.id !== seat.id && prev.peerId === peerId) {
              prev.peerId = null;
              if (targetPrevControl !== 'human') {
                const usedNames = this.lobbyState.seats.map((x) => x.name);
                prev.control = targetPrevControl;
                prev.name = pickAdventurerNames(1, usedNames)[0];
              } else {
                prev.control = 'human';
                prev.name = 'Waiting for Friend...';
              }
            }
          }
        } else if (control === 'human' && targetPrevControl !== 'human') {
          const unusedHumanSlot = this.lobbyState.seats.find(
            (s) => s.id !== seat.id && s.control === 'human' && !s.peerId
          );
          if (unusedHumanSlot) {
            const usedNames = this.lobbyState.seats.map((x) => x.name);
            unusedHumanSlot.control = targetPrevControl;
            unusedHumanSlot.peerId = null;
            unusedHumanSlot.name = pickAdventurerNames(1, usedNames)[0];
          }
        }
        seat.control = control;
        seat.peerId = peerId;
        if (name !== undefined) seat.name = name;
        if (ageEven !== undefined) seat.ageEven = ageEven;
        if (rightHanded !== undefined) seat.rightHanded = rightHanded;
        this.saveHostSession();
        this._broadcastLobby();
        if (this.callbacks.onGuestJoined && peerId) {
          this.callbacks.onGuestJoined(peerId, seat.name, seat.id);
        }
      }
    } else if (msg.type === 'PLAYER_ACTION') {
      if (this.callbacks.onPlayerAction) {
        this.callbacks.onPlayerAction(msg.action, msg.payload, msg.peerId);
      }
    }
  }

  _handleGuestMessage(msg) {
    if (msg.type === 'LOBBY_STATE' && msg.lobbyState) {
      const incomingRev = Number(msg.lobbyState.revision) || 0;
      const incomingConnectedCount = (msg.lobbyState.seats || []).filter(
        (s) => s.control === 'human' && s.peerId && s.peerId !== 'local' && s.peerId !== 'host-seeded'
      ).length;
      const currentAuthoritativeCount = (this.lobbyState?.seats || []).filter(
        (s) => s.control === 'human' && s.peerId && s.peerId !== 'local' && s.peerId !== 'host-seeded' && s.peerId !== this.myPeerId
      ).length;

      // Ignore stale cached LOBBY_STATE packets delivered late by a slower secondary MQTT broker
      if (incomingRev > 0 && incomingRev < this.highestHostRevision && incomingConnectedCount <= currentAuthoritativeCount) {
        return;
      }
      if (incomingRev > this.highestHostRevision) {
        this.highestHostRevision = incomingRev;
      }

      // Check whether the Host's authoritative snapshot already has our seat BEFORE applying local optimistic claims!
      const myHostSeat = (msg.lobbyState.seats || []).find((s) => s.peerId === this.myPeerId);
      if (myHostSeat) {
        this.isConfirmedByHost = true;
        if (this.guestJoinPayload && this.guestJoinPayload.preferredSeatId !== myHostSeat.id) {
          // Another player claimed our preferred seat first; adopt the Host's authoritative seat assignment!
          this.guestJoinPayload.preferredSeatId = myHostSeat.id;
          this.saveGuestSession(this.roomCode, {
            playerName: myHostSeat.name || this.guestJoinPayload.playerName,
            preferredSeatId: myHostSeat.id,
            hasJoined: true,
          });
          this._publishRetainedGuestSeat(this.guestJoinPayload);
        }
      } else {
        this.isConfirmedByHost = false;
        // Host snapshot doesn't have us yet — immediately re-send JOIN_REQUEST and re-publish retained claim!
        if (this.guestJoinPayload) {
          this.sendToHost({
            type: 'JOIN_REQUEST',
            peerId: this.myPeerId,
            playerName: this.guestJoinPayload.playerName,
            preferredSeatId: this.guestJoinPayload.preferredSeatId,
            claimedAt: this.guestJoinPayload.claimedAt,
          });
          this._publishRetainedGuestSeat(this.guestJoinPayload);
        }
      }

      this.lobbyState = msg.lobbyState;

      // Preserve any known retained Guest claims (sorted by claimedAt timestamp so earlier claims always win!)
      const sortedGuestClaims = Array.from(this.knownGuestClaims.entries()).sort(
        (a, b) => (a[1].claimedAt || 0) - (b[1].claimedAt || 0)
      );
      for (const [peerId, claim] of sortedGuestClaims) {
        if (!this.lobbyState.seats.some((s) => s.peerId === peerId)) {
          this._applyOptimisticGuestClaim(peerId, claim.playerName, claim.preferredSeatId);
        }
      }

      // Preserve our own optimistic seat display while waiting for Host confirmation
      if (this.guestJoinPayload && !this.lobbyState.seats.some((s) => s.peerId === this.myPeerId)) {
        this._applyOptimisticGuestClaim(
          this.myPeerId,
          this.guestJoinPayload.playerName,
          this.guestJoinPayload.preferredSeatId
        );
      }

      if (this.callbacks.onLobbyUpdate) {
        this.callbacks.onLobbyUpdate(this.lobbyState);
      }
    } else if (msg.type === 'GAME_STATE' && msg.state) {
      if (this.callbacks.onGameState) {
        this.callbacks.onGameState(msg.state);
      }
    } else if (msg.type === 'GAME_EVENT' && msg.event) {
      if (msg.msgId) {
        if (this.dispatchedEventIds.has(msg.msgId)) return;
        this.dispatchedEventIds.add(msg.msgId);
        if (this.dispatchedEventIds.size > 300) {
          const oldest = this.dispatchedEventIds.values().next().value;
          this.dispatchedEventIds.delete(oldest);
        }
      }
      if (this.callbacks.onGameEvent) {
        this.callbacks.onGameEvent(msg.event);
      }
    }
  }

  /**
   * Claims a specific Explorer seat for the current player (and releases their old seat so they only occupy 1 character).
   */
  claimExplorerSeat(seatId, playerName) {
    if (this.mode === 'guest') {
      this.guestJoinPayload = {
        peerId: this.myPeerId,
        playerName,
        preferredSeatId: seatId,
      };
      this.saveGuestSession(this.roomCode, {
        playerName,
        preferredSeatId: seatId,
        hasJoined: true,
      });
      this._applyOptimisticGuestClaim(this.myPeerId, playerName, seatId);
      this.sendToHost({
        type: 'CLAIM_SEAT',
        seatId,
        peerId: this.myPeerId,
        control: 'human',
        name: playerName,
        exclusiveClaim: true,
      });
      this._publishRetainedGuestSeat(this.guestJoinPayload);
      return;
    }

    const target = this.lobbyState.seats.find((s) => s.id === seatId);
    const targetPrevControl = target ? target.control : 'human';
    for (const prev of this.lobbyState.seats) {
      if (prev.id !== seatId && prev.peerId === this.myPeerId) {
        prev.peerId = null;
        prev.control = targetPrevControl;
        if (targetPrevControl === 'human') {
          prev.name = 'Waiting for Friend...';
        } else {
          const usedNames = this.lobbyState.seats.map((x) => x.name);
          prev.name = pickAdventurerNames(1, usedNames)[0];
        }
      }
    }
    if (target) {
      target.control = 'human';
      target.peerId = this.myPeerId;
      if (playerName) target.name = playerName;
      this.saveHostSession();
      this._broadcastLobby();
    }
  }

  /**
   * Returns how many human players are expected vs how many have connected.
   */
  getWaitingStats() {
    const seats = this.lobbyState?.seats || [];
    const humanSeats = seats.filter((s) => s.control === 'human');
    const totalHumanSeats = humanSeats.length;
    const connectedHumans = humanSeats.filter((s) => Boolean(s.peerId && s.peerId !== 'local')).length;
    const waitingCount = Math.max(0, totalHumanSeats - connectedHumans);
    return {
      totalHumanSeats,
      connectedHumans,
      waitingCount,
    };
  }

  updateSeat(seatId, updates) {
    if (this.mode === 'guest') {
      const pkt = {
        type: 'CLAIM_SEAT',
        seatId,
        peerId: updates.peerId !== undefined ? updates.peerId : this.myPeerId,
        ...updates,
      };
      this.sendToHost(pkt);
      return;
    }

    const seat = this.lobbyState.seats.find((s) => s.id === seatId);
    if (seat) {
      Object.assign(seat, updates);
      this.saveHostSession();
      this._broadcastLobby();
    }
  }

  _broadcastLobby() {
    if (this.mode === 'host') {
      this.lobbyState.revision = (Number(this.lobbyState.revision) || 0) + 1;
      this.lobbyState.updatedAt = Date.now();
    }
    if (this.callbacks.onLobbyUpdate) {
      this.callbacks.onLobbyUpdate(this.lobbyState);
    }
    if (this.mode === 'host') {
      this.broadcastToAll({
        type: 'LOBBY_STATE',
        lobbyState: this.lobbyState,
      });
      this._publishMqttFromHost();
    }
  }

  broadcastGameState(state) {
    if (this.mode !== 'host') return;
    this.lastPublishedGameState = state;
    this.saveHostSession({ mpGameStarted: true, gameState: state });
    this.broadcastToAll({
      type: 'GAME_STATE',
      state,
    });
    this._publishMqttFromHost();
  }

  broadcastGameEvent(event) {
    if (this.mode !== 'host') return;
    const packet = {
      type: 'GAME_EVENT',
      event,
      senderId: this.myPeerId,
      msgId: this._makeMsgId(),
    };
    this.broadcastToAll(packet);
    if (this.roomCode) {
      const topicEvents = `${MQTT_TOPIC_PREFIX}/${this.roomCode}/events`;
      const str = JSON.stringify(packet);
      for (const c of this.mqttClients) {
        if (c && c.connected) {
          try {
            c.publish(topicEvents, str, { qos: 1 });
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }

  broadcastToAll(packet) {
    const fullPacket = {
      ...packet,
      senderId: this.myPeerId,
      msgId: packet.msgId || this._makeMsgId(),
    };
    const uniqueConns = new Set(this.connections.values());
    for (const conn of uniqueConns) {
      if (conn && conn.open) {
        conn.send(fullPacket);
      }
    }
    this._sendViaBroadcastChannel(fullPacket);
  }

  sendToHost(packet) {
    const fullPacket = {
      ...packet,
      senderId: this.myPeerId,
      msgId: packet.msgId || this._makeMsgId(),
    };
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(fullPacket);
    } else if (this.mode === 'guest') {
      this.outboundQueue.push(fullPacket);
    }
    if (this.roomCode) {
      const topicToHost = `${MQTT_TOPIC_PREFIX}/${this.roomCode}/to-host`;
      const str = JSON.stringify(fullPacket);
      for (const c of this.mqttClients) {
        if (c && c.connected) {
          try {
            c.publish(topicToHost, str, { qos: 1 });
          } catch (e) {
            // Ignore
          }
        }
      }
    }
    this._sendViaBroadcastChannel(fullPacket);
  }

  sendPlayerAction(action, payload = {}) {
    if (this.mode === 'guest') {
      this.sendToHost({
        type: 'PLAYER_ACTION',
        peerId: this.myPeerId,
        action,
        payload,
      });
    } else if (this.callbacks.onPlayerAction) {
      this.callbacks.onPlayerAction(action, payload, this.myPeerId);
    }
  }

  isPlayerLocalTurn(state) {
    if (!state || state.phase === 'GAME_OVER') return false;
    const currentPlayer = state.players[state.turnIndex];
    if (!currentPlayer || currentPlayer.control !== 'human') return false;
    if (this.mode === 'local') return true;
    return !currentPlayer.peerId || currentPlayer.peerId === 'local' || currentPlayer.peerId === this.myPeerId;
  }

  getShareableInviteUrl() {
    if (!this.roomCode) return window.location.href;
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomCode);
    url.searchParams.delete('host');
    // Also embed Host's seat, name, and human player count so the Invite URL locks the Host's color at 0ms!
    const seats = this.lobbyState?.seats || [];
    const hostSeat =
      seats.find((s) => s.peerId === this.lobbyState?.hostPeerId) ||
      seats.find((s) => s.peerId === this.myPeerId);
    const humanCount = seats.filter((s) => s.control === 'human').length;
    const hasAi = seats.some((s) => s.control === 'ai');
    if (hostSeat) {
      url.searchParams.set('hs', hostSeat.id);
      url.searchParams.set('hn', hostSeat.name || 'Host');
    }
    if (humanCount >= 2) {
      url.searchParams.set('hc', String(humanCount));
    }
    url.searchParams.set('ai', hasAi ? '1' : '0');
    return url.toString();
  }

  _emitStatus(text) {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(text);
    }
  }

  disconnect(clearStorage = true) {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // Ignore
      }
      this.peer = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    this._closeMqttBrokers();
    this.connections.clear();
    this.hostConn = null;
    this.outboundQueue = [];
    this.guestJoinPayload = null;
    this.knownGuestClaims.clear();
    this.isConfirmedByHost = false;
    this.highestHostRevision = 0;
    this.lastPublishedGameState = null;
    if (clearStorage) {
      this.clearSavedHostSession();
    }
    this.mode = 'local';
    this.roomCode = null;
  }
}
