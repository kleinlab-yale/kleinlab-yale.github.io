import { CHRISTMAS_OBJECTS, CHRISTMAS_PACKS } from './christmas.js';

function part(key, name, group, w, d, h, tone, studs = true, form = 'brick') {
  return { key, name, group, w, d, h, tone, studs, form };
}

const DOOR_VARIANTS = [
  { key: 'narrow-door', name: 'Narrow cedar door', size: [2, 1, 9] },
  { key: 'short-door', name: 'Short cedar door', size: [3, 1, 9] },
  { key: 'tall-door', name: 'Tall cedar door', size: [3, 1, 12] },
  { key: 'wide-door', name: 'Wide double door', size: [4, 1, 10] },
];

export const BUILD_PACKS = {
  ...CHRISTMAS_PACKS,
  house: { name: 'House Pack', goal: 'Place 6 pieces', contents: 'Five working door sizes, glass and lattice windows, shutters, roof tiles, eaves and a ridge' },
  furnishings: { name: 'Furnishings Pack', goal: 'Brew and serve blossom tea', contents: 'Couch, chair, dining table and a low bench' },
  garden: { name: 'Garden Lights Pack', goal: 'Rescue Mochi on Lantern Island', contents: 'Switchable porch lamp, path lantern and blossom planter' },
  coastal: { name: 'Coastal Pack', goal: 'Sail to Shell Cove', contents: 'Harbor light, painted buoy and deck railing' },
  shipwright: { name: 'Shipwright Pack', goal: 'Light the Shell Cove lantern', contents: 'Mooring cleat, covered pier and rope rail' },
  stargazer: { name: 'Stargazer Pack', goal: 'Restore the lantern trail', contents: 'Working wind bell, star mosaic and observatory arch' },
  harbor: { name: 'Harbor Workshop Pack', goal: 'Repair Cedar Coast’s canal bridge', contents: 'Canal railing, striped market canopy and dock bollard' },
  terraces: { name: 'Terrace Garden Pack', goal: 'Water the Terrace Gardens', contents: 'Tea planter, stone trough and garden trellis' },
  ridge: { name: 'Ridge Workshop Pack', goal: 'Restore the Ridge Observatory', contents: 'Compass mosaic, brass weather vane and lookout eave' },
};

export const PLACEABLE_OBJECTS = {
  tea: { key: 'tea-counter', name: 'Tea counter', size: [3, 2, 5], tone: 'cedar' },
  door: { name: 'Cedar door', size: [3, 1, 10], variants: DOOR_VARIANTS, tone: 'cedar', pack: 'house', interaction: 'door' },
  window: { key: 'glass-window', name: 'Glass window', size: [3, 1, 5], tone: 'ink', pack: 'house' },
  couch: { name: 'Cushioned couch', size: [4, 2, 5], tone: 'jade', pack: 'furnishings' },
  chair: { name: 'Dining chair', size: [1, 1, 5], tone: 'oak', pack: 'furnishings' },
  table: { name: 'Dining table', size: [3, 2, 4], tone: 'cedar', pack: 'furnishings' },
  lamp: { name: 'Porch lamp', size: [1, 1, 6], tone: 'ink', pack: 'garden', interaction: 'light' },
  beacon: { name: 'Harbor light', size: [2, 2, 8], tone: 'vermilion', pack: 'coastal', interaction: 'light' },
  windbell: { name: 'Wind bell', size: [1, 1, 8], tone: 'gold', pack: 'stargazer', interaction: 'bell' },
  ...CHRISTMAS_OBJECTS,
};

// The order of these seven pieces is part of the original save format.
export const QUICK_PARTS = [
  part('terracotta', 'Terracotta brick', 'Bricks', 2, 2, 3, 'vermilion'),
  part('cedar', 'Cedar beam', 'Bricks', 4, 2, 3, 'cedar'),
  part('ivory', 'Ivory brick', 'Bricks', 2, 1, 3, 'milk'),
  part('slate', 'Slate roof tile', 'Plates & tiles', 3, 2, 1, 'teal'),
  part('moss', 'Moss plate', 'Plates & tiles', 3, 3, 1, 'moss'),
  part('blossom', 'Blossom brick', 'Garden', 2, 1, 2, 'petal'),
  part('amber', 'Amber lantern', 'Objects', 1, 1, 3, 'amber'),
];

function section(x, y, z, w, d, h, tone, studs = true, form = 'brick') {
  return { x, y, z, w, d, h, tone, studs, form };
}

function kit(key, name, group, blocks) {
  return { key, name, group, blocks, tone: blocks[0].tone,
    w: Math.max(...blocks.map(b => b.x + b.w)), d: Math.max(...blocks.map(b => b.z + b.d)),
    h: Math.max(...blocks.map(b => b.y + b.h)) };
}

export const PARTS = [
  ...QUICK_PARTS,
  part('single', 'Single brick', 'Bricks', 1, 1, 3, 'claySoil'),
  part('brick-2x3', 'Wide brick', 'Bricks', 2, 3, 3, 'stone'),
  part('brick-2x4', 'Long brick', 'Bricks', 2, 4, 3, 'cedar'),
  part('brick-3x3', 'Square block', 'Bricks', 3, 3, 3, 'shale'),
  part('beam-1x4', 'Narrow beam', 'Bricks', 4, 1, 3, 'beam'),
  part('beam-1x7', 'Bridge plank', 'Bricks', 1, 7, 1, 'oak'),
  part('trunk', 'Trunk block', 'Bricks', 2, 3, 6, 'warmBark', false),
  part('column', 'Round pillar', 'Bricks', 1, 1, 6, 'stone', true, 'round'),
  part('foundation', 'Foundation block', 'Bricks', 4, 4, 6, 'soil', false),
  part('plate-1x1', 'Single plate', 'Plates & tiles', 1, 1, 1, 'patina'),
  part('plate-1x2', 'Narrow plate', 'Plates & tiles', 1, 2, 1, 'fern'),
  part('plate-2x2', 'Square plate', 'Plates & tiles', 2, 2, 1, 'olive'),
  part('plate-4x4', 'Baseplate', 'Plates & tiles', 4, 4, 2, 'turf'),
  part('paving', 'Smooth paving tile', 'Plates & tiles', 2, 3, 1, 'chalk', false),
  part('floor', 'Cedar floorboard', 'Plates & tiles', 4, 1, 1, 'oak', false),
  part('canopy', 'Canopy brick', 'Garden', 2, 2, 2, 'rose'),
  part('petal', 'Blossom stud', 'Garden', 1, 1, 1, 'blush', true, 'flower'),
  part('leaf', 'Leaf plate', 'Garden', 2, 2, 1, 'sage'),
  part('paper', 'Paper wall panel', 'Plates & tiles', 2, 1, 6, 'cream', false),
  kit('eave', 'Stepped roof eave', 'Structures', [
    section(0, 0, 0, 3, 1, 2, 'teal'), section(0, 1, 1, 3, 1, 3, 'tile'), section(0, 3, 2, 3, 1, 3, 'ink'),
  ]),
  kit('stairs', 'Three-step stair', 'Structures', [
    section(0, 0, 2, 2, 1, 2, 'oak'), section(0, 0, 1, 2, 1, 4, 'oak'), section(0, 0, 0, 2, 1, 6, 'oak'),
  ]),
  kit('arch', 'Lacquer arch', 'Structures', [
    section(0, 0, 0, 1, 2, 6, 'lacquer'), section(4, 0, 0, 1, 2, 6, 'lacquer'),
    section(0, 6, 0, 5, 2, 2, 'redTrim'), section(0, 8, 0, 5, 2, 1, 'ink'),
  ]),
  kit('corner', 'Corner wall', 'Structures', [
    section(0, 0, 0, 3, 1, 3, 'warmBark'), section(0, 0, 1, 1, 2, 3, 'warmBark'),
  ]),
  kit('window', 'Lattice window', 'Structures', [
    section(0, 0, 0, 5, 1, 1, 'beam'), section(0, 1, 0, 1, 1, 5, 'beam'),
    section(4, 1, 0, 1, 1, 5, 'beam'), section(2, 1, 0, 1, 1, 5, 'cedar'),
    section(1, 3, 0, 1, 1, 1, 'cedar'), section(3, 3, 0, 1, 1, 1, 'cedar'), section(0, 6, 0, 5, 1, 1, 'beam'),
  ]),
  kit('garden-lamp', 'Stone garden lantern', 'Objects', [
    section(0, 0, 0, 3, 3, 1, 'shale'), section(1, 1, 1, 1, 1, 3, 'stone'),
    section(0, 4, 0, 3, 3, 1, 'stone'), section(1, 5, 1, 1, 1, 2, 'paper'), section(0, 7, 0, 3, 3, 1, 'teal'),
  ]),
  kit('flower-pot', 'Potted blossom', 'Garden', [
    section(0, 0, 0, 1, 1, 2, 'redwood', true, 'round'), section(0, 2, 0, 1, 1, 1, 'rose', true, 'flower'),
  ]),
  ...Object.entries(PLACEABLE_OBJECTS).map(([form, object]) => ({
    ...part(object.key ?? form, object.name, 'Objects', ...object.size, object.tone, false, form), pack: object.pack,
  })),
  ...['door', 'window'].map(form => ({
    ...part(`fit-${form}`, `Add ${form}`, 'Objects', ...PLACEABLE_OBJECTS[form].size, PLACEABLE_OBJECTS[form].tone, false, form),
    pack: 'house', fit: true,
  })),
  ...DOOR_VARIANTS.map(({ key, name, size }) => ({ ...part(key, name, 'Objects', ...size, 'cedar', false, 'door'), pack: 'house' })),
  { ...kit('shutters', 'Shutter window', 'Structures', [
    section(0, 0, 0, 4, 1, 1, 'chalk'), section(0, 1, 0, 1, 1, 4, 'vermilion'),
    section(3, 1, 0, 1, 1, 4, 'vermilion'), section(0, 5, 0, 4, 1, 1, 'beam'),
  ]), pack: 'house' },
  { ...kit('roof-ridge', 'Capped roof ridge', 'Structures', [
    section(0, 0, 0, 5, 3, 1, 'tile'), section(0, 1, 1, 5, 1, 1, 'ink'),
    section(0, 2, 1, 1, 1, 1, 'gold'), section(4, 2, 1, 1, 1, 1, 'gold'),
  ]), pack: 'house' },
  { ...kit('bench', 'Low bench', 'Objects', [
    section(0, 0, 0, 1, 1, 2, 'beam'), section(2, 0, 0, 1, 1, 2, 'beam'), section(0, 2, 0, 3, 1, 1, 'oak', false),
  ]), pack: 'furnishings' },
  { ...kit('path-lantern', 'Path lantern', 'Objects', [
    section(0, 0, 0, 1, 1, 1, 'stone'), section(0, 1, 0, 1, 1, 2, 'paper', false), section(0, 3, 0, 1, 1, 1, 'jade'),
  ]), pack: 'garden' },
  { ...kit('planter', 'Blossom planter', 'Garden', [
    section(0, 0, 0, 3, 1, 2, 'cedar'), section(0, 2, 0, 1, 1, 1, 'rose', true, 'flower'),
    section(1, 2, 0, 1, 1, 1, 'blush', true, 'flower'), section(2, 2, 0, 1, 1, 1, 'petal', true, 'flower'),
  ]), pack: 'garden' },
  { ...kit('buoy', 'Painted buoy', 'Objects', [
    section(0, 0, 0, 1, 1, 2, 'vermilion', false, 'round'), section(0, 2, 0, 1, 1, 1, 'milk', false, 'round'),
    section(0, 3, 0, 1, 1, 1, 'vermilion', true, 'round'),
  ]), pack: 'coastal' },
  { ...kit('deck-railing', 'Deck railing', 'Structures', [
    section(0, 0, 0, 1, 1, 4, 'cedar'), section(3, 0, 0, 1, 1, 4, 'cedar'), section(0, 4, 0, 4, 1, 1, 'oak', false),
  ]), pack: 'coastal' },
  { ...kit('cleat', 'Mooring cleat', 'Objects', [
    section(0, 0, 0, 2, 1, 1, 'ink'), section(0, 1, 0, 1, 1, 1, 'stone'), section(0, 2, 0, 2, 1, 1, 'shale'),
  ]), pack: 'shipwright' },
  { ...kit('covered-pier', 'Covered pier section', 'Structures', [
    section(0, 0, 0, 4, 2, 1, 'oak'), section(0, 1, 0, 1, 1, 7, 'cedar'), section(3, 1, 0, 1, 1, 7, 'cedar'),
    section(0, 8, 0, 4, 2, 1, 'teal'), section(0, 9, 0, 4, 1, 1, 'ink'),
  ]), pack: 'shipwright' },
  { ...kit('rope-rail', 'Rope rail', 'Structures', [
    section(0, 0, 0, 1, 1, 3, 'beam'), section(3, 0, 0, 1, 1, 3, 'beam'), section(0, 3, 0, 4, 1, 1, 'cream', false),
  ]), pack: 'shipwright' },
  { ...kit('star-mosaic', 'Star mosaic', 'Plates & tiles', [
    section(0, 0, 0, 3, 3, 1, 'ink', false), section(1, 1, 0, 1, 3, 1, 'gold', false),
    section(0, 1, 1, 1, 1, 1, 'gold', false), section(2, 1, 1, 1, 1, 1, 'gold', false),
  ]), pack: 'stargazer' },
  { ...kit('observatory-arch', 'Observatory arch', 'Structures', [
    section(0, 0, 0, 1, 1, 6, 'blueGray'), section(4, 0, 0, 1, 1, 6, 'blueGray'),
    section(0, 6, 0, 5, 1, 1, 'ink'), section(1, 7, 0, 3, 1, 1, 'teal'), section(2, 8, 0, 1, 1, 1, 'gold'),
  ]), pack: 'stargazer' },
  { ...kit('canal-rail', 'Canal railing', 'Structures', [
    section(0, 0, 0, 1, 1, 6, 'redwood'), section(4, 0, 0, 1, 1, 6, 'redwood'),
    section(1, 2, 0, 3, 1, 1, 'cream', false), section(1, 4, 0, 3, 1, 1, 'cream', false),
    section(0, 6, 0, 5, 1, 1, 'cedar'),
  ]), pack: 'harbor' },
  { ...kit('market-awning', 'Striped market canopy', 'Structures', [
    section(0, 0, 0, 1, 1, 8, 'beam'), section(3, 0, 0, 1, 1, 8, 'beam'),
    section(0, 8, 0, 1, 3, 1, 'teal', false), section(1, 8, 0, 1, 3, 1, 'cream', false),
    section(2, 8, 0, 1, 3, 1, 'teal', false), section(3, 8, 0, 1, 3, 1, 'cream', false),
  ]), pack: 'harbor' },
  { ...kit('dock-bollard', 'Dock bollard', 'Objects', [
    section(0, 0, 0, 1, 1, 1, 'shale', false), section(0, 1, 0, 1, 1, 2, 'ink', false, 'round'),
    section(0, 3, 0, 1, 1, 1, 'brass', false, 'round'), section(0, 4, 0, 1, 1, 1, 'ink', false, 'round'),
  ]), pack: 'harbor' },
  { ...kit('tea-planter', 'Tea planter', 'Garden', [
    section(0, 0, 0, 3, 1, 2, 'claySoil'), ...[0, 1, 2].map(x => section(x, 2, 0, 1, 1, 1, 'fern', true, 'flower')),
  ]), pack: 'terraces' },
  { ...kit('stone-trough', 'Stone water trough', 'Garden', [
    section(0, 0, 0, 3, 2, 2, 'shale'), section(0, 2, 0, 1, 2, 2, 'stone'), section(2, 2, 0, 1, 2, 2, 'stone'),
    section(1, 2, 0, 1, 1, 2, 'stone'), section(1, 2, 1, 1, 1, 1, 'patina', false),
  ]), pack: 'terraces' },
  { ...kit('garden-trellis', 'Garden trellis', 'Structures', [
    section(0, 0, 0, 1, 1, 8, 'cedar'), section(3, 0, 0, 1, 1, 8, 'cedar'), section(1, 4, 0, 2, 1, 1, 'fern'),
    section(0, 8, 0, 4, 1, 1, 'oak'), section(1, 9, 0, 2, 1, 1, 'sage'),
  ]), pack: 'terraces' },
  { ...kit('compass-mosaic', 'Compass mosaic', 'Plates & tiles', [
    section(0, 0, 0, 3, 3, 1, 'ink', false), section(1, 1, 0, 1, 3, 1, 'brass', false),
    section(0, 1, 1, 1, 1, 1, 'chalk', false), section(2, 1, 1, 1, 1, 1, 'chalk', false),
  ]), pack: 'ridge' },
  { ...kit('weather-vane', 'Brass weather vane', 'Objects', [
    section(1, 0, 0, 1, 1, 1, 'shale'), section(1, 1, 0, 1, 1, 5, 'brass', false, 'round'),
    section(0, 6, 0, 3, 1, 1, 'brass', false), section(2, 7, 0, 1, 1, 1, 'gold', false),
  ]), pack: 'ridge' },
  { ...kit('lookout-eave', 'Lookout eave', 'Structures', [
    section(0, 0, 0, 4, 3, 1, 'blueGray'), section(0, 1, 1, 4, 2, 1, 'teal'),
    section(0, 2, 2, 4, 1, 1, 'ink'), section(0, 3, 2, 1, 1, 1, 'brass'), section(3, 3, 2, 1, 1, 1, 'brass'),
  ]), pack: 'ridge' },
];

export function matchedPart(brick) {
  const object = Object.hasOwn(PLACEABLE_OBJECTS, brick.form) ? PLACEABLE_OBJECTS[brick.form] : null;
  const variant = object?.variants?.find(({ size: [w, , h] }) => w === (brick.turn % 2 ? brick.d : brick.w) && h === brick.h);
  return { key: 'match', name: variant?.name ?? object?.name ?? 'Matched brick', group: 'Bricks', pack: object?.pack,
    w: brick.w, d: brick.d, h: brick.h, tone: brick.tone, studs: brick.studs, form: brick.form, turn: brick.turn };
}

export function layoutPart(part, turn = 0, tone = null) {
  let { w, d } = part;
  let blocks = (part.blocks ?? [section(0, 0, 0, w, d, part.h, part.tone, part.studs, part.form)]).map(block => ({
    ...block, tone: tone ?? block.tone, turn: ((part.turn ?? 0) + turn) % 4,
  }));
  for (let i = 0; i < turn; i++) {
    blocks = blocks.map(block => ({ ...block, x: d - block.z - block.d, z: block.x, w: block.d, d: block.w }));
    [w, d] = [d, w];
  }
  return { w, d, h: part.h, blocks, tone: tone ?? part.tone };
}

const byKey = new Map(PARTS.map(part => [part.key, part]));

function buildKit(key, name, keys, colors) {
  return { key, name, parts: keys.map(key => byKey.get(key)), colors };
}

export const BUILD_KITS = [
  buildKit('all', 'All parts', QUICK_PARTS.map(part => part.key), []),
  ...Object.entries(CHRISTMAS_PACKS).map(([key, pack]) => buildKit(key, pack.name,
    Object.keys(CHRISTMAS_OBJECTS).filter(form => pack.season === 'keepsake' || CHRISTMAS_OBJECTS[form].pack === key ||
      (key === 'christmas-tree' && form === 'fairyLights')),
    ['pine', 'cranberry', 'snow', 'brass', 'frost', 'gingerbread', 'cream', 'vermilion', 'jade'])),
  buildKit('treehouse', 'Shrine & treehouse', ['cedar', 'floor', 'eave', 'stairs', 'arch', 'paper', 'window', 'column', 'corner', 'garden-lamp'],
    ['cedar', 'oak', 'beam', 'warmBark', 'lacquer', 'vermilion', 'teal', 'tile', 'ink', 'cream']),
  buildKit('blossoms', 'Blossom tree', ['trunk', 'canopy', 'blossom', 'petal', 'leaf', 'plate-4x4', 'flower-pot'],
    ['bark', 'warmBark', 'darkBark', 'wine', 'rose', 'petal', 'blush', 'ivory', 'sage', 'moss']),
  buildKit('boat', 'Boat & dock', ['beam-1x7', 'floor', 'plate-4x4', 'cedar', 'paving', 'column', 'amber'],
    ['oak', 'cedar', 'beam', 'redwood', 'jade', 'teal', 'amber', 'chalk']),
  buildKit('tea', 'Tea garden', ['tea-counter', 'floor', 'paper', 'window', 'garden-lamp', 'paving', 'flower-pot'],
    ['oak', 'cedar', 'cream', 'jade', 'petal', 'gold', 'ink']),
  buildKit('house', BUILD_PACKS.house.name, ['fit-door', 'fit-window', 'door', 'glass-window', 'shutters', 'roof-ridge', 'paper', 'floor', 'cedar',
    'narrow-door', 'short-door', 'tall-door', 'wide-door', 'window', 'slate', 'eave'],
    ['cedar', 'oak', 'cream', 'ink', 'vermilion', 'tile', 'patina']),
  buildKit('furnishings', BUILD_PACKS.furnishings.name, ['couch', 'chair', 'table', 'bench', 'floor', 'paving', 'tea-counter'],
    ['jade', 'oak', 'cedar', 'cream', 'rose', 'sage', 'ink']),
  buildKit('garden', BUILD_PACKS.garden.name, ['lamp', 'path-lantern', 'planter', 'flower-pot', 'garden-lamp', 'leaf', 'paving'],
    ['ink', 'gold', 'jade', 'cedar', 'rose', 'blush', 'fern']),
  buildKit('coastal', BUILD_PACKS.coastal.name, ['beacon', 'buoy', 'deck-railing', 'beam-1x7', 'floor', 'paving', 'column'],
    ['vermilion', 'oak', 'milk', 'ink', 'teal', 'sand', 'paper']),
  buildKit('shipwright', BUILD_PACKS.shipwright.name, ['covered-pier', 'rope-rail', 'cleat', 'floor', 'beam-1x7', 'cedar', 'paving'],
    ['oak', 'cedar', 'beam', 'teal', 'chalk', 'stone', 'ink']),
  buildKit('stargazer', BUILD_PACKS.stargazer.name, ['windbell', 'star-mosaic', 'observatory-arch', 'column', 'plate-1x1', 'paving', 'paper'],
    ['gold', 'blueGray', 'ink', 'patina', 'teal', 'cream', 'ivory']),
  buildKit('harbor', BUILD_PACKS.harbor.name, ['canal-rail', 'market-awning', 'dock-bollard', 'beam-1x7', 'cedar', 'floor', 'paving'],
    ['cedar', 'oak', 'redwood', 'cream', 'teal', 'jade', 'brass']),
  buildKit('terraces', BUILD_PACKS.terraces.name, ['tea-planter', 'stone-trough', 'garden-trellis', 'leaf', 'paving', 'tea-counter', 'column'],
    ['pine', 'fern', 'sage', 'jade', 'patina', 'stone', 'oak']),
  buildKit('ridge', BUILD_PACKS.ridge.name, ['compass-mosaic', 'weather-vane', 'lookout-eave', 'paper', 'column', 'paving', 'arch'],
    ['brass', 'chalk', 'ink', 'blueGray', 'teal', 'jade', 'oak']),
];
