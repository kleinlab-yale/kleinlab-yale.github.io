import { PLATE, STUD } from './bricks.js';
import { COAST_BRIDGE } from './mainland-data.js';

export function bridgeDeck(world) {
  const { x, z, width, rows, y } = COAST_BRIDGE;
  return Array.from({ length: rows }, (_, row) => Array.from({ length: width }, (_, offset) => {
    const a = (x + offset + 0.5) * STUD;
    const b = (z + row + 0.5) * STUD;
    const floor = world.groundBetween(a, b, 0.18, (y + 1) * PLATE, (y + 2) * PLATE);
    return Number.isFinite(floor) && !world.collides(world.playerBox(a, floor, b, 0.23, 1.49));
  }));
}

export function nextBridgePlanks(deck) {
  const row = deck.findIndex(line => !line.every(Boolean));
  if (row < 0) return [];
  const { x, z, y } = COAST_BRIDGE;
  const planks = [];
  for (const [offset, filled] of deck[row].entries()) {
    if (filled) continue;
    const previous = planks.at(-1);
    if (previous && previous.x + previous.w === x + offset) previous.w++;
    else planks.push({ x: x + offset, y, z: z + row, w: 1, d: 1, h: 1, form: 'brick', tone: 'oak', studs: true, turn: 1 });
  }
  return planks;
}
