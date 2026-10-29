/**
 * 1971 Milton Bradley "Voice of the Mummy" — Complete 82-Space Board Topology & 40 Audio Track Database
 * Coordinates (px, py) are in the 469 x 652 orthographic board space (matching 938 x 1304 board_top_ortho.png
 * and the Blender/glTF 3D model via pxToThree).
 */

export const BOARD_W = 469.0;
export const BOARD_H = 652.0;
export const WORLD_SCALE = 0.01;

export const Z_TIER1 = 0.84;
export const Z_TIER2 = 1.14;
export const Z_TIER3 = 1.44;

/**
 * Convert board pixel coordinates (px in [0, 469], py in [0, 652]) and tier elevation z
 * into Three.js world coordinates (X, Y=up, Z).
 */
export function pxToThree(px, py, zLevel = Z_TIER1) {
  return {
    x: (px - BOARD_W * 0.5) * WORLD_SCALE,
    y: zLevel,
    z: (py - BOARD_H * 0.5) * WORLD_SCALE,
  };
}

export const FAMOUS_ADVENTURER_NAMES = [
  'Indiana Jones',
  'Lara Croft',
  'Howard Carter',
  'Dr. Watson',
  'Nathan Drake',
  'Amelia Earhart',
  'Ben Gates',
  'Riley Poole',
  'Abigail Chase',
  "Rick O'Connell",
  'Evie Carnahan',
  'Marion Ravenwood',
  'Prof. Henry Jones',
  'Short Round',
  'Sallah',
];

/**
 * Picks `count` unique famous Egyptologist / tomb raider / adventurer names,
 * avoiding any names present in `excludeNames`.
 */
export function pickAdventurerNames(count = 4, excludeNames = []) {
  const excludedLower = new Set(
    excludeNames
      .filter(Boolean)
      .map((n) => String(n).replace(/\s*\(Bot\)\s*$/i, '').trim().toLowerCase())
  );
  const pool = FAMOUS_ADVENTURER_NAMES.filter(
    (name) => !excludedLower.has(name.toLowerCase())
  );
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  while (shuffled.length < count) {
    shuffled.push(
      FAMOUS_ADVENTURER_NAMES[shuffled.length % FAMOUS_ADVENTURER_NAMES.length]
    );
  }
  return shuffled.slice(0, count);
}

export const PLAYERS_CONFIG = [
  {
    id: 'blue',
    index: 0,
    name: 'Blue Explorer',
    deity: 'Bastet',
    deityTitle: 'Temple of Bastet (NW)',
    colorHex: '#1f75d2',
    accentHex: '#63b3ff',
    homeSpaceId: 'L1_00',
    explorerMeshName: 'Explorer_Blue',
    holderMeshName: 'JewelHolder_Bastet_NW',
    portraitImg: 'textures/explorer_blue.png',
    templeImg: 'textures/temple_bastet.png',
    holderPx: { px: -62, py: -35, z: 0.045 },
    startStandPx: { px: 95, py: 18 },
  },
  {
    id: 'red',
    index: 1,
    name: 'Red Explorer',
    deity: 'Ra',
    deityTitle: 'Temple of Ra (NE)',
    colorHex: '#d43527',
    accentHex: '#ff7a6b',
    homeSpaceId: 'L1_05',
    explorerMeshName: 'Explorer_Red',
    holderMeshName: 'JewelHolder_Ra_NE',
    portraitImg: 'textures/explorer_red.png',
    templeImg: 'textures/temple_ra.png',
    holderPx: { px: 531, py: -35, z: 0.045 },
    startStandPx: { px: 374, py: 18 },
  },
  {
    id: 'yellow',
    index: 2,
    name: 'Yellow Explorer',
    deity: 'Anubis',
    deityTitle: 'Temple of Anubis (SE)',
    colorHex: '#e0af1f',
    accentHex: '#ffe066',
    homeSpaceId: 'L1_15',
    explorerMeshName: 'Explorer_Yellow',
    holderMeshName: 'JewelHolder_Anubis_SE',
    portraitImg: 'textures/explorer_yellow.png',
    templeImg: 'textures/temple_anubis.png',
    holderPx: { px: 531, py: 687, z: 0.045 },
    startStandPx: { px: 374, py: 634 },
  },
  {
    id: 'green',
    index: 3,
    name: 'Green Explorer',
    deity: 'Osiris',
    deityTitle: 'Temple of Osiris (SW)',
    colorHex: '#25964c',
    accentHex: '#5ce088',
    homeSpaceId: 'L1_20',
    explorerMeshName: 'Explorer_Green',
    holderMeshName: 'JewelHolder_Osiris_SW',
    portraitImg: 'textures/explorer_green.png',
    templeImg: 'textures/temple_osiris.png',
    holderPx: { px: -62, py: 687, z: 0.045 },
    startStandPx: { px: 95, py: 634 },
  },
];

/**
 * Helper to generate all 82 spaces across the 3 pyramid tiers in clockwise order per tier:
 * - Level 1: 30 spaces (L1_00 .. L1_29) — 4 Lotus Corners + 26 tiles (12 Jewels, 8 Mummy Heads, 6 Hieroglyphs)
 * - Level 2: 26 spaces (L2_00 .. L2_25) — 4 Corner Landings + 22 tiles (8 Jewels, 4 Mummy Heads, 10 Hieroglyphs)
 * - Level 3: 26 spaces (L3_00 .. L3_25) — 4 Corner Landings + 22 tiles (6 Jewels, 4 Mummy Heads, 2 Great Jewel spaces, 10 Hieroglyphs)
 */
function buildBoardSpaces() {
  const spaces = [];
  const byId = {};

  function addSpace(sp) {
    const zMap = { 1: Z_TIER1, 2: Z_TIER2, 3: Z_TIER3 };
    sp.z = zMap[sp.level];
    sp.threePos = pxToThree(sp.px, sp.py, sp.z);
    sp.upSpaceId = sp.upSpaceId || null;
    sp.downSpaceId = sp.downSpaceId || null;
    sp.directUpSpaceId = sp.directUpSpaceId || null;
    sp.directDownSpaceId = sp.directDownSpaceId || null;
    spaces.push(sp);
    byId[sp.id] = sp;
  }

  const nx = [132.0, 183.25, 234.5, 285.75, 337.0];
  const wy1 = Array.from({ length: 10 }, (_, i) => 74.0 + i * 56.0);
  const wy23 = Array.from({ length: 8 }, (_, i) => 140.0 + i * (372.0 / 7.0));

  // =========================================================================
  // LEVEL 1 (30 Spaces clockwise: L1_00 to L1_29)
  // =========================================================================
  // 0: NW Blue Lotus Corner
  addSpace({
    id: 'L1_00', level: 1, indexOnLevel: 0,
    type: 'corner_home', homeColor: 'blue', label: 'Blue Lotus Corner (Bastet Home)',
    px: 62, py: 35, rect: [6, 6, 128, 70],
    upSpaceId: 'L2_00', directUpSpaceId: 'L2_00',
  });

  // 1..4: North Level 1 (4 tiles left-to-right)
  const n1Meta = [
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_09', upSpaceId: 'L2_02' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_10' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null },
  ];
  for (let j = 0; j < 4; j++) {
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L1_${String(1 + j).padStart(2, '0')}`,
      level: 1, indexOnLevel: 1 + j,
      type: n1Meta[j].type,
      label: n1Meta[j].label,
      jewelMesh: n1Meta[j].jewelMesh,
      px: 0.5 * (x0 + x1), py: 18.0,
      rect: [x0, 0, x1, 36],
      upSpaceId: n1Meta[j].upSpaceId || null,
      directUpSpaceId: `L2_${String(1 + j).padStart(2, '0')}`,
    });
  }

  // 5: NE Red Lotus Corner
  addSpace({
    id: 'L1_05', level: 1, indexOnLevel: 5,
    type: 'corner_home', homeColor: 'red', label: 'Red Lotus Corner (Ra Home)',
    px: 407, py: 35, rect: [341, 6, 463, 70],
    upSpaceId: 'L2_05', directUpSpaceId: 'L2_05',
  });

  // 6..14: East Level 1 (9 tiles top-to-bottom, 180-deg symmetric to West)
  const e1Meta = [
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_05', directUp: 'L2_06' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_07' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_06', directUp: 'L2_08' },
    { type: 'hieroglyph', label: 'Ankh, Was Staff & Djed Pillar', jewelMesh: null, directUp: 'L2_08' },
    { type: 'stairs', label: 'Chariot Wheels (Steps to Level 2)', jewelMesh: null, upSpaceId: 'L2_09', directUp: 'L2_09' },
    { type: 'hieroglyph', label: 'Sacred Scepter & Three Cobras', jewelMesh: null, directUp: 'L2_10' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_07', directUp: 'L2_10' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_11' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_08', directUp: 'L2_12' },
  ];
  for (let i = 0; i < 9; i++) {
    const y0 = wy1[i], y1 = wy1[i + 1];
    addSpace({
      id: `L1_${String(6 + i).padStart(2, '0')}`,
      level: 1, indexOnLevel: 6 + i,
      type: e1Meta[i].type,
      label: e1Meta[i].label,
      jewelMesh: e1Meta[i].jewelMesh,
      px: 450.0, py: 0.5 * (y0 + y1),
      rect: [431, y0, 469, y1],
      upSpaceId: e1Meta[i].upSpaceId || null,
      directUpSpaceId: e1Meta[i].directUp,
    });
  }

  // 15: SE Yellow Lotus Corner
  addSpace({
    id: 'L1_15', level: 1, indexOnLevel: 15,
    type: 'corner_home', homeColor: 'yellow', label: 'Yellow Lotus Corner (Anubis Home)',
    px: 407, py: 617, rect: [341, 582, 463, 646],
    upSpaceId: 'L2_13', directUpSpaceId: 'L2_13',
  });

  // 16..19: South Level 1 (4 tiles right-to-left in clockwise order)
  const s1Meta = [
    { j: 3, type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_14' },
    { j: 2, type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_12', upSpaceId: 'L2_15', directUp: 'L2_15' },
    { j: 1, type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_11', directUp: 'L2_16' },
    { j: 0, type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_17' },
  ];
  for (let k = 0; k < 4; k++) {
    const j = s1Meta[k].j;
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L1_${String(16 + k).padStart(2, '0')}`,
      level: 1, indexOnLevel: 16 + k,
      type: s1Meta[k].type,
      label: s1Meta[k].label,
      jewelMesh: s1Meta[k].jewelMesh,
      px: 0.5 * (x0 + x1), py: 634.0,
      rect: [x0, 616, x1, 652],
      upSpaceId: s1Meta[k].upSpaceId || null,
      directUpSpaceId: s1Meta[k].directUp,
    });
  }

  // 20: SW Green Lotus Corner
  addSpace({
    id: 'L1_20', level: 1, indexOnLevel: 20,
    type: 'corner_home', homeColor: 'green', label: 'Green Lotus Corner (Osiris Home)',
    px: 62, py: 617, rect: [6, 582, 128, 646],
    upSpaceId: 'L2_18', directUpSpaceId: 'L2_18',
  });

  // 21..29: West Level 1 (9 tiles bottom-to-top in clockwise order, i = 8 down to 0)
  const w1MetaByRow = [
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_01', directUp: 'L2_25' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_24' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_02', directUp: 'L2_23' },
    { type: 'hieroglyph', label: 'Sacred Scepter & Three Cobras', jewelMesh: null, directUp: 'L2_23' },
    { type: 'stairs', label: 'Chariot Wheels (Steps to Level 2)', jewelMesh: null, upSpaceId: 'L2_22', directUp: 'L2_22' },
    { type: 'hieroglyph', label: 'Ankh, Was Staff & Djed Pillar', jewelMesh: null, directUp: 'L2_21' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_03', directUp: 'L2_21' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directUp: 'L2_20' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_04', directUp: 'L2_19' },
  ];
  for (let k = 0; k < 9; k++) {
    const rowIdx = 8 - k;
    const y0 = wy1[rowIdx], y1 = wy1[rowIdx + 1];
    const m = w1MetaByRow[rowIdx];
    addSpace({
      id: `L1_${String(21 + k).padStart(2, '0')}`,
      level: 1, indexOnLevel: 21 + k,
      type: m.type,
      label: m.label,
      jewelMesh: m.jewelMesh,
      px: 19.0, py: 0.5 * (y0 + y1),
      rect: [0, y0, 38, y1],
      upSpaceId: m.upSpaceId || null,
      directUpSpaceId: m.directUp,
    });
  }

  // =========================================================================
  // LEVEL 2 (26 Spaces clockwise: L2_00 to L2_25)
  // =========================================================================
  // 0: NW Level 2 Corner Landing
  addSpace({
    id: 'L2_00', level: 2, indexOnLevel: 0,
    type: 'corner_landing', label: 'NW Middle Corner Landing',
    px: 88, py: 90, rect: [50, 52, 128, 132],
    downSpaceId: 'L1_00', upSpaceId: 'L3_00',
    directDownSpaceId: 'L1_00', directUpSpaceId: 'L3_00',
  });

  // 1..4: North Level 2 (4 tiles left-to-right)
  const n2Meta = [
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_17', directDown: 'L1_01', directUp: 'L3_01' },
    { type: 'stairs', label: 'Ibis Bird (Steps to Level 1 & 3)', jewelMesh: null, downSpaceId: 'L1_02', upSpaceId: 'L3_02', directDown: 'L1_02', directUp: 'L3_02' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_03', directUp: 'L3_03' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_18', directDown: 'L1_04', directUp: 'L3_04' },
  ];
  for (let j = 0; j < 4; j++) {
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L2_${String(1 + j).padStart(2, '0')}`,
      level: 2, indexOnLevel: 1 + j,
      type: n2Meta[j].type,
      label: n2Meta[j].label,
      jewelMesh: n2Meta[j].jewelMesh,
      px: 0.5 * (x0 + x1), py: 61.0,
      rect: [x0, 42, x1, 78],
      downSpaceId: n2Meta[j].downSpaceId || null,
      upSpaceId: n2Meta[j].upSpaceId || null,
      directDownSpaceId: n2Meta[j].directDown,
      directUpSpaceId: n2Meta[j].directUp,
    });
  }

  // 5: NE Level 2 Corner Landing
  addSpace({
    id: 'L2_05', level: 2, indexOnLevel: 5,
    type: 'corner_landing', label: 'NE Middle Corner Landing',
    px: 381, py: 90, rect: [341, 52, 419, 132],
    downSpaceId: 'L1_05', upSpaceId: 'L3_05',
    directDownSpaceId: 'L1_05', directUpSpaceId: 'L3_05',
  });

  // 6..12: East Level 2 (7 tiles top-to-bottom)
  const e2Meta = [
    { type: 'hieroglyph', label: 'Sacred Serpent & Scepter', jewelMesh: null, directDown: 'L1_06', directUp: 'L3_06' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_07', directUp: 'L3_07' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_15', directDown: 'L1_08', directUp: 'L3_08' },
    { type: 'stairs', label: 'Waters of Nile (Steps to Level 1)', jewelMesh: null, downSpaceId: 'L1_10', directDown: 'L1_10', directUp: 'L3_09' },
    { type: 'stairs', label: "Pharaoh's Crook (Steps to Level 3)", jewelMesh: null, upSpaceId: 'L3_10', directDown: 'L1_11', directUp: 'L3_10' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_13', directUp: 'L3_11' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_16', directDown: 'L1_14', directUp: 'L3_12' },
  ];
  for (let i = 0; i < 7; i++) {
    const y0 = wy23[i], y1 = wy23[i + 1];
    addSpace({
      id: `L2_${String(6 + i).padStart(2, '0')}`,
      level: 2, indexOnLevel: 6 + i,
      type: e2Meta[i].type,
      label: e2Meta[i].label,
      jewelMesh: e2Meta[i].jewelMesh,
      px: 407.0, py: 0.5 * (y0 + y1),
      rect: [391, y0, 429, y1],
      downSpaceId: e2Meta[i].downSpaceId || null,
      upSpaceId: e2Meta[i].upSpaceId || null,
      directDownSpaceId: e2Meta[i].directDown,
      directUpSpaceId: e2Meta[i].directUp,
    });
  }

  // 13: SE Level 2 Corner Landing
  addSpace({
    id: 'L2_13', level: 2, indexOnLevel: 13,
    type: 'corner_landing', label: 'SE Middle Corner Landing',
    px: 381, py: 562, rect: [341, 520, 419, 600],
    downSpaceId: 'L1_15', upSpaceId: 'L3_13',
    directDownSpaceId: 'L1_15', directUpSpaceId: 'L3_13',
  });

  // 14..17: South Level 2 (4 tiles right-to-left in clockwise order)
  const s2Meta = [
    { j: 3, type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_20', directDown: 'L1_16', directUp: 'L3_14' },
    { j: 2, type: 'stairs', label: 'Ibis Bird (Steps to Level 1 & 3)', jewelMesh: null, downSpaceId: 'L1_17', upSpaceId: 'L3_15', directDown: 'L1_17', directUp: 'L3_15' },
    { j: 1, type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_18', directUp: 'L3_16' },
    { j: 0, type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_19', directDown: 'L1_19', directUp: 'L3_17' },
  ];
  for (let k = 0; k < 4; k++) {
    const j = s2Meta[k].j;
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L2_${String(14 + k).padStart(2, '0')}`,
      level: 2, indexOnLevel: 14 + k,
      type: s2Meta[k].type,
      label: s2Meta[k].label,
      jewelMesh: s2Meta[k].jewelMesh,
      px: 0.5 * (x0 + x1), py: 591.0,
      rect: [x0, 574, x1, 610],
      downSpaceId: s2Meta[k].downSpaceId || null,
      upSpaceId: s2Meta[k].upSpaceId || null,
      directDownSpaceId: s2Meta[k].directDown,
      directUpSpaceId: s2Meta[k].directUp,
    });
  }

  // 18: SW Level 2 Corner Landing
  addSpace({
    id: 'L2_18', level: 2, indexOnLevel: 18,
    type: 'corner_landing', label: 'SW Middle Corner Landing',
    px: 88, py: 562, rect: [50, 520, 128, 600],
    downSpaceId: 'L1_20', upSpaceId: 'L3_18',
    directDownSpaceId: 'L1_20', directUpSpaceId: 'L3_18',
  });

  // 19..25: West Level 2 (7 tiles bottom-to-top in clockwise order, rowIdx = 6 down to 0)
  const w2MetaByRow = [
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_13', directDown: 'L1_29', directUp: 'L3_25' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_28', directUp: 'L3_24' },
    { type: 'stairs', label: "Pharaoh's Crook (Steps to Level 3)", jewelMesh: null, upSpaceId: 'L3_23', directDown: 'L1_27', directUp: 'L3_23' },
    { type: 'stairs', label: 'Waters of Nile (Steps to Level 1)', jewelMesh: null, downSpaceId: 'L1_25', directDown: 'L1_25', directUp: 'L3_22' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_14', directDown: 'L1_23', directUp: 'L3_21' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L1_22', directUp: 'L3_20' },
    { type: 'hieroglyph', label: 'Sacred Serpent & Scepter', jewelMesh: null, directDown: 'L1_21', directUp: 'L3_19' },
  ];
  for (let k = 0; k < 7; k++) {
    const rowIdx = 6 - k;
    const y0 = wy23[rowIdx], y1 = wy23[rowIdx + 1];
    const m = w2MetaByRow[rowIdx];
    addSpace({
      id: `L2_${String(19 + k).padStart(2, '0')}`,
      level: 2, indexOnLevel: 19 + k,
      type: m.type,
      label: m.label,
      jewelMesh: m.jewelMesh,
      px: 62.0, py: 0.5 * (y0 + y1),
      rect: [40, y0, 78, y1],
      downSpaceId: m.downSpaceId || null,
      upSpaceId: m.upSpaceId || null,
      directDownSpaceId: m.directDown,
      directUpSpaceId: m.directUp,
    });
  }

  // =========================================================================
  // LEVEL 3 (26 Spaces clockwise: L3_00 to L3_25)
  // =========================================================================
  // 0: NW Level 3 Corner Landing
  addSpace({
    id: 'L3_00', level: 3, indexOnLevel: 0,
    type: 'corner_landing', label: 'NW Top Corner Landing',
    px: 108, py: 118, rect: [82, 86, 130, 138],
    downSpaceId: 'L2_00', directDownSpaceId: 'L2_00',
  });

  // 1..4: North Level 3 (4 tiles left-to-right)
  const n3Meta = [
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L2_01' },
    { type: 'stairs', label: 'Solar Barque (Steps to Level 2)', jewelMesh: null, downSpaceId: 'L2_02', directDown: 'L2_02' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_25', directDown: 'L2_03' },
    { type: 'hieroglyph', label: 'Solar Oval & Twin Reeds', jewelMesh: null, directDown: 'L2_04' },
  ];
  for (let j = 0; j < 4; j++) {
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L3_${String(1 + j).padStart(2, '0')}`,
      level: 3, indexOnLevel: 1 + j,
      type: n3Meta[j].type,
      label: n3Meta[j].label,
      jewelMesh: n3Meta[j].jewelMesh,
      px: 0.5 * (x0 + x1), py: 109.0,
      rect: [x0, 90, x1, 130],
      downSpaceId: n3Meta[j].downSpaceId || null,
      directDownSpaceId: n3Meta[j].directDown,
    });
  }

  // 5: NE Level 3 Corner Landing
  addSpace({
    id: 'L3_05', level: 3, indexOnLevel: 5,
    type: 'corner_landing', label: 'NE Top Corner Landing',
    px: 361, py: 118, rect: [339, 86, 387, 138],
    downSpaceId: 'L2_05', directDownSpaceId: 'L2_05',
  });

  // 6..12: East Level 3 (7 tiles top-to-bottom)
  const e3Meta = [
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L2_06' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_23', directDown: 'L2_07' },
    { type: 'hieroglyph', label: 'Sun Disc & Twin Serpents', jewelMesh: null, directDown: 'L2_08' },
    { type: 'hieroglyph', label: 'Winged Uraeus Sun Disc', jewelMesh: null, directDown: 'L2_09' },
    { type: 'stairs', label: 'Royal Falcon of Horus (Steps to Level 2)', jewelMesh: null, downSpaceId: 'L2_10', directDown: 'L2_10' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_24', directDown: 'L2_11' },
    { type: 'great_jewel', label: 'GREAT JEWEL SPACE (Chalice of the Mummy)', jewelMesh: null, directDown: 'L2_12' },
  ];
  for (let i = 0; i < 7; i++) {
    const y0 = wy23[i], y1 = wy23[i + 1];
    addSpace({
      id: `L3_${String(6 + i).padStart(2, '0')}`,
      level: 3, indexOnLevel: 6 + i,
      type: e3Meta[i].type,
      label: e3Meta[i].label,
      jewelMesh: e3Meta[i].jewelMesh,
      px: 363.0, py: 0.5 * (y0 + y1),
      rect: [345, y0, 386, y1],
      downSpaceId: e3Meta[i].downSpaceId || null,
      directDownSpaceId: e3Meta[i].directDown,
    });
  }

  // 13: SE Level 3 Corner Landing
  addSpace({
    id: 'L3_13', level: 3, indexOnLevel: 13,
    type: 'corner_landing', label: 'SE Top Corner Landing',
    px: 361, py: 534, rect: [339, 514, 387, 566],
    downSpaceId: 'L2_13', directDownSpaceId: 'L2_13',
  });

  // 14..17: South Level 3 (4 tiles right-to-left in clockwise order)
  const s3Meta = [
    { j: 3, type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L2_14' },
    { j: 2, type: 'stairs', label: 'Solar Barque (Steps to Level 2)', jewelMesh: null, downSpaceId: 'L2_15', directDown: 'L2_15' },
    { j: 1, type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_26', directDown: 'L2_16' },
    { j: 0, type: 'hieroglyph', label: 'Solar Oval & Twin Reeds', jewelMesh: null, directDown: 'L2_17' },
  ];
  for (let k = 0; k < 4; k++) {
    const j = s3Meta[k].j;
    const x0 = nx[j], x1 = nx[j + 1];
    addSpace({
      id: `L3_${String(14 + k).padStart(2, '0')}`,
      level: 3, indexOnLevel: 14 + k,
      type: s3Meta[k].type,
      label: s3Meta[k].label,
      jewelMesh: s3Meta[k].jewelMesh,
      px: 0.5 * (x0 + x1), py: 543.0,
      rect: [x0, 522, x1, 562],
      downSpaceId: s3Meta[k].downSpaceId || null,
      directDownSpaceId: s3Meta[k].directDown,
    });
  }

  // 18: SW Level 3 Corner Landing
  addSpace({
    id: 'L3_18', level: 3, indexOnLevel: 18,
    type: 'corner_landing', label: 'SW Top Corner Landing',
    px: 108, py: 534, rect: [82, 514, 130, 566],
    downSpaceId: 'L2_18', directDownSpaceId: 'L2_18',
  });

  // 19..25: West Level 3 (7 tiles bottom-to-top in clockwise order, rowIdx = 6 down to 0)
  const w3MetaByRow = [
    { type: 'great_jewel', label: 'GREAT JEWEL SPACE (Chalice of the Mummy)', jewelMesh: null, directDown: 'L2_25' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_21', directDown: 'L2_24' },
    { type: 'stairs', label: 'Royal Falcon of Horus (Steps to Level 2)', jewelMesh: null, downSpaceId: 'L2_23', directDown: 'L2_23' },
    { type: 'hieroglyph', label: 'Winged Uraeus Sun Disc', jewelMesh: null, directDown: 'L2_22' },
    { type: 'hieroglyph', label: 'Sun Disc & Twin Serpents', jewelMesh: null, directDown: 'L2_21' },
    { type: 'jewel', label: 'Precious Jewel (Winged Scarab)', jewelMesh: 'Scarab_Jewel_22', directDown: 'L2_20' },
    { type: 'mummy_head', label: "Mummy's Head", jewelMesh: null, directDown: 'L2_19' },
  ];
  for (let k = 0; k < 7; k++) {
    const rowIdx = 6 - k;
    const y0 = wy23[rowIdx], y1 = wy23[rowIdx + 1];
    const m = w3MetaByRow[rowIdx];
    addSpace({
      id: `L3_${String(19 + k).padStart(2, '0')}`,
      level: 3, indexOnLevel: 19 + k,
      type: m.type,
      label: m.label,
      jewelMesh: m.jewelMesh,
      px: 106.0, py: 0.5 * (y0 + y1),
      rect: [83, y0, 124, y1],
      downSpaceId: m.downSpaceId || null,
      directDownSpaceId: m.directDown,
    });
  }

  // Link clockwise nextSpaceId and counter-clockwise prevSpaceId within each level
  const levels = [1, 2, 3];
  for (const lvl of levels) {
    const ring = spaces.filter((s) => s.level === lvl);
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      ring[i].nextSpaceId = ring[(i + 1) % n].id;
      ring[i].prevSpaceId = ring[(i - 1 + n) % n].id;
    }
  }

  return { spaces, byId };
}

export const { spaces: BOARD_SPACES, byId: SPACES_BY_ID } = buildBoardSpaces();

export const TOP_LEVEL_JEWEL_IDS = BOARD_SPACES
  .filter((s) => s.level === 3 && s.type === 'jewel')
  .map((s) => s.id);

/**
 * All 20 original 1971 Side A Audio Tracks (Part I of the Game)
 */
export const SIDE_A_TRACKS = [
  {
    id: 'A01',
    side: 'SideA',
    title: '13 Garrotted Slaves',
    url: 'votm-tracks/SideA/13%20Garrotted%20Slaves.mp3',
    transcript: 'You have reached the Tower of the 13 Garrotted Slaves. Move up one level.',
    effect: { action: 'move_level', delta: 1 },
  },
  {
    id: 'A02',
    side: 'SideA',
    title: 'Black Waters of Necron',
    url: 'votm-tracks/SideA/Black%20Waters%20Necron.mp3',
    transcript: 'Beware! The Black Waters of Necron hunger for a victim. Take one jewel.',
    effect: { action: 'take_jewels', count: 1 },
  },
  {
    id: 'A03',
    side: 'SideA',
    title: 'Bottomless Pit',
    url: 'votm-tracks/SideA/Bottomless%20Pit.mp3',
    transcript: 'Stumble into the Bottomless Pit. Watch out! Move up one level.',
    effect: { action: 'move_level', delta: 1 },
  },
  {
    id: 'A04',
    side: 'SideA',
    title: 'Canyon of Grass',
    url: 'votm-tracks/SideA/Canyon%20of%20Grass.mp3',
    transcript: 'The Canyon of Grass has trapped your opponents. Take one jewel from each opponent.',
    effect: { action: 'take_from_each_opponent', count: 1 },
  },
  {
    id: 'A05',
    side: 'SideA',
    title: 'Crumbling Cliffs of Kaa',
    url: 'votm-tracks/SideA/Crumbling%20Cliffs.mp3',
    transcript: 'To stay safe on the Crumbling Cliffs of Kaa, you must give one jewel to an opponent.',
    effect: { action: 'give_to_one_opponent', count: 1 },
  },
  {
    id: 'A06',
    side: 'SideA',
    title: 'Dog-Headed Serpent',
    url: 'votm-tracks/SideA/Dog%20Headed%20Serpent.mp3',
    transcript: 'Bravo! You have outrun the slimy Dog-Headed Serpent. Take two jewels.',
    effect: { action: 'take_jewels', count: 2 },
  },
  {
    id: 'A07',
    side: 'SideA',
    title: 'Fierce Felines of Pharaoh',
    url: 'votm-tracks/SideA/Fierce%20Felines%20Pharoah.mp3',
    transcript: 'Beware of the fierce Felines of Pharaoh. Take three jewels if your age is an even number.',
    effect: { action: 'take_jewels_conditional', count: 3, condition: 'even_age', promptText: 'Is your age an EVEN number?' },
  },
  {
    id: 'A08',
    side: 'SideA',
    title: 'Fierce Tuareg',
    url: 'votm-tracks/SideA/Fierce%20Toreg.mp3',
    transcript: 'You are being attacked by the fierce Tuareg. Run! Take a jewel or change a level.',
    effect: { action: 'choice_jewel_or_level', count: 1 },
  },
  {
    id: 'A09',
    side: 'SideA',
    title: 'Great God Ra',
    url: 'votm-tracks/SideA/Great%20God%20Ra.mp3',
    transcript: 'Listen! The Great God Ra stirs the wind for a sandstorm. Save yourself! Take one jewel.',
    effect: { action: 'take_jewels', count: 1 },
  },
  {
    id: 'A10',
    side: 'SideA',
    title: 'Knives of the Desert Bandits',
    url: 'votm-tracks/SideA/Knives%20Desert%20Bandits.mp3',
    transcript: 'The knives of the Desert Bandits are sharp, and your blood is warm. Return to your temple.',
    effect: { action: 'return_to_temple' },
  },
  {
    id: 'A11',
    side: 'SideA',
    title: 'Leeches of Limbo',
    url: 'votm-tracks/SideA/Leeches%20Of%20Limbo.mp3',
    transcript: 'Your blood will be drained by the Leeches of Limbo. Take one jewel or change a level.',
    effect: { action: 'choice_jewel_or_level', count: 1 },
  },
  {
    id: 'A12',
    side: 'SideA',
    title: 'Lost Souls',
    url: 'votm-tracks/SideA/Lost%20Souls.mp3',
    transcript: 'Listen to the Lost Souls whispering in eternal darkness. Take one jewel.',
    effect: { action: 'take_jewels', count: 1 },
  },
  {
    id: 'A13',
    side: 'SideA',
    title: 'One-Eyed Giant Mandrill',
    url: 'votm-tracks/SideA/One%20Eyed%20Mandrill.mp3',
    transcript: 'You have escaped the crushing grip of the One-Eyed Giant Mandrill. Take three jewels.',
    effect: { action: 'take_jewels', count: 3 },
  },
  {
    id: 'A14',
    side: 'SideA',
    title: 'River of Glass',
    url: 'votm-tracks/SideA/River%20of%20Glass.mp3',
    transcript: 'Here runs the River of Glass. Its waves are sharp. Beware! Move up one level.',
    effect: { action: 'move_level', delta: 1 },
  },
  {
    id: 'A15',
    side: 'SideA',
    title: 'Screeching Green Pestilence',
    url: 'votm-tracks/SideA/Screeching%20Green%20Pestilence.mp3',
    transcript: 'The Screeching Green Pestilence brings death. Take three jewels if your age is an odd number.',
    effect: { action: 'take_jewels_conditional', count: 3, condition: 'odd_age', promptText: 'Is your age an ODD number?' },
  },
  {
    id: 'A16',
    side: 'SideA',
    title: 'Secret Passage',
    url: 'votm-tracks/SideA/Secret%20Passage.mp3',
    transcript: 'You are lucky! You have found the Secret Passage. Take two jewels.',
    effect: { action: 'take_jewels', count: 2 },
  },
  {
    id: 'A17',
    side: 'SideA',
    title: 'Slimy Snails of Arrow',
    url: 'votm-tracks/SideA/Slimy%20Snails%20Arrow.mp3',
    transcript: 'Avoid the freezing touch of the Slimy Snails of Arrow. Return at once to your temple.',
    effect: { action: 'return_to_temple' },
  },
  {
    id: 'A18',
    side: 'SideA',
    title: 'Spirits of the Slain',
    url: 'votm-tracks/SideA/Spirits%20of%20the%20Slain.mp3',
    transcript: 'This is Cratar, where the Spirits of the Slain thirst for revenge. Run! Go up one level.',
    effect: { action: 'move_level', delta: 1 },
  },
  {
    id: 'A19',
    side: 'SideA',
    title: 'Unholy Snakes of Amon',
    url: 'votm-tracks/SideA/Unholy%20Snakes%20Amon.mp3',
    transcript: 'Look out! The Unholy Snakes of Amon reach from below. Move up one level.',
    effect: { action: 'move_level', delta: 1 },
  },
  {
    id: 'A20',
    side: 'SideA',
    title: 'Unseen Wailer',
    url: 'votm-tracks/SideA/Unseen%20Wailer.mp3',
    transcript: 'I am the Unseen Wailer! I will make you deaf! Take a jewel and ignore him.',
    effect: { action: 'take_jewels', count: 1 },
  },
];

/**
 * All 20 original 1971 Side B Audio Tracks (Part II of the Game)
 */
export const SIDE_B_TRACKS = [
  {
    id: 'B01',
    side: 'SideB',
    title: '3-Headed Invisible Dog Kero',
    url: 'votm-tracks/SideB/3%20Headed%20Dog.mp3',
    transcript: "You must pass the three-headed invisible dog Kero, who guards Prince Torigo's Palace. Go down one level.",
    effect: { action: 'move_level', delta: -1 },
  },
  {
    id: 'B02',
    side: 'SideB',
    title: 'Black Vampire Bat',
    url: 'votm-tracks/SideB/Black%20Vampire%20Bat.mp3',
    transcript: 'The Black Vampire Bat thirsts for your blood. You receive the spell.',
    effect: { action: 'receive_spell' },
  },
  {
    id: 'B03',
    side: 'SideB',
    title: 'Bone-Crushing Elephants',
    url: 'votm-tracks/SideB/Bone%20Crushing%20Elephants.mp3',
    transcript: 'You are menaced by the Sacred Bone-Crushing Elephants. Get rid of the spell, or change your level.',
    effect: { action: 'choice_give_spell_or_level' },
  },
  {
    id: 'B04',
    side: 'SideB',
    title: 'Bridge of Sighs',
    url: 'votm-tracks/SideB/Bridge%20of%20Sighs.mp3',
    transcript: 'You miraculously cross the Bridge of Sighs. Give the spell to any opponent, or change a level.',
    effect: { action: 'choice_give_spell_or_level' },
  },
  {
    id: 'B05',
    side: 'SideB',
    title: 'Dismembered Head of Ro',
    url: 'votm-tracks/SideB/Dismembered%20Head.mp3',
    transcript: 'The Dismembered Head of Ro chants curses. Give the spell to any opponent, or change a level.',
    effect: { action: 'choice_give_spell_or_level' },
  },
  {
    id: 'B06',
    side: 'SideB',
    title: 'Forest of Iron',
    url: 'votm-tracks/SideB/Forest%20of%20Iron.mp3',
    transcript: 'You have entered the Forest of Iron. Take one jewel from each opponent on your level.',
    effect: { action: 'take_from_opponents_on_level', count: 1 },
  },
  {
    id: 'B07',
    side: 'SideB',
    title: 'Giant Octopeds',
    url: 'votm-tracks/SideB/Giant%20Octopus.mp3',
    transcript: "Don't let the Giant Octopeds grab you! They'll never let go. Move quickly! You receive the spell.",
    effect: { action: 'receive_spell' },
  },
  {
    id: 'B08',
    side: 'SideB',
    title: 'Hand of Destiny',
    url: 'votm-tracks/SideB/Hand%20of%20Destiny.mp3',
    transcript: 'The Hand of Destiny reaches for your throat. You receive the spell.',
    effect: { action: 'receive_spell' },
  },
  {
    id: 'B09',
    side: 'SideB',
    title: 'Man-Eating Monster of Murmadon',
    url: 'votm-tracks/SideB/Man%20Eating%20Monster.mp3',
    transcript: 'You have conquered the Man-Eating Monster of Murmadon. Receive one jewel from every opponent on your level.',
    effect: { action: 'take_from_opponents_on_level', count: 1 },
  },
  {
    id: 'B10',
    side: 'SideB',
    title: 'Mills of Doom',
    url: 'votm-tracks/SideB/Mills%20of%20Doom.mp3',
    transcript: 'The Mills of Doom grind on. If you are right-handed only, give the spell to any opponent, or change a level.',
    effect: { action: 'choice_give_spell_or_level_conditional', condition: 'right_handed', promptText: 'Are you RIGHT-HANDED?' },
  },
  {
    id: 'B11',
    side: 'SideB',
    title: 'Mutilated Mummy Speaks',
    url: 'votm-tracks/SideB/Mutilated%20Mummy%20Speaks.mp3',
    transcript: 'The Mutilated Mummy speaks. If you are left-handed only, give the spell to any opponent, or change a level.',
    effect: { action: 'choice_give_spell_or_level_conditional', condition: 'left_handed', promptText: 'Are you LEFT-HANDED?' },
  },
  {
    id: 'B12',
    side: 'SideB',
    title: 'Quicksands of El Hara',
    url: 'votm-tracks/SideB/Quicksands.mp3',
    transcript: 'Beware! You are surrounded by the Quicksands of El Hara. Move down one level.',
    effect: { action: 'move_level', delta: -1 },
  },
  {
    id: 'B13',
    side: 'SideB',
    title: "Siren's Deadly Song",
    url: 'votm-tracks/SideB/Sirens%20Deadly%20Song.mp3',
    transcript: "The Siren's deadly song will make you deaf. Get rid of the spell, or change your level.",
    effect: { action: 'choice_give_spell_or_level' },
  },
  {
    id: 'B14',
    side: 'SideB',
    title: 'Sultan of Kamir',
    url: 'votm-tracks/SideB/Sultin%20of%20Kamir.mp3',
    transcript: 'The Sultan of Kamir has captured you. As ransom, give one jewel to every opponent on your level.',
    effect: { action: 'give_to_opponents_on_level', count: 1 },
  },
  {
    id: 'B15',
    side: 'SideB',
    title: 'Surrounded by Evil',
    url: 'votm-tracks/SideB/Surrounded%20by%20Evil.mp3',
    transcript: 'You are completely surrounded by evil. Take another turn, or change a level.',
    effect: { action: 'choice_extra_turn_or_level' },
  },
  {
    id: 'B16',
    side: 'SideB',
    title: 'Tasted Blood',
    url: 'votm-tracks/SideB/Tasted%20Blood.mp3',
    transcript: 'Have you tasted blood? If not, give one jewel to any one opponent.',
    effect: { action: 'give_to_one_opponent_conditional', count: 1, condition: 'not_tasted_blood', promptText: 'Have you TASTED BLOOD?' },
  },
  {
    id: 'B17',
    side: 'SideB',
    title: "Pharaoh's Poisoned Well",
    url: 'votm-tracks/SideB/Thoughtlessly%20Drank.mp3',
    transcript: "You thoughtlessly drank from Pharaoh's poisoned well. You receive the spell.",
    effect: { action: 'receive_spell' },
  },
  {
    id: 'B18',
    side: 'SideB',
    title: 'Abyss of Thundering Fire',
    url: 'votm-tracks/SideB/Thundering%20Fire.mp3',
    transcript: 'You have succeeded in vaulting the Abyss of Thundering Fire. Take one jewel from any opponent.',
    effect: { action: 'take_from_one_opponent', count: 1 },
  },
  {
    id: 'B19',
    side: 'SideB',
    title: 'Winged Griffins',
    url: 'votm-tracks/SideB/Winged%20Griffins.mp3',
    transcript: 'You fed the starving Winged Griffins. Give the spell to any opponent, or change a level.',
    effect: { action: 'choice_give_spell_or_level' },
  },
  {
    id: 'B20',
    side: 'SideB',
    title: 'Word from the Gods',
    url: 'votm-tracks/SideB/Word%20from%20the%20Gods.mp3',
    transcript: 'A word from the Gods is clear: your time on Earth is limited. Move down one level.',
    effect: { action: 'move_level', delta: -1 },
  },
];
