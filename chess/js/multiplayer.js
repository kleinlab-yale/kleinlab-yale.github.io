/**
 * Zero-Config Room-Name Multiplayer Manager
 * Combines PeerJS (WebRTC P2P across the internet) + BroadcastChannel (instant same-browser sync).
 * Flow:
 * 1. Not in room -> Button is RED ("Not Connected — Join Room")
 * 2. In room -> Button turns GREEN ("In Room: <name>"), shows connected players
 * 3. Either player clicks "START GAME" -> Launches synchronized match on both screens!
 */

function normalizeRoomSlug(roomName) {
  return (roomName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
}

export class MultiplayerRoomManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.roomName = '';
    this.roomSlug = '';
    this.role = null; // 'host' | 'guest'
    this.myColor = 'w';
    this.inRoom = false; // True as soon as user joins the room
    this.connected = false; // True when opponent is also in the room
    this.gameStarted = false;
    this.peer = null;
    this.conn = null;
    this.bc = null;
    this.joinRetryTimer = null;
    this.clientId = 'c_' + Math.random().toString(36).slice(2, 10);
    this.seenMessages = new Set();
    this.opponentProfile = null;
    this.localProfile = null;
    this.preferredColor = 'w';
    this.timeControlMinutes = 0; // Default unrestricted time
  }

  isActive() {
    return this.inRoom;
  }

  isConnected() {
    return this.connected;
  }

  joinRoom(roomName, localProfile, preferredColor = 'w', timeControlMinutes = 0) {
    this.leaveRoom(false);

    const slug = normalizeRoomSlug(roomName);
    if (!slug) {
      this._emitStatus('error', 'Please type a room name first.');
      return;
    }

    this.roomName = roomName.trim();
    this.roomSlug = slug;
    this.localProfile = {
      username: localProfile.username,
      elo: localProfile.elo,
      character: localProfile.character,
      equipped: localProfile.equipped
    };
    this.preferredColor = preferredColor;
    this.timeControlMinutes = Number(timeControlMinutes) || 0;
    this.inRoom = true;
    this.gameStarted = false;

    this._emitStatus('joining', `Joining room "${this.roomName}"...`);

    // 1. BroadcastChannel for instant local multi-tab discovery
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`arcane_chess_room_${slug}`);
        this.bc.onmessage = ev => {
          if (ev.data && ev.data.senderId !== this.clientId) {
            this._handleIncomingPacket(ev.data);
          }
        };
        this._sendViaBroadcast({
          type: 'bc_discover',
          profile: this.localProfile
        });
      } catch (e) {
        console.warn('BroadcastChannel unavailable:', e);
      }
    }

    // 2. PeerJS WebRTC P2P connection using deterministic Host ID
    if (typeof window.Peer === 'undefined') {
      this.role = 'host';
      this.myColor = preferredColor === 'b' ? 'b' : 'w';
      this._emitStatus(
        'in_room_waiting',
        `In Room "${this.roomName}" (1/2 Players) — Waiting for friend to join "${this.roomName}"...`
      );
      return;
    }

    const hostPeerId = `arcane-wizard-chess-v2-${slug}-host`;

    try {
      const hostPeer = new window.Peer(hostPeerId, { debug: 0 });
      this.peer = hostPeer;

      hostPeer.on('open', () => {
        if (this.connected) return;
        this.role = 'host';
        this.myColor = this.preferredColor === 'b' ? 'b' : 'w';
        this._emitStatus(
          'in_room_waiting',
          `In Room "${this.roomName}" (1/2 Players) — Waiting for friend to join "${this.roomName}"...`
        );
      });

      hostPeer.on('connection', conn => {
        this.conn = conn;
        this._setupPeerConnection(conn);
      });

      hostPeer.on('error', err => {
        if (err && err.type === 'unavailable-id') {
          // Host already exists in this room! Connect as Guest
          this._connectAsGuest(hostPeerId);
        } else {
          console.warn('PeerJS error:', err);
          if (!this.connected && this.inRoom) {
            this._emitStatus(
              'in_room_waiting',
              `In Room "${this.roomName}" — Waiting for friend...`
            );
          }
        }
      });
    } catch (e) {
      console.warn('PeerJS init failed:', e);
    }
  }

  _connectAsGuest(hostPeerId) {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
    }

    this.role = 'guest';
    this._emitStatus('joining', `Found room "${this.roomName}"! Connecting to friend...`);

    const guestPeer = new window.Peer({ debug: 0 });
    this.peer = guestPeer;

    guestPeer.on('open', () => {
      const conn = guestPeer.connect(hostPeerId, { reliable: true });
      this.conn = conn;
      this._setupPeerConnection(conn);
    });

    guestPeer.on('error', err => {
      console.warn('Guest PeerJS error:', err);
      if (!this.connected) {
        this._emitStatus('error', `Could not connect to room "${this.roomName}". Try again.`);
      }
    });
  }

  _setupPeerConnection(conn) {
    const sendHello = () => {
      if (this.role === 'guest' && !this.connected) {
        this.sendPacket({
          type: 'join_request',
          profile: this.localProfile
        });
      }
    };

    conn.on('open', () => {
      sendHello();
      // Retry hello every 1.2s until acked by host
      if (this.role === 'guest') {
        clearInterval(this.joinRetryTimer);
        this.joinRetryTimer = setInterval(() => {
          if (this.connected || !this.inRoom) {
            clearInterval(this.joinRetryTimer);
            return;
          }
          sendHello();
        }, 1200);
      }
    });

    conn.on('data', data => {
      this._handleIncomingPacket(data);
    });

    conn.on('close', () => {
      if (this.connected) {
        this.connected = false;
        this.gameStarted = false;
        this._emitStatus(
          'in_room_waiting',
          `Friend left room "${this.roomName}". Waiting for someone to join...`
        );
        this.callbacks.onOpponentDisconnected?.();
      }
    });
  }

  /**
   * Explicitly starts the game once both players are in the room!
   */
  triggerStartGame(preferredColor = null, timeControlMinutes = null) {
    if (!this.connected || !this.opponentProfile) return false;

    if (preferredColor === 'w' || preferredColor === 'b') {
      this.myColor = preferredColor;
    }
    if (timeControlMinutes !== null) {
      this.timeControlMinutes = Number(timeControlMinutes) || 0;
    }

    const oppColor = this.myColor === 'w' ? 'b' : 'w';
    this.gameStarted = true;

    this.sendPacket({
      type: 'start_game_signal',
      starterProfile: this.localProfile,
      receiverColor: oppColor,
      timeControlMinutes: this.timeControlMinutes
    });

    this.callbacks.onMatchStart?.({
      myColor: this.myColor,
      opponentProfile: this.opponentProfile,
      timeControlMinutes: this.timeControlMinutes
    });
    return true;
  }

  _sendViaBroadcast(payload) {
    if (!this.bc) return;
    try {
      this.bc.postMessage(payload);
    } catch {}
  }

  sendPacket(payload) {
    const packet = {
      ...payload,
      msgId: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      senderId: this.clientId,
      roomSlug: this.roomSlug
    };
    this.seenMessages.add(packet.msgId);

    if (this.conn && this.conn.open) {
      try {
        this.conn.send(packet);
      } catch (e) {
        console.warn('Peer send error:', e);
      }
    }
    this._sendViaBroadcast(packet);
  }

  _handleIncomingPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.msgId) {
      if (this.seenMessages.has(packet.msgId)) return;
      this.seenMessages.add(packet.msgId);
    }

    // 1. Discovery via BroadcastChannel or PeerJS join_request
    if (packet.type === 'bc_discover' || packet.type === 'join_request') {
      if (this.role === 'host' || !this.role) {
        this.role = 'host';
        this.myColor = this.preferredColor === 'b' ? 'b' : 'w';
        this.opponentProfile = packet.profile;
        this.connected = true;
        const guestColor = this.myColor === 'w' ? 'b' : 'w';

        this.sendPacket({
          type: 'room_ready',
          hostProfile: this.localProfile,
          guestColor,
          timeControlMinutes: this.timeControlMinutes
        });

        this._emitStatus(
          'connected',
          `Both Players in Room "${this.roomName}": You & ${this.opponentProfile.username}! Click START GAME!`
        );
        this.callbacks.onRoomReady?.({
          myColor: this.myColor,
          opponentProfile: this.opponentProfile,
          timeControlMinutes: this.timeControlMinutes,
          isHost: true
        });
      }
      return;
    }

    // 2. Guest receives room_ready ack from Host
    if (packet.type === 'room_ready') {
      clearInterval(this.joinRetryTimer);
      this.role = 'guest';
      this.myColor = packet.guestColor || 'b';
      this.opponentProfile = packet.hostProfile;
      this.timeControlMinutes = packet.timeControlMinutes ?? 0;
      this.connected = true;

      this._emitStatus(
        'connected',
        `Both Players in Room "${this.roomName}": You & ${this.opponentProfile.username}! Click START GAME!`
      );
      this.callbacks.onRoomReady?.({
        myColor: this.myColor,
        opponentProfile: this.opponentProfile,
        timeControlMinutes: this.timeControlMinutes,
        isHost: false
      });
      return;
    }

    // 3. Either player clicks "START GAME" button
    if (packet.type === 'start_game_signal') {
      this.myColor = packet.receiverColor || 'b';
      if (packet.starterProfile) {
        this.opponentProfile = packet.starterProfile;
      }
      this.timeControlMinutes = packet.timeControlMinutes ?? 0;
      this.gameStarted = true;
      this._emitStatus(
        'playing',
        `Playing live vs. ${this.opponentProfile.username} in room "${this.roomName}"`
      );
      this.callbacks.onMatchStart?.({
        myColor: this.myColor,
        opponentProfile: this.opponentProfile,
        timeControlMinutes: this.timeControlMinutes
      });
      return;
    }

    if (packet.type === 'move') {
      this.callbacks.onRemoteMove?.(packet.move, packet.clocks);
    } else if (packet.type === 'chat') {
      this.callbacks.onChatMessage?.({
        sender: packet.senderName,
        text: packet.text,
        timestamp: packet.timestamp
      });
    } else if (packet.type === 'resign') {
      this.callbacks.onRemoteResign?.(packet.color);
    } else if (packet.type === 'draw_offer') {
      this.callbacks.onRemoteDrawOffer?.(packet.fromName);
    } else if (packet.type === 'draw_accept') {
      this.callbacks.onRemoteDrawAccept?.();
    } else if (packet.type === 'rematch') {
      this.callbacks.onRemoteRematch?.(packet.newHostColor);
    } else if (packet.type === 'leave') {
      if (this.connected) {
        this.connected = false;
        this.gameStarted = false;
        this._emitStatus(
          'in_room_waiting',
          `Friend left room "${this.roomName}". Waiting for someone to join...`
        );
        this.callbacks.onOpponentDisconnected?.();
      }
    }
  }

  leaveRoom(notify = true) {
    clearInterval(this.joinRetryTimer);
    if (notify && (this.connected || this.inRoom)) {
      this.sendPacket({ type: 'leave' });
    }
    this.inRoom = false;
    this.connected = false;
    this.gameStarted = false;
    this.roomName = '';
    this.roomSlug = '';
    this.role = null;
    this.opponentProfile = null;

    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {}
      this.bc = null;
    }
    if (notify) {
      this._emitStatus('idle', 'Not in a room yet. Enter a room name & tap the red button to join.');
    }
  }

  _emitStatus(state, message) {
    this.callbacks.onStatusChange?.({
      state,
      message,
      roomName: this.roomName,
      roomSlug: this.roomSlug,
      role: this.role,
      inRoom: this.inRoom,
      connected: this.connected,
      gameStarted: this.gameStarted,
      opponent: this.opponentProfile
    });
  }
}
