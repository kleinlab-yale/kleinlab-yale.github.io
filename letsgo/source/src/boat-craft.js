import { EMPTY_HULL, validHull } from './voyage.js';
import { SHIPS } from './ship-data.js';

export const BOAT_KEY = 'letsgo:boat-craft:1';
const OLD_HULL_KEY = 'letsgo:boat-design:1';
const REFILL = 75000;
const RECIPES = [{}, { reeds: 1 }, { timber: 1, fittings: 1 }];

export const MATERIALS = {
  reeds: { name: 'Reed bundles', unit: 'reed bundle', hint: 'Gather reeds along the path to the south dock or on Reed Islet.' },
  timber: { name: 'Cedar boards', unit: 'cedar board', hint: 'Search the shore of Reed Islet or Lantern Island for timber.' },
  fittings: { name: 'Metal fittings', unit: 'metal fitting', hint: 'Salvage fittings near the lantern gate on Lantern Island.' },
};

export const SUPPLIES = {
  brook: { name: 'Meadow reeds', x: 16.5, z: 42.5, kind: 'reeds', prompt: 'Gather meadow reeds', yield: { reeds: 13 } },
  dockReeds: { name: 'Dockside reeds', x: 15.5, z: 51.5, kind: 'reeds', prompt: 'Gather dockside reeds', yield: { reeds: 14 } },
  isletReeds: { name: 'Islet reeds', island: 'reed', x: -0.5, z: 91.5, kind: 'reeds', prompt: 'Gather islet reeds', yield: { reeds: 17 } },
  isletTimber: { name: 'Reed Islet driftwood', island: 'reed', x: -7.5, z: 96.5, kind: 'timber', prompt: 'Collect driftwood', yield: { timber: 12 } },
  lanternTimber: { name: 'Lantern Island timber', island: 'lantern', x: 34.5, z: 126.5, kind: 'timber', prompt: 'Collect shore timber', yield: { timber: 12 } },
  lanternSalvage: { name: 'Lantern gate salvage', island: 'lantern', x: 24.5, z: 122.5, kind: 'fittings', prompt: 'Salvage lantern fittings', yield: { fittings: 18 } },
  shellSalvage: { name: 'Shell Cove salvage', island: 'shell', x: -27.5, z: 190.5, kind: 'fittings', prompt: 'Salvage cove fittings', yield: { fittings: 14 } },
  wreckTimber: { name: 'Wreck timber and cordage', island: 'shell', x: -34.5, z: 182.5, kind: 'timber',
    prompt: 'Gather wreck timber and cordage', yield: { timber: 12, reeds: 8 } },
  berryTimber: { name: 'Cloudberry timber', island: 'berry', x: -16.5, z: 235.5, kind: 'timber', prompt: 'Collect Cloudberry timber', yield: { timber: 14 } },
  moonStores: { name: 'Moonbell refit stores', island: 'moon', x: -30.5, z: 378.5, kind: 'fittings', requires: 'moon',
    prompt: 'Collect Moonbell boat supplies', yield: { reeds: 18, timber: 20, fittings: 20 } },
  cedarStores: { name: 'Cedar Harbor lumber rack', island: 'cedar', x: -24.5, z: 521.5, kind: 'timber',
    prompt: 'Collect Cedar Harbor boat supplies', yield: { reeds: 14, timber: 15, fittings: 15 } },
};

function resources(make) {
  return Object.fromEntries(Object.keys(MATERIALS).map(key => [key, make(key)]));
}

function cost(code) {
  const stock = resources(() => 0);
  for (const tile of code) for (const [key, amount] of Object.entries(RECIPES[Number(tile)])) stock[key] += amount;
  return stock;
}

export function resourceList(stock) {
  return Object.entries(stock).filter(([, value]) => value > 0).map(([key, value]) =>
    `${value} ${value === 1 ? MATERIALS[key].unit : MATERIALS[key].name.toLowerCase()}`).join(', ');
}

export function createBoatCraft(read, save) {
  const stored = read(BOAT_KEY);
  const previousHull = read(OLD_HULL_KEY);
  let hull = validHull(stored?.hull) ? stored.hull : validHull(previousHull) ? previousHull : EMPTY_HULL;
  const stock = resources(key => Number.isSafeInteger(stored?.stock?.[key]) ? Math.max(0, stored.stock[key]) : 0);
  const fleet = Object.fromEntries(Object.entries(SHIPS).map(([id, ship]) => {
    const stage = stored?.fleet?.[id];
    return [id, Number.isSafeInteger(stage) ? Math.max(0, Math.min(ship.work.length, stage)) : 0];
  }));
  const harvests = {};
  for (const key of Object.keys(SUPPLIES)) {
    const when = stored?.harvests?.[key];
    if (Number.isSafeInteger(when) && when > 0) harvests[key] = when;
  }

  function write() { save(BOAT_KEY, { hull, stock: { ...stock }, harvests: { ...harvests }, fleet: { ...fleet } }); }

  function quote(next) {
    const old = cost(hull);
    const needed = cost(next);
    const difference = resources(key => needed[key] - old[key]);
    return { difference, missing: resources(key => Math.max(0, difference[key] - stock[key])) };
  }

  function seconds(id, now = Date.now()) {
    return harvests[id] ? Math.max(0, Math.ceil((harvests[id] + REFILL - now) / 1000)) : 0;
  }

  function shipWork(id) {
    const task = Object.hasOwn(SHIPS, id) ? SHIPS[id].work[fleet[id]] : null;
    if (!task) return null;
    const missing = resources(key => Math.max(0, (task.cost[key] ?? 0) - stock[key]));
    return { ...task, stage: fleet[id], missing };
  }

  return {
    get hull() { return hull; },
    get stock() { return { ...stock }; },
    quote,
    seconds,
    shipStage: id => fleet[id] ?? 0,
    hasShip: id => Object.hasOwn(SHIPS, id) && fleet[id] === SHIPS[id].work.length,
    shipWork,
    refit(id, stage) {
      const task = shipWork(id);
      if (!task || task.stage !== stage || Object.values(task.missing).some(Boolean)) return false;
      for (const [key, value] of Object.entries(task.cost)) stock[key] -= value;
      fleet[id]++;
      write();
      return true;
    },
    build(next) {
      if (!validHull(next)) return null;
      const price = quote(next);
      if (Object.values(price.missing).some(Boolean)) return { ok: false, ...price };
      if (next !== hull) {
        for (const key of Object.keys(stock)) stock[key] -= price.difference[key];
        hull = next;
        write();
      }
      return { ok: true, ...price };
    },
    gather(id, now = Date.now()) {
      if (!Object.hasOwn(SUPPLIES, id) || seconds(id, now)) return null;
      const amount = SUPPLIES[id].yield;
      for (const [key, value] of Object.entries(amount)) stock[key] += value;
      harvests[id] = now;
      write();
      return amount;
    },
  };
}
