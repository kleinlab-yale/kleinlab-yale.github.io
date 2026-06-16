const SAVE_KEY = "math-pet-sky-meadow-v3";
const QUEST_PASS = 3;
const BOSS_PASS = 5;
const RECENT_PROBLEM_LIMIT = 60;
const KITCHEN_WORKBOOK_RATE = 0.35;

const PET_VARIANTS = {
  golden: { name: "golden puppy", egg: "sunny" },
  corgi: { name: "corgi puppy", egg: "rose" },
  husky: { name: "husky puppy", egg: "mint" },
};
const EGG_CHOICES = [
  { id: "sunny", label: "Mystery Egg I", variant: "golden" },
  { id: "rose", label: "Mystery Egg II", variant: "corgi" },
  { id: "mint", label: "Mystery Egg III", variant: "husky" },
];
const PET_FRAMES = [
  "base",
  "bow",
  "sweater",
  "collar",
  "thinking",
  "celebrate",
  "sleepy",
  "wag-a",
  "wag-b",
  "roll-a",
  "roll-b",
  "roll-c",
  "couch-sit",
];
const ACTION_LOOK_FRAMES = [
  "thinking",
  "celebrate",
  "sleepy",
  "wag-a",
  "wag-b",
  "roll-a",
  "roll-b",
  "roll-c",
  "couch-sit",
];
const OUTFIT_LOOKS = ["sweater", "bow", "collar"];
const SCUBA_FRAMES = [
  "base",
  "thinking",
  "celebrate",
  "sleepy",
  "wag-a",
  "wag-b",
  "roll-a",
  "roll-b",
  "roll-c",
];
const PET_ASSETS = Object.fromEntries(
  [
    ...Object.keys(PET_VARIANTS).flatMap((variant) => (
      PET_FRAMES.map((frame) => [`pet-${variant}-${frame}`, `assets/gpt-puppy-${variant}-${frame}.png`])
    )),
    ...Object.keys(PET_VARIANTS).flatMap((variant) => (
      OUTFIT_LOOKS.flatMap((look) => (
        ACTION_LOOK_FRAMES.map((frame) => [`pet-${variant}-${look}-${frame}`, `assets/gpt-puppy-${variant}-${look}-${frame}.png`])
      ))
    )),
    ...Object.keys(PET_VARIANTS).flatMap((variant) => (
      SCUBA_FRAMES.map((frame) => [`pet-${variant}-scuba-${frame}`, `assets/gpt-puppy-${variant}-scuba-${frame}.png`])
    )),
  ]
);

const ASSETS = {
  backdrop: "assets/gpt-meadow-backdrop.png",
  waterfall: "assets/gpt-waterfall-backdrop.png",
  mountain: "assets/gpt-mountain-backdrop.png",
  underwater: "assets/gpt-underwater-backdrop.png",
  home: "assets/gpt-home-interior.png",
  kitchen: "assets/gpt-kitchen-backdrop.png",
  egg: "assets/gpt-egg.png",
  ...PET_ASSETS,
  homeCouch: "assets/gpt-home-couch.png",
  homeChair: "assets/gpt-home-chair.png",
  homeTvOff: "assets/gpt-home-tv-off.png",
  homeTvScreenAnimal: "assets/gpt-home-tv-screen-animal.png",
  homeTvScreenNature: "assets/gpt-home-tv-screen-nature.png",
  homeTvScreenMath: "assets/gpt-home-tv-screen-math.png",
  homeRemote: "assets/gpt-home-remote.png",
  homePlant: "assets/gpt-home-plant.png",
  homeRug: "assets/gpt-home-rug.png",
  homeLamp: "assets/gpt-home-lamp-off.png",
  homeLampOn: "assets/gpt-home-lamp-on.png",
  homeTable: "assets/gpt-home-table.png",
  homeRockingDogToy: "assets/gpt-home-rocking-dog-toy.png?v=20260615-rocking-dog-v3",
  kitchenCounter: "assets/gpt-kitchen-counter.png",
  kitchenWallShelves: "assets/gpt-kitchen-wall-shelves.png",
  kitchenSnackCart: "assets/gpt-kitchen-snack-cart.png",
  kitchenFridge: "assets/gpt-kitchen-fridge.png",
  kitchenFridgeOpen: "assets/gpt-kitchen-fridge-open.png",
  kitchenBowlStation: "assets/gpt-kitchen-bowl-station.png",
  kitchenBreakfastTable: "assets/gpt-kitchen-breakfast-table.png",
  kitchenOven: "assets/gpt-kitchen-oven-closed.png",
  kitchenOvenOpen: "assets/gpt-kitchen-oven-cookies.png",
  kitchenOvenCookies: "assets/gpt-kitchen-oven-cookies.png",
  kitchenOvenPizza: "assets/gpt-kitchen-oven-pizza.png",
  kitchenOvenCake: "assets/gpt-kitchen-oven-cake.png",
  kitchenCookieTray: "assets/gpt-kitchen-cookie-tray.png",
  kitchenShelfInsert: "assets/gpt-kitchen-shelf-insert.png",
  kitchenCookieJar: "assets/gpt-kitchen-cookie-jar.png",
  kitchenCupcakeStand: "assets/gpt-kitchen-cupcake-stand.png",
  kitchenTeaKettle: "assets/gpt-kitchen-tea-kettle.png",
  kitchenRecipeBook: "assets/gpt-kitchen-recipe-book.png",
  kitchenHerbPlanter: "assets/gpt-kitchen-herb-planter.png",
  kitchenPuppyMug: "assets/gpt-kitchen-puppy-mug.png",
  kitchenSink: "assets/gpt-kitchen-sink.png?v=20260616-kitchen-sink",
  kitchenSinkOn: "assets/gpt-kitchen-sink-on.png?v=20260616-kitchen-sink",
  yardBench: "assets/gpt-yard-bench.png",
  yardBall: "assets/gpt-yard-ball.png",
  yardToys: "assets/gpt-yard-toys.png",
  yardBasket: "assets/gpt-yard-basket.png",
  yardPiggyCarToy: "assets/gpt-yard-piggy-car-toy.png",
  waterfallLog: "assets/gpt-waterfall-log.png",
  waterfallLantern: "assets/gpt-waterfall-lantern.png",
  waterfallLilypads: "assets/gpt-waterfall-lilypads.png",
  waterfallBasket: "assets/gpt-waterfall-basket.png",
  waterfallLavenderPlush: "assets/gpt-waterfall-lavender-plush.png?v=20260616-lavender-plush-v2",
  mountainTent: "assets/gpt-mountain-tent.png",
  mountainCampfireOff: "assets/gpt-mountain-campfire-off.png",
  mountainCampfireOn: "assets/gpt-mountain-campfire-on.png",
  mountainSnacks: "assets/gpt-mountain-snacks.png",
  mountainShelter: "assets/gpt-mountain-shelter.png",
  mountainLantern: "assets/gpt-mountain-lantern.png",
  underwaterShellSeat: "assets/gpt-underwater-shell-seat.png",
  underwaterPearlLampOff: "assets/gpt-underwater-pearl-lamp-off.png",
  underwaterPearlLampOn: "assets/gpt-underwater-pearl-lamp-on.png",
  underwaterTreasureChest: "assets/gpt-underwater-treasure-chest.png",
  underwaterBubbleHoop: "assets/gpt-underwater-bubble-hoop.png",
  underwaterKelpHideout: "assets/gpt-underwater-kelp-hideout.png",
};

const WORLDS = [
  { name: "Sky Meadow", focus: "multi-digit multiplication warmups" },
  { name: "Ribbon Bridge", focus: "simplifying expressions" },
  { name: "Shape Grove", focus: "area and perimeter" },
  { name: "Equation Dunes", focus: "solving equations" },
  { name: "Crystal Decimal Cove", focus: "decimal operations, percents, and powers of 10" },
  { name: "Workshop Meadow", focus: "distributive property mastery" },
  { name: "Aurora Academy", focus: "mixed accelerated mastery" },
];

const QUEST_FLOW = ["number", "fraction", "geometry", "boss"];
const QUEST_LABELS = {
  number: "Warmup Math",
  fraction: "Bridge Algebra",
  geometry: "Shape Math",
  boss: "World Boss",
};

const CLOSET = [
  { id: "none", name: "No extra", kind: "all", unlock: true, cost: { coins: 0, gems: 0 } },
  { id: "sweater", name: "Peach sweater", kind: "look", cost: { coins: 65, gems: 0 } },
  { id: "bow", name: "Berry bow", kind: "look", cost: { coins: 90, gems: 1 } },
  { id: "collar", name: "Bell collar", kind: "look", cost: { coins: 80, gems: 0 } },
];

const DECOR_ITEMS = [
  { id: "couch", scene: "home", name: "Peach couch", tex: "homeCouch", x: -1.58, y: 0.88, z: 0.35, w: 2.72, h: 1.45, reward: "Home math", cost: { coins: 80, gems: 0 } },
  { id: "plant", scene: "home", name: "Leafy plant", tex: "homePlant", x: 1.98, y: 0.96, z: 0.36, w: 0.84, h: 1.18, reward: "Home math", cost: { coins: 35, gems: 0 } },
  { id: "tv", scene: "home", name: "Star TV", tex: "homeTvOff", x: 1.92, y: 1.28, z: 0.38, w: 1.38, h: 1.34, reward: "Home math", cost: { coins: 95, gems: 1 } },
  { id: "chair", scene: "home", name: "Mint chair", tex: "homeChair", x: -0.82, y: 0.98, z: 0.4, w: 1.55, h: 1.4, reward: "Home math", cost: { coins: 55, gems: 0 } },
  { id: "lamp", scene: "home", name: "Warm lamp", tex: "homeLamp", x: 2.82, y: 1.16, z: 0.42, w: 0.8, h: 1.42, reward: "Home math", cost: { coins: 45, gems: 0 } },
  { id: "table", scene: "home", name: "Reading table", tex: "homeTable", x: 0.74, y: 0.66, z: 0.55, w: 1.12, h: 1.06, reward: "Home math", cost: { coins: 50, gems: 0 } },
  { id: "remote", scene: "home", name: "TV remote", tex: "homeRemote", x: 0.05, y: 0.34, z: 0.62, w: 0.45, h: 0.32, reward: "TV decor", cost: { coins: 25, gems: 0 }, optional: true },
  { id: "rockingDogToy", scene: "home", name: "Rocking puppy", tex: "homeRockingDogToy", x: -2.75, y: 0.48, z: 0.64, w: 1.12, h: 1.22, reward: "Home math", cost: { coins: 70, gems: 0 }, optional: true },
  { id: "kitchenCounter", scene: "kitchen", name: "Kitchen counter", tex: "kitchenCounter", x: -1.88, y: 0.58, z: 0.43, w: 2.35, h: 0.95, reward: "Kitchen quests", cost: { coins: 115, gems: 1 } },
  { id: "kitchenSink", scene: "kitchen", name: "Paw sink", tex: "kitchenSink", x: -0.18, y: 0.76, z: 0.43, w: 1.25, h: 1.54, reward: "Kitchen quests", cost: { coins: 95, gems: 0 } },
  { id: "kitchenWallShelves", scene: "kitchen", name: "Wall shelves", tex: "kitchenWallShelves", x: -2.38, y: 1.86, z: 0.41, w: 1.74, h: 0.92, reward: "Kitchen quests", cost: { coins: 85, gems: 0 } },
  { id: "snackCart", scene: "kitchen", name: "Snack cart", tex: "kitchenSnackCart", x: -3.6, y: 0.58, z: 0.42, w: 1.36, h: 1.28, reward: "Kitchen quests", cost: { coins: 95, gems: 0 } },
  { id: "kitchenFridge", scene: "kitchen", name: "Mint fridge", tex: "kitchenFridge", x: 3.5, y: 1.12, z: 0.38, w: 1.5, h: 2.34, reward: "Kitchen quests", cost: { coins: 110, gems: 1 } },
  { id: "oven", scene: "kitchen", name: "Cookie oven", tex: "kitchenOven", x: 2.1, y: 0.62, z: 0.43, w: 1.12, h: 1.12, reward: "Kitchen quests", cost: { coins: 100, gems: 1 } },
  { id: "bowlStation", scene: "kitchen", name: "Bowl station", tex: "kitchenBowlStation", x: -1.65, y: 0.32, z: 0.56, w: 1.24, h: 0.66, reward: "Kitchen quests", cost: { coins: 70, gems: 0 } },
  { id: "breakfastTable", scene: "kitchen", name: "Breakfast table", tex: "kitchenBreakfastTable", x: 0.32, y: 0.34, z: 0.5, w: 1.36, h: 1.0, reward: "Kitchen quests", cost: { coins: 85, gems: 0 } },
  { id: "cookieTray", scene: "kitchen", name: "Cookie tray", tex: "kitchenCookieTray", x: -0.22, y: 1.52, z: 0.56, w: 0.52, h: 0.28, reward: "Kitchen quests", cost: { coins: 35, gems: 0 } },
  { id: "shelfInsert", scene: "kitchen", name: "Jar shelf", tex: "kitchenShelfInsert", x: -2.45, y: 1.62, z: 0.48, w: 0.72, h: 0.66, reward: "Kitchen quests", cost: { coins: 55, gems: 0 } },
  { id: "cookieJar", scene: "kitchen", name: "Puppy cookie jar", tex: "kitchenCookieJar", x: -1.55, y: 1.56, z: 0.58, w: 0.46, h: 0.48, reward: "Kitchen quests", cost: { coins: 40, gems: 0 } },
  { id: "cupcakeStand", scene: "kitchen", name: "Cupcake stand", tex: "kitchenCupcakeStand", x: 0.05, y: 1.6, z: 0.58, w: 0.58, h: 0.44, reward: "Kitchen quests", cost: { coins: 45, gems: 0 } },
  { id: "teaKettle", scene: "kitchen", name: "Paw kettle", tex: "kitchenTeaKettle", x: 1.72, y: 1.5, z: 0.58, w: 0.46, h: 0.45, reward: "Kitchen quests", cost: { coins: 40, gems: 0 } },
  { id: "recipeBook", scene: "kitchen", name: "Recipe book", tex: "kitchenRecipeBook", x: -0.88, y: 1.48, z: 0.58, w: 0.56, h: 0.38, reward: "Kitchen quests", cost: { coins: 35, gems: 0 } },
  { id: "herbPlanter", scene: "kitchen", name: "Herb planter", tex: "kitchenHerbPlanter", x: -2.88, y: 1.44, z: 0.58, w: 0.42, h: 0.5, reward: "Kitchen quests", cost: { coins: 35, gems: 0 } },
  { id: "puppyMug", scene: "kitchen", name: "Puppy mug", tex: "kitchenPuppyMug", x: 2.12, y: 1.48, z: 0.58, w: 0.44, h: 0.4, reward: "Kitchen quests", cost: { coins: 35, gems: 0 } },
  { id: "bench", scene: "outdoor", name: "Garden bench", tex: "yardBench", x: -1.65, y: 0.58, z: 0.42, w: 1.78, h: 1.45, reward: "Outdoor quests", cost: { coins: 75, gems: 0 } },
  { id: "ball", scene: "outdoor", name: "Treat ball", tex: "yardBall", x: 1.08, y: 0.34, z: 0.72, w: 0.7, h: 0.7, reward: "Outdoor quests", cost: { coins: 35, gems: 0 } },
  { id: "toys", scene: "outdoor", name: "Rope toys", tex: "yardToys", x: 0.28, y: 0.31, z: 0.74, w: 0.94, h: 0.6, reward: "Outdoor quests", cost: { coins: 45, gems: 0 } },
  { id: "piggyCarToy", scene: "outdoor", name: "Piggy car toy", tex: "yardPiggyCarToy", x: 1.68, y: 0.36, z: 0.72, w: 0.72, h: 0.7, reward: "Outdoor quests", cost: { coins: 60, gems: 0 }, optional: true },
  { id: "basket", scene: "outdoor", name: "Toy basket", tex: "yardBasket", x: 2.18, y: 0.52, z: 0.48, w: 1.22, h: 1.02, reward: "Outdoor quests", cost: { coins: 90, gems: 1 } },
  { id: "waterfallLog", scene: "waterfall", name: "Mossy log seat", tex: "waterfallLog", x: -1.7, y: 0.54, z: 0.42, w: 1.7, h: 1.18, reward: "Bridge Algebra", cost: { coins: 70, gems: 0 } },
  { id: "waterfallLantern", scene: "waterfall", name: "Firefly lantern", tex: "waterfallLantern", x: 2.05, y: 0.72, z: 0.44, w: 0.82, h: 1.34, reward: "Waterfall quests", cost: { coins: 90, gems: 1 } },
  { id: "waterfallLilypads", scene: "waterfall", name: "Lily stepping stones", tex: "waterfallLilypads", x: 0.86, y: 0.27, z: 0.56, w: 1.15, h: 0.84, reward: "Waterfall quests", cost: { coins: 55, gems: 0 } },
  { id: "waterfallBasket", scene: "waterfall", name: "Picnic basket", tex: "waterfallBasket", x: 2.36, y: 0.45, z: 0.52, w: 1.05, h: 0.9, reward: "Waterfall quests", cost: { coins: 85, gems: 1 } },
  { id: "lavenderPlush", scene: "waterfall", name: "Lavender plush", tex: "waterfallLavenderPlush", x: -2.62, y: 0.42, z: 0.62, w: 1.0, h: 0.93, reward: "Waterfall quests", cost: { coins: 70, gems: 0 }, optional: true },
  { id: "mountainTent", scene: "mountain", name: "Summit tent", tex: "mountainTent", x: -2.25, y: 0.74, z: 0.42, w: 1.52, h: 1.38, reward: "Summit Trail", cost: { coins: 125, gems: 1 } },
  { id: "mountainCampfire", scene: "mountain", name: "Campfire ring", tex: "mountainCampfireOff", x: 0.02, y: 0.42, z: 0.62, w: 1.0, h: 0.9, reward: "Mountain quests", cost: { coins: 95, gems: 1 } },
  { id: "mountainSnacks", scene: "mountain", name: "Trail snacks", tex: "mountainSnacks", x: 1.42, y: 0.46, z: 0.58, w: 0.86, h: 0.86, reward: "Mountain quests", cost: { coins: 75, gems: 0 } },
  { id: "mountainShelter", scene: "mountain", name: "Pup shelter", tex: "mountainShelter", x: 2.55, y: 0.95, z: 0.42, w: 1.34, h: 1.24, reward: "Mountain quests", cost: { coins: 140, gems: 2 } },
  { id: "mountainLantern", scene: "mountain", name: "Star lantern", tex: "mountainLantern", x: -0.98, y: 0.74, z: 0.5, w: 0.62, h: 1.04, reward: "Mountain quests", cost: { coins: 85, gems: 1 } },
  { id: "underwaterShellSeat", scene: "underwater", name: "Shell lounge", tex: "underwaterShellSeat", x: -2.3, y: 0.65, z: 0.42, w: 1.36, h: 1.24, reward: "Deep Dive", cost: { coins: 130, gems: 1 } },
  { id: "underwaterPearlLamp", scene: "underwater", name: "Pearl lamp", tex: "underwaterPearlLampOff", x: 1.92, y: 0.78, z: 0.44, w: 0.86, h: 1.12, reward: "Underwater quests", cost: { coins: 105, gems: 1 } },
  { id: "underwaterTreasureChest", scene: "underwater", name: "Snack treasure", tex: "underwaterTreasureChest", x: -0.38, y: 0.43, z: 0.58, w: 1.08, h: 0.9, reward: "Underwater quests", cost: { coins: 125, gems: 1 } },
  { id: "underwaterBubbleHoop", scene: "underwater", name: "Bubble hoop", tex: "underwaterBubbleHoop", x: 2.7, y: 0.9, z: 0.46, w: 0.94, h: 1.2, reward: "Underwater quests", cost: { coins: 95, gems: 0 } },
  { id: "underwaterKelpHideout", scene: "underwater", name: "Kelp hideout", tex: "underwaterKelpHideout", x: 0.92, y: 0.74, z: 0.45, w: 1.24, h: 1.2, reward: "Underwater quests", cost: { coins: 145, gems: 2 } },
];

const DECOR_POSITION_MIGRATIONS = {
  chair: { x: -0.95, y: 0.93 },
  lamp: { x: 2.88, y: 1.0 },
  table: { x: 0.75, y: 0.54 },
};

const DECOR_SCENES = ["home", "kitchen", "outdoor", "waterfall", "mountain", "underwater"];
const DEFAULT_PET_POSITIONS = {
  home: { x: -0.06, y: 0.48 },
  kitchen: { x: -0.05, y: 0.46 },
  outdoor: { x: 0.12, y: 0.5 },
  waterfall: { x: 0.05, y: 0.5 },
  mountain: { x: 0.1, y: 0.52 },
  underwater: { x: 0.0, y: 0.54 },
};
const MOVE_BOUNDS = {
  home: { x: [-5.05, 5.05], y: [-0.24, 2.62] },
  kitchen: { x: [-5.05, 5.05], y: [-0.24, 2.58] },
  outdoor: { x: [-5.45, 5.45], y: [-1.1, 4.15] },
  waterfall: { x: [-5.45, 5.45], y: [-1.1, 4.15] },
  mountain: { x: [-5.45, 5.45], y: [-1.1, 4.15] },
  underwater: { x: [-12, 12], y: [-1.1, 4.15] },
};
const BACKDROP_DECOR_MOVE_BOUNDS = {
  home: { x: [-5.45, 5.45], y: [-1.45, 3.25] },
  kitchen: { x: [-5.45, 5.45], y: [-1.45, 3.25] },
  outdoor: { x: [-5.45, 5.45], y: [-3.85, 4.15] },
  waterfall: { x: [-5.45, 5.45], y: [-3.85, 4.15] },
  mountain: { x: [-5.45, 5.45], y: [-3.85, 4.15] },
  underwater: { x: [-12, 12], y: [-3.85, 4.15] },
};
const FEED_COIN_COST = 10;
const COUCH_PET_OFFSET = { x: 0.02, y: 0.38 };
const OUTDOOR_BACKDROP_DECOR_Z = -6.4;
const OUTDOOR_BACKDROP_DECOR_SCALE = 2.1;
const OUTDOOR_BACKDROP_DECOR_X_SCALE = 2.2;
const OUTDOOR_BACKDROP_DECOR_Y_DRAG_SCALE = 2.35;
const OUTDOOR_BACKDROP_DECOR_Y_OFFSET = -0.22;
const MOUNTAIN_DECOR_SCALE = 1.5;
const PANORAMA_SCENES = new Set(["underwater"]);
const PANORAMA_WIDTH = 24;
const VIEW_PAN_SCENES = new Set(["home", "kitchen", "outdoor", "waterfall", "mountain"]);
const VIEW_PAN_LIMITS = {
  home: 1.1,
  kitchen: 1.1,
  outdoor: 1.45,
  waterfall: 1.45,
  mountain: 1.45,
};
const SECRET_AWARDS = {
  couchCritic: { title: "Couch Critic", coins: 40, gems: 1, glow: 12 },
  snackChef: { title: "Snack Chef", coins: 35, gems: 1, glow: 10 },
  parkMvp: { title: "Park MVP", coins: 35, gems: 1, glow: 10 },
  lanternTrail: { title: "Diving Gear", coins: 45, gems: 1, glow: 12 },
  summitSupper: { title: "Summit Supper", coins: 60, gems: 2, glow: 16 },
  reefTreasure: { title: "Reef Treasure", coins: 70, gems: 2, glow: 18 },
};
const TV_CHANNELS = [
  { screenTex: "", label: "TV off" },
  { screenTex: "homeTvScreenAnimal", label: "animal show" },
  { screenTex: "homeTvScreenNature", label: "nature channel" },
  { screenTex: "homeTvScreenMath", label: "math stars" },
];
const OVEN_STATES = [
  { tex: "kitchenOven", label: "oven closed" },
  { tex: "kitchenOvenCookies", label: "cookies baking" },
  { tex: "kitchenOven", label: "oven closed" },
  { tex: "kitchenOvenPizza", label: "pizza baking" },
  { tex: "kitchenOven", label: "oven closed" },
  { tex: "kitchenOvenCake", label: "cupcakes baking" },
];
const TOGGLEABLE_DECOR = {
  lamp: { onName: "lamp on", offName: "lamp off" },
  tv: { onName: "next channel", offName: "TV off" },
  kitchenFridge: { onName: "fridge open", offName: "fridge closed" },
  kitchenSink: { onName: "tap running", offName: "tap off" },
  oven: { onName: "next oven food", offName: "oven closed" },
  mountainCampfire: { onName: "fire lit", offName: "fire out" },
  underwaterPearlLamp: { onName: "pearl glowing", offName: "pearl dim" },
};

const els = {
  canvas: document.querySelector("#worldCanvas"),
  setupOverlay: document.querySelector("#setupOverlay"),
  setupForm: document.querySelector("#setupForm"),
  eggRow: document.querySelector("#eggRow"),
  playerInput: document.querySelector("#playerInput"),
  petInput: document.querySelector("#petInput"),
  profileButton: document.querySelector("#profileButton"),
  closetButton: document.querySelector("#closetButton"),
  decorButton: document.querySelector("#decorButton"),
  resetButton: document.querySelector("#resetButton"),
  closetOverlay: document.querySelector("#closetOverlay"),
  closeClosetButton: document.querySelector("#closeClosetButton"),
  closetGrid: document.querySelector("#closetGrid"),
  decorOverlay: document.querySelector("#decorOverlay"),
  closeDecorButton: document.querySelector("#closeDecorButton"),
  decorGrid: document.querySelector("#decorGrid"),
  decorHomeTab: document.querySelector("#decorHomeTab"),
  decorKitchenTab: document.querySelector("#decorKitchenTab"),
  decorOutdoorTab: document.querySelector("#decorOutdoorTab"),
  decorWaterfallTab: document.querySelector("#decorWaterfallTab"),
  decorMountainTab: document.querySelector("#decorMountainTab"),
  decorUnderwaterTab: document.querySelector("#decorUnderwaterTab"),
  decorRemoveTarget: document.querySelector("#decorRemoveTarget"),
  objectiveTitle: document.querySelector("#objectiveTitle"),
  objectiveText: document.querySelector("#objectiveText"),
  petNameLabel: document.querySelector("#petNameLabel"),
  foodBar: document.querySelector("#foodBar"),
  energyBar: document.querySelector("#energyBar"),
  growthBar: document.querySelector("#growthBar"),
  feedButton: document.querySelector("#feedButton"),
  rubButton: document.querySelector("#rubButton"),
  fetchButton: document.querySelector("#fetchButton"),
  worldLabel: document.querySelector("#worldLabel"),
  coinLabel: document.querySelector("#coinLabel"),
  gemLabel: document.querySelector("#gemLabel"),
  sparkleLabel: document.querySelector("#sparkleLabel"),
  questButton: document.querySelector("#questButton"),
  questButtonLabel: document.querySelector("#questButtonLabel"),
  callPetButton: document.querySelector("#callPetButton"),
  homeHotspot: document.querySelector("#homeHotspot"),
  exitHomeButton: document.querySelector("#exitHomeButton"),
  bridgeHotspot: document.querySelector("#bridgeHotspot"),
  meadowHotspot: document.querySelector("#meadowHotspot"),
  mountainHotspot: document.querySelector("#mountainHotspot"),
  waterfallHotspot: document.querySelector("#waterfallHotspot"),
  underwaterHotspot: document.querySelector("#underwaterHotspot"),
  surfaceHotspot: document.querySelector("#surfaceHotspot"),
  kitchenHotspot: document.querySelector("#kitchenHotspot"),
  livingRoomHotspot: document.querySelector("#livingRoomHotspot"),
  toast: document.querySelector("#toast"),
  questOverlay: document.querySelector("#questOverlay"),
  questForm: document.querySelector("#questForm"),
  closeQuestButton: document.querySelector("#closeQuestButton"),
  questMeta: document.querySelector("#questMeta"),
  questPrompt: document.querySelector("#questPrompt"),
  lessonBox: document.querySelector("#lessonBox"),
  answerInput: document.querySelector("#answerInput"),
  choiceRow: document.querySelector("#choiceRow"),
  questFeedback: document.querySelector("#questFeedback"),
  whiteboardToggle: document.querySelector("#whiteboardToggle"),
  whiteboardPenButton: document.querySelector("#whiteboardPenButton"),
  whiteboardEraserButton: document.querySelector("#whiteboardEraserButton"),
  clearWhiteboardButton: document.querySelector("#clearWhiteboardButton"),
  workBoard: document.querySelector("#workBoard"),
  whiteboardCanvas: document.querySelector("#whiteboardCanvas"),
};

let selectedEgg = "sunny";
let toastTimer = 0;
let petPulseUntil = 0;
let petAction = null;
let petActionUntil = 0;
let petHiddenUntil = 0;
let activeRound = null;
let activeProblem = null;
let activeDecorScene = "home";
let selectedMoveTarget = { type: "pet", scene: "home" };
let lastInteractiveObjects = [];
let dragState = null;
let recentProblemKeys = [];
let workbookProblemIndex = 0;
let workbookQuestionOrder = [];
let workbookQuestionCursor = 0;
let whiteboardDrawing = null;
let whiteboardTool = "pen";
const URL_PARAMS = new URLSearchParams(window.location.search);
const IS_DEMO = URL_PARAMS.has("demo");
const SHOULD_RESET = URL_PARAMS.has("reset");

if (SHOULD_RESET) {
  resetLocalSaves();
  const cleanUrl = `${window.location.pathname}${IS_DEMO ? "?demo=1" : ""}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

let state = loadState() || createInitialState();

if (IS_DEMO) {
  state = {
    ...state,
    setup: true,
    playerName: "Demo",
    petName: "Mochi",
    egg: "mint",
    petVariant: "husky",
    stage: "puppy",
    world: 1,
    questStep: 1,
    food: 84,
    energy: 76,
    growth: 44,
    glow: 18,
    coins: 420,
    gems: 6,
    location: "home",
    waterfallUnlocked: true,
    mountainUnlocked: true,
    underwaterUnlocked: true,
    kitchenUnlocked: true,
    decorUnlocked: ["couch", "plant", "tv", "chair", "lamp", "table", "remote", "rockingDogToy", "piggyCarToy", "kitchenCounter", "kitchenSink", "kitchenWallShelves", "snackCart", "kitchenFridge", "oven", "bowlStation", "breakfastTable", "cookieTray", "shelfInsert", "cookieJar", "cupcakeStand", "teaKettle", "recipeBook", "herbPlanter", "puppyMug", "bench", "ball", "toys", "waterfallLog", "waterfallLantern", "waterfallLilypads", "waterfallBasket", "lavenderPlush", "mountainTent", "mountainCampfire", "mountainSnacks", "mountainShelter", "mountainLantern", "underwaterShellSeat", "underwaterPearlLamp", "underwaterTreasureChest", "underwaterBubbleHoop", "underwaterKelpHideout"],
    decorOwned: ["couch", "plant", "tv", "chair", "lamp", "table", "remote", "rockingDogToy", "piggyCarToy", "kitchenCounter", "kitchenSink", "kitchenWallShelves", "snackCart", "kitchenFridge", "oven", "bowlStation", "breakfastTable", "cookieTray", "shelfInsert", "cookieJar", "cupcakeStand", "teaKettle", "recipeBook", "herbPlanter", "puppyMug", "bench", "ball", "toys", "waterfallLog", "waterfallLantern", "waterfallLilypads", "waterfallBasket", "lavenderPlush", "mountainTent", "mountainCampfire", "mountainSnacks", "mountainShelter", "mountainLantern", "underwaterShellSeat", "underwaterPearlLamp", "underwaterTreasureChest", "underwaterBubbleHoop", "underwaterKelpHideout"],
    decorPlaced: ["couch", "plant", "tv", "lamp", "remote", "rockingDogToy", "piggyCarToy", "kitchenCounter", "kitchenSink", "kitchenWallShelves", "snackCart", "kitchenFridge", "oven", "bowlStation", "breakfastTable", "cookieTray", "shelfInsert", "cookieJar", "cupcakeStand", "teaKettle", "recipeBook", "herbPlanter", "puppyMug", "bench", "ball", "toys", "waterfallLog", "waterfallLantern", "waterfallLilypads", "waterfallBasket", "lavenderPlush", "mountainTent", "mountainCampfire", "mountainSnacks", "mountainShelter", "mountainLantern", "underwaterShellSeat", "underwaterPearlLamp", "underwaterTreasureChest", "underwaterBubbleHoop", "underwaterKelpHideout"],
    decorPositions: {},
    decorStates: { lamp: 1, tv: 1, kitchenFridge: 1, kitchenSink: 0, oven: 0, mountainCampfire: 1, underwaterPearlLamp: 1 },
    petPositions: {
      home: { x: -0.18, y: 0.48 },
      kitchen: { x: -0.12, y: 0.46 },
      outdoor: { x: 0.35, y: 0.56 },
      waterfall: { x: 0.08, y: 0.5 },
      mountain: { x: 0.18, y: 0.54 },
      underwater: { x: 0.12, y: 0.56 },
    },
    scenePan: { underwater: 0 },
    viewPan: {},
    tvChannel: 1,
    secretAwards: [],
    unlocked: ["none"],
    ownedLooks: ["none"],
    equipped: { look: "none" },
  };
}
selectedEgg = state.egg || "sunny";

function createInitialState() {
  return {
    setup: false,
    playerName: "",
    petName: "Mochi",
    egg: "sunny",
    petVariant: "golden",
    stage: "egg",
    world: 0,
    questStep: 0,
    food: 48,
    energy: 52,
    growth: 0,
    glow: 0,
    coins: 0,
    gems: 0,
    location: "outdoor",
    waterfallUnlocked: false,
    mountainUnlocked: false,
    underwaterUnlocked: false,
    kitchenUnlocked: false,
    decorUnlocked: [],
    decorOwned: [],
    decorPlaced: [],
    decorPositions: {},
    decorStates: {},
    petPositions: {
      home: { ...DEFAULT_PET_POSITIONS.home },
      kitchen: { ...DEFAULT_PET_POSITIONS.kitchen },
      outdoor: { ...DEFAULT_PET_POSITIONS.outdoor },
      waterfall: { ...DEFAULT_PET_POSITIONS.waterfall },
      mountain: { ...DEFAULT_PET_POSITIONS.mountain },
      underwater: { ...DEFAULT_PET_POSITIONS.underwater },
    },
    scenePan: { underwater: 0 },
    viewPan: {},
    tvChannel: 0,
    secretAwards: [],
    unlocked: ["none"],
    ownedLooks: ["none"],
    equipped: {
      look: "none",
    },
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved || typeof saved !== "object") return null;
    const legacyHomeItems = Array.isArray(saved.homeItems) ? saved.homeItems : [];
    const savedDecorUnlocked = Array.isArray(saved.decorUnlocked) ? saved.decorUnlocked : [];
    const savedDecorOwned = Array.isArray(saved.decorOwned) ? saved.decorOwned : [];
    const savedDecorPlaced = Array.isArray(saved.decorPlaced) ? saved.decorPlaced : [];
    const decorUnlocked = normalizeDecorIds([
      ...legacyHomeItems,
      ...savedDecorUnlocked,
      ...savedDecorPlaced,
      ...savedDecorOwned,
    ]);
    const decorOwned = normalizeDecorIds(savedDecorOwned.length ? savedDecorOwned : [
      ...legacyHomeItems,
      ...savedDecorPlaced,
      ...savedDecorUnlocked,
    ]);
    const decorPlaced = normalizeDecorIds(savedDecorPlaced.length ? savedDecorPlaced : legacyHomeItems)
      .filter((id) => decorUnlocked.includes(id) && decorOwned.includes(id));
    const unlockedLooks = Array.isArray(saved.unlocked) ? Array.from(new Set(["none", ...saved.unlocked])) : ["none"];
    const ownedLooks = Array.isArray(saved.ownedLooks) ? Array.from(new Set(["none", ...saved.ownedLooks])) : unlockedLooks;
    const secretAwards = Array.isArray(saved.secretAwards)
      ? Array.from(new Set(saved.secretAwards)).filter((id) => SECRET_AWARDS[id])
      : [];
    const waterfallUnlocked = Boolean(
      saved.waterfallUnlocked
      || saved.location === "waterfall"
      || Number(saved.questStep || 0) > 1
      || Number(saved.world || 0) > 0
    );
    const kitchenUnlocked = Boolean(
      saved.kitchenUnlocked
      || saved.location === "kitchen"
      || livingRoomDecorComplete(decorUnlocked)
    );
    const mountainUnlocked = Boolean(
      saved.mountainUnlocked
      || saved.location === "mountain"
    );
    const underwaterUnlocked = Boolean(
      saved.underwaterUnlocked
      || saved.location === "underwater"
      || secretAwards.includes("lanternTrail")
    );
    const location = saved.location === "home"
      ? "home"
      : saved.location === "kitchen" && kitchenUnlocked
        ? "kitchen"
      : saved.location === "underwater" && underwaterUnlocked
        ? "underwater"
      : saved.location === "mountain" && mountainUnlocked
        ? "mountain"
      : saved.location === "waterfall" && waterfallUnlocked
        ? "waterfall"
        : "outdoor";
    return {
      setup: Boolean(saved.setup),
      playerName: saved.playerName || "",
      petName: saved.petName || "Mochi",
      egg: saved.egg || "sunny",
      petVariant: normalizePetVariant(saved.petVariant, saved.egg),
      stage: saved.stage || "egg",
      world: clamp(saved.world ?? 0, 0, WORLDS.length - 1),
      questStep: clamp(saved.questStep ?? 0, 0, QUEST_FLOW.length - 1),
      food: clamp(saved.food ?? 48, 0, 100),
      energy: clamp(saved.energy ?? 52, 0, 100),
      growth: clamp(saved.growth ?? 0, 0, 100),
      glow: Math.max(0, Number(saved.glow || 0)),
      coins: Math.max(0, Number(saved.coins || 0)),
      gems: Math.max(0, Number(saved.gems || 0)),
      location,
      waterfallUnlocked,
      mountainUnlocked,
      underwaterUnlocked,
      kitchenUnlocked,
      decorUnlocked,
      decorOwned,
      decorPlaced,
      decorPositions: normalizeDecorPositions(saved.decorPositions),
      decorStates: normalizeDecorStates(saved.decorStates, saved.tvChannel),
      petPositions: normalizePetPositions(saved.petPositions),
      scenePan: normalizeScenePan(saved.scenePan),
      viewPan: normalizeViewPan(saved.viewPan),
      tvChannel: clamp(saved.tvChannel ?? saved.decorStates?.tv ?? 0, 0, TV_CHANNELS.length - 1),
      secretAwards,
      unlocked: unlockedLooks,
      ownedLooks,
      equipped: {
        look: saved.equipped?.look || saved.equipped?.sweater || saved.equipped?.hat || saved.equipped?.collar || "none",
      },
    };
  } catch {
    return null;
  }
}

function saveState() {
  if (IS_DEMO) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* The game still runs if private browsing blocks storage. */
  }
}

function resetLocalSaves() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("math-pet")) localStorage.removeItem(key);
    }
  } catch {
    /* Ignore storage errors; the in-memory game can still restart. */
  }
}

function decorItemById(id) {
  return DECOR_ITEMS.find((item) => item.id === id) || null;
}

function normalizeDecorIds(ids) {
  return Array.from(new Set(ids))
    .filter((id) => DECOR_ITEMS.some((item) => item.id === id));
}

function normalizeDecorPositions(value) {
  const source = value && typeof value === "object" ? value : {};
  return DECOR_ITEMS.reduce((positions, item) => {
    if (source[item.id] && typeof source[item.id] === "object") {
      const savedPosition = source[item.id];
      const oldDefault = DECOR_POSITION_MIGRATIONS[item.id];
      const position = oldDefault
        && Math.abs(Number(savedPosition.x) - oldDefault.x) < 0.01
        && Math.abs(Number(savedPosition.y) - oldDefault.y) < 0.01
        ? { x: item.x, y: item.y }
        : savedPosition;
      positions[item.id] = clampDecorPosition(item, position);
    }
    return positions;
  }, {});
}

function normalizeDecorStates(value, legacyTvChannel = 0) {
  const source = value && typeof value === "object" ? value : {};
  return Object.keys(TOGGLEABLE_DECOR).reduce((states, id) => {
    const raw = id === "tv" ? source[id] ?? legacyTvChannel : source[id];
    states[id] = id === "tv"
      ? clamp(Number(raw || 0), 0, TV_CHANNELS.length - 1)
      : id === "oven"
        ? clamp(Number(raw || 0), 0, OVEN_STATES.length - 1)
      : raw ? 1 : 0;
    return states;
  }, {});
}

function normalizePetPositions(value) {
  const source = value && typeof value === "object" ? value : {};
  return DECOR_SCENES.reduce((positions, scene) => {
    positions[scene] = clampScenePosition(scene, source[scene] || DEFAULT_PET_POSITIONS[scene]);
    return positions;
  }, {});
}

function normalizeScenePan(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    underwater: wrap01(source.underwater || 0),
  };
}

function normalizeViewPan(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Array.from(VIEW_PAN_SCENES).map((scene) => [
    scene,
    clamp(source[scene] || 0, -VIEW_PAN_LIMITS[scene], VIEW_PAN_LIMITS[scene]),
  ]));
}

function variantForEgg(eggId) {
  return EGG_CHOICES.find((choice) => choice.id === eggId)?.variant || "golden";
}

function normalizePetVariant(variant, eggId = "sunny") {
  if (PET_VARIANTS[variant]) return variant;
  return variantForEgg(eggId);
}

function currentPetVariant() {
  state.petVariant = normalizePetVariant(state.petVariant, state.egg);
  return state.petVariant;
}

function currentPetVariantName() {
  return PET_VARIANTS[currentPetVariant()]?.name || PET_VARIANTS.golden.name;
}

function petTextureKeyFor(frame, variant = currentPetVariant(), look = state.equipped?.look || "none") {
  if (currentScene() === "underwater") {
    const scubaFrame = SCUBA_FRAMES.includes(frame) ? frame : "base";
    return `pet-${variant}-scuba-${scubaFrame}`;
  }
  const dressedKey = look !== "none" && ACTION_LOOK_FRAMES.includes(frame)
    ? `pet-${variant}-${look}-${frame}`
    : "";
  if (dressedKey && ASSETS[dressedKey]) return dressedKey;
  return `pet-${variant}-${frame}`;
}

function petFrameAsset(frame, variant = currentPetVariant(), look = state.equipped?.look || "none") {
  return ASSETS[petTextureKeyFor(frame, variant, look)] || ASSETS[petTextureKeyFor("base", "golden", "none")];
}

function currentScene() {
  if (state.location === "home") return "home";
  if (state.location === "kitchen" && state.kitchenUnlocked) return "kitchen";
  if (state.location === "underwater" && state.underwaterUnlocked) return "underwater";
  if (state.location === "mountain" && state.mountainUnlocked) return "mountain";
  if (state.location === "waterfall" && state.waterfallUnlocked) return "waterfall";
  return "outdoor";
}

function decorSceneLabel(scene) {
  if (scene === "home") return "Home";
  if (scene === "kitchen") return "Kitchen";
  if (scene === "waterfall") return "Waterfall";
  if (scene === "mountain") return "Mountain";
  if (scene === "underwater") return "Underwater";
  return "Outside";
}

function isDecorSceneAvailable(scene) {
  if (scene === "kitchen") return state.kitchenUnlocked;
  if (scene === "mountain") return state.mountainUnlocked;
  if (scene === "underwater") return state.underwaterUnlocked;
  return scene !== "waterfall" || state.waterfallUnlocked;
}

function decorTabForScene(scene) {
  if (scene === "home") return els.decorHomeTab;
  if (scene === "kitchen") return els.decorKitchenTab;
  if (scene === "waterfall") return els.decorWaterfallTab;
  if (scene === "mountain") return els.decorMountainTab;
  if (scene === "underwater") return els.decorUnderwaterTab;
  return els.decorOutdoorTab;
}

function sceneWorldLabel(scene = currentScene()) {
  if (scene === "home") return "Cozy Home";
  if (scene === "kitchen") return "Kitchen";
  if (scene === "waterfall") return "Waterfall Clearing";
  if (scene === "mountain") return "Mountain Shelter";
  if (scene === "underwater") return "Underwater Reef";
  const world = currentWorld();
  return `${world.name}  ${state.world + 1}/${WORLDS.length}`;
}

function sceneBackdropTexture(scene = currentScene()) {
  if (scene === "home") return "home";
  if (scene === "kitchen") return "kitchen";
  if (scene === "waterfall") return "waterfall";
  if (scene === "mountain") return "mountain";
  if (scene === "underwater") return "underwater";
  return "backdrop";
}

function decorItemsForScene(scene) {
  return DECOR_ITEMS.filter((item) => item.scene === scene);
}

function placedDecorForScene(scene) {
  return decorItemsForScene(scene).filter((item) => state.decorPlaced.includes(item.id));
}

function defaultDecorPosition(item) {
  return { x: item.x, y: item.y };
}

function getDecorPosition(item) {
  return state.decorPositions[item.id] || defaultDecorPosition(item);
}

function setDecorPosition(item, position) {
  state.decorPositions[item.id] = clampDecorPosition(item, position);
}

function getPetPosition(scene = currentScene()) {
  return state.petPositions?.[scene] || DEFAULT_PET_POSITIONS[scene];
}

function setPetPosition(scene, position) {
  state.petPositions[scene] = clampScenePosition(scene, position);
}

function clampScenePosition(scene, position) {
  const bounds = MOVE_BOUNDS[scene] || MOVE_BOUNDS.outdoor;
  return {
    x: isPanoramaScene(scene)
      ? wrapPanoramaX(position?.x ?? 0)
      : clamp(position?.x ?? 0, bounds.x[0], bounds.x[1]),
    y: clamp(position?.y ?? 0, bounds.y[0], bounds.y[1]),
  };
}

function clampDecorPosition(item, position) {
  const bounds = BACKDROP_DECOR_MOVE_BOUNDS[item.scene] || MOVE_BOUNDS[item.scene] || MOVE_BOUNDS.outdoor;
  return {
    x: isPanoramaScene(item.scene)
      ? wrapPanoramaX(position?.x ?? 0)
      : clamp(position?.x ?? 0, bounds.x[0], bounds.x[1]),
    y: clamp(position?.y ?? 0, bounds.y[0], bounds.y[1]),
  };
}

function centeredDecorPosition(item) {
  const bounds = BACKDROP_DECOR_MOVE_BOUNDS[item.scene] || MOVE_BOUNDS[item.scene] || MOVE_BOUNDS.outdoor;
  return clampDecorPosition(item, {
    x: isPanoramaScene(item.scene) ? 0 : (bounds.x[0] + bounds.x[1]) / 2,
    y: (bounds.y[0] + bounds.y[1]) / 2,
  });
}

function resetDecorPosition(item) {
  state.decorPositions[item.id] = centeredDecorPosition(item);
}

function isDecorUnlocked(id) {
  return state.decorUnlocked.includes(id);
}

function isDecorOwned(id) {
  return state.decorOwned.includes(id);
}

function isDecorPlaced(id) {
  return isDecorOwned(id) && state.decorPlaced.includes(id);
}

function decorStateValue(id) {
  if (id === "tv") return clamp(state.tvChannel ?? state.decorStates?.tv ?? 0, 0, TV_CHANNELS.length - 1);
  if (id === "oven") return clamp(state.decorStates?.oven ?? 0, 0, OVEN_STATES.length - 1);
  return state.decorStates?.[id] ? 1 : 0;
}

function setDecorStateValue(id, value) {
  if (!state.decorStates || typeof state.decorStates !== "object") state.decorStates = {};
  const normalized = id === "tv"
    ? clamp(Number(value || 0), 0, TV_CHANNELS.length - 1)
    : id === "oven"
      ? clamp(Number(value || 0), 0, OVEN_STATES.length - 1)
    : value ? 1 : 0;
  state.decorStates[id] = normalized;
  if (id === "tv") state.tvChannel = normalized;
}

function isToggleableDecor(id) {
  return Boolean(TOGGLEABLE_DECOR[id]);
}

function toggleDecorState(id) {
  if (!isToggleableDecor(id) || !isDecorPlaced(id)) return false;
  const next = id === "tv"
    ? (decorStateValue("tv") + 1) % TV_CHANNELS.length
    : id === "oven"
      ? (decorStateValue("oven") + 1) % OVEN_STATES.length
    : decorStateValue(id) ? 0 : 1;
  setDecorStateValue(id, next);
  const label = id === "tv"
    ? TV_CHANNELS[next]?.label || TOGGLEABLE_DECOR[id].offName
    : id === "oven"
      ? OVEN_STATES[next]?.label || TOGGLEABLE_DECOR[id].offName
    : next ? TOGGLEABLE_DECOR[id].onName : TOGGLEABLE_DECOR[id].offName;
  showToast(`${decorItemById(id)?.name || "Decor"}: ${label}.`);
  if (id === "tv") checkSecretAwards("tv");
  if (id === "kitchenFridge" || id === "oven") checkSecretAwards("kitchen-state");
  if (id === "underwaterPearlLamp") checkSecretAwards("underwater-state");
  return true;
}

function handleDecorTap(id) {
  if (id === "remote") return toggleDecorState("tv");
  return toggleDecorState(id);
}

function decorTextureForItem(item) {
  if (item.id === "tv") return "homeTvOff";
  if (item.id === "lamp") return decorStateValue("lamp") ? "homeLampOn" : "homeLamp";
  if (item.id === "kitchenFridge") return decorStateValue("kitchenFridge") ? "kitchenFridgeOpen" : "kitchenFridge";
  if (item.id === "kitchenSink") return decorStateValue("kitchenSink") ? "kitchenSinkOn" : "kitchenSink";
  if (item.id === "oven") return OVEN_STATES[decorStateValue("oven")]?.tex || "kitchenOven";
  if (item.id === "mountainCampfire") return decorStateValue("mountainCampfire") ? "mountainCampfireOn" : "mountainCampfireOff";
  if (item.id === "underwaterPearlLamp") return decorStateValue("underwaterPearlLamp") ? "underwaterPearlLampOn" : "underwaterPearlLampOff";
  return item.tex;
}

function decorLayoutForItem(item) {
  if (item.id === "kitchenFridge" && decorStateValue("kitchenFridge")) {
    return { w: 2.12, h: 2.34 };
  }
  const scale = item.scene === "mountain" ? MOUNTAIN_DECOR_SCALE : 1;
  return { w: item.w * scale, h: item.h * scale };
}

function nextDecorItem(scene) {
  return decorItemsForScene(scene).find((item) => !isDecorUnlocked(item.id));
}

function livingRoomDecorComplete(ids = state.decorUnlocked) {
  const unlocked = new Set(Array.isArray(ids) ? ids : []);
  return decorItemsForScene("home")
    .filter((item) => !item.optional)
    .every((item) => unlocked.has(item.id));
}

function unlockKitchenIfReady() {
  if (state.kitchenUnlocked || !livingRoomDecorComplete()) return "";
  state.kitchenUnlocked = true;
  return "The kitchen door opened inside the house.";
}

function lockedDecorReason(scene) {
  if (scene === "kitchen") return "Living room decor";
  if (scene === "waterfall") return "Bridge Algebra";
  if (scene === "mountain") return "Waterfall Boss";
  if (scene === "underwater") return "Diving Gear";
  return "Quest locked";
}

function costText(cost = {}) {
  const parts = [];
  const coins = Number(cost.coins || 0);
  const gems = Number(cost.gems || 0);
  if (coins) parts.push(`${coins} coins`);
  if (gems) parts.push(`${gems} ${gems === 1 ? "gem" : "gems"}`);
  return parts.length ? parts.join(" + ") : "Free";
}

function canAfford(cost = {}) {
  return state.coins >= Number(cost.coins || 0) && state.gems >= Number(cost.gems || 0);
}

function spendCost(cost = {}) {
  if (!canAfford(cost)) return false;
  state.coins = Math.max(0, state.coins - Number(cost.coins || 0));
  state.gems = Math.max(0, state.gems - Number(cost.gems || 0));
  return true;
}

function rewardCoins(amount) {
  const earned = Math.max(0, Number(amount || 0));
  state.coins += earned;
  return earned;
}

function discoverGems(amount) {
  const found = Math.max(0, Number(amount || 0));
  state.gems += found;
  return found;
}

function grantSecretAward(id) {
  const award = SECRET_AWARDS[id];
  if (!award || state.secretAwards.includes(id)) return false;
  state.secretAwards.push(id);
  state.coins += award.coins;
  state.gems += award.gems;
  state.glow += award.glow;
  let extra = "";
  if (id === "lanternTrail" && !state.underwaterUnlocked) {
    state.underwaterUnlocked = true;
    const underwaterMessage = unlockNextDecorReward("underwater");
    extra = ` Dive Below opened.${underwaterMessage.includes("fully stocked") ? "" : ` ${underwaterMessage}`}`;
  }
  triggerPetAction("celebrate", 1400);
  showToast(`Secret award: ${award.title}. +${award.coins} coins +${award.gems} gem.${extra}`);
  return true;
}

function checkSecretAwards(trigger = "") {
  if (state.stage === "egg") return false;
  let awarded = false;
  if (isDecorPlaced("couch") && isDecorPlaced("tv") && state.tvChannel === 1 && petIsOnCouch()) {
    awarded = grantSecretAward("couchCritic") || awarded;
  }
  if (state.location === "kitchen" && trigger === "feed" && isDecorPlaced("snackCart") && isDecorPlaced("bowlStation")) {
    awarded = grantSecretAward("snackChef") || awarded;
  }
  if (state.location === "outdoor" && trigger === "fetch" && isDecorPlaced("bench") && isDecorPlaced("ball") && isDecorPlaced("toys")) {
    awarded = grantSecretAward("parkMvp") || awarded;
  }
  if (state.location === "waterfall" && isDecorPlaced("waterfallLog") && isDecorPlaced("waterfallLantern") && isDecorPlaced("waterfallLilypads")) {
    awarded = grantSecretAward("lanternTrail") || awarded;
  }
  if (
    state.location === "mountain"
    && trigger === "feed"
    && isDecorPlaced("mountainTent")
    && isDecorPlaced("mountainCampfire")
    && decorStateValue("mountainCampfire")
    && isDecorPlaced("mountainSnacks")
    && isDecorPlaced("mountainShelter")
  ) {
    awarded = grantSecretAward("summitSupper") || awarded;
  }
  if (
    state.location === "underwater"
    && trigger === "fetch"
    && isDecorPlaced("underwaterPearlLamp")
    && decorStateValue("underwaterPearlLamp")
    && isDecorPlaced("underwaterTreasureChest")
    && isDecorPlaced("underwaterBubbleHoop")
    && isDecorPlaced("underwaterKelpHideout")
  ) {
    awarded = grantSecretAward("reefTreasure") || awarded;
  }
  if (awarded) {
    saveState();
    renderHud();
  }
  return awarded;
}

function restartGame() {
  resetLocalSaves();
  selectedEgg = "sunny";
  activeRound = null;
  activeProblem = null;
  dragState = null;
  state = createInitialState();
  els.playerInput.value = "";
  els.petInput.value = "";
  renderEggChoices();
  setOverlay(els.questOverlay, false);
  setOverlay(els.closetOverlay, false);
  setOverlay(els.decorOverlay, false);
  setOverlay(els.setupOverlay, true);
  renderHud();
  showToast("Restarted. Choose a new egg.");
}

function clamp(value, min, max) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : min;
  return Math.max(min, Math.min(max, safeValue));
}

function wrap01(value) {
  const numeric = Number(value) || 0;
  return ((numeric % 1) + 1) % 1;
}

function isPanoramaScene(scene) {
  return PANORAMA_SCENES.has(scene);
}

function isCompactViewport() {
  return window.innerWidth <= 720 || window.innerHeight <= 520;
}

function maxViewPan(scene) {
  if (!VIEW_PAN_SCENES.has(scene) || !isCompactViewport()) return 0;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const shortLandscape = window.innerHeight <= 520 && aspect > 1.65;
  const narrowPortrait = window.innerWidth <= 540 && aspect < 0.9;
  const base = VIEW_PAN_LIMITS[scene] || 1.1;
  const boost = shortLandscape ? 1.15 : narrowPortrait ? 1.25 : 1;
  return base * boost;
}

function canViewPan(scene) {
  return maxViewPan(scene) > 0.05;
}

function getViewPan(scene) {
  const max = maxViewPan(scene);
  if (!max) return 0;
  return clamp(state.viewPan?.[scene] || 0, -max, max);
}

function setViewPan(scene, value) {
  if (!state.viewPan || typeof state.viewPan !== "object") state.viewPan = normalizeViewPan();
  const max = maxViewPan(scene);
  state.viewPan[scene] = max ? clamp(value, -max, max) : 0;
}

function getScenePan(scene) {
  return wrap01(state.scenePan?.[scene] || 0);
}

function setScenePan(scene, value) {
  if (!state.scenePan || typeof state.scenePan !== "object") state.scenePan = normalizeScenePan();
  state.scenePan[scene] = wrap01(value);
}

function panoramaOffset(scene) {
  return isPanoramaScene(scene) ? getScenePan(scene) * PANORAMA_WIDTH : 0;
}

function visibleDefaultPetPosition(scene) {
  const base = DEFAULT_PET_POSITIONS[scene] || DEFAULT_PET_POSITIONS.outdoor;
  return {
    ...base,
    x: isPanoramaScene(scene)
      ? wrapPanoramaX(base.x + panoramaOffset(scene))
      : base.x + getViewPan(scene),
  };
}

function wrapPanoramaX(x, width = PANORAMA_WIDTH) {
  return (((x + width / 2) % width) + width) % width - width / 2;
}

function isBackdropLockedScene(scene) {
  return scene === "outdoor" || scene === "waterfall" || scene === "mountain" || scene === "underwater";
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function currentQuestType() {
  return QUEST_FLOW[state.questStep] || "boss";
}

function currentWorld() {
  return WORLDS[state.world] || WORLDS[0];
}

function currentQuestSize() {
  return currentQuestType() === "boss" ? 6 : 4;
}

function currentQuestPass() {
  return currentQuestType() === "boss" ? BOSS_PASS : QUEST_PASS;
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function triggerPetAction(action, duration = 1000) {
  petPulseUntil = performance.now() + duration;
  if (state.stage === "egg") {
    petAction = null;
    petActionUntil = 0;
    return;
  }
  petAction = action;
  petActionUntil = performance.now() + duration;
}

function setOverlay(overlay, show) {
  overlay.classList.toggle("show", show);
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function renderEggChoices() {
  const locked = state.setup && state.stage !== "egg";
  els.eggRow.innerHTML = EGG_CHOICES.map((choice) => `
    <button class="egg-pick ${selectedEgg === choice.id ? "active" : ""}" data-egg="${choice.id}" ${locked ? "disabled" : ""} type="button">
      <img src="${ASSETS.egg}" alt="" />
      <strong>${choice.label}</strong>
      <span>${locked && selectedEgg === choice.id ? "Hatched" : "Blind box"}</span>
    </button>
  `).join("");
}

function renderHud() {
  renderEggChoices();
  const quest = currentQuestType();
  const world = currentWorld();
  const questName = QUEST_LABELS[quest];
  const pass = currentQuestPass();
  const size = currentQuestSize();
  const scene = currentScene();
  const inHome = scene === "home";
  const inKitchen = scene === "kitchen";
  const indoors = inHome || inKitchen;
  const inWaterfall = scene === "waterfall";
  const inMountain = scene === "mountain";
  const inUnderwater = scene === "underwater";
  const nextDecor = nextDecorItem(scene);
  const secretCount = state.secretAwards?.length || 0;
  let objectiveTitle = `${questName}: ${world.name}`;
  let objectiveText = nextDecor
    ? `${quest === "fraction" && !state.waterfallUnlocked ? "Pass Bridge Algebra to open the bridge crossing. " : ""}Practice ${world.focus}. Passing makes ${nextDecor.name} available and earns coins.`
    : `${quest === "fraction" && !state.waterfallUnlocked ? "Pass Bridge Algebra to open the bridge crossing. " : ""}Pass with ${pass}/${size} correct to earn coins and keep growing.`;

  if (state.stage === "egg") {
    objectiveTitle = "Hatch the puppy";
    objectiveText = "Click Practice Math. Pass the first growth quest to hatch the egg.";
  } else if (inHome) {
    objectiveTitle = "Cozy Home";
    if (nextDecor) {
      objectiveText = `Do home math to make ${nextDecor.name} available. Coins buy it in Decor.`;
    } else {
      objectiveText = state.kitchenUnlocked
        ? "Living room decor is stocked. The kitchen is open from inside the house."
        : "Living room decor is stocked. The next room opens when the last piece is available.";
    }
  } else if (inKitchen) {
    objectiveTitle = "Kitchen";
    objectiveText = nextDecor
      ? `Clear kitchen math to make ${nextDecor.name} available. Coins buy it in Decor.`
      : "Kitchen decor is stocked. Keep practicing to earn coins, gems, and growth XP.";
  } else if (inWaterfall) {
    objectiveTitle = "Waterfall Clearing";
    objectiveText = nextDecor
      ? `Practice at the waterfall to make ${nextDecor.name} available.`
      : state.underwaterUnlocked
        ? "Diving gear found. Dive below the waterfall or take the summit trail."
        : state.mountainUnlocked
          ? "Waterfall decor is stocked. The summit trail is open, and a hidden discovery waits nearby."
          : "Waterfall decor is stocked. Clear the boss quest here to open the summit trail.";
  } else if (inMountain) {
    objectiveTitle = "Mountain Shelter";
    objectiveText = nextDecor
      ? `Practice at the mountain to make ${nextDecor.name} available.`
      : "Mountain camp is stocked. Try camp routines for hidden rewards, or return to the waterfall.";
  } else if (inUnderwater) {
    objectiveTitle = "Underwater Reef";
    objectiveText = nextDecor
      ? `Scuba gear is on. Practice underwater math to make ${nextDecor.name} available.`
      : "The reef is stocked. Try a pearl-lit fetch through the bubble hoop near the treasure.";
  }

  els.setupOverlay.classList.toggle("show", !state.setup);
  els.objectiveTitle.textContent = objectiveTitle;
  els.objectiveText.textContent = objectiveText;
  els.petNameLabel.textContent = state.stage === "egg" ? `${state.petName}'s egg` : `${state.petName} the ${currentPetVariantName()}`;
  els.foodBar.style.width = `${state.food}%`;
  els.energyBar.style.width = `${state.energy}%`;
  els.growthBar.style.width = `${state.growth}%`;
  els.worldLabel.textContent = sceneWorldLabel(scene);
  els.coinLabel.textContent = `${state.coins} coins`;
  els.gemLabel.textContent = `${state.gems} ${state.gems === 1 ? "gem" : "gems"}`;
  els.sparkleLabel.textContent = `${state.glow} glow  ${placedDecorForScene(scene).length}/${decorItemsForScene(scene).length} decor${secretCount ? `  ${secretCount} secret` : ""}`;
  els.questButtonLabel.textContent = state.stage === "egg" ? "Hatch Quest" : inHome ? "Decor Quest" : inKitchen ? "Kitchen Quest" : inWaterfall ? "Waterfall Quest" : inMountain ? "Mountain Quest" : inUnderwater ? "Reef Quest" : questName;
  els.homeHotspot.classList.toggle("show", state.setup && state.stage !== "egg" && scene === "outdoor");
  els.exitHomeButton.classList.toggle("show", state.setup && indoors);
  els.bridgeHotspot.classList.toggle("show", state.setup && scene === "outdoor" && state.waterfallUnlocked);
  els.meadowHotspot.classList.toggle("show", state.setup && inWaterfall);
  els.mountainHotspot.classList.toggle("show", state.setup && inWaterfall && state.mountainUnlocked);
  els.waterfallHotspot.classList.toggle("show", state.setup && inMountain);
  els.underwaterHotspot.classList.toggle("show", state.setup && inWaterfall && state.underwaterUnlocked);
  els.surfaceHotspot.classList.toggle("show", state.setup && inUnderwater);
  els.kitchenHotspot.classList.toggle("show", state.setup && inHome && state.kitchenUnlocked);
  els.livingRoomHotspot.classList.toggle("show", state.setup && inKitchen);
  renderCloset();
  renderDecor();
}

function unlockNextDecorReward(scene) {
  const item = nextDecorItem(scene);
  if (!item) {
    const kitchenMessage = scene === "home" ? unlockKitchenIfReady() : "";
    return kitchenMessage || `${decorSceneLabel(scene)} shop is fully stocked.`;
  }
  state.decorUnlocked.push(item.id);
  const kitchenMessage = scene === "home" ? unlockKitchenIfReady() : "";
  return `${item.name} is now available in Decor for ${costText(item.cost)}.${kitchenMessage ? ` ${kitchenMessage}` : ""}`;
}

function renderCloset() {
  els.closetGrid.innerHTML = CLOSET.map((item) => {
    const unlocked = item.unlock || state.unlocked.includes(item.id);
    const owned = item.id === "none" || state.ownedLooks.includes(item.id);
    const active = item.id === "none"
      ? state.equipped.look === "none"
      : state.equipped.look === item.id;
    const previewFrame = item.id === "none" ? "base" : item.id;
    const image = `<img src="${petFrameAsset(previewFrame)}" alt="" />`;
    const status = !unlocked
      ? "Locked"
      : owned
        ? (active ? "Wearing" : "Tap to wear")
        : `Buy ${costText(item.cost)}`;
    return `
      <button class="closet-item ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-closet="${item.id}" ${unlocked ? "" : "disabled"} type="button">
        ${image}
        <strong>${item.name}</strong>
        <span>${status}</span>
      </button>
    `;
  }).join("");
}

function renderDecor() {
  if (!els.decorGrid) return;
  DECOR_SCENES.forEach((scene) => {
    const tab = decorTabForScene(scene);
    tab.classList.toggle("active", activeDecorScene === scene);
    tab.classList.toggle("locked", !isDecorSceneAvailable(scene));
  });

  const petImage = state.stage === "egg" ? ASSETS.egg : petFrameAsset(equippedPetFrame());
  const sceneAvailable = isDecorSceneAvailable(activeDecorScene);
  const petActive = sceneAvailable && selectedMoveTarget.type === "pet" && selectedMoveTarget.scene === activeDecorScene;
  const cards = sceneAvailable ? [`
    <button class="decor-item ${petActive ? "active" : ""}" data-decor-pet="${activeDecorScene}" type="button">
      <img src="${petImage}" alt="" />
      <strong>${state.stage === "egg" ? "Egg spot" : "Pet spot"}</strong>
      <span>Placed</span>
    </button>
  `] : [`
    <button class="decor-item locked" type="button" disabled>
      <span class="closet-empty">?</span>
      <strong>${decorSceneLabel(activeDecorScene)} locked</strong>
      <span>${lockedDecorReason(activeDecorScene)}</span>
    </button>
  `];

  decorItemsForScene(activeDecorScene).forEach((item) => {
    const unlocked = sceneAvailable && isDecorUnlocked(item.id);
    const owned = isDecorOwned(item.id);
    const placed = isDecorPlaced(item.id);
    const active = selectedMoveTarget.type === "decor" && selectedMoveTarget.id === item.id;
    const status = !unlocked
      ? item.reward
      : owned
        ? (placed ? "Placed" : "Owned")
        : `Buy ${costText(item.cost)}`;
    cards.push(`
      <button class="decor-item ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-decor-id="${item.id}" type="button">
        <img src="${ASSETS[decorTextureForItem(item)]}" alt="" />
        <strong>${item.name}</strong>
        <span>${status}</span>
      </button>
    `);
  });

  els.decorGrid.innerHTML = cards.join("");
}

function selectedTarget() {
  if (selectedMoveTarget.type === "pet") {
    if (!isDecorSceneAvailable(activeDecorScene)) return null;
    if (selectedMoveTarget.scene !== activeDecorScene) return null;
    return { type: "pet", scene: activeDecorScene, name: state.stage === "egg" ? "Egg spot" : "Pet spot" };
  }
  const item = decorItemById(selectedMoveTarget.id);
  if (!item || item.scene !== activeDecorScene || !isDecorUnlocked(item.id) || !isDecorPlaced(item.id)) return null;
  return { type: "decor", item, name: item.name };
}

function toggleDecorItem(itemId) {
  const item = decorItemById(itemId);
  if (!item) return;
  if (!isDecorUnlocked(item.id)) {
    showToast(`${item.name} unlocks from ${item.reward.toLowerCase()}.`);
    return;
  }
  if (!isDecorOwned(item.id)) {
    if (!spendCost(item.cost)) {
      showToast(`${item.name} costs ${costText(item.cost)}.`);
      return;
    }
    state.decorOwned.push(item.id);
    state.decorPlaced.push(item.id);
    if (!state.decorPositions[item.id]) state.decorPositions[item.id] = defaultDecorPosition(item);
    selectedMoveTarget = { type: "decor", id: item.id };
    showToast(`${item.name} purchased and placed.`);
    checkSecretAwards("decor");
    saveState();
    renderHud();
    return;
  }
  if (isDecorPlaced(item.id)) {
    state.decorPlaced = state.decorPlaced.filter((id) => id !== item.id);
    selectedMoveTarget = { type: "pet", scene: item.scene };
    showToast(`${item.name} put away. Tap it again to place it in the center.`);
  } else {
    state.decorPlaced.push(item.id);
    resetDecorPosition(item);
    selectedMoveTarget = { type: "decor", id: item.id };
    showToast(`${item.name} placed in the center.`);
  }
  checkSecretAwards("decor");
  saveState();
  renderHud();
}

function getTargetPosition(target) {
  if (target.type === "pet") return getPetPosition(target.scene || currentScene());
  const item = decorItemById(target.id);
  return item ? getDecorPosition(item) : { x: 0, y: 0 };
}

function setTargetPosition(target, position) {
  if (target.type === "pet") {
    setPetPosition(target.scene || currentScene(), position);
    return;
  }
  const item = decorItemById(target.id);
  if (item) setDecorPosition(item, position);
}

function setDecorRemoveTargetState(visible, active = false) {
  if (!els.decorRemoveTarget) return;
  els.decorRemoveTarget.classList.toggle("show", Boolean(visible));
  els.decorRemoveTarget.classList.toggle("active", Boolean(visible && active));
  els.decorRemoveTarget.setAttribute("aria-hidden", visible ? "false" : "true");
}

function pointerOverDecorRemoveTarget(clientX, clientY) {
  if (!els.decorRemoveTarget || !els.decorRemoveTarget.classList.contains("show")) return false;
  const rect = els.decorRemoveTarget.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function putAwayDecorItem(id) {
  const item = decorItemById(id);
  if (!item || !isDecorPlaced(item.id)) return false;
  state.decorPlaced = state.decorPlaced.filter((decorId) => decorId !== item.id);
  if (selectedMoveTarget.type === "decor" && selectedMoveTarget.id === item.id) {
    selectedMoveTarget = { type: "pet", scene: item.scene };
  }
  showToast(`${item.name} put away. Open Decor to place it again.`);
  checkSecretAwards("decor");
  return true;
}

function finishDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  try {
    els.canvas.releasePointerCapture(event.pointerId);
  } catch {
    /* Pointer capture may already be released by the browser. */
  }
  if (dragState.type === "pan") {
    dragState = null;
    setDecorRemoveTargetState(false);
    saveState();
    renderHud();
    return;
  }
  const clickDistance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
  const shouldPutAway = event.type === "pointerup"
    && dragState.target.type === "decor"
    && clickDistance >= 8
    && pointerOverDecorRemoveTarget(event.clientX, event.clientY);
  setDecorRemoveTargetState(false);
  if (shouldPutAway) {
    putAwayDecorItem(dragState.target.id);
    dragState = null;
    saveState();
    renderHud();
    return;
  }
  if (clickDistance < 8 && dragState.target.type === "decor" && handleDecorTap(dragState.target.id)) {
    dragState = null;
    saveState();
    renderHud();
    return;
  }
  snapDraggedTarget(dragState.target);
  dragState = null;
  saveState();
  renderHud();
}

function pointerBoundsForTarget(target, scene) {
  if (target.type === "decor") {
    const item = decorItemById(target.id);
    return (item && BACKDROP_DECOR_MOVE_BOUNDS[item.scene])
      || MOVE_BOUNDS[item?.scene || scene]
      || MOVE_BOUNDS.outdoor;
  }
  return MOVE_BOUNDS[scene] || MOVE_BOUNDS.outdoor;
}

function pointerToScenePosition(scene, clientX, clientY, bounds = MOVE_BOUNDS[scene] || MOVE_BOUNDS.outdoor) {
  const rect = els.canvas.getBoundingClientRect();
  const nx = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const ny = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  const screenX = bounds.x[0] + nx * (bounds.x[1] - bounds.x[0]);
  return {
    x: isPanoramaScene(scene)
      ? wrapPanoramaX(screenX + panoramaOffset(scene))
      : screenX + getViewPan(scene),
    y: bounds.y[1] - ny * (bounds.y[1] - bounds.y[0]),
  };
}

function snapDraggedTarget(target) {
  if (target.type !== "pet" || target.scene !== "home" || !isDecorPlaced("couch")) return;
  const petPosition = getPetPosition("home");
  const couchSeat = couchPetPosition();
  const distance = Math.hypot(petPosition.x - couchSeat.x, petPosition.y - couchSeat.y);
  if (distance > 0.85) return;
  setPetPosition("home", couchSeat);
  triggerPetAction("couch", 1800);
  showToast(`${state.petName} climbed onto the couch.`);
  checkSecretAwards("move");
}

function couchPetPosition() {
  const couch = decorItemById("couch");
  const position = couch ? getDecorPosition(couch) : DEFAULT_PET_POSITIONS.home;
  return {
    x: position.x + COUCH_PET_OFFSET.x,
    y: position.y + COUCH_PET_OFFSET.y,
  };
}

function pickInteractiveObject(clientX, clientY) {
  const rect = els.canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  for (let index = lastInteractiveObjects.length - 1; index >= 0; index -= 1) {
    const entry = lastInteractiveObjects[index];
    if (x >= entry.left && x <= entry.right && y >= entry.top && y <= entry.bottom) {
      return entry;
    }
  }
  return null;
}

function unlock(itemId) {
  if (!state.unlocked.includes(itemId)) {
    state.unlocked.push(itemId);
    return true;
  }
  return false;
}

function equip(itemId) {
  const item = CLOSET.find((entry) => entry.id === itemId);
  if (!item || (!item.unlock && !state.unlocked.includes(item.id))) return;
  if (item.id !== "none" && !state.ownedLooks.includes(item.id)) {
    if (!spendCost(item.cost)) {
      showToast(`${item.name} costs ${costText(item.cost)}.`);
      return;
    }
    state.ownedLooks.push(item.id);
    showToast(`${item.name} purchased.`);
  }
  state.equipped.look = item.id;
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
}

function feedPet() {
  if (state.stage === "egg") {
    showToast("Hatch the egg first, then snacks can help.");
    triggerPetAction("celebrate", 700);
    return;
  }
  if (state.coins < FEED_COIN_COST) {
    showToast(`Earn ${FEED_COIN_COST} coins in math to buy a snack.`);
    return;
  }
  state.coins -= FEED_COIN_COST;
  state.food = clamp(state.food + 30, 0, 100);
  state.energy = clamp(state.energy + 3, 0, 100);
  saveState();
  renderHud();
  triggerPetAction("wag", 1100);
  showToast(`${state.petName} ate a snack. -${FEED_COIN_COST} coins.`);
  checkSecretAwards("feed");
}

function rubPet() {
  if (state.stage === "egg") {
    triggerPetAction("celebrate", 900);
    showToast("The egg wiggles. Math growth will hatch it.");
    return;
  }
  state.energy = clamp(state.energy + 18, 0, 100);
  state.food = clamp(state.food - 1, 0, 100);
  state.growth = clamp(state.growth + 1, 0, 100);
  saveState();
  renderHud();
  triggerPetAction("roll", 1450);
  showToast(`${state.petName} relaxed and recovered energy.`);
}

function playFetch() {
  if (state.stage === "egg") {
    showToast("Fetch unlocks after the egg hatches.");
    return;
  }
  if (state.energy < 8 || state.food < 8) {
    showToast("Feed or rub first, then fetch will help growth.");
    return;
  }
  state.energy = clamp(state.energy - 8, 0, 100);
  state.food = clamp(state.food - 5, 0, 100);
  state.growth = clamp(state.growth + 5, 0, 100);
  petHiddenUntil = performance.now() + 1500;
  saveState();
  renderHud();
  triggerPetAction("wag", 1250);
  showToast(`${state.petName} chased the toy. Call brings them back if they run off-screen.`);
  checkSecretAwards("fetch");
}

function startQuest() {
  if (state.stage !== "egg" && state.energy < 8) {
    showToast(`${state.petName} is tired. Rub first, then practice.`);
    return;
  }
  if (state.stage !== "egg" && state.food < 5 && state.coins >= FEED_COIN_COST) {
    showToast(`${state.petName} is hungry. Feed a snack before practice.`);
    return;
  }
  const type = currentQuestType();
  const size = currentQuestSize();
  activeRound = {
    type,
    location: currentScene(),
    index: 0,
    size,
    pass: currentQuestPass(),
    correct: 0,
  };
  setOverlay(els.questOverlay, true);
  nextProblem();
  els.answerInput.focus();
}

function nextProblem() {
  activeProblem = makeProblem(activeRound.type, state.world);
  els.questMeta.textContent = `${QUEST_LABELS[activeRound.type]}  ${activeRound.index + 1}/${activeRound.size}  ${activeRound.correct}/${activeRound.pass} correct`;
  els.questPrompt.textContent = activeProblem.prompt;
  renderLesson(activeProblem);
  els.questFeedback.className = "quest-feedback";
  els.questFeedback.textContent = "Correct answers earn coins. Perfect clears can discover gems.";
  els.answerInput.value = "";
  els.answerInput.placeholder = activeProblem.placeholder || "Type answer";
  if (activeProblem.choices) {
    renderChoices(activeProblem.choices);
    els.answerInput.parentElement.style.display = "none";
  } else {
    els.choiceRow.replaceChildren();
    els.answerInput.parentElement.style.display = "grid";
  }
}

function renderLesson(item) {
  const title = document.createElement("strong");
  title.textContent = item.lessonTitle;
  const list = document.createElement("ol");
  item.steps.forEach((step) => {
    const row = document.createElement("li");
    row.textContent = step;
    list.append(row);
  });
  els.lessonBox.replaceChildren(title, list);
}

function renderChoices(choices) {
  els.choiceRow.replaceChildren();
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    button.textContent = choiceLabel(choice);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitChoice(index);
    });
    els.choiceRow.append(button);
  });
}

function toggleWhiteboard() {
  els.workBoard.classList.toggle("show");
}

function setWhiteboardTool(tool) {
  whiteboardTool = tool === "eraser" ? "eraser" : "pen";
  const isEraser = whiteboardTool === "eraser";
  els.whiteboardPenButton.classList.toggle("active", !isEraser);
  els.whiteboardEraserButton.classList.toggle("active", isEraser);
  els.whiteboardPenButton.setAttribute("aria-pressed", isEraser ? "false" : "true");
  els.whiteboardEraserButton.setAttribute("aria-pressed", isEraser ? "true" : "false");
  els.whiteboardCanvas.classList.toggle("eraser-mode", isEraser);
}

function clearWhiteboard() {
  const canvas = els.whiteboardCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function whiteboardPoint(event) {
  const rect = els.whiteboardCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * els.whiteboardCanvas.width,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * els.whiteboardCanvas.height,
  };
}

function configureWhiteboardStroke(ctx, tool) {
  const isEraser = tool === "eraser";
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = isEraser ? 28 : 4;
  ctx.strokeStyle = isEraser ? "rgba(0, 0, 0, 1)" : "#172632";
  ctx.fillStyle = ctx.strokeStyle;
}

function drawWhiteboardPoint(ctx, point, tool) {
  configureWhiteboardStroke(ctx, tool);
  ctx.beginPath();
  ctx.arc(point.x, point.y, ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function startWhiteboardStroke(event) {
  event.preventDefault();
  const ctx = els.whiteboardCanvas.getContext("2d");
  const point = whiteboardPoint(event);
  whiteboardDrawing = { pointerId: event.pointerId, point, tool: whiteboardTool };
  els.whiteboardCanvas.setPointerCapture(event.pointerId);
  drawWhiteboardPoint(ctx, point, whiteboardDrawing.tool);
  configureWhiteboardStroke(ctx, whiteboardDrawing.tool);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

function moveWhiteboardStroke(event) {
  if (!whiteboardDrawing || whiteboardDrawing.pointerId !== event.pointerId) return;
  event.preventDefault();
  const ctx = els.whiteboardCanvas.getContext("2d");
  const point = whiteboardPoint(event);
  configureWhiteboardStroke(ctx, whiteboardDrawing.tool);
  ctx.beginPath();
  ctx.moveTo(whiteboardDrawing.point.x, whiteboardDrawing.point.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  whiteboardDrawing.point = point;
}

function finishWhiteboardStroke(event) {
  if (!whiteboardDrawing || whiteboardDrawing.pointerId !== event.pointerId) return;
  try {
    els.whiteboardCanvas.releasePointerCapture(event.pointerId);
  } catch {
    /* Pointer capture may already be released. */
  }
  const ctx = els.whiteboardCanvas.getContext("2d");
  ctx.globalCompositeOperation = "source-over";
  whiteboardDrawing = null;
}

function submitChoice(index) {
  if (!activeProblem?.choices) return;
  const choice = activeProblem.choices[index];
  if (!choice) return;
  submitAnswer(choiceValue(choice));
}

function choiceLabel(choice) {
  return typeof choice === "object" ? choice.label : choice;
}

function choiceValue(choice) {
  return typeof choice === "object" ? choice.value : choice;
}

function submitAnswer(raw) {
  if (!activeRound || !activeProblem) return;
  const value = String(raw ?? els.answerInput.value).trim();
  if (!value) return;

  const correct = isCorrect(value, activeProblem);
  if (correct) {
    activeRound.correct += 1;
    const earnedCoins = rewardCoins(activeRound.type === "boss" ? 4 : 3);
    state.glow += activeRound.type === "boss" ? 2 : 1;
    state.food = clamp(state.food - 1, 0, 100);
    state.energy = clamp(state.energy - 1, 0, 100);
    state.growth = clamp(state.growth + 3, 0, 100);
    els.questFeedback.textContent = `Correct. +${earnedCoins} coins, glow, and growth XP.`;
    els.questFeedback.className = "quest-feedback good";
    triggerPetAction("celebrate", 800);
  } else {
    state.food = clamp(state.food - 2, 0, 100);
    state.energy = clamp(state.energy - 5, 0, 100);
    els.questFeedback.textContent = `Not this time. Answer: ${activeProblem.displayAnswer}. It does not count toward passing.`;
    els.questFeedback.className = "quest-feedback bad";
  }

  activeRound.index += 1;
  saveState();
  renderHud();

  setTimeout(() => {
    if (!activeRound) return;
    if (activeRound.index >= activeRound.size) {
      finishRound();
    } else {
      nextProblem();
    }
  }, correct ? 620 : 1050);
}

function finishRound() {
  const passed = activeRound.correct >= activeRound.pass;
  const type = activeRound.type;
  const roundLocation = activeRound.location;
  const correct = activeRound.correct;
  const pass = activeRound.pass;
  activeRound = null;
  activeProblem = null;
  setOverlay(els.questOverlay, false);

  if (!passed) {
    showToast(`Retry needed: ${correct}/${pass} correct`);
    saveState();
    renderHud();
    return;
  }

  const passCoins = rewardCoins((type === "boss" ? 30 : 16) + correct * 4);
  const foundGems = discoverGems(type === "boss" || correct === currentQuestSize() ? 1 : 0);
  let message = `${QUEST_LABELS[type]} cleared: ${correct}/${pass}. +${passCoins} coins`;
  if (foundGems) message += ` and ${foundGems} gem discovered`;
  state.food = clamp(state.food - 3, 0, 100);
  state.energy = clamp(state.energy + 6, 0, 100);
  state.growth = clamp(state.growth + 14, 0, 100);
  state.glow += type === "boss" ? 20 : 8;

  if (roundLocation === "home" || roundLocation === "kitchen") {
    showToast(`${message}. ${unlockNextDecorReward(roundLocation)}`);
    saveState();
    renderHud();
    triggerPetAction("celebrate", 1300);
    return;
  }

  if (type === "number" && state.stage === "egg") {
    state.stage = "puppy";
    state.equipped.look = "none";
    message = `${state.petName} hatched into a ${currentPetVariantName()}. Click the cottage to enter the cozy home`;
  } else if (type === "fraction" && !state.waterfallUnlocked) {
    state.waterfallUnlocked = true;
    message += `. The bridge crossing to Waterfall Clearing opened`;
    const waterfallMessage = unlockNextDecorReward("waterfall");
    if (!waterfallMessage.includes("fully stocked")) message += `. ${waterfallMessage}`;
  } else if (type === "geometry") {
    if (unlock("sweater")) {
      const sweater = CLOSET.find((item) => item.id === "sweater");
      message += `. Peach sweater is now available in Closet for ${costText(sweater.cost)}`;
    }
  } else if (type === "boss") {
    const rewards = [];
    if (unlock("bow")) rewards.push("Berry bow");
    if (unlock("collar")) rewards.push("Bell collar");
    if (rewards.length) message += `. ${rewards.join(" and ")} available in Closet`;
    if (roundLocation === "waterfall" && !state.mountainUnlocked) {
      state.mountainUnlocked = true;
      message += `. The summit trail to Mountain Shelter opened`;
      const mountainMessage = unlockNextDecorReward("mountain");
      if (!mountainMessage.includes("fully stocked")) message += `. ${mountainMessage}`;
    }
    if (state.world < WORLDS.length - 1) {
      state.world += 1;
      state.questStep = 0;
      message += ` ${currentWorld().name} opened.`;
    } else {
      state.growth = 100;
      message = `${state.petName} mastered Aurora Academy.`;
    }
  }

  const rewardScene = roundLocation === "waterfall" || roundLocation === "mountain" || roundLocation === "underwater" ? roundLocation : "outdoor";
  const decorMessage = unlockNextDecorReward(rewardScene);
  if (!decorMessage.includes("fully stocked")) message += `. ${decorMessage}`;

  if (type !== "boss") {
    state.questStep = clamp(state.questStep + 1, 0, QUEST_FLOW.length - 1);
  }

  saveState();
  renderHud();
  showToast(message);
  triggerPetAction("celebrate", 1300);
}

function makeProblem(type, world) {
  const roundLocation = activeRound?.location || currentScene();
  const workbookFirst = roundLocation !== "kitchen" || Math.random() < KITCHEN_WORKBOOK_RATE;
  if (workbookFirst) {
    const workbookProblem = nextWorkbookProblem(type);
    if (workbookProblem) return workbookProblem;
  }
  const generatedProblem = nextGeneratedProblem(type, world, roundLocation);
  if (generatedProblem) return generatedProblem;
  const workbookProblem = nextWorkbookProblem(type);
  if (workbookProblem) return workbookProblem;
  return makeProblemCandidate(type, world);
}

function nextGeneratedProblem(type, world, roundLocation = currentScene()) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const item = makeProblemCandidateForScene(type, world, roundLocation);
    const key = problemKey("generated", type, item);
    if (!recentProblemKeys.includes(key) || attempt === 17) {
      rememberProblemKey(key);
      return item;
    }
  }
  return null;
}

function makeProblemCandidateForScene(type, world, scene) {
  if (scene === "kitchen") return makeKitchenProblemCandidate(type, world);
  return makeProblemCandidate(type, world);
}

function nextWorkbookProblem(type = "workbook") {
  const bank = Array.isArray(window.MATHGAME_WORKBOOK_QUESTIONS) ? window.MATHGAME_WORKBOOK_QUESTIONS : [];
  if (!bank.length) return null;
  if (workbookQuestionOrder.length !== bank.length) {
    workbookQuestionOrder = shuffledIndexes(bank.length);
    workbookQuestionCursor = workbookProblemIndex % Math.max(1, bank.length);
  }

  let fallback = null;
  for (let attempt = 0; attempt < bank.length; attempt += 1) {
    if (workbookQuestionCursor >= workbookQuestionOrder.length) {
      workbookQuestionOrder = shuffledIndexes(bank.length);
      workbookQuestionCursor = 0;
    }
    const raw = bank[workbookQuestionOrder[workbookQuestionCursor]];
    workbookQuestionCursor += 1;
    workbookProblemIndex += 1;
    const item = workbookProblemFromRaw(raw);
    const key = problemKey("workbook", type, item);
    fallback = fallback || { item, key };
    if (!recentProblemKeys.includes(key) || attempt === bank.length - 1) {
      rememberProblemKey(key);
      return item;
    }
  }

  if (fallback) {
    rememberProblemKey(fallback.key);
    return fallback.item;
  }
  return null;
}

function workbookProblemFromRaw(raw) {
  return {
    prompt: raw.prompt,
    answer: raw.answer,
    answerType: raw.answerType || "number",
    displayAnswer: raw.displayAnswer ?? String(raw.answer),
    lessonTitle: raw.lessonTitle || "Workbook question",
    steps: Array.isArray(raw.steps) ? [...raw.steps] : ["Use the worksheet strategy.", "Work carefully.", "Check your answer."],
    choices: Array.isArray(raw.choices) ? [...raw.choices] : null,
    placeholder: raw.placeholder || "Type answer",
  };
}

function shuffledIndexes(length) {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swap]] = [indexes[swap], indexes[index]];
  }
  return indexes;
}

function problemKey(source, type, item) {
  return `${source}:${type}:${normalize(item.prompt)}`;
}

function rememberProblemKey(key) {
  recentProblemKeys.push(key);
  recentProblemKeys = recentProblemKeys.slice(-RECENT_PROBLEM_LIMIT);
}

function makeProblemCandidate(type, world) {
  if (type === "number") return makeNumberProblem(world);
  if (type === "fraction") return makeBridgeProblem(world);
  if (type === "geometry") return makeGeometryProblem(world);
  const bossWorld = Math.min(world + 1, WORLDS.length - 1);
  const bossMakers = [makeNumberProblem, makeBridgeProblem, makeGeometryProblem];
  if (bossWorld >= 4) bossMakers.push(makeDecimalFluencyProblem);
  return choose(bossMakers)(bossWorld);
}

function makeKitchenProblemCandidate(type, world) {
  if (type === "number") return makeKitchenNumberProblem();
  if (type === "fraction") return makeKitchenFractionProblem();
  if (type === "geometry") return makeKitchenGeometryProblem();
  return choose([
    makeKitchenNumberProblem,
    makeKitchenFractionProblem,
    makeKitchenGeometryProblem,
    () => makeNumberProblem(Math.max(world, 3)),
    () => makeBridgeProblem(Math.max(world, 3)),
  ])();
}

function makeKitchenNumberProblem() {
  return choose([
    makeKitchenTrayMultiplicationProblem,
    makeKitchenSnackCartProblem,
    makeKitchenShelfCountingProblem,
    makeKitchenChangeProblem,
    makeKitchenScaleRecipeProblem,
    makeMultiplicationProblem,
    makeEquationProblem,
  ])();
}

function makeKitchenFractionProblem() {
  return choose([
    makeKitchenFractionOfNumberProblem,
    makeKitchenRecipeFractionProblem,
    makeKitchenRecipeEquationProblem,
    makeKitchenUnitFractionProblem,
    makeFractionEquationProblem,
    makeMixedFractionEquationProblem,
    makeDecimalFractionProblem,
  ])();
}

function makeKitchenGeometryProblem() {
  return choose([
    makeKitchenTileAreaProblem,
    makeKitchenTilePerimeterProblem,
    makeKitchenBacksplashAreaProblem,
    makeKitchenShelfPerimeterProblem,
    makeLShapeAreaProblem,
    makeRightTriangleAreaProblem,
    makeRectangleTriangleAreaProblem,
    makeCompositePerimeterProblem,
  ])();
}

function makeKitchenTrayMultiplicationProblem() {
  const trays = rand(3, 9);
  const treats = rand(8, 18);
  return problem(`Kitchen trays: each tray has ${treats} puppy treats. How many treats are on ${trays} trays?`, trays * treats, "Kitchen multiplication", [
    "Multiply treats per tray by the number of trays.",
    "Use partial products if the numbers feel large.",
    "Check that the answer is reasonable.",
  ], "number", null, null, "Type treats");
}

function makeKitchenSnackCartProblem() {
  const jars = rand(4, 9);
  const perJar = rand(6, 15);
  const served = rand(8, 28);
  return problem(`Snack cart: ${jars} jars each hold ${perJar} biscuits. After ${served} biscuits are served, how many are left?`, jars * perJar - served, "Multi-step kitchen problem", [
    "First find the total biscuits.",
    "Then subtract the biscuits served.",
    "Use the remaining amount as the answer.",
  ], "number", null, null, "Type remaining");
}

function makeKitchenShelfCountingProblem() {
  const shelves = rand(3, 7);
  const bowls = rand(4, 12);
  const extras = rand(5, 24);
  return problem(`Kitchen shelves: ${shelves} shelves hold ${bowls} bowls each, plus ${extras} bowls on the counter. How many bowls are there?`, shelves * bowls + extras, "Shelf counting", [
    "Multiply shelves by bowls per shelf.",
    "Add the bowls on the counter.",
    "This is a two-step total.",
  ], "number", null, null, "Type bowls");
}

function makeKitchenChangeProblem() {
  const price = choose([1.25, 1.5, 1.75, 2.25, 2.5, 3.25, 3.5]);
  const count = rand(2, 6);
  const paid = choose([10, 12, 15, 20]);
  const total = Math.round(price * count * 100) / 100;
  const answer = Math.round((paid - total) * 100) / 100;
  if (answer <= 0) return makeKitchenTrayMultiplicationProblem();
  return problem(`Kitchen shop: ${count} snacks cost $${formatDecimal(price)} each. If you pay $${paid}, how much change do you get?`, answer, "Decimal money problem", [
    "Multiply price by number of snacks.",
    "Subtract the cost from the money paid.",
    "Write dollars as a decimal.",
  ], "decimal", null, formatDecimal(answer), "Example: 2.50");
}

function makeKitchenScaleRecipeProblem() {
  const batches = rand(3, 8);
  const perBatch = rand(12, 35);
  return problem(`Recipe scale: one batch makes ${perBatch} cookies. How many cookies do ${batches} batches make?`, batches * perBatch, "Recipe scaling", [
    "Each batch is the same size.",
    "Multiply cookies per batch by batches.",
    "Use the total as the answer.",
  ], "number", null, null, "Type cookies");
}

function makeKitchenFractionOfNumberProblem() {
  const denominator = choose([3, 4, 5, 6, 8, 10, 12]);
  const numerator = rand(1, denominator - 1);
  const whole = denominator * rand(3, 14);
  return problem(`Kitchen prep: find ${numerator}/${denominator} of ${whole} treats.`, (whole / denominator) * numerator, "Fraction of a number", [
    "Divide the total by the denominator.",
    "Multiply by the numerator.",
    "This gives the fraction of the treats.",
  ], "number", null, null, "Type treats");
}

function makeKitchenRecipeFractionProblem() {
  const denominator = choose([2, 3, 4, 5, 6, 8]);
  const numerator = rand(1, denominator - 1);
  const batches = rand(2, 7);
  const answer = rational(numerator * batches, denominator);
  return rationalProblem(`Recipe water: one batch uses ${numerator}/${denominator} cup. How many cups for ${batches} batches?`, answer, "Recipe fractions", [
    "Multiply the fraction by the number of batches.",
    "Simplify the fraction if possible.",
    "Mixed numbers and improper fractions are accepted.",
  ], formatRationalValue(answer));
}

function makeKitchenRecipeEquationProblem() {
  const denominator = choose([4, 5, 6, 8, 10, 12]);
  const used = rand(1, denominator - 1);
  const left = rand(used + 1, denominator + used);
  const answer = rational(left - used, denominator);
  return rationalProblem(`Solve: x + ${used}/${denominator} cup = ${left}/${denominator} cup`, answer, "Recipe fraction equation", [
    "Subtract the used amount from both sides.",
    "Keep the common denominator.",
    "Write x as a fraction.",
  ], `x = ${formatRationalValue(answer)}`);
}

function makeKitchenUnitFractionProblem() {
  const denominator = choose([3, 4, 5, 6, 8, 10]);
  const scoops = rand(2, 9);
  const answer = rational(scoops, denominator);
  return rationalProblem(`Sink cups: ${scoops} scoops are each 1/${denominator} cup. How many cups is that?`, answer, "Unit fractions", [
    "Each scoop is one unit fraction.",
    "Add the unit fraction repeatedly.",
    "Simplify or write as a mixed number.",
  ], formatRationalValue(answer));
}

function makeKitchenTileAreaProblem() {
  const rows = rand(4, 12);
  const columns = rand(5, 14);
  return problem(`Kitchen floor tiles: ${rows} rows with ${columns} tiles in each row. How many tiles total?`, rows * columns, "Array area", [
    "Rows times columns gives the total.",
    "This is also the area in square tiles.",
    "Multiply carefully.",
  ], "number", null, null, "Type tiles");
}

function makeKitchenTilePerimeterProblem() {
  const length = rand(5, 16);
  const width = rand(3, 10);
  return problem(`Sink mat: a rectangular mat is ${length} by ${width}. What is its perimeter?`, 2 * (length + width), "Rectangle perimeter", [
    "Perimeter is the distance around.",
    "Add length and width, then double.",
    "Do not multiply for area.",
  ], "number", null, null, "Type perimeter");
}

function makeKitchenBacksplashAreaProblem() {
  const width = rand(4, 14);
  const height = rand(2, 8);
  return problem(`Kitchen backsplash: a rectangle is ${width} by ${height}. What is the area?`, width * height, "Rectangle area", [
    "Area is length times height.",
    "Use square units.",
    "Only multiply the two side lengths.",
  ], "number", null, null, "Type area");
}

function makeKitchenShelfPerimeterProblem() {
  const sideA = rand(5, 13);
  const sideB = rand(2, 8);
  return problem(`Wall shelf label: a rectangle is ${sideA} by ${sideB}. What is the perimeter of the label?`, 2 * (sideA + sideB), "Rectangle perimeter", [
    "A rectangle has two of each side length.",
    "Add all four sides.",
    "Perimeter is a length.",
  ], "number", null, null, "Type perimeter");
}

function makeNumberProblem(world) {
  if (world <= 1) return makeMultiplicationProblem();
  if (world <= 2) return choose([makeExpressionProblem, makeWordEquationProblem])();
  if (world <= 3) return makeEquationProblem();
  if (world <= 4) return choose([makeDecimalFluencyProblem, makeDecimalFractionProblem])();
  if (world <= 5) return choose([makeDecimalFluencyProblem, makeDecimalFractionProblem, makeExpressionProblem])();
  return choose([makeExpressionProblem, makeEquationProblem, makeWordEquationProblem, makeDecimalFractionProblem, makeDecimalFluencyProblem])();
}

function makeBridgeProblem(world) {
  if (world <= 1) return makeExpressionProblem();
  if (world <= 3) return choose([makeExpressionProblem, makeEquationProblem])();
  if (world <= 4) return choose([makeDecimalFluencyProblem, makeDecimalFractionProblem, makeEquationProblem])();
  return choose([makeExpressionProblem, makeEquationProblem, makeDecimalFractionProblem, makeDecimalFluencyProblem, makeWordEquationProblem])();
}

function makeGeometryProblem(world) {
  return choose([
    makeLShapeAreaProblem,
    makeLShapePerimeterProblem,
    makeRightTriangleAreaProblem,
    makeRightTrianglePerimeterProblem,
    makeRectangleTriangleAreaProblem,
    makeCompositePerimeterProblem,
  ])();
}

function makeLShapeAreaProblem() {
  const width = rand(6, 14);
  const height = rand(4, 9);
  const cutW = rand(1, Math.floor(width / 2));
  const cutH = rand(1, Math.floor(height / 2));
  return problem(`L-shape area: start with a ${width} by ${height} rectangle and cut out a ${cutW} by ${cutH} corner. What is the area?`, width * height - cutW * cutH, "Composite area", [
    "Find the big rectangle first.",
    "Subtract the missing corner.",
    "Use square units for area.",
  ], "number", null, null, "Type area");
}

function makeLShapePerimeterProblem() {
  const width = rand(7, 14);
  const height = rand(4, 9);
  const cutW = rand(1, Math.floor(width / 2));
  const cutH = rand(1, Math.floor(height / 2));
  const perimeter = 2 * (width + height);
  return problem(`L-shape perimeter: a ${width} by ${height} rectangle has a ${cutW} by ${cutH} corner cut out. What is the outside perimeter?`, perimeter, "Composite perimeter", [
    "Perimeter is the distance around the outside.",
    "A corner cut from a rectangle keeps the same total outside length.",
    "Add the equivalent outside lengths.",
  ], "number", null, null, "Type perimeter");
}

function makeRightTriangleAreaProblem() {
  const base = rand(4, 14);
  const height = rand(4, 12);
  return problem(`Right triangle area: legs are ${base} and ${height}. What is the area?`, (base * height) / 2, "Triangle area", [
    "Use the two perpendicular legs as base and height.",
    "Triangle area is base times height divided by 2.",
    "The slanted side is not needed for area.",
  ], "number", null, null, "Type area");
}

function makeRightTrianglePerimeterProblem() {
  const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15]];
  const [a, b, c] = choose(triples);
  return problem(`Right triangle perimeter: sides are ${a}, ${b}, and ${c}. What is the perimeter?`, a + b + c, "Triangle perimeter", [
    "Perimeter is the sum of all side lengths.",
    "Add the two legs and the slanted side.",
    "No area formula is needed.",
  ], "number", null, null, "Type perimeter");
}

function makeRectangleTriangleAreaProblem() {
  const rectW = rand(4, 10);
  const rectH = rand(3, 8);
  const triB = rand(3, 9);
  const triH = rand(2, 8);
  return problem(`Composite area: a ${rectW} by ${rectH} rectangle has a right triangle attached. The triangle has base ${triB} and height ${triH}. What is the total area?`, rectW * rectH + (triB * triH) / 2, "Rectangle plus triangle", [
    "Find the rectangle area.",
    "Find the triangle area using base times height divided by 2.",
    "Add both areas.",
  ], "number", null, null, "Type area");
}

function makeCompositePerimeterProblem() {
  const sides = [rand(4, 11), rand(3, 9), rand(4, 11), rand(3, 9), rand(2, 8)];
  return problem(`Composite perimeter: outside sides are ${sides.slice(0, -1).join(", ")}, and ${sides[sides.length - 1]}. What is the perimeter?`, sides.reduce((sum, side) => sum + side, 0), "Composite perimeter", [
    "Only add the outside boundary.",
    "Do not add dashed or inside helper lines.",
    "Perimeter is a length, not square units.",
  ], "number", null, null, "Type perimeter");
}

function makeMultiplicationProblem() {
  const a = rand(12, 48);
  const b = rand(12, 24);
  const tens = Math.floor(b / 10) * 10;
  const ones = b - tens;
  return problem(`${a} x ${b} = ?`, a * b, "Partial products", [
    `Split ${b} into ${tens || 0} + ${ones}.`,
    `Multiply ${a} by each part.`,
    "Add the partial products.",
  ], "number", null, null, "Type product");
}

function makeExpressionProblem() {
  return choose([
    makeDistributedExpressionProblem,
    makeSubtractExpressionProblem,
    makeCombineExpressionProblem,
  ])();
}

function makeDistributedExpressionProblem() {
  const m = rand(2, 9);
  const n = rand(2, 7);
  const a1 = rand(1, 8);
  const b1 = rand(0, 6);
  const c1 = rand(1, 12);
  const a2 = rand(1, 6);
  const b2 = rand(0, 5);
  const c2 = rand(0, 10);
  const op = choose(["+", "-"]);
  const answer = op === "+"
    ? { a: m * a1 + n * a2, b: m * b1 + n * b2, c: m * c1 + n * c2 }
    : { a: m * a1 - n * a2, b: m * b1 - n * b2, c: m * c1 - n * c2 };
  return linearProblem(`${m}(${linearParts(a1, b1, c1)}) ${op} ${n}(${linearParts(a2, b2, c2)}) = ?`, answer);
}

function makeSubtractExpressionProblem() {
  const a1 = rand(3, 14);
  const b1 = rand(1, 9);
  const c1 = rand(6, 30);
  const a2 = rand(1, 8);
  const b2 = rand(0, 7);
  const c2 = rand(-12, 18);
  return linearProblem(`(${linearParts(a1, b1, c1)}) - (${linearParts(a2, b2, c2)}) = ?`, {
    a: a1 - a2,
    b: b1 - b2,
    c: c1 - c2,
  });
}

function makeCombineExpressionProblem() {
  const a1 = rand(1, 18);
  const a2 = rand(1, 24);
  const b1 = rand(0, 12);
  const b2 = rand(0, 12);
  const c1 = rand(-18, 28);
  const c2 = rand(-18, 28);
  return linearProblem(`${linearParts(a1, b1, c1)} + ${linearParts(a2, b2, c2)} = ?`, {
    a: a1 + a2,
    b: b1 + b2,
    c: c1 + c2,
  });
}

function linearParts(a, b, c) {
  const parts = [];
  if (a) parts.push(`${a === 1 ? "" : a}a`);
  if (b) parts.push(`${b === 1 ? "" : b}b`);
  if (c) parts.push(String(c));
  return parts.join(" + ").replace(/\+ -/g, "- ") || "0";
}

function linearProblem(promptText, answer) {
  return problem(promptText, answer, "Simplify expressions", [
    "Distribute across parentheses first.",
    "Combine like terms: a terms with a terms, b terms with b terms, numbers with numbers.",
    "Write the simplified expression.",
  ], "linear", null, formatLinear(answer), "Example: 10a + 2b");
}

function makeEquationProblem() {
  return choose([
    makeLinearEquationProblem,
    makeDistributedEquationProblem,
    makeFractionEquationProblem,
    makeMixedFractionEquationProblem,
  ])();
}

function makeLinearEquationProblem() {
  const solution = rand(-8, 42);
  let leftX = rand(2, 9);
  let rightX = rand(1, 8);
  if (leftX === rightX) rightX += 1;
  const leftC = rand(-20, 32);
  const rightC = leftX * solution + leftC - rightX * solution;
  return rationalProblem(`Solve: ${formatEquationSide(leftX, leftC)} = ${formatEquationSide(rightX, rightC)}`, rational(solution), "Solve equations", [
    "Move x terms to one side.",
    "Move number terms to the other side.",
    "Divide to find x.",
  ], `x = ${solution}`);
}

function makeDistributedEquationProblem() {
  const solution = rand(-6, 24);
  const m = rand(2, 8);
  const n = rand(2, 8);
  const p = rand(-5, 9);
  const q = m * (solution + p) - n * solution;
  return rationalProblem(`Solve: ${m}(x ${signedText(p)}) = ${n}x ${signedText(q)}`, rational(solution), "Distribute then solve", [
    "Distribute across parentheses.",
    "Move x terms to one side.",
    "Move numbers to the other side.",
  ], `x = ${solution}`);
}

function makeFractionEquationProblem() {
  const denominator = choose([4, 5, 6, 8, 10, 12]);
  const add = rand(1, denominator - 1);
  const answer = rational(rand(1, denominator - 1), denominator);
  const total = rational(answer.n + add, denominator);
  return rationalProblem(`Solve: x + ${add}/${denominator} = ${total.n}/${total.d}`, answer, "Fraction equation", [
    "Subtract the fraction from both sides.",
    "Use common denominators.",
    "Write x as a fraction.",
  ], `x = ${formatRationalValue(answer)}`);
}

function makeMixedFractionEquationProblem() {
  const denominator = choose([5, 10, 20]);
  const whole = rand(1, 3);
  const part = rand(1, denominator - 1);
  const right = rational(rand(1, denominator - 1), denominator);
  const answer = rational(whole * denominator + part + right.n, denominator);
  return rationalProblem(`Solve: x - ${formatMixedNumberText(whole, part, denominator)} = ${right.n}/${right.d}`, answer, "Mixed-number equation", [
    "Add the mixed number to both sides.",
    "Rename fractions with a common denominator.",
    "Mixed-number answers are accepted.",
  ], `x = ${formatRationalValue(answer)}`);
}

function rationalProblem(promptText, answer, lessonTitle, steps, displayAnswer) {
  return problem(promptText, answer, lessonTitle, steps, "rational", null, displayAnswer, "Example: x = 1/10");
}

function formatEquationSide(coefficient, constant) {
  return `${coefficient === 1 ? "" : coefficient}x${constant ? ` ${signedText(constant)}` : ""}`;
}

function signedText(value) {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

function formatRationalValue(value) {
  if (value.d === 1) return String(value.n);
  const whole = Math.trunc(value.n / value.d);
  const remainder = Math.abs(value.n % value.d);
  if (whole && remainder) return formatMixedNumberText(whole, remainder, value.d);
  return `${value.n}/${value.d}`;
}

function formatMixedNumberText(whole, numerator, denominator) {
  return `${whole} and ${numerator}/${denominator}`;
}

function makeWordEquationProblem() {
  const start = rand(18, 42);
  const gaveAway = rand(6, 14);
  const total = start - gaveAway + 2 * start;
  return problem(`Jane had some stamps. She gave away ${gaveAway}. Then her mom bought her twice as many as she had at the beginning. Now Jane has ${total}. How many did she have at the beginning?`, start, "Write an equation", [
    "Let x be the starting number.",
    `After giving away stamps, she has x - ${gaveAway}.`,
    "Her mom adds 2x more, so combine the parts and solve.",
  ], "number", null, null, "Type starting number");
}

function makeDecimalFractionProblem() {
  const places = choose([10, 100, 1000]);
  const whole = choose([0, 0, 1, 2, 3]);
  const part = rand(1, places - 1);
  const digits = String(part).padStart(String(places).length - 1, "0");
  const decimal = `${whole}.${digits}`;
  const answer = rational(whole * places + part, places);
  return problem(`Write ${decimal} as a fraction.`, answer, "Decimals as fractions", [
    "Use place value: tenths, hundredths, or thousandths.",
    "The digits after the decimal become the numerator.",
    "Equivalent simplified fractions are accepted.",
  ], "rational", null, formatRationalValue(answer), "Example: 7/10");
}

function makeDecimalFluencyProblem() {
  return choose([
    makeDecimalOfWholeProblem,
    makeDecimalDivisionProblem,
    makeDecimalAsPercentProblem,
    makeFractionAsPercentProblem,
    makeFractionAsDecimalProblem,
    makePowerOfTenDecimalProblem,
  ])();
}

function makeDecimalOfWholeProblem() {
  const rate = choose([
    { decimal: 0.5, text: "0.5" },
    { decimal: 0.25, text: "0.25" },
    { decimal: 0.75, text: "0.75" },
    { decimal: 0.1, text: "0.1" },
    { decimal: 0.2, text: "0.2" },
  ]);
  const whole = choose([10, 20, 40, 50, 80, 100, 120, 200]);
  const answer = rate.decimal * whole;
  return problem(`${rate.text} of ${whole} = ?`, answer, "Decimals as multiplication", [
    `"Of" means multiply.`,
    `Think of ${rate.text} as part of one whole.`,
    "Multiply the decimal by the number.",
  ], "number", null, formatDecimal(answer), "Type the value");
}

function makeDecimalDivisionProblem() {
  const item = choose([
    { prompt: "15 / 1.5", answer: 10 },
    { prompt: "12 / 0.6", answer: 20 },
    { prompt: "4.5 / 0.5", answer: 9 },
    { prompt: "2.4 / 0.3", answer: 8 },
    { prompt: "7.5 / 2.5", answer: 3 },
    { prompt: "18 / 0.9", answer: 20 },
    { prompt: "6.4 / 0.8", answer: 8 },
  ]);
  return problem(`${item.prompt} = ?`, item.answer, "Decimal division", [
    "Move both decimals the same number of places to make the divisor a whole number.",
    "The quotient stays the same.",
    "Then divide.",
  ], "number", null, formatDecimal(item.answer), "Type quotient");
}

function makeDecimalAsPercentProblem() {
  const item = choose([
    { decimal: "0.05", percent: 5 },
    { decimal: "0.1", percent: 10 },
    { decimal: "0.2", percent: 20 },
    { decimal: "0.25", percent: 25 },
    { decimal: "0.5", percent: 50 },
    { decimal: "0.75", percent: 75 },
    { decimal: "1.25", percent: 125 },
  ]);
  return percentProblem(`What is ${item.decimal} as a percent?`, item.percent, "Decimals as percents", [
    "Percent means out of 100.",
    "Multiply the decimal by 100.",
    "Write the answer with a percent sign.",
  ]);
}

function makeFractionAsPercentProblem() {
  const item = choose([
    { fraction: "1/10", percent: 10 },
    { fraction: "1/5", percent: 20 },
    { fraction: "2/5", percent: 40 },
    { fraction: "3/5", percent: 60 },
    { fraction: "1/4", percent: 25 },
    { fraction: "1/2", percent: 50 },
    { fraction: "3/4", percent: 75 },
    { fraction: "1/8", percent: 12.5 },
  ]);
  return percentProblem(`${item.fraction} is what percent?`, item.percent, "Fractions as percents", [
    "Turn the fraction into a decimal.",
    "Multiply by 100 to convert to percent.",
    "A percent answer like 25% or 25 is accepted.",
  ]);
}

function makeFractionAsDecimalProblem() {
  const item = choose([
    { fraction: "1/10", decimal: 0.1 },
    { fraction: "1/5", decimal: 0.2 },
    { fraction: "2/5", decimal: 0.4 },
    { fraction: "1/4", decimal: 0.25 },
    { fraction: "1/2", decimal: 0.5 },
    { fraction: "3/4", decimal: 0.75 },
    { fraction: "1/8", decimal: 0.125 },
    { fraction: "3/8", decimal: 0.375 },
  ]);
  return problem(`${item.fraction} = what decimal?`, item.decimal, "Fractions as decimals", [
    "Divide the numerator by the denominator.",
    "Use familiar benchmark fractions when possible.",
    "Write the answer as a decimal.",
  ], "decimal", null, formatDecimal(item.decimal), "Example: 0.25");
}

function makePowerOfTenDecimalProblem() {
  const item = choose([
    { prompt: "0.5 x 10", answer: 5 },
    { prompt: "0.25 x 100", answer: 25 },
    { prompt: "1.5 x 10", answer: 15 },
    { prompt: "0.03 x 100", answer: 3 },
    { prompt: "2.5 x 100", answer: 250 },
    { prompt: "0.25 x 1000", answer: 250 },
    { prompt: "15 / 10", answer: 1.5 },
    { prompt: "15 / 100", answer: 0.15 },
    { prompt: "3.6 / 10", answer: 0.36 },
  ]);
  return problem(`${item.prompt} = ?`, item.answer, "Powers of 10", [
    "Multiplying by 10, 100, or 1000 moves digits left into larger place values.",
    "Dividing by 10 or 100 moves digits right into smaller place values.",
    "Check that the decimal point moved the right number of places.",
  ], "number", null, formatDecimal(item.answer), "Type value");
}

function percentProblem(promptText, answer, lessonTitle, steps) {
  return problem(promptText, answer, lessonTitle, steps, "percent", null, `${formatDecimal(answer)}%`, "Example: 25%");
}

function formatDecimal(value) {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
  const text = String(rounded);
  if (!text.includes(".")) return text;
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function problem(prompt, answer, lessonTitle, steps, answerType = "number", choices = null, displayAnswer = null, placeholder = "Type answer") {
  return {
    prompt,
    answer,
    answerType,
    displayAnswer: displayAnswer ?? String(answer).replace("R", " R "),
    lessonTitle,
    steps,
    choices,
    placeholder,
  };
}

function isCorrect(value, item) {
  if (item.answerType === "number") return sameNumberAnswer(value, item.answer);
  if (item.answerType === "decimal") return sameNumberAnswer(value, item.answer);
  if (item.answerType === "percent") return samePercent(value, item.answer);
  if (item.answerType === "remainder") return normalize(value) === normalize(item.answer).replace("remainder", "r");
  if (item.answerType === "choice") return normalizeChoice(value) === normalizeChoice(item.answer);
  if (item.answerType === "linear") return sameLinearExpression(value, item.answer);
  if (item.answerType === "numberList") return sameNumberList(value, item.answer);
  if (item.answerType === "text") return sameTextAnswer(value, item.answer);
  if (item.answerType === "rational") return sameRational(value, item.answer);
  return normalize(value) === normalize(item.answer);
}

function sameNumberAnswer(value, expected) {
  const actual = parseNumberAnswer(value);
  const target = Number(expected);
  return actual !== null && Number.isFinite(target) && Math.abs(actual - target) < 0.001;
}

function parseNumberAnswer(value) {
  const rationalValue = parseRational(String(value).replace(/,/g, ""));
  if (rationalValue && rationalValue.d) return rationalValue.n / rationalValue.d;

  let text = String(value).toLowerCase().replace(/[−–—]/g, "-").trim();
  if (!text) return null;
  if (text.includes("=")) text = text.split("=").pop().trim();
  text = text
    .replace(/^(x|y|n)\s+(is|equals?)\s+/i, "")
    .replace(/^(x|y|n)\s+/i, "")
    .replace(/\s+/g, "");
  const match = text.match(/^-?\d+(\.\d+)?$/);
  return match ? Number(match[0]) : null;
}

function sameNumberList(value, expected) {
  const actual = String(value).match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  return Array.isArray(expected)
    && actual.length >= expected.length
    && expected.every((number, index) => Math.abs(actual[index] - Number(number)) < 0.001);
}

function sameTextAnswer(value, expected) {
  const actual = normalize(value);
  const target = normalize(expected);
  if (actual === target) return true;
  if (target === "3halvesand2thirds") {
    return actual.includes("3") && actual.includes("half") && actual.includes("2") && actual.includes("third");
  }
  return false;
}

function samePercent(value, expected) {
  const actual = parsePercent(value);
  return actual !== null && Math.abs(actual - Number(expected)) < 0.001;
}

function parsePercent(value) {
  let text = String(value).toLowerCase().replace(/[−–—]/g, "-").trim();
  if (!text) return null;
  if (text.includes("=")) text = text.split("=").pop().trim();
  text = text.replace(/percent/g, "%").replace(/\s+/g, "");
  const match = text.match(/^(-?\d+(\.\d+)?)%?$/);
  return match ? Number(match[1]) : null;
}

function rational(numerator, denominator = 1) {
  if (denominator === 0) return { n: NaN, d: NaN };
  const sign = denominator < 0 ? -1 : 1;
  const n = Number(numerator) * sign;
  const d = Math.abs(Number(denominator));
  const factor = gcd(Math.abs(n), d);
  return { n: n / factor, d: d / factor };
}

function gcd(a, b) {
  let x = Math.round(Math.abs(a));
  let y = Math.round(Math.abs(b));
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function sameRational(value, expected) {
  const actual = parseRational(value);
  if (!actual) return false;
  return actual.n === expected.n && actual.d === expected.d;
}

function parseRational(value) {
  let text = String(value).toLowerCase().replace(/[−–—]/g, "-").trim();
  if (!text) return null;
  if (text.includes("=")) text = text.split("=").pop().trim();
  text = text
    .replace(/^(x|y|n)\s+(is|equals?)\s+/i, "")
    .replace(/^(x|y|n)\s*/i, "")
    .replace(/(-?\d+)\s*and\s*(\d+\/\d+)/i, "$1 $2")
    .trim();
  text = text.replace(/\s+/g, " ");

  const mixed = text.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    const sign = whole < 0 ? -1 : 1;
    return rational(whole * denominator + sign * numerator, denominator);
  }

  const fraction = text.replace(/\s/g, "").match(/^(-?\d+)\/(\d+)$/);
  if (fraction) return rational(Number(fraction[1]), Number(fraction[2]));

  const decimal = text.replace(/\s/g, "").match(/^-?\d+(\.\d+)?$/);
  if (decimal) {
    const compact = text.replace(/\s/g, "");
    if (!compact.includes(".")) return rational(Number(compact));
    const sign = compact.startsWith("-") ? -1 : 1;
    const unsigned = compact.replace("-", "");
    const [whole, part] = unsigned.split(".");
    const denominator = 10 ** part.length;
    return rational(sign * (Number(whole) * denominator + Number(part)), denominator);
  }

  return null;
}

function sameLinearExpression(value, expected) {
  const actual = parseLinearExpression(value);
  return Boolean(actual)
    && actual.a === (expected.a || 0)
    && actual.b === (expected.b || 0)
    && actual.x === (expected.x || 0)
    && actual.y === (expected.y || 0)
    && actual.c === (expected.c || 0);
}

function parseLinearExpression(value) {
  let text = String(value).toLowerCase().replace(/[−–—]/g, "-").trim();
  if (!text) return null;
  if (text.includes("=")) text = text.split("=").pop().trim();
  text = text.replace(/\s+/g, "").replace(/\*/g, "");
  if (!text) return null;
  if (!/^[+-]/.test(text)) text = `+${text}`;
  const parts = text.match(/[+-][^+-]+/g);
  if (!parts) return null;
  const result = { a: 0, b: 0, x: 0, y: 0, c: 0 };

  for (const part of parts) {
    const sign = part[0] === "-" ? -1 : 1;
    const body = part.slice(1);
    if (!body) return null;
    if (body.includes("a")) {
      const coefficient = body.replace("a", "");
      result.a += sign * parseCoefficient(coefficient);
    } else if (body.includes("b")) {
      const coefficient = body.replace("b", "");
      result.b += sign * parseCoefficient(coefficient);
    } else if (body.includes("x")) {
      const coefficient = body.replace("x", "");
      result.x += sign * parseCoefficient(coefficient);
    } else if (body.includes("y")) {
      const coefficient = body.replace("y", "");
      result.y += sign * parseCoefficient(coefficient);
    } else if (/^\d+$/.test(body)) {
      result.c += sign * Number(body);
    } else {
      return null;
    }
  }

  return result;
}

function parseCoefficient(value) {
  if (value === "") return 1;
  if (/^\d+$/.test(value)) return Number(value);
  return NaN;
}

function formatLinear(expression) {
  const terms = [];
  addLinearTerm(terms, expression.a || 0, "a");
  addLinearTerm(terms, expression.b || 0, "b");
  addLinearTerm(terms, expression.x || 0, "x");
  addLinearTerm(terms, expression.y || 0, "y");
  addConstantTerm(terms, expression.c || 0);
  return terms.length ? terms.join(" ") : "0";
}

function addLinearTerm(terms, coefficient, variable) {
  if (!coefficient) return;
  const magnitude = Math.abs(coefficient);
  const body = `${magnitude === 1 ? "" : magnitude}${variable}`;
  addFormattedTerm(terms, coefficient, body);
}

function addConstantTerm(terms, value) {
  if (!value) return;
  addFormattedTerm(terms, value, String(Math.abs(value)));
}

function addFormattedTerm(terms, signedValue, body) {
  if (!terms.length) {
    terms.push(signedValue < 0 ? `-${body}` : body);
  } else {
    terms.push(`${signedValue < 0 ? "-" : "+"} ${body}`);
  }
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "").replace(/remainder/g, "r").replace(/rem/g, "r");
}

function normalizeChoice(value) {
  const normalized = normalize(value).replace(/&lt;|‹|less-than|lessthan|less/g, "<")
    .replace(/&gt;|›|greater-than|greaterthan|morethan|greater|more/g, ">")
    .replace(/equalto|equals|same/g, "=");
  if (normalized === "<") return "less-than";
  if (normalized === ">") return "greater-than";
  if (normalized === "=") return "equal";
  return normalized;
}

els.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const canChooseEgg = !state.setup || state.stage === "egg";
  state.setup = true;
  state.playerName = els.playerInput.value.trim().slice(0, 18) || "Explorer";
  state.petName = els.petInput.value.trim().slice(0, 18) || "Mochi";
  if (canChooseEgg) {
    state.egg = selectedEgg;
    state.petVariant = variantForEgg(selectedEgg);
  }
  saveState();
  renderHud();
  showToast(`Welcome to Sky Meadow, ${state.playerName}.`);
});

els.eggRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-egg]");
  if (!button || button.disabled) return;
  selectedEgg = button.dataset.egg;
  renderEggChoices();
});

els.profileButton.addEventListener("click", () => {
  selectedEgg = state.egg || selectedEgg;
  renderEggChoices();
  els.playerInput.value = state.playerName;
  els.petInput.value = state.petName;
  setOverlay(els.setupOverlay, true);
});
els.resetButton.addEventListener("click", () => {
  if (!window.confirm("Restart from a new egg and clear this device's progress?")) return;
  restartGame();
});
els.homeHotspot.addEventListener("click", () => {
  if (state.stage === "egg") {
    showToast("Hatch the puppy first, then you can visit home.");
    return;
  }
  state.location = "home";
  activeDecorScene = "home";
  selectedMoveTarget = { type: "pet", scene: "home" };
  saveState();
  renderHud();
  triggerPetAction("wag", 1200);
  showToast(`${state.petName} trotted into the cozy home.`);
});
els.exitHomeButton.addEventListener("click", () => {
  state.location = "outdoor";
  activeDecorScene = "outdoor";
  selectedMoveTarget = { type: "pet", scene: "outdoor" };
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
  showToast(`${state.petName} went back outside.`);
});
els.kitchenHotspot.addEventListener("click", () => {
  if (!state.kitchenUnlocked) {
    showToast("Open every living room decor option to unlock the kitchen.");
    return;
  }
  state.location = "kitchen";
  activeDecorScene = "kitchen";
  selectedMoveTarget = { type: "pet", scene: "kitchen" };
  saveState();
  renderHud();
  triggerPetAction("wag", 1000);
  showToast(`${state.petName} padded into the kitchen.`);
});
els.livingRoomHotspot.addEventListener("click", () => {
  state.location = "home";
  activeDecorScene = "home";
  selectedMoveTarget = { type: "pet", scene: "home" };
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
  showToast(`${state.petName} returned to the living room.`);
});
els.bridgeHotspot.addEventListener("click", () => {
  if (!state.waterfallUnlocked) {
    showToast("Pass Bridge Algebra to open the crossing.");
    return;
  }
  state.location = "waterfall";
  activeDecorScene = "waterfall";
  selectedMoveTarget = { type: "pet", scene: "waterfall" };
  saveState();
  renderHud();
  triggerPetAction("wag", 1000);
  showToast(`${state.petName} crossed into Waterfall Clearing.`);
  checkSecretAwards("enter-waterfall");
});
els.meadowHotspot.addEventListener("click", () => {
  state.location = "outdoor";
  activeDecorScene = "outdoor";
  selectedMoveTarget = { type: "pet", scene: "outdoor" };
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
  showToast(`${state.petName} crossed back to the meadow.`);
});
els.mountainHotspot.addEventListener("click", () => {
  if (!state.mountainUnlocked) {
    showToast("Clear the Waterfall boss quest to open the summit trail.");
    return;
  }
  state.location = "mountain";
  activeDecorScene = "mountain";
  selectedMoveTarget = { type: "pet", scene: "mountain" };
  saveState();
  renderHud();
  triggerPetAction("wag", 1000);
  showToast(`${state.petName} climbed to Mountain Shelter.`);
  checkSecretAwards("enter-mountain");
});
els.waterfallHotspot.addEventListener("click", () => {
  state.location = "waterfall";
  activeDecorScene = "waterfall";
  selectedMoveTarget = { type: "pet", scene: "waterfall" };
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
  showToast(`${state.petName} padded back to Waterfall Clearing.`);
});
els.underwaterHotspot.addEventListener("click", () => {
  if (!state.underwaterUnlocked) {
    showToast("Find the Diving Gear secret at Waterfall Clearing.");
    return;
  }
  state.location = "underwater";
  activeDecorScene = "underwater";
  selectedMoveTarget = { type: "pet", scene: "underwater" };
  saveState();
  renderHud();
  triggerPetAction("wag", 1100);
  showToast(`${state.petName} put on scuba gear and dove below the waterfall.`);
});
els.surfaceHotspot.addEventListener("click", () => {
  state.location = "waterfall";
  activeDecorScene = "waterfall";
  selectedMoveTarget = { type: "pet", scene: "waterfall" };
  saveState();
  renderHud();
  triggerPetAction("wag", 900);
  showToast(`${state.petName} surfaced at Waterfall Clearing.`);
});

els.questButton.addEventListener("click", startQuest);
els.callPetButton.addEventListener("click", () => {
  petHiddenUntil = 0;
  setPetPosition(currentScene(), visibleDefaultPetPosition(currentScene()));
  saveState();
  renderHud();
  triggerPetAction("wag", 1200);
  showToast(state.stage === "egg" ? "The egg wiggles." : `${state.petName} trots closer.`);
});
els.feedButton.addEventListener("click", feedPet);
els.rubButton.addEventListener("click", rubPet);
els.fetchButton.addEventListener("click", playFetch);

els.closeQuestButton.addEventListener("click", () => setOverlay(els.questOverlay, false));
els.questForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});
els.choiceRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice-index]");
  if (!button) return;
  submitChoice(Number(button.dataset.choiceIndex));
});
els.whiteboardToggle.addEventListener("click", toggleWhiteboard);
els.whiteboardPenButton.addEventListener("click", () => setWhiteboardTool("pen"));
els.whiteboardEraserButton.addEventListener("click", () => setWhiteboardTool("eraser"));
els.clearWhiteboardButton.addEventListener("click", clearWhiteboard);
els.whiteboardCanvas.addEventListener("pointerdown", startWhiteboardStroke);
els.whiteboardCanvas.addEventListener("pointermove", moveWhiteboardStroke);
els.whiteboardCanvas.addEventListener("pointerup", finishWhiteboardStroke);
els.whiteboardCanvas.addEventListener("pointercancel", finishWhiteboardStroke);
els.closetButton.addEventListener("click", () => {
  renderCloset();
  setOverlay(els.closetOverlay, true);
});
els.closeClosetButton.addEventListener("click", () => setOverlay(els.closetOverlay, false));
els.closetGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-closet]");
  if (!button || button.disabled) return;
  equip(button.dataset.closet);
});
els.decorButton.addEventListener("click", () => {
  activeDecorScene = currentScene();
  selectedMoveTarget = { type: "pet", scene: activeDecorScene };
  renderDecor();
  setOverlay(els.decorOverlay, true);
});
els.closeDecorButton.addEventListener("click", () => setOverlay(els.decorOverlay, false));
[els.decorHomeTab, els.decorKitchenTab, els.decorOutdoorTab, els.decorWaterfallTab, els.decorMountainTab, els.decorUnderwaterTab].forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDecorScene = tab.dataset.decorScene;
    selectedMoveTarget = { type: "pet", scene: activeDecorScene };
    renderDecor();
  });
});
els.decorGrid.addEventListener("click", (event) => {
  const petButton = event.target.closest("[data-decor-pet]");
  if (petButton) {
    activeDecorScene = petButton.dataset.decorPet;
    selectedMoveTarget = { type: "pet", scene: activeDecorScene };
    renderDecor();
    return;
  }
  const decorButton = event.target.closest("[data-decor-id]");
  if (!decorButton) return;
  toggleDecorItem(decorButton.dataset.decorId);
});
els.canvas.addEventListener("pointerdown", (event) => {
  const picked = pickInteractiveObject(event.clientX, event.clientY);
  if (!picked) {
    const scene = currentScene();
    if (!isPanoramaScene(scene) && !canViewPan(scene)) return;
    event.preventDefault();
    dragState = {
      type: "pan",
      mode: isPanoramaScene(scene) ? "panorama" : "view",
      pointerId: event.pointerId,
      scene,
      startX: event.clientX,
      startPan: isPanoramaScene(scene) ? getScenePan(scene) : getViewPan(scene),
    };
    setDecorRemoveTargetState(false);
    els.canvas.setPointerCapture(event.pointerId);
    return;
  }
  event.preventDefault();
  activeDecorScene = currentScene();
  selectedMoveTarget = picked.type === "pet"
    ? { type: "pet", scene: currentScene() }
    : { type: "decor", id: picked.id };
  const moveBounds = pointerBoundsForTarget(selectedMoveTarget, currentScene());
  dragState = {
    type: "move",
    pointerId: event.pointerId,
    target: { ...selectedMoveTarget },
    startX: event.clientX,
    startY: event.clientY,
    startPosition: getTargetPosition(selectedMoveTarget),
    startPointerPosition: pointerToScenePosition(currentScene(), event.clientX, event.clientY, moveBounds),
    pointerBounds: moveBounds,
    scene: currentScene(),
  };
  setDecorRemoveTargetState(picked.type === "decor", false);
  els.canvas.setPointerCapture(event.pointerId);
  renderHud();
});
els.canvas.addEventListener("pointermove", (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  if (dragState.type === "pan") {
    const rect = els.canvas.getBoundingClientRect();
    const dx = (event.clientX - dragState.startX) / Math.max(1, rect.width);
    if (dragState.mode === "panorama") {
      setScenePan(dragState.scene, dragState.startPan - dx);
    } else {
      setViewPan(dragState.scene, dragState.startPan - dx * maxViewPan(dragState.scene) * 2.2);
    }
    return;
  }
  const pointerPosition = pointerToScenePosition(dragState.scene, event.clientX, event.clientY, dragState.pointerBounds);
  const backdropLockedDrag = dragState.target.type === "decor" && isBackdropLockedScene(dragState.scene);
  const dx = (pointerPosition.x - dragState.startPointerPosition.x) / (backdropLockedDrag ? OUTDOOR_BACKDROP_DECOR_X_SCALE : 1);
  const dy = (pointerPosition.y - dragState.startPointerPosition.y) * (backdropLockedDrag ? OUTDOOR_BACKDROP_DECOR_Y_DRAG_SCALE : 1);
  setTargetPosition(dragState.target, {
    x: dragState.startPosition.x + dx,
    y: dragState.startPosition.y + dy,
  });
  if (dragState.target.type === "decor") {
    setDecorRemoveTargetState(true, pointerOverDecorRemoveTarget(event.clientX, event.clientY));
  }
});
els.canvas.addEventListener("pointerup", finishDrag);
els.canvas.addEventListener("pointercancel", finishDrag);

function createRenderer() {
  const gl = els.canvas.getContext("webgl", { alpha: false, antialias: true });
  if (!gl) {
    showToast("WebGL is not available in this browser.");
    return null;
  }

  const vertex = `
    attribute vec3 a_position;
    attribute vec2 a_uv;
    uniform mat4 u_matrix;
    varying vec2 v_uv;
    void main() {
      gl_Position = u_matrix * vec4(a_position, 1.0);
      v_uv = a_uv;
    }
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_alpha;
    varying vec2 v_uv;
    void main() {
      vec4 color = texture2D(u_texture, v_uv);
      if (color.a < 0.02) discard;
      gl_FragColor = vec4(color.rgb * u_alpha, color.a * u_alpha);
    }
  `;

  const program = makeProgram(gl, vertex, fragment);
  const position = gl.getAttribLocation(program, "a_position");
  const uv = gl.getAttribLocation(program, "a_uv");
  const matrix = gl.getUniformLocation(program, "u_matrix");
  const alpha = gl.getUniformLocation(program, "u_alpha");
  const textureUniform = gl.getUniformLocation(program, "u_texture");
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -0.5, -0.5, 0, 0, 1,
     0.5, -0.5, 0, 1, 1,
    -0.5,  0.5, 0, 0, 0,
    -0.5,  0.5, 0, 0, 0,
     0.5, -0.5, 0, 1, 1,
     0.5,  0.5, 0, 1, 0,
  ]), gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
  gl.uniform1i(textureUniform, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);

  const textures = {};
  Object.entries(ASSETS).forEach(([key, url]) => {
    textures[key] = loadTexture(gl, url);
  });

  return { gl, program, matrix, alpha, textures };
}

function makeShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function makeProgram(gl, vertex, fragment) {
  const program = gl.createProgram();
  gl.attachShader(program, makeShader(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, makeShader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const img = new Image();
  img.addEventListener("load", () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  });
  img.src = url;
  return texture;
}

const renderer = createRenderer();

function resize(gl) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.floor(els.canvas.clientWidth * dpr);
  const height = Math.floor(els.canvas.clientHeight * dpr);
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}

function drawScene(time) {
  if (!renderer) return;
  const { gl, matrix, alpha, textures } = renderer;
  resize(gl);
  gl.clearColor(0.52, 0.82, 0.92, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);

  const aspect = gl.canvas.width / Math.max(1, gl.canvas.height);
  const pulse = Math.max(0, petPulseUntil - time) / 1200;
  const scene = currentScene();
  const indoors = scene === "home" || scene === "kitchen";
  const viewPan = getViewPan(scene);
  const cameraX = viewPan + Math.sin(time * 0.00018) * (indoors ? 0.18 : 0.42) + pulse * 0.16;
  const cameraY = (indoors ? 2.05 : 2.25) + Math.sin(time * 0.00027) * 0.08;
  const projection = perspective(Math.PI / 4.5, aspect, 0.1, 80);
  const view = lookAt([cameraX, cameraY, 7.2], [viewPan, indoors ? 0.85 : 0.9, -1.2], [0, 1, 0]);
  const pv = multiply(projection, view);

  const objects = backdropObjectsForScene(scene);
  const decorObjects = decorObjectsForScene(scene);

  objects.push(...decorObjects);

  objects.forEach((obj) => drawObject(gl, textures[obj.tex], pv, obj, matrix, alpha));

  let pet = null;
  if (!isPetHidden(time)) {
    const petFrame = state.stage === "egg" ? "egg" : currentPetFrame(time);
    const lowPose = petFrame === "sleepy" || petFrame.startsWith("roll") || petFrame === "couch-sit";
    const bob = lowPose ? pulse * 0.02 : Math.sin(time * 0.004) * 0.036 + pulse * 0.06;
    const scale = petScaleForScene(scene);
    const petPosition = getPetPosition(scene);
    const petLayout = petFrameLayout(petFrame, scale);
    pet = {
      tex: state.stage === "egg" ? "egg" : petTextureKeyFor(petFrame),
      x: scene === "underwater" ? wrapPanoramaX(petPosition.x - panoramaOffset(scene)) : petPosition.x,
      y: petPosition.y + bob + petLayout.yOffset,
      z: 0.55,
      w: petLayout.w,
      h: petLayout.h,
      rx: 0,
      a: 1,
      interactive: { type: "pet", scene },
    };
    drawObject(gl, textures[pet.tex], pv, pet, matrix, alpha);
  }
  lastInteractiveObjects = [
    ...decorObjects.map((obj) => interactiveBounds(gl, pv, obj)).filter(Boolean),
    pet ? interactiveBounds(gl, pv, pet) : null,
  ].filter(Boolean);

  requestAnimationFrame(drawScene);
}

function backdropObjectsForScene(scene) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const shortLandscape = window.innerHeight <= 520 && aspect > 1.7;
  const widthBoost = shortLandscape ? clamp(aspect / 2.15, 1.18, 1.58) : 1;
  const heightBoost = shortLandscape ? clamp(aspect / 2.75, 1.02, 1.18) : 1;
  const base = {
    tex: sceneBackdropTexture(scene),
    y: shortLandscape ? 1.24 : 1.15,
    z: -6.4,
    w: 24.0 * widthBoost,
    h: 13.5 * heightBoost,
    rx: 0,
    a: 1,
  };
  if (!isPanoramaScene(scene)) return [{ ...base, x: 0 }];
  const offset = panoramaOffset(scene);
  return [-1, 0, 1, 2].map((copy) => ({
    ...base,
    x: -offset + copy * PANORAMA_WIDTH,
  }));
}

function decorObjectsForScene(scene) {
  return placedDecorForScene(scene)
    .flatMap((item) => {
      const position = getDecorPosition(item);
      const backdropLocked = isBackdropLockedScene(scene);
      const renderScale = backdropLocked ? OUTDOOR_BACKDROP_DECOR_SCALE : 1;
      const layout = decorLayoutForItem(item);
      const x = backdropLocked ? position.x * OUTDOOR_BACKDROP_DECOR_X_SCALE : position.x;
      const baseObject = {
        ...item,
        tex: decorTextureForItem(item),
        x: scene === "underwater" ? wrapPanoramaX(x - panoramaOffset(scene)) : x,
        y: backdropLocked ? position.y + OUTDOOR_BACKDROP_DECOR_Y_OFFSET : position.y,
        z: backdropLocked ? OUTDOOR_BACKDROP_DECOR_Z : item.z,
        w: layout.w * renderScale,
        h: layout.h * renderScale,
        rx: 0,
        a: 1,
        interactive: { type: "decor", id: item.id },
      };
      const layerObjects = [baseObject];
      const tvScreenTex = item.id === "tv" ? TV_CHANNELS[decorStateValue("tv")]?.screenTex : "";
      if (tvScreenTex) {
        layerObjects.push({
          ...baseObject,
          tex: tvScreenTex,
          interactive: null,
        });
      }
      if (scene !== "underwater") return layerObjects;
      return layerObjects.flatMap((obj) => [-1, 0, 1].map((copy) => ({
        ...obj,
        x: obj.x + copy * PANORAMA_WIDTH,
      })));
    });
}

function equippedPetFrame() {
  if (state.equipped.look === "sweater") return "sweater";
  if (state.equipped.look === "bow") return "bow";
  if (state.equipped.look === "collar") return "collar";
  return "base";
}

function currentPetFrame(time = performance.now()) {
  if (petAction && time >= petActionUntil) {
    petAction = null;
    petActionUntil = 0;
  }
  if (petAction === "wag") return Math.floor(time / 170) % 2 === 0 ? "wag-a" : "wag-b";
  if (petAction === "roll") {
    return ["roll-a", "roll-b", "roll-c", "roll-b"][Math.floor(time / 190) % 4];
  }
  if (petAction === "couch") return "couch-sit";
  if (petAction === "celebrate") return "celebrate";
  if (activeRound) return "thinking";
  if (time < petPulseUntil) return "celebrate";
  if (petIsOnCouch()) return "couch-sit";
  return equippedPetFrame();
}

function petFrameLayout(frame, scale) {
  if (frame === "couch-sit") {
    return { w: scale * 0.84, h: scale * 1.0, yOffset: 0 };
  }
  if (frame === "sleepy" || frame.startsWith("roll")) {
    return { w: scale * 1.48, h: scale * 0.92, yOffset: -0.08 };
  }
  if (frame === "celebrate") {
    return { w: scale * 1.08, h: scale * 1.08, yOffset: 0.03 };
  }
  return { w: scale, h: scale * 1.1, yOffset: 0 };
}

function petTextureKey(time = performance.now()) {
  return petTextureKeyFor(currentPetFrame(time));
}

function petScaleForScene(scene) {
  if (state.stage === "egg") return 1.0;
  const base = scene === "home" || scene === "kitchen" ? 1.03 : (scene === "waterfall" || scene === "mountain" || scene === "underwater") ? 1.12 : 1.08;
  return base + Math.min(0.18, state.growth / 650);
}

function isPetHidden(time = performance.now()) {
  if (state.stage === "egg") return false;
  return time < petHiddenUntil;
}

function petIsOnCouch() {
  if (currentScene() !== "home" || state.stage === "egg" || !isDecorPlaced("couch")) return false;
  const petPosition = getPetPosition("home");
  const couchSeat = couchPetPosition();
  return Math.hypot(petPosition.x - couchSeat.x, petPosition.y - couchSeat.y) <= 0.12;
}

function drawObject(gl, texture, pv, obj, matrixLocation, alphaLocation) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const model = compose(obj.x, obj.y, obj.z, obj.rx || 0, obj.w, obj.h, 1);
  gl.uniformMatrix4fv(matrixLocation, false, multiply(pv, model));
  gl.uniform1f(alphaLocation, obj.a ?? 1);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function interactiveBounds(gl, pv, obj) {
  if (!obj.interactive) return null;
  const halfW = obj.w / 2;
  const halfH = obj.h / 2;
  const corners = [
    [obj.x - halfW, obj.y - halfH, obj.z],
    [obj.x + halfW, obj.y - halfH, obj.z],
    [obj.x - halfW, obj.y + halfH, obj.z],
    [obj.x + halfW, obj.y + halfH, obj.z],
  ].map((point) => projectPoint(gl, pv, point)).filter(Boolean);
  if (!corners.length) return null;
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const padding = obj.interactive.type === "pet" ? 12 : 8;
  return {
    ...obj.interactive,
    left: Math.min(...xs) - padding,
    right: Math.max(...xs) + padding,
    top: Math.min(...ys) - padding,
    bottom: Math.max(...ys) + padding,
  };
}

function projectPoint(gl, matrix, point) {
  const [x, y, z] = point;
  const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (!clipW) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return null;
  return {
    x: (ndcX * 0.5 + 0.5) * gl.canvas.clientWidth,
    y: (1 - (ndcY * 0.5 + 0.5)) * gl.canvas.clientHeight,
  };
}

function compose(x, y, z, rx, sx, sy, sz) {
  return multiply(multiply(translation(x, y, z), xRotation(rx)), scaling(sx, sy, sz));
}

function perspective(fieldOfView, aspect, near, far) {
  const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfView);
  const rangeInv = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

function lookAt(camera, target, up) {
  const zAxis = normalizeVec3([
    camera[0] - target[0],
    camera[1] - target[1],
    camera[2] - target[2],
  ]);
  const xAxis = normalizeVec3(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, camera), -dot(yAxis, camera), -dot(zAxis, camera), 1,
  ]);
}

function translation(tx, ty, tz) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ]);
}

function xRotation(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

function scaling(sx, sy, sz) {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ]);
}

function multiply(a, b) {
  const out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b0, b1, b2, b3;

  b0 = b[0]; b1 = b[1]; b2 = b[2]; b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalizeVec3(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

renderHud();
setWhiteboardTool("pen");
requestAnimationFrame(drawScene);
