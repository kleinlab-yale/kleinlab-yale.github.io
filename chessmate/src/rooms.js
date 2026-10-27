// Human-readable room addresses are case-insensitive and independent of player names.
export function roomName(value = '') {
  let text = String(value).trim();
  try { text = new URL(text).searchParams.get('room') || text; } catch {}
  return text.replace(/^@/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
}
export function validRoom(value) { return /^[a-z0-9][a-z0-9-]{1,23}$/.test(value); }
export function suggestedRoom(name) { return roomName(name).replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'my-chess-room'; }
export function roomPeerId(name) { return `chessmate-room-v2-${roomName(name)}`; }
export function inviteLink(name, base = location.href) {
  const url = new URL(base); url.search = ''; url.hash = ''; url.searchParams.set('room', name); return url.href;
}
export function publicPlayer(profile, homeRoom) {
  if (!profile || typeof profile.name !== 'string' || typeof profile.id !== 'string') return null;
  return {id: profile.id.slice(0, 80), name: profile.name.trim().slice(0, 24) || 'Player', avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 24) : 'june', outfit: typeof profile.outfit === 'string' ? profile.outfit.slice(0, 24) : 'classic', elo: Number.isFinite(profile.elo) ? Math.max(100, Math.min(3000, profile.elo)) : 800, room: validRoom(homeRoom) ? homeRoom : ''};
}
export function rememberFriend(profile, friend, date = new Date()) {
  const person = publicPlayer(friend, roomName(friend?.room || ''));
  if (!person || person.id === profile.id) return profile;
  return {...profile, friends: [{...person, lastPlayed: date.toISOString()}, ...(profile.friends || []).filter(f => f.id !== person.id)].slice(0, 60)};
}

// A separate match channel buffers early messages and rejects messages from an old game.
export class MatchChannel {
  constructor(connection, matchId) { this.raw = connection; this.peer = connection.peer; this.matchId = matchId; this.listeners = new Map(); this.pending = []; this.open = true; }
  on(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    if (type === 'data') for (const data of this.pending.splice(0)) listener(data);
    if (type === 'close' && !this.open) listener();
  }
  off(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, data) { for (const listener of this.listeners.get(type) || []) listener(data); }
  receive(data) { if (!this.open) return; if (this.listeners.get('data')?.size) this.emit('data', data); else if (this.pending.length < 32) this.pending.push(data); }
  send(data) { if (this.open && this.raw.open) this.raw.send({type: 'game', matchId: this.matchId, data}); }
  close() { if (!this.open) return; this.open = false; this.pending = []; this.emit('close'); }
}

export class RoomSession {
  constructor({createPeer, getProfile, onChange, onStart, onHome, onInvite, timeout = 15000}) {
    Object.assign(this, {createPeer, getProfile, onChange, onStart, onHome, onInvite, timeout});
    this.ownedPeers = new Set();
    this.createPeer = id => { const peer = createPeer(id); this.ownedPeers.add(peer); peer.on('close', () => this.ownedPeers.delete(peer)); return peer; };
    this.state = {home: '', homeStatus: 'closed', guests: [], visit: null, invitations: [], error: '', inviting: ''};
    this.guests = new Map(); this.invitePeers = new Set(); this.timers = new Set(); this.active = null; this.disposed = false;
  }
  update(patch = {}) { if (this.disposed) return; Object.assign(this.state, patch); this.onChange({...this.state, guests: [...this.guests.values()].filter(g => g.player).map(g => ({id: g.connection.peer, player: g.player, starting: this.pending?.connection === g.connection})), invitations: [...this.state.invitations]}); }
  later(fn, delay = this.timeout) { const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, delay); this.timers.add(timer); return timer; }
  cancel(timer) { clearTimeout(timer); this.timers.delete(timer); }
  player() { const p = this.getProfile(); return publicPlayer(p, this.state.home || p?.homeRoom || suggestedRoom(p?.name)); }
  send(connection, data) { if (!connection?.open) return false; try { connection.send(data); return true; } catch { return false; } }
  reject(connection, reason) { this.send(connection, {type: 'unavailable', reason}); this.later(() => connection.close(), 250); }
  presence() { for (const guest of this.guests.values()) this.send(guest.connection, {type: 'welcome', player: this.player(), room: this.state.home, busy: !!this.active || !!this.pending}); }
  async open(name) {
    name = roomName(name);
    if (!validRoom(name)) { this.update({error: 'Use 2–24 letters, numbers, or hyphens for your room name.'}); return false; }
    if (this.state.homeStatus === 'open' && this.state.home === name) return true;
    if (this.state.homeStatus === 'opening') return false;
    this.closeHome(); this.update({home: name, homeStatus: 'opening', error: ''});
    const peer = this.createPeer(roomPeerId(name)); this.homePeer = peer;
    return new Promise(resolve => {
      let settled = false;
      const done = value => { if (settled) return; settled = true; this.cancel(timer); resolve(value); };
      const fail = message => { if (this.homePeer !== peer) return; this.closeHome(); this.update({error: message}); done(false); };
      const timer = this.later(() => fail('Your room couldn’t get online. Check your connection and try again.'));
      peer.on('open', () => { if (this.homePeer !== peer || this.disposed) { done(false); return; } this.update({homeStatus: 'open'}); this.onHome(name); done(true); });
      peer.on('connection', connection => this.receiveGuest(connection));
      peer.on('error', error => fail(error.type === 'unavailable-id' ? `@${name} is already open. Close your other tab, or choose a different room name.` : 'Your room lost its connection. Reopen it to welcome friends.'));
      peer.on('disconnected', () => fail('Your room went offline. Reopen it to welcome friends.'));
      peer.on('close', () => { if (this.homePeer === peer) fail('Your room closed. You can open it again.'); else done(false); });
    });
  }
  receiveGuest(connection) {
    if (this.guests.size >= 8) { connection.on('open', () => this.reject(connection, 'This room has a full waiting list. Try again in a moment.')); return; }
    const guest = {connection, player: null}; this.guests.set(connection.peer, guest);
    const timer = this.later(() => { if (!guest.player) connection.close(); });
    connection.on('data', data => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'knock' && !guest.player) {
        const player = publicPlayer(data.player, roomName(data.player?.room || ''));
        if (!player || player.id === this.getProfile()?.id) { this.reject(connection, 'Use another player profile to join this room.'); return; }
        if ([...this.guests.values()].some(g => g !== guest && g.player?.id === player.id)) { this.reject(connection, 'You are already waiting in this room in another tab.'); return; }
        guest.player = player; this.cancel(timer); this.presence(); this.update();
      }
      if (data.type === 'invitation' && !guest.player) {
        const player = publicPlayer(data.player, roomName(data.player?.room || ''));
        if (player?.room && player.id !== this.getProfile()?.id) {
          this.update({invitations: [{player}, ...this.state.invitations.filter(i => i.player.id !== player.id)].slice(0, 8)});
          this.send(connection, {type: 'invite-delivered'}); this.onInvite(player);
        }
        this.cancel(timer); this.later(() => connection.close(), 250);
      }
      if (data.type === 'ready' && this.pending?.connection === connection && data.matchId === this.pending.matchId && !this.active) {
        const matchId = this.pending.matchId; this.cancel(this.pending.timer); this.pending = null;
        this.start(connection, guest.player, true, matchId);
        this.send(connection, {type: 'start', matchId}); this.presence();
      }
      if (data.type === 'game' && this.active?.raw === connection && data.matchId === this.active.matchId) this.active.receive(data.data);
    });
    const remove = () => { this.cancel(timer); if (this.guests.get(connection.peer) !== guest) return; this.guests.delete(connection.peer); this.connectionClosed(connection); this.update(); this.presence(); };
    connection.on('close', remove); connection.on('error', () => { connection.close(); remove(); });
  }
  accept(id) {
    const guest = this.guests.get(id);
    if (!guest?.player || !guest.connection.open || this.active || this.pending) return;
    if (this.visitConnection) { this.update({error: 'Leave the room you’re visiting before starting a game at home.'}); return; }
    const matchId = crypto.randomUUID();
    this.pending = {connection: guest.connection, matchId, timer: this.later(() => { if (this.pending?.matchId === matchId) { this.pending = null; this.update({error: 'That guest didn’t respond. Try again or choose another player.'}); guest.connection.close(); this.presence(); } })};
    this.send(guest.connection, {type: 'offer', matchId}); this.update(); this.presence();
  }
  decline(id) { const guest = this.guests.get(id); if (guest && this.active?.raw !== guest.connection) this.reject(guest.connection, `${this.getProfile().name} isn’t ready for a game. Try another room or visit again later.`); }
  join(name, retry = false) {
    name = roomName(name);
    if (!validRoom(name)) { this.update({error: 'Enter a room name, such as emma, or paste an invitation.'}); return; }
    if (name === this.state.home && this.homePeer) { this.update({error: 'You’re already at home. Invite a friend to join you.'}); return; }
    if (this.active || this.pending) return;
    this.leaveVisit(); this.update({visit: {room: name, status: 'connecting', player: null, retry}, error: ''});
    const peer = this.createPeer(); this.visitPeer = peer;
    const fail = message => { if (this.visitPeer !== peer) return; this.leaveVisit(); this.update({error: message}); };
    const timer = this.later(() => {
      if (this.visitPeer !== peer) return;
      if (!retry) this.join(name, true);
      else fail(`@${name} isn’t responding. Ask your friend to open their room and keep Chessmate online, or try a different network.`);
    });
    peer.on('open', () => {
      if (this.visitPeer !== peer) return;
      const connection = peer.connect(roomPeerId(name), {reliable: true}); this.visitConnection = connection;
      let offered = '';
      connection.on('open', () => this.send(connection, {type: 'knock', player: this.player()}));
      connection.on('data', data => {
        if (this.visitConnection !== connection || !data || typeof data !== 'object') return;
        if (data.type === 'welcome') {
          const player = publicPlayer(data.player, name); if (!player) return;
          this.cancel(timer); this.update({visit: {room: name, status: 'waiting', player, busy: !!data.busy}});
        }
        if (data.type === 'unavailable') fail(typeof data.reason === 'string' ? data.reason.slice(0, 180) : 'This room isn’t available.');
        if (data.type === 'offer' && !this.active && this.state.visit?.player && typeof data.matchId === 'string') { offered = data.matchId; this.send(connection, {type: 'ready', matchId: offered}); }
        if (data.type === 'start' && offered && data.matchId === offered && !this.active) { this.start(connection, this.state.visit.player, false, offered); offered = ''; }
        if (data.type === 'game' && this.active?.raw === connection && data.matchId === this.active.matchId) this.active.receive(data.data);
      });
      connection.on('close', () => { this.cancel(timer); this.connectionClosed(connection); fail(`${this.state.visit?.player?.name || 'Your friend'} closed the table. You can join again whenever their room is open.`); });
      connection.on('error', () => fail('The connection was interrupted. Please try joining again.'));
    });
    peer.on('error', () => { this.cancel(timer); fail(`@${name} is offline or can’t be reached. Check the spelling, or send your friend an invitation.`); });
    peer.on('disconnected', () => { if (!this.active) fail('Your connection was interrupted. Please join again.'); });
  }
  start(connection, opponent, isHost, matchId) {
    const channel = new MatchChannel(connection, matchId); this.active = channel;
    this.onStart({connection: channel, opponent, isHost, managed: true, matchId}); this.update();
  }
  connectionClosed(connection) {
    if (this.pending?.connection === connection) { this.cancel(this.pending.timer); this.pending = null; }
    if (this.active?.raw === connection) { this.active.close(); this.active = null; }
  }
  endGame() {
    const channel = this.active; if (!channel) return;
    this.active = null; channel.close();
    if (channel.raw === this.visitConnection) this.leaveVisit(true);
    else { this.guests.delete(channel.raw.peer); this.later(() => channel.raw.close(), 250); this.presence(); this.update(); }
  }
  leaveVisit(flush = false) {
    const connection = this.visitConnection, peer = this.visitPeer;
    const wasPlaying = flush || connection && this.active?.raw === connection;
    this.visitConnection = null; this.visitPeer = null;
    if (connection) this.connectionClosed(connection);
    // Let the last reliable message (for example resignation) leave before closing.
    if (peer) { if (wasPlaying) this.later(() => peer.destroy(), 250); else peer.destroy(); }
    this.update({visit: null});
  }
  async invite(friend, homeName) {
    if (this.state.inviting) return false;
    if (!validRoom(friend.room)) return false;
    if (this.state.homeStatus !== 'open' && !await this.open(homeName)) return false;
    this.update({inviting: friend.id, error: ''});
    const peer = this.createPeer(); this.invitePeers.add(peer);
    return new Promise(resolve => {
      let done = false;
      const finish = success => { if (done) return; done = true; this.cancel(timer); this.invitePeers.delete(peer); peer.destroy(); this.update({inviting: ''}); resolve(success); };
      const timer = this.later(() => finish(false), Math.min(this.timeout, 8000));
      peer.on('open', () => { const connection = peer.connect(roomPeerId(friend.room), {reliable: true}); connection.on('open', () => this.send(connection, {type: 'invitation', player: this.player()})); connection.on('data', data => { if (data?.type === 'invite-delivered') finish(true); }); connection.on('close', () => finish(false)); connection.on('error', () => finish(false)); });
      peer.on('error', () => finish(false));
    });
  }
  dismissInvite(id) { this.update({invitations: this.state.invitations.filter(i => i.player.id !== id)}); }
  closeHome() {
    const peer = this.homePeer; this.homePeer = null;
    for (const guest of this.guests.values()) { this.connectionClosed(guest.connection); this.reject(guest.connection, 'The host closed this room. Come back when they’re online.'); }
    this.guests.clear(); if (peer) this.later(() => peer.destroy(), 250);
    this.update({home: '', homeStatus: 'closed'});
  }
  destroy() {
    this.disposed = true; this.active?.close(); this.homePeer?.destroy(); this.visitPeer?.destroy();
    for (const peer of this.ownedPeers) peer.destroy();
    for (const timer of this.timers) clearTimeout(timer); this.timers.clear();
  }
}
