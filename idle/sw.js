const CACHE_NAME = "idle-town-pwa-cache-v21";
const CROP_FILES = ["carrot", "wheat", "strawberry", "pumpkin", "blueberry", "apple"].flatMap((crop) =>
  ["soil", "sprout", "young", "mature"].map((stage) => `./assets/art/living-world/crops/${crop}-${stage}.png`)
);
const ANIMAL_FILES = ["chickens", "cows"].flatMap((animal) =>
  ["empty", "young", "adult", "full"].map((stage) => `./assets/art/living-world/animals/${animal}-${stage}.png`)
);
const BUILDING_FILES = ["school", "market", "bakery", "library"].flatMap((building) =>
  ["foundation", "construction", "level-1", "level-2", "level-3"].map((stage) => `./assets/art/living-world/buildings/${building}-${stage}.png`)
);
const PEOPLE_RIG_FILES = ["farmer", "market-helper-swing", "teacher"].flatMap((person) =>
  ["", "-modern"].flatMap((era) => ["torso", "leg-1", "leg-2"].map((part) => `./assets/art/people/${person}${era}-rig-${part}.png`))
);
const COMPO_CATCH_FILES = ["fish", "crab", "kelp", "seashell", "deepfish"].flatMap((catchId) =>
  ["water", "ripple", "young", "mature"].map((stage) => `./assets/art/compo-world/catches/${catchId}-${stage}.png`)
);
const COMPO_BUILDING_FILES = ["towncenter", "beachmarket", "icecream", "boat"].flatMap((building) =>
  ["foundation", "construction", "level-1", "level-2", "level-3"].map((stage) => `./assets/art/compo-world/buildings/${building}-${stage}.png`)
).concat(["./assets/art/compo-world/buildings/towncenter-level-3-winter.png"]);
const COMPO_HABITAT_FILES = ["beachhouse", "apartment"].flatMap((habitat) =>
  ["empty", "young", "adult", "full"].map((stage) => `./assets/art/compo-world/habitats/${habitat}-${stage}.png`)
);
const COMPO_PEOPLE_FILES = [
  "beach-shell-girl-walk",
  "beach-crab-boy-walk",
  "beach-kelp-girl-walk",
  "beach-lifeguard-girl-modern-walk",
  "beach-sailor-boy-modern-walk",
  "beach-tennis-girl-modern-walk",
].map((person) => `./assets/art/compo-world/people/${person}.png`);
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./pwa-assets/apple-touch-icon.png",
  "./pwa-assets/icon-192.png",
  "./pwa-assets/icon-512.png",
  "./assets/art/river-town-open-map.png",
  "./assets/art/river-town-spring-map.png",
  "./assets/art/river-town-summer-map.png",
  "./assets/art/river-town-winter-map.png",
  "./assets/art/compo-coast-open-map.png",
  "./assets/art/idle-town-app-icon-master.png",
  "./music/Golden_Fields_Groove.mp3",
  ...CROP_FILES,
  ...ANIMAL_FILES,
  ...BUILDING_FILES,
  ...PEOPLE_RIG_FILES,
  ...COMPO_CATCH_FILES,
  ...COMPO_BUILDING_FILES,
  ...COMPO_HABITAT_FILES,
  ...COMPO_PEOPLE_FILES,
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
