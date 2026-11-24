export const OUTFITS = [
  { name: 'Terracotta', color: '#a34f3c', trim: '#f2ba82', trousers: '#302e36' },
  { name: 'River teal', color: '#3d7775', trim: '#d3b58a', trousers: '#25383d' },
  { name: 'Indigo', color: '#435076', trim: '#b4b9df', trousers: '#2e324d' },
  { name: 'Moss', color: '#636d42', trim: '#dfc994', trousers: '#353d30' },
  { name: 'Plum', color: '#844963', trim: '#edb2bf', trousers: '#322838' },
  { name: 'Ivory', color: '#d8c8ab', trim: '#a56959', trousers: '#453c35' },
  { name: 'Blossom', color: '#c37d94', trim: '#f7dacf', trousers: '#62445c' },
  { name: 'Wisteria', color: '#8c79ae', trim: '#e4c5ec', trousers: '#473852' },
  { name: 'Sunflower', color: '#cc9550', trim: '#fff0c0', trousers: '#564334' },
  { name: 'Sea glass', color: '#78a497', trim: '#e1eed4', trousers: '#405c56' },
  { name: 'Midnight', color: '#343951', trim: '#dbc093', trousers: '#252733' },
  { name: 'Pomegranate', color: '#983e56', trim: '#f4bd9a', trousers: '#482d40' },
];

export const SKINS = [
  { name: 'Fair', color: '#f2cfb4' },
  { name: 'Light', color: '#d8a785' },
  { name: 'Medium', color: '#b98462' },
  { name: 'Deep', color: '#86533d' },
  { name: 'Rich', color: '#5c382e' },
  { name: 'Porcelain', color: '#f8dfd0' },
  { name: 'Warm peach', color: '#e7b699' },
  { name: 'Golden', color: '#c79469' },
  { name: 'Olive', color: '#b58667' },
  { name: 'Bronze', color: '#a16c4f' },
  { name: 'Umber', color: '#714a3c' },
  { name: 'Deep cocoa', color: '#49302a' },
];

export const HAIR_COLORS = [
  { name: 'Black', color: '#2a2528' }, { name: 'Dark brown', color: '#4b3030' },
  { name: 'Chestnut', color: '#774331' }, { name: 'Copper', color: '#a75439' },
  { name: 'Honey', color: '#cf9e5b' }, { name: 'Pale gold', color: '#e4cba0' },
  { name: 'Silver', color: '#c8c1c8' }, { name: 'Rose', color: '#b76784' },
  { name: 'Violet', color: '#6f547e' }, { name: 'Deep teal', color: '#325858' },
];

export const EYES = [
  { name: 'Dark brown', color: '#4b3027' }, { name: 'Amber', color: '#a77541' },
  { name: 'Hazel', color: '#827052' }, { name: 'Forest green', color: '#557554' },
  { name: 'Lake blue', color: '#4f7e9a' }, { name: 'Slate gray', color: '#697580' },
  { name: 'Violet', color: '#7b658e' },
];

export const FACES = [
  { name: 'Soft', taper: 0.78, width: 0.382, eyeSize: 1.03 },
  { name: 'Round', taper: 0.91, width: 0.406, eyeSize: 1.11 },
  { name: 'Heart', taper: 0.69, width: 0.397, eyeSize: 1.06 },
  { name: 'Square', taper: 0.99, width: 0.389, eyeSize: 0.9 },
];

export const EXPRESSIONS = [
  { name: 'Calm', eyes: ['open', 'open'], brows: [0, 0], mouth: 'rest' },
  { name: 'Soft smile', eyes: ['open', 'open'], brows: [0, 0], mouth: 'smile' },
  { name: 'Big smile', eyes: ['soft', 'soft'], brows: [-2, -2], mouth: 'grin' },
  { name: 'Wink', eyes: ['happy', 'open'], brows: [0, -5], mouth: 'smile' },
  { name: 'Curious', eyes: ['wide', 'open'], brows: [-9, 1], mouth: 'curious' },
  { name: 'Focused', eyes: ['soft', 'soft'], brows: [4, 4], mouth: 'firm' },
  { name: 'Surprised', eyes: ['wide', 'wide'], brows: [-10, -10], mouth: 'surprised' },
  { name: 'Laughing', eyes: ['happy', 'happy'], brows: [-4, -4], mouth: 'laugh' },
];

export const HAIR = ['Short sweep', 'Topknot', 'Chin-length bob', 'Shoulder waves', 'Long waves', 'High ponytail',
  'Side braid', 'Twin braids', 'Double buns', 'Long straight', 'Cropped curls'];
export const ACCESSORIES = ['None', 'Straw hat', 'Blossom clip', 'Silk ribbon', 'Gold comb', 'Jade earrings', 'Silk head scarf', 'Silver hoops'];
export const GARMENTS = ['Traveler jacket', 'Blossom dress', 'Wrap dress', 'Pleated skirt', 'Festival dress',
  'Garden tunic', 'Embroidered gown', 'Long vest', 'Layered skirt'];
export const FACE_DETAILS = ['Natural', 'Freckles', 'Rosy cheeks', 'Lashes', 'Lashes & blush'];

export const LOOK_CHOICES = {
  face: FACES, skin: SKINS, eyes: EYES, expression: EXPRESSIONS, detail: FACE_DETAILS,
  hair: HAIR, hairColor: HAIR_COLORS, accessory: ACCESSORIES, garment: GARMENTS, outfit: OUTFITS,
};

export const DEFAULT_LOOK = {
  version: 2, face: 3, skin: 1, eyes: 0, expression: 0, detail: 0,
  hair: 0, hairColor: 0, accessory: 1, garment: 0, outfit: 0,
};

export const PRESETS = [
  { name: 'Blossom', description: 'Long waves & blossom dress', look: { ...DEFAULT_LOOK, face: 2, skin: 6, eyes: 4,
    expression: 1, detail: 4, hair: 4, hairColor: 2, accessory: 2, garment: 1, outfit: 6 } },
  { name: 'Lantern', description: 'Double buns & festival dress', look: { ...DEFAULT_LOOK, face: 0, skin: 2, eyes: 0,
    expression: 2, detail: 3, hair: 8, hairColor: 0, accessory: 4, garment: 4, outfit: 11 } },
  { name: 'River', description: 'Side braid & wrap dress', look: { ...DEFAULT_LOOK, face: 1, skin: 4, eyes: 1,
    expression: 3, detail: 1, hair: 6, hairColor: 1, accessory: 5, garment: 2, outfit: 9 } },
  { name: 'Wisteria', description: 'Silver bob & embroidered gown', look: { ...DEFAULT_LOOK, face: 0, skin: 5, eyes: 6,
    expression: 1, detail: 4, hair: 2, hairColor: 6, accessory: 7, garment: 6, outfit: 7 } },
  { name: 'Cedar', description: 'Straw hat & traveler jacket', look: { ...DEFAULT_LOOK } },
];

const lookFields = Object.entries(LOOK_CHOICES);
const validIndex = (value, count) => Number.isInteger(value) && value >= 0 && value < count;

export function readAppearance(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.version === 2 && lookFields.every(([key, choices]) => validIndex(value[key], choices.length))) {
    return Object.fromEntries([['version', 2], ...lookFields.map(([key]) => [key, value[key]])]);
  }
  if (value.version == null && validIndex(value.outfit, 6) && validIndex(value.skin, 5) && validIndex(value.head, 3)) {
    return { ...DEFAULT_LOOK, outfit: value.outfit, skin: value.skin, hair: value.head === 1 ? 1 : 0,
      accessory: value.head === 2 ? 1 : 0 };
  }
  return null;
}

export const CAMERAS = [
  { name: 'Third person', short: 'Follow', distance: 4, height: 0.29, shoulder: 1.0, fov: 60 },
  { name: 'Wide view', short: 'Wide', distance: 6.6, height: 1.45, shoulder: 0.45, fov: 58 },
  { name: 'First person', short: 'First person' },
];
