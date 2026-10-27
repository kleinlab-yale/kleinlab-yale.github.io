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
  const url = new URL('./room.html',base); url.search = ''; url.hash = ''; url.searchParams.set('room', name); return url.href;
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

