import { KEEPER } from './adventure-data.js';
import { STUD } from './bricks.js';
import { REI } from './mainland-data.js';
import { HEIGHT, RADIUS, STEP, movePlayer, stopWalking } from './player.js';
import { SEA_LEVEL } from './voyage.js';

export const RESIDENTS = {
  keeper: { ...KEEPER, role: 'Lantern keeper', place: 'Building Meadow', cargo: 'ledger', pace: 0.97,
    look: { outfit: 4, skin: 3, hair: 4, hairColor: 6, accessory: 4, garment: 7 },
    routine: [[15.5, 28.5, 'Reading the lantern register', 4], [18.5, 27.5], [21.5, 27.5, 'Checking the trail lanterns', 5],
      [21.5, 32.5], [19.5, 33.5, 'Counting the supply crates', 4], [15.5, 33.5]] },
  sora: { name: 'Sora', role: 'Gardener', place: 'Building Meadow', cargo: 'seedling', pace: 0.94,
    look: { outfit: 9, skin: 7, eyes: 3, face: 1, expression: 2, hair: 8, hairColor: 1, accessory: 1, garment: 5 },
    routine: [[24.5, 33.5, 'Tending the meadow seedlings', 5], [27.5, 33.5], [27.5, 36.5, 'Checking the blossom beds', 4],
      [24.5, 37.5], [22.5, 35.5, 'Taking seedlings to the path', 3]] },
  mika: { name: 'Mika', role: 'Tea keeper', place: 'West Village', cargo: 'tea', pace: 1.06,
    look: { outfit: 6, skin: 4, eyes: 1, face: 2, expression: 1, hair: 9, hairColor: 9, accessory: 3, garment: 2 },
    routine: [[-22.5, 30.5, 'Sorting tea leaves', 4], [-19.5, 29.5], [-18.5, 33.5, 'Delivering a tea basket', 5],
      [-22.5, 34.5], [-24.5, 33.5, 'Checking the tea stores', 3]] },
  haru: { name: 'Haru', role: 'Dockhand', place: 'South Dock', cargo: 'rope', pace: 1.17,
    look: { outfit: 2, skin: 9, eyes: 5, face: 3, expression: 5, hair: 10, hairColor: 2, accessory: 6, garment: 7 },
    routine: [[17.5, 54.5, 'Checking the mooring lines', 4], [18.5, 57.5], [18.5, 62.5, 'Coiling a line on the pier', 5],
      [16.5, 61.5], [16.5, 57.5, 'Walking the dock', 2]] },
  nami: { name: 'Nami', role: 'Shipwright', place: 'Shell Cove', cargo: 'mallet', pace: 1.02,
    look: { outfit: 11, skin: 8, face: 0, expression: 5, hair: 6, hairColor: 6, accessory: 5, garment: 7 },
    routine: [[-22.5, 184.5, 'Checking recovered planks', 4], [-22.5, 183.5, 'Inspecting the Lantern wreck', 4],
      [-21.5, 185.5], [-22.5, 189.5, 'Gathering loose cordage', 4], [-24.5, 188.5], [-23.5, 186.5]] },
  rei: { ...REI, role: 'Harbormaster', place: 'Cedar Harbor', cargo: 'ledger', pace: 1.08,
    look: { outfit: 3, skin: 5, hair: 6, hairColor: 1, accessory: 4, garment: 3 },
    routine: [[-12.5, 524.5, 'Reading the harbor ledger', 5], [-17.5, 524.5], [-17.5, 522.5, 'Checking the lantern arch', 5],
      [-17.5, 520.5], [-12.5, 520.5, 'Watching the harbor road', 4]] },
  ren: { name: 'Ren', role: 'Sailmaker', place: 'Cedar Harbor', cargo: 'canvas', pace: 1.13,
    look: { outfit: 8, skin: 10, face: 0, expression: 1, hair: 1, hairColor: 0, accessory: 6, garment: 5 },
    routine: [[-24.5, 513.5, 'Measuring sailcloth', 5], [-23.5, 515.5], [-27.5, 515.5, 'Checking the yard ropes', 4],
      [-27.5, 513.5, 'Watching the galleon berth', 5]] },
};

function footing(world, x, z, low, high) {
  const y = world.groundBetween(x, z, RADIUS, low, high);
  return Number.isFinite(y) && !world.collides(world.playerBox(x, y, z, RADIUS, HEIGHT)) ? y : null;
}

const turn = (from, toward, dt) => from + Math.atan2(Math.sin(toward - from), Math.cos(toward - from)) * (1 - Math.exp(-dt * 9));

export function createRoutine(world, resident) {
  const stops = resident.routine;
  let index = 0;
  let direction = 1;
  let pawn = null;
  let rest = 0;
  let blocked = 0;
  let speaking = 0;

  function reset() {
    for (const [i, [a, b, task, pause]] of stops.entries()) {
      const x = a * STUD, z = b * STUD;
      const y = footing(world, x, z, SEA_LEVEL + 0.05, 1.05);
      if (y === null) continue;
      index = i;
      direction = 1;
      rest = pause ? Math.min(pause, 2.5) : 0;
      blocked = speaking = 0;
      pawn = { x, y, z, yaw: Math.atan2(a - stops[(i + 1) % stops.length][0], b - stops[(i + 1) % stops.length][1]),
        velocity: 0, velocityX: 0, velocityZ: 0, steps: 0, grounded: true, moving: false, sprinting: false, working: Boolean(task && rest) };
      return pawn;
    }
    pawn = null;
    rest = 2;
    return pawn;
  }
  reset();

  return {
    reset,
    get pose() { return pawn; },
    get activity() { return pawn?.working ? stops[index][2] : 'Out on a round'; },
    address(player) {
      if (!pawn) return;
      speaking = 1.5;
      pawn.yaw = Math.atan2(pawn.x - player.x, pawn.z - player.z);
      pawn.working = false;
      stopWalking(pawn);
    },
    tick(dt, player) {
      if (!pawn) {
        rest -= dt;
        if (rest <= 0) reset();
        return pawn;
      }
      if (speaking > 0) {
        speaking -= dt;
        pawn.yaw = turn(pawn.yaw, Math.atan2(pawn.x - player.x, pawn.z - player.z), dt);
        return pawn;
      }
      if (rest > 0) { rest -= dt; return pawn; }
      pawn.working = false;
      const next = (index + direction + stops.length) % stops.length;
      const [a, b, task, pause] = stops[next];
      const dx = a * STUD - pawn.x, dz = b * STUD - pawn.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.16) {
        stopWalking(pawn);
        index = next;
        rest = pause ?? 0;
        pawn.working = Boolean(task && rest);
        return pawn;
      }
      const desired = Math.atan2(-dx, -dz);
      let heading = null;
      // Wide turns around a new obstacle are allowed if the next patch of ground is walkable.
      for (const offset of [0, 0.44, -0.44, 0.86, -0.86]) {
        const angle = desired + offset;
        const scan = Math.min(distance, 0.32);
        const x = pawn.x - Math.sin(angle) * scan, z = pawn.z - Math.cos(angle) * scan;
        if (Math.abs(player.y - pawn.y) < 0.8 && Math.hypot(x - player.x, z - player.z) < 0.56) continue;
        if (footing(world, x, z, Math.max(SEA_LEVEL + 0.05, pawn.y - STEP), pawn.y + STEP) === null) continue;
        heading = angle;
        break;
      }
      if (heading !== null) {
        const speed = Math.min(1, Math.max(0.32, distance / 0.72)) * resident.pace;
        if (movePlayer(pawn, world, { strafe: 0, forward: speed / 3.7 }, dt, heading)) return reset();
        pawn.yaw = turn(pawn.yaw, heading, dt);
      } else stopWalking(pawn);
      blocked = pawn.moving ? 0 : blocked + dt;
      if (blocked > 1.3) {
        direction *= -1;
        index = next;
        blocked = 0;
        rest = 1.4;
      }
      return pawn;
    },
  };
}
