(() => {
  "use strict";

  const SAVE_KEY = "idle-town-westport-v5";
  const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
  const TICK_MS = 500;
  const LEVELS = [
    { name: "Sprout Village", xp: 0 },
    { name: "Maple Village", xp: 250 },
    { name: "Cedar Crossing", xp: 650 },
    { name: "Coleytown Commons", xp: 1200 },
    { name: "Golden Hill Town", xp: 2100 },
  ];

  const CROPS = [
    {
      id: "carrot",
      name: "Carrots",
      seedCost: 1,
      duration: 25,
      yield: 5,
      value: 3,
      level: 1,
      atlasRow: 0,
      artKey: "carrot",
      color: "#e68a45",
    },
    {
      id: "wheat",
      name: "Wheat",
      seedCost: 1,
      duration: 55,
      yield: 8,
      value: 4,
      level: 1,
      atlasRow: 1,
      artKey: "wheat",
      color: "#e7bd57",
    },
    {
      id: "pumpkin",
      name: "Pumpkins",
      seedCost: 2,
      duration: 110,
      yield: 7,
      value: 9,
      level: 2,
      atlasRow: 2,
      artKey: "pumpkin",
      color: "#d9793f",
    },
    {
      id: "apple",
      name: "Apples",
      seedCost: 3,
      duration: 180,
      yield: 10,
      value: 12,
      level: 3,
      atlasRow: 3,
      artKey: "apple",
      color: "#b94d4b",
    },
  ];

  const BUILDINGS = {
    school: {
      name: "Coleytown Schoolhouse",
      short: "Schoolhouse",
      atlasRow: 0,
      artKey: "school",
      baseCost: 90,
      materials: { wood: 4, ore: 1 },
      description: "A bright school at the heart of town. Each level makes math practice produce more seeds.",
      effect: (level) => `+${level} seed on every correct math answer`,
      unlock: () => true,
    },
    market: {
      name: "Main Street Market",
      short: "Village Market",
      atlasRow: 1,
      artKey: "market",
      baseCost: 120,
      materials: { wood: 5, ore: 2 },
      description: "A friendly place to trade the farm’s best. Each level earns passive coin income.",
      effect: (level) => `+${(level * 0.25).toFixed(2)} coins each second`,
      unlock: () => true,
    },
    bakery: {
      name: "Cedar Bakery",
      short: "Cedar Bakery",
      atlasRow: 2,
      artKey: "bakery",
      baseCost: 280,
      materials: { wood: 8, ore: 4 },
      description: "Turns local harvests into treats. Each level increases the value of everything you sell.",
      effect: (level) => `+${level * 15}% market value`,
      unlock: (state) => getLevelInfo(state.xp).level >= 2,
    },
    library: {
      name: "Coleytown Library",
      short: "Town Library",
      atlasRow: 3,
      artKey: "library",
      baseCost: 360,
      materials: { wood: 10, ore: 6 },
      description: "A welcoming library for curious minds. Each level increases materials earned from Chinese practice.",
      effect: (level) => `+${level} wood from Chinese practice`,
      unlock: (state) => state.buildings.school >= 2,
    },
  };

  const ANIMALS = {
    chickens: { name: "Chicken Coop", artKey: "chickens", atlasRow: 0, baseCost: 70, labels: ["Empty pen", "2 chicks", "3 hens", "6 hens + eggs"], feed: [{ carrot: 2 }, { wheat: 3 }, { wheat: 4, apple: 1 }], effect: (level) => `+${(level * 0.12).toFixed(2)} coins/sec from eggs` },
    cows: { name: "Cow Paddock", artKey: "cows", atlasRow: 1, baseCost: 130, labels: ["Empty paddock", "1 calf", "2 cows", "4 cows + milk"], feed: [{ wheat: 4 }, { wheat: 5, apple: 1 }, { wheat: 6, apple: 2 }], effect: (level) => `+${(level * 0.28).toFixed(2)} coins/sec from milk` },
  };

  const WESTPORT_ROADMAP = [
    { name: "River Town", detail: "Build the farm, habitats, school, market, bakery, and library", status: "active" },
    { name: "Compo Coast", detail: "A separate seaside map with Compo Beach, dog park, tennis club, and YMCA", status: "future" },
    { name: "Downtown & Flag Bridge", detail: "Saugatuck River, shops, Starbucks, Brandy Melville, and Spotted Horse", status: "future" },
    { name: "Schools District", detail: "Coleytown Elementary & Middle, Staples, and Westport’s Academy of Dance", status: "future" },
    { name: "Modern Westport", detail: "Modern library, full downtown, arts, dining, and community", status: "future" },
  ];

  const CHINESE = [
    { hanzi: "苹果", pinyin: "píng guǒ", answer: "apple", distractors: ["school", "friend", "book"] },
    { hanzi: "学校", pinyin: "xué xiào", answer: "school", distractors: ["market", "garden", "family"] },
    { hanzi: "朋友", pinyin: "péng you", answer: "friend", distractors: ["teacher", "apple", "morning"] },
    { hanzi: "谢谢", pinyin: "xiè xie", answer: "thank you", distractors: ["goodbye", "hello", "please"] },
    { hanzi: "早上好", pinyin: "zǎo shang hǎo", answer: "good morning", distractors: ["good night", "how are you", "see you"] },
    { hanzi: "水", pinyin: "shuǐ", answer: "water", distractors: ["rice", "milk", "tea"] },
    { hanzi: "书", pinyin: "shū", answer: "book", distractors: ["desk", "pen", "school"] },
    { hanzi: "家", pinyin: "jiā", answer: "home", distractors: ["town", "farm", "store"] },
    { hanzi: "一、二、三", pinyin: "yī, èr, sān", answer: "one, two, three", distractors: ["three, two, one", "four, five, six", "red, blue, green"] },
    { hanzi: "我喜欢苹果", pinyin: "wǒ xǐ huan píng guǒ", answer: "I like apples", distractors: ["I have apples", "I sell apples", "I see apples"] },
  ];

  const dom = {
    app: document.getElementById("app"),
    coinCount: document.getElementById("coin-count"),
    seedCount: document.getElementById("seed-count"),
    woodCount: document.getElementById("wood-count"),
    oreCount: document.getElementById("ore-count"),
    levelName: document.getElementById("level-name"),
    levelLabel: document.getElementById("level-label"),
    levelProgress: document.getElementById("level-progress"),
    worldArt: document.getElementById("world-art"),
    worldCrops: document.getElementById("world-crops"),
    worldProgressCopy: document.getElementById("world-progress-copy"),
    layoutButton: document.getElementById("layout-button"),
    layoutHint: document.getElementById("layout-hint"),
    regionButtons: Array.from(document.querySelectorAll("[data-region]")),
    chickenLevelMap: document.getElementById("chicken-level-map"),
    cowLevelMap: document.getElementById("cow-level-map"),
    farmField: document.getElementById("farm-field"),
    seedDrawer: document.getElementById("seed-drawer"),
    seedList: document.getElementById("seed-list"),
    seedClose: document.getElementById("seed-close"),
    focusBoost: document.getElementById("focus-boost"),
    boostLabel: document.getElementById("boost-label"),
    readyCountLabel: document.getElementById("ready-count-label"),
    quickHarvest: document.getElementById("quick-harvest-button"),
    quickBuild: document.getElementById("quick-build-button"),
    guideAction: document.getElementById("guide-action"),
    townCard: document.getElementById("town-card"),
    townCardClose: document.getElementById("town-card-close"),
    guideTitle: document.getElementById("guide-title"),
    guideCopy: document.getElementById("guide-copy"),
    questionSkill: document.getElementById("question-skill"),
    questionReward: document.getElementById("question-reward"),
    questionPrompt: document.getElementById("question-prompt"),
    questionHint: document.getElementById("question-hint"),
    answerGrid: document.getElementById("answer-grid"),
    lessonFeedback: document.getElementById("lesson-feedback"),
    whiteboardToggle: document.getElementById("whiteboard-toggle"),
    whiteboardPen: document.getElementById("whiteboard-pen"),
    whiteboardEraser: document.getElementById("whiteboard-eraser"),
    whiteboardClear: document.getElementById("whiteboard-clear"),
    workBoard: document.getElementById("work-board"),
    whiteboardCanvas: document.getElementById("whiteboard-canvas"),
    streakCount: document.getElementById("streak-count"),
    lessonProgressBar: document.getElementById("lesson-progress-bar"),
    lessonProgressLabel: document.getElementById("lesson-progress-label"),
    learnReadyDot: document.getElementById("learn-ready-dot"),
    marketList: document.getElementById("market-list"),
    basketValue: document.getElementById("basket-value"),
    basketCopy: document.getElementById("basket-copy"),
    sellAll: document.getElementById("sell-all-button"),
    projectList: document.getElementById("project-list"),
    milestoneName: document.getElementById("milestone-name"),
    milestoneCopy: document.getElementById("milestone-copy"),
    milestoneProgress: document.getElementById("milestone-progress"),
    milestoneLabel: document.getElementById("milestone-label"),
    buildingModal: document.getElementById("building-modal"),
    buildingModalContent: document.getElementById("building-modal-content"),
    settingsModal: document.getElementById("settings-modal"),
    settingsButton: document.getElementById("settings-button"),
    musicToggle: document.getElementById("music-toggle"),
    sfxToggle: document.getElementById("sfx-toggle"),
    motionToggle: document.getElementById("motion-toggle"),
    resetButton: document.getElementById("reset-button"),
    music: document.getElementById("music-player"),
    welcomeModal: document.getElementById("welcome-modal"),
    startButton: document.getElementById("start-button"),
    toastRegion: document.getElementById("toast-region"),
  };

  let selectedPlot = null;
  let lastTick = Date.now();
  let audioContext = null;
  let pendingTimers = [];
  let layoutMode = false;
  let layoutDrag = null;
  let whiteboardDrawing = null;
  let whiteboardTool = "pen";

  function initialState() {
    const now = Date.now();
    return {
      version: 5,
      coins: 24,
      seeds: 4,
      wood: 0,
      ore: 0,
      xp: 0,
      inventory: { carrot: 0, wheat: 0, pumpkin: 0, apple: 0 },
      plots: [
        null, null, null, null, null,
        { locked: true },
      ],
      buildings: { school: 0, market: 0, bakery: 0, library: 0 },
      construction: {},
      animals: { chickens: 0, cows: 0 },
      animalGrowth: {},
      districts: { compo: false },
      activeRegion: "coleytown",
      layout: {
        buildings: { school: { x: 42, y: 16 }, market: { x: 54, y: 53 }, bakery: { x: 68, y: 53 }, library: { x: 60, y: 18 } },
        animals: { chickens: { x: 8, y: 28 }, cows: { x: 23, y: 25 } },
        plots: [{ x: 7, y: 68 }, { x: 18, y: 69 }, { x: 29, y: 68 }, { x: 40, y: 69 }, { x: 13, y: 52 }, { x: 28, y: 51 }],
      },
      stats: { planted: 0, harvested: 0, sold: 0, earned: 0, answered: 0, correct: 0, chineseCorrect: 0 },
      subject: "math",
      streak: 0,
      lessonStep: 0,
      boostUntil: 0,
      lastSeen: now,
      welcomed: false,
      settings: { music: false, sfx: true, reduceMotion: false },
      question: null,
    };
  }

  function loadState() {
    const fresh = initialState();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return fresh;
      const merged = {
        ...fresh,
        ...saved,
        inventory: { ...fresh.inventory, ...(saved.inventory || {}) },
        buildings: { ...fresh.buildings, ...(saved.buildings || {}) },
        construction: { ...fresh.construction, ...(saved.construction || {}) },
        animals: { ...fresh.animals, ...(saved.animals || {}) },
        animalGrowth: { ...fresh.animalGrowth, ...(saved.animalGrowth || {}) },
        districts: { ...fresh.districts, ...(saved.districts || {}) },
        layout: {
          buildings: { ...fresh.layout.buildings, ...(saved.layout?.buildings || {}) },
          animals: { ...fresh.layout.animals, ...(saved.layout?.animals || {}) },
          plots: Array.isArray(saved.layout?.plots) ? saved.layout.plots : fresh.layout.plots,
        },
        stats: { ...fresh.stats, ...(saved.stats || {}) },
        settings: { ...fresh.settings, ...(saved.settings || {}) },
        plots: Array.isArray(saved.plots) ? saved.plots.slice(0, 6) : fresh.plots,
      };
      while (merged.plots.length < 6) merged.plots.push(null);
      applyOfflineProgress(merged);
      return merged;
    } catch (error) {
      console.warn("Idle Town save could not be loaded", error);
      return fresh;
    }
  }

  const state = loadState();

  function saveState() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (error) { console.warn("Save failed", error); }
  }

  function applyOfflineProgress(target) {
    const now = Date.now();
    const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, now - (target.lastSeen || now)));
    if (elapsed < 5_000) return;
    const earned = passiveRate(target) * elapsed / 1000;
    if (earned > 0) {
      target.coins += earned;
      target.stats.earned += earned;
      target.offlineEarned = earned;
      target.offlineTime = elapsed;
    }
  }

  function passiveRate(target = state) {
    return target.buildings.market * 0.25 + target.buildings.bakery * 0.15 + target.animals.chickens * 0.12 + target.animals.cows * 0.28;
  }

  function getCrop(id) { return CROPS.find((crop) => crop.id === id); }

  function getLevelInfo(xp = state.xp) {
    let index = 0;
    for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].xp) index = i;
    const current = LEVELS[index];
    const next = LEVELS[Math.min(index + 1, LEVELS.length - 1)];
    const capped = index === LEVELS.length - 1;
    const progress = capped ? 1 : (xp - current.xp) / (next.xp - current.xp);
    return { level: index + 1, current, next, progress: clamp(progress, 0, 1), capped };
  }

  function getTotalProduce() {
    return Object.values(state.inventory).reduce((sum, value) => sum + value, 0);
  }

  function isBoostActive() { return Date.now() < state.boostUntil; }

  function marketMultiplier() {
    return (isBoostActive() ? 2 : 1) * (1 + state.buildings.bakery * 0.15);
  }

  function learningReward() {
    if (state.subject === "math") {
      const amount = 2 + state.buildings.school + (state.streak >= 4 ? 1 : 0);
      return { type: "seeds", amount, label: `${amount} ${amount === 1 ? "seed" : "seeds"}` };
    }
    const oreTurn = state.stats.chineseCorrect % 3 === 2;
    if (oreTurn) {
      const amount = 1 + Math.floor(state.buildings.library / 2);
      return { type: "ore", amount, label: `${amount} ore` };
    }
    const amount = 2 + state.buildings.library;
    return { type: "wood", amount, label: `${amount} wood` };
  }

  function buildingCost(id) {
    const config = BUILDINGS[id];
    const level = state.buildings[id];
    return Math.round(config.baseCost * Math.pow(1.75, Math.max(0, level)));
  }

  function buildingMaterialCost(id) {
    const config = BUILDINGS[id];
    const multiplier = state.buildings[id] ? 1.6 : 1;
    return {
      wood: Math.ceil(config.materials.wood * multiplier),
      ore: Math.ceil(config.materials.ore * multiplier),
    };
  }

  function animalCost(id) {
    return Math.round(ANIMALS[id].baseCost * Math.pow(1.7, state.animals[id]));
  }

  function animalFeed(id) {
    return ANIMALS[id].feed[Math.min(state.animals[id], 2)] || {};
  }

  function feedLabel(feed) {
    return Object.entries(feed).map(([cropId, amount]) => `${amount} ${getCrop(cropId).name.toLowerCase()}`).join(" + ");
  }

  function hasFeed(feed) {
    return Object.entries(feed).every(([cropId, amount]) => (state.inventory[cropId] || 0) >= amount);
  }

  function consumeFeed(feed) {
    Object.entries(feed).forEach(([cropId, amount]) => { state.inventory[cropId] -= amount; });
  }

  const CROP_STATES = ["soil", "sprout", "young", "mature"];
  const BUILDING_STATES = ["foundation", "construction", "level-1", "level-2"];
  const ANIMAL_STATES = ["empty", "young", "adult", "full"];
  function cropAsset(crop, stage) { return `assets/art/living-world/crops/${crop.artKey}-${CROP_STATES[clamp(stage,0,3)]}.png`; }
  function buildingAsset(config, stage) { return `assets/art/living-world/buildings/${config.artKey}-${BUILDING_STATES[clamp(stage,0,3)]}.png`; }
  function animalAsset(config, stage) { return `assets/art/living-world/animals/${config.artKey}-${ANIMAL_STATES[clamp(stage,0,3)]}.png`; }

  function cropStage(plot, now = Date.now()) {
    if (!plot?.crop) return 0;
    const progress = clamp((now - plot.plantedAt) / (plot.readyAt - plot.plantedAt), 0, 1);
    if (progress >= 1) return 3;
    if (progress >= 0.55) return 2;
    return 1;
  }

  function developmentCount() {
    return Object.values(state.buildings).reduce((sum, level) => sum + level, 0) + Object.values(state.animals).reduce((sum, level) => sum + level, 0);
  }

  function riverTownComplete() {
    return Object.values(state.buildings).every((level) => level >= 2) && Object.values(state.animals).every((level) => level >= 3) && state.plots.every((plot) => !plot?.locked);
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function formatNumber(value) { return Math.floor(value).toLocaleString(); }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return minutes ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
  }

  function formatAway(ms) {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 60) return `${Math.max(1, minutes)} min`;
    return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function setView(view) {
    if (view !== "town" && layoutMode) setLayoutMode(false);
    dom.app.dataset.view = view;
    document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.viewTarget === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (view !== "farm") dom.seedDrawer.classList.remove("open");
    if (view === "learn" && !state.question) nextQuestion();
    if (view === "town") updateGuide();
    if (view === "farm") renderFarm();
    if (view === "market") renderMarket();
    if (view === "goals") renderGoals();
  }

  function renderHUD() {
    dom.coinCount.textContent = formatNumber(state.coins);
    dom.seedCount.textContent = formatNumber(state.seeds);
    dom.woodCount.textContent = formatNumber(state.wood);
    dom.oreCount.textContent = formatNumber(state.ore);
    const level = getLevelInfo();
    dom.levelName.textContent = level.current.name;
    dom.levelLabel.textContent = `Level ${level.level}`;
    dom.levelProgress.style.width = `${level.progress * 100}%`;
    dom.learnReadyDot.classList.toggle("visible", !isBoostActive());
    Object.keys(BUILDINGS).forEach((id) => {
      const element = document.getElementById(`${id}-level-map`);
      if (!element) return;
      const unlocked = BUILDINGS[id].unlock(state);
      const building = state.construction[id];
      element.textContent = building ? `${formatTime((building.completeAt - Date.now()) / 1000)} left` : unlocked ? (state.buildings[id] ? `Lv. ${state.buildings[id]}` : "Build") : "Locked";
      const button = document.querySelector(`[data-building="${id}"]`);
      button?.classList.toggle("locked-building", !unlocked);
      button?.classList.toggle("under-construction", Boolean(building));
    });
  }

  function renderWorld() {
    const now = Date.now();
    dom.worldArt.dataset.region = state.activeRegion;
    dom.regionButtons.forEach((button) => {
      const region = button.dataset.region;
      button.classList.toggle("active", region === state.activeRegion);
      button.disabled = region === "compo" && !state.districts.compo;
      if (region === "compo") button.textContent = state.districts.compo ? "Compo Coast" : "🔒 Compo Coast";
    });
    dom.layoutButton.innerHTML = layoutMode ? `<span>✓</span><b>Done arranging</b>` : `<span>✥</span><b>Arrange town</b>`;
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
    const cropMarkup = state.plots.map((plot, index) => {
      const locked = plot?.locked;
      const crop = plot?.crop ? getCrop(plot.crop) : CROPS[0];
      const stage = locked ? 0 : cropStage(plot, now);
      const ready = plot?.crop && plot.readyAt <= now;
      const label = locked ? "Locked field" : !plot ? "Empty field" : ready ? `${crop.name} ready!` : `${crop.name} · ${formatTime((plot.readyAt - now) / 1000)}`;
      const position = state.layout.plots[index] || { x: 8 + index * 10, y: 68 };
      return `<button class="world-crop ${ready ? "ready" : ""} ${locked ? "locked" : ""}" data-world-plot="${index}" type="button" aria-label="${escapeHtml(label)}" style="left:${position.x}%;top:${position.y}%;right:auto;bottom:auto"><img class="world-asset crop-image" src="${cropAsset(crop,stage)}" alt=""><span class="world-crop-label">${escapeHtml(label)}</span></button>`;
    }).join("");
    if (!layoutMode || !dom.worldCrops.children.length) dom.worldCrops.innerHTML = cropMarkup;

    Object.entries(BUILDINGS).forEach(([id, config]) => {
      const button = document.querySelector(`[data-building="${id}"]`);
      const sprite = button?.querySelector(".building-image");
      if (!sprite) return;
      const column = state.construction[id] ? 1 : state.buildings[id] <= 0 ? 0 : state.buildings[id] === 1 ? 2 : 3;
      sprite.src = buildingAsset(config, column);
      const position = state.layout.buildings[id];
      button.style.left = `${position.x}%`; button.style.top = `${position.y}%`; button.style.right = "auto"; button.style.bottom = "auto";
    });

    Object.entries(ANIMALS).forEach(([id, config]) => {
      const button = document.querySelector(`[data-animal="${id}"]`);
      const sprite = button?.querySelector(".animal-image");
      const level = clamp(state.animals[id], 0, 3);
      if (sprite) sprite.src = animalAsset(config, level);
      const position = state.layout.animals[id];
      button.style.left = `${position.x}%`; button.style.top = `${position.y}%`; button.style.right = "auto"; button.style.bottom = "auto";
      button?.classList.toggle("growing", Boolean(state.animalGrowth[id]));
    });
    dom.chickenLevelMap.textContent = state.animalGrowth.chickens ? `${formatTime((state.animalGrowth.chickens.completeAt - now) / 1000)} left` : ANIMALS.chickens.labels[state.animals.chickens];
    dom.cowLevelMap.textContent = state.animalGrowth.cows ? `${formatTime((state.animalGrowth.cows.completeAt - now) / 1000)} left` : ANIMALS.cows.labels[state.animals.cows];
    dom.worldProgressCopy.textContent = `${developmentCount()} town pieces built`;
  }

  function renderFarm() {
    const now = Date.now();
    const readyCount = state.plots.filter((plot) => plot?.crop && plot.readyAt <= now).length;
    dom.readyCountLabel.textContent = `${readyCount} ${readyCount === 1 ? "plot" : "plots"}`;
    dom.quickHarvest.classList.toggle("ready", readyCount > 0);
    dom.quickHarvest.disabled = readyCount === 0;

    dom.farmField.innerHTML = state.plots.map((plot, index) => {
      if (plot?.locked) {
        const unlockCost = 140;
        return `<button class="plot locked" data-plot="${index}" type="button" aria-label="Locked plot, unlock for ${unlockCost} coins"><span class="plot-state">Unlock · ${unlockCost} coins</span></button>`;
      }
      if (!plot) {
        return `<button class="plot empty" data-plot="${index}" type="button"><span class="plot-content"><span class="plot-number">${index + 1}</span><span class="empty-plus">+</span><span class="plot-state">Plant something</span></span></button>`;
      }
      const crop = getCrop(plot.crop);
      const total = plot.readyAt - plot.plantedAt;
      const progress = clamp((now - plot.plantedAt) / total, 0, 1);
      const ready = progress >= 1;
      const stage = cropStage(plot, now);
      const label = ready ? `Harvest ${crop.name}` : `${formatTime((plot.readyAt - now) / 1000)} left`;
      return `<button class="plot ${ready ? "ready" : "growing"}" data-plot="${index}" type="button" aria-label="${escapeHtml(label)}"><span class="plot-content"><span class="plot-number">${index + 1}</span><img class="plot-icon" src="${cropAsset(crop,stage)}" alt=""><span class="plot-state">${escapeHtml(label)}</span>${ready ? "" : `<span class="crop-progress"><span style="width:${progress * 100}%"></span></span>`}</span></button>`;
    }).join("");

    renderSeeds();
    renderBoost();
  }

  function renderSeeds() {
    const townLevel = getLevelInfo().level;
    dom.seedList.innerHTML = CROPS.map((crop) => {
      const levelLocked = townLevel < crop.level;
      const poor = state.seeds < crop.seedCost;
      const locked = levelLocked || poor;
      const note = levelLocked ? `Unlocks at town level ${crop.level}` : `${formatTime(crop.duration)} · yields ${crop.yield}`;
      return `<button class="seed-option" data-seed="${crop.id}" type="button" ${locked ? "disabled" : ""}><img class="seed-art" src="${cropAsset(crop,3)}" alt=""><span class="seed-copy"><strong>${crop.name}</strong><small>${note}</small></span><span class="seed-price">${crop.seedCost} ${crop.seedCost === 1 ? "seed" : "seeds"}<small>${crop.value} coins each</small></span></button>`;
    }).join("");
  }

  function renderBoost() {
    const active = isBoostActive();
    dom.focusBoost.classList.toggle("active", active);
    dom.boostLabel.textContent = active ? `${formatTime((state.boostUntil - Date.now()) / 1000)} remaining` : "Not active";
  }

  function selectPlot(index) {
    const plot = state.plots[index];
    if (plot?.locked) {
      const cost = 140;
      if (state.coins < cost) return toast(`You need ${cost - Math.floor(state.coins)} more coins to unlock this plot.`);
      state.coins -= cost;
      state.plots[index] = null;
      addXP(25);
      maybeUnlockCompo();
      playSfx("build");
      toast("A new garden plot is ready!");
      renderAll();
      saveState();
      return;
    }
    if (!plot) {
      selectedPlot = index;
      dom.seedDrawer.classList.add("open");
      if (window.innerWidth > 760) dom.seedDrawer.querySelector("button:not(:disabled)")?.focus();
      return;
    }
    if (plot.readyAt <= Date.now()) harvestPlot(index);
    else toast(`${getCrop(plot.crop).name} need ${formatTime((plot.readyAt - Date.now()) / 1000)} more.`);
  }

  function plantCrop(cropId) {
    if (selectedPlot === null || state.plots[selectedPlot]) return;
    const crop = getCrop(cropId);
    if (!crop || state.seeds < crop.seedCost || getLevelInfo().level < crop.level) return;
    const now = Date.now();
    state.seeds -= crop.seedCost;
    state.plots[selectedPlot] = { crop: crop.id, plantedAt: now, readyAt: now + crop.duration * 1000 };
    state.stats.planted += 1;
    addXP(3);
    playSfx("plant");
    toast(`${crop.name} planted — ready in ${formatTime(crop.duration)}.`);
    selectedPlot = null;
    dom.seedDrawer.classList.remove("open");
    renderAll();
    saveState();
  }

  function harvestPlot(index) {
    const plot = state.plots[index];
    if (!plot?.crop || plot.readyAt > Date.now()) return;
    const crop = getCrop(plot.crop);
    state.inventory[crop.id] += crop.yield;
    state.plots[index] = null;
    state.stats.harvested += crop.yield;
    addXP(6 + crop.level * 2);
    playSfx("harvest");
    toast(`Harvested ${crop.yield} ${crop.name.toLowerCase()}!`);
    renderAll();
    saveState();
  }

  function harvestAll() {
    const ready = state.plots.map((plot, index) => ({ plot, index })).filter(({ plot }) => plot?.crop && plot.readyAt <= Date.now());
    if (!ready.length) return;
    let total = 0;
    ready.forEach(({ plot, index }) => {
      const crop = getCrop(plot.crop);
      state.inventory[crop.id] += crop.yield;
      total += crop.yield;
      state.stats.harvested += crop.yield;
      state.xp += 6 + crop.level * 2;
      state.plots[index] = null;
    });
    playSfx("harvest");
    toast(`Harvest basket filled with ${total} crops!`);
    renderAll();
    saveState();
  }

  function renderMarket() {
    const multiplier = marketMultiplier();
    let totalValue = 0;
    dom.marketList.innerHTML = CROPS.map((crop) => {
      const count = state.inventory[crop.id] || 0;
      const unit = Math.round(crop.value * multiplier);
      totalValue += count * unit;
      return `<article class="market-item"><img class="market-art" src="${cropAsset(crop,3)}" alt=""><div class="market-item-copy"><strong>${crop.name}</strong><small>${count} in basket · ${unit} coins each</small><button data-sell="${crop.id}" type="button" ${count ? "" : "disabled"}>Sell ${count ? `all for ${count * unit}` : "when ready"}</button></div></article>`;
    }).join("");
    dom.basketValue.textContent = `${formatNumber(totalValue)} coins`;
    dom.basketCopy.textContent = totalValue ? `${getTotalProduce()} items ready for Main Street.` : "Harvest crops to stock the market stall.";
    dom.sellAll.disabled = totalValue <= 0;
  }

  function sellCrop(cropId) {
    const crop = getCrop(cropId);
    const count = state.inventory[cropId] || 0;
    if (!crop || !count) return;
    const earned = Math.round(count * crop.value * marketMultiplier());
    state.coins += earned;
    state.inventory[cropId] = 0;
    state.stats.sold += count;
    state.stats.earned += earned;
    addXP(Math.max(2, Math.floor(count / 2)));
    playSfx("coins");
    toast(`Main Street paid ${earned} coins for your ${crop.name.toLowerCase()}.`);
    renderAll();
    saveState();
  }

  function sellAll() {
    const totalBefore = getTotalProduce();
    if (!totalBefore) return;
    let earned = 0;
    CROPS.forEach((crop) => {
      const count = state.inventory[crop.id] || 0;
      earned += Math.round(count * crop.value * marketMultiplier());
      state.inventory[crop.id] = 0;
    });
    state.coins += earned;
    state.stats.sold += totalBefore;
    state.stats.earned += earned;
    addXP(Math.max(4, Math.floor(totalBefore / 2)));
    playSfx("coins");
    toast(`Sold the whole basket for ${earned} coins!`);
    renderAll();
    saveState();
  }

  function generateMathQuestion() {
    const level = Math.min(4, Math.max(1, Math.ceil(state.stats.correct / 4) + 1));
    const type = Math.floor(Math.random() * 5);
    let prompt, answer, skill, distractors;
    if (type === 0) {
      const denominator = [4, 5, 8, 10][Math.floor(Math.random() * 4)];
      const numerator = Math.ceil(Math.random() * (denominator - 1));
      const factor = 2 + Math.floor(Math.random() * (5 + level));
      answer = numerator * factor;
      prompt = `What is ${numerator}/${denominator} of ${denominator * factor}?`;
      skill = "Fractions";
      distractors = [answer + numerator, answer - numerator, factor * denominator];
    } else if (type === 1) {
      const price = 4 + Math.floor(Math.random() * 12);
      const count = 3 + Math.floor(Math.random() * 8);
      answer = price * count;
      prompt = `${count} market baskets cost ${price} coins each. What is the total?`;
      skill = "Multiplication";
      distractors = [answer + price, answer - count, price + count];
    } else if (type === 2) {
      const divisor = 3 + Math.floor(Math.random() * 9);
      answer = 4 + Math.floor(Math.random() * 12);
      const total = divisor * answer;
      prompt = `${total} apples are shared equally among ${divisor} tables. How many per table?`;
      skill = "Division";
      distractors = [answer + 1, answer - 1, divisor];
    } else if (type === 3) {
      const whole = 50 * (2 + Math.floor(Math.random() * 8));
      const percent = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
      answer = whole * percent / 100;
      prompt = `What is ${percent}% of ${whole}?`;
      skill = "Percents";
      distractors = [whole / percent, answer + 10, whole - answer];
    } else {
      const length = 4 + Math.floor(Math.random() * 10);
      const width = 3 + Math.floor(Math.random() * 8);
      answer = length * width;
      prompt = `A garden is ${length} feet by ${width} feet. What is its area?`;
      skill = "Geometry";
      distractors = [2 * (length + width), length + width, answer + width];
    }
    const unique = [...new Set([answer, ...distractors].filter((value) => value >= 0))];
    while (unique.length < 4) unique.push(answer + unique.length + 2);
    return { subject: "math", prompt, hint: "Choose the best answer.", skill, answer: String(answer), choices: shuffle(unique.slice(0, 4).map(String)) };
  }

  function generateChineseQuestion() {
    const word = CHINESE[Math.floor(Math.random() * CHINESE.length)];
    return {
      subject: "chinese",
      prompt: `What does “${word.hanzi}” mean?`,
      hint: word.pinyin,
      skill: "Intro Chinese",
      answer: word.answer,
      choices: shuffle([word.answer, ...word.distractors]),
    };
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function nextQuestion() {
    state.question = state.subject === "math" ? generateMathQuestion() : generateChineseQuestion();
    dom.lessonFeedback.textContent = "";
    dom.lessonFeedback.className = "lesson-feedback";
    renderLesson();
    saveState();
  }

  function renderLesson() {
    if (!state.question) return;
    const question = state.question;
    dom.questionSkill.textContent = question.skill;
    dom.questionReward.textContent = `+${learningReward().label} · 2× market`;
    dom.questionPrompt.textContent = question.prompt;
    dom.questionHint.textContent = question.hint;
    dom.answerGrid.innerHTML = question.choices.map((choice, index) => `<button class="answer-button" data-answer="${escapeHtml(choice)}" type="button"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(choice)}</button>`).join("");
    dom.streakCount.textContent = `${state.streak} correct`;
    const step = state.lessonStep % 3;
    dom.lessonProgressBar.style.width = `${step / 3 * 100}%`;
    dom.lessonProgressLabel.textContent = `${step} / 3 for bonus crate`;
    document.querySelectorAll(".lesson-tab").forEach((tab) => {
      const active = tab.dataset.subject === state.subject;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  function answerQuestion(choice, button) {
    if (!state.question || dom.answerGrid.dataset.locked === "true") return;
    dom.answerGrid.dataset.locked = "true";
    state.stats.answered += 1;
    const correct = choice === state.question.answer;
    dom.answerGrid.querySelectorAll("button").forEach((answerButton) => {
      answerButton.disabled = true;
      if (answerButton.dataset.answer === state.question.answer) answerButton.classList.add("correct");
    });
    if (correct) {
      const reward = learningReward();
      state.streak += 1;
      state.stats.correct += 1;
      state.lessonStep += 1;
      state[reward.type] += reward.amount;
      if (state.subject === "chinese") state.stats.chineseCorrect += 1;
      state.boostUntil = Math.max(Date.now(), state.boostUntil) + 5 * 60 * 1000;
      addXP(15);
      let message = `Correct — +${reward.label} and five minutes added to 2× market value!`;
      if (state.lessonStep % 3 === 0) {
        if (state.subject === "math") {
          state.seeds += 2;
          message = `Supply crate! +${reward.label} plus 2 bonus seeds.`;
        } else {
          state.wood += 2;
          state.ore += 1;
          message = `Builder crate! +${reward.label}, 2 bonus wood, and 1 ore.`;
        }
      }
      dom.lessonFeedback.textContent = message;
      playSfx("correct");
    } else {
      state.streak = 0;
      button.classList.add("wrong");
      dom.lessonFeedback.textContent = `Not quite. The answer is ${state.question.answer}. A new one is coming up.`;
      dom.lessonFeedback.classList.add("error");
      playSfx("wrong");
    }
    renderHUD();
    renderBoost();
    renderMarket();
    renderLessonProgressOnly();
    saveState();
    pendingTimers.push(window.setTimeout(() => {
      dom.answerGrid.dataset.locked = "false";
      nextQuestion();
    }, correct ? 950 : 1350));
  }

  function renderLessonProgressOnly() {
    dom.streakCount.textContent = `${state.streak} correct`;
    const step = state.lessonStep % 3;
    dom.lessonProgressBar.style.width = `${step / 3 * 100}%`;
    dom.lessonProgressLabel.textContent = `${step} / 3 for bonus crate`;
  }

  function renderGoals() {
    const projects = Object.entries(BUILDINGS).map(([id, config]) => {
      const level = state.buildings[id];
      const unlocked = config.unlock(state);
      const cost = buildingCost(id);
      const materials = buildingMaterialCost(id);
      const building = state.construction[id];
      const canAfford = state.coins >= cost && state.wood >= materials.wood && state.ore >= materials.ore && !building && level < 2;
      const icon = { school: "✎", market: "⚖", bakery: "♨", library: "▤" }[id];
      const action = building ? `Building · ${formatTime((building.completeAt - Date.now()) / 1000)}` : !unlocked ? "Locked" : level >= 2 ? "Complete" : level ? `Upgrade to level ${level + 1}` : "Build it";
      const requirement = id === "bakery" ? "Reach town level 2" : id === "library" ? "Upgrade the schoolhouse" : "";
      const progress = Math.min(state.coins / cost, state.wood / materials.wood, state.ore / materials.ore, 1) * 100;
      return `<article class="project-card ${building ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${icon}</span><div class="project-copy"><h3>${config.name}</h3><p>${building ? "The construction crew is changing the map right now." : unlocked ? config.effect(Math.max(1, level)) : requirement}</p><div class="project-progress"><span style="width:${unlocked ? progress : 0}%"></span></div></div><div class="project-action"><small>${unlocked ? `${cost} coins · ${materials.wood} wood · ${materials.ore} ore` : requirement}</small><button data-project="${id}" type="button" ${unlocked && canAfford ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const animalProjects = Object.entries(ANIMALS).map(([id, config]) => {
      const level = state.animals[id];
      const cost = animalCost(id);
      const feed = animalFeed(id);
      const growth = state.animalGrowth[id];
      const action = growth ? `Growing · ${formatTime((growth.completeAt - Date.now()) / 1000)}` : level >= 3 ? "Habitat full" : level ? "Grow the herd" : "Open habitat";
      const feedProgress = Object.entries(feed).reduce((minimum, [cropId, amount]) => Math.min(minimum, (state.inventory[cropId] || 0) / amount), 1);
      return `<article class="project-card ${growth ? "project-building" : ""}"><span class="project-icon" aria-hidden="true">${id === "chickens" ? "🐣" : "🐄"}</span><div class="project-copy"><h3>${config.name}</h3><p>${growth ? "New animals are settling in. Watch the habitat on the town map." : level ? config.effect(level) : "Build the habitat, then feed the first animals from your harvest."}</p><div class="project-progress"><span style="width:${Math.min(1,state.coins/cost,feedProgress)*100}%"></span></div></div><div class="project-action"><small>${level >= 3 ? "Complete" : `${cost} coins · ${feedLabel(feed)}`}</small><button data-animal-project="${id}" type="button" ${state.coins >= cost && hasFeed(feed) && level < 3 && !growth ? "" : "disabled"}>${action}</button></div></article>`;
    });
    const completedPieces = Object.values(state.buildings).filter((level) => level >= 2).length + Object.values(state.animals).filter((level) => level >= 3).length + (state.plots.every((plot) => !plot?.locked) ? 1 : 0);
    const coastProgress = completedPieces / 7 * 100;
    const coastProject = `<article class="project-card expansion-project"><span class="project-icon" aria-hidden="true">☀</span><div class="project-copy"><h3>Open Compo Coast</h3><p>${state.districts.compo ? "Unlocked — switch regions on the town map to visit the coast." : "Finish all River Town buildings, habitats, and garden plots to open a whole new seaside screen."}</p><div class="project-progress"><span style="width:${state.districts.compo ? 100 : coastProgress}%"></span></div></div><div class="project-action"><small>${state.districts.compo ? "Coast unlocked" : `${completedPieces} / 7 town goals`}</small><button data-open-region="compo" type="button" ${state.districts.compo ? "" : "disabled"}>${state.districts.compo ? "Visit coast" : "Keep building"}</button></div></article>`;
    const roadmap = `<article class="roadmap-card"><small>Long-term world map</small><h3>Farm town → modern Westport</h3><div class="roadmap-line">${WESTPORT_ROADMAP.map((stop,index)=>`<span class="roadmap-stop ${index === 0 ? "complete" : index === 1 && state.districts.compo ? "complete" : stop.status}"><i>${index+1}</i><b>${stop.name}</b><small>${stop.detail}</small></span>`).join("")}</div></article>`;
    dom.projectList.innerHTML = [...projects, ...animalProjects, coastProject, roadmap].join("");
    const level = getLevelInfo();
    dom.milestoneName.textContent = level.capped ? "A thriving Coleytown" : level.next.name;
    dom.milestoneCopy.textContent = level.capped ? "You’ve reached the current town milestone. Keep growing!" : "Earn town XP by planting, harvesting, learning, and building.";
    dom.milestoneProgress.style.width = `${level.progress * 100}%`;
    dom.milestoneLabel.textContent = level.capped ? `${formatNumber(state.xp)} XP` : `${formatNumber(state.xp - level.current.xp)} / ${formatNumber(level.next.xp - level.current.xp)} XP`;
  }

  function openBuilding(id) {
    const config = BUILDINGS[id];
    if (!config) return;
    const level = state.buildings[id];
    const unlocked = config.unlock(state);
    const cost = buildingCost(id);
    const materials = buildingMaterialCost(id);
    const building = state.construction[id];
    const column = building ? 1 : level <= 0 ? 0 : level === 1 ? 2 : 3;
    const canAfford = state.coins >= cost && state.wood >= materials.wood && state.ore >= materials.ore;
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${buildingAsset(config,column)}" alt=""></div><small>${building ? "Construction in progress" : level ? `Town building · Level ${level}` : "New town project"}</small><h2>${config.name}</h2><p class="building-description">${building ? `Watch the structure rise on the town map. About ${formatTime((building.completeAt-Date.now())/1000)} remain.` : config.description}</p><div class="building-stats"><div class="building-stat"><small>Current benefit</small><strong>${level ? config.effect(level) : "Not built yet"}</strong></div><div class="building-stat"><small>${level >= 2 ? "Visual state" : "Next benefit"}</small><strong>${level >= 2 ? "Fully developed" : config.effect(level + 1)}</strong></div></div><div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to town</button><button class="primary-button" data-upgrade="${id}" type="button" ${unlocked && canAfford && !building && level < 2 ? "" : "disabled"}>${building ? "Under construction" : level >= 2 ? "Building complete" : unlocked ? `${level ? "Upgrade" : "Build"} · ${cost} coins + ${materials.wood} wood + ${materials.ore} ore` : "Project locked"}</button></div>`;
    dom.buildingModal.showModal();
  }

  function upgradeBuilding(id) {
    const config = BUILDINGS[id];
    if (!config || !config.unlock(state) || state.buildings[id] >= 2) return;
    const cost = buildingCost(id);
    const materials = buildingMaterialCost(id);
    if (state.coins < cost || state.wood < materials.wood || state.ore < materials.ore || state.construction[id]) return;
    state.coins -= cost;
    state.wood -= materials.wood;
    state.ore -= materials.ore;
    state.construction[id] = { targetLevel: state.buildings[id] + 1, completeAt: Date.now() + 12_000 };
    playSfx("build");
    dom.buildingModal.close();
    toast(`${config.short} construction has started — watch the map!`);
    renderAll();
    saveState();
  }

  function openAnimal(id) {
    const config = ANIMALS[id];
    if (!config) return;
    const level = state.animals[id];
    const cost = animalCost(id);
    const feed = animalFeed(id);
    const growth = state.animalGrowth[id];
    dom.buildingModalContent.innerHTML = `<div class="building-hero"><img class="modal-asset" src="${animalAsset(config,level)}" alt=""></div><small>${growth ? "New arrivals on the way" : "Living farm habitat"}</small><h2>${config.name}</h2><p class="building-description">${growth ? `The habitat will visibly fill in ${formatTime((growth.completeAt-Date.now())/1000)}.` : "Grow the population by paying for the habitat and feeding animals from your own harvest."}</p><div class="building-stats"><div class="building-stat"><small>Now</small><strong>${config.labels[level]}</strong></div><div class="building-stat"><small>Feed needed</small><strong>${level >= 3 ? "Habitat complete" : feedLabel(feed)}</strong></div></div><div class="building-actions"><button class="secondary-button" data-close-modal type="button">Back to town</button><button class="primary-button" data-grow-animal="${id}" type="button" ${state.coins >= cost && hasFeed(feed) && level < 3 && !growth ? "" : "disabled"}>${growth ? "Animals growing" : level >= 3 ? "Habitat complete" : `Add animals · ${cost} coins + feed`}</button></div>`;
    dom.buildingModal.showModal();
  }

  function growAnimal(id) {
    const level = state.animals[id];
    const cost = animalCost(id);
    const feed = animalFeed(id);
    if (level >= 3 || state.coins < cost || !hasFeed(feed) || state.animalGrowth[id]) return;
    state.coins -= cost;
    consumeFeed(feed);
    state.animalGrowth[id] = { targetLevel: level + 1, completeAt: Date.now() + 9_000 };
    dom.buildingModal.close();
    playSfx("build");
    toast(`New ${id} are arriving — watch the habitat change!`);
    renderAll(); saveState();
  }

  function maybeUnlockCompo() {
    if (state.districts.compo || !riverTownComplete()) return;
    state.districts.compo = true;
    addXP(100);
    playSfx("build");
    toast("Compo Coast unlocked — a whole new shoreline is ready!");
    saveState();
  }

  function setRegion(region) {
    if (region === "compo" && !state.districts.compo) {
      toast("Finish every River Town building, habitat, and garden plot to open Compo Coast.");
      return;
    }
    if (!['coleytown', 'compo'].includes(region)) return;
    setLayoutMode(false);
    state.activeRegion = region;
    renderWorld();
    updateGuide();
    saveState();
  }

  function finalizeProgress(now = Date.now()) {
    Object.entries(state.construction).forEach(([id, build]) => {
      if (build.completeAt > now) return;
      state.buildings[id] = build.targetLevel; delete state.construction[id];
      addXP(40 + state.buildings[id] * 10); playSfx("build"); toast(`${BUILDINGS[id].short} is complete — the town has changed!`);
    });
    Object.entries(state.animalGrowth).forEach(([id, growth]) => {
      if (growth.completeAt > now) return;
      state.animals[id] = growth.targetLevel; delete state.animalGrowth[id];
      addXP(20 + state.animals[id] * 6); playSfx("harvest"); toast(`${ANIMALS[id].labels[state.animals[id]]} now live in Coleytown!`);
    });
    maybeUnlockCompo();
  }

  function addXP(amount) {
    const before = getLevelInfo().level;
    state.xp += amount;
    const after = getLevelInfo().level;
    if (after > before) pendingTimers.push(window.setTimeout(() => toast(`Town level up — welcome to ${getLevelInfo().current.name}!`), 150));
  }

  function updateGuide() {
    if (state.activeRegion === "compo") {
      dom.guideTitle.textContent = "Compo Coast is the next chapter.";
      dom.guideCopy.textContent = "This separate shoreline is ready for future beach, recreation, and neighborhood buildings—without crowding River Town.";
      dom.guideAction.firstChild.textContent = "Return to River Town ";
      dom.guideAction.dataset.destination = "town";
      return;
    }
    const ready = state.plots.filter((plot) => plot?.crop && plot.readyAt <= Date.now()).length;
    const activeBuild = Object.keys(state.construction)[0];
    if (activeBuild) {
      dom.guideTitle.textContent = `${BUILDINGS[activeBuild].short} is taking shape!`;
      dom.guideCopy.textContent = "Stay on the town map and watch the foundation become a finished building.";
      dom.guideAction.firstChild.textContent = "View construction ";
      dom.guideAction.dataset.destination = "town";
    } else if (ready) {
      dom.guideTitle.textContent = `${ready} crop ${ready === 1 ? "is" : "are"} ready!`;
      dom.guideCopy.textContent = "The harvest is waiting at Old Hill Farm. Gather it, then trade it on Main Street.";
      dom.guideAction.firstChild.textContent = "Harvest now ";
      dom.guideAction.dataset.destination = "farm";
    } else if (getTotalProduce()) {
      dom.guideTitle.textContent = "The market is bustling.";
      dom.guideCopy.textContent = "Sell your harvest for the coins used by every building and animal project.";
      dom.guideAction.firstChild.textContent = "Visit the market ";
      dom.guideAction.dataset.destination = "market";
    } else if (!state.plots.some((plot) => plot?.crop) && state.seeds > 0) {
      dom.guideTitle.textContent = "Plant the first field.";
      dom.guideCopy.textContent = `You have ${state.seeds} starter seeds—enough to begin before doing a lesson.`;
      dom.guideAction.firstChild.textContent = "Choose a crop ";
      dom.guideAction.dataset.destination = "farm";
    } else if (state.seeds < 2) {
      dom.guideTitle.textContent = "Math grows new seeds.";
      dom.guideCopy.textContent = "Answer a short grade 5–6 problem to refill the seed basket and keep the farm moving.";
      dom.guideAction.firstChild.textContent = "Try a challenge ";
      dom.guideAction.dataset.destination = "learn";
    } else if (state.wood < 4 || state.ore < 1) {
      dom.guideTitle.textContent = "Chinese supplies the builders.";
      dom.guideCopy.textContent = "Intro Chinese answers earn wood and ore for the schoolhouse, market, and every future project.";
      dom.guideAction.firstChild.textContent = "Earn materials ";
      dom.guideAction.dataset.destination = "learn";
    } else {
      dom.guideTitle.textContent = "The fields are waking up!";
      dom.guideCopy.textContent = "Plant a few crops, then visit the market to turn your harvest into your first town improvements.";
      dom.guideAction.firstChild.textContent = "Visit the farm ";
      dom.guideAction.dataset.destination = "farm";
    }
  }

  function renderAll() {
    renderHUD();
    renderWorld();
    renderFarm();
    renderMarket();
    renderGoals();
    if (state.question) {
      dom.questionReward.textContent = `+${learningReward().label} · 2× market`;
      renderLessonProgressOnly();
    }
    if (dom.app.dataset.view === "town") updateGuide();
  }

  function setLayoutMode(enabled) {
    layoutMode = Boolean(enabled) && state.activeRegion === "coleytown";
    layoutDrag = null;
    dom.worldArt.classList.toggle("layout-mode", layoutMode);
    dom.layoutButton.setAttribute("aria-pressed", String(layoutMode));
    renderWorld();
  }

  function layoutTarget(element) {
    const draggable = element.closest("[data-building], [data-animal], [data-world-plot]");
    if (!draggable || !dom.worldArt.contains(draggable)) return null;
    if (draggable.dataset.building) return { kind: "buildings", key: draggable.dataset.building, element: draggable };
    if (draggable.dataset.animal) return { kind: "animals", key: draggable.dataset.animal, element: draggable };
    return { kind: "plots", key: Number(draggable.dataset.worldPlot), element: draggable };
  }

  function beginLayoutDrag(event) {
    if (!layoutMode || event.button !== 0) return;
    const target = layoutTarget(event.target);
    if (!target) return;
    const elementRect = target.element.getBoundingClientRect();
    layoutDrag = {
      ...target,
      pointerId: event.pointerId,
      offsetX: event.clientX - elementRect.left,
      offsetY: event.clientY - elementRect.top,
    };
    dom.worldArt.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveLayoutDrag(event) {
    if (!layoutDrag || event.pointerId !== layoutDrag.pointerId) return;
    const worldRect = dom.worldArt.getBoundingClientRect();
    const elementRect = layoutDrag.element.getBoundingClientRect();
    const maxX = Math.max(0, 100 - elementRect.width / worldRect.width * 100);
    const maxY = Math.max(0, 100 - elementRect.height / worldRect.height * 100);
    const x = clamp((event.clientX - worldRect.left - layoutDrag.offsetX) / worldRect.width * 100, 0, maxX);
    const y = clamp((event.clientY - worldRect.top - layoutDrag.offsetY) / worldRect.height * 100, 4, maxY);
    const position = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    if (layoutDrag.kind === "plots") state.layout.plots[layoutDrag.key] = position;
    else state.layout[layoutDrag.kind][layoutDrag.key] = position;
    layoutDrag.element.style.left = `${position.x}%`;
    layoutDrag.element.style.top = `${position.y}%`;
    layoutDrag.element.style.right = "auto";
    layoutDrag.element.style.bottom = "auto";
    event.preventDefault();
  }

  function finishLayoutDrag(event) {
    if (!layoutDrag || event.pointerId !== layoutDrag.pointerId) return;
    dom.worldArt.releasePointerCapture?.(event.pointerId);
    layoutDrag = null;
    saveState();
  }

  function setWhiteboardTool(tool) {
    whiteboardTool = tool === "eraser" ? "eraser" : "pen";
    const penActive = whiteboardTool === "pen";
    dom.whiteboardPen.classList.toggle("active", penActive);
    dom.whiteboardEraser.classList.toggle("active", !penActive);
    dom.whiteboardPen.setAttribute("aria-pressed", String(penActive));
    dom.whiteboardEraser.setAttribute("aria-pressed", String(!penActive));
    dom.whiteboardCanvas.classList.toggle("eraser", !penActive);
  }

  function whiteboardPoint(event) {
    const rect = dom.whiteboardCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * dom.whiteboardCanvas.width / rect.width,
      y: (event.clientY - rect.top) * dom.whiteboardCanvas.height / rect.height,
    };
  }

  function beginWhiteboardStroke(event) {
    if (event.button !== 0) return;
    whiteboardDrawing = { pointerId: event.pointerId, point: whiteboardPoint(event) };
    dom.whiteboardCanvas.setPointerCapture?.(event.pointerId);
    const context = dom.whiteboardCanvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = whiteboardTool === "eraser" ? "destination-out" : "source-over";
    context.fillStyle = whiteboardTool === "eraser" ? "rgba(0,0,0,1)" : "#294f3a";
    context.beginPath();
    context.arc(whiteboardDrawing.point.x, whiteboardDrawing.point.y, whiteboardTool === "eraser" ? 13 : 2.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
    event.preventDefault();
  }

  function moveWhiteboardStroke(event) {
    if (!whiteboardDrawing || event.pointerId !== whiteboardDrawing.pointerId) return;
    const next = whiteboardPoint(event);
    const context = dom.whiteboardCanvas.getContext("2d");
    context.save();
    context.globalCompositeOperation = whiteboardTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = whiteboardTool === "eraser" ? "rgba(0,0,0,1)" : "#294f3a";
    context.lineWidth = whiteboardTool === "eraser" ? 26 : 4.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(whiteboardDrawing.point.x, whiteboardDrawing.point.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    context.restore();
    whiteboardDrawing.point = next;
    event.preventDefault();
  }

  function finishWhiteboardStroke(event) {
    if (!whiteboardDrawing || event.pointerId !== whiteboardDrawing.pointerId) return;
    dom.whiteboardCanvas.releasePointerCapture?.(event.pointerId);
    whiteboardDrawing = null;
  }

  function clearWhiteboard() {
    dom.whiteboardCanvas.getContext("2d").clearRect(0, 0, dom.whiteboardCanvas.width, dom.whiteboardCanvas.height);
  }

  function toast(message) {
    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    dom.toastRegion.appendChild(element);
    window.setTimeout(() => element.remove(), 2800);
  }

  function playSfx(type) {
    if (!state.settings.sfx) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const presets = {
        plant: [320, 430, 0.08], harvest: [520, 760, 0.12], coins: [640, 920, 0.13],
        correct: [550, 880, 0.16], wrong: [260, 190, 0.12], build: [360, 610, 0.18],
      };
      const [from, to, duration] = presets[type] || presets.plant;
      oscillator.type = type === "wrong" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration + 0.02);
    } catch (error) { /* audio is optional */ }
  }

  function toggleMusic(enabled) {
    state.settings.music = enabled;
    if (enabled) dom.music.play().catch(() => { dom.musicToggle.checked = false; state.settings.music = false; });
    else dom.music.pause();
    saveState();
  }

  function tick() {
    const now = Date.now();
    const elapsed = Math.min(2, (now - lastTick) / 1000);
    lastTick = now;
    const earned = passiveRate() * elapsed;
    if (earned > 0) { state.coins += earned; state.stats.earned += earned; }
    finalizeProgress(now);
    renderHUD();
    renderWorld();
    renderFarm();
    renderMarket();
    if (dom.app.dataset.view === "goals") renderGoals();
    if (dom.app.dataset.view === "town") updateGuide();
  }

  function bindEvents() {
    document.querySelectorAll("[data-view-target], [data-open-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewTarget || button.dataset.openView)));
    document.getElementById("brand-button").addEventListener("click", () => setView("town"));
    dom.guideAction.addEventListener("click", () => {
      if (state.activeRegion === "compo") setRegion("coleytown");
      else setView(dom.guideAction.dataset.destination || "farm");
    });
    dom.townCardClose.addEventListener("click", () => dom.townCard.classList.add("hidden"));
    dom.quickHarvest.addEventListener("click", () => { harvestAll(); setView("farm"); });
    dom.quickBuild.addEventListener("click", () => setView("goals"));
    dom.worldCrops.addEventListener("click", (event) => {
      if (layoutMode) return;
      const plotButton = event.target.closest("[data-world-plot]");
      if (!plotButton) return;
      const index = Number(plotButton.dataset.worldPlot);
      const plot = state.plots[index];
      if (plot?.crop && plot.readyAt <= Date.now()) harvestPlot(index);
      else { setView("farm"); selectPlot(index); }
    });
    document.querySelectorAll("[data-animal]").forEach((habitat) => habitat.addEventListener("click", () => { if (!layoutMode) openAnimal(habitat.dataset.animal); }));
    dom.regionButtons.forEach((button) => button.addEventListener("click", () => setRegion(button.dataset.region)));
    dom.layoutButton.addEventListener("click", () => setLayoutMode(!layoutMode));
    dom.worldArt.addEventListener("pointerdown", beginLayoutDrag);
    dom.worldArt.addEventListener("pointermove", moveLayoutDrag);
    dom.worldArt.addEventListener("pointerup", finishLayoutDrag);
    dom.worldArt.addEventListener("pointercancel", finishLayoutDrag);
    dom.farmField.addEventListener("click", (event) => {
      const plot = event.target.closest("[data-plot]");
      if (plot) selectPlot(Number(plot.dataset.plot));
    });
    dom.seedList.addEventListener("click", (event) => {
      const seed = event.target.closest("[data-seed]");
      if (seed) plantCrop(seed.dataset.seed);
    });
    dom.seedClose.addEventListener("click", () => { selectedPlot = null; dom.seedDrawer.classList.remove("open"); });
    document.querySelectorAll(".lesson-tab").forEach((tab) => tab.addEventListener("click", () => {
      state.subject = tab.dataset.subject;
      state.streak = 0;
      pendingTimers.forEach(clearTimeout); pendingTimers = [];
      dom.answerGrid.dataset.locked = "false";
      nextQuestion();
    }));
    dom.whiteboardToggle.addEventListener("click", () => {
      const show = !dom.workBoard.classList.contains("show");
      dom.workBoard.classList.toggle("show", show);
      dom.whiteboardToggle.setAttribute("aria-expanded", String(show));
      dom.whiteboardToggle.textContent = show ? "Hide whiteboard" : "Open whiteboard";
    });
    dom.whiteboardPen.addEventListener("click", () => setWhiteboardTool("pen"));
    dom.whiteboardEraser.addEventListener("click", () => setWhiteboardTool("eraser"));
    dom.whiteboardClear.addEventListener("click", clearWhiteboard);
    dom.whiteboardCanvas.addEventListener("pointerdown", beginWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointermove", moveWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointerup", finishWhiteboardStroke);
    dom.whiteboardCanvas.addEventListener("pointercancel", finishWhiteboardStroke);
    dom.answerGrid.addEventListener("click", (event) => {
      const answer = event.target.closest("[data-answer]");
      if (answer) answerQuestion(answer.dataset.answer, answer);
    });
    dom.marketList.addEventListener("click", (event) => {
      const sell = event.target.closest("[data-sell]");
      if (sell) sellCrop(sell.dataset.sell);
    });
    dom.sellAll.addEventListener("click", sellAll);
    dom.projectList.addEventListener("click", (event) => {
      const project = event.target.closest("[data-project]");
      if (project) openBuilding(project.dataset.project);
      const animalProject = event.target.closest("[data-animal-project]");
      if (animalProject) openAnimal(animalProject.dataset.animalProject);
      const region = event.target.closest("[data-open-region]");
      if (region) { setView("town"); setRegion(region.dataset.openRegion); }
    });
    document.querySelectorAll("[data-building]").forEach((building) => building.addEventListener("click", () => { if (!layoutMode) openBuilding(building.dataset.building); }));
    dom.buildingModal.addEventListener("click", (event) => {
      const upgrade = event.target.closest("[data-upgrade]");
      if (upgrade) upgradeBuilding(upgrade.dataset.upgrade);
      const grow = event.target.closest("[data-grow-animal]");
      if (grow) growAnimal(grow.dataset.growAnimal);
    });
    dom.settingsButton.addEventListener("click", () => dom.settingsModal.showModal());
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) event.target.closest("dialog")?.close();
    });
    [dom.buildingModal, dom.settingsModal].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
    dom.musicToggle.addEventListener("change", () => toggleMusic(dom.musicToggle.checked));
    dom.sfxToggle.addEventListener("change", () => { state.settings.sfx = dom.sfxToggle.checked; saveState(); playSfx("correct"); });
    dom.motionToggle.addEventListener("change", () => { state.settings.reduceMotion = dom.motionToggle.checked; dom.app.classList.toggle("reduce-motion", state.settings.reduceMotion); saveState(); });
    dom.resetButton.addEventListener("click", () => {
      if (!window.confirm("Reset Coleytown and erase the local save?")) return;
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    });
    dom.startButton.addEventListener("click", () => {
      state.welcomed = true;
      dom.welcomeModal.close();
      saveState();
      toast("The meadow is empty—use your four starter seeds to plant the first field!");
    });
    document.addEventListener("keydown", (event) => {
      if (event.target.closest("dialog, input, button") || event.metaKey || event.ctrlKey || event.altKey) return;
      const views = ["town", "farm", "learn", "market", "goals"];
      const index = Number(event.key) - 1;
      if (views[index]) setView(views[index]);
      if (event.key === " " && dom.app.dataset.view === "farm") { event.preventDefault(); harvestAll(); }
    });
    window.addEventListener("beforeunload", saveState);
    document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); else { lastTick = Date.now(); renderAll(); } });
  }

  function initialize() {
    dom.app.dataset.view = "town";
    dom.musicToggle.checked = state.settings.music;
    dom.sfxToggle.checked = state.settings.sfx;
    dom.motionToggle.checked = state.settings.reduceMotion;
    dom.app.classList.toggle("reduce-motion", state.settings.reduceMotion);
    state.question ||= state.subject === "math" ? generateMathQuestion() : generateChineseQuestion();
    bindEvents();
    renderAll();
    renderLesson();
    if (!state.welcomed) dom.welcomeModal.showModal();
    if (state.offlineEarned) {
      window.setTimeout(() => toast(`While away for ${formatAway(state.offlineTime)}, Coleytown earned ${formatNumber(state.offlineEarned)} coins.`), state.welcomed ? 300 : 1200);
      delete state.offlineEarned; delete state.offlineTime;
    }
    if (state.settings.music) toggleMusic(true);
    window.setInterval(tick, TICK_MS);
    window.setInterval(saveState, 5_000);
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  initialize();
})();
