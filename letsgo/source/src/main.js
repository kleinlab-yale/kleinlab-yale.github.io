import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './style.css';
import { CAMERAS, DEFAULT_LOOK, readAppearance } from './appearance.js';
import { createCustomizer } from './customize.js';
import { MAX_PATCH, PLATE, REACH, STUD, TONES } from './bricks.js';
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
import { createExpedition } from './expedition.js';
import { district, makeValley } from './valley.js';
import { christmasActive, CHRISTMAS_END, isChristmasPiece, isChristmasTree } from './christmas.js';
import { snapMove, snapPlacement } from './snapping.js';
import { canBuildAt } from './islands.js';
import { islandAt } from './voyage.js';
import { createBoatCraft } from './boat-craft.js';
import { brickBounds, offsetBricks } from './assemblies.js';
import { orientedSize, resizeObject, sizeOptions } from './object-sizes.js';
import { snapOpening } from './openings.js';
import { decorationPose, treeDecorationKind, treeSlots } from './tree-decorations.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'brick-and-bloom:valley:1';
const LOOK_KEY = 'brick-and-bloom:appearance:1';
const VIEW_KEY = 'brick-and-bloom:view:1';
const KIT_KEY = 'letsgo:build-kit:1';
const AUDIO_KEY = 'letsgo:audio:1';
const LANDING_KEY = 'letsgo:landing:1';
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
  let christmasPacked = saveCache?.christmasPacked === true;
  world.restore(saveCache);
  const progress = createProgress(stored, remember, world.added.size);
  const craft = createBoatCraft(stored, remember);
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
  let cedarLanding = stored(LANDING_KEY) === 'cedar';
  let guestLanding = false;
  let guestCoast = false;
  let player = spawnPlayer(world, false, cedarLanding && progress.charted('cedar'));
  const orbit = { yaw: player.yaw, pitch: player.pitch };
  let remote = null;
  let guestWorld = false;
  let screen = 'title';
  const savedKit = stored(KIT_KEY);
  const initialKit = BUILD_KITS.find(kit => kit.key === savedKit && progress.packVisible(kit.key) && (!BUILD_PACKS[kit.key] || progress.unlocked(kit.key))) ?? BUILD_KITS[0];
  let quickParts = initialKit.parts.slice(0, 7);
  let selected = quickParts[0];
  let selectedSize = null;
  let decorateOnly = false;
  let turn = 0;
  let manualTurn = false;
  let suggestedTurn = 0;
  let color = null;
  let tool = 'explore';
  let jump = false;
  let drag = null;
  let resizePoint = null;
  let aimPoint = null;
  let flashUntil = 0;
  let toastTimer;
  let lastPose = 0;
  let lastStep = 0;
  let lastDistrict = '';
  let lastSeasonCheck = 0;
  let winter;
  let roomPanelFromPause = false;
  let controlsFromPause = false;
  let appearanceFromPause = false;
  const dialogs = { pause: $('pause-dialog'), room: $('room-dialog'), controls: $('controls-dialog'), appearance: $('appearance-dialog'),
    parts: $('parts-dialog'), size: $('size-dialog'), voyage: $('voyage-dialog'), journal: $('journal-dialog'), adventure: $('adventure-dialog') };
  const compactTools = Array.from(document.querySelectorAll('[data-compact-tool]'));
  const canCoast = () => progress.charted('cedar') || guestWorld && (guestCoast || remote?.coast === true);
  const joinCoast = () => guestWorld && remote?.coast === true && !remote.boat && islandAt(remote.x, remote.z) === 'cedar';

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

  function celebrate(message, packs) {
    audio.tap('reward');
    toast([message, ...packs.map(key => `${BUILD_PACKS[key].name} unlocked.`)].join(' '));
  }

  function playEditSound(kind, edits) {
    if (kind === 'pack') return;
    const brick = edits[0]?.brick;
    if (kind === 'use' && brick?.form === 'wrappedGift' && brick.active) audio.tap('gift');
    else if (kind === 'use' && ['windbell', 'jingleBell'].includes(brick?.form)) audio.tap('bell');
    else audio.tap(kind);
  }

  function save() {
    if (guestWorld) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
    saveCache = { ...world.snapshot(), undo: localEditor.history, christmasPacked };
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
      clearDrag();
      aimPoint = null;
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
    refreshChristmas();
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
    if (name === 'parts' || name === 'size' || name === 'voyage' || name === 'journal' || name === 'adventure') enter();
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

  function reachFrom(pose, item, tolerance = 0) {
    const brick = world.areaOf(item);
    const x = Math.max(brick.x * STUD - pose.x, 0, pose.x - (brick.x + brick.w) * STUD);
    const y = Math.max(brick.y * PLATE - pose.y - EYE, 0, pose.y + EYE - (brick.y + brick.h) * PLATE);
    const z = Math.max(brick.z * STUD - pose.z, 0, pose.z - (brick.z + brick.d) * STUD);
    return Math.hypot(x, y, z) <= REACH + tolerance;
  }

  const rooms = createRooms({
    snapshot: () => ({ ...world.snapshot(), coast: progress.charted('cedar'),
      cedarLanding: progress.charted('cedar') && !activities.sailing && islandAt(player.x, player.z) === 'cedar' }),
    restore: snapshot => {
      if (!guestWorld && saveTimer) save();
      guestWorld = true;
      guestCoast = snapshot.coast === true;
      guestLanding = guestCoast && snapshot.cedarLanding === true;
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
      refreshChristmas();
      if (!remote) return { error: 'blocked' };
      const result = visitor.perform(request, localBoxes(), brick => request?.kind === 'use' ?
        objectDistance(remote, world.areaOf(brick)) < 3.1 : reachFrom(remote, brick, 1.15));
      if (result.edits) playEditSound(request.kind, result.edits);
      return result;
    },
    change: (edits, kind, guestEdit) => {
      if (kind === 'pack' && Array.isArray(edits) && edits.length === 0) return true;
      if (!world.patch(edits)) return false;
      playEditSound(kind ?? (edits.every(edit => !edit.brick) ? 'remove' : 'place'), edits);
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
      guestCoast = guestLanding = false;
      world.restore(saveCache);
      resetPlayer();
      setTool(tool);
    }
    rooms.leave();
    refreshChristmas();
  }

  function packChristmas(now) {
    if (now < CHRISTMAS_END || christmasPacked || guestWorld) return;
    christmasPacked = true;
    const groups = Array.from(world.added.values()).filter(brick => isChristmasPiece(brick) && brick.treeId === undefined)
      .map(brick => [brick, ...world.decorationsOf(brick.id)].map(({ id }) => ({ id, brick: null })));
    localEditor.forgetPackedDecorations();
    let edits = [];
    for (const group of groups) {
      if (edits.length + group.length > MAX_PATCH) {
        if (world.patch(edits)) rooms.broadcast(edits, 'pack');
        edits = [];
      }
      edits.push(...group);
    }
    if (!edits.length || world.patch(edits)) rooms.broadcast(edits, 'pack');
    if (saveCache || groups.length || progress.hasChristmasKit) save();
    refreshBuildStatus();
    if (groups.length) toast('Christmas decorations packed away. Look for your Christmas Kit in Build packs.');
  }

  function refreshChristmas(now = Date.now()) {
    const active = christmasActive(now);
    const claimed = (screen !== 'title' || rooms.state.role === 'host' && rooms.state.phase === 'connected') && progress.claimChristmas(now);
    if (active !== winter || claimed) {
      winter = active;
      $('christmas-notice').hidden = !active;
      graphics.christmas(active);
      audio.christmas(active);
      buildMenu.refresh();
      journal.refresh();
    }
    if (claimed && screen === 'play') toast('Three Christmas packs unlocked. Find them in Journal → Build packs.');
    packChristmas(now);
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
      restore: 'Clear the spot to undo that edit.',
      doorway: 'Step clear of the doorway to close it.',
      'tree-base': 'Set the tree on a clear, solid surface.',
      'door-fit': 'Tap the floor in the doorway and choose a door that fits the opening.',
      'door-opening': 'Tap a doorway with two sides, a top, and a floor.',
      'window-opening': 'Tap a window opening with two sides, a top, and a sill.',
      'tree-decoration': 'Choose a branch or tier on a Christmas tree.',
      'tree-slot': 'That spot has a decoration. Choose another spot.',
      'size-options': 'Choose an object with size options, like a tree or a chair.',
      'size-room': 'This object needs more room for that size.',
      'same-size': 'The object is already that size.',
      'placed-piece': 'Choose a piece someone placed here to move it.',
      moved: 'That item changed. Select it again.',
      'same-spot': 'That piece is already here.',
      'open-water': 'Open water ahead. Take a boat to the outer islands.',
    };
    return messages[error] ?? messages.blocked;
  }

  function setTool(kind) {
    if (kind !== tool && drag?.piece) clearDrag();
    resizePoint = null;
    tool = kind;
    game.dataset.tool = kind;
    for (const action of ['explore', 'place', 'move', 'remove', 'rotate', 'paint']) {
      $(`${action}-tool`).setAttribute('aria-pressed', String(kind === action || (action === 'move' && kind === 'resize')));
    }
    for (const button of compactTools) {
      if (button.dataset.compactTool !== 'undo') button.setAttribute('aria-pressed',
        String(kind === button.dataset.compactTool || (kind === 'resize' && button.dataset.compactTool === 'move')));
    }
    for (const [index, button] of Array.from($('inventory').children).entries()) {
      button.setAttribute('aria-pressed', String(kind === 'place' && quickParts[index] === selected));
    }
    $('selected-piece').hidden = kind !== 'place' && kind !== 'paint';
    const canTurn = selected.w !== selected.d || selected.blocks || selected.form === 'flower' || Object.hasOwn(PLACEABLE_OBJECTS, selected.form);
    $('turn-piece').hidden = $('phone-turn-piece').hidden = kind !== 'place' || !canTurn || selected.fit;
    const decoration = treeDecorationKind(selected.form);
    const canSize = !decorateOnly && decoration !== 'branch' && decoration !== 'top' && sizeOptions(selected.form).length > 0;
    for (const id of ['size-piece', 'phone-size-piece']) {
      $(id).hidden = kind !== 'move' && kind !== 'resize' && !(kind === 'place' && canSize);
      $(id).setAttribute('aria-pressed', String(kind === 'resize'));
    }
    const verb = coarse ? 'Tap' : 'Click';
    const guestHint = guestWorld ? ' you placed this visit' : '';
    const tree = isChristmasTree(selected);
    const door = selected.form === 'door';
    let placeHint = `${verb} a top or side to snap this piece in place.`;
    if (door) placeHint = `${verb} the floor in the doorway.`;
    if (selected.fit) placeHint = `${verb} the framed ${door ? 'doorway' : 'window opening'} or its bottom edge.`;
    if (decoration === 'branch') placeHint = `${verb} a branch to hang this ornament.`;
    if (decoration === 'top') placeHint = `${verb} a tree to set the star on top.`;
    if (decoration === 'lights' || decoration === 'garland') placeHint = `${verb} a tree tier to wrap it in ${decoration}.`;
    const hints = {
      explore: coarse ? 'Joystick to move · Drag to orbit' : 'Arrow keys to move · Drag to orbit',
      place: tree ? `${verb} a clear, solid surface to set down the tree.` : placeHint,
      move: `Drag any part of an item${guestHint} to move it together.`,
      resize: `${verb} a tree or object${guestHint} to resize it.`,
      remove: `${verb} a brick${guestHint} to remove it.`,
      rotate: `${verb} any part of an item${guestHint} to turn it. Drag to move it.`,
      paint: `${verb} a brick${guestHint} to paint it.`,
      pick: `${verb} a brick to match its shape and color.`,
    };
    $('build-guide').textContent = hints[kind];
    $('phone-build-guide').hidden = kind === 'explore';
    $('phone-build-guide').textContent = kind === 'place' && !tree && !door && !selected.fit && !decoration ?
      `Tap a surface to place ${selected.name.toLowerCase()}.` : hints[kind];
    $('phone-build-label').textContent = kind === 'explore' ? 'Build' : 'Tools';
    $('phone-explore-button').hidden = kind === 'explore';
    refreshBuildStatus();
  }

  function placingPart() {
    return selectedSize ? { ...selected, ...orientedSize(selectedSize, selected.turn) } : selected;
  }

  function showSelected() {
    const shape = layoutPart(placingPart(), turn, color);
    const output = $('selected-piece');
    output.textContent = selected.name;
    const detail = document.createElement('small');
    detail.textContent = selected.fit ? 'Fits framed openings' :
      `${shape.w} × ${shape.d}${selectedSize ? ` · ${shape.h} plates high` : ''} · ${toneName(color ?? selected.tone)}`;
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

  function select(part, kind = 'place', treeOnly = false) {
    selected = part;
    selectedSize = null;
    decorateOnly = treeOnly;
    turn = 0;
    suggestedTurn = 0;
    manualTurn = part.turn !== undefined;
    showSelected();
    refreshTray();
    setTool(kind);
  }

  function turnNext() {
    if (selected.fit) return;
    turn = ((manualTurn ? turn : suggestedTurn) + 1) % 4;
    manualTurn = true;
    showSelected();
    refreshTray();
    setTool('place');
  }

  function showSizes(target = null) {
    const part = target ?? placingPart();
    const options = sizeOptions(part.form);
    if (!options.length || part.treeId !== undefined) {
      toast(buildMessage('size-options'));
      return;
    }
    $('size-name').textContent = target ? PLACEABLE_OBJECTS[target.form].name : selected.name;
    const choices = $('size-options');
    choices.replaceChildren();
    const boxes = target ? localBoxes() : [];
    for (const { key, name, size } of options) {
      const shape = target ? resizeObject(target, size) : orientedSize(size, selected.turn);
      const current = ['w', 'd', 'h'].every(field => shape[field] === part[field]);
      const blocked = target && !current && (!reachFrom(player, shape) || !world.canMove(shape, boxes));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary';
      button.disabled = Boolean(blocked);
      button.setAttribute('aria-pressed', String(current));
      const label = document.createElement('strong');
      label.textContent = name;
      const detail = document.createElement('small');
      detail.textContent = `${size[0]} × ${size[1]} studs · ${size[2]} plates high${blocked ? ' · Needs more room' : ''}`;
      button.append(label, detail);
      button.onclick = () => {
        if (target) {
          if (!current) runEdit({ kind: 'resize', id: target.id, from: target, size: key });
          setTool('move');
        } else {
          selectedSize = size;
          showSelected();
          refreshTray();
        }
        enter();
      };
      choices.append(button);
    }
    setScreen('pause');
    dialogs.size.showModal();
  }

  function showParts(mode, kitKey) {
    if (screen !== 'play' && !dialogs.journal.open) return;
    refreshChristmas();
    dialogs.journal.close();
    setScreen('pause');
    dialogs.parts.showModal();
    dialogs.parts.scrollTop = 0;
    buildMenu.open(mode, color, kitKey);
  }

  function showJournal(page) {
    if (screen !== 'play' && !dialogs.parts.open && !dialogs.adventure.open) return;
    refreshChristmas();
    dialogs.parts.close();
    dialogs.adventure.close();
    setScreen('pause');
    journal.open(page);
    dialogs.journal.showModal();
  }

  const buildMenu = createBuildMenu(dialogs.parts, initialKit, {
    kit: (kit, keepTool) => {
      color = null;
      quickParts = kit.parts.slice(0, 7);
      remember(KIT_KEY, kit.key);
      select(quickParts[0], keepTool ? tool : 'place');
    },
    part: (part, treeOnly) => { select(part, 'place', treeOnly); enter(); },
    color: tone => { color = tone; showSelected(); refreshTray(); },
    paint: () => { setTool('paint'); enter(); },
    pick: () => { setTool('pick'); enter(); },
    turn: () => { turnNext(); enter(); },
    unlocked: progress.unlocked,
    visible: progress.packVisible,
    journal: () => showJournal('packs'),
    workshop: () => activities.openVoyage(),
  });
  select(quickParts[0], 'explore');

  function pickDistance() {
    return REACH + (CAMERAS[view].distance ?? 0) + 4;
  }

  function pick(point, ignored = null) {
    return graphics.pick(point, pickDistance(), ignored);
  }

  function canEdit(id) {
    return !guestWorld || rooms.canGuestEdit(id);
  }

  function placement(hit) {
    const boxes = localBoxes();
    const plan = snapPlacement(world, hit, { part: placingPart(), turn, tone: color, manual: manualTurn },
      blocks => blocks.every(block => reachFrom(player, block)) && world.canPlace(blocks, boxes));
    suggestedTurn = plan.turn;
    return plan;
  }

  function cannotPlace(plan) {
    const blocks = plan?.blocks ?? [];
    if (blocks.some(block => !canBuildAt(block))) return 'open-water';
    if (blocks.some(isChristmasTree)) return 'tree-base';
    if (blocks.some(block => block.form === 'door')) return 'door-fit';
    return 'blocked';
  }

  function fitPlacement(point, hit) {
    const boxes = localBoxes();
    const part = { ...selected, tone: color ?? selected.tone, turn };
    return snapOpening(world, graphics.screenRay(point), hit, pickDistance(), part,
      blocks => blocks.every(block => reachFrom(player, block)) && world.canPlace(blocks, boxes));
  }

  function decorationPlacement(hit, part, angle, tone, movingId) {
    if (!hit) return null;
    const tree = hit.brick.treeId === undefined ? hit.brick : world.bricks.get(hit.brick.treeId);
    if (!isChristmasTree(tree) || !reachFrom(player, tree)) return null;
    const { form } = part;
    const kind = treeDecorationKind(form);
    let closest = Infinity;
    let choice = null;
    for (const slot of treeSlots(form)) {
      const pose = decorationPose(tree, { form, slot, turn: angle });
      const y = (pose.y + pose.h * (kind === 'branch' ? 0.78 : 0.5)) * PLATE;
      const distance = kind === 'lights' || kind === 'garland' ? Math.abs(y - hit.point.y) :
        Math.hypot((pose.x + pose.w / 2) * STUD - hit.point.x, y - hit.point.y, (pose.z + pose.d / 2) * STUD - hit.point.z);
      if (distance < closest) { closest = distance; choice = { slot, pose }; }
    }
    if (!choice) return null;
    const { slot, pose } = choice;
    const occupied = world.decorationAt(tree.id, form, slot);
    return { treeId: tree.id, slot, form, tone, turn: angle, allowed: !occupied || occupied.id === movingId,
      blocks: [{ ...pose, form, studs: false }] };
  }

  function canTransform(brick) {
    return world.assemblyMembers(brick).every(member => canEdit(member.id)) &&
      Array.from(world.decorationsOf(brick.id)).every(child => canEdit(child.id));
  }

  function movePlacement(gesture, point) {
    if (activities.sailing || document.elementFromPoint(point.x, point.y) !== canvas) return null;
    const { piece, grab, layout, grounded, ignored } = gesture;
    if (treeDecorationKind(piece.form)) {
      const hit = pick(point, ignored);
      const plan = decorationPlacement(hit, piece, piece.turn, piece.tone, piece.id);
      if (plan || piece.treeId !== undefined) return { hit, plan };
    }
    const hit = pick({ x: point.x + grab.x, y: point.y + grab.y }, ignored);
    if (!hit || hit.brick.treeId !== undefined || !reachFrom(player, hit.brick)) return null;
    const boxes = localBoxes();
    const sideY = grounded ? layout.y : null;
    const plan = snapMove(hit, layout, sideY, blocks => blocks.every(block => reachFrom(player, block)) &&
      world.canMove(blocks, boxes) && (hit.axis === 'y' || !grounded || blocks.some(block => block.y === sideY && world.hasBase(block, ignored))));
    return { hit, plan };
  }

  function clearDrag() {
    drag = null;
    game.classList.remove('looking', 'dragging-piece');
    graphics.movePreview(null);
  }

  function runEdit(request) {
    if (activities.sailing) return;
    refreshChristmas();
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
      objectDistance(player, world.areaOf(brick)) < 2.55 : reachFrom(player, brick));
    if (result.edits) {
      rooms.broadcast(result.edits, request.kind);
      playEditSound(request.kind, result.edits);
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
    if (kind === 'place' && selected.fit) {
      const plan = fitPlacement(point, hit);
      if (plan?.allowed) runEdit({ kind, bricks: plan.blocks, fit: true });
      else toast(buildMessage(plan ? 'blocked' : `${selected.form}-opening`));
      return;
    }
    if (kind === 'place' && treeDecorationKind(selected.form)) {
      const decor = decorationPlacement(hit, selected, turn, color ?? selected.tone);
      if (decor) {
        if (decor.allowed) {
          const { treeId, slot, form, tone, turn } = decor;
          runEdit({ kind, treeId, slot, form, tone, turn });
        } else toast(buildMessage('tree-slot'));
        return;
      }
      if (decorateOnly || ['branch', 'top'].includes(treeDecorationKind(selected.form))) {
        toast(buildMessage('tree-decoration'));
        return;
      }
    }
    if (!hit || !reachFrom(player, hit.brick)) {
      toast(hit ? 'Move closer to reach that brick.' : 'Choose a nearby brick or surface.');
      return;
    }
    flashUntil = performance.now() + 450;
    if (kind === 'pick') {
      const brick = hit.brick.treeId === undefined ? hit.brick :
        { ...hit.brick, ...orientedSize(PLACEABLE_OBJECTS[hit.brick.form].size, hit.brick.turn), studs: false };
      const part = matchedPart(brick);
      if (part.pack && !progress.unlocked(part.pack)) {
        toast(`Earn the ${BUILD_PACKS[part.pack].name} to copy that piece.`);
        return;
      }
      color = null;
      select(part);
      return;
    }
    if (kind === 'place') {
      if (hit.brick.treeId !== undefined) {
        toast('Choose a clear surface for this piece.');
        return;
      }
      const plan = placement(hit);
      if (!plan.allowed) {
        toast(buildMessage(cannotPlace(plan)));
        return;
      }
      if (turn !== plan.turn) {
        turn = plan.turn;
        showSelected();
        refreshTray();
      }
      if (selected.blocks) {
        const { x, y, z, turn } = plan;
        runEdit({ kind, kit: selected.key, x, y, z, turn, tone: color });
      } else runEdit({ kind, bricks: plan.blocks });
      return;
    }
    if (!canEdit(hit.brick.id)) {
      toast(PROTECTED_BRICK);
      return;
    }
    if (kind === 'resize') {
      if (!canTransform(hit.brick) || !world.added.has(hit.brick.id)) toast(PROTECTED_BRICK);
      else showSizes(hit.brick);
      return;
    }
    if (kind === 'remove' && isChristmasTree(hit.brick)) {
      const { x, y, z, w, d, h } = hit.brick;
      const radial = Math.hypot((hit.point.x / STUD - x - w / 2) / w, (hit.point.z / STUD - z - d / 2) / d);
      if (hit.point.y / PLATE > y + h * 0.13 || radial > 0.255) {
        toast('Tap a decoration to take it off. Tap the pot to remove the tree.');
        return;
      }
    }
    runEdit({ kind, id: hit.brick.id, tone: color ?? selected.tone });
  }

  function useProp(id) {
    let brick = world.bricks.get(id);
    if (brick?.form === 'fairyLights' && brick.treeId !== undefined) brick = world.bricks.get(brick.treeId);
    if (isChristmasTree(brick) && !Array.from(world.decorationsOf(brick.id)).some(child => child.form === 'fairyLights')) return;
    if (brick && PLACEABLE_OBJECTS[brick.form]?.interaction && objectDistance(player, world.areaOf(brick)) <= 2.5) {
      runEdit({ kind: 'use', id: brick.id });
    }
  }

  const expedition = createExpedition({ world, model: graphics.adventure, getPlayer: () => player, progress, craft,
    open: () => { setScreen('pause'); dialogs.adventure.showModal(); }, resume: enter,
    openPets: () => showJournal('pets'), toast, sound: audio.tap, celebrate, build: bricks => runEdit({ kind: 'place', bricks }),
  });
  const activities = createActivities({ world, graphics, getPlayer: () => player, expedition,
    openDialog: () => { dialogs.journal.close(); dialogs.parts.close(); setScreen('pause'); dialogs.voyage.showModal(); },
    resume: enter, toast, sound: audio.tap, progress, achieve, use: useProp,
    craft, sendTea: action => { sendPose(); rooms.tea(action); },
    canCoast, joinCoast,
    decorateTree: () => showParts('tree', progress.packVisible('christmas-tree') ? 'christmas-tree' : 'christmas'),
    onPort(port) {
      const cedar = port === 'cedar';
      if (guestWorld) guestLanding = cedar;
      else if (cedarLanding !== cedar) {
        cedarLanding = cedar;
        remember(LANDING_KEY, cedar ? 'cedar' : null);
      }
    },
    turnTo: yaw => { orbit.yaw = yaw; orbit.pitch = -0.24; },
  });
  const journal = createJournal(dialogs.journal, progress, {
    selectKit: key => showParts('all', key), voyage: activities.openVoyage, trainSound: () => audio.tap('reward'),
    canCoast,
    track: (type, id) => { activities.stopDockTracking(); expedition.track(type, id); enter(); },
  });

  function resetPlayer() {
    activities.reset();
    player = spawnPlayer(world, guestWorld, guestWorld ? guestLanding : cedarLanding && progress.charted('cedar'));
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
  window.addEventListener('blur', () => { keys.clear(); padPointers.clear(); clearDrag(); });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    if (screen !== 'play' || event.deltaY === 0) return;
    event.preventDefault();
    const index = quickParts.indexOf(selected);
    select(quickParts[(Math.max(index, 0) + Math.sign(event.deltaY) + quickParts.length) % quickParts.length]);
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    if (screen !== 'play' || (event.button !== 0 && event.button !== 2) || drag) return;
    resizePoint = null;
    const point = { x: event.clientX, y: event.clientY };
    const gesture = { id: event.pointerId, button: event.button, ...point, moved: false };
    if ((tool === 'move' || tool === 'rotate') && event.button === 0 && !activities.sailing) {
      const hit = pick(point);
      if (hit && world.added.has(hit.brick.id)) {
        const piece = hit.brick;
        const editable = canTransform(piece);
        if (!editable || !reachFrom(player, piece)) {
          toast(editable ? 'Move closer to reach that item.' : PROTECTED_BRICK);
          return;
        }
        const members = world.assemblyMembers(piece);
        gesture.piece = piece;
        gesture.ignored = new Set(members.map(brick => brick.id));
        if (piece.treeId === undefined) {
          const bounds = brickBounds(members);
          const { x, y, z } = bounds;
          const base = graphics.projectBase(bounds);
          gesture.layout = { ...bounds, blocks: offsetBricks(members, { x: -x, y: -y, z: -z }) };
          gesture.grounded = members.some(brick => brick.y === y && world.hasBase(brick, gesture.ignored));
          // Keep the base offset from the point where the player grabbed the item.
          gesture.grab = { x: base.x - point.x, y: base.y - point.y };
        }
        aimPoint = null;
      }
    }
    drag = gesture;
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
    if (drag.piece) {
      game.classList.add('dragging-piece');
      return;
    }
    game.classList.add('looking');
    const sensitivity = event.pointerType === 'touch' ? 0.0052 : 0.006;
    orbit.yaw = angle(orbit.yaw - dx * sensitivity);
    orbit.pitch = Math.max(-1.46, Math.min(1.46, orbit.pitch - dy * sensitivity));
  });
  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    const point = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
    if (drag.piece && drag.moved) {
      const plan = movePlacement(drag, point)?.plan;
      const { piece, ignored } = drag;
      if (!plan?.allowed) {
        const error = plan?.treeId !== undefined ? 'tree-slot' : piece.treeId !== undefined ? 'tree-decoration' : cannotPlace(plan);
        toast(buildMessage(error));
      } else {
        const { id } = piece;
        const from = { ...piece, members: [...ignored] };
        if (plan.treeId !== undefined) {
          const { treeId, slot } = plan;
          if (treeId !== piece.treeId || slot !== piece.slot) runEdit({ kind: 'move', id, from, treeId, slot });
        } else {
          const { x, y, z } = plan.blocks.find(brick => brick.id === id);
          if (x !== piece.x || y !== piece.y || z !== piece.z) runEdit({ kind: 'move', id, from, x, y, z });
        }
      }
    } else if (tool !== 'move' && !drag.moved && drag.button === 0 && event.button === 0) {
      if (tool !== 'explore') aimPoint = point;
      if (tool === 'resize') resizePoint = point;
      else edit(tool, point);
    }
    clearDrag();
  });
  canvas.addEventListener('click', () => {
    // Open the size dialog on the click so the selecting touch cannot activate a size choice.
    const point = resizePoint;
    resizePoint = null;
    if (tool === 'resize' && point) edit('resize', point);
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (drag?.id === event.pointerId) clearDrag();
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
  $('move-tool').onclick = () => setTool('move');
  $('remove-tool').onclick = () => setTool('remove');
  $('rotate-tool').onclick = () => setTool('rotate');
  $('paint-tool').onclick = () => { if (color === null) showParts('colors'); else setTool('paint'); };
  $('undo-build').onclick = () => runEdit({ kind: 'undo' });
  $('open-parts').onclick = () => showParts('all');
  $('open-objects').onclick = () => showParts('objects');
  $('phone-build-button').onclick = () => showParts('all');
  $('phone-explore-button').onclick = () => { setTool('explore'); canvas.focus({ preventScroll: true }); };
  $('journal-button').onclick = () => showJournal('story');
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
  for (const id of ['turn-piece', 'phone-turn-piece']) $(id).onclick = () => { turnNext(); canvas.focus({ preventScroll: true }); };
  for (const id of ['size-piece', 'phone-size-piece']) $(id).onclick = () => {
    if (tool === 'place') showSizes();
    else setTool(tool === 'resize' ? 'move' : 'resize');
  };

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
      moving: player.moving, sprinting: player.sprinting, grounded: player.grounded,
      coast: !guestWorld && progress.charted('cedar'), boat: activities.pose, pet: activities.companion });
  }

  let previous = performance.now();
  function frame(now) {
    const time = now * 0.001;
    const elapsed = (now - previous) * 0.001;
    const dt = Math.min(0.07, elapsed);
    previous = now;
    if (now - lastSeasonCheck >= 1000) {
      lastSeasonCheck = now;
      refreshChristmas();
    }
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
      const moving = screen === 'play' && drag?.piece && drag.moved ? movePlacement(drag, drag) : null;
      const hit = screen === 'play' && !activities.sailing && tool !== 'explore' && aimPoint ? pick(aimPoint) : null;
      const transform = ['move', 'rotate', 'resize'].includes(tool);
      const editable = hit && (['place', 'pick'].includes(tool) || (transform ? canTransform(hit.brick) : canEdit(hit.brick.id))) &&
        (tool !== 'move' || world.added.has(hit.brick.id));
      const target = hit && editable && reachFrom(player, hit.brick) ? hit : null;
      let plan = moving?.plan;
      if (screen === 'play' && !activities.sailing && !moving && tool === 'place' && aimPoint && !aimPoint.touch) {
        const form = selected.form;
        if (selected.fit) plan = fitPlacement(aimPoint, hit);
        else if (target) {
          const kind = treeDecorationKind(form);
          if (kind) plan = decorationPlacement(target, selected, turn, color ?? selected.tone);
          if (!plan && !decorateOnly && kind !== 'branch' && kind !== 'top' && target.brick.treeId === undefined) plan = placement(target);
        }
      }
      const destination = moving && plan?.allowed && plan.treeId === undefined ? plan.blocks.find(brick => brick.id === drag.piece.id) : null;
      graphics.movePreview(drag?.piece, destination);
      const subject = moving?.hit?.brick ?? target?.brick;
      let outline = subject ? world.areaOf(subject) : null;
      if (subject?.assembly !== undefined && transform && !moving) outline = brickBounds(world.assemblyMembers(subject));
      if (plan?.treeId !== undefined || (tool === 'place' && selected.fit)) outline = null;
      graphics.aim(outline, plan?.blocks ? plan : null, plan?.allowed === true, tool);
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
  refreshChristmas();
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
