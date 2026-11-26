import { CANAL_END, COAST_BOUNDS, COAST_BRIDGE, GARDEN_CHANNELS } from './mainland-data.js';

const SIZES = [[4, 4], [4, 2], [3, 2], [2, 3], [2, 2], [2, 1], [1, 2], [1, 1]];
const PATH = ['chalk', 'stone', 'gravel', 'milk'];
const GRASS = ['turf', 'olive', 'moss', 'meadow', 'sage'];
const ROCK = ['shale', 'blueGray', 'stone', 'gravel'];
const SHORE = ['sand', 'sand', 'claySoil'];
const LOAM = ['soil', 'claySoil'];

function surface(x, z, noise) {
  const coast = 505 + Math.floor(Math.min(37, ((x + 18) / 35) ** 2 * 15) + Math.sin(x * 0.15) * 1.6);
  if (z < coast || (x >= -3 && x < 4 && z < CANAL_END)) return null;
  const bank = z < coast + 3;
  const ridge = Math.min(8, Math.max(0, Math.floor((z - 606) / 5) * 2));
  const foothills = Math.max(0, Math.floor((z - 646) / 2) * 2);
  const outcrop = z > 639 && (x < -25 || x > 38) ? Math.min(6, Math.floor((z - 638) / 4) * 2) : 0;
  const cliff = z >= 659 ? 10 + 2 * Math.floor(noise(Math.floor(x / 5), 64, 1) * 4) : 0;
  const height = ridge + foothills + outcrop + cliff;
  const garden = z >= 575 && z < 597 && x >= 21 && x <= 37;
  const terrace = garden ? x >= 33 ? 4 : x >= 27 ? 2 : 0 : 0;
  const ditch = garden && GARDEN_CHANNELS.some(channel => channel.x === x);
  const road = (x >= -20 && x <= -15 && z <= 565) || (z >= 566 && z < 571 && x >= -19 && x <= 14) ||
    (x >= 11 && x <= 16 && z > 567 && z < 642) || (z >= 627 && z < 637 && x >= 13 && x <= 35) ||
    (z >= 637 && z < 658 && x >= 14 && x <= 19);
  const shade = noise(x, 62, z);
  const palette = bank || ditch ? SHORE : road ? PATH : outcrop || cliff || height && (x < -25 || x > 38) ? ROCK : garden ? LOAM : GRASS;
  return { y: bank ? -1 : height + terrace - Number(ditch), palette, tone: palette[Math.floor(shade * palette.length)] };
}

function ground(world, noise) {
  const { minX, maxX, minZ, maxZ } = COAST_BOUNDS;
  const stride = maxX - minX;
  const index = (x, z) => (z - minZ) * stride + x - minX;
  const cells = Array.from({ length: stride * (maxZ - minZ) }, (_, i) => surface(minX + i % stride, minZ + Math.floor(i / stride), noise));
  for (let z = minZ; z < maxZ; z++) for (let x = minX; x < maxX; x++) {
    const cell = cells[index(x, z)];
    if (!cell) continue;
    for (const [w, d] of SIZES) {
      if (x + w > maxX || z + d > maxZ) continue;
      let fits = true;
      for (let b = z; b < z + d && fits; b++) for (let a = x; a < x + w; a++) {
        const neighbor = cells[index(a, b)];
        if (neighbor?.y !== cell.y || neighbor.palette !== cell.palette) { fits = false; break; }
      }
      if (!fits) continue;
      const earth = cell.y > 0 ? 'shale' : 'claySoil';
      for (let y = -8; y < cell.y - 2; y += 8) world.seed(x, y, z, w, Math.min(8, cell.y - 2 - y), d, earth, false);
      world.seed(x, cell.y - 2, z, w, 2, d, cell.tone);
      for (let b = z; b < z + d; b++) for (let a = x; a < x + w; a++) cells[index(a, b)] = null;
      break;
    }
  }
}

function cedar(world, make, x, y, z, size) {
  make.post(x, y, z, 2, 8 + size * 2, 2, ['bark', 'warmBark', 'beam']);
  for (let layer = 0; layer < 4; layer++) {
    const r = Math.max(1, size + 2 - layer);
    const bottom = y + 6 + layer * 4;
    for (let dz = -r; dz <= r; dz++) {
      const half = Math.floor(Math.sqrt(r * r - dz * dz) * 0.92);
      make.row(x - half + 1, bottom, z + dz, half * 2 + 1, 3, ['pine', 'moss', 'fern', 'sage'][layer]);
    }
    world.seed(x, bottom + 3, z, 2, 1, 2, layer % 2 ? 'fern' : 'pine');
  }
}

function stall(world, make, x, z, shade) {
  make.slab(x, 0, z, 7, 1, 5, ['oak', 'cedar']);
  for (const a of [x, x + 6]) for (const b of [z, z + 4]) make.post(a, 1, b, 1, 10, 1, ['cedar', 'beam']);
  make.row(x + 1, 1, z + 3, 5, 4, 'redwood');
  make.row(x, 5, z + 3, 7, 1, 'oak', 'x', false);
  for (let dx = -1; dx <= 7; dx++) {
    make.row(x + dx, 11, z - 1, 6, 1, dx % 2 ? shade : 'cream', 'z', false);
    world.seed(x + dx, 10, z + 5, 1, 1, 1, dx % 2 ? shade : 'cream', false);
  }
  for (const dx of [2, 4]) {
    world.seed(x + dx, 6, z + 3, 1, 1, 1, 'gold', false);
    world.seed(x + dx, 7, z + 3, 1, 2, 1, dx === 2 ? 'jade' : 'redwood', true, 'round');
  }
}

export function buildMainland(world, make, noise) {
  ground(world, noise);
  make.slab(-21, -1, 498, 7, 2, 16, ['oak', 'cedar', 'redwood']);
  for (const x of [-21, -15]) for (const z of [500, 504, 508, 512]) make.post(x, -6, z, 1, 8, 1, ['bark', 'warmBark']);
  for (const x of [-21, -15]) make.row(x, 2, 501, 12, 1, 'redwood', 'z', false);
  make.torii(-18, 518, 0, 10, 17);
  make.house(-29, 529, 12, 9, 11);
  make.house(-7, 532, 10, 9, 11);
  make.slab(-25, 0, 521, 3, 1, 4, PATH);
  for (const [x, z] of [[-23, 518], [-12, 518], [-22, 538], [-13, 540], [-21, 559], [-8, 565], [-6, 572], [7, 565], [7, 571], [9, 588], [18, 600]]) make.gardenLamp(x, z);
  for (const [x, z, shade] of [[-30, 546, 'teal'], [-30, 556, 'lacquer'], [-11, 545, 'jade'], [-11, 554, 'redTrim'], [-23, 579, 'blueGray']]) stall(world, make, x, z, shade);
  make.house(-33, 574, 12, 9, 11);
  make.house(-23, 593, 10, 9, 10);
  make.slab(-22, 0, 548, 8, 1, 12, PATH);
  world.seed(-15, 0, 558, 3, 5, 2, 'cedar', false, 'tea');
  const { x, z, width, rows } = COAST_BRIDGE;
  for (const bank of [x - 4, x + width]) {
    make.slab(bank, 0, z, 4, 1, rows, ['cedar', 'oak']);
    for (const a of [bank, bank + 3]) for (const b of [z - 1, z + rows]) make.post(a, 0, b, 1, 6, 1, ['oak', 'redwood']);
  }
  for (const bank of [x - 1, x + width]) for (const [start, length] of [[533, 28], [574, 30]]) {
    make.row(bank, 0, start, length, 1, 'shale', 'z', false);
  }
  make.row(-4, 0, CANAL_END - 1, 9, 1, 'stone', 'x', false);
  make.slab(-8, 0, 568, 2, 1, 2, 'stone');
  make.row(-8, 1, 569, 2, 5, 'warmBark');
  make.slab(-8, 6, 569, 2, 1, 1, 'teal');

  make.house(32, 555, 12, 9, 10);
  make.house(18, 595, 9, 7, 9);
  for (const { x: channel, level } of GARDEN_CHANNELS) {
    for (const side of [-1, 1]) {
      const a = channel + side;
      make.row(a, level, 575, 22, 1, 'stone', 'z', false);
      for (let b = 576; b <= 596; b += 2) {
        world.seed(a + side, level, b, 1, 2, 1, 'pine');
        world.seed(a + side, level + 2, b, 1, 1, 1, b % 4 ? 'sage' : 'fern', true, 'flower');
      }
    }
  }
  make.slab(6, 0, 576, 3, 1, 12, ['ink', 'teal', 'jade']);
  make.row(6, 1, 576, 12, 1, 'stone', 'z', false);
  make.row(8, 1, 576, 12, 1, 'stone', 'z', false);
  make.post(7, 1, 581, 1, 6, 1, ['stone', 'shale']);

  make.torii(14, 609, 0, 9, 17);
  for (const [a, b, h] of [[9, 615, 2], [19, 622, 6], [17, 632, 8], [28, 629, 8], [33, 634, 8]]) make.gardenLamp(a, b, h);
  make.slab(24, 8, 636, 13, 1, 12, ['chalk', 'stone', 'blueGray'], false);
  for (const a of [24, 36]) for (const b of [636, 647]) make.post(a, 9, b, 2, 15, 2, ['chalk', 'blueGray', 'teal']);
  make.slab(23, 24, 635, 16, 2, 14, ['ink', 'teal', 'tile']);
  make.slab(26, 26, 637, 10, 2, 10, ['teal', 'jade']);
  make.slab(29, 28, 640, 4, 3, 4, ['gold', 'shale']);
  make.torii(30, 635, 8, 11, 17);
  make.torii(17, 649, 10, 8, 18);
  make.slab(20, 12, 651, 3, 1, 2, ['stone', 'chalk']);
  make.post(20, 13, 652, 1, 5, 1, ['cedar', 'beam']);
  make.post(22, 13, 652, 1, 5, 1, ['cedar', 'beam']);
  make.row(20, 18, 652, 3, 2, 'teal', 'x', false);
  make.row(20, 20, 652, 3, 1, 'brass', 'x', false);
  for (let z = 620; z <= 652; z += 8) {
    for (const [x, spread] of [[-44, 5], [-32, 5], [-23, 3], [6, 4], [44, 5]]) {
      const a = x + Math.floor(noise(x, 84, z) * spread);
      const y = surface(a, z, noise)?.y ?? 0;
      cedar(world, make, a, y, z, 2 + Math.floor(noise(a, 11, z) * 2));
    }
  }
  for (const [x, z] of [[-40, 529], [-44, 550], [-38, 562], [-44, 582], [-46, 600], [-20, 600], [43, 551], [48, 558],
    [46, 568], [48, 579], [41, 589], [49, 596], [46, 603], [4, 598], [10, 601]]) {
    const y = surface(x, z, noise)?.y ?? 0;
    cedar(world, make, x, y, z, 2 + Math.floor(noise(x, 49, z) * 2));
  }
}
