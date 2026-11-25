export const CHRISTMAS_START = Date.parse('2026-11-25T00:00:00-05:00');
export const CHRISTMAS_END = Date.parse('2026-12-26T00:00:00-05:00');

export function christmasActive(now = Date.now()) {
  return now >= CHRISTMAS_START && now < CHRISTMAS_END;
}

export const CHRISTMAS_PACKS = {
  'christmas-tree': { name: 'Christmas Tree Pack', season: 'event', contents: 'Outdoor and indoor trees, wrapped gift, ornament, gold star, garland, candy cane and ribbon bow' },
  'holiday-home': { name: 'Holiday Home Pack', season: 'event', contents: 'Wreath, stocking, fireplace, string lights, candles, snowflake and holiday rug' },
  'winter-village': { name: 'Winter Village Pack', season: 'event', contents: 'Snowman, gingerbread house, sleigh, toy train, jingle bell, reindeer and toy drum' },
  christmas: { name: 'Christmas Kit', season: 'keepsake', contents: 'Your full holiday collection, ready to place again' },
};

function decoration(name, size, tone, pack, prompts) {
  return { name, size, tone, pack, interaction: prompts ? 'christmas' : undefined, prompts };
}

export const CHRISTMAS_OBJECTS = {
  festiveTree: decoration('Christmas tree', [5, 5, 24], 'pine', 'christmas-tree', ['Turn tree lights off', 'Turn tree lights on']),
  indoorTree: decoration('Indoor Christmas tree', [2, 2, 7], 'pine', 'christmas-tree', ['Turn tree lights off', 'Turn tree lights on']),
  wrappedGift: { ...decoration('Wrapped gift', [1, 1, 3], 'cranberry', 'christmas-tree', ['Close gift', 'Open gift']), previousSize: [2, 2, 5] },
  bauble: { ...decoration('Round ornament', [1, 1, 2], 'cranberry', 'christmas-tree'), previousSize: [1, 1, 4] },
  starTopper: { ...decoration('Star topper', [1, 1, 3], 'brass', 'christmas-tree'), previousSize: [2, 1, 5] },
  pineGarland: { ...decoration('Pine garland', [2, 1, 2], 'pine', 'christmas-tree'), previousSize: [4, 1, 3] },
  candyCane: { ...decoration('Candy cane', [1, 1, 3], 'cranberry', 'christmas-tree'), previousSize: [1, 1, 7] },
  ribbonBow: { ...decoration('Ribbon bow', [1, 1, 2], 'cranberry', 'christmas-tree'), previousSize: [2, 1, 4] },
  holidayWreath: decoration('Holly wreath', [2, 1, 6], 'pine', 'holiday-home'),
  stocking: decoration('Christmas stocking', [1, 1, 5], 'cranberry', 'holiday-home'),
  fireplace: decoration('Holiday fireplace', [5, 2, 10], 'redTrim', 'holiday-home', ['Put out fire', 'Light the fireplace']),
  fairyLights: decoration('String lights', [5, 1, 3], 'brass', 'holiday-home', ['Turn string lights off', 'Turn string lights on']),
  candles: decoration('Christmas candles', [2, 1, 5], 'cranberry', 'holiday-home', ['Put out candles', 'Light the candles']),
  snowflake: decoration('Snowflake', [2, 1, 6], 'frost', 'holiday-home'),
  holidayRug: decoration('Holiday rug', [4, 3, 1], 'cranberry', 'holiday-home'),
  snowman: decoration('Snowman', [3, 2, 11], 'snow', 'winter-village'),
  gingerbreadHouse: decoration('Gingerbread house', [3, 3, 9], 'gingerbread', 'winter-village'),
  sleigh: decoration('Holiday sleigh', [2, 4, 7], 'cranberry', 'winter-village'),
  toyTrain: decoration('Toy train', [4, 2, 6], 'lacquer', 'winter-village'),
  jingleBell: decoration('Jingle bell', [1, 1, 5], 'brass', 'winter-village', ['Ring jingle bell', 'Ring jingle bell']),
  reindeer: decoration('Reindeer', [2, 3, 10], 'gingerbread', 'winter-village'),
  toyDrum: decoration('Toy drum', [2, 2, 4], 'cranberry', 'winter-village'),
};

export function isChristmasPiece(brick) {
  return Boolean(brick && Object.hasOwn(CHRISTMAS_OBJECTS, brick.form));
}

export function isChristmasTree(brick) {
  return brick?.form === 'festiveTree' || brick?.form === 'indoorTree';
}
