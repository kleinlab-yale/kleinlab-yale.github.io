export const STUD = 0.55;
export const PLATE = 0.17;
export const BOUNDS = { minX: -59, maxX: 60, minZ: -53, maxZ: 64, minY: -9, maxY: 105 };
export const REACH = 13;
export const MAX_EDITS = 6000;

export const TONES = {
  turf: '#556941', olive: '#67774b', meadow: '#758256', moss: '#3e593d',
  lichen: '#9a9659', soil: '#575044', claySoil: '#6d5c4a', sand: '#9b8569',
  shale: '#595c5d', stone: '#858079', gravel: '#9f9688', chalk: '#c3b5a0',
  petal: '#eca2b0', rose: '#d37990', blush: '#f7bfcb', ivory: '#f9dbd7',
  wine: '#a65470', mulberry: '#8a485c', salmon: '#d99397', cream: '#e8cfab',
  bark: '#523932', darkBark: '#382c2a', warmBark: '#704c3b', cedar: '#a66d45',
  oak: '#ba885e', redwood: '#8c5140', lacquer: '#a44137', vermilion: '#bb533e',
  redTrim: '#743a35', beam: '#4a3930', shadow: '#303638', ink: '#2d4043',
  teal: '#405d5b', jade: '#53726e', tile: '#536766', patina: '#6c8380',
  gold: '#c49658', paper: '#ffd397', amber: '#ffba64', milk: '#eadcc5',
  fern: '#476649', sage: '#728665', reed: '#a3a16d', pearl: '#ffffed',
};

export const PIECES = [
  { name: 'Terracotta brick', w: 2, d: 2, h: 3, tone: 'vermilion' },
  { name: 'Cedar beam', w: 4, d: 2, h: 3, tone: 'cedar' },
  { name: 'Ivory brick', w: 2, d: 1, h: 3, tone: 'milk' },
  { name: 'Slate roof tile', w: 3, d: 2, h: 1, tone: 'teal' },
  { name: 'Moss plate', w: 3, d: 3, h: 1, tone: 'moss' },
  { name: 'Blossom brick', w: 2, d: 1, h: 2, tone: 'petal' },
  { name: 'Amber lantern', w: 1, d: 1, h: 3, tone: 'amber' },
];

export function shapeFor(slot, rotated) {
  const part = PIECES[slot];
  if (!part) return null;
  const { w, d, h, tone } = part;
  return { w: rotated ? d : w, d: rotated ? w : d, h, tone, studs: true };
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
    this.nextId = 1;
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
      if (overlaps(brick, box)) return true;
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

  seed(x, y, z, w, h, d, tone, studs = true) {
    const brick = { x, y, z, w, h, d, tone, studs, id: this.nextId };
    if (!insideBounds(brick) || this.collides(brick)) return false;
    this.nextId++;
    this.starter.set(brick.id, brick);
    this.put(brick);
    return true;
  }

  canPlace(brick, players = []) {
    return insideBounds(brick) && this.added.size < MAX_EDITS && !this.collides(brick) &&
      !players.some(player => overlaps(brick, player));
  }

  apply(request, players = []) {
    if (!request || typeof request !== 'object') return null;
    if (request.kind === 'remove') {
      const brick = this.bricks.get(request.id);
      if (!brick || (this.starter.has(brick.id) && this.removed.size >= MAX_EDITS)) return null;
      const change = { kind: 'remove', id: brick.id };
      return this.accept(change) ? change : null;
    }
    if (request.kind !== 'place' || !Number.isInteger(request.slot) || typeof request.rotated !== 'boolean') return null;
    const shape = shapeFor(request.slot, request.rotated);
    if (!shape) return null;
    const brick = { ...shape, x: request.x, y: request.y, z: request.z };
    if (!this.canPlace(brick, players)) return null;
    const change = { kind: 'place', id: this.nextId++, x: brick.x, y: brick.y, z: brick.z,
      slot: request.slot, rotated: request.rotated };
    return this.accept(change) ? change : null;
  }

  accept(change) {
    if (!change || !Number.isSafeInteger(change.id)) return false;
    if (change.kind === 'remove') {
      const brick = this.bricks.get(change.id);
      if (!brick) return false;
      if (this.starter.has(brick.id)) {
        if (this.removed.size >= MAX_EDITS) return false;
        this.removed.add(brick.id);
      } else {
        this.added.delete(brick.id);
      }
      this.take(brick);
      this.onChange?.(change, brick);
      return true;
    }
    if (change.kind !== 'place' || change.id > 1e9 || !Number.isInteger(change.slot) || typeof change.rotated !== 'boolean' ||
        change.id <= this.starter.size || this.bricks.has(change.id)) return false;
    const shape = shapeFor(change.slot, change.rotated);
    if (!shape) return false;
    const brick = { ...shape, id: change.id, x: change.x, y: change.y, z: change.z };
    if (!this.canPlace(brick)) return false;
    this.nextId = Math.max(this.nextId, change.id + 1);
    this.put(brick);
    this.added.set(brick.id, { kind: 'place', id: brick.id, x: brick.x, y: brick.y, z: brick.z,
      slot: change.slot, rotated: change.rotated });
    this.onChange?.(change, brick);
    return true;
  }

  snapshot() {
    return { version: 1, removed: Array.from(this.removed), added: Array.from(this.added.values()) };
  }

  restore(snapshot) {
    const onChange = this.onChange;
    this.onChange = null;
    for (const id of this.added.keys()) this.take(this.bricks.get(id));
    for (const id of this.removed) this.put(this.starter.get(id));
    this.added.clear();
    this.removed.clear();
    this.nextId = this.starter.size + 1;
    if (snapshot?.version === 1 && Array.isArray(snapshot.removed) && Array.isArray(snapshot.added)) {
      for (const id of snapshot.removed.slice(0, MAX_EDITS)) {
        if (this.starter.has(id)) this.accept({ kind: 'remove', id });
      }
      for (const change of snapshot.added.slice(0, MAX_EDITS)) {
        if (change?.kind === 'place') this.accept(change);
      }
    }
    this.onChange = onChange;
    this.onChange?.(null, null);
  }

  pick(origin, direction, distance = REACH) {
    const endX = origin.x + direction.x * distance;
    const endZ = origin.z + direction.z * distance;
    const results = this.query(Math.floor(Math.min(origin.x, endX) / STUD), Math.floor(Math.max(origin.x, endX) / STUD) + 1,
      Math.floor(Math.min(origin.z, endZ) / STUD), Math.floor(Math.max(origin.z, endZ) / STUD) + 1);
    let closest = distance;
    let target = null;
    for (const brick of results) {
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
