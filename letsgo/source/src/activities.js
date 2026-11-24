import { PLATE, STUD } from './bricks.js';
import { RESCUE_REACH, followPuppy, lostPuppy } from './puppy.js';
import { DOCK, EMPTY_HULL, ISLANDS, SEA_LEVEL, advanceVessel, dockDistance, hullPattern, islandAt, launchVessel,
  rateHull, validHull } from './voyage.js';

const $ = id => document.getElementById(id);
const BOAT_KEY = 'letsgo:boat-design:1';
const VISITS_KEY = 'letsgo:island-visits:1';
const PUPPY_KEY = 'letsgo:puppy:1';
const STEEP_MS = 1700;
const SERVE_MS = 4500;

export function createActivities({ world, graphics, getPlayer, openDialog, resume, toast, sound, read, save, sendTea, turnTo }) {
  const game = $('game');
  const boatGrid = $('boat-grid');
  const destination = $('voyage-destination');
  const rescueButton = $('rescue-puppy');
  const tileButtons = [];
  const tea = new Map();
  const saved = read(BOAT_KEY);
  const previousVisits = read(VISITS_KEY);
  const visited = new Set(Array.isArray(previousVisits) ? previousVisits.filter(key => Object.hasOwn(ISLANDS, key)) : []);
  let code = validHull(saved) ? saved : EMPTY_HULL;
  let brush = 1;
  let vessel = null;
  let tracking = false;
  let nearest = null;
  let lastTeaScan = 0;
  let rescued = read(PUPPY_KEY) === true;
  let islandPup = lostPuppy(world);
  let companion = null;
  if (visited.has('reed')) destination.value = 'lantern';
  graphics.puppy('island', rescued ? null : islandPup);

  function review() {
    for (const [index, tile] of tileButtons.entries()) {
      const value = Number(code[index]);
      tile.dataset.hull = String(value);
      tile.setAttribute('aria-label', `Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}, ${['empty', 'plank', 'reinforced plank'][value]}`);
    }
    const rating = rateHull(code);
    $('boat-range').textContent = `Estimated range ${rating.range} m`;
    $('boat-advice').textContent = !rating.launchable ? 'Join at least three planks to launch.' : [
      rating.holes ? `${rating.holes} ${rating.holes === 1 ? 'hole lets' : 'holes let'} water into the hull.` : 'The floor is watertight.',
      rating.loose ? `${rating.loose} loose ${rating.loose === 1 ? 'plank' : 'planks'}.` : 'The hull is connected.',
      rating.width < 2 || rating.length < 2 ? 'Widen the hull for stability.' : '',
    ].filter(Boolean).join(' ');
    $('boat-advice').dataset.warning = String(Boolean(rating.holes || rating.loose));
    const target = ISLANDS[destination.value];
    const needed = Math.round(Math.max(1, Math.hypot(target.x - DOCK.x, target.z - DOCK.launchZ) - target.rz * STUD));
    $('destination-range').textContent = `${target.name} is about ${needed} m from the dock. ${rating.launchable && rating.range < needed ? 'Improve the hull for this crossing.' : ''}`;
    $('launch-boat').disabled = !rating.launchable;
  }

  function design(value) {
    code = value;
    save(BOAT_KEY, code);
    review();
  }

  for (let i = 0; i < code.length; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.onclick = () => design(code.slice(0, i) + brush + code.slice(i + 1));
    tileButtons.push(button);
    boatGrid.append(button);
  }
  for (const button of document.querySelectorAll('button[data-hull]')) {
    button.onclick = () => {
      brush = Number(button.dataset.hull);
      for (const option of document.querySelectorAll('.boat-brushes button')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
    };
  }

  function progress() {
    for (const [key, island] of Object.entries(ISLANDS)) {
      const step = $(`${key}-progress`);
      step.textContent = visited.has(key) ? `Reached ${island.name}` : `Reach ${island.name}`;
      step.dataset.done = String(visited.has(key));
    }
    const rescue = $('puppy-progress');
    rescue.textContent = rescued ? 'Mochi rescued' : 'Rescue Mochi';
    rescue.dataset.done = String(rescued);
  }

  function updateBoatView() {
    game.dataset.sailing = String(Boolean(vessel));
    $('hull-status').hidden = !vessel;
    graphics.vessel('local', vessel);
  }

  function dock() {
    vessel = null;
    const player = getPlayer();
    Object.assign(player, { x: DOCK.x, y: DOCK.y, z: DOCK.z, velocity: 0, grounded: true, moving: false, sprinting: false });
    tracking = false;
    updateBoatView();
  }

  function openVoyage() {
    const player = getPlayer();
    const atDock = dockDistance(player) < 5.5 && player.y > SEA_LEVEL && !vessel;
    $('boat-workshop').hidden = !atDock;
    $('voyage-guide').hidden = atDock;
    $('voyage-title').textContent = atDock ? 'Boat workshop' : 'Island voyage';
    $('track-dock').hidden = Boolean(vessel || islandAt(player.x, player.z));
    $('return-dock').hidden = !vessel && !islandAt(player.x, player.z);
    progress();
    if (atDock) review();
    openDialog();
  }

  $('voyage-button').onclick = openVoyage;
  $('track-dock').onclick = () => { tracking = true; resume(); };
  $('return-dock').onclick = () => { dock(); resume(); toast('Back at the south dock.'); };
  $('raft-pattern').onclick = () => design(hullPattern('raft'));
  $('hull-pattern').onclick = () => design(hullPattern('hull'));
  destination.onchange = review;
  $('launch-boat').onclick = () => {
    if (dockDistance(getPlayer()) > 5.5 || vessel) return;
    vessel = launchVessel(code, destination.value);
    if (!vessel) return;
    tracking = false;
    turnTo(vessel.yaw);
    Object.assign(getPlayer(), { x: vessel.x, y: SEA_LEVEL + 0.26, z: vessel.z, yaw: vessel.yaw, velocity: 0, grounded: false });
    updateBoatView();
    resume();
  };

  function move(input, yaw, dt) {
    if (!vessel) return false;
    const player = getPlayer();
    const outcome = advanceVessel(vessel, world, input, yaw, dt);
    if (outcome.sunk) {
      const message = vessel.rating.holes ? 'Your boat took on water. Fill the holes and try again.' : 'Your hull wore out. Add planks or reinforcement for more range.';
      dock();
      toast(message);
    } else if (outcome.shore) {
      Object.assign(player, outcome.shore, { velocity: 0, grounded: true, moving: false, sprinting: false });
      vessel = null;
      updateBoatView();
      if (outcome.island) {
        visited.add(outcome.island);
        save(VISITS_KEY, [...visited]);
        if (outcome.island === 'reed' && !visited.has('lantern')) destination.value = 'lantern';
        toast(outcome.island === 'lantern' && !rescued ? 'You reached Lantern Island. Look for Mochi.' :
          `You reached ${ISLANDS[outcome.island].name}.`);
      }
    } else {
      Object.assign(player, { x: vessel.x, y: SEA_LEVEL + 0.26, z: vessel.z, yaw: vessel.yaw,
        velocity: 0, grounded: false, moving: false, sprinting: false });
      $('hull-meter').value = Math.max(0, Math.round(100 * (1 - vessel.wear / vessel.rating.range)));
      graphics.vessel('local', vessel);
    }
    return true;
  }

  function teaDistance(player, counter) {
    const x = (counter.x + counter.w / 2) * STUD;
    const z = (counter.z + counter.d / 2) * STUD;
    return Math.hypot(x - player.x, z - player.z, counter.y * PLATE - player.y);
  }

  function findTea(player) {
    const x = Math.floor(player.x / STUD);
    const z = Math.floor(player.z / STUD);
    let best = 3.35;
    let item = null;
    for (const brick of world.query(x - 7, x + 8, z - 7, z + 8)) {
      if (brick.form !== 'tea') continue;
      const distance = teaDistance(player, brick);
      if (distance >= best) continue;
      best = distance;
      item = brick;
    }
    return item;
  }

  function teaPhase(id, now) {
    const state = tea.get(id);
    if (!state) return 'idle';
    if (state.served) return now < state.until ? 'served' : 'idle';
    return now < state.until ? 'brewing' : 'ready';
  }

  function setTea(id, action) {
    const now = performance.now();
    if (action === 'brew') tea.set(id, { until: now + STEEP_MS, served: false });
    else tea.set(id, { until: now + SERVE_MS, served: true });
    graphics.tea(id, action);
  }

  $('tea-action').onclick = () => {
    if (!nearest || !world.bricks.has(nearest.id)) return;
    const phase = teaPhase(nearest.id, performance.now());
    if (phase !== 'ready' && phase !== 'idle') return;
    const action = phase === 'ready' ? 'serve' : 'brew';
    setTea(nearest.id, action);
    sound('place');
    sendTea({ id: nearest.id, action });
    if (action === 'serve') toast('A cup of blossom tea is served.');
  };

  function canRescue(player) {
    return !rescued && !vessel && Math.hypot(player.x - islandPup.x, player.y - islandPup.y, player.z - islandPup.z) <= RESCUE_REACH;
  }

  rescueButton.onclick = () => {
    const player = getPlayer();
    if (!canRescue(player)) return;
    rescued = true;
    companion = islandPup;
    rescueButton.hidden = true;
    graphics.puppy('island', null);
    sound('place');
    const saved = save(PUPPY_KEY, true);
    toast(saved ? 'Mochi rescued! Your puppy is coming with you.' : 'Mochi is following you for this visit. Browser storage is unavailable.');
  };

  function tick(now, yaw, dt) {
    const player = getPlayer();
    rescueButton.hidden = !canRescue(player);
    if (rescued) {
      companion = followPuppy(companion, player, world, dt, Boolean(vessel));
      graphics.puppy('local', companion);
    }
    const atDock = dockDistance(player) < 5.5 && !vessel;
    const voyageLabel = $('voyage-button').lastChild;
    const dockAction = atDock ? 'Boat workshop' : 'Island voyage';
    if (voyageLabel.textContent !== dockAction) voyageLabel.textContent = dockAction;
    const onLantern = !rescued && !vessel && islandAt(player.x, player.z) === 'lantern';
    const target = vessel ? ISLANDS[vessel.destination] : onLantern ? { ...islandPup, name: 'Mochi' } :
      tracking && !atDock ? { ...DOCK, name: 'South dock' } : null;
    $('voyage-direction').hidden = !target;
    if (target) {
      const distance = Math.round(Math.hypot(target.x - player.x, target.z - player.z));
      const bearing = Math.atan2(target.x - player.x, player.z - target.z) + yaw;
      $('voyage-arrow').style.transform = `rotate(${bearing}rad)`;
      const label = $('voyage-distance');
      const text = `${target.name} · ${distance} m`;
      if (label.textContent !== text) label.textContent = text;
    }
    if (now - lastTeaScan >= 150) {
      lastTeaScan = now;
      nearest = vessel ? null : findTea(player);
      for (const [id, state] of tea) {
        if (!world.bricks.has(id) || (state.served && state.until <= now)) tea.delete(id);
      }
    }
    const button = $('tea-action');
    button.hidden = !nearest;
    if (nearest) {
      const phase = teaPhase(nearest.id, now);
      button.disabled = phase === 'brewing' || phase === 'served';
      const label = $('tea-action-label');
      const text = { idle: 'Brew tea', brewing: 'Steeping tea…', ready: 'Serve tea', served: 'Tea served' }[phase];
      if (label.textContent !== text) label.textContent = text;
    }
  }

  return {
    get sailing() { return Boolean(vessel); },
    get pose() { return vessel ? { code: vessel.code, yaw: vessel.yaw } : null; },
    get companion() { return companion; },
    openVoyage,
    move,
    tick,
    reset() {
      vessel = null;
      companion = null;
      islandPup = lostPuppy(world);
      tea.clear();
      graphics.puppy('local', null);
      graphics.puppy('island', rescued ? null : islandPup);
      updateBoatView();
    },
    receiveTea(packet, remote) {
      if (!remote || (packet?.action !== 'brew' && packet?.action !== 'serve')) return;
      const counter = world.bricks.get(packet.id);
      if (counter?.form !== 'tea' || teaDistance(remote, counter) > 4.1) return;
      setTea(packet.id, packet.action);
      if (packet.action === 'serve' && teaDistance(getPlayer(), counter) < 5) toast('Your friend served blossom tea.');
    },
  };
}
