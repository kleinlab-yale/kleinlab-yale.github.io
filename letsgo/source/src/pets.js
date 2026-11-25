import { STUD } from './bricks.js';
import { ISLAND_LAYOUT } from './islands.js';
import { SEA_LEVEL } from './voyage.js';

export const RESCUE_REACH = 2.45;
function pet(name, kind, island, dx, dz) {
  const { gridX, gridZ } = ISLAND_LAYOUT[island];
  return { name, kind, island, x: (gridX + dx) * STUD, z: (gridZ + dz) * STUD };
}

export const PETS = {
  mochi: pet('Mochi', 'Puppy', 'lantern', 2.5, -5.5),
  pebble: pet('Pebble', 'Turtle', 'shell', 2.5, -4.5),
  pip: pet('Pip', 'Rabbit', 'berry', 3.5, -5.5),
};
const RADIUS = 0.15;

function groundAt(world, x, z, y) {
  const ground = world.groundBetween(x, z, RADIUS, Math.max(SEA_LEVEL + 0.07, y - 0.52), y + 0.35);
  return Number.isFinite(ground) && !world.collides(world.playerBox(x, ground, z, RADIUS, 0.63)) ? ground : null;
}

export function lostPet(world, id) {
  const home = PETS[id];
  for (const offset of [0, -1, 1, -2, 2]) {
    const x = home.x + offset * STUD;
    const y = groundAt(world, x, home.z, 0);
    if (y !== null) return { x, y, z: home.z, yaw: 0, moving: false, aboard: false };
  }
  return { x: home.x, z: home.z, y: 0, yaw: 0, moving: false, aboard: false };
}

function restingSpot(world, player) {
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  for (const [back, side] of [[-0.62, -1.03], [-0.62, 1.03], [0.95, 0], [0, 0]]) {
    const x = player.x + sin * back + cos * side;
    const z = player.z + cos * back - sin * side;
    const y = groundAt(world, x, z, player.y);
    if (y !== null) return { x, y, z, yaw: player.yaw, moving: false, aboard: false };
  }
  return null;
}

export function followPet(previous, player, world, dt, aboard) {
  if (aboard) {
    return { x: player.x - Math.sin(player.yaw) * 0.41, y: player.y,
      z: player.z - Math.cos(player.yaw) * 0.41, yaw: player.yaw, moving: false, aboard: true };
  }
  if (!player.grounded && previous) return { ...previous, moving: false };
  const spot = restingSpot(world, player);
  if (!spot) return previous && { ...previous, moving: false };
  if (!previous || previous.aboard) return spot;
  const separation = Math.hypot(player.x - previous.x, player.y - previous.y, player.z - previous.z);
  if (separation > 5.5 || Math.abs(previous.y - spot.y) > 0.95) return spot;
  const dx = spot.x - previous.x;
  const dz = spot.z - previous.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.16) return { ...previous, moving: false };
  const fraction = Math.min(1, (3.4 + separation * 0.75) * dt / distance);
  const x = previous.x + dx * fraction;
  const z = previous.z + dz * fraction;
  const y = groundAt(world, x, z, previous.y);
  if (y === null) return separation > 2.65 ? spot : { ...previous, moving: false };
  return { x, y, z, yaw: Math.atan2(-dx, -dz), moving: true, aboard: false };
}
