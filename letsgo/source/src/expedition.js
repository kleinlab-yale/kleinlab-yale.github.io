import { BEACONS, CHESTS, KEEPER, SYMBOLS } from './adventure-data.js';
import { STUD } from './bricks.js';
import { PETS } from './pets.js';

const $ = id => document.getElementById(id);
const REACH = 2.85;

function distance(player, target) { return Math.hypot(player.x - target.x, player.y - target.y, player.z - target.z); }

function findGround(world, location) {
  let fallback = { x: location.x * STUD, z: location.z * STUD, y: 0 };
  for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, -1], [2, -1], [-2, 1], [2, 1],
    [-3, 0], [3, 0], [0, -3], [0, 3]]) {
    const x = (location.x + a) * STUD;
    const z = (location.z + b) * STUD;
    const y = world.groundBetween(x, z, 0.16, -0.35, 1.2);
    if (!Number.isFinite(y)) continue;
    fallback = { x, y, z };
    if (!world.collides(world.playerBox(x, y, z, 0.26, 1.51))) return fallback;
  }
  return fallback;
}

export function createExpedition({ world, model, getPlayer, progress, open, resume, openPets, toast, sound, celebrate }) {
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
  for (const [id, data] of Object.entries(CHESTS)) register('chest', id, data);
  for (const [id, data] of Object.entries(BEACONS)) register('beacon', id, data);

  function refreshChests() {
    for (const [id, chest] of Object.entries(CHESTS)) {
      const status = progress.chestStatus(id).status;
      model.showChest(id, progress.opened(id) && (!chest.refill || status === 'refill'), job?.entry.id === id);
    }
  }

  function reset() {
    focus = null;
    tracked = null;
    job = null;
    meter.hidden = true;
    prompts.hidden = true;
    for (const entry of entries.values()) {
      entry.spot = findGround(world, entry.data);
      model.place(entry.type, entry.id, entry.spot);
      if (entry.type === 'beacon') model.showLantern(entry.id, progress.lit(entry.id));
    }
    refreshChests();
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
    const { status, remaining, beacon } = progress.chestStatus(id);
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

  function show(entry) {
    if (!entry || !reach(entry)) return;
    title.textContent = entry.data.name;
    content.replaceChildren();
    if (entry.type === 'keeper') {
      progress.meetKeeper();
      if (tracked === entry) tracked = null;
      if (progress.lit('moon')) {
        paragraph('I heard Moonbell’s bell again from the meadow. The next boat coming home will have lights to guide it the whole way.');
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
    } else if (entry.type === 'chest') showChest(entry);
    else showLantern(entry);
    open();
  }

  prompts.onclick = () => show(focus);

  return {
    reset,
    track(type, id) { tracked = entries.get(key(type, id)) ?? null; },
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
        const label = focus.type === 'keeper' ? 'Talk to Keeper Aya' : focus.type === 'beacon' ? 'Check the lantern' : `Check ${focus.data.name.toLowerCase()}`;
        if (promptLabel.textContent !== label) promptLabel.textContent = label;
      }
      return { nearby: Boolean(focus) || Boolean(job), work: job?.spot ?? null };
    },
  };
}
