import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './style.css';
import { CAMERAS, DEFAULT_LOOK, readAppearance } from './appearance.js';
import { createCustomizer } from './customize.js';
import { adjacentBrick, PLATE, REACH, STUD, TONES } from './bricks.js';
import { createBuildMenu, partButton, toneName } from './build-menu.js';
import { Builder, PROTECTED_BRICK } from './editor.js';
import { BUILD_KITS, BUILD_PACKS, PLACEABLE_OBJECTS, layoutPart, matchedPart } from './parts.js';
import { createGraphics } from './graphics.js';
import { EYE, HEIGHT, movePlayer, RADIUS, spawnPlayer } from './player.js';
import { createRooms, normalizeCode, validCode } from './rooms.js';
import { createAudio } from './audio.js';
import { createActivities, objectDistance } from './activities.js';
import { createJournal } from './journal.js';
import { createProgress } from './progression.js';
import { district, makeValley } from './valley.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'brick-and-bloom:valley:1';
const LOOK_KEY = 'brick-and-bloom:appearance:1';
const VIEW_KEY = 'brick-and-bloom:view:1';
const KIT_KEY = 'letsgo:build-kit:1';
const AUDIO_KEY = 'letsgo:audio:1';
const icons = {
  brick: '<path d="M2.5 11.8 12 6.5l9.5 5.3v5.5L12 22.5l-9.5-5.2zM2.5 11.8 12 17l9.5-5.2M12 17v5.5M7 9.2V6.5l5-2.8 5 2.8v2.7M7 6.5l5 2.8 5-2.8M12 9.3V12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  journal: '<path d="M12 6c-2.5-2-5.5-2.5-9-2v14c3.5-.5 6.5 0 9 2 2.5-2 5.5-2.5 9-2V4c-3.5-.5-6.5 0-9 2v14M6 8.5l3 .9M6 12l3 .9m6-3.5 3-.9m-3 4.4 3-.9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  camera: '<path d="M3 7h4l1.5-2h7L17 7h4v12H3z"/><circle cx="12" cy="13" r="3.1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2.5-3 4m0 3h.01"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>',
  move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  sound: '<path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  rotate: '<path d="M3 4v5h5M3.6 9A9 9 0 1 1 4 16"/>',
  undo: '<path d="M4 14l4-4-4-4m0 4h10a5 5 0 0 1 0 10h-3"/>',
  paint: '<path d="m7 13 8-8 5 5-8 8-5-5Zm0 0-3 3 4 4 4-2M3 7h7"/>',
  object: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Zm8 4-8 4-8-4m8 4v10M8 5l8 4"/>',
  boat: '<path d="M4 14h16l-3 5H7l-3-5ZM12 4v10m0-9 5 6h-5"/>',
  tea: '<path d="M5 10h11v3a5.5 5.5 0 0 1-11 0v-3Zm11 1h2a2 2 0 0 1 0 4h-2M4 20h13M9 3v3m3-4v4"/>',
  paw: '<path d="M7.5 18.5c-1.5-2.5 2.4-6.5 4.5-6.5s6 4 4.5 6.5c-1 1.7-3.4.3-4.5.3s-3.5 1.4-4.5-.3Z"/><ellipse cx="5.5" cy="10" rx="1.65" ry="2.2"/><ellipse cx="10" cy="6.6" rx="1.65" ry="2.2"/><ellipse cx="14" cy="6.6" rx="1.65" ry="2.2"/><ellipse cx="18.5" cy="10" rx="1.65" ry="2.2"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',
  message: '<path d="M20.5 11.5a8.2 8.2 0 0 1-8.5 8.1c-1.4 0-2.7-.3-3.9-.9l-4.1 1.1 1-3.7a7.8 7.8 0 0 1-1.5-4.6 8.5 8.5 0 0 1 17 0Z"/><path d="M8 11.5h8"/>',
};
function drawIcon(element, icon) {
  element.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${icons[icon]}</svg>`;
}
for (const element of document.querySelectorAll('[data-icon]')) drawIcon(element, element.dataset.icon);

function stored(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function remember(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function boot() {
  const game = $('game');
  const canvas = $('world');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const compact = matchMedia('(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 500px) and (max-width: 950px)');
  const updateLayout = () => { game.dataset.compact = String(compact.matches); };
  updateLayout();
  compact.addEventListener('change', updateLayout);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audio = createAudio(stored(AUDIO_KEY), settings => remember(AUDIO_KEY, settings));
  const world = makeValley();
  let saveTimer = 0;
  let saveCache = stored(SAVE_KEY);
  world.restore(saveCache);
  const progress = createProgress(stored, remember, world.added.size);
  const localEditor = new Builder(world);
  localEditor.restoreHistory(saveCache);
  const graphics = createGraphics(canvas, world, compact);
  let appearance = readAppearance(stored(LOOK_KEY)) ?? { ...DEFAULT_LOOK };
  const storedView = stored(VIEW_KEY);
  let view = Number.isInteger(storedView) && CAMERAS[storedView] ? storedView : 0;
  graphics.local.appearance(appearance);
  const keys = new Set();
  const padPointers = new Map();
  const stick = { id: null, x: 0, z: 0 };
  let player = spawnPlayer(world);
  const orbit = { yaw: player.yaw, pitch: player.pitch };
  let remote = null;
  let guestWorld = false;
  let screen = 'title';
  const savedKit = stored(KIT_KEY);
  const initialKit = BUILD_KITS.find(kit => kit.key === savedKit && (!BUILD_PACKS[kit.key] || progress.unlocked(kit.key))) ?? BUILD_KITS[0];
  let quickParts = initialKit.parts.slice(0, 7);
  let selected = quickParts[0];
  let turn = 0;
  let color = null;
  let tool = 'explore';
  let jump = false;
  let drag = null;
  let aimPoint = null;
  let flashUntil = 0;
  let toastTimer;
  let lastPose = 0;
  let lastStep = 0;
  let lastDistrict = '';
  let roomPanelFromPause = false;
  let controlsFromPause = false;
  let appearanceFromPause = false;
  const dialogs = { pause: $('pause-dialog'), room: $('room-dialog'), controls: $('controls-dialog'), appearance: $('appearance-dialog'),
    parts: $('parts-dialog'), voyage: $('voyage-dialog'), journal: $('journal-dialog') };
  const compactTools = Array.from(document.querySelectorAll('[data-compact-tool]'));

  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3800);
  }

  function achieve(action, id, message = '') {
    const packs = progress.record(action, id);
    if (packs.length || action === 'rescue') audio.tap('reward');
    if (packs.length || message) toast([message, ...packs.map(key => `${BUILD_PACKS[key].name} unlocked.`)].filter(Boolean).join(' '));
  }

  function save() {
    if (guestWorld) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
    saveCache = { ...world.snapshot(), undo: localEditor.history };
    if (!remember(SAVE_KEY, saveCache)) toast('Browser storage is unavailable. Keep this tab open to keep your changes.');
  }

  world.onChange = (edits, previous) => {
    if (!edits) graphics.dirty(null);
    else for (const { brick } of [...edits, ...previous]) if (brick) graphics.dirty(brick);
    if (!guestWorld && edits) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 250);
    }
  };
  window.addEventListener('pagehide', event => {
    if (saveTimer) save();
    if (event.persisted) leaveRoom();
    else rooms.leave();
  });

  function setScreen(next) {
    screen = next;
    game.dataset.screen = next === 'title' ? 'title' : 'play';
    $('title-screen').hidden = next !== 'title';
    $('hud').hidden = next !== 'play';
    $('controls-button').hidden = next !== 'title';
    $('menu-button').hidden = next === 'title';
    $('journal-button').hidden = next === 'title';
    $('camera-controls').hidden = next === 'title';
    $('district').hidden = next === 'title';
    $('room-shortcut').hidden = next === 'title';
    if (next === 'title') {
      graphics.pet('local', null);
      graphics.pet('friend', null);
    }
    if (next !== 'play') {
      keys.clear();
      padPointers.clear();
      jump = false;
      drag = null;
      aimPoint = null;
      game.classList.remove('looking');
      stick.id = null;
      stick.x = stick.z = 0;
      $('stick').style.transform = '';
      player.moving = player.sprinting = false;
      graphics.aim(null, null, false);
    }
  }

  function enter() {
    for (const dialog of Object.values(dialogs)) dialog.close();
    audio.start();
    setScreen('play');
    canvas.focus({ preventScroll: true });
  }

  function showPause() {
    if (screen !== 'play') return;
    setScreen('pause');
    dialogs.pause.showModal();
  }

  function showRoom() {
    roomPanelFromPause = screen === 'pause';
    if (screen === 'play') setScreen('pause');
    dialogs.pause.close();
    refreshRoom(rooms.state);
    dialogs.room.showModal();
  }

  function showControls() {
    controlsFromPause = screen === 'pause';
    dialogs.pause.close();
    dialogs.controls.showModal();
  }

  function showAppearance() {
    appearanceFromPause = screen === 'pause';
    if (screen === 'play') setScreen('pause');
    dialogs.pause.close();
    dialogs.appearance.showModal();
    customizer.show();
  }

  function closeDialog(name) {
    if (name === 'pause') {
      enter();
      return;
    }
    dialogs[name].close();
    if (name === 'parts' || name === 'voyage' || name === 'journal') enter();
    if (name === 'controls' && controlsFromPause) dialogs.pause.showModal();
    if (name === 'appearance' && screen === 'pause') {
      if (appearanceFromPause) dialogs.pause.showModal();
      else enter();
    }
    if (name === 'room') {
      const { phase, role } = rooms.state;
      if (role === 'guest' && ['opening', 'syncing'].includes(phase)) rooms.leave();
      if (roomPanelFromPause) dialogs.pause.showModal();
      else if (screen === 'pause') enter();
    }
  }

  function refreshRoom(state) {
    const { phase, role, code, message } = state;
    const active = ['opening', 'syncing', 'waiting', 'connected'].includes(phase);
    const open = phase === 'waiting' || phase === 'connected';
    $('room-idle').hidden = active;
    $('room-active').hidden = !active && !guestWorld;
    $('code-area').hidden = !active || !code || (role === 'host' && phase === 'opening');
    $('room-code').textContent = code;
    $('copy-button').hidden = role !== 'host';
    $('invite-actions').hidden = role !== 'host' || !active || !code || phase === 'opening';
    $('invite-text').hidden = true;
    $('room-enter').hidden = !open;
    $('room-enter').firstChild.textContent = screen === 'title' ? 'Enter valley ' : 'Back to valley ';
    $('leave-room').textContent = phase === 'opening' || (phase === 'syncing' && role === 'guest') ? 'Cancel' : 'Leave room';
    const statuses = {
      opening: role === 'host' ? 'Opening your room…' : 'Finding the host…',
      waiting: 'Keep this tab open. Guests can build and edit their own bricks during their visit.',
      syncing: 'Connecting to your friend…',
      connected: '2 players connected.',
    };
    const status = message || statuses[phase] || '';
    $('room-status').hidden = !status;
    $('room-status').textContent = status;
    $('room-status').dataset.error = String(phase === 'error');
    $('room-shortcut-label').textContent = phase === 'connected' ? '2 players' : phase === 'waiting' ? '1 / 2 players' : 'Co-op';
  }

  function localBoxes() {
    const boxes = [world.playerBox(player.x, player.y, player.z, RADIUS, HEIGHT)];
    if (remote) boxes.push(world.playerBox(remote.x, remote.y, remote.z, RADIUS, HEIGHT));
    return boxes;
  }

  function reachFrom(pose, brick, tolerance = 0) {
    const x = Math.max(brick.x * STUD - pose.x, 0, pose.x - (brick.x + brick.w) * STUD);
    const y = Math.max(brick.y * PLATE - pose.y - EYE, 0, pose.y + EYE - (brick.y + brick.h) * PLATE);
    const z = Math.max(brick.z * STUD - pose.z, 0, pose.z - (brick.z + brick.d) * STUD);
    return Math.hypot(x, y, z) <= REACH + tolerance;
  }

  const rooms = createRooms({
    snapshot: () => world.snapshot(),
    restore: snapshot => {
      if (!guestWorld && saveTimer) save();
      guestWorld = true;
      world.restore(snapshot);
      resetPlayer();
      setTool(tool);
    },
    status: state => {
      refreshRoom(state);
      refreshBuildStatus();
      if (state.phase === 'connected') {
        rooms.appearance(appearance);
        if (state.role === 'guest') enter();
        toast(state.role === 'host' ? 'Your friend joined the valley.' : 'You joined your friend’s valley.');
      } else if (screen === 'play' && state.message) {
        toast(state.message);
      }
    },
    pose: state => {
      remote = state;
      graphics.traveler.state(screen === 'title' ? null : state);
      graphics.vessel('guest', screen !== 'title' && state?.boat ? { ...state.boat, x: state.x, z: state.z } : null);
      graphics.pet('friend', screen === 'title' ? null : state?.pet);
    },
    appearance: look => graphics.traveler.appearance(look),
    visitor: () => new Builder(world, true),
    request: (request, visitor) => {
      if (!remote) return { error: 'blocked' };
      const result = visitor.perform(request, localBoxes(), brick => request?.kind === 'use' ?
        objectDistance(remote, brick) < 3.1 : reachFrom(remote, brick, 1.15));
      if (result.edits) audio.tap(request.kind);
      return result;
    },
    change: (edits, kind, guestEdit) => {
      if (!world.patch(edits)) return false;
      audio.tap(kind ?? (edits.every(edit => !edit.brick) ? 'remove' : 'place'));
      if (guestEdit && kind === 'place') achieve('place');
      return true;
    },
    blocked: error => toast(buildMessage(error)),
    buildStatus: refreshBuildStatus,
    tea: action => activities.receiveTea(action, remote),
  });

  function leaveRoom() {
    if (guestWorld) {
      guestWorld = false;
      world.restore(saveCache);
      resetPlayer();
      setTool(tool);
    }
    rooms.leave();
  }

  function refreshBuildStatus() {
    const disabled = guestWorld ? !rooms.canGuestUndo : !localEditor.canUndo;
    $('undo-build').disabled = disabled;
    compactTools.find(button => button.dataset.compactTool === 'undo').disabled = disabled;
  }

  function buildMessage(error) {
    const messages = {
      protected: PROTECTED_BRICK,
      blocked: 'That spot is blocked or out of reach.',
      square: 'This piece has the same shape after a quarter turn.',
      color: 'That brick already uses this color.',
      nothing: 'There are no more edits to undo.',
      changed: 'Another edit changed that brick. Try Undo again for an earlier edit.',
      restore: 'Clear the spot before restoring that brick.',
      doorway: 'Step clear of the doorway to close it.',
      'open-water': 'Open water ahead. Take a boat to the outer islands.',
    };
    return messages[error] ?? messages.blocked;
  }

  function setTool(kind) {
    tool = kind;
    game.dataset.tool = kind;
    for (const action of ['explore', 'place', 'remove', 'rotate', 'paint']) {
      $(`${action}-tool`).setAttribute('aria-pressed', String(kind === action));
    }
    for (const button of compactTools) {
      if (button.dataset.compactTool !== 'undo') button.setAttribute('aria-pressed', String(kind === button.dataset.compactTool));
    }
    for (const [index, button] of Array.from($('inventory').children).entries()) {
      button.setAttribute('aria-pressed', String(kind === 'place' && quickParts[index] === selected));
    }
    $('selected-piece').hidden = kind !== 'place' && kind !== 'paint';
    const verb = coarse ? 'Tap' : 'Click';
    const guestHint = guestWorld ? ' you placed this visit' : '';
    const hints = {
      explore: coarse ? 'Joystick to move · Drag to orbit' : 'Arrow keys to move · Drag to orbit',
      place: `${verb} a surface to place this piece.`,
      remove: `${verb} a brick${guestHint} to remove it.`,
      rotate: `${verb} a brick${guestHint} to turn it.`,
      paint: `${verb} a brick${guestHint} to paint it.`,
      pick: `${verb} a brick to match its shape and color.`,
    };
    $('build-guide').textContent = hints[kind];
    $('phone-build-guide').hidden = kind === 'explore';
    $('phone-build-guide').textContent = kind === 'place' ? `Tap a surface to place ${selected.name.toLowerCase()}.` : hints[kind];
    $('phone-build-label').textContent = kind === 'explore' ? 'Build' : 'Tools';
    $('phone-explore-button').hidden = kind === 'explore';
    refreshBuildStatus();
  }

  function showSelected() {
    const shape = layoutPart(selected, turn, color);
    const output = $('selected-piece');
    output.textContent = selected.name;
    const detail = document.createElement('small');
    detail.textContent = `${shape.w} × ${shape.d} · ${toneName(color ?? selected.tone)}`;
    output.append(detail);
  }

  const customizer = createCustomizer(dialogs.appearance, appearance, graphics.preview, look => {
    appearance = look;
    graphics.local.appearance(appearance);
    remember(LOOK_KEY, appearance);
    rooms.appearance(appearance);
  });

  function setView(index, notify = true) {
    view = (index + CAMERAS.length) % CAMERAS.length;
    const camera = CAMERAS[view];
    $('camera-label').textContent = `Camera · ${camera.short}`;
    $('camera-button').setAttribute('aria-label', `Change camera view (${camera.name})`);
    for (const [i, button] of Array.from($('camera-options').children).entries()) {
      button.setAttribute('aria-pressed', String(i === view));
    }
    if (notify) {
      remember(VIEW_KEY, view);
      if (screen === 'play') toast(camera.name);
    }
  }

  for (const [index, camera] of CAMERAS.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = camera.name;
    button.onclick = () => setView(index);
    $('camera-options').append(button);
  }
  setView(view, false);

  function refreshTray() {
    const tray = $('inventory');
    tray.replaceChildren();
    for (const [index, part] of quickParts.entries()) {
      const button = partButton(part, index + 1, tool === 'place' && selected === part, selected === part ? turn : 0, color);
      button.onclick = () => { select(part); canvas.focus({ preventScroll: true }); };
      tray.append(button);
    }
  }

  function select(part, kind = 'place') {
    selected = part;
    turn = 0;
    showSelected();
    refreshTray();
    setTool(kind);
  }

  function turnNext() {
    turn = (turn + 1) % 4;
    showSelected();
    refreshTray();
    setTool('place');
  }

  function showParts(mode, kitKey) {
    if (screen !== 'play' && !dialogs.journal.open) return;
    dialogs.journal.close();
    setScreen('pause');
    dialogs.parts.showModal();
    dialogs.parts.scrollTop = 0;
    buildMenu.open(mode, color, kitKey);
  }

  function showJournal() {
    if (screen !== 'play' && !dialogs.parts.open) return;
    dialogs.parts.close();
    setScreen('pause');
    journal.open();
    dialogs.journal.showModal();
  }

  const buildMenu = createBuildMenu(dialogs.parts, initialKit, {
    kit: kit => {
      color = null;
      quickParts = kit.parts.slice(0, 7);
      remember(KIT_KEY, kit.key);
      select(quickParts[0]);
    },
    part: part => { select(part); enter(); },
    color: tone => { color = tone; showSelected(); refreshTray(); },
    paint: () => { setTool('paint'); enter(); },
    pick: () => { setTool('pick'); enter(); },
    turn: () => { turnNext(); enter(); },
    unlocked: progress.unlocked,
    journal: showJournal,
    workshop: () => activities.openVoyage(),
  });
  select(quickParts[0], 'explore');

  function pick(point) {
    return graphics.pick(point, REACH + (CAMERAS[view].distance ?? 0) + 4);
  }

  function canEdit(id) {
    return !guestWorld || rooms.canGuestEdit(id);
  }

  function placement(hit) {
    const layout = layoutPart(selected, turn, color);
    const anchor = adjacentBrick(hit, layout);
    const blocks = layout.blocks.map(block => ({ ...block, x: anchor.x + block.x, y: anchor.y + block.y, z: anchor.z + block.z }));
    return { ...anchor, blocks };
  }

  function runEdit(request) {
    if (activities.sailing) return;
    if (guestWorld) {
      if (rooms.state.phase !== 'connected') {
        toast('Rejoin the host to keep building.');
        return;
      }
      sendPose();
      rooms.request(request);
      return;
    }
    const result = localEditor.perform(request, localBoxes(), brick => request.kind === 'use' ?
      objectDistance(player, brick) < 2.55 : reachFrom(player, brick));
    if (result.edits) {
      rooms.broadcast(result.edits, request.kind);
      audio.tap(request.kind);
      if (request.kind === 'place') achieve('place');
    } else {
      if (result.error === 'changed') save();
      toast(buildMessage(result.error));
    }
    refreshBuildStatus();
  }

  function edit(kind, point) {
    if (screen !== 'play' || activities.sailing) return;
    const hit = pick(point);
    if (kind === 'explore') {
      if (hit && PLACEABLE_OBJECTS[hit.brick.form]?.interaction) useProp(hit.brick.id);
      return;
    }
    if (!hit || !reachFrom(player, hit.brick)) {
      toast(hit ? 'Move closer to reach that brick.' : 'Choose a nearby brick or surface.');
      return;
    }
    flashUntil = performance.now() + 450;
    if (kind === 'pick') {
      const part = matchedPart(hit.brick);
      if (part.pack && !progress.unlocked(part.pack)) {
        toast(`Earn the ${BUILD_PACKS[part.pack].name} to copy that piece.`);
        return;
      }
      color = null;
      select(part);
      return;
    }
    if (kind === 'place') {
      runEdit({ kind, bricks: placement(hit).blocks });
      return;
    }
    if (!canEdit(hit.brick.id)) {
      toast(PROTECTED_BRICK);
      return;
    }
    runEdit({ kind, id: hit.brick.id, tone: color ?? selected.tone });
  }

  function useProp(id) {
    const brick = world.bricks.get(id);
    if (brick && PLACEABLE_OBJECTS[brick.form]?.interaction && objectDistance(player, brick) <= 2.5) runEdit({ kind: 'use', id });
  }

  const activities = createActivities({ world, graphics, getPlayer: () => player,
    openDialog: () => { dialogs.journal.close(); dialogs.parts.close(); setScreen('pause'); dialogs.voyage.showModal(); },
    resume: enter, toast, sound: audio.tap, progress, achieve, use: useProp,
    read: stored, save: remember, sendTea: action => { sendPose(); rooms.tea(action); },
    turnTo: yaw => { orbit.yaw = yaw; orbit.pitch = -0.24; },
  });
  const journal = createJournal(dialogs.journal, progress, { selectKit: key => showParts('all', key), voyage: activities.openVoyage });

  function resetPlayer() {
    activities.reset();
    player = spawnPlayer(world, guestWorld);
    orbit.yaw = player.yaw;
    orbit.pitch = player.pitch;
  }

  const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
  const moveKeys = new Set(['ShiftLeft', 'ShiftRight', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  window.addEventListener('keydown', event => {
    if (screen !== 'play' || event.altKey) return;
    const { code } = event;
    if (code === 'KeyZ' && !event.repeat && !event.shiftKey) {
      event.preventDefault();
      runEdit({ kind: 'undo' });
      return;
    }
    if (event.ctrlKey || event.metaKey) return;
    if (moveKeys.has(code)) {
      keys.add(code);
      event.preventDefault();
    } else if (code === 'Space' && !event.repeat && !(event.target instanceof HTMLButtonElement)) {
      jump = true;
      event.preventDefault();
    } else if (code === 'KeyR' && !event.repeat) {
      if (tool === 'place') turnNext();
      else setTool('rotate');
    } else if (code === 'KeyV' && !event.repeat) {
      setView(view + 1);
    } else if (/^Digit[1-7]$/.test(code)) {
      const part = quickParts[Number(code.at(-1)) - 1];
      if (part) select(part);
    } else if (code === 'Escape') {
      showPause();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); padPointers.clear(); });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    if (screen !== 'play' || event.deltaY === 0) return;
    event.preventDefault();
    const index = quickParts.indexOf(selected);
    select(quickParts[(Math.max(index, 0) + Math.sign(event.deltaY) + quickParts.length) % quickParts.length]);
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    if (screen !== 'play' || (event.button !== 0 && event.button !== 2) || drag) return;
    drag = { id: event.pointerId, button: event.button, x: event.clientX, y: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (screen !== 'play') return;
    if (!drag) {
      if (event.pointerType !== 'touch') aimPoint = { x: event.clientX, y: event.clientY, touch: false };
      return;
    }
    if (drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < (event.pointerType === 'touch' ? 9 : 5)) return;
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    aimPoint = null;
    game.classList.add('looking');
    const sensitivity = event.pointerType === 'touch' ? 0.0052 : 0.006;
    orbit.yaw = angle(orbit.yaw - dx * sensitivity);
    orbit.pitch = Math.max(-1.46, Math.min(1.46, orbit.pitch - dy * sensitivity));
  });
  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    if (!drag.moved && drag.button === 0 && event.button === 0) {
      const point = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
      if (tool !== 'explore') aimPoint = point;
      edit(tool, point);
    }
    drag = null;
    game.classList.remove('looking');
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (drag?.id === event.pointerId) drag = null;
    game.classList.remove('looking');
  });
  canvas.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') aimPoint = null; });

  const joystick = $('joystick');
  function moveStick(event) {
    const bounds = joystick.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dz = event.clientY - bounds.top - bounds.height / 2;
    const travel = bounds.width * 0.26;
    const distance = Math.hypot(dx, dz);
    const length = Math.max(travel, distance);
    stick.x = distance > 3 ? dx / length : 0;
    stick.z = distance > 3 ? -dz / length : 0;
    $('stick').style.transform = `translate(${stick.x * travel}px, ${-stick.z * travel}px)`;
  }
  joystick.addEventListener('pointerdown', event => {
    if (stick.id !== null) return;
    stick.id = event.pointerId;
    joystick.setPointerCapture(stick.id);
    moveStick(event);
  });
  joystick.addEventListener('pointermove', event => { if (stick.id === event.pointerId) moveStick(event); });
  joystick.addEventListener('lostpointercapture', event => {
    if (stick.id !== event.pointerId) return;
    stick.id = null;
    stick.x = stick.z = 0;
    $('stick').style.transform = '';
  });
  joystick.hidden = !coarse;
  $('direction-pad').hidden = coarse;
  for (const button of $('direction-pad').querySelectorAll('[data-move]')) {
    const code = button.dataset.move;
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || screen !== 'play') return;
      padPointers.set(event.pointerId, code);
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('lostpointercapture', event => padPointers.delete(event.pointerId));
    button.addEventListener('keydown', event => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      keys.add(code);
    });
    button.addEventListener('keyup', event => {
      if (['Space', 'Enter'].includes(event.code)) keys.delete(code);
    });
    button.addEventListener('blur', () => keys.delete(code));
  }
  $('shortcuts').hidden = coarse;
  if (coarse) {
    $('move-help').textContent = 'Drag the joystick';
    $('orbit-help').textContent = 'Drag the world';
    $('place-help').textContent = 'Choose a brick, then tap a surface';
    $('remove-help').textContent = 'Choose Remove, then tap a brick';
  }
  $('explore-tool').onclick = () => setTool('explore');
  $('place-tool').onclick = () => setTool('place');
  $('remove-tool').onclick = () => setTool('remove');
  $('rotate-tool').onclick = () => setTool('rotate');
  $('paint-tool').onclick = () => { if (color === null) showParts('colors'); else setTool('paint'); };
  $('undo-build').onclick = () => runEdit({ kind: 'undo' });
  $('open-parts').onclick = () => showParts('all');
  $('open-objects').onclick = () => showParts('objects');
  $('phone-build-button').onclick = () => showParts('all');
  $('phone-explore-button').onclick = () => { setTool('explore'); canvas.focus({ preventScroll: true }); };
  $('journal-button').onclick = showJournal;
  for (const button of compactTools) button.onclick = () => {
    const kind = button.dataset.compactTool;
    if (kind === 'paint' && color === null) {
      buildMenu.open('colors', color);
      return;
    }
    if (kind === 'undo') runEdit({ kind });
    else setTool(kind);
    enter();
  };
  $('jump-button').onclick = () => { jump = true; };

  $('solo-button').onclick = () => { if (rooms.state.role || guestWorld) leaveRoom(); enter(); };
  $('coop-button').onclick = showRoom;
  $('room-shortcut').onclick = showRoom;
  $('controls-button').onclick = showControls;
  $('appearance-button').onclick = showAppearance;
  $('pause-appearance').onclick = showAppearance;
  $('pause-controls').onclick = showControls;
  $('pause-room').onclick = showRoom;
  $('menu-button').onclick = showPause;
  $('camera-button').onclick = () => setView(view + 1);
  $('camera-left').onclick = () => { orbit.yaw = angle(orbit.yaw + Math.PI / 2); };
  $('camera-right').onclick = () => { orbit.yaw = angle(orbit.yaw - Math.PI / 2); };
  $('resume-button').onclick = () => enter();
  $('room-enter').onclick = () => enter();
  $('host-button').onclick = () => { if (guestWorld) leaveRoom(); audio.start(); rooms.host(); };
  $('leave-room').onclick = leaveRoom;
  $('respawn-button').onclick = () => { resetPlayer(); enter(); };
  $('title-button').onclick = () => { dialogs.pause.close(); setScreen('title'); graphics.traveler.state(null); };
  $('join-form').onsubmit = event => {
    event.preventDefault();
    const code = normalizeCode($('join-code').value);
    if (!validCode(code)) {
      $('room-status').hidden = false;
      $('room-status').textContent = 'Enter the six-character room code.';
      $('room-status').dataset.error = 'true';
      $('join-code').focus();
      return;
    }
    $('join-code').value = code;
    audio.start();
    rooms.join(code);
  };
  $('copy-button').onclick = async () => {
    try {
      await navigator.clipboard.writeText(rooms.state.code);
      $('room-status').hidden = false;
      $('room-status').dataset.error = 'false';
      $('room-status').textContent = 'Room code copied.';
    } catch {
      window.getSelection()?.selectAllChildren($('room-code'));
    }
  };

  function roomInvite() {
    const { code } = rooms.state;
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('room', code);
    return { title: 'Play LetsGo with me', text: `Join me in LetsGo. Room code ${code}.`, url: url.href };
  }

  async function copyInvite(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      $('room-status').textContent = message;
      $('room-status').dataset.error = 'false';
      $('room-status').hidden = false;
      return true;
    } catch {
      const field = $('invite-text');
      field.value = text;
      field.hidden = false;
      field.focus();
      field.select();
      return false;
    }
  }

  $('copy-invite').onclick = () => copyInvite(roomInvite().url, 'Invite link copied.');
  $('message-friend').onclick = async () => {
    const invite = roomInvite();
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(invite))) {
      try {
        await navigator.share(invite);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    if (await copyInvite(`${invite.text}\n${invite.url}`, 'Invite copied. Paste it into your message.')) {
      window.location.href = 'sms:';
    }
  };
  function refreshAudio() {
    const { enabled, music, effects } = audio.settings;
    const label = enabled ? 'Mute sound' : 'Unmute sound';
    $('sound-button').setAttribute('aria-label', label);
    $('sound-button').setAttribute('aria-pressed', String(!enabled));
    $('sound-button').title = label;
    drawIcon($('sound-button').firstElementChild, enabled ? 'sound' : 'mute');
    $('audio-enabled').checked = enabled;
    $('audio-music').checked = music;
    $('audio-effects').checked = effects;
  }
  function setAudio(key, value) { audio.set(key, value); refreshAudio(); }
  $('sound-button').onclick = () => setAudio('enabled', !audio.settings.enabled);
  for (const key of ['enabled', 'music', 'effects']) $(`audio-${key}`).onchange = event => setAudio(key, event.target.checked);
  game.addEventListener('click', () => { if (screen !== 'title') audio.resume(); }, { capture: true });
  refreshAudio();
  for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => closeDialog(button.dataset.close);
  for (const [name, dialog] of Object.entries(dialogs)) {
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog(name);
    });
  }

  function sendPose() {
    rooms.pose({ x: player.x, y: player.y, z: player.z, yaw: player.yaw,
      moving: player.moving, sprinting: player.sprinting, grounded: player.grounded, boat: activities.pose, pet: activities.companion });
  }

  let previous = performance.now();
  function frame(now) {
    const time = now * 0.001;
    const elapsed = (now - previous) * 0.001;
    const dt = Math.min(0.07, elapsed);
    previous = now;
    if (screen === 'title') {
      graphics.overview(time);
    } else {
      if (screen === 'play') {
        const directions = new Set([...keys, ...padPointers.values()]);
        const input = {
          strafe: Number(directions.has('ArrowRight')) - Number(directions.has('ArrowLeft')) + stick.x,
          forward: Number(directions.has('ArrowUp')) - Number(directions.has('ArrowDown')) + stick.z,
          jump,
          sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        };
        const { x, z } = player;
        if (!activities.move(input, orbit.yaw, dt)) {
          if (movePlayer(player, world, input, dt, orbit.yaw)) resetPlayer();
          else if (!CAMERAS[view].distance) player.yaw = orbit.yaw;
          else if (player.moving) {
            const heading = Math.atan2(x - player.x, z - player.z);
            player.yaw = angle(player.yaw + angle(heading - player.yaw) * (1 - Math.exp(-dt * 18)));
          }
        }
        activities.tick(now, orbit.yaw, dt);
        jump = false;
        if (player.moving && player.grounded && now - lastStep > (player.sprinting ? 260 : 390)) {
          audio.tap('step');
          lastStep = now;
        }
        const location = activities.sailing ? 'Open Water' : district(player.x, player.y, player.z);
        if (location !== lastDistrict) $('district').textContent = lastDistrict = location;
      }
      const bob = player.moving && player.grounded && !reduceMotion ? Math.sin(player.bob * 2) * 0.026 : 0;
      graphics.playerView(player, CAMERAS[view], orbit, bob, dt);
      if (aimPoint?.touch && now >= flashUntil) aimPoint = null;
      const hit = screen === 'play' && !activities.sailing && tool !== 'explore' && aimPoint ? pick(aimPoint) : null;
      const editable = hit && (['place', 'pick'].includes(tool) || canEdit(hit.brick.id));
      const target = hit && editable && reachFrom(player, hit.brick) ? hit : null;
      const brick = target && tool === 'place' && !aimPoint.touch ? placement(target) : null;
      graphics.aim(target, brick, Boolean(brick && brick.blocks.every(block => reachFrom(player, block)) && world.canPlace(brick.blocks, localBoxes())), tool);
    }
    if (rooms.state.phase === 'connected' && now - lastPose >= 66) {
      lastPose = now;
      sendPose();
    }
    graphics.render(time, elapsed);
    if (dialogs.appearance.open) customizer.render(reduceMotion ? 0 : time);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    toast('Graphics paused. Reload the page to reopen the valley.');
    if (screen === 'play') showPause();
  });
  graphics.overview(0);
  graphics.render(0, 0);
  $('solo-button').disabled = false;
  $('coop-button').disabled = false;
  $('load-message').hidden = true;
  const invite = normalizeCode(new URLSearchParams(window.location.search).get('room') ?? '');
  if (validCode(invite)) {
    $('join-code').value = invite;
    showRoom();
    $('room-status').textContent = 'Your room code is ready. Choose Join room.';
    $('room-status').hidden = false;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(() => requestAnimationFrame(() => {
  try { boot(); }
  catch (error) {
    console.error(error);
    $('load-message').textContent = 'The valley couldn’t load. Open the game in a browser with WebGL 2 enabled.';
  }
}));
