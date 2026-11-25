import { adjacentBrick, PLATE, STUD } from './bricks.js';
import { layoutPart } from './parts.js';

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

function faceAnchors(hit, layout) {
  const raw = adjacentBrick(hit, layout);
  const { brick, point } = hit;
  const tangents = Object.keys(AXES).filter(axis => axis !== hit.axis);
  const spans = tangents.map(axis => {
    const [dimension, unit] = AXES[axis];
    const far = brick[axis] + brick[dimension];
    const width = layout[dimension];
    const cell = clamp(Math.floor(point[axis] / unit + 0.0001), brick[axis], far - 1);
    const low = Math.min(brick[axis], far - width);
    const high = Math.max(brick[axis], far - width);
    return { axis, width, cell, low, high, aligned: clamp(raw[axis], low, high) };
  });

  return NEARBY.map(offsets => {
    const origin = { x: raw.x, y: raw.y, z: raw.z };
    let fit = 0;
    for (const [i, span] of spans.entries()) {
      const cell = span.aligned + offsets[i];
      if (cell > span.cell || cell + span.width <= span.cell) return null;
      origin[span.axis] = cell;
      fit += Math.abs(cell - clamp(cell, span.low, span.high));
    }
    return { origin, fit };
  }).filter(Boolean).sort((a, b) => a.fit - b.fit);
}

export function snapPlacement(world, hit, { part, turn, tone, manual }, canUse) {
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
  const faces = nearTop ? [{ ...hit, axis: 'y', sign: 1 }, hit] : [hit];
  let first = null;
  for (const face of faces) {
    for (const { origin } of faceAnchors(face, layout)) {
      const blocks = layout.blocks.map(block => ({ ...block, x: origin.x + block.x, y: origin.y + block.y, z: origin.z + block.z }));
      const candidate = { ...layout, ...origin, turn, blocks };
      if (canUse(blocks)) return { ...candidate, allowed: true };
      first ??= candidate;
    }
  }
  return { ...first, allowed: false };
}
