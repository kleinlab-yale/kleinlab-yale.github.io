import { MAX_PATCH, TONES, resizeSavedDecoration, sameBrick, validBrick } from './bricks.js';
import { canBuildAt } from './islands.js';
import { PLACEABLE_OBJECTS } from './parts.js';
import { isChristmasPiece, isChristmasTree } from './christmas.js';

const UNDO_LIMIT = 64;
export const PROTECTED_BRICK = 'You can change bricks you placed during this visit.';

function toBrick(value, id) {
  if (!validBrick(value)) return null;
  const { x, y, z, w, d, h, tone, studs, form, turn } = value;
  const brick = { id, x, y, z, w, d, h, tone, studs, form, turn };
  if (PLACEABLE_OBJECTS[form]?.interaction) brick.active = isChristmasTree(brick) || form === 'fairyLights';
  return brick;
}

function validEdit(edit) {
  return Boolean(edit && Number.isSafeInteger(edit.id) &&
    (edit.brick === null || (validBrick(edit.brick) && edit.brick.id === edit.id)));
}

function restoreEdit(edit) {
  return edit?.brick ? { ...edit, brick: resizeSavedDecoration(edit.brick) } : edit;
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
      if (!Array.isArray(request.bricks) || request.bricks.length === 0 || request.bricks.length > MAX_PATCH) return { error: 'blocked' };
      const bricks = request.bricks.map((value, i) => toBrick(value, this.world.nextId + i));
      if (bricks.some(brick => !brick || !reachable(brick))) return { error: 'blocked' };
      if (!bricks.every(canBuildAt)) return { error: 'open-water' };
      if (bricks.some(brick => isChristmasTree(brick) && !this.world.hasBase(brick))) return { error: 'tree-base' };
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
    let brick;
    switch (request.kind) {
      case 'remove': brick = null; break;
      case 'move':
        if (!this.world.added.has(target.id)) return { error: 'placed-piece' };
        if (['x', 'y', 'z', 'turn'].some(field => target[field] !== request.from?.[field])) return { error: 'moved' };
        brick = { ...target, x: request.x, y: request.y, z: request.z };
        if (sameBrick(brick, target)) return { error: 'same-spot' };
        if (!validBrick(brick) || !reachable(brick)) return { error: 'blocked' };
        if (!canBuildAt(brick)) return { error: 'open-water' };
        if (isChristmasTree(brick) && !this.world.hasBase(brick)) return { error: 'tree-base' };
        break;
      case 'paint':
        if (!Object.hasOwn(TONES, request.tone) || target.tone === request.tone) return { error: 'color' };
        brick = { ...target, tone: request.tone };
        break;
      case 'rotate':
        if (target.w === target.d && target.form !== 'flower' && !PLACEABLE_OBJECTS[target.form]) return { error: 'square' };
        brick = { ...target, w: target.d, d: target.w, turn: (target.turn + 1) % 4 };
        if (!canBuildAt(brick)) return { error: 'open-water' };
        break;
      default: return { error: 'blocked' };
    }
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
