import { MAX_PATCH, TONES, resizeSavedDecoration, sameBrick, validBrick } from './bricks.js';
import { canBuildAt } from './islands.js';
import { PARTS, PLACEABLE_OBJECTS, layoutPart } from './parts.js';
import { isChristmasPiece, isChristmasTree } from './christmas.js';
import { offsetBricks, rotateBricks } from './assemblies.js';
import { OPENING_LIMITS, resizeObject, sizeOptions } from './object-sizes.js';
import { hasOpeningFrame } from './openings.js';

const UNDO_LIMIT = 64;
const assembledParts = new Map(PARTS.filter(part => part.blocks).map(part => [part.key, part]));
export const PROTECTED_BRICK = 'You can change bricks you placed during this visit.';

function toBrick(value, id) {
  if (value?.treeId !== undefined || !validBrick(value)) return null;
  const { x, y, z, w, d, h, tone, studs, form, turn } = value;
  const brick = { id, x, y, z, w, d, h, tone, studs, form, turn };
  if (PLACEABLE_OBJECTS[form]?.interaction) brick.active = isChristmasTree(brick) || form === 'fairyLights';
  return brick;
}

function validEdit(edit) {
  return Boolean(edit && Number.isSafeInteger(edit.id) &&
    (edit.brick === null || (validBrick(edit.brick) && edit.brick.id === edit.id)));
}

export class Builder {
  constructor(world, limited = false) {
    this.world = world;
    this.owned = limited ? new Set() : null;
    this.history = [];
  }

  get canUndo() { return this.history.length > 0; }
  canEdit(id) { return this.owned === null || this.owned.has(id); }

  forgetPackedDecorations() {
    this.history = this.history.flatMap(({ edits, previous }) => {
      const keep = edits.map((edit, i) => !isChristmasPiece(edit.brick) && !isChristmasPiece(previous[i].brick));
      return keep.some(Boolean) ? [{ edits: edits.filter((_, i) => keep[i]), previous: previous.filter((_, i) => keep[i]) }] : [];
    });
  }

  restoreHistory(snapshot) {
    if (Array.isArray(snapshot?.undo)) {
      const restoreEdit = edit => {
        if (!edit?.brick || snapshot.version !== 2) return edit;
        const brick = resizeSavedDecoration(edit.brick);
        const assembly = this.world.legacyAssemblies.get(edit.id);
        return { ...edit, brick: assembly === undefined ? brick : { ...brick, assembly } };
      };
      this.history = snapshot.undo.slice(-UNDO_LIMIT).filter(item =>
        Array.isArray(item?.edits) && Array.isArray(item?.previous) && item.edits.length > 0 &&
        item.edits.length <= MAX_PATCH && item.edits.length === item.previous.length)
        .map(({ edits, previous }) => ({ edits: edits.map(restoreEdit), previous: previous.map(restoreEdit) }))
        .filter(item => item.edits.every((edit, i) => validEdit(edit) && validEdit(item.previous[i]) && edit.id === item.previous[i].id));
      return;
    }
    this.history = Array.from(this.world.removed).filter(id => id > 0).slice(-UNDO_LIMIT).map(id => ({
      edits: [{ id, brick: null }], previous: [{ id, brick: this.world.starter.get(id) }],
    }));
  }

  perform(request, boxes, reachable) {
    if (!request || typeof request !== 'object') return { error: 'blocked' };
    if (request.kind === 'undo') return this.undo(boxes);
    if (request.kind === 'place') {
      if (request.treeId !== undefined) return this.hang(request, null, boxes, reachable);
      const { kit, x, y, z, turn, tone } = request;
      let blocks = request.bricks;
      if (kit !== undefined) {
        const part = assembledParts.get(kit);
        if (!part || ![x, y, z, turn].every(Number.isInteger) || turn < 0 || turn > 3) return { error: 'blocked' };
        blocks = offsetBricks(layoutPart(part, turn, tone).blocks, { x, y, z });
      }
      if (!Array.isArray(blocks) || blocks.length === 0 || blocks.length > MAX_PATCH) return { error: 'blocked' };
      const bricks = Array.from(blocks, (value, i) => toBrick(value, this.world.nextId + i));
      if (bricks.some(brick => !brick || !reachable(brick))) return { error: 'blocked' };
      if (!bricks.every(canBuildAt)) return { error: 'open-water' };
      if (bricks.some(brick => isChristmasTree(brick) && !this.world.hasBase(brick))) return { error: 'tree-base' };
      if (request.fit === true && (bricks.length !== 1 || !Object.hasOwn(OPENING_LIMITS, bricks[0].form) ||
        !hasOpeningFrame(this.world, bricks[0]))) return { error: `${bricks[0].form}-opening` };
      if (kit !== undefined) for (const brick of bricks) brick.assembly = bricks[0].id;
      const edits = bricks.map(brick => ({ id: brick.id, brick }));
      return this.commit(edits, boxes);
    }

    const target = this.world.bricks.get(request.id);
    if (!target || !reachable(target)) return { error: 'blocked' };
    if (request.kind === 'use' && PLACEABLE_OBJECTS[target.form]?.interaction) {
      const edits = [{ id: target.id, brick: { ...target, active: !target.active } }];
      return this.world.patch(edits, boxes) ? { edits } : { error: 'doorway' };
    }
    if (!this.canEdit(target.id)) return { error: 'protected' };
    const decorations = Array.from(this.world.decorationsOf(target.id));
    if (request.kind !== 'paint' && decorations.some(brick => !this.canEdit(brick.id))) return { error: 'protected' };
    let brick;
    switch (request.kind) {
      case 'remove': return this.commit([target, ...decorations].map(({ id }) => ({ id, brick: null })), boxes);
      case 'move':
      case 'rotate': return this.transform(request, target, boxes, reachable);
      case 'resize': return this.resize(request, target, boxes, reachable);
      case 'paint':
        if (!Object.hasOwn(TONES, request.tone) || target.tone === request.tone) return { error: 'color' };
        brick = { ...target, tone: request.tone };
        break;
      default: return { error: 'blocked' };
    }
    return this.commit([{ id: target.id, brick }], boxes);
  }

  transform(request, target, boxes, reachable) {
    const members = this.world.assemblyMembers(target);
    if (!members.every(brick => this.canEdit(brick.id))) return { error: 'protected' };
    let bricks;
    if (request.kind === 'move') {
      if (!this.world.added.has(target.id)) return { error: 'placed-piece' };
      const { from, x, y, z } = request;
      if (!from || ['x', 'y', 'z', 'turn', 'treeId', 'slot'].some(field => target[field] !== from[field]) ||
        ['w', 'd', 'h'].some(field => from[field] !== undefined && target[field] !== from[field]) ||
        (target.assembly !== undefined && (!Array.isArray(from.members) || from.members.length !== members.length ||
          members.some((brick, i) => brick.id !== from.members[i])))) return { error: 'moved' };
      if (request.treeId !== undefined) return this.hang(request, target, boxes, reachable);
      if (target.treeId !== undefined) return { error: 'tree-decoration' };
      if (![x, y, z].every(Number.isInteger)) return { error: 'blocked' };
      if (x === target.x && y === target.y && z === target.z) return { error: 'same-spot' };
      bricks = offsetBricks(members, { x: x - target.x, y: y - target.y, z: z - target.z });
      if (bricks.some(brick => !validBrick(brick) || !reachable(brick))) return { error: 'blocked' };
      if (bricks.some(brick => isChristmasTree(brick) && !this.world.hasBase(brick))) return { error: 'tree-base' };
    } else {
      if (target.treeId !== undefined) {
        return this.commit([{ id: target.id, brick: { ...target, turn: (target.turn + 1) % 4 } }], boxes);
      }
      if (members.length === 1 && target.w === target.d && target.form !== 'flower' && !PLACEABLE_OBJECTS[target.form]) {
        return { error: 'square' };
      }
      bricks = rotateBricks(members);
    }
    if (!bricks.every(canBuildAt)) return { error: 'open-water' };
    return this.commit(bricks.map(brick => ({ id: brick.id, brick })), boxes);
  }

  hang(request, target, boxes, reachable) {
    const { treeId, slot } = request;
    const tree = this.world.added.get(treeId);
    if (!isChristmasTree(tree) || !reachable(tree) || target?.assembly !== undefined) return { error: 'tree-decoration' };
    const form = target?.form ?? request.form;
    const occupied = this.world.decorationAt(treeId, form, slot);
    if (occupied) return { error: occupied.id === target?.id ? 'same-spot' : 'tree-slot' };
    const id = target?.id ?? this.world.nextId;
    const brick = { id, treeId, slot, form, tone: target?.tone ?? request.tone, turn: target?.turn ?? request.turn };
    if (form === 'fairyLights') brick.active = target?.active ?? true;
    if (!validBrick(brick) || !reachable(brick)) return { error: 'tree-decoration' };
    return this.commit([{ id, brick }], boxes);
  }

  resize(request, target, boxes, reachable) {
    const option = sizeOptions(target.form).find(option => option.key === request.size);
    if (!option || target.treeId !== undefined || !this.world.added.has(target.id)) return { error: 'size-options' };
    if (['x', 'y', 'z', 'w', 'd', 'h', 'turn'].some(field => target[field] !== request.from?.[field])) return { error: 'moved' };
    const brick = resizeObject(target, option.size);
    if (sameBrick(brick, target)) return { error: 'same-size' };
    if (!reachable(brick) || !this.world.canMove(brick, boxes)) return { error: 'size-room' };
    return this.commit([{ id: target.id, brick }], boxes);
  }

  commit(edits, boxes) {
    const previous = edits.map(({ id }) => ({ id, brick: this.world.bricks.get(id) ?? null }));
    if (!this.world.patch(edits, boxes)) return { error: 'blocked' };
    this.history.push({ edits, previous });
    if (this.history.length > UNDO_LIMIT) this.history.shift();
    this.track(edits);
    return { edits };
  }

  undo(boxes) {
    const last = this.history.at(-1);
    if (!last) return { error: 'nothing' };
    if (last.edits.some(({ id, brick }) => !sameBrick(this.world.bricks.get(id) ?? null, brick, false))) {
      this.history.pop();
      return { error: 'changed' };
    }
    if (last.edits.some(({ id, brick }, i) => isChristmasTree(brick) &&
      ['x', 'y', 'z', 'w', 'd', 'h', 'turn'].some(field => brick[field] !== last.previous[i].brick?.[field]) &&
      Array.from(this.world.decorationsOf(id)).some(child => !this.canEdit(child.id)))) return { error: 'protected' };
    const restore = last.previous.map(edit => {
      const current = this.world.bricks.get(edit.id);
      if (!edit.brick || current?.active === undefined) return edit;
      return { ...edit, brick: { ...edit.brick, active: current.active } };
    });
    if (!this.world.patch(restore, boxes)) return { error: 'restore' };
    this.history.pop();
    this.track(restore);
    return { edits: restore };
  }

  track(edits) {
    if (!this.owned) return;
    for (const { id, brick } of edits) {
      if (brick) this.owned.add(id);
      else this.owned.delete(id);
    }
  }
}
