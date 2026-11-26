import { BOUNDS, PLATE, STUD } from './bricks.js';
import { OPENING_LIMITS, openingSizeAllowed } from './object-sizes.js';

export function wallAt(world, x, z, y) {
  for (const brick of world.at(x, z)) {
    if (brick.form === 'brick' && brick.y <= y && y < brick.y + brick.h) return true;
  }
  return false;
}

export function hasOpeningFrame(world, { x, y, z, w, d, h, turn }) {
  const acrossX = turn % 2 === 0;
  for (let height = y; height < y + h; height++) {
    const left = acrossX ? wallAt(world, x - 1, z, height) : wallAt(world, x, z - 1, height);
    const right = acrossX ? wallAt(world, x + w, z, height) : wallAt(world, x, z + d, height);
    if (!left || !right) return false;
  }
  for (let offset = 0; offset < (acrossX ? w : d); offset++) {
    const px = acrossX ? x + offset : x;
    const pz = acrossX ? z : z + offset;
    if (!wallAt(world, px, pz, y - 1) || !wallAt(world, px, pz, y + h)) return false;
  }
  return true;
}

function rectangleAt(world, { x, y, z }, acrossX, { form, tone, turn }) {
  if (y < BOUNDS.minY || y >= BOUNDS.maxY) return null;
  const { maxWidth } = OPENING_LIMITS[form];
  const wallAtOffset = offset => wallAt(world, x + (acrossX ? offset : 0), z + (acrossX ? 0 : offset), y);
  if (wallAtOffset(0)) return null;
  let left = -1, right = 1;
  while (left >= -maxWidth && !wallAtOffset(left)) left--;
  if (left < -maxWidth) return null;
  while (right - left - 1 <= maxWidth && !wallAtOffset(right)) right++;
  const width = right - left - 1;
  let bottom = -Infinity, top = Infinity;
  for (const brick of world.at(x, z)) {
    if (brick.form !== 'brick') continue;
    const upper = brick.y + brick.h;
    if (upper <= y) bottom = Math.max(bottom, upper);
    else if (brick.y > y) top = Math.min(top, brick.y);
  }
  const h = top - bottom;
  if (!openingSizeAllowed(form, width, h)) return null;
  const angle = (turn + Number((turn % 2 === 0) !== acrossX)) % 4;
  const brick = { form, tone, studs: false, turn: angle, x: x + (acrossX ? left + 1 : 0), y: bottom,
    z: z + (acrossX ? 0 : left + 1), w: acrossX ? width : 1, d: acrossX ? 1 : width, h };
  return hasOpeningFrame(world, brick) ? brick : null;
}

function rayCell(origin, direction, distance) {
  return { x: Math.floor((origin.x + direction.x * distance) / STUD),
    y: Math.floor((origin.y + direction.y * distance) / PLATE),
    z: Math.floor((origin.z + direction.z * distance) / STUD) };
}

export function snapOpening(world, { origin, direction }, hit, maxDistance, part, canUse) {
  let closest = hit?.distance ?? maxDistance;
  let candidate = null;
  // The ray can pass through an empty frame without ever hitting a brick in it.
  for (const normal of ['z', 'x']) {
    const rate = direction[normal];
    if (Math.abs(rate) < 0.0001) continue;
    const step = Math.sign(rate);
    const first = Math.floor(origin[normal] / STUD);
    for (let layer = first; ; layer += step) {
      const plane = (layer + Number(step < 0)) * STUD;
      const distance = Math.max(0, (plane - origin[normal]) / rate);
      if (distance > closest) break;
      const cell = rayCell(origin, direction, distance + 0.0001);
      cell[normal] = layer;
      const fitted = rectangleAt(world, cell, normal === 'z', part);
      if (!fitted) continue;
      candidate = fitted;
      closest = distance;
      break;
    }
  }
  if (!candidate && hit) {
    // The sill and the inside faces of jambs are also useful targets on a touch screen.
    const { point, axis, sign } = hit;
    const cell = rayCell(point, { x: 0, y: 0, z: 0, [axis]: sign }, 0.001);
    const axes = Math.abs(direction.z) >= Math.abs(direction.x) ? [true, false] : [false, true];
    for (const acrossX of axes) {
      candidate = rectangleAt(world, cell, acrossX, part);
      if (candidate) break;
    }
  }
  return candidate ? { ...candidate, blocks: [candidate], allowed: canUse([candidate]) } : null;
}
