/**
 * Complete Character Creator, Layered Avatar Renderer, Seasonal Costume Shop & Victory Chest System
 * Supports:
 * - Character Identity: Gender (Male, Female, Non-Binary), Age (Youth, Adult, Mature, Elder Sage),
 *   Skin Tone, Hair Style, Hair Color, Eye Color
 * - Equippable Shop Costumes: Hats/Crowns, Outfits/Robes, Held Props/Pets, Background Auras
 * - Topical Monthly Collections (October Halloween, December Christmas, Grand Hall Classics)
 */

export const DEFAULT_CHARACTER = {
  gender: 'male',        // 'male' | 'female' | 'nonbinary'
  age: 'adult',          // 'youth' | 'adult' | 'mature' | 'elder'
  skinTone: 'warm',      // 'fair' | 'warm' | 'golden' | 'deep' | 'elf'
  hairStyle: 'wavy',     // 'short' | 'wavy' | 'long' | 'braids' | 'spiky' | 'bun'
  hairColor: 'brown',    // 'black' | 'brown' | 'blonde' | 'auburn' | 'silver' | 'violet'
  eyeColor: 'sapphire',  // 'sapphire' | 'emerald' | 'amber' | 'violet' | 'crimson'
  facialHair: 'none'     // 'none' | 'stubble' | 'mustache' | 'wizard_beard'
};

export const DEFAULT_EQUIPPED = {
  aura: 'aura_sanctuary',
  outfit: 'outfit_novice',
  hat: 'hat_none',
  prop: 'prop_wand'
};

export const STARTER_UNLOCKED = [
  'aura_sanctuary',
  'outfit_novice',
  'hat_none',
  'hat_wizard_blue',
  'prop_wand'
];

export const CHARACTER_OPTIONS = {
  genders: [
    { id: 'male', label: '♂️ Male' },
    { id: 'female', label: '♀️ Female' },
    { id: 'nonbinary', label: '⚧️ Non-Binary' }
  ],
  ages: [
    { id: 'youth', label: 'Young Apprentice' },
    { id: 'adult', label: 'Prime Duelist' },
    { id: 'mature', label: 'Seasoned Master' },
    { id: 'elder', label: 'Ancient Sage' }
  ],
  skinTones: [
    { id: 'fair', label: 'Alabaster Rose', color: '#fde2ce', blush: '#fb7185' },
    { id: 'warm', label: 'Warm Peach', color: '#f3c69f', blush: '#f43f5e' },
    { id: 'golden', label: 'Sunlit Bronze', color: '#d99b66', blush: '#e11d48' },
    { id: 'deep', label: 'Obsidian Umber', color: '#8d5524', blush: '#be123c' },
    { id: 'elf', label: 'Astral Lavender', color: '#c4b5fd', blush: '#9333ea' }
  ],
  hairStyles: [
    { id: 'short', label: 'Short Crop' },
    { id: 'wavy', label: 'Adventurer Waves' },
    { id: 'long', label: 'Flowing Locks' },
    { id: 'spiky', label: 'Battlemage Spikes' },
    { id: 'bun', label: 'Scholarly Crown Bun' },
    { id: 'bald', label: 'Monastic Shaved' }
  ],
  hairColors: [
    { id: 'black', label: 'Raven Black', hex: '#18181b' },
    { id: 'brown', label: 'Chestnut Brown', hex: '#5c3a21' },
    { id: 'blonde', label: 'Golden Blonde', hex: '#eab308' },
    { id: 'auburn', label: 'Fiery Auburn', hex: '#b91c1c' },
    { id: 'silver', label: 'Elder Silver', hex: '#e2e8f0' },
    { id: 'violet', label: 'Arcane Violet', hex: '#9333ea' }
  ],
  eyeColors: [
    { id: 'sapphire', label: 'Sapphire Blue', hex: '#2563eb' },
    { id: 'emerald', label: 'Emerald Green', hex: '#059669' },
    { id: 'amber', label: 'Dragon Amber', hex: '#d97706' },
    { id: 'violet', label: 'Mystic Amethyst', hex: '#7c3aed' },
    { id: 'crimson', label: 'Shadow Ruby', hex: '#e11d48' }
  ],
  facialHairs: [
    { id: 'none', label: 'Clean Shaven' },
    { id: 'mustache', label: 'Duelist Mustache' },
    { id: 'goatee', label: 'Noble Goatee' },
    { id: 'wizard_beard', label: 'Grand Wizard Beard' }
  ]
};

/**
 * Returns the active seasonal event based on the current calendar month.
 */
export function getCurrentSeasonInfo(date = new Date()) {
  const month = date.getMonth(); // 0 = Jan, 9 = Oct, 11 = Dec
  if (month === 9) {
    return {
      id: 'halloween',
      title: '🎃 October Event: Haunted Hallows',
      subtitle: 'Win games & keep your daily streak to unlock spooky October costumes!',
      accent: '#f97316',
      badge: 'OCTOBER DROP'
    };
  }
  if (month === 11) {
    return {
      id: 'christmas',
      title: '🎄 December Event: Yuletide & Frostfall',
      subtitle: 'Unlock festive Santa caps, winter coats, reindeer antlers & snow owls!',
      accent: '#ef4444',
      badge: 'DECEMBER DROP'
    };
  }
  if (month === 10) {
    return {
      id: 'halloween',
      title: '🍂 Autumn Harvest & Hallows Encore',
      subtitle: 'Collect seasonal autumn & spooky costumes before winter arrives!',
      accent: '#f59e0b',
      badge: 'AUTUMN EVENT'
    };
  }
  if (month === 0 || month === 1) {
    return {
      id: 'christmas',
      title: '❄️ Winter Solstice & Frostfall',
      subtitle: 'Bundle up your chess champion with winter armor & festive gear!',
      accent: '#38bdf8',
      badge: 'WINTER EVENT'
    };
  }
  return {
    id: 'classic',
    title: '👑 Grand Hall Royal Collection',
    subtitle: 'Open Victory Chests & build daily streaks to dress your avatar!',
    accent: '#a855f7',
    badge: 'FEATURED'
  };
}

/**
 * Catalog of all customizable avatar items across slots and seasons.
 */
export const SHOP_CATALOG = [
  // ==================== HATS / HEADGEAR ====================
  {
    id: 'hat_none',
    name: 'No Hat (Show Hair)',
    slot: 'hat',
    season: 'classic',
    price: 0,
    rarity: 'Starter',
    description: 'Show off your character’s custom hairstyle and hair color.'
  },
  {
    id: 'hat_wizard_blue',
    name: 'Apprentice Pointed Hat',
    slot: 'hat',
    season: 'classic',
    price: 0,
    rarity: 'Starter',
    description: 'Classic stargazer hat issued to all new initiates of the Hall.'
  },
  {
    id: 'hat_pumpkin_crown',
    name: "Jack-o'-Lantern Helm",
    slot: 'hat',
    season: 'halloween',
    price: 80,
    rarity: 'Halloween',
    description: 'A glowing carved pumpkin crown brimming with October mischief.'
  },
  {
    id: 'hat_witch_obsidian',
    name: 'Hexweaver Buckle Hat',
    slot: 'hat',
    season: 'halloween',
    price: 110,
    rarity: 'Halloween',
    description: 'Wide-brimmed midnight witch hat with an enchanted gold buckle.'
  },
  {
    id: 'hat_vampire_crest',
    name: 'Count’s Crimson Top Hat',
    slot: 'hat',
    season: 'halloween',
    price: 140,
    rarity: 'Halloween',
    description: 'Aristocratic velvet top hat worn at the Midnight Gambit Ball.'
  },
  {
    id: 'hat_santa_cap',
    name: 'Enchanted Santa Cap',
    slot: 'hat',
    season: 'christmas',
    price: 90,
    rarity: 'Christmas',
    description: 'Cozy crimson velvet cap trimmed with enchanted winter snow-fur.'
  },
  {
    id: 'hat_reindeer_antlers',
    name: 'Starlight Reindeer Antlers',
    slot: 'hat',
    season: 'christmas',
    price: 125,
    rarity: 'Christmas',
    description: 'Festive antlers hung with glowing ornaments and jingle bells.'
  },
  {
    id: 'hat_grandmaster_crown',
    name: 'Monarch’s Golden Crown',
    slot: 'hat',
    season: 'classic',
    price: 200,
    rarity: 'Legendary',
    description: 'Forged from pure celestial gold for true rulers of the 64 squares.'
  },

  // ==================== OUTFITS / ROBES ====================
  {
    id: 'outfit_novice',
    name: 'Sanctuary Initiate Robe',
    slot: 'outfit',
    season: 'classic',
    price: 0,
    rarity: 'Starter',
    description: 'Comfortable sapphire robe with bronze clasp.'
  },
  {
    id: 'outfit_necromancer',
    name: 'Phantom Cobweb Cloak',
    slot: 'outfit',
    season: 'halloween',
    price: 95,
    rarity: 'Halloween',
    description: 'High-collared dusk cloak stitched with glowing violet runes and skull clasp.'
  },
  {
    id: 'outfit_pumpkin_knight',
    name: 'Harvest Gourd Plate',
    slot: 'outfit',
    season: 'halloween',
    price: 130,
    rarity: 'Halloween',
    description: 'Autumn orange battle-plate forged for Halloween night duels.'
  },
  {
    id: 'outfit_santa_coat',
    name: 'Father Frost Fur Coat',
    slot: 'outfit',
    season: 'christmas',
    price: 110,
    rarity: 'Christmas',
    description: 'Warm festive crimson coat with white fur trim and brass belt.'
  },
  {
    id: 'outfit_elf_tunic',
    name: 'Toymaker’s Emerald Tunic',
    slot: 'outfit',
    season: 'christmas',
    price: 100,
    rarity: 'Christmas',
    description: 'Jolly evergreen tunic with candy-striped collar and golden buttons.'
  },
  {
    id: 'outfit_archmage_gold',
    name: 'High Archmage Regalia',
    slot: 'outfit',
    season: 'classic',
    price: 190,
    rarity: 'Legendary',
    description: 'Imperial white-and-gold vestments worn by Grandmasters of the Hall.'
  },

  // ==================== PROPS / PETS / STAFFS ====================
  {
    id: 'prop_wand',
    name: 'Oakwood Practice Wand',
    slot: 'prop',
    season: 'classic',
    price: 0,
    rarity: 'Starter',
    description: 'A dependable wand that sparks softly when you castle.'
  },
  {
    id: 'prop_ghost_lantern',
    name: 'Will-o’-Wisp Lantern',
    slot: 'prop',
    season: 'halloween',
    price: 85,
    rarity: 'Halloween',
    description: 'An iron lantern housing a friendly floating spooky spirit.'
  },
  {
    id: 'prop_bat_familiar',
    name: 'Vampiric Bat Companion',
    slot: 'prop',
    season: 'halloween',
    price: 120,
    rarity: 'Halloween',
    description: 'A loyal winged midnight bat who squeaks whenever you deliver Check.'
  },
  {
    id: 'prop_candy_staff',
    name: 'Peppermint Arcane Scepter',
    slot: 'prop',
    season: 'christmas',
    price: 85,
    rarity: 'Christmas',
    description: 'Swirled red-and-white candy cane staff topped with a frost star.'
  },
  {
    id: 'prop_snow_owl',
    name: 'Winter Frost Owl',
    slot: 'prop',
    season: 'christmas',
    price: 150,
    rarity: 'Christmas',
    description: 'A wise snowy owl companion perched proudly beside your shoulder.'
  },
  {
    id: 'prop_golden_queen',
    name: 'Levitating Queen Relic',
    slot: 'prop',
    season: 'classic',
    price: 175,
    rarity: 'Epic',
    description: 'A miniature enchanted golden Queen piece orbiting your hand.'
  },

  // ==================== AURAS / BACKGROUNDS ====================
  {
    id: 'aura_sanctuary',
    name: 'Sanctuary Stone Glow',
    slot: 'aura',
    season: 'classic',
    price: 0,
    rarity: 'Starter',
    description: 'Calm twilight backdrop of the Great Hall.'
  },
  {
    id: 'aura_blood_moon',
    name: 'Haunted Blood Moon',
    slot: 'aura',
    season: 'halloween',
    price: 95,
    rarity: 'Halloween',
    description: 'Eerie orange harvest moon with drifting twilight bats.'
  },
  {
    id: 'aura_winter_snow',
    name: 'Starlit Snowfall',
    slot: 'aura',
    season: 'christmas',
    price: 95,
    rarity: 'Christmas',
    description: 'Gently falling December snowflakes over a festive aurora sky.'
  },
  {
    id: 'aura_celestial_gold',
    name: 'Grandmaster Solar Halo',
    slot: 'aura',
    season: 'classic',
    price: 180,
    rarity: 'Legendary',
    description: 'Radiant golden rune circle pulsing with arcane mastery.'
  }
];

export function getShopItemById(id) {
  return SHOP_CATALOG.find(item => item.id === id) || null;
}

/**
 * Renders a layered SVG character portrait combining:
 * - Character traits (gender, age, skinTone, hairStyle, hairColor, eyeColor, facialHair)
 * - Equipped costumes (aura, outfit, hat, prop)
 */
export function renderAvatarSvg(equippedInput = {}, characterInput = {}) {
  const eq = { ...DEFAULT_EQUIPPED, ...(equippedInput || {}) };
  const ch = { ...DEFAULT_CHARACTER, ...(characterInput || {}) };

  // 1. Aura / Background Layer
  let auraSvg = `<circle cx="50" cy="50" r="48" fill="#16132b" stroke="#475569" stroke-width="2.5"/>`;
  if (eq.aura === 'aura_blood_moon') {
    auraSvg = `
      <circle cx="50" cy="50" r="48" fill="#1f0918" stroke="#f97316" stroke-width="2.5"/>
      <circle cx="66" cy="27" r="15" fill="#f97316" opacity="0.88"/>
      <path d="M18 26 Q22 22 26 26 Q30 22 34 26 Q30 30 26 28 Q22 30 18 26 Z" fill="#090514"/>
      <path d="M68 19 Q71 16 74 19 Q77 16 80 19 Q77 22 74 20 Q71 22 68 19 Z" fill="#090514"/>
    `;
  } else if (eq.aura === 'aura_winter_snow') {
    auraSvg = `
      <circle cx="50" cy="50" r="48" fill="#082f49" stroke="#38bdf8" stroke-width="2.5"/>
      <circle cx="22" cy="24" r="2.2" fill="#fff" opacity="0.88"/>
      <circle cx="78" cy="20" r="2.5" fill="#fff" opacity="0.9"/>
      <circle cx="82" cy="44" r="1.8" fill="#fff" opacity="0.75"/>
      <circle cx="18" cy="48" r="2" fill="#fff" opacity="0.8"/>
      <circle cx="34" cy="14" r="1.6" fill="#bae6fd"/>
      <circle cx="66" cy="14" r="2" fill="#bae6fd"/>
    `;
  } else if (eq.aura === 'aura_celestial_gold') {
    auraSvg = `
      <circle cx="50" cy="50" r="48" fill="#1c1406" stroke="#fbbf24" stroke-width="3"/>
      <circle cx="50" cy="50" r="41" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4 3"/>
      <circle cx="50" cy="46" r="32" fill="#f59e0b" opacity="0.18"/>
    `;
  }

  // 2. Palettes for Skin, Hair & Eyes
  const skinObj =
    CHARACTER_OPTIONS.skinTones.find(s => s.id === ch.skinTone) ||
    CHARACTER_OPTIONS.skinTones[1];
  const hairObj =
    CHARACTER_OPTIONS.hairColors.find(h => h.id === ch.hairColor) ||
    CHARACTER_OPTIONS.hairColors[1];
  const eyeObj =
    CHARACTER_OPTIONS.eyeColors.find(e => e.id === ch.eyeColor) ||
    CHARACTER_OPTIONS.eyeColors[0];

  const hairHex = ch.age === 'elder' && ch.hairColor === 'brown' ? '#cbd5e1' : hairObj.hex;

  // 3. Back Hair Layer (for long/wavy/female styles)
  let backHairSvg = '';
  if (ch.hairStyle === 'long') {
    backHairSvg = `
      <path d="M30 38 C25 54, 24 72, 30 82 L70 82 C76 72, 75 54, 70 38 Z" fill="${hairHex}" stroke="#0f172a" stroke-width="1.4"/>
    `;
  } else if (ch.hairStyle === 'wavy') {
    backHairSvg = `
      <path d="M31 40 C27 52, 29 63, 33 68 L67 68 C71 63, 73 52, 69 40 Z" fill="${hairHex}"/>
    `;
  } else if (ch.hairStyle === 'bun') {
    backHairSvg = `
      <circle cx="50" cy="24" r="9" fill="${hairHex}" stroke="#0f172a" stroke-width="1.4"/>
    `;
  }

  // 4. Outfit / Robe Layer
  const shoulderW = ch.gender === 'female' ? 24 : ch.age === 'youth' ? 23 : 28;
  let outfitSvg = `
    <path d="M${50 - shoulderW} 95 C${50 - shoulderW} 68, 36 62, 50 62 C64 62, ${50 + shoulderW} 68, ${50 + shoulderW} 95 Z" fill="#1d4ed8" stroke="#60a5fa" stroke-width="2"/>
    <path d="M42 62 L50 78 L58 62" fill="#1e3a8a"/>
    <circle cx="50" cy="74" r="3.5" fill="#fbbf24"/>
  `;
  if (eq.outfit === 'outfit_necromancer') {
    outfitSvg = `
      <path d="M16 95 L26 54 L38 64 L62 64 L74 54 L84 95 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
      <path d="M20 95 C22 68, 35 63, 50 63 C65 63, 78 68, 80 95 Z" fill="#0f0720" stroke="#c084fc" stroke-width="1.8"/>
      <circle cx="50" cy="73" r="5" fill="#e2e8f0"/>
      <circle cx="48.2" cy="72.5" r="1.2" fill="#0f0720"/>
      <circle cx="51.8" cy="72.5" r="1.2" fill="#0f0720"/>
    `;
  } else if (eq.outfit === 'outfit_pumpkin_knight') {
    outfitSvg = `
      <path d="M20 95 C20 66, 34 62, 50 62 C66 62, 80 66, 80 95 Z" fill="#ea580c" stroke="#fdba74" stroke-width="2"/>
      <path d="M36 63 L50 88 L64 63" fill="#7c2d12" stroke="#f97316" stroke-width="1.5"/>
      <polygon points="50,69 55,75 50,81 45,75" fill="#fde047"/>
    `;
  } else if (eq.outfit === 'outfit_santa_coat') {
    outfitSvg = `
      <path d="M20 95 C20 67, 34 62, 50 62 C66 62, 80 67, 80 95 Z" fill="#dc2626" stroke="#fca5a5" stroke-width="1.8"/>
      <rect x="45" y="62" width="10" height="33" fill="#f8fafc"/>
      <rect x="23" y="83" width="54" height="6" fill="#1e293b"/>
      <rect x="45" y="82" width="10" height="8" fill="none" stroke="#fbbf24" stroke-width="2"/>
    `;
  } else if (eq.outfit === 'outfit_elf_tunic') {
    outfitSvg = `
      <path d="M21 95 C21 67, 34 62, 50 62 C66 62, 79 67, 79 95 Z" fill="#059669" stroke="#6ee7b7" stroke-width="1.8"/>
      <polygon points="34,63 42,73 50,64 58,73 66,63" fill="#ef4444" stroke="#f8fafc" stroke-width="1.2"/>
      <circle cx="50" cy="76" r="2.8" fill="#fbbf24"/>
      <circle cx="50" cy="85" r="2.8" fill="#fbbf24"/>
    `;
  } else if (eq.outfit === 'outfit_archmage_gold') {
    outfitSvg = `
      <path d="M18 95 C18 66, 33 61, 50 61 C67 61, 82 66, 82 95 Z" fill="#f8fafc" stroke="#f59e0b" stroke-width="2.5"/>
      <path d="M38 62 L50 95 L62 62 Z" fill="#b45309"/>
      <circle cx="50" cy="73" r="4.5" fill="#38bdf8" stroke="#fde68a" stroke-width="1.5"/>
    `;
  }

  // 5. Head, Gender Features, Age Lines & Eyes
  const headRadius = ch.age === 'youth' ? 16 : 17.2;
  const eyeRadius = ch.age === 'youth' ? 3.0 : 2.6;

  // Eyelashes for female presentation
  const lashesSvg =
    ch.gender === 'female'
      ? `
        <path d="M40.5 43.2 L38.5 41.8 M59.5 43.2 L61.5 41.8" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
      `
      : '';

  // Eyebrows
  const browColor = hairHex;
  const browsSvg =
    ch.gender === 'female'
      ? `<path d="M40 40.5 Q43.5 38.8 47 40.5 M53 40.5 Q56.5 38.8 60 40.5" fill="none" stroke="${browColor}" stroke-width="1.6" stroke-linecap="round"/>`
      : `<path d="M39.5 40.2 L47 40.8 M53 40.8 L60.5 40.2" fill="none" stroke="${browColor}" stroke-width="2.2" stroke-linecap="round"/>`;

  // Age details (mature / elder wisdom lines)
  let ageLinesSvg = '';
  if (ch.age === 'mature') {
    ageLinesSvg = `
      <path d="M41 48.5 Q43.5 49.5 45.5 48.5 M54.5 48.5 Q56.5 49.5 59 48.5" fill="none" stroke="#0f172a" stroke-width="0.8" opacity="0.35"/>
    `;
  } else if (ch.age === 'elder') {
    ageLinesSvg = `
      <path d="M43 36.5 Q50 37.8 57 36.5" fill="none" stroke="#0f172a" stroke-width="0.9" opacity="0.4"/>
      <path d="M40.5 48.5 Q43.5 49.8 46 48.5 M54 48.5 Q56.5 49.8 59.5 48.5" fill="none" stroke="#0f172a" stroke-width="0.9" opacity="0.42"/>
      <path d="M41 51.5 L39.5 54.5 M59 51.5 L60.5 54.5" fill="none" stroke="#0f172a" stroke-width="0.9" opacity="0.38"/>
    `;
  }

  // Lip color
  const mouthSvg =
    ch.gender === 'female'
      ? `<path d="M45.5 52 Q50 55.8 54.5 52 Q50 53.5 45.5 52 Z" fill="#e11d48" stroke="#be123c" stroke-width="1"/>`
      : `<path d="M45 52 Q50 55.5 55 52" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>`;

  const headSvg = `
    <circle cx="50" cy="46" r="${headRadius}" fill="${skinObj.color}" stroke="#1e293b" stroke-width="1.6"/>
    ${browsSvg}
    ${lashesSvg}
    <circle cx="43.5" cy="45" r="${eyeRadius}" fill="${eyeObj.hex}"/>
    <circle cx="56.5" cy="45" r="${eyeRadius}" fill="${eyeObj.hex}"/>
    <circle cx="43.5" cy="45" r="1.3" fill="#0f172a"/>
    <circle cx="56.5" cy="45" r="1.3" fill="#0f172a"/>
    <circle cx="44.3" cy="44.1" r="0.85" fill="#ffffff"/>
    <circle cx="57.3" cy="44.1" r="0.85" fill="#ffffff"/>
    <ellipse cx="39" cy="49.5" rx="2.8" ry="1.5" fill="${skinObj.blush}" opacity="0.42"/>
    <ellipse cx="61" cy="49.5" rx="2.8" ry="1.5" fill="${skinObj.blush}" opacity="0.42"/>
    ${ageLinesSvg}
    ${mouthSvg}
  `;

  // 6. Facial Hair Layer
  let beardSvg = '';
  if (ch.facialHair === 'mustache') {
    beardSvg = `<path d="M43 51.2 Q50 48.5 57 51.2 Q53 53 50 51.5 Q47 53 43 51.2 Z" fill="${hairHex}"/>`;
  } else if (ch.facialHair === 'goatee') {
    beardSvg = `
      <path d="M44 51 Q50 49 56 51" fill="none" stroke="${hairHex}" stroke-width="2" stroke-linecap="round"/>
      <path d="M46 55 L50 63 L54 55 Z" fill="${hairHex}"/>
    `;
  } else if (ch.facialHair === 'wizard_beard') {
    beardSvg = `
      <path d="M36 49 Q50 53 64 49 L58 84 Q50 92 42 84 Z" fill="${hairHex}" stroke="#0f172a" stroke-width="1.2"/>
      <path d="M44 52 Q50 55 56 52" fill="none" stroke="#0f172a" stroke-width="1.2"/>
    `;
  }

  // 7. Front Hair Layer
  let frontHairSvg = '';
  if (ch.hairStyle !== 'bald') {
    if (ch.hairStyle === 'short') {
      frontHairSvg = `<path d="M33 41 C33 27, 67 27, 67 41 C61 33, 39 33, 33 41 Z" fill="${hairHex}"/>`;
    } else if (ch.hairStyle === 'wavy' || ch.hairStyle === 'long' || ch.hairStyle === 'bun') {
      frontHairSvg = `<path d="M32 43 C32 26, 68 26, 68 43 C62 34, 52 33, 46 37 C40 34, 35 37, 32 43 Z" fill="${hairHex}"/>`;
    } else if (ch.hairStyle === 'spiky') {
      frontHairSvg = `<polygon points="32,41 35,28 42,34 48,24 54,33 61,25 66,35 68,41 58,35 42,35" fill="${hairHex}"/>`;
    }
  }

  // 8. Hat / Headgear Layer
  let hatSvg = '';
  if (eq.hat === 'hat_wizard_blue') {
    hatSvg = `
      <path d="M26 34 L50 7 L74 34 Z" fill="#1d4ed8" stroke="#60a5fa" stroke-width="1.8"/>
      <ellipse cx="50" cy="34" rx="26" ry="5.5" fill="#1e40af" stroke="#60a5fa" stroke-width="1.6"/>
      <circle cx="50" cy="23" r="3" fill="#fbbf24"/>
    `;
  } else if (eq.hat === 'hat_pumpkin_crown') {
    hatSvg = `
      <ellipse cx="50" cy="27" rx="21" ry="11" fill="#f97316" stroke="#7c2d12" stroke-width="1.8"/>
      <path d="M50 16 C48 11, 52 9, 55 11" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round"/>
      <polygon points="41,25 45,21 47,26" fill="#fef08a"/>
      <polygon points="59,25 55,21 53,26" fill="#fef08a"/>
      <path d="M42 30 L46 32 L50 30 L54 32 L58 30" fill="none" stroke="#fef08a" stroke-width="2"/>
    `;
  } else if (eq.hat === 'hat_witch_obsidian') {
    hatSvg = `
      <path d="M28 33 L46 6 L62 12 L72 33 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.8"/>
      <ellipse cx="50" cy="33" rx="28" ry="5.5" fill="#0f0720" stroke="#a855f7" stroke-width="1.6"/>
      <rect x="44" y="24" width="12" height="7" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="2"/>
    `;
  } else if (eq.hat === 'hat_vampire_crest') {
    hatSvg = `
      <rect x="34" y="10" width="32" height="22" rx="3" fill="#18181b" stroke="#e11d48" stroke-width="1.8"/>
      <rect x="34" y="26" width="32" height="5" fill="#be123c"/>
      <ellipse cx="50" cy="32" rx="25" ry="4.5" fill="#18181b" stroke="#e11d48" stroke-width="1.6"/>
    `;
  } else if (eq.hat === 'hat_santa_cap') {
    hatSvg = `
      <path d="M30 32 C32 12, 58 10, 74 28 L64 34 Z" fill="#dc2626" stroke="#b91c1c" stroke-width="1.5"/>
      <rect x="28" y="28" width="44" height="8" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
      <circle cx="75" cy="29" r="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
    `;
  } else if (eq.hat === 'hat_reindeer_antlers') {
    hatSvg = `
      <path d="M36 31 L24 14 M28 20 L20 19 M31 24 L33 15" stroke="#b45309" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M64 31 L76 14 M72 20 L80 19 M69 24 L67 15" stroke="#b45309" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="20" cy="19" r="3" fill="#ef4444"/>
      <circle cx="80" cy="19" r="3" fill="#10b981"/>
      <circle cx="50" cy="48" r="2.8" fill="#ef4444"/>
    `;
  } else if (eq.hat === 'hat_grandmaster_crown') {
    hatSvg = `
      <polygon points="31,32 31,15 41,24 50,11 59,24 69,15 69,32" fill="#fbbf24" stroke="#b45309" stroke-width="1.8"/>
      <circle cx="50" cy="25" r="3" fill="#ef4444"/>
      <circle cx="39" cy="27" r="2.2" fill="#38bdf8"/>
      <circle cx="61" cy="27" r="2.2" fill="#38bdf8"/>
    `;
  }

  // 9. Prop / Staff / Familiar Layer
  let propSvg = '';
  if (eq.prop === 'prop_wand') {
    propSvg = `
      <line x1="78" y1="86" x2="86" y2="54" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="86" cy="52" r="4" fill="#38bdf8"/>
    `;
  } else if (eq.prop === 'prop_ghost_lantern') {
    propSvg = `
      <rect x="74" y="54" width="14" height="18" rx="4" fill="#fef08a" stroke="#f97316" stroke-width="2"/>
      <circle cx="81" cy="62" r="4.5" fill="#fff"/>
      <circle cx="79.5" cy="61" r="1" fill="#090812"/>
      <circle cx="82.5" cy="61" r="1" fill="#090812"/>
    `;
  } else if (eq.prop === 'prop_bat_familiar') {
    propSvg = `
      <path d="M68 42 Q75 34 81 42 Q87 34 94 42 Q87 48 81 45 Q75 48 68 42 Z" fill="#311042" stroke="#c084fc" stroke-width="1.5"/>
      <circle cx="80" cy="41" r="1" fill="#f43f5e"/>
      <circle cx="82.5" cy="41" r="1" fill="#f43f5e"/>
    `;
  } else if (eq.prop === 'prop_candy_staff') {
    propSvg = `
      <path d="M80 86 L80 54 C80 47, 90 47, 90 54" fill="none" stroke="#f8fafc" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M80 86 L80 54 C80 47, 90 47, 90 54" fill="none" stroke="#ef4444" stroke-width="4.5" stroke-dasharray="4 4" stroke-linecap="round"/>
    `;
  } else if (eq.prop === 'prop_snow_owl') {
    propSvg = `
      <ellipse cx="80" cy="60" rx="8" ry="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="77.5" cy="57" r="2" fill="#f59e0b"/>
      <circle cx="82.5" cy="57" r="2" fill="#f59e0b"/>
      <polygon points="79,59 81,59 80,62" fill="#d97706"/>
    `;
  } else if (eq.prop === 'prop_golden_queen') {
    propSvg = `
      <polygon points="74,58 76,47 80,53 84,46 88,53 91,47 92,58" fill="#fbbf24" stroke="#b45309" stroke-width="1.4"/>
      <circle cx="83" cy="58" r="9" fill="#f59e0b" opacity="0.22"/>
    `;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="layered-avatar-svg">
    <defs>
      <clipPath id="avatarCircleClip">
        <circle cx="50" cy="50" r="47"/>
      </clipPath>
    </defs>
    ${auraSvg}
    <g clip-path="url(#avatarCircleClip)">
      ${backHairSvg}
      ${outfitSvg}
      ${headSvg}
      ${beardSvg}
      ${frontHairSvg}
      ${hatSvg}
      ${propSvg}
    </g>
  </svg>`;
}
