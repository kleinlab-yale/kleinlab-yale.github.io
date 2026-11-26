import { PARTS, layoutPart } from './parts.js';

const shapeFields = ['w', 'd', 'h', 'studs', 'form', 'turn'];
const legacyLayouts = PARTS.filter(part => part.blocks).flatMap(part =>
  [0, 1, 2, 3].map(turn => layoutPart(part, turn).blocks));

export function brickBounds(bricks) {
  const x = Math.min(...bricks.map(brick => brick.x));
  const y = Math.min(...bricks.map(brick => brick.y));
  const z = Math.min(...bricks.map(brick => brick.z));
  return { x, y, z,
    w: Math.max(...bricks.map(brick => brick.x + brick.w)) - x,
    h: Math.max(...bricks.map(brick => brick.y + brick.h)) - y,
    d: Math.max(...bricks.map(brick => brick.z + brick.d)) - z,
  };
}

export function offsetBricks(bricks, { x, y, z }) {
  return bricks.map(brick => ({ ...brick, x: brick.x + x, y: brick.y + y, z: brick.z + z }));
}

export function rotateBricks(bricks) {
  const bounds = brickBounds(bricks);
  return bricks.map(brick => ({
    ...brick, x: bounds.x + bounds.d - (brick.z - bounds.z) - brick.d,
    z: bounds.z + (brick.x - bounds.x), w: brick.d, d: brick.w, turn: (brick.turn + 1) % 4,
  }));
}

function sameShape(brick, shape) {
  return shapeFields.every(field => brick[field] === shape[field]);
}

function matchesLayout(bricks, layout) {
  if (bricks.length !== layout.length) return false;
  const first = bricks[0], start = layout[0];
  return bricks.every((brick, i) => {
    const block = layout[i];
    return brick && brick.id === first.id + i && sameShape(brick, block) &&
      brick.x - first.x === block.x - start.x && brick.y - first.y === block.y - start.y &&
      brick.z - first.z === block.z - start.z;
  }) && (bricks.every(brick => brick.tone === first.tone) || bricks.every((brick, i) => brick.tone === layout[i].tone));
}

export function recoverAssemblies(added, undo, firstAddedId) {
  const assemblies = new Map();
  const knownPlacements = new Set();
  function record(bricks) {
    for (const { id } of bricks) assemblies.set(id, bricks[0].id);
  }

  // Old undo records can identify a kit even if a member was painted or removed.
  for (const { edits, previous } of Array.isArray(undo) ? undo.filter(Boolean) : []) {
    if (!Array.isArray(edits) || !edits.length || !Array.isArray(previous) || edits.length !== previous.length ||
      !edits.every((edit, i) => Number.isSafeInteger(edit?.id) && edit.id >= firstAddedId && edit.id === edit.brick?.id &&
        previous[i]?.id === edit.id && previous[i].brick === null)) continue;
    const bricks = edits.map(edit => edit.brick);
    for (const { id } of bricks) knownPlacements.add(id);
    if (!legacyLayouts.some(layout => matchesLayout(bricks, layout))) continue;
    if (bricks.every(brick => {
      const current = added.get(brick.id);
      return !current || (current.assembly === undefined && sameShape(current, brick) &&
        current.x === brick.x && current.y === brick.y && current.z === brick.z);
    })) record(bricks);
  }

  // When the placement record has expired, require the complete original layout in placement order.
  for (const id of [...added.keys()].sort((a, b) => a - b)) {
    const first = added.get(id);
    if (first.assembly !== undefined || knownPlacements.has(id) || assemblies.has(id)) continue;
    const matches = [];
    for (const layout of legacyLayouts) {
      if (!sameShape(first, layout[0])) continue;
      const bricks = layout.map((_, i) => added.get(id + i));
      if (bricks.every(brick => brick && brick.assembly === undefined &&
        !knownPlacements.has(brick.id) && !assemblies.has(brick.id)) && matchesLayout(bricks, layout)) matches.push(bricks);
    }
    if (matches.length === 1) record(matches[0]);
  }
  return assemblies;
}
