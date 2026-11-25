import { BrickWorld, PLATE, STUD } from './bricks.js';
import { DOCK, ISLANDS, SEA_LEVEL, islandAt } from './voyage.js';

export const WATER_LEVEL = SEA_LEVEL;
export const SPAWN = { x: 12.5 * STUD, y: 0, z: 31.5 * STUD, yaw: -0.16, pitch: -0.21 };

export function noise(x, y = 0, z = 0) {
  let n = Math.imul(x + 157, 374761393) ^ Math.imul(y + 29, 668265263) ^ Math.imul(z + 61, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const pick = (values, value) => values[Math.floor(value * values.length)];
const riverX = z => -6 + Math.sin((z + 12) * 0.085) * 3.1 + Math.cos(z * 0.145) * 1.4;
const riverWidth = z => 7.8 + Math.sin(z * 0.092 + 1) * 1.8;
const paths = [
  [[12, 54], [12, 11], 2.3], [[8, 10.5], [24, 10.5], 2.5], [[12, 35], [33, 28], 1.6],
  [[26, 11], [25, 29], 2.2], [[24, 14], [24, -4], 2.1], [[28, 16], [36, -9], 1.8],
  [[36, -9], [37, -22], 2.0], [[-23, 9], [-29, -1], 2.4], [[-37, -14], [-24, 10], 1.7],
  [[-36, 27], [-24, 10], 1.9], [[-25, 10.5], [-16, 10.5], 2.4], [[-28, 15], [-16, 35], 1.2],
];

function pathAt(x, z) {
  for (const [[ax, az], [bx, bz], width] of paths) {
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) < width) return true;
  }
  return false;
}

function terrainAt(x, z) {
  const edge = (Math.abs((x + 1) / 55) ** 4 + Math.abs((z - 5) / 52) ** 4);
  const bank = Math.abs(x - riverX(z)) - riverWidth(z);
  if (edge > 1 + Math.sin(x * 0.31 + z * 0.25) * 0.055 || bank < 0) return null;
  if (bank < 2.4 || edge > 0.91) return { y: -1, family: 'bank' };
  if (pathAt(x + 0.5, z + 0.5)) return { y: 0, family: 'path' };
  const hill = Math.max(0, -z - 35) * Math.max(0, Math.abs(x) - 18) / 120;
  return { y: Math.min(5, Math.floor(hill)), family: 'grass' };
}

function seedTerrain(world) {
  const cells = new Map();
  for (let z = -48; z < 59; z++) {
    for (let x = -56; x < 56; x++) {
      const land = terrainAt(x, z);
      if (land) cells.set(`${x},${z}`, land);
    }
  }
  const colors = { grass: ['turf', 'olive', 'turf', 'moss', 'meadow', 'olive', 'olive'],
    path: ['stone', 'gravel', 'stone', 'gravel', 'gravel', 'chalk'], bank: ['sand', 'claySoil', 'sand', 'soil'] };
  const sizes = [[4, 4], [4, 2], [2, 3], [3, 2], [2, 2], [2, 1], [1, 2], [1, 1]];
  for (const [key, land] of cells) {
    const [x, z] = key.split(',').map(Number);
    const value = noise(x, 0, z);
    for (const [width, depth] of sizes) {
      if (land.family === 'path' && (width > 3 || depth > 2)) continue;
      if (land.family === 'grass' && width === 4 && depth === 4 && value < 0.46) continue;
      let available = true;
      for (let dz = 0; dz < depth && available; dz++) {
        for (let dx = 0; dx < width; dx++) {
          const cell = cells.get(`${x + dx},${z + dz}`);
          if (cell?.y !== land.y || cell.family !== land.family) {
            available = false;
            break;
          }
        }
      }
      if (!available) continue;
      world.seed(x, -8, z, width, land.y + 6, depth, value > 0.55 ? 'soil' : 'claySoil', false);
      world.seed(x, land.y - 2, z, width, 2, depth, pick(colors[land.family], value), true);
      for (let dz = 0; dz < depth; dz++) {
        for (let dx = 0; dx < width; dx++) cells.delete(`${x + dx},${z + dz}`);
      }
      break;
    }
  }
}

function builder(world) {
  const set = world.seed.bind(world);

  function row(x, y, z, length, h, tone, axis = 'x', studs = true, max = 4) {
    for (let i = 0; i < length; i += max) {
      const segment = Math.min(max, length - i);
      set(x + (axis === 'x' ? i : 0), y, z + (axis === 'z' ? i : 0),
        axis === 'x' ? segment : 1, h, axis === 'z' ? segment : 1, tone, studs);
    }
  }

  function slab(x, y, z, w, h, d, tones, studs = true, length = 4) {
    for (let dz = 0; dz < d; dz++) {
      for (let dx = 0; dx < w; dx += length) {
        set(x + dx, y, z + dz, Math.min(length, w - dx), h, 1,
          typeof tones === 'string' ? tones : pick(tones, noise(x + dx, y, z + dz)), studs);
      }
    }
  }

  function post(x, y, z, w, h, d, shades) {
    for (let dy = 0; dy < h; dy += 3) {
      set(x, y + dy, z, w, Math.min(3, h - dy), d,
        typeof shades === 'string' ? shades : pick(shades, noise(x + w, y + dy, z + d)));
    }
  }

  function lantern(x, y, z, cap = 'beam', base = 'redTrim') {
    set(x, y, z, 1, 1, 1, base, false);
    set(x, y + 1, z, 1, 2, 1, 'paper', false);
    set(x, y + 3, z, 1, 1, 1, cap, true);
  }

  function gardenLamp(x, z, y = 0) {
    set(x - 1, y, z - 1, 3, 1, 3, 'shale');
    set(x, y + 1, z, 1, 3, 1, 'stone');
    set(x - 1, y + 4, z - 1, 3, 1, 3, 'stone');
    lantern(x, y + 5, z, 'teal', 'shale');
    set(x - 1, y + 8, z - 1, 3, 1, 3, 'ink');
    set(x, y + 9, z, 1, 1, 1, 'jade');
  }

  function roof(cx, cz, w, d, base, colors = ['ink', 'teal', 'tile', 'teal', 'jade']) {
    const half = Math.floor(d / 2);
    const ridge = depth => Math.round(depth * 0.36 + depth * depth * 0.12);
    for (let dz = -half; dz <= half; dz++) {
      const depth = half - Math.abs(dz);
      const inset = Math.floor(depth * 0.61);
      const left = cx - Math.floor(w / 2) + inset;
      const right = cx + Math.ceil(w / 2) - inset;
      const top = base + ridge(depth);
      const drop = depth === 0 ? 2 : Math.max(2, ridge(depth) - ridge(depth - 1) + 1);
      for (let x = left; x < right; x++) {
        const outer = Math.min(x - left, right - x - 1);
        const curl = outer === 0 && depth < 3 ? 1 : 0;
        const tone = (depth === 0 || outer === 0) ? 'ink' : pick(colors, noise(x, base, dz + cz));
        set(x, top - drop, cz + dz, 1, drop + curl, 1, tone);
      }
    }
    const capY = base + ridge(half);
    const capX = cx - Math.floor(w / 2) + Math.floor(half * 0.61) - 1;
    const capLength = w - 2 * Math.floor(half * 0.61) + 2;
    row(capX, capY, cz, capLength, 2, 'shadow', 'x', true, 3);
    for (const x of [capX, capX + capLength - 1]) {
      set(x, capY + 2, cz, 1, 1, 1, 'gold');
      set(x + (x === capX ? -1 : 1), capY + 1, cz, 1, 1, 1, 'teal');
    }
    return capY + 2;
  }

  function pavilion(cx, cz, w, d, base, height, open, wood = 'redwood') {
    const x = cx - Math.floor(w / 2);
    const z = cz - Math.floor(d / 2);
    const farX = x + w - 1;
    const front = z + d - 1;
    slab(x, base, z, w, 1, d, ['oak', 'cedar', 'cedar', 'redwood']);
    const y = base + 1;
    const top = y + height;
    for (const a of [x, farX]) {
      for (const b of [z, front]) post(a, y, b, 1, height, 1, [wood, wood, 'beam']);
    }
    for (let level = y; level < top - 2; level++) {
      for (let a = x + 1; a < farX; a++) {
        if (open && level > y + 1 && level < top - 4 && a !== cx && (a - x) % 4 !== 0) continue;
        const tone = level === y || level === y + 4 || (a - x) % 4 === 0 ? wood : 'cream';
        set(a, level, z, 1, 1, 1, tone, tone === wood);
      }
      for (let b = z + 1; b < front; b++) {
        const support = (b - z) % 4 === 0;
        if (open && level > y + 1 && level < top - 4 && !support) continue;
        const tone = level === y || level === y + 4 || support ? wood : 'milk';
        set(x, level, b, 1, 1, 1, tone, tone === wood);
        set(farX, level, b, 1, 1, 1, tone, tone === wood);
      }
      for (let a = x + 1; a < farX; a++) {
        if (Math.abs(a - cx) <= 2) continue;
        if (open && level > y + 1 && level < top - 4 && a % 3 !== 0) continue;
        const tone = level === y || level === y + 4 || (a - x) % 3 === 0 ? wood : 'cream';
        set(a, level, front, 1, 1, 1, tone, tone === wood);
      }
    }
    for (const b of [z, front]) row(x + 1, top - 2, b, w - 2, 2, 'beam');
    for (const a of [x, farX]) row(a, top - 2, z + 1, d - 2, 2, 'beam', 'z');
    slab(x, top, z, w, 2, d, 'beam', false);
    for (const a of [cx - 3, cx + 3]) {
      lantern(a, top - 5, front + 1);
      set(a, top - 1, front + 1, 1, 2, 1, 'beam');
    }
    return roof(cx, cz, w + 4, d + 4, top + 4);
  }

  function torii(cx, z, base, w = 10, h = 16) {
    const left = cx - Math.floor(w / 2);
    const right = cx + Math.ceil(w / 2) - 2;
    for (const x of [left, right]) {
      set(x - 1, base, z - 1, 3, 1, 3, 'shale');
      post(x, base + 1, z, 2, h - 2, 2, ['lacquer', 'lacquer', 'vermilion']);
      set(x, base + 1, z, 2, 2, 2, 'shadow');
    }
    for (let a = left - 2; a <= right + 3; a += 2) {
      set(a, base + h - 5, z, 2, 1, 2, 'redTrim');
      const end = a === left - 2 || a >= right + 2;
      set(a, base + h - 1 + (end ? 1 : 0), z, 2, 2, 2, 'vermilion');
      set(a, base + h + 1 + (end ? 1 : 0), z - 1, 2, 1, 4, 'ink');
    }
    set(cx, base + h - 4, z, 1, 3, 2, 'gold');
  }

  function bridge() {
    const left = -23;
    const right = 11;
    const deckZ = 8;
    function rise(x) {
      const t = Math.max(0, 1 - ((x + 6) / 16.5) ** 2);
      return Math.round(t * 7);
    }
    for (let x = left; x < right; x++) {
      const y = rise(x);
      set(x, y, deckZ, 1, 1, 7, pick(['cedar', 'oak', 'redwood', 'oak'], noise(x, 3, deckZ)));
      for (const z of [deckZ - 1, deckZ + 7]) {
        set(x, y - 2, z, 1, 3, 1, 'redTrim');
        set(x, y + 5, z, 1, 1, 1, 'vermilion');
        set(x, y + 2, z, 1, 1, 1, 'lacquer');
        if ((x - left) % 4 === 0 || x === right - 1) {
          set(x, y + 1, z, 1, 1, 1, 'redTrim');
          set(x, y + 3, z, 1, 2, 1, 'lacquer');
          set(x, y + 6, z, 1, 1, 1, 'ink');
          if ((x - left) % 12 === 0) lantern(x, y + 7, z);
        }
      }
    }
    for (const x of [-15, 2]) {
      for (const z of [deckZ, deckZ + 5]) {
        const y = rise(x);
        post(x, -8, z, 2, y + 8, 2, ['shale', 'stone', 'beam']);
      }
    }
  }

  function tieredShrine() {
    const cx = 36;
    const cz = -22;
    slab(cx - 9, 0, cz - 8, 19, 1, 17, ['stone', 'shale', 'gravel']);
    const firstRoof = pavilion(cx, cz, 13, 11, 1, 12, false, 'lacquer');
    const secondRoof = pavilion(cx, cz, 9, 7, firstRoof, 8, false, 'vermilion');
    const thirdRoof = pavilion(cx, cz, 5, 5, secondRoof, 5, false, 'redTrim');
    post(cx, thirdRoof, cz, 1, 7, 1, ['gold', 'redTrim', 'ink']);
    set(cx - 1, thirdRoof + 2, cz, 3, 1, 1, 'gold');
    set(cx, thirdRoof + 6, cz - 1, 1, 1, 3, 'gold');
  }

  function treehouse() {
    const x = 9;
    const z = -19;
    const deck = 31;
    for (const a of [11, 18, 28]) {
      for (const b of [-17, -6]) post(a, 0, b, 2, deck, 2, ['beam', 'darkBark', 'redwood']);
    }
    slab(x, deck - 3, z, 22, 2, 16, ['redwood', 'oak', 'beam'], false);
    slab(x, deck - 1, z, 22, 1, 16, ['oak', 'cedar', 'oak', 'redwood']);
    pavilion(20, -11, 13, 9, deck, 11, true, 'redwood');
    for (const a of [x, x + 21]) {
      row(a, deck + 4, z, 16, 1, 'lacquer', 'z');
      for (let b = z; b < -3; b += 4) post(a, deck, b, 1, 4, 1, 'redTrim');
    }
    for (const b of [z, -4]) {
      for (const [start, length] of (b === z ? [[x + 1, 20]] : [[x + 1, 12], [26, 4]])) {
        row(start, deck + 4, b, length, 1, 'lacquer');
        for (let a = start; a < start + length; a += 3) post(a, deck, b, 1, 4, 1, 'redTrim');
      }
    }
    for (const [a, b] of [[10, -5], [29, -5], [10, -18], [29, -18]]) lantern(a, deck, b);
    for (let b = -3; b < 17; b++) {
      const y = Math.round((16 - b) * (deck - 1) / 20);
      set(22, y, b, 4, 1, 1, b % 4 === 0 ? 'redwood' : 'oak');
      if (y > 2) set(22, y - 2, b, 4, 2, 1, 'beam', false);
      for (const a of [21, 26]) {
        set(a, y + 4, b, 1, 1, 1, 'lacquer');
        set(a, y, b, 1, 1, 1, 'redTrim');
        if ((b + 3) % 4 === 0) post(a, Math.max(0, y - 4), b, 1, y > 4 ? 8 : y + 4, 1, 'redTrim');
      }
    }
    for (const [b, y] of [[0, 23], [7, 13], [12, 5]]) {
      for (const a of [22, 25]) post(a, 0, b, 1, y, 1, ['beam', 'darkBark', 'redwood']);
    }
    lantern(21, 8, 14);
    lantern(26, 19, 7);
  }

  function house(cx, cz, w, d, height) {
    slab(cx - Math.floor(w / 2) - 1, 0, cz - Math.floor(d / 2) - 1, w + 2, 1, d + 2, ['stone', 'shale', 'gravel']);
    pavilion(cx, cz, w, d, 1, height, false);
    const front = cz - Math.floor(d / 2) + d;
    set(cx - 2, 0, front + 1, 4, 1, 1, 'gravel');
    set(cx - 3, 0, front + 3, 2, 2, 1, 'redwood');
    set(cx - 3, 2, front + 3, 2, 1, 1, 'oak');
  }

  function rock(cx, cz, size) {
    const ground = terrainAt(cx, cz)?.y ?? -4;
    for (let level = 0; level < size; level++) {
      const span = size * 2 - level * 2;
      slab(cx - Math.floor(span / 2) + (level % 2), ground + level * 2, cz - Math.floor(span / 2),
        span, 2, span, level === size - 1 ? ['stone', 'sage', 'shale'] : ['stone', 'shale', 'shale'], true, 3);
    }
  }

  return { slab, post, row, lantern, gardenLamp, bridge, torii, tieredShrine, treehouse, house, rock };
}

function tree(world, cx, cz, scale, main = false) {
  const base = terrainAt(cx, cz)?.y ?? 0;
  const set = world.seed.bind(world);
  const finish = Math.round(53 * scale);
  const bark = ['bark', 'bark', 'warmBark', 'darkBark', 'redwood'];
  const root = main ? 4.5 : 2.8;
  const stemX = height => cx + Math.sin(height / 15) * scale * 1.6 + height * 0.018;
  const stemZ = height => cz + Math.cos(height / 19) * 1.2 - 1.2;
  function trunkLayer(x, y, z, radius, h) {
    for (let b = Math.floor(z - radius); b <= Math.ceil(z + radius); b++) {
      let run = 0;
      for (let a = Math.floor(x - radius); a <= Math.ceil(x + radius); a++) {
        const inside = ((a + 0.5 - x) * 0.95) ** 2 + (b + 0.5 - z) ** 2 < radius ** 2;
        if (inside) run++;
        if (run && (!inside || run === 3)) {
          const start = inside ? a - run + 1 : a - run;
          if (!set(start, y, b, run, h, 1, pick(bark, noise(start, y, b)))) {
            for (let dx = 0; dx < run; dx++) set(start + dx, y, b, 1, h, 1, pick(bark, noise(start + dx, y, b)));
          }
          run = 0;
        }
      }
    }
  }
  for (let y = 0; y < finish; y += 3) {
    const radius = Math.max(0.84, (root - y / (finish + 4) * (root - 1.06)) * scale);
    trunkLayer(stemX(y), base + y, stemZ(y), radius, 3);
  }
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7 + 0.3;
    for (let step = 1; step <= (main ? 5 : 3); step++) {
      const dist = (step + 2) * scale;
      const x = Math.round(cx + Math.cos(angle) * dist);
      const z = Math.round(cz + Math.sin(angle) * dist);
      const land = terrainAt(x, z);
      if (!land) continue;
      set(x, land.y, z, 1, Math.max(1, 5 - step), 1, pick(bark, noise(x, step, z)));
    }
  }

  const clusters = main ? [
    [-10, 2, 60, 7.8, 6.1, 10], [-6, -5, 68, 7.9, 6.4, 12], [0, -4, 75, 8.9, 7.6, 11],
    [8, -6, 70, 9.3, 5.8, 10], [13, -1, 62, 7.1, 7.8, 10], [-12, -4, 57, 5.8, 5.1, 8],
    [10, 5, 63, 7.9, 5.6, 8], [-9, 8, 57, 5.0, 5.6, 8], [2, 3, 69, 8.8, 5.8, 8],
    [16, 5, 51, 3.3, 4.1, 8], [-14, 5, 49, 3.1, 3.8, 8], [8, 0, 81, 5, 3.6, 5.7],
  ] : [
    [-4.9, 0, 42, 5.9, 5.3, 8.4], [1, -2, 53, 6.6, 5.8, 10.6], [5.1, 2, 44, 5.7, 5.5, 8],
    [-1.5, 4, 45, 5.1, 4.1, 8], [5, -4, 48, 4.2, 4.1, 8], [-5, -4, 46, 4.6, 3.9, 8],
  ];
  const crowns = clusters.map(([dx, dz, y, rx, rz, ry]) => ({ x: cx + dx * scale, z: cz + dz * scale,
    y: base + y * scale, rx: rx * scale, rz: rz * scale, ry: ry * scale }));
  for (const [i, crown] of crowns.entries()) {
    if (i > (main ? 8 : 4)) break;
    const fork = Math.round((main ? 20 + i % 4 * 5 : 17 + i % 3 * 4) * scale);
    const end = Math.floor(crown.y - crown.ry * 0.22 - base);
    for (let y = fork; y <= end; y += 3) {
      const t = (y - fork) / Math.max(1, end - fork);
      const bend = t * t * (3 - 2 * t);
      const x = stemX(fork) + (crown.x - stemX(fork)) * bend;
      const z = stemZ(fork) + (crown.z - stemZ(fork)) * bend;
      const r = Math.max(0.75, (main ? 2.15 : 1.55) * (1 - t * 0.62) * scale);
      trunkLayer(x, base + y, z, r, 3);
    }
  }

  const x0 = Math.floor(Math.min(...crowns.map(c => c.x - c.rx)));
  const x1 = Math.ceil(Math.max(...crowns.map(c => c.x + c.rx)));
  const z0 = Math.floor(Math.min(...crowns.map(c => c.z - c.rz)));
  const z1 = Math.ceil(Math.max(...crowns.map(c => c.z + c.rz)));
  const top = Math.ceil(Math.max(...crowns.map(c => c.y + c.ry)));
  const bottom = Math.floor(Math.min(...crowns.map(c => c.y - c.ry)));
  for (let y = bottom; y < top; y += 2) {
    const cells = new Map();
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        const random = noise(x, y, z);
        let rim = Infinity;
        let crownHeight = 0;
        for (const c of crowns) {
          const b = (y + 1 - c.y) / c.ry;
          const shape = ((x + 0.5 - c.x) / c.rx) ** 2 + ((z + 0.5 - c.z) / c.rz) ** 2 + b ** 2;
          if (shape < rim) {
            rim = shape;
            crownHeight = b;
          }
        }
        if (rim > 0.87 + random * 0.24 || (rim < 0.53 && random < 0.92)) continue;
        const light = crownHeight * 0.65 + (y - bottom) / (top - bottom) * 0.7 + random * 0.77;
        const shades = light < 0.29 ? ['wine', 'mulberry', 'rose'] : light < 0.66 ? ['rose', 'salmon', 'rose', 'petal'] :
          light < 1.08 ? ['petal', 'blush', 'rose', 'salmon'] : ['blush', 'petal', 'ivory', 'blush'];
        cells.set(`${x},${z}`, pick(shades, noise(x - 8, y + 8, z + 17)));
      }
    }
    for (const [key, tone] of cells) {
      const [x, z] = key.split(',').map(Number);
      const value = noise(z, y, x);
      const sizes = value > 0.36 ? [[2, 2], [2, 1], [1, 2], [1, 1]] : [[1, 2], [2, 1], [1, 1]];
      for (const [w, d] of sizes) {
        let fits = true;
        for (let dz = 0; dz < d; dz++) {
          for (let dx = 0; dx < w; dx++) fits = fits && cells.has(`${x + dx},${z + dz}`);
        }
        if (!fits || !set(x, y, z, w, 2, d, tone)) continue;
        for (let dz = 0; dz < d; dz++) {
          for (let dx = 0; dx < w; dx++) cells.delete(`${x + dx},${z + dz}`);
        }
        break;
      }
    }
  }
}

function buildVoyage(world, make) {
  world.startExpansion();
  make.slab(13, 0, 52, 11, 1, 14, ['oak', 'cedar', 'oak', 'redwood']);
  for (const x of [13, 23]) {
    for (const z of [55, 60, 65]) {
      make.post(x, -6, z, 1, 8, 1, ['darkBark', 'redwood']);
      make.lantern(x, 2, z);
    }
    make.row(x, 2, 55, 10, 1, 'lacquer', 'z', true, 2);
  }
  for (const key of ['reed', 'lantern']) {
    const island = ISLANDS[key];
    const { gridX: cx, gridZ: cz, rx, rz } = island;
    for (let z = cz - rz; z <= cz + rz; z++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        const rim = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
        if (rim > 0.93 + noise(x, 48, z) * 0.12) continue;
        const bank = rim > 0.72;
        const top = bank ? -1 : 0;
        world.seed(x, -7, z, 1, top + 5, 1, bank ? 'sand' : 'soil', false);
        const path = Math.abs(x - cx) <= 1;
        const ground = bank ? 'sand' : pick(path ? ['chalk', 'stone', 'gravel'] : ['turf', 'olive', 'meadow'], noise(x, z));
        world.seed(x, top - 2, z, 1, 2, 1, ground);
        const courtyard = key === 'lantern' && z >= cz - 5 && Math.abs(x - cx) < 7;
        if (!path && !courtyard && noise(x, 19, z) < 0.10) world.seed(x, top, z, 1, 1, 1, bank ? 'reed' : 'petal');
      }
    }
    const lanterns = key === 'lantern' ? [[-6, -4], [6, -4]] : [[-3, -2], [3, -1], [-3, 3], [3, 4]];
    for (const [dx, dz] of lanterns) make.gardenLamp(cx + dx, cz + dz);
    if (key === 'lantern') {
      make.house(cx, cz + 3, 9, 7, 10);
      make.torii(cx, cz - 4, 0, 7, 12);
      tree(world, cx - 7, cz + 3, 0.46);
      tree(world, cx + 7, cz + 2, 0.42);
    } else {
      tree(world, cx + 4, cz + 2, 0.39);
      make.slab(cx - 3, 0, cz + 3, 4, 1, 2, ['oak', 'cedar']);
    }
  }
  world.seed(15, 32, -14, 3, 5, 2, 'cedar', false, 'tea');
}

function buildOuterIslands(world, make) {
  for (const key of ['shell', 'berry']) {
    const { gridX: cx, gridZ: cz, rx, rz } = ISLANDS[key];
    const cove = key === 'shell';
    for (let z = cz - rz; z <= cz + rz; z++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        const rim = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
        if (rim > 0.94 + noise(x, 48, z) * 0.09) continue;
        const beach = rim > 0.71;
        const top = beach ? -1 : 0;
        const skin = cove ? ['sand', 'chalk', 'cream', 'gravel'] : ['moss', 'fern', 'sage', 'olive'];
        const paving = Math.abs(x - cx) <= 2;
        world.seed(x, -7, z, 1, top + 5, 1, cove ? 'sand' : 'soil', false);
        world.seed(x, top - 2, z, 1, 2, 1,
          beach ? 'sand' : pick(paving ? ['chalk', 'gravel', 'stone'] : skin, noise(x, 82, z)));
        if (top === 0 && Math.abs(x - cx) >= 5 && noise(x, 83, z) > 0.89) {
          world.seed(x, 0, z, 1, 1, 1, pick(cove ? ['ivory', 'rose', 'cream'] : ['blush', 'wine', 'salmon'], noise(x, 16, z)),
            true, 'flower');
        }
      }
    }
    if (cove) {
      for (const dx of [-6, 6]) make.gardenLamp(cx + dx, cz - 1);
      make.slab(cx - 3, 0, cz + 2, 7, 1, 3, ['chalk', 'shale', 'chalk']);
      make.post(cx - 1, 1, cz + 3, 3, 10, 3, ['chalk', 'cream', 'redwood', 'chalk']);
      make.slab(cx - 2, 11, cz + 2, 5, 1, 5, ['beam', 'ink']);
      make.slab(cx - 1, 12, cz + 3, 3, 2, 3, ['paper'], false);
      make.slab(cx - 2, 14, cz + 2, 5, 2, 5, ['tile', 'teal']);
    } else {
      make.house(cx, cz + 2, 7, 7, 9);
      for (const dx of [-7, 7]) tree(world, cx + dx, cz + 1, 0.47);
      for (const dx of [-5, 5]) make.gardenLamp(cx + dx, cz - 4);
    }
  }
}

export function makeValley() {
  const world = new BrickWorld();
  seedTerrain(world);
  const make = builder(world);
  make.bridge();
  make.treehouse();
  make.tieredShrine();
  make.torii(13, 7, 0, 9, 14);
  make.torii(36, -8, 0, 9, 14);
  make.house(-30, -6, 13, 9, 12);
  make.house(-39, -20, 10, 8, 10);
  make.house(39, 15, 11, 9, 10);
  make.house(-32, 23, 9, 8, 9);
  for (const [x, z] of [[8, 21], [17, 30], [19, 17], [27, -2], [31, -7], [41, -9], [29, 4],
    [-25, 7], [-26, 15], [-32, 0], [-35, -13], [-22, 23], [33, 24], [16, 43]]) make.gardenLamp(x, z);
  for (const [x, z, size] of [[5, -15, 2], [8, -32, 3], [1, 25, 2], [-19, 20, 2], [-18, -9, 2],
    [-21, -23, 3], [-26, 38, 2], [28, 46, 2], [45, 32, 3], [-45, 23, 3], [19, -37, 2], [47, -15, 3]]) make.rock(x, z, size);
  tree(world, 18, -22, 1, true);
  for (const [x, z, size] of [[-37, 3, 0.79], [-24, -21, 0.7], [-43, -31, 0.71], [43, -34, 0.74],
    [44, 5, 0.55], [46, 23, 0.68], [-43, 30, 0.67], [3, 40, 0.52], [47, 42, 0.62], [24, -39, 0.62],
    [-30, 44, 0.53], [-18, -37, 0.61], [6, -27, 0.49]]) tree(world, x, z, size);

  for (let z = -42; z < 55; z++) {
    for (let x = -50; x < 52; x++) {
      const ground = terrainAt(x, z);
      if (!ground || ground.family === 'path' || (x > 15 && x < 26 && z > 21 && z < 42)) continue;
      const value = noise(x, 78, z);
      if (ground.family === 'bank' && value < 0.072) {
        world.seed(x, ground.y, z, 1, value < 0.023 ? 3 : 2, 1, value < 0.044 ? 'reed' : 'fern');
      } else if (value < 0.057) {
        const tone = value < 0.026 ? 'fern' : value < 0.04 ? 'sage' : 'petal';
        world.seed(x, ground.y, z, 1, 1, 1, tone);
      }
    }
  }
  buildVoyage(world, make);
  buildOuterIslands(world, make);
  return world;
}

export function district(x, y, z) {
  const island = islandAt(x, z);
  if (island) return ISLANDS[island].name;
  if (Math.hypot(x - DOCK.x, z - DOCK.z) < 6) return 'South Dock';
  if (y > 3.2 && x > 4 && z < 5 && z > -14) return 'The High Pavilion';
  if (x > 15 && z < -4) return 'Lantern Shrine';
  if (Math.abs(z / STUD - 11.5) < 3.5 && x > -12 && x < 6) return 'Vermilion Bridge';
  if (x < -9) return 'West Village';
  if (z > 10 && x > 6) return 'Building Meadow';
  return 'Sakura Grove';
}
