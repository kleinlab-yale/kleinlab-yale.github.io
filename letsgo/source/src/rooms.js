import { Peer } from 'peerjs';
import { readAppearance } from './appearance.js';
import { MAX_EDITS } from './bricks.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PROTOCOL = 1;
const PREFIX = 'brickbloom-v1-';
const TIMEOUT = 24000;
const HEARTBEAT_INTERVAL = 2400;
const PEER_TIMEOUT = 12000;
const options = import.meta.env.VITE_SIGNAL_HOST ? {
  host: import.meta.env.VITE_SIGNAL_HOST,
  port: Number(import.meta.env.VITE_SIGNAL_PORT || 443),
  path: import.meta.env.VITE_SIGNAL_PATH || '/',
  secure: import.meta.env.VITE_SIGNAL_SECURE !== 'false',
} : {};

export function normalizeCode(code) {
  return code.toUpperCase().replace(/[\s-]/g, '');
}

export function validCode(code) {
  return code.length === 6 && Array.from(code).every(letter => ALPHABET.includes(letter));
}

function makeCode() {
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random, byte => ALPHABET[byte % ALPHABET.length]).join('');
}

function validSnapshot(snapshot) {
  return snapshot?.version === PROTOCOL && Array.isArray(snapshot.removed) && Array.isArray(snapshot.added) &&
    snapshot.removed.length <= MAX_EDITS && snapshot.added.length <= MAX_EDITS;
}

function validPose(pose) {
  return pose && [pose.x, pose.y, pose.z, pose.yaw].every(Number.isFinite) &&
    Math.abs(pose.x) < 45 && Math.abs(pose.z) < 48 && pose.y > -3 && pose.y < 27 && Math.abs(pose.yaw) <= Math.PI + 0.01;
}

export function createRooms(events) {
  let state = { role: null, phase: 'idle', code: '', message: '' };
  let peer = null;
  let link = null;
  let deadline = 0;
  let retry = 0;
  let heartbeat = 0;
  let lastMessage = 0;
  let attempts = 0;
  let ready = false;
  let snapshotSent = false;
  let pendingChanges = [];

  function report(phase, message = '') {
    state = { ...state, phase, message };
    events.status(state);
  }

  function teardown(announce = false) {
    clearTimeout(deadline);
    clearTimeout(retry);
    clearInterval(heartbeat);
    const active = peer;
    const connection = link;
    peer = null;
    link = null;
    ready = false;
    snapshotSent = false;
    pendingChanges = [];
    if (announce && connection?.open) {
      try { connection.send({ type: 'leave' }); } catch { /* The peer can already be gone. */ }
    }
    connection?.close();
    active?.destroy();
    events.pose(null);
  }

  function fail(message) {
    teardown();
    report('error', message);
  }

  function finishConnection(connection, message) {
    if (connection !== link) return;
    link = null;
    ready = false;
    snapshotSent = false;
    pendingChanges = [];
    clearTimeout(deadline);
    clearInterval(heartbeat);
    connection.close();
    events.pose(null);
    if (state.role === 'host') {
      report('waiting', message || 'Your friend left. The room is still open.');
    } else {
      fail(message || 'The host disconnected. Try joining the room again.');
    }
  }

  function send(type, payload) {
    if (!link?.open) return;
    try { link.send({ type, payload }); }
    catch { finishConnection(link, 'The connection dropped.'); }
  }

  function startHeartbeat(connection) {
    ready = true;
    lastMessage = performance.now();
    clearTimeout(deadline);
    heartbeat = setInterval(() => {
      if (performance.now() - lastMessage > PEER_TIMEOUT) finishConnection(connection);
      else send('ping');
    }, HEARTBEAT_INTERVAL);
  }

  function bind(connection) {
    link = connection;
    ready = false;
    deadline = setTimeout(() => finishConnection(connection, 'The connection timed out. Check that both networks allow browser multiplayer.'), TIMEOUT);
    connection.on('open', () => {
      if (connection !== link) return;
      if (state.role === 'host') report('syncing');
      else send('hello', PROTOCOL);
    });
    connection.on('data', message => {
      if (connection !== link || !message || typeof message !== 'object') return;
      const { type, payload } = message;
      const isHost = state.role === 'host';
      if (isHost && type === 'hello' && payload === PROTOCOL && !snapshotSent) {
        snapshotSent = true;
        send('snapshot', events.snapshot());
        return;
      }
      if (isHost && type === 'ready' && snapshotSent && !ready) {
        startHeartbeat(connection);
        const queued = pendingChanges;
        pendingChanges = [];
        for (const change of queued) send('change', change);
        if (link === connection) report('connected');
        return;
      }
      if (!isHost && type === 'snapshot' && !ready && validSnapshot(payload)) {
        events.restore(payload);
        startHeartbeat(connection);
        send('ready');
        if (link === connection) report('connected');
        return;
      }
      if (type === 'deny') {
        finishConnection(connection, 'This room already has two players.');
        return;
      }
      if (!ready) return;
      lastMessage = performance.now();
      if (type === 'leave') {
        finishConnection(connection);
      } else if (type === 'pose' && validPose(payload)) {
        events.pose({ x: payload.x, y: payload.y, z: payload.z, yaw: payload.yaw,
          moving: payload.moving === true, sprinting: payload.sprinting === true, grounded: payload.grounded === true });
      } else if (type === 'appearance') {
        const look = readAppearance(payload);
        if (look) events.appearance(look);
      } else if (isHost && type === 'request') {
        const change = events.request(payload);
        if (change) send('change', change);
        else send('blocked');
      } else if (!isHost && type === 'change') {
        events.change(payload);
      } else if (!isHost && type === 'blocked') {
        events.blocked();
      }
    });
    connection.on('close', () => finishConnection(connection));
    connection.on('error', () => finishConnection(connection, 'The connection dropped. Try joining again.'));
  }

  function start(role, code, attempt = 0) {
    teardown();
    attempts = attempt;
    state = { role, phase: 'opening', code, message: '' };
    events.status(state);
    const roomId = PREFIX + code.toLowerCase();
    const visitorId = PREFIX + 'visitor-' + Array.from(crypto.getRandomValues(new Uint8Array(10)), byte => byte.toString(16).padStart(2, '0')).join('');
    const active = new Peer(role === 'host' ? roomId : visitorId, options);
    peer = active;
    deadline = setTimeout(() => {
      if (peer === active) fail('The room service took too long to respond. Try again.');
    }, TIMEOUT);
    active.on('open', () => {
      if (peer !== active) return;
      clearTimeout(deadline);
      if (role === 'host') {
        if (state.phase === 'opening') report('waiting');
        return;
      }
      if (!link && state.phase === 'opening') {
        report('syncing');
        bind(active.connect(roomId, { reliable: true, serialization: 'binary', metadata: { version: PROTOCOL } }));
      }
    });
    active.on('connection', connection => {
      if (peer !== active || role !== 'host' || connection.metadata?.version !== PROTOCOL) {
        connection.close();
      } else if (link) {
        connection.on('open', () => {
          connection.send({ type: 'deny' });
          setTimeout(() => connection.close(), 400);
        });
      } else {
        bind(connection);
      }
    });
    active.on('error', error => {
      if (peer !== active) return;
      if (import.meta.env.DEV) console.debug('Room connection', error.type, error.message);
      if (error.type === 'unavailable-id' && role === 'host' && attempts < 3) {
        start('host', makeCode(), attempts + 1);
      } else if (error.type === 'peer-unavailable') {
        if (role === 'guest') fail('Room not found. Ask your friend to keep their room open.');
      } else if (!ready && ['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected', 'browser-incompatible'].includes(error.type)) {
        if (role === 'guest' && attempts < 2 && error.type !== 'browser-incompatible') {
          clearTimeout(deadline);
          clearTimeout(retry);
          retry = setTimeout(() => { if (peer === active) start(role, code, attempts + 1); }, 800 * (attempts + 1));
        } else {
          fail('Couldn’t reach the room service. Try again.');
        }
      } else if (!ready && state.phase === 'opening') {
        fail('The room couldn’t start. Try again.');
      }
    });
    active.on('disconnected', () => {
      if (peer !== active || role !== 'host') return;
      retry = setTimeout(() => {
        if (peer === active && active.disconnected && !active.destroyed) active.reconnect();
      }, 1600);
    });
  }

  return {
    get state() { return state; },
    host() { start('host', makeCode()); },
    join(code) { if (validCode(code)) start('guest', code); },
    leave() {
      teardown(true);
      state = { role: null, phase: 'idle', code: '', message: '' };
      events.status(state);
    },
    pose(pose) { if (ready) send('pose', pose); },
    appearance(look) { if (ready) send('appearance', look); },
    request(request) { if (ready) send('request', request); },
    broadcast(change) {
      if (state.role !== 'host' || !snapshotSent) return;
      if (ready) send('change', change);
      else pendingChanges.push(change);
    },
  };
}
