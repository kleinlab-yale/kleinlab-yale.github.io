/**
 * 1971 Milton Bradley "Voice of the Mummy" — Real-Time P2P Multiplayer Manager (GitHub Pages Ready)
 * Uses PeerJS (WebRTC DataChannels with Google STUN servers) for cross-internet multiplayer
 * + BroadcastChannel for instant multi-tab testing on the same device.
 */

import { pickAdventurerNames } from './board_data.js?v=25';

const PEER_PREFIX = 'votm1971-tomb-';

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ],
  },
};

export class MultiplayerManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // { onLobbyUpdate, onGameState, onGameEvent, onPlayerAction, onStatusChange, onGuestJoined }
    this.mode = 'local'; // 'local' | 'host' | 'guest'
    this.roomCode = null;
    this.myPeerId = `client-${Math.random().toString(36).slice(2, 9)}`;
    this.peer = null;
    this.connections = new Map(); // guestPeerId -> DataConnection (Host only)
    this.hostConn = null; // DataConnection to Host (Guest only)
    this.bc = null; // BroadcastChannel for same-device multi-tab sync

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

  /**
   * Generates a 4-digit Room Code and initializes Host mode with the Host's chosen Explorer seat & player count.
   */
  async hostRoom(playerName = '', options = {}) {
    const preferredSeatId = options.preferredSeatId || 'blue';
    const humanCount = Math.max(2, Math.min(4, Number(options.humanCount) || 2));
    const fillWithAi = options.fillWithAi !== undefined ? Boolean(options.fillWithAi) : true;

    this.disconnect();
    this.mode = 'host';
    const num = Math.floor(1000 + Math.random() * 9000);
    this.roomCode = `TOMB-${num}`;
    this.lobbyState.roomCode = this.roomCode;
    this.lobbyState.hostPeerId = this.myPeerId;

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

    this._setupBroadcastChannel(this.roomCode);
    this._emitStatus(`Creating Room ${this.roomCode}...`);
    this._broadcastLobby();

    const PeerClass = await this._ensurePeerJS();
    if (PeerClass) {
      const fullPeerId = `${PEER_PREFIX}${this.roomCode}`;
      this.peer = new PeerClass(fullPeerId, PEER_CONFIG);

      this.peer.on('open', () => {
        this._emitStatus(`✅ Room ${this.roomCode} Ready — Copy the Invite Link and send it to your friends!`);
        this._broadcastLobby();
      });

      this.peer.on('connection', (conn) => {
        this._handleIncomingPeerConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Host notice:', err);
        this._emitStatus(`Room ${this.roomCode} active`);
      });
    } else {
      this._emitStatus(`Room ${this.roomCode} active (Local Broadcast Mode)`);
    }

    return this.roomCode;
  }

  /**
   * Joins an existing Host room by Room Code.
   */
  async joinRoom(rawCode, playerName = 'Guest Explorer') {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return;
    this.disconnect();
    this.mode = 'guest';
    this.roomCode = cleanCode.startsWith('TOMB-') ? cleanCode : `TOMB-${cleanCode}`;

    this._emitStatus(`⏳ Connecting to Room ${this.roomCode}...`);
    this._setupBroadcastChannel(this.roomCode);

    // Announce join over BroadcastChannel for instant same-browser multi-tab support
    this._sendViaBroadcastChannel({
      type: 'JOIN_REQUEST',
      peerId: this.myPeerId,
      playerName,
    });

    const PeerClass = await this._ensurePeerJS();
    if (PeerClass) {
      this.peer = new PeerClass(undefined, PEER_CONFIG);
      this.peer.on('open', () => {
        const hostFullId = `${PEER_PREFIX}${this.roomCode}`;
        const conn = this.peer.connect(hostFullId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          this._emitStatus(`✅ Connected to Room ${this.roomCode}! Pick your Explorer seat below or wait for Host to start.`);
          conn.send({
            type: 'JOIN_REQUEST',
            peerId: this.myPeerId,
            playerName,
          });
        });

        conn.on('data', (msg) => {
          this._handleGuestMessage(msg);
        });

        conn.on('close', () => {
          this._emitStatus('⚠️ Disconnected from Host.');
        });
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Guest notice:', err);
        this._emitStatus(`⚠️ Could not reach Room ${this.roomCode} — verify the Host has the room open.`);
      });
    }
  }

  _handleIncomingPeerConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });
    conn.on('data', (msg) => {
      this._handleHostMessage(msg, conn);
    });
    conn.on('close', () => {
      this.connections.delete(conn.peer);
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
    if (msg.type === 'JOIN_REQUEST') {
      const guestPeerId = msg.peerId;
      const rawGuest = (msg.playerName || '').trim();
      const isGenericGuest = !rawGuest || /^(Guest\s+Explorer|Explorer\s*\d*|Player\s*\d*)$/i.test(rawGuest);
      const takenNames = this.lobbyState.seats.map((s) => s.name);
      const guestName = isGenericGuest ? pickAdventurerNames(1, takenNames)[0] : rawGuest;
      if (conn) {
        this.connections.set(guestPeerId, conn);
      }

      // Assign guest to an open human seat first, or any non-taken seat
      let assignedSeat = this.lobbyState.seats.find((s) => s.peerId === guestPeerId);
      if (!assignedSeat) {
        assignedSeat =
          this.lobbyState.seats.find((s) => s.control === 'human' && !s.peerId) ||
          this.lobbyState.seats.find((s) => !s.peerId && s.control !== 'human') ||
          this.lobbyState.seats.find((s) => s.peerId !== this.myPeerId);
        if (assignedSeat) {
          assignedSeat.control = 'human';
          assignedSeat.peerId = guestPeerId;
          assignedSeat.name = guestName;
        }
      } else if (guestName) {
        assignedSeat.name = guestName;
      }

      this._emitStatus(`🎉 ${guestName} joined as ${assignedSeat ? assignedSeat.id.toUpperCase() : 'Explorer'}!`);
      this._broadcastLobby();

      if (this.callbacks.onGuestJoined) {
        this.callbacks.onGuestJoined(guestPeerId, guestName, assignedSeat?.id);
      }
    } else if (msg.type === 'CLAIM_SEAT') {
      const { seatId, peerId, name, control, ageEven, rightHanded, exclusiveClaim } = msg;
      const seat = this.lobbyState.seats.find((s) => s.id === seatId);
      if (seat) {
        // If a player is switching to a new seat, free their previous seat first
        if (exclusiveClaim && peerId) {
          for (const prev of this.lobbyState.seats) {
            if (prev.id !== seatId && prev.peerId === peerId) {
              prev.peerId = null;
              prev.control = 'human';
              prev.name = 'Waiting for Friend...';
            }
          }
        }
        seat.control = control;
        seat.peerId = peerId;
        if (name !== undefined) seat.name = name;
        if (ageEven !== undefined) seat.ageEven = ageEven;
        if (rightHanded !== undefined) seat.rightHanded = rightHanded;
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
    if (msg.type === 'LOBBY_STATE') {
      this.lobbyState = msg.lobbyState;
      if (this.callbacks.onLobbyUpdate) {
        this.callbacks.onLobbyUpdate(this.lobbyState);
      }
    } else if (msg.type === 'GAME_STATE') {
      if (this.callbacks.onGameState) {
        this.callbacks.onGameState(msg.state);
      }
    } else if (msg.type === 'GAME_EVENT') {
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
      this.sendToHost({
        type: 'CLAIM_SEAT',
        seatId,
        peerId: this.myPeerId,
        control: 'human',
        name: playerName,
        exclusiveClaim: true,
      });
      return;
    }

    for (const prev of this.lobbyState.seats) {
      if (prev.id !== seatId && prev.peerId === this.myPeerId) {
        prev.peerId = null;
        prev.control = 'human';
        prev.name = 'Waiting for Friend...';
      }
    }
    const target = this.lobbyState.seats.find((s) => s.id === seatId);
    if (target) {
      target.control = 'human';
      target.peerId = this.myPeerId;
      if (playerName) target.name = playerName;
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
    const connectedHumans = humanSeats.filter((s) => Boolean(s.peerId)).length;
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
      this._broadcastLobby();
    }
  }

  _broadcastLobby() {
    if (this.callbacks.onLobbyUpdate) {
      this.callbacks.onLobbyUpdate(this.lobbyState);
    }
    if (this.mode === 'host') {
      this.broadcastToAll({
        type: 'LOBBY_STATE',
        lobbyState: this.lobbyState,
      });
    }
  }

  broadcastGameState(state) {
    if (this.mode !== 'host') return;
    this.broadcastToAll({
      type: 'GAME_STATE',
      state,
    });
  }

  broadcastGameEvent(event) {
    if (this.mode !== 'host') return;
    this.broadcastToAll({
      type: 'GAME_EVENT',
      event,
    });
  }

  broadcastToAll(packet) {
    for (const conn of this.connections.values()) {
      if (conn && conn.open) {
        conn.send(packet);
      }
    }
    this._sendViaBroadcastChannel(packet);
  }

  sendToHost(packet) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(packet);
    }
    this._sendViaBroadcastChannel(packet);
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
    return url.toString();
  }

  _emitStatus(text) {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(text);
    }
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    this.connections.clear();
    this.hostConn = null;
    this.mode = 'local';
    this.roomCode = null;
  }
}
