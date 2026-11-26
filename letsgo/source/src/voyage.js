import { BOUNDS, PLATE, STUD } from './bricks.js';
import { ISLAND_LAYOUT } from './islands.js';
import { COAST_LANDING, coastDistrict } from './mainland-data.js';

export const SEA_LEVEL = -0.43;
export const HULL_WIDTH = 5;
export const HULL_LENGTH = 7;
const CELLS = HULL_WIDTH * HULL_LENGTH;
export const EMPTY_HULL = '0'.repeat(CELLS);
export const DOCK = { x: 18.5 * STUD, y: PLATE, z: 62.5 * STUD, launchZ: 68.3 * STUD };
export const ISLANDS = Object.fromEntries(Object.entries(ISLAND_LAYOUT).map(([key, area]) =>
  [key, { ...area, x: area.gridX * STUD, z: area.gridZ * STUD }]));

export const ROUTES = {
  home: ['reed', 'lantern', 'shell', 'berry'],
  shell: ['lantern', 'berry', 'reef'],
  berry: ['shell', 'reef', 'moon'],
  reef: ['shell', 'berry', 'moon'],
  moon: ['reef', 'berry', 'cedar'],
  cedar: ['moon'],
};

export function harborAt(player) {
  if (player.y <= SEA_LEVEL || player.y > 2.5) return null;
  if (dockDistance(player) < 5.5) return 'home';
  const island = islandAt(player.x, player.z);
  if (island === 'cedar' && Math.hypot(player.x - COAST_LANDING.x * STUD, player.z - COAST_LANDING.z * STUD) > 12) return null;
  return player.grounded && island && Object.hasOwn(ROUTES, island) ? island : null;
}

export function harborReturn(key) {
  if (key === 'home') return DOCK;
  if (key === 'cedar') return { x: COAST_LANDING.x * STUD, y: 0, z: COAST_LANDING.z * STUD };
  const { x, z } = ISLANDS[key];
  return { x: x + 0.5 * STUD, y: 0, z: z - 4.5 * STUD };
}

export function validHull(value) { return typeof value === 'string' && /^[012]{35}$/.test(value); }

function cellIndex(x, z) { return x >= 0 && x < HULL_WIDTH && z >= 0 && z < HULL_LENGTH ? z * HULL_WIDTH + x : -1; }

function visits(start, allowed, uses) {
  const queue = [start];
  const found = new Set(queue);
  for (const index of queue) {
    const x = index % HULL_WIDTH;
    const z = Math.floor(index / HULL_WIDTH);
    for (const [nextX, nextZ] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
      const next = cellIndex(nextX, nextZ);
      if (next < 0 || found.has(next) || !allowed(next)) continue;
      found.add(next);
      queue.push(next);
    }
  }
  for (const index of found) uses.add(index);
  return found.size;
}

export function rateHull(code) {
  const cells = validHull(code) ? Array.from(code, Number) : Array(CELLS).fill(0);
  const boards = cells.reduce((count, value) => count + Number(value > 0), 0);
  const reinforced = cells.filter(value => value === 2).length;
  if (!boards) return { boards, reinforced, holes: 0, loose: 0, width: 0, length: 0, range: 0, speed: 0, launchable: false };
  const occupied = cells.flatMap((value, index) => value ? [index] : []);
  const xs = occupied.map(index => index % HULL_WIDTH);
  const zs = occupied.map(index => Math.floor(index / HULL_WIDTH));
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const length = Math.max(...zs) - Math.min(...zs) + 1;
  const solid = new Set();
  let main = 0;
  for (const index of occupied) if (!solid.has(index)) main = Math.max(main, visits(index, next => cells[next] > 0, solid));
  const open = new Set();
  for (let i = 0; i < CELLS; i++) {
    const x = i % HULL_WIDTH;
    const z = Math.floor(i / HULL_WIDTH);
    if ((x === 0 || z === 0 || x === HULL_WIDTH - 1 || z === HULL_LENGTH - 1) && cells[i] === 0 && !open.has(i)) {
      visits(i, next => cells[next] === 0, open);
    }
  }
  const holes = CELLS - boards - open.size;
  const loose = boards - main;
  const narrow = Math.min(width, length) < 2 ? 0.38 : 1;
  const leaky = holes ? Math.max(0.11, 0.27 - (holes - 1) * 0.035) : 1;
  const strength = (12 + main * 1.1 + reinforced * 1.03 + Math.min(width, length) * 1.6) * narrow * leaky;
  const range = Math.round(strength * Math.max(0.37, 1 - loose * 0.12));
  return { boards, reinforced, holes, loose, width, length, range, speed: 3.1 + Math.min(1.2, main * 0.038), launchable: main >= 3 };
}

export function hullPattern(type) {
  return Array.from({ length: CELLS }, (_, i) => {
    const x = i % HULL_WIDTH;
    const z = Math.floor(i / HULL_WIDTH);
    if (type === 'raft') return x >= 1 && x <= 2 && z >= 2 && z <= 4 ? '1' : '0';
    if (type === 'wide-raft') return x >= 1 && x <= 3 && z >= 1 && z <= 5 ? '1' : '0';
    const edge = x === 0 || x === HULL_WIDTH - 1 || z === 0 || z === HULL_LENGTH - 1;
    return edge ? '2' : type === 'sealed' ? '1' : '0';
  }).join('');
}

export function dockDistance(player) { return Math.hypot(DOCK.x - player.x, DOCK.z - player.z); }

export function islandAt(x, z) {
  if (coastDistrict(x / STUD, z / STUD)) return 'cedar';
  return Object.keys(ISLANDS).find(key => {
    const area = ISLANDS[key];
    return Math.hypot((x - area.x) / (area.rx * STUD + 0.8), (z - area.z) / (area.rz * STUD + 0.8)) < 1.18;
  }) ?? null;
}

export function headingTo(from, target) { return Math.atan2(from.x - target.x, from.z - target.z); }

function coastDistance(target, dx, dz) {
  const distance = Math.hypot(dx, dz);
  return distance / Math.hypot(dx / (target.rx * STUD), dz / (target.rz * STUD));
}

function launchPoint(target, origin) {
  if (origin === 'home') return { x: DOCK.x, z: DOCK.launchZ };
  if (origin === 'cedar') return { x: -18.5 * STUD, z: 496 * STUD };
  const harbor = ISLANDS[origin];
  const dx = target.x - harbor.x;
  const dz = target.z - harbor.z;
  const scale = (coastDistance(harbor, dx, dz) + 0.95) / Math.hypot(dx, dz);
  return { x: harbor.x + dx * scale, z: harbor.z + dz * scale };
}

export function crossingDistance(target, origin = 'home') {
  const start = launchPoint(target, origin);
  const dx = target.x - start.x;
  const dz = target.z - start.z;
  return Math.ceil(Math.hypot(dx, dz) - coastDistance(target, dx, dz));
}

export function launchVessel(code, destination, origin = 'home') {
  const rating = rateHull(code);
  if (!rating.launchable || !ROUTES[origin]?.includes(destination)) return null;
  const location = launchPoint(ISLANDS[destination], origin);
  return { ...location, code, destination, origin, rating, wear: 0, yaw: headingTo(location, ISLANDS[destination]) };
}

export function advanceVessel(vessel, world, input, yaw, dt) {
  const magnitude = Math.hypot(input.strafe, input.forward);
  const scale = vessel.rating.speed * dt / Math.max(1, magnitude);
  const dx = (Math.cos(yaw) * input.strafe - Math.sin(yaw) * input.forward) * scale;
  const dz = (-Math.sin(yaw) * input.strafe - Math.cos(yaw) * input.forward) * scale;
  if (magnitude > 0.02) {
    const direction = Math.atan2(-dx, -dz);
    const difference = Math.atan2(Math.sin(direction - vessel.yaw), Math.cos(direction - vessel.yaw));
    const turned = vessel.yaw + difference * (1 - Math.exp(-dt * 6));
    vessel.yaw = Math.atan2(Math.sin(turned), Math.cos(turned));
  }
  const x = vessel.x + dx;
  const z = vessel.z + dz;
  const island = islandAt(x, z);
  // A player-built bridge in the channel should not put sailors ashore in open water.
  const canLand = island || z < DOCK.launchZ - STUD * 2;
  const ground = canLand ? world.groundBetween(x, z, 0.21, SEA_LEVEL + 0.07, 1.05) : -Infinity;
  if (Number.isFinite(ground) && !world.collides(world.playerBox(x, ground, z, 0.23, 1.49))) {
    return { shore: { x, y: ground, z }, island };
  }
  if (x > BOUNDS.maxX * STUD + 9 || x < BOUNDS.minX * STUD - 9 || z > BOUNDS.maxZ * STUD + 3 || z < BOUNDS.minZ * STUD - 10) {
    return { sunk: true };
  }
  if (!Number.isFinite(ground)) {
    vessel.x = x;
    vessel.z = z;
  }
  vessel.wear += Math.max(Math.hypot(dx, dz), dt * (vessel.rating.holes ? 0.62 : 0.085));
  return { sunk: vessel.wear >= vessel.rating.range };
}
