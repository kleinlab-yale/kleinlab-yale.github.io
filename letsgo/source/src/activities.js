import { PLATE, STUD } from './bricks.js';
import { PLACEABLE_OBJECTS } from './parts.js';
import { PETS, RESCUE_REACH, followPet, lostPet } from './pets.js';
import { DOCK, EMPTY_HULL, HULL_WIDTH, ISLANDS, ROUTES, SEA_LEVEL, advanceVessel, crossingDistance, harborAt,
  harborReturn, hullPattern, islandAt, launchVessel, rateHull, validHull } from './voyage.js';

const $ = id => document.getElementById(id);
const BOAT_KEY = 'letsgo:boat-design:1';
const STEEP_MS = 1700;
const SERVE_MS = 4500;
const PET_BY_ISLAND = Object.fromEntries(Object.entries(PETS).map(([id, pet]) => [pet.island, id]));

export function objectDistance(player, brick) {
  const x = (brick.x + brick.w / 2) * STUD;
  const z = (brick.z + brick.d / 2) * STUD;
  return Math.hypot(x - player.x, z - player.z, brick.y * PLATE - player.y);
}

export function createActivities({ world, graphics, getPlayer, openDialog, resume, toast, sound, read, save,
  progress, achieve, sendTea, use, turnTo, expedition }) {
  const game = $('game');
  const boatGrid = $('boat-grid');
  const destination = $('voyage-destination');
  const rescueButton = $('rescue-pet');
  const propButton = $('prop-action');
  const teaButton = $('tea-action');
  const tileButtons = [];
  const tea = new Map();
  const islandPets = new Map();
  const saved = read(BOAT_KEY);
  let code = validHull(saved) ? saved : EMPTY_HULL;
  let brush = 1;
  let painting = null;
  let vessel = null;
  let departure = 'home';
  let tracking = false;
  let stations = {};
  let lastScan = -Infinity;
  let companion = null;

  for (const key of Object.keys(ISLANDS)) {
    const step = document.createElement('li');
    step.id = `${key}-progress`;
    $('voyage-destinations').append(step);
  }
  const rescueStep = document.createElement('li');
  rescueStep.id = 'puppy-progress';
  $('voyage-destinations').append(rescueStep);

  function choices(harbor) {
    const prior = harbor === departure ? destination.value : '';
    departure = harbor;
    destination.replaceChildren();
    for (const key of ROUTES[departure]) {
      const available = progress.charted(key);
      const option = new Option(available ? ISLANDS[key].name : `${ISLANDS[key].name} · chart locked`, key);
      option.disabled = !available;
      destination.add(option);
    }
    const available = ROUTES[departure].filter(progress.charted);
    destination.value = available.includes(prior) ? prior : available.find(key => !progress.visited(key)) ?? available[0] ?? '';
  }

  function placeIslandPets() {
    for (const id of Object.keys(PETS)) {
      const home = { ...lostPet(world, id), id };
      islandPets.set(id, home);
      graphics.pet(`island-${id}`, progress.rescued(id) ? null : home);
    }
  }
  placeIslandPets();

  function review() {
    for (const [index, tile] of tileButtons.entries()) {
      const value = Number(code[index]);
      tile.dataset.hull = String(value);
      tile.setAttribute('aria-label', `Row ${Math.floor(index / HULL_WIDTH) + 1}, column ${index % HULL_WIDTH + 1}, ${['empty', 'plank', 'reinforced plank'][value]}`);
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
    const needed = target ? crossingDistance(target, departure) : 0;
    $('destination-range').textContent = target ? `${target.name} is about ${needed} m away. ${rating.launchable && rating.range < needed ? 'Add or reinforce planks for this crossing.' : ''}` : 'Restore a sea lantern to chart the next crossing.';
    $('launch-boat').disabled = !rating.launchable || !target || !progress.charted(destination.value);
  }

  function design(value) {
    if (value === code) return;
    code = value;
    save(BOAT_KEY, code);
    review();
  }

  function paintHull(index) {
    design(code.slice(0, index) + brush + code.slice(index + 1));
  }

  for (let i = 0; i < code.length; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cell = String(i);
    button.onclick = event => { if (event.detail === 0) paintHull(i); };
    tileButtons.push(button);
    boatGrid.append(button);
  }
  boatGrid.addEventListener('pointerdown', event => {
    const cell = event.target.closest('button[data-cell]');
    if (!cell || event.button !== 0 || painting !== null) return;
    painting = event.pointerId;
    boatGrid.setPointerCapture(painting);
    paintHull(Number(cell.dataset.cell));
  });
  boatGrid.addEventListener('pointermove', event => {
    if (painting !== event.pointerId) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-cell]');
    if (cell && boatGrid.contains(cell)) paintHull(Number(cell.dataset.cell));
  });
  boatGrid.addEventListener('lostpointercapture', event => {
    if (painting === event.pointerId) painting = null;
  });
  for (const button of document.querySelectorAll('.boat-brushes button')) {
    button.onclick = () => {
      brush = Number(button.dataset.hull);
      for (const option of document.querySelectorAll('.boat-brushes button')) option.setAttribute('aria-pressed', String(option === button));
    };
  }

  function updateBoatView() {
    game.dataset.sailing = String(Boolean(vessel));
    $('hull-status').hidden = !vessel;
    graphics.vessel('local', vessel);
  }

  function dock(origin = 'home') {
    vessel = null;
    const home = harborReturn(origin);
    let spot = home;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = home.x + dx * STUD;
      const z = home.z + dz * STUD;
      const y = world.groundBetween(x, z, 0.23, SEA_LEVEL + 0.03, 1.8);
      if (Number.isFinite(y) && !world.collides(world.playerBox(x, y, z, 0.23, 1.49))) { spot = { x, y, z }; break; }
    }
    Object.assign(getPlayer(), spot, { velocity: 0, grounded: true, moving: false, sprinting: false });
    tracking = false;
    updateBoatView();
  }

  function atDock(player) { return vessel ? null : harborAt(player); }

  function openVoyage() {
    const player = getPlayer();
    const workshop = atDock(player);
    const island = islandAt(player.x, player.z);
    $('boat-workshop').hidden = !workshop;
    $('voyage-guide').hidden = workshop;
    $('voyage-title').textContent = workshop && workshop !== 'home' ? `${ISLANDS[workshop].name} harbor` : workshop ? 'Boat workshop' : 'Island voyage';
    $('track-dock').hidden = Boolean(vessel || island);
    $('return-dock').hidden = !vessel && !island;
    $('harbor-return-home').hidden = !workshop || workshop === 'home';
    for (const [key, target] of Object.entries(ISLANDS)) {
      const step = $(`${key}-progress`);
      step.textContent = progress.visited(key) ? `Reached ${target.name}` : `Reach ${target.name}`;
      step.dataset.done = String(progress.visited(key));
    }
    rescueStep.textContent = progress.rescued('mochi') ? 'Mochi rescued' : 'Rescue Mochi';
    rescueStep.dataset.done = String(progress.rescued('mochi'));
    if (workshop) { choices(workshop); review(); }
    openDialog();
  }

  $('voyage-button').onclick = openVoyage;
  $('track-dock').onclick = () => { tracking = true; expedition.stopTracking(); resume(); };
  const returnHome = () => { dock(); resume(); toast('Back at the south dock.'); };
  $('return-dock').onclick = returnHome;
  $('harbor-return-home').onclick = returnHome;
  $('raft-pattern').onclick = () => design(hullPattern('raft'));
  $('hull-pattern').onclick = () => design(hullPattern('hull'));
  destination.onchange = review;
  $('launch-boat').onclick = () => {
    if (atDock(getPlayer()) !== departure || !progress.charted(destination.value)) return;
    vessel = launchVessel(code, destination.value, departure);
    if (!vessel) return;
    tracking = false;
    turnTo(vessel.yaw);
    Object.assign(getPlayer(), { x: vessel.x, y: SEA_LEVEL + 0.26, z: vessel.z, yaw: vessel.yaw, velocity: 0, grounded: false });
    updateBoatView();
    resume();
  };

  function arrive(island) {
    const pet = PET_BY_ISLAND[island];
    const target = !pet || progress.rescued(pet) ? '' : ` Look for ${PETS[pet].name}.`;
    achieve('visit', island, `You reached ${ISLANDS[island].name}.${target}`);
  }

  function move(input, yaw, dt) {
    if (!vessel) return false;
    const player = getPlayer();
    const outcome = advanceVessel(vessel, world, input, yaw, dt);
    if (outcome.sunk) {
      const message = vessel.rating.holes ? 'Your boat took on water. Fill the holes and try again.' : 'Your hull wore out. Add planks or reinforcement for more range.';
      dock(vessel.origin);
      toast(message);
    } else if (outcome.shore) {
      Object.assign(player, outcome.shore, { velocity: 0, grounded: true, moving: false, sprinting: false });
      vessel = null;
      updateBoatView();
      if (outcome.island) arrive(outcome.island);
    } else {
      Object.assign(player, { x: vessel.x, y: SEA_LEVEL + 0.26, z: vessel.z, yaw: vessel.yaw,
        velocity: 0, grounded: false, moving: false, sprinting: false });
      $('hull-meter').value = Math.max(0, Math.round(100 * (1 - vessel.wear / vessel.rating.range)));
      graphics.vessel('local', vessel);
    }
    return true;
  }

  function scanStations(player, now) {
    const x = Math.floor(player.x / STUD);
    const z = Math.floor(player.z / STUD);
    const result = {};
    let bestTea = 3.35;
    let bestProp = 2.5;
    for (const brick of world.query(x - 7, x + 8, z - 7, z + 8)) {
      if (brick.form === 'tea') {
        const distance = objectDistance(player, brick);
        if (distance < bestTea) { bestTea = distance; result.tea = brick.id; }
      } else if (PLACEABLE_OBJECTS[brick.form]?.interaction) {
        const distance = objectDistance(player, brick);
        if (distance < bestProp) { bestProp = distance; result.prop = brick.id; }
      }
    }
    for (const [id, state] of tea) {
      if (!world.bricks.has(id) || (state.served && state.until <= now)) tea.delete(id);
    }
    return result;
  }

  function teaPhase(id, now) {
    const state = tea.get(id);
    if (!state) return 'idle';
    if (state.served) return now < state.until ? 'served' : 'idle';
    return now < state.until ? 'brewing' : 'ready';
  }

  function setTea(id, action) {
    const now = performance.now();
    const served = action === 'serve';
    tea.set(id, { until: now + (served ? SERVE_MS : STEEP_MS), served });
    graphics.tea(id, action);
  }

  teaButton.onclick = () => {
    const counter = world.bricks.get(stations.tea);
    if (!counter || vessel || objectDistance(getPlayer(), counter) > 3.35) return;
    const phase = teaPhase(counter.id, performance.now());
    if (phase !== 'ready' && phase !== 'idle') return;
    const action = phase === 'ready' ? 'serve' : 'brew';
    setTea(counter.id, action);
    sound('use');
    sendTea({ id: counter.id, action });
    if (action === 'serve') achieve('serve', null, 'A cup of blossom tea is served.');
  };

  function pendingPet(player) {
    const island = islandAt(player.x, player.z);
    const id = PET_BY_ISLAND[island];
    return !vessel && id && !progress.rescued(id) ? islandPets.get(id) : null;
  }

  function withinRescue(player, pet) {
    return pet && Math.hypot(player.x - pet.x, player.y - pet.y, player.z - pet.z) <= RESCUE_REACH;
  }

  rescueButton.onclick = () => {
    const player = getPlayer();
    const pet = pendingPet(player);
    if (!withinRescue(player, pet)) return;
    const { name } = PETS[pet.id];
    achieve('rescue', pet.id, `${name} rescued! Your new companion is coming with you.`);
    companion = pet;
    rescueButton.hidden = true;
    graphics.pet(`island-${pet.id}`, null);
  };

  propButton.onclick = () => { if (stations.prop) use(stations.prop); };

  function updatePrompts(player, pet, now, adventureNearby) {
    const canRescue = Boolean(withinRescue(player, pet));
    rescueButton.hidden = !canRescue;
    if (canRescue) updateText($('rescue-label'), `Rescue ${PETS[pet.id].name}`);
    const counter = world.bricks.get(stations.tea);
    const item = world.bricks.get(stations.prop);
    const preferTea = counter && (!item || objectDistance(player, counter) <= objectDistance(player, item));
    teaButton.hidden = Boolean(vessel || canRescue || adventureNearby || !preferTea);
    propButton.hidden = Boolean(vessel || canRescue || adventureNearby || preferTea || !item);
    if (preferTea) {
      const phase = teaPhase(counter.id, now);
      teaButton.disabled = phase === 'brewing' || phase === 'served';
      updateText($('tea-action-label'), { idle: 'Brew tea', brewing: 'Steeping tea…', ready: 'Serve tea', served: 'Tea served' }[phase]);
    } else if (item) {
      const prompts = PLACEABLE_OBJECTS[item.form].prompts;
      const label = prompts ? prompts[item.active ? 0 : 1] : item.form === 'windbell' ? 'Ring wind bell' :
        item.form === 'door' ? (item.active ? 'Close door' : 'Open door') : (item.active ? 'Turn light off' : 'Turn light on');
      updateText($('prop-action-label'), label);
    }
  }

  function updateText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function tick(now, yaw, dt) {
    const player = getPlayer();
    const island = !vessel && player.grounded && player.y < 1.9 ? islandAt(player.x, player.z) : null;
    if (island && !ISLANDS[island].offshore && !progress.visited(island)) arrive(island);
    const pet = pendingPet(player);
    if (now - lastScan >= 150) {
      lastScan = now;
      stations = vessel ? {} : scanStations(player, now);
    }
    const counter = world.bricks.get(stations.tea);
    const prop = world.bricks.get(stations.prop);
    const otherReach = Math.min(counter ? objectDistance(player, counter) : Infinity, prop ? objectDistance(player, prop) : Infinity);
    const adventure = expedition.tick(player, dt, now, Boolean(vessel || withinRescue(player, pet)), otherReach);
    const active = progress.companion;
    if (active) {
      const pose = followPet(companion, player, world, dt, Boolean(vessel), adventure.work);
      companion = pose ? { ...pose, id: active, working: Boolean(adventure.work) && !pose.moving } : null;
      graphics.pet('local', companion);
    }
    const nearDock = atDock(player);
    game.dataset.atDock = String(Boolean(nearDock));
    updateText($('voyage-button').lastChild, nearDock === 'home' ? 'Boat workshop' : nearDock ? 'Harbor workshop' : 'Island voyage');
    const target = vessel ? ISLANDS[vessel.destination] : pet ? { ...pet, name: PETS[pet.id].name } :
      tracking && !nearDock ? { ...DOCK, name: 'South dock' } : expedition.waypoint;
    $('voyage-direction').hidden = !target;
    if (target) {
      const distance = Math.round(Math.hypot(target.x - player.x, target.z - player.z));
      const bearing = Math.atan2(target.x - player.x, player.z - target.z) + yaw;
      $('voyage-arrow').style.transform = `rotate(${bearing}rad)`;
      updateText($('voyage-distance'), `${target.name} · ${distance} m`);
    }
    updatePrompts(player, pet, now, adventure.nearby);
  }

  return {
    get sailing() { return Boolean(vessel); },
    get pose() { return vessel ? { code: vessel.code, yaw: vessel.yaw } : null; },
    get companion() { return companion; },
    openVoyage,
    stopDockTracking() { tracking = false; },
    move,
    tick,
    reset() {
      vessel = null;
      tracking = false;
      companion = null;
      tea.clear();
      stations = {};
      lastScan = -Infinity;
      expedition.reset();
      graphics.pet('local', null);
      placeIslandPets();
      updateBoatView();
    },
    receiveTea(packet, remote) {
      if (!remote || (packet?.action !== 'brew' && packet?.action !== 'serve')) return;
      const counter = world.bricks.get(packet.id);
      if (counter?.form !== 'tea' || objectDistance(remote, counter) > 4.1) return;
      setTea(packet.id, packet.action);
      if (packet.action === 'serve' && objectDistance(getPlayer(), counter) < 5) toast('Your friend served blossom tea.');
    },
  };
}
