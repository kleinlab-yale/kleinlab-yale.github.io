import { PLACEABLE_OBJECTS, QUICK_PARTS } from './parts.js';
import { canBuildAt } from './islands.js';
import { isChristmasTree } from './christmas.js';
import { COAST_BOUNDS } from './mainland-data.js';
import { recoverAssemblies } from './assemblies.js';
import { openingSizeAllowed, sizeOptions } from './object-sizes.js';
import { decorationPose, treeSlotKey, treeSlots } from './tree-decorations.js';

export const STUD = 0.55;
export const PLATE = 0.17;
export const BOUNDS = { minX: -59, maxX: 60, minZ: -53, maxZ: COAST_BOUNDS.maxZ, minY: -9, maxY: 105 };
export const REACH = 13;
export const MAX_EDITS = 6000;
export const WORLD_SAVE_VERSION = 3;
export const MAX_PATCH = 24;

export const TONES = {
  turf: '#556941', olive: '#67774b', meadow: '#758256', moss: '#3e593d',
  lichen: '#9a9659', soil: '#575044', claySoil: '#6d5c4a', sand: '#9b8569',
  shale: '#595c5d', stone: '#858079', gravel: '#9f9688', chalk: '#c3b5a0',
  petal: '#eca2b0', rose: '#d37990', blush: '#f7bfcb', ivory: '#f9dbd7',
  wine: '#a65470', mulberry: '#8a485c', salmon: '#d99397', cream: '#e8cfab',
  bark: '#523932', darkBark: '#382c2a', warmBark: '#704c3b', cedar: '#a66d45',
  oak: '#ba885e', redwood: '#8c5140', lacquer: '#a44137', vermilion: '#bb533e',
  redTrim: '#743a35', beam: '#4a3930', shadow: '#303638', ink: '#2d4043',
  teal: '#405d5b', jade: '#53726e', tile: '#536766', patina: '#6c8380', blueGray: '#68909c',
  gold: '#c49658', paper: '#ffd397', amber: '#ffba64', milk: '#eadcc5',
  fern: '#476649', sage: '#728665', reed: '#a3a16d', pearl: '#ffffed',
  pine: '#25523f', cranberry: '#a13242', snow: '#edf4f8', frost: '#adccd7', brass: '#d5a653', gingerbread: '#b07849',
};

const BRICK_FORMS = ['brick', 'round', 'flower'];
const brickFields = ['id', 'x', 'y', 'z', 'w', 'd', 'h', 'tone', 'studs', 'form', 'turn', 'assembly', 'treeId', 'slot'];

export function sameBrick(a, b, includeState = true) {
  return a === b || Boolean(a && b && brickFields.every(field => a[field] === b[field]) &&
    (!includeState || Boolean(a.active) === Boolean(b.active)));
}

function matchesSize(brick, [w, d, h]) {
  const turned = brick.turn % 2 === 1;
  return brick.h === h && brick.w === (turned ? d : w) && brick.d === (turned ? w : d);
}

export function resizeSavedDecoration(brick) {
  const object = PLACEABLE_OBJECTS[brick?.form];
  if (!object?.previousSize || !matchesSize(brick, object.previousSize) || !insideBounds(brick)) return brick;
  const [width, depth, h] = object.size;
  const [w, d] = brick.turn % 2 === 1 ? [depth, width] : [width, depth];
  return { ...brick, x: brick.x + Math.floor((brick.w - w) / 2), z: brick.z + Math.floor((brick.d - d) / 2), w, d, h };
}

export function validBrick(brick) {
  if (!(brick && Object.hasOwn(TONES, brick.tone) &&
    Number.isInteger(brick.turn) && brick.turn >= 0 && brick.turn <= 3)) return false;
  if (brick.treeId !== undefined) {
    return Number.isSafeInteger(brick.treeId) && brick.treeId > 0 && brick.treeId !== brick.id &&
      brick.assembly === undefined && treeSlots(brick.form).includes(brick.slot) &&
      (brick.active === undefined || brick.form === 'fairyLights' && typeof brick.active === 'boolean');
  }
  if (!insideBounds(brick) || typeof brick.studs !== 'boolean') return false;
  if (brick.assembly !== undefined && !(Number.isSafeInteger(brick.assembly) && brick.assembly > 0 &&
    Number.isSafeInteger(brick.id) && brick.id >= brick.assembly && brick.id - brick.assembly < MAX_PATCH)) return false;
  if (!Object.hasOwn(PLACEABLE_OBJECTS, brick.form)) {
    return BRICK_FORMS.includes(brick.form) && Math.max(brick.w, brick.d, brick.h) <= 8 && brick.active === undefined;
  }
  const { size, interaction } = PLACEABLE_OBJECTS[brick.form];
  const [width, depth] = brick.turn % 2 ? [brick.d, brick.w] : [brick.w, brick.d];
  const fitted = depth === 1 && openingSizeAllowed(brick.form, width, brick.h);
  return !brick.studs && (fitted || matchesSize(brick, size) || sizeOptions(brick.form).some(option => matchesSize(brick, option.size))) &&
    (brick.active === undefined || Boolean(interaction) && typeof brick.active === 'boolean');
}

const openDoor = brick => brick.form === 'door' && brick.active;

export function validSnapshot(value) {
  return Boolean(value && [1, 2, WORLD_SAVE_VERSION].includes(value.version) &&
    Array.isArray(value.removed) && value.removed.length <= MAX_EDITS &&
    Array.isArray(value.added) && value.added.length <= MAX_EDITS &&
    (value.version === 1 || (Array.isArray(value.changed) && value.changed.length <= MAX_EDITS)));
}

function legacyBrick(change) {
  const part = QUICK_PARTS[change?.slot];
  if (!part || typeof change.rotated !== 'boolean' || change.kind !== 'place') return null;
  return { id: change.id, x: change.x, y: change.y, z: change.z,
    w: change.rotated ? part.d : part.w, d: change.rotated ? part.w : part.d, h: part.h,
    tone: part.tone, studs: true, form: 'brick', turn: Number(change.rotated) };
}

function column(x, z) {
  return (z - BOUNDS.minZ) * (BOUNDS.maxX - BOUNDS.minX) + x - BOUNDS.minX;
}

function insideBounds({ x, y, z, w, d, h }) {
  return [x, y, z, w, d, h].every(Number.isInteger) && w > 0 && d > 0 && h > 0 &&
    x >= BOUNDS.minX && x + w <= BOUNDS.maxX && z >= BOUNDS.minZ && z + d <= BOUNDS.maxZ &&
    y >= BOUNDS.minY && y + h <= BOUNDS.maxY;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

const epsilon = 0.0001;

export class BrickWorld {
  constructor() {
    this.bricks = new Map();
    this.columns = new Map();
    this.starter = new Map();
    this.removed = new Set();
    this.added = new Map();
    this.changed = new Map();
    this.legacyAssemblies = new Map();
    this.treeDecorations = new Map();
    this.nextId = 1;
    this.originalNextId = 1;
    this.sceneryId = null;
    this.onChange = null;
  }

  *at(x, z) {
    if (x < BOUNDS.minX || x >= BOUNDS.maxX || z < BOUNDS.minZ || z >= BOUNDS.maxZ) return;
    for (const id of this.columns.get(column(x, z)) ?? []) yield this.bricks.get(id);
  }

  *query(x0, x1, z0, z1) {
    const seen = new Set();
    for (let z = Math.max(BOUNDS.minZ, z0); z < Math.min(BOUNDS.maxZ, z1); z++) {
      for (let x = Math.max(BOUNDS.minX, x0); x < Math.min(BOUNDS.maxX, x1); x++) {
        const ids = this.columns.get(column(x, z));
        if (!ids) continue;
        for (const id of ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          yield this.bricks.get(id);
        }
      }
    }
  }

  collides(box) {
    for (const brick of this.query(Math.floor(box.x), Math.ceil(box.x + box.w), Math.floor(box.z), Math.ceil(box.z + box.d))) {
      if (!openDoor(brick) && overlaps(brick, box)) return true;
    }
    return false;
  }

  playerBox(x, y, z, radius, height) {
    return { x: (x - radius) / STUD, z: (z - radius) / STUD, y: (y + epsilon) / PLATE,
      w: radius * 2 / STUD, d: radius * 2 / STUD, h: (height - epsilon * 2) / PLATE };
  }

  groundBetween(x, z, radius, low, high) {
    const bounds = this.playerBox(x, 0, z, radius, 1);
    let ground = -Infinity;
    for (const brick of this.query(Math.floor(bounds.x), Math.ceil(bounds.x + bounds.w), Math.floor(bounds.z), Math.ceil(bounds.z + bounds.d))) {
      if (openDoor(brick)) continue;
      const top = (brick.y + brick.h) * PLATE;
      if (top < low - epsilon || top > high + epsilon || top <= ground) continue;
      if (brick.x >= bounds.x + bounds.w || brick.x + brick.w <= bounds.x ||
          brick.z >= bounds.z + bounds.d || brick.z + brick.d <= bounds.z) continue;
      ground = top;
    }
    return ground;
  }

  put(brick) {
    this.bricks.set(brick.id, brick);
    if (brick.treeId !== undefined) {
      if (!this.treeDecorations.has(brick.treeId)) this.treeDecorations.set(brick.treeId, new Map());
      this.treeDecorations.get(brick.treeId).set(treeSlotKey(brick.form, brick.slot), brick);
      return;
    }
    for (let z = brick.z; z < brick.z + brick.d; z++) {
      for (let x = brick.x; x < brick.x + brick.w; x++) {
        const key = column(x, z);
        if (!this.columns.has(key)) this.columns.set(key, new Set());
        this.columns.get(key).add(brick.id);
      }
    }
  }

  take(brick) {
    this.bricks.delete(brick.id);
    if (brick.treeId !== undefined) {
      const decorations = this.treeDecorations.get(brick.treeId);
      decorations.delete(treeSlotKey(brick.form, brick.slot));
      if (!decorations.size) this.treeDecorations.delete(brick.treeId);
      return;
    }
    for (let z = brick.z; z < brick.z + brick.d; z++) {
      for (let x = brick.x; x < brick.x + brick.w; x++) {
        const key = column(x, z);
        const ids = this.columns.get(key);
        ids.delete(brick.id);
        if (ids.size === 0) this.columns.delete(key);
      }
    }
  }

  seed(x, y, z, w, h, d, tone, studs = true, form = 'brick', turn = 0) {
    const brick = { x, y, z, w, h, d, tone, studs, form, turn, id: this.sceneryId ?? this.nextId };
    if (!insideBounds(brick) || this.collides(brick)) return false;
    if (this.sceneryId === null) this.originalNextId = ++this.nextId;
    else this.sceneryId--;
    this.starter.set(brick.id, brick);
    this.put(brick);
    return true;
  }

  startExpansion() {
    this.sceneryId = -1;
  }

  canPlace(bricks, players = []) {
    return this.added.size + bricks.length <= MAX_EDITS && bricks.every(canBuildAt) &&
      bricks.every(brick => !isChristmasTree(brick) || this.hasBase(brick)) && this.hasSpace(bricks, new Set(), players);
  }

  hasBase(brick, ignoredIds) {
    for (const support of this.at(brick.x + Math.floor(brick.w / 2), brick.z + Math.floor(brick.d / 2))) {
      if (support.id !== brick.id && !ignoredIds?.has(support.id) && support.y + support.h === brick.y &&
        (support.form === 'brick' || support.form === 'round' || support.form === 'holidayRug' ||
          brick.form === 'indoorTree' && support.form === 'table')) return true;
    }
    return false;
  }

  assemblyMembers(brick) {
    if (brick.assembly === undefined) return [brick];
    const members = [];
    for (let id = brick.assembly; id < brick.assembly + MAX_PATCH; id++) {
      const member = this.added.get(id);
      if (member?.assembly === brick.assembly) members.push(member);
    }
    return members;
  }

  decorationsOf(id) {
    return this.treeDecorations.get(id)?.values() ?? [];
  }

  decorationAt(treeId, form, slot) {
    return this.treeDecorations.get(treeId)?.get(treeSlotKey(form, slot));
  }

  areaOf(brick) {
    return brick.treeId === undefined ? brick : decorationPose(this.bricks.get(brick.treeId), brick);
  }

  canMove(bricks, players) {
    const group = Array.isArray(bricks) ? bricks : [bricks];
    const replacing = new Set(group.map(brick => brick.id));
    return group.every(brick => this.added.has(brick.id) && canBuildAt(brick) &&
      (!isChristmasTree(brick) || this.hasBase(brick, replacing))) && this.hasSpace(group, replacing, players);
  }

  hasSpace(bricks, replacing, players) {
    const incoming = [];
    for (const brick of bricks) {
      if (!validBrick(brick)) return false;
      if (brick.treeId !== undefined) continue;
      if (incoming.some(other => overlaps(brick, other))) return false;
      incoming.push(brick);
      const current = this.bricks.get(brick.id);
      const moved = !current || ['x', 'y', 'z', 'w', 'h', 'd'].some(key => current[key] !== brick[key]);
      const closesDoor = current && openDoor(current) && !openDoor(brick);
      if ((moved || closesDoor) && !openDoor(brick) && players.some(player => overlaps(brick, player))) return false;
      for (const other of this.query(brick.x, brick.x + brick.w, brick.z, brick.z + brick.d)) {
        if (!replacing.has(other.id) && overlaps(brick, other)) return false;
      }
    }
    return true;
  }

  patch(edits, players = [], limit = MAX_PATCH) {
    if (!Array.isArray(edits) || edits.length === 0 || edits.length > limit) return false;
    const changing = new Map();
    const incoming = [];
    let additions = this.added.size;
    let removals = this.removed.size;
    let changes = this.changed.size;
    for (const edit of edits) {
      if (!edit || !Number.isSafeInteger(edit.id) || changing.has(edit.id)) return false;
      const { id, brick } = edit;
      const starter = this.starter.get(id);
      const current = this.bricks.get(id);
      if (!starter && (id < this.originalNextId || id > 1e9)) return false;
      if (brick === null && !current) return false;
      if (brick !== null && (!validBrick(brick) || brick.id !== id ||
        (brick.assembly !== undefined && (starter || brick.assembly < this.originalNextId)) ||
        (brick.treeId !== undefined && (starter || brick.treeId < this.originalNextId)))) return false;
      changing.set(id, brick);
      if (brick) incoming.push(brick);
      if (starter) {
        removals += Number(brick === null) - Number(!current);
        changes += Number(Boolean(brick && !sameBrick(brick, starter))) - Number(this.changed.has(id));
      } else additions += Number(Boolean(brick)) - Number(Boolean(current));
    }
    if (Math.max(additions, removals, changes) > MAX_EDITS || !this.hasSpace(incoming, changing, players) ||
      !this.validTreeEdits(changing)) return false;

    const previous = edits.map(({ id }) => ({ id, brick: this.bricks.get(id) ?? null }));
    for (const { brick } of previous) if (brick) this.take(brick);
    for (const { id, brick } of edits) this.storeBrick(id, brick);
    this.onChange?.(edits, previous);
    return true;
  }

  validTreeEdits(changing) {
    const occupiedSlots = new Set();
    for (const [id, brick] of changing) {
      if (!isChristmasTree(brick)) {
        for (const child of this.decorationsOf(id)) {
          if (!changing.has(child.id) || changing.get(child.id)?.treeId === id) return false;
        }
      }
      if (brick?.treeId === undefined) continue;
      const { treeId, slot, form } = brick;
      const tree = changing.has(treeId) ? changing.get(treeId) : this.bricks.get(treeId);
      const key = `${treeId}/${treeSlotKey(form, slot)}`;
      const prior = this.decorationAt(treeId, form, slot);
      if (!isChristmasTree(tree) || occupiedSlots.has(key) || prior && !changing.has(prior.id)) return false;
      occupiedSlots.add(key);
    }
    return true;
  }

  storeBrick(id, brick) {
    const original = this.starter.get(id);
    if (original) {
      if (brick === null) this.removed.add(id);
      else this.removed.delete(id);
      if (brick && !sameBrick(brick, original)) this.changed.set(id, brick);
      else this.changed.delete(id);
    } else if (brick) {
      this.added.set(id, brick);
      this.nextId = Math.max(this.nextId, id + 1);
    } else this.added.delete(id);
    if (brick) this.put(brick);
  }

  snapshot() {
    return { version: WORLD_SAVE_VERSION, removed: Array.from(this.removed), nextId: this.nextId,
      added: Array.from(this.added.values()), changed: Array.from(this.changed.values()) };
  }

  restore(snapshot) {
    const onChange = this.onChange;
    this.onChange = null;
    for (const brick of this.added.values()) this.take(brick);
    for (const brick of this.changed.values()) {
      this.take(brick);
      this.put(this.starter.get(brick.id));
    }
    for (const id of this.removed) this.put(this.starter.get(id));
    this.added.clear();
    this.changed.clear();
    this.removed.clear();
    this.legacyAssemblies.clear();
    this.nextId = this.originalNextId;
    if (validSnapshot(snapshot)) {
      for (const id of snapshot.removed) {
        const brick = this.bricks.get(id);
        if (!brick || !this.starter.has(id)) continue;
        this.take(brick);
        this.removed.add(id);
      }
      if (snapshot.version !== 1 && snapshot.changed.length) {
        const changed = snapshot.changed.filter(brick => validBrick(brick) && this.starter.has(brick.id));
        if (changed.length) this.patch(changed.map(brick => ({ id: brick.id, brick })), [], MAX_EDITS);
      }
      const decorations = [];
      for (const saved of snapshot.added) {
        let brick = saved;
        if (snapshot.version === 1) brick = legacyBrick(saved);
        else if (snapshot.version === 2) brick = resizeSavedDecoration(saved);
        if (validBrick(brick) && brick.id >= this.originalNextId && !this.bricks.has(brick.id)) {
          if (brick.treeId !== undefined) {
            decorations.push({ id: brick.id, brick });
            continue;
          }
          const edits = [{ id: brick.id, brick }];
          if (snapshot.version === 1) {
            // Give existing builds priority where the dock or kitchen overlaps an older save.
            for (const existing of this.query(brick.x, brick.x + brick.w, brick.z, brick.z + brick.d)) {
              if (existing.id < 0 && overlaps(existing, brick)) edits.push({ id: existing.id, brick: null });
            }
          }
          this.patch(edits, [], MAX_EDITS);
        }
      }
      for (const edit of decorations) if (!this.bricks.has(edit.id)) this.patch([edit]);
      if (snapshot.version === 2) {
        this.legacyAssemblies = recoverAssemblies(this.added, snapshot.undo, this.originalNextId);
        for (const [id, assembly] of this.legacyAssemblies) {
          const brick = this.added.get(id);
          if (brick) this.storeBrick(id, { ...brick, assembly });
        }
      }
      if (Number.isSafeInteger(snapshot.nextId) && snapshot.nextId <= 1e9) this.nextId = Math.max(this.nextId, snapshot.nextId);
    }
    this.onChange = onChange;
    this.onChange?.(null, null);
  }

  pick(origin, direction, distance = REACH, throughDoors = false, ignored = null, pickTree = null) {
    const ignoredIds = typeof ignored === 'number' ? new Set([ignored]) : ignored;
    let closest = distance;
    let target = null;
    for (const brick of rayBricks(this, origin, direction, distance, pickTree ? STUD : 0)) {
      if (ignoredIds?.has(brick.id) || throughDoors && openDoor(brick)) continue;
      if (pickTree && isChristmasTree(brick)) {
        const hit = pickTree(brick, closest, ignoredIds);
        if (hit) {
          closest = hit.distance;
          target = hit;
        }
        continue;
      }
      const hit = hitBox(origin, direction, brick, closest);
      if (!hit) continue;
      closest = hit.distance;
      target = { brick, axis: hit.axis, sign: hit.sign, distance: closest,
        point: { x: origin.x + direction.x * closest, y: origin.y + direction.y * closest, z: origin.z + direction.z * closest } };
    }
    return target;
  }

  cameraClearance(origin, direction, distance, radius) {
    let closest = distance;
    for (const brick of rayBricks(this, origin, direction, distance, radius)) {
      if (openDoor(brick)) continue;
      const hit = hitBox(origin, direction, brick, closest, radius);
      if (hit) closest = hit.distance;
    }
    return closest;
  }
}

function rayBricks(world, origin, direction, distance, padding) {
  const endX = origin.x + direction.x * distance;
  const endZ = origin.z + direction.z * distance;
  return world.query(Math.floor((Math.min(origin.x, endX) - padding) / STUD), Math.floor((Math.max(origin.x, endX) + padding) / STUD) + 1,
    Math.floor((Math.min(origin.z, endZ) - padding) / STUD), Math.floor((Math.max(origin.z, endZ) + padding) / STUD) + 1);
}

const rayAxes = [['x', 'w', STUD], ['y', 'h', PLATE], ['z', 'd', STUD]];

function hitBox(origin, direction, brick, maxDistance, padding = 0) {
  let near = 0;
  let far = maxDistance;
  let axis;
  let sign;
  for (const [name, size, scale] of rayAxes) {
    const start = brick[name] * scale - padding;
    const end = (brick[name] + brick[size]) * scale + padding;
    const ray = direction[name];
    if (Math.abs(ray) < epsilon) {
      if (origin[name] < start || origin[name] > end) return null;
      continue;
    }
    const first = ((ray > 0 ? start : end) - origin[name]) / ray;
    const last = ((ray > 0 ? end : start) - origin[name]) / ray;
    if (first > near) {
      near = first;
      axis = name;
      sign = ray > 0 ? -1 : 1;
    }
    far = Math.min(last, far);
    if (near > far) return null;
  }
  return axis ? { distance: near, axis, sign } : null;
}

export function adjacentBrick(hit, shape) {
  const { axis, sign, point, brick } = hit;
  const cell = {
    x: Math.floor(point.x / STUD + epsilon) - Math.floor((shape.w - 1) / 2),
    z: Math.floor(point.z / STUD + epsilon) - Math.floor((shape.d - 1) / 2),
    y: Math.floor(point.y / PLATE + epsilon) - Math.floor((shape.h - 1) / 2),
  };
  const size = { x: 'w', y: 'h', z: 'd' }[axis];
  cell[axis] = sign > 0 ? brick[axis] + brick[size] : brick[axis] - shape[size];
  return { ...shape, ...cell };
}
