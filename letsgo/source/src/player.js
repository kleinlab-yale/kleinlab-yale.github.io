import { BOUNDS, PLATE, STUD } from './bricks.js';
import { SPAWN, WATER_LEVEL } from './valley.js';
import { COAST_LANDING } from './mainland-data.js';
import { stepLength } from './motion.js';

export const RADIUS = 0.23;
export const HEIGHT = 1.49;
export const EYE = 1.29;
export const STEP = PLATE * 2 + 0.001;

export function stopWalking(player) {
  player.velocityX = player.velocityZ = 0;
  player.moving = player.sprinting = false;
}

export function spawnPlayer(world, guest = false, cedar = false) {
  const start = cedar ? { ...SPAWN, x: COAST_LANDING.x * STUD, z: COAST_LANDING.z * STUD, yaw: Math.PI } : SPAWN;
  const resting = { velocity: 0, velocityX: 0, velocityZ: 0, moving: false, sprinting: false, steps: 0 };
  const origin = start.x + (guest ? STUD * 3 : 0);
  for (let ring = 0; ring < 13; ring++) {
    const points = ring === 0 ? 1 : ring * 6;
    for (let i = 0; i < points; i++) {
      const angle = i / points * Math.PI * 2;
      const x = origin + Math.cos(angle) * ring * STUD;
      const z = start.z + Math.sin(angle) * ring * STUD;
      const y = world.groundBetween(x, z, RADIUS, WATER_LEVEL + 0.01, 18);
      if (Number.isFinite(y) && !world.collides(world.playerBox(x, y, z, RADIUS, HEIGHT))) {
        return { ...start, ...resting, x, y, z, grounded: true };
      }
    }
  }
  return { ...start, ...resting, x: origin, y: 20, grounded: false };
}

export function movePlayer(player, world, input, dt, yaw = player.yaw) {
  const length = Math.max(1, Math.hypot(input.strafe, input.forward));
  const speed = input.sprint ? 6.3 : 3.7;
  const dx = (Math.cos(yaw) * input.strafe - Math.sin(yaw) * input.forward) * speed / length;
  const dz = (-Math.sin(yaw) * input.strafe - Math.cos(yaw) * input.forward) * speed / length;
  const count = Math.max(1, Math.ceil(dt * 120));
  const step = dt / count;
  const steering = 1 - Math.exp(-step * (dx || dz ? 21 : 29));
  const startX = player.x;
  const startZ = player.z;
  player.velocityX ??= 0;
  player.velocityZ ??= 0;
  if (input.jump && player.grounded) {
    player.velocity = 4.7;
    player.grounded = false;
  }
  const collides = (x, y, z) => world.collides(world.playerBox(x, y, z, RADIUS, HEIGHT));
  for (let i = 0; i < count; i++) {
    player.velocityX += (dx - player.velocityX) * steering;
    player.velocityZ += (dz - player.velocityZ) * steering;
    for (const [axis, velocity] of [['x', 'velocityX'], ['z', 'velocityZ']]) {
      const amount = player[velocity];
      if (Math.abs(amount) < 0.005) continue;
      const x = player.x + (axis === 'x' ? amount * step : 0);
      const z = player.z + (axis === 'z' ? amount * step : 0);
      if (!collides(x, player.y, z)) {
        player[axis] += amount * step;
        continue;
      }
      if (player.grounded) {
        const riser = world.groundBetween(x, z, RADIUS, player.y, player.y + STEP);
        if (riser > player.y + 0.0001 && !collides(x, riser, z)) {
          player.y = riser;
          player[axis] += amount * step;
          continue;
        }
      }
      player[velocity] = 0;
    }
    player.velocity -= 13.2 * step;
    const next = player.y + player.velocity * step;
    if (player.velocity <= 0) {
      const ground = world.groundBetween(player.x, player.z, RADIUS,
        player.grounded ? Math.min(next, player.y - STEP) : next, player.y);
      if (Number.isFinite(ground)) {
        player.y = ground;
        player.velocity = 0;
        player.grounded = true;
      } else {
        player.y = next;
        player.grounded = false;
      }
    } else if (collides(player.x, next, player.z)) {
      player.velocity = 0;
    } else {
      player.y = next;
    }
  }
  const traveled = Math.hypot(player.x - startX, player.z - startZ);
  player.moving = traveled > 0.001;
  player.sprinting = player.moving && input.sprint;
  if (player.moving && player.grounded) player.steps = (player.steps ?? 0) + traveled / stepLength(player.sprinting);
  return player.y < WATER_LEVEL - 0.56 || Math.abs(player.x) > 43 || player.z < -47 || player.z > BOUNDS.maxZ * STUD + 1;
}
