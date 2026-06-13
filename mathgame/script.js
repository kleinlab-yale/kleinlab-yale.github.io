const SAVE_KEY = "math-pet-sky-meadow-v3";
const QUEST_PASS = 3;
const BOSS_PASS = 5;

const ASSETS = {
  backdrop: "assets/gpt-meadow-backdrop.png",
  home: "assets/gpt-home-interior.png",
  egg: "assets/gpt-egg.png",
  puppy: "assets/gpt-puppy-base.png",
  bow: "assets/gpt-puppy-bow.png",
  sweater: "assets/gpt-puppy-sweater.png",
  collar: "assets/gpt-puppy-collar.png",
  thinking: "assets/gpt-puppy-thinking.png",
  celebrate: "assets/gpt-puppy-celebrate.png",
  sleepy: "assets/gpt-puppy-sleepy.png",
  homeCouch: "assets/gpt-home-couch.png",
  homeChair: "assets/gpt-home-chair.png",
  homeTvOff: "assets/gpt-home-tv-off.png",
  homeTvStar: "assets/gpt-home-tv-star.png",
  homePlant: "assets/gpt-home-plant.png",
  homeRug: "assets/gpt-home-rug.png",
  homeLamp: "assets/gpt-home-lamp.png",
  homeTable: "assets/gpt-home-table.png",
  yardBench: "assets/gpt-yard-bench.png",
  yardBall: "assets/gpt-yard-ball.png",
  yardToys: "assets/gpt-yard-toys.png",
  yardBasket: "assets/gpt-yard-basket.png",
};

const WORLDS = [
  { name: "Sky Meadow", focus: "multi-digit multiplication warmups" },
  { name: "Ribbon Bridge", focus: "simplifying expressions" },
  { name: "Shape Grove", focus: "area and perimeter" },
  { name: "Equation Dunes", focus: "solving equations" },
  { name: "Crystal Decimal Cove", focus: "decimals and fractions" },
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
  { id: "none", name: "No extra", asset: null, kind: "all", unlock: true },
  { id: "sweater", name: "Peach sweater", asset: "assets/gpt-puppy-sweater.png", kind: "look" },
  { id: "bow", name: "Berry bow", asset: "assets/gpt-puppy-bow.png", kind: "look" },
  { id: "collar", name: "Bell collar", asset: "assets/gpt-puppy-collar.png", kind: "look" },
];

const DECOR_ITEMS = [
  { id: "couch", scene: "home", name: "Peach couch", tex: "homeCouch", x: -1.9, y: 0.94, z: 0.35, w: 2.15, h: 1.46, reward: "Home math" },
  { id: "plant", scene: "home", name: "Leafy plant", tex: "homePlant", x: 1.98, y: 0.9, z: 0.36, w: 0.92, h: 1.0, reward: "Home math" },
  { id: "tv", scene: "home", name: "Star TV", tex: "homeTvOff", x: 1.92, y: 1.28, z: 0.38, w: 1.38, h: 1.34, reward: "Home math" },
  { id: "chair", scene: "home", name: "Mint chair", tex: "homeChair", x: -0.95, y: 0.93, z: 0.4, w: 1.22, h: 1.1, reward: "Home math" },
  { id: "lamp", scene: "home", name: "Warm lamp", tex: "homeLamp", x: 2.88, y: 1.0, z: 0.42, w: 0.56, h: 1.0, reward: "Home math" },
  { id: "table", scene: "home", name: "Reading table", tex: "homeTable", x: 0.75, y: 0.54, z: 0.55, w: 0.86, h: 0.81, reward: "Home math" },
  { id: "bench", scene: "outdoor", name: "Garden bench", tex: "yardBench", x: -1.65, y: 0.58, z: 0.42, w: 1.78, h: 1.45, reward: "Outdoor quests" },
  { id: "ball", scene: "outdoor", name: "Treat ball", tex: "yardBall", x: 1.08, y: 0.34, z: 0.72, w: 0.7, h: 0.7, reward: "Outdoor quests" },
  { id: "toys", scene: "outdoor", name: "Rope toys", tex: "yardToys", x: 0.28, y: 0.31, z: 0.74, w: 0.94, h: 0.6, reward: "Outdoor quests" },
  { id: "basket", scene: "outdoor", name: "Toy basket", tex: "yardBasket", x: 2.18, y: 0.52, z: 0.48, w: 1.22, h: 1.02, reward: "Outdoor quests" },
];

const DECOR_SCENES = ["home", "outdoor"];
const DEFAULT_PET_POSITIONS = {
  home: { x: -0.06, y: 0.48 },
  outdoor: { x: 0.12, y: 0.56 },
};
const MOVE_BOUNDS = {
  home: { x: [-2.85, 2.95], y: [0.26, 1.35] },
  outdoor: { x: [-2.65, 2.7], y: [0.24, 1.22] },
};
const FEED_GLOW_COST = 4;

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
  decorOutdoorTab: document.querySelector("#decorOutdoorTab"),
  movePad: document.querySelector("#movePad"),
  moveTargetLabel: document.querySelector("#moveTargetLabel"),
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
  sparkleLabel: document.querySelector("#sparkleLabel"),
  questButton: document.querySelector("#questButton"),
  questButtonLabel: document.querySelector("#questButtonLabel"),
  callPetButton: document.querySelector("#callPetButton"),
  homeHotspot: document.querySelector("#homeHotspot"),
  exitHomeButton: document.querySelector("#exitHomeButton"),
  tvHotspot: document.querySelector("#tvHotspot"),
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
};

let selectedEgg = "sunny";
let toastTimer = 0;
let petPulseUntil = 0;
let activeRound = null;
let activeProblem = null;
let activeDecorScene = "home";
let selectedMoveTarget = { type: "pet", scene: "home" };
let lastInteractiveObjects = [];
let dragState = null;
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
    stage: "puppy",
    world: 1,
    questStep: 1,
    food: 84,
    energy: 76,
    growth: 44,
    glow: 18,
    location: "home",
    decorUnlocked: ["couch", "plant", "tv", "bench", "ball"],
    decorPlaced: ["couch", "plant", "tv", "bench", "ball"],
    decorPositions: {},
    petPositions: {
      home: { x: -0.18, y: 0.48 },
      outdoor: { x: 0.35, y: 0.56 },
    },
    tvChannel: 1,
    unlocked: ["none"],
    equipped: { look: "none" },
  };
}

function createInitialState() {
  return {
    setup: false,
    playerName: "",
    petName: "Mochi",
    egg: "sunny",
    stage: "egg",
    world: 0,
    questStep: 0,
    food: 48,
    energy: 52,
    growth: 0,
    glow: 0,
    location: "outdoor",
    decorUnlocked: [],
    decorPlaced: [],
    decorPositions: {},
    petPositions: {
      home: { ...DEFAULT_PET_POSITIONS.home },
      outdoor: { ...DEFAULT_PET_POSITIONS.outdoor },
    },
    tvChannel: 0,
    unlocked: ["none"],
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
    const savedDecorPlaced = Array.isArray(saved.decorPlaced) ? saved.decorPlaced : [];
    const decorUnlocked = normalizeDecorIds([
      ...legacyHomeItems,
      ...savedDecorUnlocked,
      ...savedDecorPlaced,
    ]);
    const decorPlaced = normalizeDecorIds(savedDecorPlaced.length ? savedDecorPlaced : legacyHomeItems)
      .filter((id) => decorUnlocked.includes(id));
    return {
      setup: Boolean(saved.setup),
      playerName: saved.playerName || "",
      petName: saved.petName || "Mochi",
      egg: saved.egg || "sunny",
      stage: saved.stage || "egg",
      world: clamp(saved.world ?? 0, 0, WORLDS.length - 1),
      questStep: clamp(saved.questStep ?? 0, 0, QUEST_FLOW.length - 1),
      food: clamp(saved.food ?? 48, 0, 100),
      energy: clamp(saved.energy ?? 52, 0, 100),
      growth: clamp(saved.growth ?? 0, 0, 100),
      glow: Math.max(0, Number(saved.glow || 0)),
      location: saved.location === "home" ? "home" : "outdoor",
      decorUnlocked,
      decorPlaced,
      decorPositions: normalizeDecorPositions(saved.decorPositions),
      petPositions: normalizePetPositions(saved.petPositions),
      tvChannel: clamp(saved.tvChannel ?? 0, 0, 1),
      unlocked: Array.isArray(saved.unlocked) ? Array.from(new Set(["none", ...saved.unlocked])) : ["none"],
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
      positions[item.id] = clampScenePosition(item.scene, source[item.id]);
    }
    return positions;
  }, {});
}

function normalizePetPositions(value) {
  const source = value && typeof value === "object" ? value : {};
  return DECOR_SCENES.reduce((positions, scene) => {
    positions[scene] = clampScenePosition(scene, source[scene] || DEFAULT_PET_POSITIONS[scene]);
    return positions;
  }, {});
}

function currentScene() {
  return state.location === "home" ? "home" : "outdoor";
}

function decorSceneLabel(scene) {
  return scene === "home" ? "Home" : "Outside";
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
  state.decorPositions[item.id] = clampScenePosition(item.scene, position);
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
    x: clamp(position?.x ?? 0, bounds.x[0], bounds.x[1]),
    y: clamp(position?.y ?? 0, bounds.y[0], bounds.y[1]),
  };
}

function isDecorUnlocked(id) {
  return state.decorUnlocked.includes(id);
}

function isDecorPlaced(id) {
  return state.decorPlaced.includes(id);
}

function nextDecorItem(scene) {
  return decorItemsForScene(scene).find((item) => !isDecorUnlocked(item.id));
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
  document.querySelectorAll("[data-egg]").forEach((item) => {
    item.classList.toggle("active", item.dataset.egg === selectedEgg);
  });
  setOverlay(els.questOverlay, false);
  setOverlay(els.closetOverlay, false);
  setOverlay(els.decorOverlay, false);
  setOverlay(els.setupOverlay, true);
  renderHud();
  showToast("Restarted. Choose a new egg.");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
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

function setOverlay(overlay, show) {
  overlay.classList.toggle("show", show);
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
}

function renderHud() {
  const quest = currentQuestType();
  const world = currentWorld();
  const questName = QUEST_LABELS[quest];
  const pass = currentQuestPass();
  const size = currentQuestSize();
  const inHome = state.location === "home";
  const scene = currentScene();
  const nextDecor = nextDecorItem(scene);

  els.setupOverlay.classList.toggle("show", !state.setup);
  els.objectiveTitle.textContent = state.stage === "egg"
    ? "Hatch the puppy"
    : inHome ? "Cozy Home" : `${questName}: ${world.name}`;
  els.objectiveText.textContent = state.stage === "egg"
    ? "Click Practice Math. Pass the first growth quest to hatch the egg."
    : inHome
      ? nextDecor
        ? `Do home math to unlock the ${nextDecor.name}. Pass with ${pass}/${size} correct.`
        : "Home decor is earned. Use Decor to arrange furniture or go outside."
      : nextDecor
        ? `Practice ${world.focus}. Passing unlocks ${nextDecor.name}, growth XP, and the next beat.`
        : `Practice ${world.focus}. Pass with ${pass}/${size} correct to keep growing.`;
  els.petNameLabel.textContent = state.stage === "egg" ? `${state.petName}'s egg` : state.petName;
  els.foodBar.style.width = `${state.food}%`;
  els.energyBar.style.width = `${state.energy}%`;
  els.growthBar.style.width = `${state.growth}%`;
  els.worldLabel.textContent = inHome ? "Cozy Home" : `${world.name}  ${state.world + 1}/${WORLDS.length}`;
  els.sparkleLabel.textContent = `${state.glow} glow  ${placedDecorForScene(scene).length}/${decorItemsForScene(scene).length} decor`;
  els.questButtonLabel.textContent = state.stage === "egg" ? "Hatch Quest" : inHome ? "Decor Quest" : questName;
  els.homeHotspot.classList.toggle("show", state.setup && state.stage !== "egg" && !inHome);
  els.exitHomeButton.classList.toggle("show", state.setup && inHome);
  els.tvHotspot.classList.toggle("show", state.setup && inHome && isDecorPlaced("tv"));
  renderCloset();
  renderDecor();
}

function unlockNextDecorReward(scene) {
  const item = nextDecorItem(scene);
  if (!item) return `${decorSceneLabel(scene)} decor is fully unlocked.`;
  state.decorUnlocked.push(item.id);
  if (!state.decorPlaced.includes(item.id)) state.decorPlaced.push(item.id);
  if (!state.decorPositions[item.id]) state.decorPositions[item.id] = defaultDecorPosition(item);
  return `${item.name} unlocked for ${decorSceneLabel(scene).toLowerCase()}.`;
}

function renderCloset() {
  els.closetGrid.innerHTML = CLOSET.map((item) => {
    const unlocked = item.unlock || state.unlocked.includes(item.id);
    const active = item.id === "none"
      ? state.equipped.look === "none"
      : state.equipped.look === item.id;
    const image = item.asset ? `<img src="${item.asset}" alt="" />` : `<span class="closet-empty">Base</span>`;
    return `
      <button class="closet-item ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-closet="${item.id}" ${unlocked ? "" : "disabled"} type="button">
        ${image}
        <strong>${item.name}</strong>
        <span>${unlocked ? (active ? "Wearing" : "Tap to wear") : "Locked"}</span>
      </button>
    `;
  }).join("");
}

function renderDecor() {
  if (!els.decorGrid) return;
  DECOR_SCENES.forEach((scene) => {
    const tab = scene === "home" ? els.decorHomeTab : els.decorOutdoorTab;
    tab.classList.toggle("active", activeDecorScene === scene);
  });

  const petImage = state.stage === "egg" ? ASSETS.egg : ASSETS.puppy;
  const petActive = selectedMoveTarget.type === "pet" && selectedMoveTarget.scene === activeDecorScene;
  const cards = [`
    <button class="decor-item ${petActive ? "active" : ""}" data-decor-pet="${activeDecorScene}" type="button">
      <img src="${petImage}" alt="" />
      <strong>${state.stage === "egg" ? "Egg spot" : "Pet spot"}</strong>
      <span>Placed</span>
    </button>
  `];

  decorItemsForScene(activeDecorScene).forEach((item) => {
    const unlocked = isDecorUnlocked(item.id);
    const placed = isDecorPlaced(item.id);
    const active = selectedMoveTarget.type === "decor" && selectedMoveTarget.id === item.id;
    const status = unlocked ? (placed ? "Placed" : "Unlocked") : item.reward;
    cards.push(`
      <button class="decor-item ${active ? "active" : ""} ${unlocked ? "" : "locked"}" data-decor-id="${item.id}" type="button">
        <img src="${ASSETS[item.tex]}" alt="" />
        <strong>${item.name}</strong>
        <span>${status}</span>
      </button>
    `);
  });

  els.decorGrid.innerHTML = cards.join("");
  renderMovePad();
}

function renderMovePad() {
  const target = selectedTarget();
  els.moveTargetLabel.textContent = target ? `Move: ${target.name}` : "Select an unlocked item";
  els.movePad.querySelectorAll("[data-move]").forEach((button) => {
    button.disabled = !target;
  });
}

function selectedTarget() {
  if (selectedMoveTarget.type === "pet") {
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
  if (isDecorPlaced(item.id)) {
    if (selectedMoveTarget.type === "decor" && selectedMoveTarget.id === item.id) {
      state.decorPlaced = state.decorPlaced.filter((id) => id !== item.id);
      selectedMoveTarget = { type: "pet", scene: item.scene };
      showToast(`${item.name} put away.`);
    } else {
      selectedMoveTarget = { type: "decor", id: item.id };
      showToast(`${item.name} selected.`);
    }
  } else {
    state.decorPlaced.push(item.id);
    if (!state.decorPositions[item.id]) state.decorPositions[item.id] = defaultDecorPosition(item);
    selectedMoveTarget = { type: "decor", id: item.id };
    showToast(`${item.name} placed.`);
  }
  saveState();
  renderHud();
}

function moveSelectedTarget(direction) {
  const target = selectedTarget();
  if (!target) return;
  const step = 0.12;
  const delta = {
    left: { x: -step, y: 0 },
    right: { x: step, y: 0 },
    up: { x: 0, y: step },
    down: { x: 0, y: -step },
  }[direction];

  if (direction === "reset") {
    if (target.type === "pet") setPetPosition(target.scene, DEFAULT_PET_POSITIONS[target.scene]);
    if (target.type === "decor") setDecorPosition(target.item, defaultDecorPosition(target.item));
  } else if (delta) {
    if (target.type === "pet") {
      const position = getPetPosition(target.scene);
      setPetPosition(target.scene, { x: position.x + delta.x, y: position.y + delta.y });
    } else {
      const position = getDecorPosition(target.item);
      setDecorPosition(target.item, { x: position.x + delta.x, y: position.y + delta.y });
    }
  }

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

function dragWorldScale(scene) {
  return scene === "home"
    ? { x: 6.4, y: 2.9 }
    : { x: 6.0, y: 3.1 };
}

function finishDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  try {
    els.canvas.releasePointerCapture(event.pointerId);
  } catch {
    /* Pointer capture may already be released by the browser. */
  }
  dragState = null;
  saveState();
  renderHud();
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
  state.equipped.look = item.id;
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 900;
}

function feedPet() {
  if (state.stage === "egg") {
    showToast("Hatch the egg first, then snacks can help.");
    petPulseUntil = performance.now() + 700;
    return;
  }
  if (state.glow < FEED_GLOW_COST) {
    showToast(`Earn ${FEED_GLOW_COST} glow in math to buy a snack.`);
    return;
  }
  state.glow -= FEED_GLOW_COST;
  state.food = clamp(state.food + 30, 0, 100);
  state.energy = clamp(state.energy + 3, 0, 100);
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 1000;
  showToast(`${state.petName} ate a snack. -${FEED_GLOW_COST} glow.`);
}

function rubPet() {
  if (state.stage === "egg") {
    petPulseUntil = performance.now() + 900;
    showToast("The egg wiggles. Math growth will hatch it.");
    return;
  }
  state.energy = clamp(state.energy + 18, 0, 100);
  state.food = clamp(state.food - 1, 0, 100);
  state.growth = clamp(state.growth + 1, 0, 100);
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 1000;
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
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 1200;
  showToast(`${state.petName} played fetch and gained growth XP.`);
}

function startQuest() {
  if (state.stage !== "egg" && state.energy < 8) {
    showToast(`${state.petName} is tired. Rub first, then practice.`);
    return;
  }
  if (state.stage !== "egg" && state.food < 5 && state.glow >= FEED_GLOW_COST) {
    showToast(`${state.petName} is hungry. Feed a snack before practice.`);
    return;
  }
  const type = currentQuestType();
  const size = currentQuestSize();
  activeRound = {
    type,
    location: state.location,
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
  els.questFeedback.textContent = "A correct answer adds glow. Wrong answers are practice, not progress.";
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
    state.glow += activeRound.type === "boss" ? 2 : 1;
    state.food = clamp(state.food - 1, 0, 100);
    state.energy = clamp(state.energy - 1, 0, 100);
    state.growth = clamp(state.growth + 3, 0, 100);
    els.questFeedback.textContent = "Correct. You earned glow and growth XP.";
    els.questFeedback.className = "quest-feedback good";
    petPulseUntil = performance.now() + 800;
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

  let message = `${QUEST_LABELS[type]} cleared: ${correct}/${pass}`;
  state.food = clamp(state.food - 3, 0, 100);
  state.energy = clamp(state.energy + 6, 0, 100);
  state.growth = clamp(state.growth + 14, 0, 100);
  state.glow += type === "boss" ? 20 : 8;

  if (roundLocation === "home") {
    showToast(`${QUEST_LABELS[type]} cleared: ${correct}/${pass}. ${unlockNextDecorReward("home")}`);
    saveState();
    renderHud();
    petPulseUntil = performance.now() + 1300;
    return;
  }

  if (type === "number" && state.stage === "egg") {
    state.stage = "puppy";
    state.equipped.look = "none";
    message = `${state.petName} hatched. Click the cottage to enter the cozy home.`;
  } else if (type === "geometry") {
    if (unlock("sweater")) message = "Peach sweater unlocked from the build quest.";
  } else if (type === "boss") {
    const rewards = [];
    if (unlock("bow")) rewards.push("Berry bow");
    if (unlock("collar")) rewards.push("Bell collar");
    if (rewards.length) message = `Boss cleared. ${rewards.join(" and ")} unlocked.`;
    if (state.world < WORLDS.length - 1) {
      state.world += 1;
      state.questStep = 0;
      message += ` ${currentWorld().name} opened.`;
    } else {
      state.growth = 100;
      message = `${state.petName} mastered Aurora Academy.`;
    }
  }

  const decorMessage = unlockNextDecorReward("outdoor");
  if (!decorMessage.includes("fully unlocked")) message += ` ${decorMessage}`;

  if (type !== "boss") {
    state.questStep = clamp(state.questStep + 1, 0, QUEST_FLOW.length - 1);
  }

  saveState();
  renderHud();
  showToast(message);
  petPulseUntil = performance.now() + 1300;
}

function makeProblem(type, world) {
  if (type === "number") return makeNumberProblem(world);
  if (type === "fraction") return makeBridgeProblem(world);
  if (type === "geometry") return makeGeometryProblem(world);
  return choose([makeNumberProblem, makeBridgeProblem, makeGeometryProblem])(Math.min(world + 1, WORLDS.length - 1));
}

function makeNumberProblem(world) {
  if (world <= 1) return makeMultiplicationProblem();
  if (world <= 2) return choose([makeExpressionProblem, makeWordEquationProblem])();
  if (world <= 4) return makeEquationProblem();
  if (world <= 5) return choose([makeDecimalFractionProblem, makeExpressionProblem])();
  return choose([makeExpressionProblem, makeEquationProblem, makeWordEquationProblem, makeDecimalFractionProblem])();
}

function makeBridgeProblem(world) {
  if (world <= 1) return makeExpressionProblem();
  if (world <= 3) return choose([makeExpressionProblem, makeEquationProblem])();
  if (world <= 4) return choose([makeEquationProblem, makeDecimalFractionProblem])();
  return choose([makeExpressionProblem, makeEquationProblem, makeDecimalFractionProblem, makeWordEquationProblem])();
}

function makeGeometryProblem(world) {
  return choose([
    () => problem("L-shape area: start with a 10 by 3 rectangle and cut out a 1 by 1 corner. What is the area?", 29, "Composite area", [
      "Find the big rectangle first.",
      "Subtract the missing corner.",
      "Use square units for area.",
    ], "number", null, null, "Type area"),
    () => problem("L-shape perimeter: sides are 10, 3, 1, 1, 9, and 2 around the outside. What is the perimeter?", 26, "Composite perimeter", [
      "Perimeter is the distance around the outside.",
      "Add every outside side length.",
      "Do not multiply unless the shape is a rectangle.",
    ], "number", null, null, "Type perimeter"),
    () => problem("Right triangle area: legs are 12 and 5, hypotenuse is 13. What is the area?", 30, "Triangle area", [
      "Use the two perpendicular legs as base and height.",
      "Triangle area is base times height divided by 2.",
      "The hypotenuse helps with perimeter, not area.",
    ], "number", null, null, "Type area"),
    () => problem("Right triangle perimeter: sides are 5, 12, and 13. What is the perimeter?", 30, "Triangle perimeter", [
      "Perimeter is the sum of all side lengths.",
      "Add the two legs and the slanted side.",
      "No area formula is needed.",
    ], "number", null, null, "Type perimeter"),
    () => problem("Composite area: a 5 by 3 rectangle has a right triangle attached. The triangle has base 4 and height 3. What is the total area?", 21, "Rectangle plus triangle", [
      "Find the rectangle area.",
      "Find the triangle area using base times height divided by 2.",
      "Add both areas.",
    ], "number", null, null, "Type area"),
    () => problem("Composite perimeter: outside sides are 9, 3, 5, and 5. What is the perimeter?", 22, "Composite perimeter", [
      "Only add the outside boundary.",
      "Do not add dashed or inside helper lines.",
      "Perimeter is a length, not square units.",
    ], "number", null, null, "Type perimeter"),
  ])();
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
    () => linearProblem("3a + 2b - 2(a + b) = ?", { a: 1, b: 0, c: 0 }),
    () => linearProblem("4a - 2b + 2(3a + 2b) = ?", { a: 10, b: 2, c: 0 }),
    () => linearProblem("(3a + 3) * 5 - 12 = ?", { a: 15, b: 0, c: 3 }),
    () => linearProblem("(7a + 3b + 2) - 3(b + 2) = ?", { a: 7, b: 0, c: -4 }),
    () => linearProblem("(5a + 6b + 8) - 2(b - 2) = ?", { a: 5, b: 4, c: 12 }),
    () => linearProblem("(100a + 6) * 5 - 40 = ?", { a: 500, b: 0, c: -10 }),
    () => linearProblem("(a + 11) - (a + 21) = ?", { a: 0, b: 0, c: -10 }),
    () => linearProblem("(9a + 15) - (9a - 12) = ?", { a: 0, b: 0, c: 27 }),
    () => linearProblem("(7a + 19) - (a - 31) = ?", { a: 6, b: 0, c: 50 }),
    () => linearProblem("20(a + 1) - 21(a - 1) = ?", { a: -1, b: 0, c: 41 }),
    () => linearProblem("a + 22 - 7 + 36a = ?", { a: 37, b: 0, c: 15 }),
    () => linearProblem("(a + 7) * 8 + 3a = ?", { a: 11, b: 0, c: 56 }),
  ])();
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
    () => rationalProblem("Solve: 5x + 8 = 7x - 72", rational(40), "Solve equations", [
      "Move x terms to one side.",
      "Move number terms to the other side.",
      "Divide to find x.",
    ], "x = 40"),
    () => rationalProblem("Solve: 7x + 4 = 26", rational(22, 7), "Solve equations", [
      "Subtract 4 from both sides.",
      "Divide both sides by 7.",
      "A fraction answer is okay.",
    ], "x = 22/7"),
    () => rationalProblem("Solve: 7(x + 1) = 8(x - 2)", rational(23), "Distribute then solve", [
      "Distribute on both sides.",
      "Move x terms to one side.",
      "Move numbers to the other side.",
    ], "x = 23"),
    () => rationalProblem("Solve: x + 4/5 = 9/10", rational(1, 10), "Fraction equation", [
      "Subtract 4/5 from both sides.",
      "Rename fifths as tenths when useful.",
      "Write x as a fraction.",
    ], "x = 1/10"),
    () => rationalProblem("Solve: x - 1 7/20 = 7/10", rational(41, 20), "Mixed-number equation", [
      "Add 1 7/20 to both sides.",
      "Rename tenths as twentieths.",
      "Mixed-number answers are accepted.",
    ], "x = 2 1/20"),
    () => rationalProblem("Solve: 1 1/2 - x = 1/10", rational(7, 5), "Fraction equation", [
      "Think: what must be subtracted from 1 1/2 to leave 1/10?",
      "Rename 1 1/2 as tenths.",
      "Solve for x.",
    ], "x = 1 2/5"),
  ])();
}

function rationalProblem(promptText, answer, lessonTitle, steps, displayAnswer) {
  return problem(promptText, answer, lessonTitle, steps, "rational", null, displayAnswer, "Example: x = 1/10");
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
  const item = choose([
    ["0.7", rational(7, 10), "7/10"],
    ["0.07", rational(7, 100), "7/100"],
    ["0.43", rational(43, 100), "43/100"],
    ["2.78", rational(278, 100), "2 78/100"],
    ["1.4", rational(14, 10), "1 4/10"],
    ["0.40", rational(40, 100), "40/100"],
    ["0.94", rational(94, 100), "94/100"],
    ["0.006", rational(6, 1000), "6/1000"],
  ]);
  return problem(`Write ${item[0]} as a fraction.`, item[1], "Decimals as fractions", [
    "Use place value: tenths, hundredths, or thousandths.",
    "The digits after the decimal become the numerator.",
    "Equivalent simplified fractions are accepted.",
  ], "rational", null, item[2], "Example: 7/10");
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
  if (item.answerType === "number") return Math.abs(Number(value) - Number(item.answer)) < 0.001;
  if (item.answerType === "decimal") return Math.abs(Number(value) - Number(item.answer)) < 0.001;
  if (item.answerType === "remainder") return normalize(value) === normalize(item.answer).replace("remainder", "r");
  if (item.answerType === "choice") return normalizeChoice(value) === normalizeChoice(item.answer);
  if (item.answerType === "linear") return sameLinearExpression(value, item.answer);
  if (item.answerType === "rational") return sameRational(value, item.answer);
  return normalize(value) === normalize(item.answer);
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
  text = text.replace(/^x\s*/i, "").trim();
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
  const result = { a: 0, b: 0, c: 0 };

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
  state.setup = true;
  state.playerName = els.playerInput.value.trim().slice(0, 18) || "Explorer";
  state.petName = els.petInput.value.trim().slice(0, 18) || "Mochi";
  state.egg = selectedEgg;
  saveState();
  renderHud();
  showToast(`Welcome to Sky Meadow, ${state.playerName}.`);
});

els.eggRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-egg]");
  if (!button) return;
  selectedEgg = button.dataset.egg;
  document.querySelectorAll("[data-egg]").forEach((item) => item.classList.toggle("active", item === button));
});

els.profileButton.addEventListener("click", () => {
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
  petPulseUntil = performance.now() + 1200;
  showToast(`${state.petName} trotted into the cozy home.`);
});
els.exitHomeButton.addEventListener("click", () => {
  state.location = "outdoor";
  activeDecorScene = "outdoor";
  selectedMoveTarget = { type: "pet", scene: "outdoor" };
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 900;
  showToast(`${state.petName} went back outside.`);
});
els.tvHotspot.addEventListener("click", () => {
  if (!isDecorPlaced("tv")) return;
  state.tvChannel = state.tvChannel ? 0 : 1;
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 900;
  showToast(state.tvChannel ? "The TV shows a starry puppy channel." : "The TV is now on the calm channel.");
});

els.questButton.addEventListener("click", startQuest);
els.callPetButton.addEventListener("click", () => {
  setPetPosition(currentScene(), DEFAULT_PET_POSITIONS[currentScene()]);
  saveState();
  renderHud();
  petPulseUntil = performance.now() + 1200;
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
[els.decorHomeTab, els.decorOutdoorTab].forEach((tab) => {
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
els.movePad.addEventListener("click", (event) => {
  const button = event.target.closest("[data-move]");
  if (!button || button.disabled) return;
  moveSelectedTarget(button.dataset.move);
});
els.canvas.addEventListener("pointerdown", (event) => {
  const picked = pickInteractiveObject(event.clientX, event.clientY);
  if (!picked) return;
  event.preventDefault();
  activeDecorScene = currentScene();
  selectedMoveTarget = picked.type === "pet"
    ? { type: "pet", scene: currentScene() }
    : { type: "decor", id: picked.id };
  dragState = {
    pointerId: event.pointerId,
    target: { ...selectedMoveTarget },
    startX: event.clientX,
    startY: event.clientY,
    startPosition: getTargetPosition(selectedMoveTarget),
    scene: currentScene(),
  };
  els.canvas.setPointerCapture(event.pointerId);
  renderHud();
});
els.canvas.addEventListener("pointermove", (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  const scale = dragWorldScale(dragState.scene);
  const rect = els.canvas.getBoundingClientRect();
  const dx = ((event.clientX - dragState.startX) / Math.max(1, rect.width)) * scale.x;
  const dy = -((event.clientY - dragState.startY) / Math.max(1, rect.height)) * scale.y;
  setTargetPosition(dragState.target, {
    x: dragState.startPosition.x + dx,
    y: dragState.startPosition.y + dy,
  });
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
      gl_FragColor = vec4(color.rgb, color.a * u_alpha);
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
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
  const inHome = state.location === "home";
  const cameraX = Math.sin(time * 0.00018) * (inHome ? 0.18 : 0.45) + pulse * 0.16;
  const cameraY = (inHome ? 2.05 : 2.25) + Math.sin(time * 0.00027) * 0.08;
  const projection = perspective(Math.PI / 4.5, aspect, 0.1, 80);
  const view = lookAt([cameraX, cameraY, 7.2], [0, inHome ? 0.85 : 0.9, -1.2], [0, 1, 0]);
  const pv = multiply(projection, view);

  const objects = [
    { tex: inHome ? "home" : "backdrop", x: 0, y: 1.15, z: -6.4, w: 24.0, h: 13.5, rx: 0, a: 1 },
  ];
  const decorObjects = decorObjectsForScene(currentScene());

  objects.push(...decorObjects);

  objects.forEach((obj) => drawObject(gl, textures[obj.tex], pv, obj, matrix, alpha));

  const bob = Math.sin(time * 0.004) * 0.045 + pulse * 0.08;
  const scale = state.stage === "egg" ? 1.15 : (inHome ? 1.38 : 1.72) + Math.min(0.25, state.growth / 500);
  const petPosition = getPetPosition(currentScene());
  const pet = {
    tex: state.stage === "egg" ? "egg" : petTextureKey(),
    x: petPosition.x,
    y: petPosition.y + bob,
    z: 0.55,
    w: scale,
    h: scale * 1.1,
    rx: 0,
    a: 1,
    interactive: { type: "pet", scene: currentScene() },
  };
  drawObject(gl, textures[pet.tex], pv, pet, matrix, alpha);
  lastInteractiveObjects = [
    ...decorObjects.map((obj) => interactiveBounds(gl, pv, obj)).filter(Boolean),
    interactiveBounds(gl, pv, pet),
  ].filter(Boolean);

  requestAnimationFrame(drawScene);
}

function decorObjectsForScene(scene) {
  return placedDecorForScene(scene)
    .map((item) => {
      const position = getDecorPosition(item);
      return {
      ...item,
      tex: item.id === "tv" ? (state.tvChannel ? "homeTvStar" : "homeTvOff") : item.tex,
      x: position.x,
      y: position.y,
      rx: 0,
      a: 1,
      interactive: { type: "decor", id: item.id },
    };
  });
}

function petTextureKey() {
  if (activeRound) return "thinking";
  if (performance.now() < petPulseUntil) return "celebrate";
  if (state.equipped.look === "sweater") return "sweater";
  if (state.equipped.look === "bow") return "bow";
  if (state.equipped.look === "collar") return "collar";
  return "puppy";
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
requestAnimationFrame(drawScene);
