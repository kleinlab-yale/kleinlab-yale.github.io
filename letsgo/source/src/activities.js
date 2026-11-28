import { PLATE, STUD } from './bricks.js';
import { PLACEABLE_OBJECTS } from './parts.js';
import { PETS, RESCUE_REACH, followPet, lostPet } from './pets.js';
import { DOCK, HULL_WIDTH, ISLANDS, SEA_LEVEL, advanceVessel, crossingDistance, harborAt,
  harborReturn, hullPattern, islandAt, launchVessel, port, rateHull, routesFor, sailingTarget } from './voyage.js';
import { MATERIALS, resourceList } from './boat-craft.js';
import { isChristmasTree } from './christmas.js';
import { stopWalking } from './player.js';
import { SHIPS, fleetGoal } from './ship-data.js';
import { renderFleet } from './fleet-menu.js';

const $ = id => document.getElementById(id);
const STEEP_MS = 1700;
const SERVE_MS = 4500;

export function objectDistance(player, brick) {
  const x = (brick.x + brick.w / 2) * STUD;
  const z = (brick.z + brick.d / 2) * STUD;
  const radius = isChristmasTree(brick) ? Math.min(brick.w, brick.d) * STUD * 0.45 : 0;
  return Math.hypot(Math.max(0, Math.hypot(x - player.x, z - player.z) - radius), brick.y * PLATE - player.y);
}

export function createActivities({ world, graphics, getPlayer, openDialog, resume, toast, sound, craft,
  progress, achieve, sendTea, use, turnTo, expedition, canCoast, joinCoast, onPort, decorateTree, fleetJournal }) {
  const game = $('game');
  const boatGrid = $('boat-grid');
  const destination = $('voyage-destination');
  const rescueButton = $('rescue-pet');
  const propButton = $('prop-action');
  const decorateButton = $('decorate-tree');
  const teaButton = $('tea-action');
  const tileButtons = [];
  const tea = new Map();
  const islandPets = new Map();
  const templates = ['raft', 'wide-raft', 'hull', 'sealed'];
  const counts = {};
  for (const [id, data] of Object.entries(MATERIALS)) {
    const term = document.createElement('dt');
    term.textContent = data.name;
    counts[id] = document.createElement('dd');
    $('boat-stock').append(term, counts[id]);
  }
  let code = craft.hull;
  let missingMaterial = '';
  let brush = 1;
  let painting = null;
  let vessel = null;
  let departure = 'home';
  let workshopPane = 'raft';
  let selectedShip = null;
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

  const charted = key => key === 'cedar' ? canCoast() : progress.charted(key) || key === 'moon' && canCoast();
  const activeShip = () => workshopPane === 'fleet' && craft.hasShip(selectedShip) ? selectedShip : null;

  function choices(harbor, preferred) {
    const prior = harbor === departure ? destination.value : '';
    departure = harbor;
    destination.replaceChildren();
    const routes = routesFor(departure, activeShip());
    for (const key of routes) {
      const available = charted(key);
      const name = key === 'cedar' ? 'Cedar Coast · light Moonbell first' : `${port(key).name} · chart locked`;
      const option = new Option(available ? port(key).name : name, key);
      option.disabled = !available;
      destination.add(option);
    }
    const available = routes.filter(charted);
    destination.value = available.includes(preferred) ? preferred : available.includes(prior) ? prior :
      available.find(key => !progress.visited(key)) ?? available[0] ?? '';
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
    const ship = activeShip();
    const fleet = workshopPane === 'fleet';
    $('raft-workbench').hidden = fleet;
    $('workshop-fleet').hidden = !fleet;
    $('raft-tab').setAttribute('aria-pressed', String(!fleet));
    $('fleet-tab').setAttribute('aria-pressed', String(fleet));
    if (fleet) renderFleet($('workshop-fleet'), craft, progress, { selected: ship, choose: selectShip, guide: guideShip });
    for (const [index, tile] of tileButtons.entries()) {
      const value = Number(code[index]);
      tile.dataset.hull = String(value);
      tile.setAttribute('aria-label', `Row ${Math.floor(index / HULL_WIDTH) + 1}, column ${index % HULL_WIDTH + 1}, ${['empty', 'reed plank', 'reinforced cedar'][value]}`);
    }
    for (const [id, amount] of Object.entries(craft.stock)) counts[id].textContent = String(amount);
    for (const template of templates) {
      const { difference } = craft.quote(hullPattern(template));
      const requires = resourceList(difference);
      const returned = resourceList(Object.fromEntries(Object.entries(difference).map(([key, amount]) => [key, -amount])));
      $(`${template}-cost`).textContent = [requires ? `Uses ${requires}` : 'Uses your installed pieces', returned ? `Returns ${returned}` : ''].filter(Boolean).join(' · ');
    }
    $('track-materials').textContent = `Track ${MATERIALS[trackedMaterial()].name.toLowerCase()}`;
    const rating = rateHull(code);
    $('boat-range').textContent = `Estimated range ${rating.range} m`;
    $('boat-advice').textContent = !rating.launchable ? 'Join at least three planks to launch.' : [
      rating.holes ? `${rating.holes} ${rating.holes === 1 ? 'hole lets' : 'holes let'} water into the hull.` : 'The floor is watertight.',
      rating.loose ? `${rating.loose} loose ${rating.loose === 1 ? 'plank' : 'planks'}.` : 'The hull is connected.',
      rating.width < 2 || rating.length < 2 ? 'Widen the hull for stability.' : '',
    ].filter(Boolean).join(' ');
    $('boat-advice').dataset.warning = String(Boolean(rating.holes || rating.loose));
    const target = port(destination.value);
    const needed = target ? crossingDistance(target, departure, ship) : 0;
    const coastRoute = destination.value === 'cedar' || departure === 'cedar';
    const advice = ship ? `${SHIPS[ship].name} has a range of ${SHIPS[ship].range} m.` :
      coastRoute ? 'This crossing needs a watertight hull with no loose planks and enough range.' :
      rating.launchable && rating.range < needed ? 'Add or reinforce planks for this crossing.' : '';
    $('destination-range').textContent = fleet && !ship ? 'Restore a ship to launch from your fleet.' :
      target ? `${target.name} is about ${needed} m away. ${advice}`.trim() : 'Restore a sea lantern to chart the next crossing.';
    $('sea-hull-plan').hidden = !coastRoute;
    $('launch-boat').disabled = !canLaunch(rating, needed, coastRoute);
    $('launch-boat').textContent = ship ? `Launch ${SHIPS[ship].name}` : 'Launch boat';
  }

  function canLaunch(rating, needed, coastRoute) {
    const ship = activeShip();
    if (workshopPane === 'fleet') return Boolean(ship && destination.value && charted(destination.value) && SHIPS[ship].range >= needed + 3);
    return Boolean(destination.value && charted(destination.value) && rating.launchable &&
      (!coastRoute || !rating.holes && !rating.loose && rating.range >= needed + 3));
  }

  function changeWorkshop(pane) {
    workshopPane = pane;
    if (pane === 'fleet' && !craft.hasShip(selectedShip)) selectedShip = Object.keys(SHIPS).find(craft.hasShip) ?? null;
    choices(departure);
    review();
  }

  function selectShip(id) {
    if (!craft.hasShip(id)) return;
    selectedShip = id;
    changeWorkshop('fleet');
  }

  function guideShip(id) {
    const goal = fleetGoal(id, craft, progress);
    resume();
    if (goal.track) {
      tracking = false;
      expedition.track(...goal.track);
    } else openVoyage(goal.destination, 'raft');
  }

  function design(value) {
    if (value === code) return;
    const result = craft.build(value);
    if (!result) return;
    const message = $('boat-craft-message');
    missingMaterial = result.ok ? '' : Object.keys(result.missing).find(key => result.missing[key] > 0);
    message.hidden = result.ok;
    if (!result.ok) message.textContent = `Gather ${resourceList(result.missing)} to build this design.`;
    code = craft.hull;
    review();
  }

  function trackedMaterial() {
    const stock = craft.stock;
    return missingMaterial || (brush === 2 ? stock.timber <= stock.fittings ? 'timber' : 'fittings' : 'reeds');
  }

  $('track-materials').onclick = () => {
    const id = trackedMaterial();
    tracking = false;
    const found = expedition.trackSupply(id);
    resume();
    if (!found) toast(MATERIALS[id].hint);
  };

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
      missingMaterial = '';
      $('boat-craft-message').hidden = true;
      review();
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
    const player = getPlayer();
    Object.assign(player, spot, { velocity: 0, grounded: true });
    stopWalking(player);
    if (origin === 'cedar') turnTo(Math.PI);
    onPort(origin);
    tracking = false;
    updateBoatView();
  }

  function atDock(player) { return vessel ? null : harborAt(player); }

  function openVoyage(preferred, pane, ship) {
    const player = getPlayer();
    const workshop = atDock(player);
    const island = islandAt(player.x, player.z);
    $('boat-workshop').hidden = !workshop;
    $('voyage-guide').hidden = workshop;
    $('voyage-title').textContent = workshop === 'cedar' ? 'Cedar Harbor' : workshop && workshop !== 'home' ?
      `${ISLANDS[workshop].name} harbor` : workshop ? 'Boat workshop' : 'Island voyage';
    $('track-dock').hidden = Boolean(vessel || island);
    $('return-dock').hidden = !vessel && !island;
    $('harbor-return-home').hidden = !workshop || workshop === 'home';
    $('return-moon').hidden = Boolean(vessel) || workshop === 'moon' || !canCoast();
    const coastReturn = canCoast() && (progress.visited('cedar') || joinCoast());
    $('return-cedar').hidden = Boolean(vessel) || workshop === 'cedar' || !coastReturn;
    $('return-cedar').textContent = joinCoast() && !progress.visited('cedar') ? 'Join your friend at Cedar Harbor' : 'Go to Cedar Harbor';
    for (const [key, target] of Object.entries(ISLANDS)) {
      const step = $(`${key}-progress`);
      step.textContent = progress.visited(key) ? `Reached ${target.name}` : `Reach ${target.name}`;
      step.dataset.done = String(progress.visited(key));
    }
    rescueStep.textContent = progress.rescued('mochi') ? 'Mochi rescued' : 'Rescue Mochi';
    rescueStep.dataset.done = String(progress.rescued('mochi'));
    if (workshop) {
      if (pane) workshopPane = pane;
      if (craft.hasShip(ship)) selectedShip = ship;
      else if (workshopPane === 'fleet' && !craft.hasShip(selectedShip)) selectedShip = Object.keys(SHIPS).find(craft.hasShip) ?? null;
      missingMaterial = '';
      $('boat-craft-message').hidden = true;
      choices(workshop, preferred);
      review();
    }
    openDialog();
  }

  $('voyage-button').onclick = openVoyage;
  $('raft-tab').onclick = () => changeWorkshop('raft');
  $('fleet-tab').onclick = () => changeWorkshop('fleet');
  $('voyage-fleet').onclick = () => { resume(); fleetJournal(); };
  $('track-dock').onclick = () => { tracking = true; expedition.stopTracking(); resume(); };
  const returnHome = () => { dock(); resume(); toast('Back at the south dock.'); };
  $('return-dock').onclick = returnHome;
  $('harbor-return-home').onclick = returnHome;
  $('return-moon').onclick = () => {
    if (vessel || !canCoast()) return;
    dock('moon');
    choices('moon', 'cedar');
    resume();
    openVoyage('cedar');
  };
  $('return-cedar').onclick = () => {
    if (vessel || !canCoast() || !progress.visited('cedar') && !joinCoast()) return;
    dock('cedar');
    if (!progress.visited('cedar')) arrive('cedar');
    else toast('Back at Cedar Harbor.');
    resume();
  };
  for (const template of templates) $(`${template}-pattern`).onclick = () => design(hullPattern(template));
  destination.onchange = review;
  $('launch-boat').onclick = () => {
    const target = destination.value;
    const ship = activeShip();
    const coastRoute = target === 'cedar' || departure === 'cedar';
    if (atDock(getPlayer()) !== departure || !target || !canLaunch(rateHull(code), crossingDistance(port(target), departure, ship), coastRoute)) return;
    vessel = launchVessel(code, target, departure, ship);
    if (!vessel) return;
    tracking = false;
    turnTo(vessel.yaw);
    const player = getPlayer();
    Object.assign(player, { x: vessel.x, y: SEA_LEVEL + vessel.deckHeight, z: vessel.z, yaw: vessel.yaw, velocity: 0, grounded: false });
    stopWalking(player);
    updateBoatView();
    resume();
  };

  function arrive(island) {
    onPort(island);
    const pet = Object.entries(PETS).find(([id, pet]) => pet.island === island && !progress.rescued(id));
    const target = island === 'cedar' ? ' Follow the pale road to Harbormaster Rei.' : island === 'shell' && !craft.hasShip('sloop') ?
      ' Find Nami and the Lantern wreck on the east beach.' : pet ? ` Look for ${pet[1].name}.` : '';
    achieve('visit', island, `You reached ${ISLANDS[island].name}.${target}`);
    if (island === 'cedar' && !progress.coastDone('rei')) expedition.track('harbormaster', 'rei');
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
      if (outcome.island === 'cedar' && !canCoast()) {
        dock(vessel.origin);
        toast('Restore Moonbell’s lantern to chart the Cedar Coast landing.');
        return true;
      }
      Object.assign(player, outcome.shore, { velocity: 0, grounded: true });
      stopWalking(player);
      vessel = null;
      updateBoatView();
      if (outcome.island) arrive(outcome.island);
      else onPort('home');
    } else {
      Object.assign(player, { x: vessel.x, y: SEA_LEVEL + vessel.deckHeight, z: vessel.z, yaw: vessel.yaw,
        velocity: 0, grounded: false });
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
    let bestTree = 3.5;
    for (const brick of world.query(x - 7, x + 8, z - 7, z + 8)) {
      if (isChristmasTree(brick)) {
        const distance = objectDistance(player, brick);
        if (distance < bestTree) { bestTree = distance; result.tree = brick.id; }
        if (![...world.decorationsOf(brick.id)].some(child => child.form === 'fairyLights')) continue;
      }
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
    if (vessel || !island) return null;
    let nearest = null;
    let distance = Infinity;
    for (const [id, spot] of islandPets) {
      if (PETS[id].island !== island || progress.rescued(id)) continue;
      const separation = Math.hypot(player.x - spot.x, player.y - spot.y, player.z - spot.z);
      if (separation < distance) { nearest = spot; distance = separation; }
    }
    return nearest;
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
  decorateButton.onclick = decorateTree;

  function updatePrompts(player, pet, now, adventureNearby) {
    const canRescue = Boolean(withinRescue(player, pet));
    rescueButton.hidden = !canRescue;
    if (canRescue) updateText($('rescue-label'), `Rescue ${PETS[pet.id].name}`);
    const counter = world.bricks.get(stations.tea);
    const item = world.bricks.get(stations.prop);
    const preferTea = counter && (!item || objectDistance(player, counter) <= objectDistance(player, item));
    teaButton.hidden = Boolean(vessel || canRescue || adventureNearby || !preferTea);
    propButton.hidden = Boolean(vessel || canRescue || adventureNearby || preferTea || !item);
    decorateButton.hidden = Boolean(vessel || !stations.tree || !progress.hasChristmasKit || game.dataset.tool !== 'explore');
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
    if (island && (!ISLANDS[island].offshore || island === 'cedar' && canCoast()) && !progress.visited(island)) arrive(island);
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
    game.dataset.coast = String(island === 'cedar' || player.z >= ISLANDS.cedar.z - 12 && !vessel);
    updateText($('voyage-button').lastChild, nearDock === 'home' ? 'Boat workshop' : nearDock ? 'Harbor workshop' : 'Island voyage');
    const target = vessel ? sailingTarget(vessel) : tracking && !nearDock ? { ...DOCK, name: 'South dock' } :
      expedition.waypoint ?? (pet ? { ...pet, name: PETS[pet.id].name } : null);
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
    get ship() { return vessel?.ship; },
    get pose() { return vessel ? { code: vessel.code, yaw: vessel.yaw, ship: vessel.ship } : null; },
    get companion() { return companion; },
    openVoyage,
    guideShip,
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
