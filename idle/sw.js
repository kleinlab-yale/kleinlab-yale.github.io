const CACHE_NAME = "idle-town-pwa-cache-v8";
const CROP_FILES = ["carrot", "wheat", "pumpkin", "apple"].flatMap((crop) =>
  ["soil", "sprout", "young", "mature"].map((stage) => `./assets/art/living-world/crops/${crop}-${stage}.png`)
);
const ANIMAL_FILES = ["chickens", "cows"].flatMap((animal) =>
  ["empty", "young", "adult", "full"].map((stage) => `./assets/art/living-world/animals/${animal}-${stage}.png`)
);
const BUILDING_FILES = ["school", "market", "bakery", "library"].flatMap((building) =>
  ["foundation", "construction", "level-1", "level-2", "level-3"].map((stage) => `./assets/art/living-world/buildings/${building}-${stage}.png`)
);
const PEOPLE_FILES = ["farmer", "vendor", "teacher"].flatMap((person) =>
  ["", "-modern"].flatMap((era) => [1, 2, 3, 4].map((frame) => `./assets/art/people/${person}${era}-walk-${frame}.png`))
);
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
  "./assets/art/compo-coast-open-map.png",
  "./assets/art/idle-town-app-icon-master.png",
  "./music/Golden_Fields_Groove.mp3",
  ...CROP_FILES,
  ...ANIMAL_FILES,
  ...BUILDING_FILES,
  ...PEOPLE_FILES,
];

self.addEventListener("install", (event) => {
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
