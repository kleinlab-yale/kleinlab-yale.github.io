import { adjacentBrick, PLATE, STUD } from './bricks.js';
import { layoutPart } from './parts.js';
import { isChristmasTree } from './christmas.js';

const AXES = { x: ['w', STUD], y: ['h', PLATE], z: ['d', STUD] };
const NEARBY = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1], [-2, 0], [2, 0], [0, -2], [0, 2]];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function rowAxis(world, brick) {
  if (brick.form !== 'brick' || (!world.added.has(brick.id) && brick.y < 0)) return null;
  if (brick.w !== brick.d) return brick.w > brick.d ? 'x' : 'z';

  let alongX = 0;
  let alongZ = 0;
  for (const neighbor of world.query(brick.x - 1, brick.x + brick.w + 1, brick.z - 1, brick.z + brick.d + 1)) {
    if (neighbor.y !== brick.y || neighbor.h !== brick.h || neighbor.form !== 'brick' || !world.added.has(neighbor.id)) continue;
    if (neighbor.z === brick.z && neighbor.d === brick.d && (neighbor.x + neighbor.w === brick.x || neighbor.x === brick.x + brick.w)) alongX++;
    if (neighbor.x === brick.x && neighbor.w === brick.w && (neighbor.z + neighbor.d === brick.z || neighbor.z === brick.z + brick.d)) alongZ++;
  }
  return alongX === alongZ ? null : alongX > alongZ ? 'x' : 'z';
}

function faceAnchors(hit, layout, centered, sideY) {
  const raw = adjacentBrick(hit, layout);
  const { brick, point } = hit;
  const tangents = Object.keys(AXES).filter(axis => axis !== hit.axis);
  const spans = tangents.map(axis => {
    if (axis === 'y' && sideY !== null) return { axis, fixed: sideY };
    const [dimension, unit] = AXES[axis];
    const far = brick[axis] + brick[dimension];
    const width = layout[dimension];
    const cell = clamp(Math.floor(point[axis] / unit + 0.0001), brick[axis], far - 1);
    const low = Math.min(brick[axis], far - width);
    const high = Math.max(brick[axis], far - width);
    const aligned = centered ? clamp(Math.round(point[axis] / unit - width / 2), cell - width + 1, cell) : clamp(raw[axis], low, high);
    return { axis, width, cell, low, high, aligned };
  });

  return NEARBY.map(offsets => {
    const origin = { x: raw.x, y: raw.y, z: raw.z };
    let fit = 0;
    for (const [i, span] of spans.entries()) {
      if (span.fixed !== undefined) {
        if (offsets[i] !== 0) return null;
        origin[span.axis] = span.fixed;
        continue;
      }
      const cell = span.aligned + offsets[i];
      if (cell > span.cell || cell + span.width <= span.cell) return null;
      origin[span.axis] = cell;
      if (!centered) fit += Math.abs(cell - clamp(cell, span.low, span.high));
    }
    return { origin, fit };
  }).filter(Boolean).sort((a, b) => a.fit - b.fit);
}

function planAt(layout, origin, turn) {
  const blocks = layout.blocks.map(block => ({ ...block, x: origin.x + block.x, y: origin.y + block.y, z: origin.z + block.z }));
  return { ...layout, ...origin, turn, blocks };
}

function wallAt(world, x, z, y) {
  for (const brick of world.at(x, z)) if (brick.form === 'brick' && brick.y <= y && brick.y + brick.h > y) return true;
  return false;
}

function doorwaySides(world, door) {
  const y = door.y + Math.floor(door.h / 2);
  const posts = door.w > door.d ? [[door.x - 1, door.z], [door.x + door.w, door.z]] :
    [[door.x, door.z - 1], [door.x, door.z + door.d]];
  return posts.filter(([x, z]) => wallAt(world, x, z, y)).length;
}

function doorwayAxis(world, hit) {
  const { brick, point } = hit;
  const x = clamp(Math.floor(point.x / STUD + 0.0001), brick.x, brick.x + brick.w - 1);
  const z = clamp(Math.floor(point.z / STUD + 0.0001), brick.z, brick.z + brick.d - 1);
  const y = brick.y + brick.h + 4;
  const width = (dx, dz) => {
    let opening = 1;
    for (const sign of [-1, 1]) {
      let step = 1;
      while (step <= 5 && !wallAt(world, x + sign * step * dx, z + sign * step * dz, y)) step++;
      if (step > 5) return Infinity;
      opening += step - 1;
    }
    return opening <= 5 ? opening : Infinity;
  };
  const alongX = width(1, 0), alongZ = width(0, 1);
  return alongX === alongZ ? null : alongX < alongZ ? 'x' : 'z';
}

function snapDoor(world, hit, part, turn, tone, manual, canUse) {
  let first;
  let best;
  let walls = -1;
  const floor = { ...hit, axis: 'y', sign: 1 };
  const onFloor = hit.axis === 'y' && hit.sign === 1;
  const axis = onFloor && !manual ? doorwayAxis(world, hit) : null;
  for (const angle of manual ? [turn] : [turn, (turn + 1) % 4]) {
    const layout = layoutPart(part, angle, tone);
    if (axis && (layout.w > layout.d ? 'x' : 'z') !== axis) continue;
    for (const { origin } of faceAnchors(floor, layout, true, null)) {
      const plan = planAt(layout, origin, angle);
      first ??= plan;
      if (!onFloor || !canUse(plan.blocks)) continue;
      const count = doorwaySides(world, plan);
      if (count > walls) {
        walls = count;
        best = plan;
      }
      if (walls === 2) return { ...best, allowed: true };
    }
  }
  return { ...(best ?? first), allowed: Boolean(best) };
}

export function snapPlacement(world, hit, { part, turn, tone, manual, centered = false, sideY = null }, canUse) {
  if (part.form === 'door' && !centered) return snapDoor(world, hit, part, turn, tone, manual, canUse);
  const plainBrick = !part.blocks && part.form === 'brick';
  const axis = plainBrick && part.w !== part.d && !manual ? rowAxis(world, hit.brick) : null;
  let layout = layoutPart(part, turn, tone);
  if (axis && (layout.w > layout.d ? 'x' : 'z') !== axis) {
    turn = (turn + 1) % 4;
    layout = layoutPart(part, turn, tone);
  }

  const top = (hit.brick.y + hit.brick.h) * PLATE;
  const nearTop = plainBrick && hit.brick.form === 'brick' && hit.axis !== 'y' &&
    hit.point.y >= top - PLATE * Math.min(0.72, hit.brick.h * 0.24);
  const topFace = { ...hit, axis: 'y', sign: 1 };
  const faces = isChristmasTree(part) ? [topFace] : nearTop ? [topFace, hit] : [hit];
  let first = null;
  for (const face of faces) {
    for (const { origin } of faceAnchors(face, layout, centered, sideY)) {
      const candidate = planAt(layout, origin, turn);
      if (canUse(candidate.blocks)) return { ...candidate, allowed: true };
      first ??= candidate;
    }
  }
  return { ...first, allowed: false };
}
