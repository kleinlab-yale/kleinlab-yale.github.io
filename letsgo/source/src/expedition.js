import { BEACONS, CHESTS, KEEPER, SYMBOLS } from './adventure-data.js';
import { STUD } from './bricks.js';
import { PETS } from './pets.js';
import { BRIDGE_BOARD, COAST_BOUNDS, COAST_MILESTONES, COAST_PASS, IRRIGATION, REI, SLUICE, irrigationFlow } from './mainland-data.js';
import { bridgeDeck, nextBridgePlanks } from './mainland-bridge.js';
import { SUPPLIES, resourceList } from './boat-craft.js';

const $ = id => document.getElementById(id);
const REACH = 2.85;

function distance(player, target) { return Math.hypot(player.x - target.x, player.y - target.y, player.z - target.z); }

function findGround(world, location) {
  let fallback = { x: location.x * STUD, z: location.z * STUD, y: 0 };
  for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, -1], [2, -1], [-2, 1], [2, 1],
    [-3, 0], [3, 0], [0, -3], [0, 3]]) {
    const x = (location.x + a) * STUD;
    const z = (location.z + b) * STUD;
    const y = world.groundBetween(x, z, 0.16, -0.35, location.z >= COAST_BOUNDS.minZ ? 2.1 : 1.2);
    if (!Number.isFinite(y)) continue;
    fallback = { x, y, z };
    if (!world.collides(world.playerBox(x, y, z, 0.26, 1.51))) return fallback;
  }
  return fallback;
}

export function createExpedition({ world, model, getPlayer, progress, craft, open, resume, openPets, toast, sound, celebrate, build }) {
  const prompts = $('trail-action');
  const promptLabel = $('trail-action-label');
  const meter = $('pet-work');
  const gauge = $('pet-work-meter');
  const title = $('adventure-title');
  const content = $('adventure-content');
  const entries = new Map();
  let focus = null;
  let tracked = null;
  let job = null;
  let lastUpdate = -Infinity;

  const key = (type, id) => `${type}-${id}`;
  function register(type, id, data) {
    entries.set(key(type, id), { type, id, data, spot: null });
  }
  register('keeper', 'keeper', KEEPER);
  register('harbormaster', 'rei', REI);
  register('bridge', 'bridge', BRIDGE_BOARD);
  register('sluice', 'water', SLUICE);
  register('pass', 'cedar-pass', COAST_PASS);
  for (const [id, data] of Object.entries(CHESTS)) register('chest', id, data);
  for (const [id, data] of Object.entries(BEACONS)) register('beacon', id, data);
  for (const [id, data] of Object.entries(SUPPLIES)) register('supply', id, data);

  const unlockedSupply = data => !data.requires || progress.lit(data.requires);

  function refreshChests() {
    for (const [id, chest] of Object.entries(CHESTS)) {
      const status = progress.chestStatus(id).status;
      model.showChest(id, progress.opened(id) && (!chest.refill || status === 'refill'), job?.entry.id === id);
    }
    for (const [id, data] of Object.entries(SUPPLIES)) model.showSupply(id, unlockedSupply(data) && !craft.seconds(id));
  }

  function reset() {
    focus = null;
    tracked = null;
    job = null;
    meter.hidden = true;
    prompts.hidden = true;
    for (const entry of entries.values()) {
      entry.spot = findGround(world, entry.data);
      model.place(entry.type, entry.id, entry.spot, entry.data);
      if (entry.type === 'beacon') model.showLantern(entry.id, progress.lit(entry.id));
    }
    refreshChests();
    model.water(progress.coastDone('water'));
  }
  reset();

  function paragraph(text, className = 'panel-copy') {
    const line = document.createElement('p');
    line.className = className;
    line.textContent = text;
    content.append(line);
    return line;
  }

  function button(label, click, parent = content, classes = 'button primary wide') {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = classes;
    control.textContent = label;
    control.onclick = click;
    parent.append(control);
    return control;
  }

  function reach(entry) { return distance(getPlayer(), entry.spot) <= REACH; }

  function collect(entry) {
    if (!progress.collect(entry.id)) return;
    sound('reward');
    const { coins, relic } = entry.data;
    toast(`${coins} coins found.${relic ? ` You recovered the ${relic}.` : ''}`);
    if (tracked === entry) tracked = null;
    refreshChests();
  }

  function sendPet(entry) {
    if (!reach(entry) || progress.chestStatus(entry.id).status !== 'ready') return;
    if (!entry.data.power) {
      resume();
      collect(entry);
      return;
    }
    const id = progress.companion;
    const { power } = progress.petStats(id);
    const duration = Math.max(1.35, 0.82 + 3.0 * entry.data.power / power);
    const { x, y, z } = entry.spot;
    const player = getPlayer();
    const dx = player.x - x;
    const dz = player.z - z;
    const ratio = 0.65 / Math.max(0.3, Math.hypot(dx, dz));
    job = { entry, id, duration, left: duration, spot: { x: x + dx * ratio, y, z: z + dz * ratio, yaw: Math.atan2(dx, dz) } };
    $('pet-work-label').textContent = `${PETS[id].name} is opening the chest`;
    gauge.value = 0;
    sound('use');
    resume();
  }

  function showChest(entry) {
    const { data, id } = entry;
    const { status, remaining, beacon, step } = progress.chestStatus(id);
    const active = progress.companion;
    if (status === 'opened') {
      paragraph(data.relic ? `You recovered the ${data.relic} from this chest.` : 'You collected the coins from this chest.');
      return;
    }
    paragraph(data.power ? `${data.power} power to open · ${data.coins} coins${data.relic ? ` · ${data.relic}` : ''}` : `${data.coins} coins inside`);
    if (status === 'refill') {
      paragraph(`The next tide refills this chest in ${remaining} seconds.`);
    } else if (status === 'dark') {
      paragraph(`Light the ${BEACONS[beacon].name} to release this lock.`);
    } else if (status === 'coast') {
      paragraph(step === 'rei' ? 'Speak to Harbormaster Rei to open this supply cache.' : 'Restore water to the Terrace Gardens to release this lock.');
    } else if (status === 'power') {
      paragraph(active ? `${PETS[active].name} has ${progress.petStats(active).power} power. Train your pet or bring a stronger companion.` : 'Rescue a pet and bring it along to open this chest.');
      button('Open pet journal', openPets, content, 'button secondary wide');
    } else {
      if (data.power) paragraph(`${PETS[active].name} has ${progress.petStats(active).power} power.`);
      button(data.power ? `Send ${PETS[active].name}` : 'Open chest', () => sendPet(entry));
    }
  }

  function showLantern(entry) {
    const { id, data } = entry;
    if (progress.lit(id)) { paragraph(data.restored); return; }
    if (data.coast && !progress.coastDone(data.coast)) { paragraph('Restore the Terrace Gardens first. Their restored flow powers the observatory gate.'); return; }
    const missing = progress.missingRelics(id);
    if (missing.length) {
      paragraph(`The lantern needs ${missing.map(chest => CHESTS[chest].relic).join(' and ')}.`);
      return;
    }
    paragraph(data.clue);
    const group = document.createElement('div');
    group.className = 'lantern-rings option-row';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Lantern rings');
    content.append(group);
    const hint = paragraph('Turn the rings in order from left to right. Test the light when they match the clue.', 'lantern-feedback');
    const symbols = [...data.start];
    for (const [index, value] of symbols.entries()) {
      const ring = button(`Ring ${index + 1} · ${SYMBOLS[value]}`, () => {
        symbols[index] = (symbols[index] + 1) % SYMBOLS.length;
        ring.textContent = `Ring ${index + 1} · ${SYMBOLS[symbols[index]]}`;
        hint.textContent = 'Test the light when the rings match the clue.';
        sound('rotate');
      }, group, 'subtle-button');
    }
    button('Test the light', () => {
      if (!reach(entry)) return;
      const packs = progress.restoreBeacon(id, symbols);
      if (!packs) { hint.textContent = 'The lens flickered. Read the clue and try another alignment.'; return; }
      model.showLantern(id, true);
      if (tracked === entry) tracked = null;
      resume();
      celebrate(`${data.restored} ${data.coins} coins earned.`, packs);
    });
  }

  function finishCoast(entry, evidence, message, next) {
    if (!reach(entry)) return;
    const packs = progress.completeCoast(entry.id, evidence);
    if (!packs) return;
    tracked = next ? entries.get(key(...next)) : null;
    model.water(progress.coastDone('water'));
    resume();
    celebrate(`${message} ${COAST_MILESTONES[entry.id].coins} coins earned.`, packs);
  }

  function showRei(entry) {
    progress.completeCoast('rei');
    if (tracked === entry) tracked = null;
    if (progress.lit('ridge')) {
      paragraph('Ships can see the observatory from the channel again. The market is open, and the summit cache is yours to search for.');
      button('Back to the coast', resume);
    } else if (progress.coastDone('water')) {
      paragraph('The tea beds have water again. Find the lens near the gardens and the brass vane up on Windward Ridge. They belong to the observatory.');
      button('Track the Terrace cache', () => { tracked = entries.get(key('chest', 'terrace')); resume(); });
    } else if (progress.coastDone('bridge')) {
      paragraph('You reopened the road. The terrace sluice is just across the canal. Use its three gates to bring water back to the tea beds.');
      button('Track the terrace sluice', () => { tracked = entries.get(key('sluice', 'water')); resume(); });
    } else {
      paragraph('Moonbell’s light brought you through. A high tide washed the bridge deck out at Canal Market, and the gardens have been dry ever since.');
      paragraph('Follow the paving to the repair board. You can use it to fit planks or build the three rows yourself.');
      button('Track the canal bridge', () => { tracked = entries.get(key('bridge', 'bridge')); resume(); });
    }
  }

  function showBridge(entry) {
    if (!progress.coastDone('rei')) { paragraph('Speak to Harbormaster Rei by the harbor arch to take on the repair.'); return; }
    const deck = bridgeDeck(world);
    const fitted = deck.flat().filter(Boolean).length;
    const total = deck.flat().length;
    paragraph('Build a three-row deck level with the oak landings. Leave room to walk across it.');
    const board = document.createElement('div');
    board.className = 'repair-board';
    board.setAttribute('role', 'img');
    board.setAttribute('aria-label', `${fitted} of ${total} bridge studs fitted`);
    for (const filled of deck.flat()) {
      const tile = document.createElement('span');
      tile.dataset.fitted = String(filled);
      board.append(tile);
    }
    content.append(board);
    paragraph(`${fitted} of ${total} deck studs ready`, 'lantern-feedback');
    if (fitted === total) {
      if (progress.coastDone('bridge')) button('Cross the bridge', resume);
      else button('Finish bridge repair', () => finishCoast(entry, bridgeDeck(world).flat().every(Boolean),
        'The market road is open.', ['sluice', 'water']));
      return;
    }
    const planks = nextBridgePlanks(deck);
    if (world.canPlace(planks)) button('Fit the next plank row', () => {
      if (!reach(entry)) return;
      const next = nextBridgePlanks(bridgeDeck(world));
      if (!next.length || !world.canPlace(next)) { show(entry); return; }
      build(next);
      resume();
    });
    else paragraph('Clear the next row at the landing’s height, then fit a plank.');
  }

  function showSluice(entry) {
    if (progress.coastDone('water')) { paragraph('Water is flowing through all three tea beds. Check the path beyond the terraces for the lens.'); return; }
    if (!progress.coastDone('bridge')) { paragraph('Finish the canal bridge repair first so Rei can reopen the garden road.'); return; }
    paragraph('Route water from the spring through each open channel. Each gate sends the flow west, straight, or east.');
    const gates = [...IRRIGATION.start];
    const directions = ['West', 'Straight', 'East'];
    const board = document.createElement('div');
    board.className = 'irrigation-board';
    board.setAttribute('role', 'img');
    content.append(board);
    const group = document.createElement('div');
    group.className = 'lantern-rings option-row';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Terrace gates');
    content.append(group);
    const feedback = paragraph('', 'lantern-feedback');
    feedback.setAttribute('role', 'status');
    const release = button('Release water', () => finishCoast(entry, gates, 'Fresh water reaches the tea beds.', ['chest', 'terrace']));
    const controls = IRRIGATION.gates.map((name, i) => button(name, () => {
      gates[i] = gates[i] === 1 ? -1 : gates[i] + 1;
      sound('rotate');
      render();
    }, group, 'subtle-button'));

    function render() {
      const wet = irrigationFlow(gates);
      board.replaceChildren();
      for (const [row, lane] of [IRRIGATION.source, ...IRRIGATION.beds].entries()) {
        for (let column = 0; column < 3; column++) {
          const cell = document.createElement('span');
          cell.dataset.channel = String(column === lane);
          cell.dataset.water = String(wet[row] === column);
          if (column === lane) cell.textContent = row === 0 ? 'Spring' : `Bed ${row}`;
          board.append(cell);
        }
      }
      board.setAttribute('aria-label', 'Spring in the center. Open channels lead east to bed one, west to bed two, and west to bed three.');
      for (const [i, control] of controls.entries()) control.textContent = `${IRRIGATION.gates[i]} · ${directions[gates[i] + 1]}`;
      feedback.textContent = `${wet.length - 1} of ${IRRIGATION.beds.length} beds connected`;
      release.disabled = wet.length !== IRRIGATION.beds.length + 1;
    }
    render();
  }

  function show(entry) {
    if (!entry || !reach(entry)) return;
    title.textContent = entry.data.name;
    content.replaceChildren();
    if (entry.type === 'keeper') {
      progress.meetKeeper();
      if (tracked === entry) tracked = null;
      if (progress.lit('moon')) {
        paragraph('I heard Moonbell’s bell again from the meadow. The light reveals a channel to Cedar Coast. Visit the Moonbell harbor and take a watertight boat to the mainland.');
        button('Back to the valley', resume);
      } else if (progress.lit('reef')) {
        paragraph('The Driftglass light reaches Moonbell now. Juniper waits by the tower. With some training, that fox can work the old vault lock.');
        button('Back to the trail', resume);
      } else if (progress.lit('shell')) {
        paragraph('I saw Shell Cove’s light come on. The Driftglass lens needs its mirror to send a beam across the channel. The Cloudberry chest has the mirror.');
        button('Back to the trail', resume);
      } else {
        paragraph('A storm scattered the lenses that light our sea routes. The prism washed up at Shell Cove. If you can find it, we can relight the first lantern.');
        paragraph('Pets can work the old chest locks. My supply chest holds coins for training. Find Mochi on Lantern Island if you need a companion.');
        button('I’ll find the prism', resume);
      }
    } else if (entry.type === 'harbormaster') showRei(entry);
    else if (entry.type === 'bridge') showBridge(entry);
    else if (entry.type === 'sluice') showSluice(entry);
    else if (entry.type === 'pass') {
      paragraph('The canal ends below the ridge. From this pass, the old cedar road climbs into the mountains. Look up the valley to see the high country.');
      button('Back to the trail', resume);
    }
    else if (entry.type === 'chest') showChest(entry);
    else showLantern(entry);
    open();
  }

  function pickUp(entry) {
    if (!reach(entry)) return;
    if (!unlockedSupply(entry.data)) { toast('Restore Moonbell’s lantern to unlock these supplies.'); return; }
    const remaining = craft.seconds(entry.id);
    if (remaining) { toast(`This supply refills in ${remaining} seconds.`); return; }
    const amount = craft.gather(entry.id);
    if (!amount) return;
    sound('place');
    toast(`Collected ${resourceList(amount)}.`);
    if (tracked === entry) tracked = null;
    model.showSupply(entry.id, false);
  }

  prompts.onclick = () => {
    if (focus?.type === 'supply') pickUp(focus);
    else show(focus);
  };

  return {
    reset,
    track(type, id) { tracked = entries.get(key(type, id)) ?? null; },
    trackSupply(material) {
      const player = getPlayer();
      const sources = [];
      for (const [id, data] of Object.entries(SUPPLIES)) {
        if (!data.yield[material] || !unlockedSupply(data) || data.island && !progress.visited(data.island)) continue;
        const entry = entries.get(key('supply', id));
        const penalty = craft.seconds(id) ? 14 : 0;
        sources.push({ entry, distance: distance(player, entry.spot) + penalty });
      }
      sources.sort((a, b) => a.distance - b.distance);
      tracked = sources[0]?.entry ?? null;
      return Boolean(tracked);
    },
    stopTracking() { tracked = null; },
    get waypoint() { return tracked ? { ...tracked.spot, name: tracked.data.name } : null; },
    tick(player, elapsed, time, blocked, otherReach) {
      if (job) {
        if (blocked || progress.companion !== job.id || distance(player, job.entry.spot) > 3.9) {
          if (!blocked) toast('Come back to the chest to try again.');
          job = null;
          refreshChests();
        } else {
          job.left -= elapsed;
          gauge.value = 1 - Math.max(0, job.left) / job.duration;
          if (job.left <= 0) {
            const entry = job.entry;
            job = null;
            collect(entry);
          }
        }
      }
      meter.hidden = !job;
      if (time - lastUpdate > 450) { lastUpdate = time; refreshChests(); }
      focus = null;
      if (!blocked && !job) {
        let closest = Math.min(REACH, otherReach);
        for (const entry of entries.values()) {
          const d = distance(player, entry.spot);
          if (d < closest) { closest = d; focus = entry; }
        }
      }
      prompts.hidden = !focus;
      if (focus) {
        const supply = focus.type === 'supply' && unlockedSupply(focus.data) && craft.seconds(focus.id) ? 'Check supplies' : null;
        const label = supply ?? focus.data.prompt ?? (focus.type === 'keeper' ? 'Talk to Keeper Aya' : focus.id === 'ridge' && focus.type === 'beacon' ?
          'Check the observatory' : focus.type === 'beacon' ? 'Check the lantern' : `Check ${focus.data.name.toLowerCase()}`);
        if (promptLabel.textContent !== label) promptLabel.textContent = label;
      }
      return { nearby: Boolean(focus) || Boolean(job), work: job?.spot ?? null };
    },
  };
}
