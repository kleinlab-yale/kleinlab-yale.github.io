import { PLACEABLE_OBJECTS, QUICK_PARTS } from './parts.js';
import { canBuildAt } from './islands.js';

export const STUD = 0.55;
export const PLATE = 0.17;
export const BOUNDS = { minX: -59, maxX: 60, minZ: -53, maxZ: 403, minY: -9, maxY: 105 };
export const REACH = 13;
export const MAX_EDITS = 6000;
export const WORLD_SAVE_VERSION = 2;
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
};

const BRICK_FORMS = ['brick', 'round', 'flower'];
const brickFields = ['id', 'x', 'y', 'z', 'w', 'd', 'h', 'tone', 'studs', 'form', 'turn'];

export function sameBrick(a, b, includeState = true) {
  return a === b || Boolean(a && b && brickFields.every(field => a[field] === b[field]) &&
    (!includeState || Boolean(a.active) === Boolean(b.active)));
}

export function validBrick(brick) {
  if (!(brick && insideBounds(brick) && Object.hasOwn(TONES, brick.tone) && typeof brick.studs === 'boolean' &&
    Number.isInteger(brick.turn) && brick.turn >= 0 && brick.turn <= 3)) return false;
  if (!Object.hasOwn(PLACEABLE_OBJECTS, brick.form)) {
    return BRICK_FORMS.includes(brick.form) && Math.max(brick.w, brick.d, brick.h) <= 8 && brick.active === undefined;
  }
  const { size: [w, d, h], interaction } = PLACEABLE_OBJECTS[brick.form];
  const turned = brick.turn % 2 === 1;
  return !brick.studs && brick.h === h && brick.w === (turned ? d : w) && brick.d === (turned ? w : d) &&
    (brick.active === undefined || Boolean(interaction) && typeof brick.active === 'boolean');
}

const openDoor = brick => brick.form === 'door' && brick.active;

export function validSnapshot(value) {
  return Boolean(value && (value.version === WORLD_SAVE_VERSION || value.version === 1) &&
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
    return this.added.size + bricks.length <= MAX_EDITS && bricks.every(canBuildAt) && this.hasSpace(bricks, new Set(), players);
  }

  hasSpace(bricks, replacing, players) {
    const incoming = [];
    for (const brick of bricks) {
      if (!validBrick(brick) || incoming.some(other => overlaps(brick, other))) return false;
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
    const changing = new Set();
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
      if (brick !== null && (!validBrick(brick) || brick.id !== id)) return false;
      changing.add(id);
      if (brick) incoming.push(brick);
      if (starter) {
        removals += Number(brick === null) - Number(!current);
        changes += Number(Boolean(brick && !sameBrick(brick, starter))) - Number(this.changed.has(id));
      } else additions += Number(Boolean(brick)) - Number(Boolean(current));
    }
    if (Math.max(additions, removals, changes) > MAX_EDITS || !this.hasSpace(incoming, changing, players)) return false;

    const previous = edits.map(({ id }) => ({ id, brick: this.bricks.get(id) ?? null }));
    for (const { brick } of previous) if (brick) this.take(brick);
    for (const { id, brick } of edits) this.storeBrick(id, brick);
    this.onChange?.(edits, previous);
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
    this.nextId = this.originalNextId;
    if (validSnapshot(snapshot)) {
      for (const id of snapshot.removed) {
        const brick = this.bricks.get(id);
        if (!brick || !this.starter.has(id)) continue;
        this.take(brick);
        this.removed.add(id);
      }
      if (snapshot.version === WORLD_SAVE_VERSION && snapshot.changed.length) {
        const changed = snapshot.changed.filter(brick => validBrick(brick) && this.starter.has(brick.id));
        if (changed.length) this.patch(changed.map(brick => ({ id: brick.id, brick })), [], MAX_EDITS);
      }
      for (const saved of snapshot.added) {
        const brick = snapshot.version === 1 ? legacyBrick(saved) : saved;
        if (validBrick(brick) && brick.id >= this.originalNextId && !this.bricks.has(brick.id)) {
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
      if (Number.isSafeInteger(snapshot.nextId) && snapshot.nextId <= 1e9) this.nextId = Math.max(this.nextId, snapshot.nextId);
    }
    this.onChange = onChange;
    this.onChange?.(null, null);
  }

  pick(origin, direction, distance = REACH, throughDoors = false) {
    const endX = origin.x + direction.x * distance;
    const endZ = origin.z + direction.z * distance;
    const results = this.query(Math.floor(Math.min(origin.x, endX) / STUD), Math.floor(Math.max(origin.x, endX) / STUD) + 1,
      Math.floor(Math.min(origin.z, endZ) / STUD), Math.floor(Math.max(origin.z, endZ) / STUD) + 1);
    let closest = distance;
    let target = null;
    for (const brick of results) {
      if (throughDoors && openDoor(brick)) continue;
      const hit = hitBox(origin, direction, brick, closest);
      if (!hit) continue;
      closest = hit.distance;
      target = { brick, axis: hit.axis, sign: hit.sign, distance: closest,
        point: { x: origin.x + direction.x * closest, y: origin.y + direction.y * closest, z: origin.z + direction.z * closest } };
    }
    return target;
  }
}

function hitBox(origin, direction, brick, maxDistance) {
  let near = 0;
  let far = maxDistance;
  let axis;
  let sign;
  for (const [name, size, scale] of [['x', 'w', STUD], ['y', 'h', PLATE], ['z', 'd', STUD]]) {
    const start = brick[name] * scale;
    const end = (brick[name] + brick[size]) * scale;
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
