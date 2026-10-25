/**
 * Zero-Config Room-Name Multiplayer Manager
 * Combines PeerJS (WebRTC P2P across the internet) + BroadcastChannel (instant same-browser sync).
 * Two players simply enter the same Room Name on GitHub Pages to connect and play!
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
    this.connected = false;
    this.peer = null;
    this.conn = null;
    this.bc = null;
    this.clientId = 'c_' + Math.random().toString(36).slice(2, 10);
    this.seenMessages = new Set();
    this.opponentProfile = null;
    this.localProfile = null;
  }

  isActive() {
    return !!this.roomSlug;
  }

  isConnected() {
    return this.connected;
  }

  joinRoom(roomName, localProfile, preferredColor = 'w', timeControlMinutes = 10) {
    this.leaveRoom(false);

    const slug = normalizeRoomSlug(roomName);
    if (!slug) {
      this._emitStatus('error', 'Please enter a valid room name.');
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
    this.timeControlMinutes = timeControlMinutes;

    this._emitStatus('connecting', `Joining room "${this.roomName}"...`);

    // 1. Set up BroadcastChannel for instant local multi-tab discovery
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`arcane_chess_room_${slug}`);
        this.bc.onmessage = ev => {
          if (ev.data && ev.data.senderId !== this.clientId) {
            this._handleIncomingPacket(ev.data, 'bc');
          }
        };
        // Ping local tabs to see if a host is already waiting in another tab
        this._sendViaBroadcast({
          type: 'bc_discover',
          profile: this.localProfile
        });
      } catch (e) {
        console.warn('BroadcastChannel unavailable:', e);
      }
    }

    // 2. Set up PeerJS WebRTC P2P connection using deterministic Host ID
    if (typeof window.Peer === 'undefined') {
      // Fallback to BroadcastChannel-only if PeerJS CDN didn't load (e.g., offline)
      this.role = 'host';
      this.myColor = preferredColor === 'b' ? 'b' : 'w';
      this._emitStatus(
        'waiting',
        `Waiting in room "${this.roomName}" (Local Tab Mode — open a second tab with room "${this.roomName}")`
      );
      return;
    }

    const hostPeerId = `arcane-wizard-chess-v1-${slug}-host`;

    try {
      const hostPeer = new window.Peer(hostPeerId, {
        debug: 0
      });
      this.peer = hostPeer;

      hostPeer.on('open', () => {
        // We successfully claimed the Host ID for this room name!
        if (this.connected) return;
        this.role = 'host';
        this.myColor = this.preferredColor === 'b' ? 'b' : 'w';
        this._emitStatus(
          'waiting',
          `Room "${this.roomName}" created! Waiting for opponent to enter room "${this.roomName}"...`
        );
      });

      hostPeer.on('connection', conn => {
        this.conn = conn;
        this._setupPeerConnection(conn);
      });

      hostPeer.on('error', err => {
        if (err && err.type === 'unavailable-id') {
          // Someone is already hosting this room name! Connect as Guest!
          this._connectAsGuest(hostPeerId);
        } else {
          console.warn('PeerJS error:', err);
          if (!this.connected) {
            this._emitStatus(
              'waiting',
              `Waiting for opponent in room "${this.roomName}"...`
            );
          }
        }
      });
    } catch (e) {
      console.warn('PeerJS initialization failed:', e);
    }
  }

  _connectAsGuest(hostPeerId) {
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
    }

    this.role = 'guest';
    this._emitStatus('connecting', `Found room "${this.roomName}"! Connecting to host...`);

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
        this._emitStatus('error', `Could not connect to room "${this.roomName}".`);
      }
    });
  }

  _setupPeerConnection(conn) {
    conn.on('open', () => {
      if (this.role === 'guest') {
        this.sendPacket({
          type: 'join_request',
          profile: this.localProfile
        });
      }
    });

    conn.on('data', data => {
      this._handleIncomingPacket(data, 'peer');
    });

    conn.on('close', () => {
      if (this.connected) {
        this.connected = false;
        this._emitStatus('disconnected', `Opponent left room "${this.roomName}".`);
        this.callbacks.onOpponentDisconnected?.();
      }
    });
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

  _handleIncomingPacket(packet, source) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.msgId) {
      if (this.seenMessages.has(packet.msgId)) return;
      this.seenMessages.add(packet.msgId);
    }

    if (packet.type === 'bc_discover') {
      // Another browser tab joined the same room name
      if (!this.connected && (this.role === 'host' || !this.role)) {
        this.role = 'host';
        this.myColor = this.preferredColor === 'b' ? 'b' : 'w';
        this.opponentProfile = packet.profile;
        this.connected = true;
        const guestColor = this.myColor === 'w' ? 'b' : 'w';
        this.sendPacket({
          type: 'match_start',
          hostProfile: this.localProfile,
          guestColor,
          timeControlMinutes: this.timeControlMinutes
        });
        this._emitStatus(
          'connected',
          `Connected with ${this.opponentProfile.username} (${this.opponentProfile.elo} Elo)`
        );
        this.callbacks.onMatchStart?.({
          myColor: this.myColor,
          opponentProfile: this.opponentProfile,
          timeControlMinutes: this.timeControlMinutes,
          isHost: true
        });
      }
      return;
    }

    if (packet.type === 'join_request' && this.role === 'host') {
      this.opponentProfile = packet.profile;
      this.connected = true;
      const guestColor = this.myColor === 'w' ? 'b' : 'w';
      this.sendPacket({
        type: 'match_start',
        hostProfile: this.localProfile,
        guestColor,
        timeControlMinutes: this.timeControlMinutes
      });
      this._emitStatus(
        'connected',
        `Connected with ${this.opponentProfile.username} (${this.opponentProfile.elo} Elo)`
      );
      this.callbacks.onMatchStart?.({
        myColor: this.myColor,
        opponentProfile: this.opponentProfile,
        timeControlMinutes: this.timeControlMinutes,
        isHost: true
      });
      return;
    }

    if (packet.type === 'match_start' && !this.connected) {
      this.role = 'guest';
      this.myColor = packet.guestColor || 'b';
      this.opponentProfile = packet.hostProfile;
      this.timeControlMinutes = packet.timeControlMinutes || 10;
      this.connected = true;
      this._emitStatus(
        'connected',
        `Connected with ${this.opponentProfile.username} (${this.opponentProfile.elo} Elo)`
      );
      this.callbacks.onMatchStart?.({
        myColor: this.myColor,
        opponentProfile: this.opponentProfile,
        timeControlMinutes: this.timeControlMinutes,
        isHost: false
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
        this._emitStatus('disconnected', `Opponent left room "${this.roomName}".`);
        this.callbacks.onOpponentDisconnected?.();
      }
    }
  }

  leaveRoom(notify = true) {
    if (notify && this.connected) {
      this.sendPacket({ type: 'leave' });
    }
    this.connected = false;
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
      this._emitStatus('idle', 'Not in a multiplayer room.');
    }
  }

  _emitStatus(state, message) {
    this.callbacks.onStatusChange?.({
      state,
      message,
      roomName: this.roomName,
      roomSlug: this.roomSlug,
      role: this.role,
      connected: this.connected,
      opponent: this.opponentProfile
    });
  }
}
