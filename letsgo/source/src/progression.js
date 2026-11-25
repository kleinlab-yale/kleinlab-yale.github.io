import { ISLAND_LAYOUT } from './islands.js';
import { BUILD_PACKS } from './parts.js';
import { PETS } from './pets.js';

export const PROGRESS_KEY = 'letsgo:progress:1';
export const HOUSE_GOAL = 6;

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

  const earned = {
    house: () => placements >= HOUSE_GOAL,
    furnishings: () => teaServed,
    garden: () => pets.has('mochi'),
    coastal: () => islands.has('shell'),
  };

  function write() {
    save(PROGRESS_KEY, { placements, teaServed, islands: [...islands], pets: [...pets], companion });
  }

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

  return {
    record,
    unlocked: key => Object.hasOwn(earned, key) && earned[key](),
    visited: key => islands.has(key),
    rescued: id => pets.has(id),
    get placements() { return placements; },
    get companion() { return companion; },
    choose(id) {
      if (!pets.has(id) || id === companion) return false;
      companion = id;
      write();
      return true;
    },
  };
}
