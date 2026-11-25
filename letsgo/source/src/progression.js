import { BEACONS, CHESTS } from './adventure-data.js';
import { ISLAND_LAYOUT } from './islands.js';
import { BUILD_PACKS } from './parts.js';
import { PETS } from './pets.js';

export const PROGRESS_KEY = 'letsgo:progress:1';
export const HOUSE_GOAL = 6;
const UPGRADE_COSTS = [20, 38, 62, 92, 135];
const MAX_COINS = 999999;

function validKeys(list, collection) {
  return new Set(Array.isArray(list) ? list.filter(key => typeof key === 'string' && Object.hasOwn(collection, key)) : []);
}

export function createProgress(read, save, existingBuilds) {
  const stored = read(PROGRESS_KEY);
  const islands = validKeys(stored?.islands ?? read('letsgo:island-visits:1'), ISLAND_LAYOUT);
  const pets = validKeys(stored?.pets, PETS);
  if (read('letsgo:puppy:1') === true) pets.add('mochi');
  for (const id of pets) islands.add(PETS[id].island);
  let placements = Math.min(HOUSE_GOAL, Math.max(0, Number.isInteger(stored?.placements) ? stored.placements : existingBuilds));
  let teaServed = stored?.teaServed === true;
  let companion = pets.has(stored?.companion) ? stored.companion : pets.values().next().value ?? null;
  let coins = Number.isSafeInteger(stored?.coins) ? Math.max(0, Math.min(MAX_COINS, stored.coins)) : 0;
  let metKeeper = stored?.metKeeper === true;
  const lit = validKeys(stored?.beacons, BEACONS);
  const cacheTimes = {};
  const levels = {};
  for (const id of Object.keys(CHESTS)) {
    const time = stored?.chests?.[id];
    if (Number.isSafeInteger(time) && time > 0) cacheTimes[id] = time;
  }
  for (const id of pets) {
    const level = stored?.levels?.[id];
    if (Number.isInteger(level) && level > 1 && level <= UPGRADE_COSTS.length + 1) levels[id] = level;
  }

  const earned = {
    house: () => placements >= HOUSE_GOAL,
    furnishings: () => teaServed,
    garden: () => pets.has('mochi'),
    coastal: () => islands.has('shell'),
    shipwright: () => lit.has('shell'),
    stargazer: () => lit.has('moon'),
  };

  function write() {
    save(PROGRESS_KEY, { placements, teaServed, islands: [...islands], pets: [...pets], companion,
      coins, metKeeper, beacons: [...lit], chests: { ...cacheTimes }, levels: { ...levels } });
  }

  function addCoins(amount) { coins = Math.min(MAX_COINS, coins + amount); }

  function record(action, id) {
    const before = Object.keys(BUILD_PACKS).filter(key => earned[key]());
    if (action === 'place' && placements < HOUSE_GOAL) placements++;
    else if (action === 'serve' && !teaServed) teaServed = true;
    else if (action === 'visit' && Object.hasOwn(ISLAND_LAYOUT, id) && !islands.has(id)) islands.add(id);
    else if (action === 'rescue' && Object.hasOwn(PETS, id) && !pets.has(id)) {
      pets.add(id);
      islands.add(PETS[id].island);
      companion = id;
    } else return [];
    write();
    return Object.keys(BUILD_PACKS).filter(key => !before.includes(key) && earned[key]());
  }

  function petStats(id) {
    if (!Object.hasOwn(PETS, id)) return { level: 0, power: 0, cost: null };
    const level = levels[id] ?? 1;
    return { level, power: PETS[id].power + (level - 1) * 3, cost: UPGRADE_COSTS[level - 1] ?? null };
  }

  function chestStatus(id, now = Date.now()) {
    if (!Object.hasOwn(CHESTS, id)) return { status: 'unknown' };
    const chest = CHESTS[id];
    const last = cacheTimes[id];
    if (last && !chest.refill) return { status: 'opened' };
    if (last && now < last + chest.refill) return { status: 'refill', remaining: Math.max(1, Math.ceil((last + chest.refill - now) / 1000)) };
    if (chest.requires && !lit.has(chest.requires)) return { status: 'dark', beacon: chest.requires };
    if (petStats(companion).power < chest.power) return { status: 'power' };
    return { status: 'ready' };
  }

  function missingRelics(id) {
    return BEACONS[id].chests.filter(chest => !cacheTimes[chest]);
  }

  return {
    record,
    unlocked: key => Object.hasOwn(earned, key) && earned[key](),
    visited: key => islands.has(key),
    rescued: id => pets.has(id),
    get placements() { return placements; },
    get companion() { return companion; },
    get coins() { return coins; },
    get metKeeper() { return metKeeper; },
    opened: id => Object.hasOwn(cacheTimes, id),
    lit: id => lit.has(id),
    charted: id => id === 'reef' ? lit.has('shell') : id === 'moon' ? lit.has('reef') : true,
    petStats,
    chestStatus,
    missingRelics,
    meetKeeper() {
      if (metKeeper) return;
      metKeeper = true;
      write();
    },
    train(id) {
      const { level, cost } = petStats(id);
      if (!pets.has(id) || cost === null || coins < cost) return false;
      coins -= cost;
      levels[id] = level + 1;
      write();
      return true;
    },
    collect(id, now = Date.now()) {
      if (chestStatus(id, now).status !== 'ready') return false;
      cacheTimes[id] = now;
      addCoins(CHESTS[id].coins);
      write();
      return true;
    },
    restoreBeacon(id, symbols) {
      if (!Object.hasOwn(BEACONS, id) || lit.has(id) || missingRelics(id).length) return null;
      const beacon = BEACONS[id];
      if (!Array.isArray(symbols) || symbols.length !== beacon.answer.length || beacon.answer.some((value, i) => value !== symbols[i])) return null;
      const before = Object.keys(BUILD_PACKS).filter(key => earned[key]());
      lit.add(id);
      addCoins(beacon.coins);
      write();
      return Object.keys(BUILD_PACKS).filter(key => !before.includes(key) && earned[key]());
    },
    choose(id) {
      if (!pets.has(id) || id === companion) return false;
      companion = id;
      write();
      return true;
    },
  };
}
