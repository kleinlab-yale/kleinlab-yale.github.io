const SAVE_KEY = "kaylatown-pwa-save-v2";
const SAVE_INTERVAL_MS = 5000;
const TICK_MS = 250;
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

const BUILDINGS = [
  {
    id: "plot",
    name: "Berry Plot",
    art: "field",
    baseCost: { coins: 18, food: 0 },
    growth: 1.18,
    startsWith: 2,
    description: "Small garden beds that keep the farm producing all day.",
    unlock: () => true,
    effectText: () => "+0.8 food each second",
  },
  {
    id: "orchard",
    name: "Orchard Grove",
    art: "tree",
    baseCost: { coins: 56, food: 16 },
    growth: 1.19,
    startsWith: 0,
    description: "Fruit trees add stronger long-term farm output.",
    unlock: (state) => state.buildings.plot >= 3 || state.resources.coins >= 45,
    effectText: () => "+2.6 food each second",
  },
  {
    id: "cottage",
    name: "Cozy Cottage",
    art: "house",
    baseCost: { coins: 74, food: 24 },
    growth: 1.2,
    startsWith: 1,
    description: "Brings in more residents and a little passive income.",
    unlock: () => true,
    effectText: () => "+3 residents and +0.35 coins each second",
  },
  {
    id: "market",
    name: "Market Cart",
    art: "market",
    baseCost: { coins: 94, food: 30 },
    growth: 1.21,
    startsWith: 1,
    description: "Turns the town's activity into steady coin flow.",
    unlock: () => true,
    effectText: () => "+1.8 coins each second",
  },
  {
    id: "windmill",
    name: "Windmill",
    art: "windmill",
    baseCost: { coins: 168, food: 64 },
    growth: 1.22,
    startsWith: 0,
    description: "Boosts all farm output with cleaner processing.",
    unlock: (state) => getTotalStructures(state) >= 6,
    effectText: () => "+18% farm production",
  },
  {
    id: "school",
    name: "Schoolhouse",
    art: "school",
    baseCost: { coins: 265, food: 92 },
    growth: 1.24,
    startsWith: 0,
    description: "Improves practice rewards and grows the village.",
    unlock: (state) => state.buildings.market >= 2 || state.resources.coins >= 220,
    effectText: () => "+4 residents and stronger practice boosts",
  },
  {
    id: "townhall",
    name: "Town Hall",
    art: "hall",
    baseCost: { coins: 520, food: 165 },
    growth: 1.25,
    startsWith: 0,
    description: "Big multiplier for city income and late-game expansion.",
    unlock: (state) => state.buildings.school >= 1,
    effectText: () => "+1.5 coins each second and +14% city output",
  },
];

const UPGRADES = [
  {
    id: "irrigation",
    name: "Silver Sprinklers",
    cost: { coins: 220, food: 90 },
    description: "Permanent +25% farm output.",
    unlock: (state) => state.buildings.windmill >= 1,
  },
  {
    id: "studyHall",
    name: "Study Hall",
    cost: { coins: 340, food: 130 },
    description: "Practice boosts last 50% longer and give bigger rewards.",
    unlock: (state) => state.buildings.school >= 1,
  },
  {
    id: "tradeGuild",
    name: "Trade Guild",
    cost: { coins: 460, food: 180 },
    description: "Permanent +25% city income.",
    unlock: (state) => state.buildings.townhall >= 1 || state.resources.coins >= 400,
  },
];

const CHINESE_WORDS = [
  { hanzi: "苹果", pinyin: "ping guo", english: "apple" },
  { hanzi: "山", pinyin: "shan", english: "mountain" },
  { hanzi: "书", pinyin: "shu", english: "book" },
  { hanzi: "学校", pinyin: "xue xiao", english: "school" },
  { hanzi: "朋友", pinyin: "peng you", english: "friend" },
  { hanzi: "月亮", pinyin: "yue liang", english: "moon" },
  { hanzi: "花", pinyin: "hua", english: "flower" },
  { hanzi: "家", pinyin: "jia", english: "home" },
  { hanzi: "米饭", pinyin: "mi fan", english: "rice" },
  { hanzi: "火车", pinyin: "huo che", english: "train" },
  { hanzi: "牛奶", pinyin: "niu nai", english: "milk" },
  { hanzi: "谢谢", pinyin: "xie xie", english: "thank you" },
];

const dom = {
  collectButton: document.getElementById("collect-button"),
  focusChip: document.getElementById("focus-chip"),
  resourceGrid: document.getElementById("resource-grid"),
  rateGrid: document.getElementById("rate-grid"),
  buildingGrid: document.getElementById("building-grid"),
  upgradeGrid: document.getElementById("upgrade-grid"),
  practiceStats: document.getElementById("practice-stats"),
  practiceTag: document.getElementById("practice-tag"),
  practicePrompt: document.getElementById("practice-prompt"),
  practiceSubtitle: document.getElementById("practice-subtitle"),
  practiceChoices: document.getElementById("practice-choices"),
  practiceFeedback: document.getElementById("practice-feedback"),
  newProblemButton: document.getElementById("new-problem-button"),
  offlineSummary: document.getElementById("offline-summary"),
  activityList: document.getElementById("activity-list"),
  saveStatus: document.getElementById("save-status"),
  sceneBack: document.getElementById("scene-back"),
  sceneMid: document.getElementById("scene-mid"),
  sceneFront: document.getElementById("scene-front"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
};

function createInitialState() {
  const buildings = {};
  for (const building of BUILDINGS) {
    buildings[building.id] = building.startsWith;
  }

  return {
    resources: {
      coins: 110,
      food: 36,
    },
    buildings,
    upgrades: {},
    boostUntil: 0,
    practice: {
      mode: "math",
      streak: 0,
      solved: 0,
      current: null,
      feedback: "Solve a prompt to activate a timed focus boost.",
      lastChoice: null,
    },
    manualHarvestReadyAt: 0,
    history: [
      stamped("The town woke up with a berry field, a cottage, and a market cart."),
      stamped("Practice challenges replace ad boosts."),
    ],
    offlineSummary: null,
    lastUpdate: Date.now(),
  };
}

function stamped(message) {
  return { time: Date.now(), message };
}

function loadState() {
  const initial = createInitialState();

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      initial.practice.current = generateQuestion(initial, initial.practice.mode);
      return initial;
    }

    const saved = JSON.parse(raw);
    const state = {
      ...initial,
      ...saved,
      resources: { ...initial.resources, ...(saved.resources || {}) },
      buildings: { ...initial.buildings, ...(saved.buildings || {}) },
      upgrades: { ...initial.upgrades, ...(saved.upgrades || {}) },
      practice: {
        ...initial.practice,
        ...(saved.practice || {}),
      },
      history: Array.isArray(saved.history) ? saved.history.slice(0, 12) : initial.history,
    };

    if (!state.practice.current) {
      state.practice.current = generateQuestion(state, state.practice.mode);
    }

    applyOfflineProgress(state);
    return state;
  } catch (error) {
    initial.practice.current = generateQuestion(initial, initial.practice.mode);
    initial.history.unshift(stamped("Save data could not be read, so a fresh town was created."));
    return initial;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    dom.saveStatus.textContent = "Local save active";
  } catch (error) {
    dom.saveStatus.textContent = "Save failed in this browser";
  }
}

function applyOfflineProgress(state) {
  const now = Date.now();
  const secondsAway = clamp((now - state.lastUpdate) / 1000, 0, MAX_OFFLINE_SECONDS);

  if (secondsAway < 4) {
    state.lastUpdate = now;
    state.offlineSummary = null;
    return;
  }

  const beforeCoins = state.resources.coins;
  const beforeFood = state.resources.food;
  advanceState(state, now);

  state.offlineSummary = {
    seconds: secondsAway,
    coins: state.resources.coins - beforeCoins,
    food: state.resources.food - beforeFood,
  };
  pushHistory(
    state,
    `While away for ${formatDuration(secondsAway * 1000)}, the town earned ${formatNumber(
      state.offlineSummary.coins
    )} coins and ${formatNumber(state.offlineSummary.food)} food.`
  );
}

function getTotalStructures(state) {
  return Object.values(state.buildings).reduce((sum, count) => sum + count, 0);
}

function getResidents(state) {
  return 4 + state.buildings.cottage * 3 + state.buildings.school * 4 + state.buildings.townhall * 8;
}

function isBoostActive(state, at = Date.now()) {
  return at < state.boostUntil;
}

function getFocusMultiplier(state) {
  let multiplier = 2.1 + state.buildings.school * 0.12;
  if (state.upgrades.studyHall) {
    multiplier += 0.4;
  }
  return multiplier;
}

function getBoostDurationMs(state) {
  let duration = (4 + state.buildings.school) * 60 * 1000;
  if (state.upgrades.studyHall) {
    duration *= 1.5;
  }
  return duration;
}

function getProductionRates(state, at = Date.now()) {
  const residents = getResidents(state);
  let foodRate = state.buildings.plot * 0.8 + state.buildings.orchard * 2.6;
  foodRate *= 1 + state.buildings.windmill * 0.18;
  if (state.upgrades.irrigation) {
    foodRate *= 1.25;
  }

  let coinRate =
    state.buildings.market * 1.8 +
    state.buildings.cottage * 0.35 +
    state.buildings.school * 0.65 +
    state.buildings.townhall * 1.5 +
    residents * 0.06;
  coinRate *= 1 + state.buildings.townhall * 0.14;
  if (state.upgrades.tradeGuild) {
    coinRate *= 1.25;
  }

  const activeBoost = isBoostActive(state, at);
  if (activeBoost) {
    const focusMultiplier = getFocusMultiplier(state);
    foodRate *= focusMultiplier;
    coinRate *= focusMultiplier;
  }

  return {
    foodRate,
    coinRate,
    residents,
    activeBoost,
  };
}

function advanceState(state, now = Date.now()) {
  let cursor = state.lastUpdate || now;
  if (now <= cursor) {
    return;
  }

  while (cursor < now) {
    let boundary = now;
    if (state.boostUntil > cursor && state.boostUntil < now) {
      boundary = state.boostUntil;
    }

    const seconds = (boundary - cursor) / 1000;
    const rates = getProductionRates(state, cursor);
    state.resources.coins += rates.coinRate * seconds;
    state.resources.food += rates.foodRate * seconds;
    cursor = boundary;
  }

  state.lastUpdate = now;
}

function getBuildingCost(building, count) {
  const coins = Math.round(building.baseCost.coins * Math.pow(building.growth, count));
  const food = Math.round(building.baseCost.food * Math.pow(building.growth, count));
  return { coins, food };
}

function canAfford(cost, state) {
  return state.resources.coins >= cost.coins && state.resources.food >= cost.food;
}

function purchaseBuilding(state, buildingId) {
  advanceState(state);
  const building = BUILDINGS.find((entry) => entry.id === buildingId);
  if (!building || !building.unlock(state)) {
    return;
  }

  const currentCount = state.buildings[buildingId];
  const cost = getBuildingCost(building, currentCount);
  if (!canAfford(cost, state)) {
    return;
  }

  state.resources.coins -= cost.coins;
  state.resources.food -= cost.food;
  state.buildings[buildingId] += 1;
  pushHistory(state, `Built ${building.name}.`);

  if (!state.practice.current) {
    state.practice.current = generateQuestion(state, state.practice.mode);
  }

  saveState(state);
  render(state);
}

function purchaseUpgrade(state, upgradeId) {
  advanceState(state);
  const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);
  if (!upgrade || state.upgrades[upgradeId] || !upgrade.unlock(state)) {
    return;
  }

  if (!canAfford(upgrade.cost, state)) {
    return;
  }

  state.resources.coins -= upgrade.cost.coins;
  state.resources.food -= upgrade.cost.food;
  state.upgrades[upgradeId] = true;
  pushHistory(state, `Unlocked ${upgrade.name}.`);
  saveState(state);
  render(state);
}

function getManualHarvestReward(state) {
  return {
    coins: 9 + state.buildings.plot * 2 + state.buildings.market * 3 + state.buildings.townhall * 4,
    food: 6 + state.buildings.orchard * 2 + state.buildings.windmill,
  };
}

function getManualHarvestCooldownMs(state) {
  return Math.max(6000, 12000 - state.buildings.windmill * 500 - state.buildings.school * 300);
}

function runManualHarvest(state) {
  advanceState(state);
  const now = Date.now();
  if (now < state.manualHarvestReadyAt) {
    return;
  }

  const reward = getManualHarvestReward(state);
  state.resources.coins += reward.coins;
  state.resources.food += reward.food;
  state.manualHarvestReadyAt = now + getManualHarvestCooldownMs(state);
  pushHistory(
    state,
    `Collected a basket for ${formatNumber(reward.coins)} coins and ${formatNumber(reward.food)} food.`
  );
  saveState(state);
  render(state);
}

function pushHistory(state, message) {
  state.history.unshift(stamped(message));
  state.history = state.history.slice(0, 10);
}

function setPracticeMode(state, mode) {
  if (state.practice.mode === mode) {
    return;
  }

  state.practice.mode = mode;
  state.practice.current = generateQuestion(state, mode);
  state.practice.lastChoice = null;
  state.practice.feedback =
    mode === "math"
      ? "Quick math gives timed boosts for the whole town."
      : "Chinese prompts can power the town too.";
  saveState(state);
  render(state);
}

function generateQuestion(state, mode) {
  return mode === "math" ? generateMathQuestion(state) : generateChineseQuestion();
}

function generateMathQuestion(state) {
  const structures = getTotalStructures(state);
  const allowMultiply = structures >= 12;
  const range = structures >= 8 ? 20 : 10;
  const operators = allowMultiply ? ["+", "-", "x"] : ["+", "-"];
  const operator = sample(operators);
  let a = randomInt(2, range + 4);
  let b = randomInt(1, range);
  let answer = 0;

  if (operator === "+") {
    answer = a + b;
  } else if (operator === "-") {
    if (b > a) {
      [a, b] = [b, a];
    }
    answer = a - b;
  } else {
    a = randomInt(2, 8);
    b = randomInt(2, 6);
    answer = a * b;
  }

  const choices = buildNumericChoices(answer);
  return {
    mode: "math",
    prompt: `${a} ${operator} ${b} = ?`,
    subtitle: allowMultiply
      ? "Correct answers extend your focus boost and grant instant rewards."
      : "Early game keeps the problems simple and fast.",
    choices,
    correctIndex: choices.indexOf(String(answer)),
  };
}

function buildNumericChoices(answer) {
  const options = new Set([String(answer)]);
  while (options.size < 4) {
    const offset = randomInt(-6, 6) || 3;
    const candidate = Math.max(0, answer + offset + randomInt(-2, 2));
    options.add(String(candidate));
  }
  return shuffle(Array.from(options));
}

function generateChineseQuestion() {
  const word = sample(CHINESE_WORDS);
  const reverse = Math.random() > 0.5;

  if (reverse) {
    const choices = shuffle(
      [word, ...shuffle(CHINESE_WORDS.filter((entry) => entry.hanzi !== word.hanzi)).slice(0, 3)].map(
        (entry) => `${entry.hanzi} (${entry.pinyin})`
      )
    );
    return {
      mode: "chinese",
      prompt: `Which Chinese word means "${word.english}"?`,
      subtitle: "Matching meaning, character, and pinyin still counts as a power-up.",
      choices,
      correctIndex: choices.indexOf(`${word.hanzi} (${word.pinyin})`),
    };
  }

  const choices = shuffle(
    [word.english, ...shuffle(CHINESE_WORDS.filter((entry) => entry.english !== word.english)).slice(0, 3).map(
      (entry) => entry.english
    )]
  );
  return {
    mode: "chinese",
    prompt: `What does ${word.hanzi} (${word.pinyin}) mean?`,
    subtitle: "Short vocabulary bursts replace ad rewards.",
    choices,
    correctIndex: choices.indexOf(word.english),
  };
}

function answerPractice(state, choiceIndex) {
  advanceState(state);
  const question = state.practice.current;
  if (!question) {
    return;
  }

  state.practice.lastChoice = choiceIndex;
  const correct = choiceIndex === question.correctIndex;
  const schoolBonus = state.buildings.school * 5;
  const rewardMultiplier = state.upgrades.studyHall ? 1.5 : 1;

  if (correct) {
    state.practice.streak += 1;
    state.practice.solved += 1;

    const duration = getBoostDurationMs(state);
    const now = Date.now();
    state.boostUntil = Math.max(state.boostUntil, now) + duration;

    const coinReward = (18 + state.practice.streak * 4 + schoolBonus) * rewardMultiplier;
    const foodReward = (14 + state.practice.streak * 3 + schoolBonus * 0.7) * rewardMultiplier;
    state.resources.coins += coinReward;
    state.resources.food += foodReward;

    state.practice.feedback = `Correct. Focus boost extended by ${formatDuration(
      duration
    )}, plus instant rewards.`;
    pushHistory(
      state,
      `Solved a ${question.mode} challenge. Focus boost is active and the town gained ${formatNumber(
        coinReward
      )} coins.`
    );
  } else {
    state.practice.streak = 0;
    state.practice.feedback = `Not this one. The correct answer was "${
      question.choices[question.correctIndex]
    }".`;
    pushHistory(state, `Missed a ${question.mode} challenge. The streak reset to zero.`);
  }

  state.practice.current = generateQuestion(state, state.practice.mode);
  state.practice.lastChoice = null;
  saveState(state);
  render(state);
}

function render(state) {
  advanceState(state);
  renderResources(state);
  renderRates(state);
  renderBuildings(state);
  renderUpgrades(state);
  renderPractice(state);
  renderHistory(state);
  renderFocus(state);
  renderScene(state);
}

function renderResources(state) {
  const rates = getProductionRates(state);
  const focusMultiplier = rates.activeBoost ? `x${getFocusMultiplier(state).toFixed(1)}` : "Ready";
  const resources = [
    {
      label: "Coins",
      value: formatNumber(state.resources.coins),
      detail: "Used for construction and permanent upgrades.",
    },
    {
      label: "Food",
      value: formatNumber(state.resources.food),
      detail: "Farm output that helps fund bigger buildings.",
    },
    {
      label: "Residents",
      value: formatNumber(rates.residents, 0),
      detail: "Grows the city and lifts passive income.",
    },
    {
      label: "Focus",
      value: focusMultiplier,
      detail: "Earned by solving practice prompts.",
    },
  ];

  dom.resourceGrid.innerHTML = resources
    .map(
      (resource) => `
        <article class="resource-card">
          <p class="section-label">${resource.label}</p>
          <strong>${resource.value}</strong>
          <p>${resource.detail}</p>
        </article>
      `
    )
    .join("");
}

function renderRates(state) {
  const rates = getProductionRates(state);
  const cooldownRemaining = Math.max(0, state.manualHarvestReadyAt - Date.now());

  dom.rateGrid.innerHTML = `
    <article class="rate-card">
      <p class="section-label">Food Rate</p>
      <strong>${formatSigned(rates.foodRate)}/s</strong>
      <p>Berry plots, orchards, and windmills drive farm growth.</p>
    </article>
    <article class="rate-card">
      <p class="section-label">Coin Rate</p>
      <strong>${formatSigned(rates.coinRate)}/s</strong>
      <p>Markets, residents, schools, and the town hall keep coins flowing.</p>
    </article>
    <article class="rate-card">
      <p class="section-label">Basket Cooldown</p>
      <strong>${cooldownRemaining > 0 ? formatDuration(cooldownRemaining) : "Ready"}</strong>
      <p>Tap collect for a burst of coins and food between upgrades.</p>
    </article>
    <article class="rate-card">
      <p class="section-label">Practice Reward</p>
      <strong>${formatDuration(getBoostDurationMs(state))}</strong>
      <p>Each correct prompt extends focus and gives instant resources.</p>
    </article>
  `;

  dom.collectButton.disabled = cooldownRemaining > 0;
  dom.collectButton.textContent =
    cooldownRemaining > 0 ? `Basket in ${formatDuration(cooldownRemaining)}` : "Collect Basket";
}

function renderBuildings(state) {
  dom.buildingGrid.innerHTML = BUILDINGS.map((building) => {
    const unlocked = building.unlock(state);
    const count = state.buildings[building.id];
    const cost = getBuildingCost(building, count);
    const affordable = canAfford(cost, state);

    return `
      <article class="game-card ${unlocked ? "" : "locked"}">
        <div class="meta-row">
          <span class="section-label">${building.name}</span>
          <span>Owned ${count}</span>
        </div>
        <h3>${building.effectText(state)}</h3>
        <p>${building.description}</p>
        <div class="cost-row">
          <span class="cost-pill">${formatNumber(cost.coins)} coins</span>
          <span class="cost-pill">${formatNumber(cost.food)} food</span>
        </div>
        <button
          class="purchase-button"
          data-building-id="${building.id}"
          type="button"
          ${unlocked && affordable ? "" : "disabled"}
        >
          ${unlocked ? "Build Next" : "Locked"}
        </button>
      </article>
    `;
  }).join("");
}

function renderUpgrades(state) {
  dom.upgradeGrid.innerHTML = UPGRADES.filter((upgrade) => !state.upgrades[upgrade.id])
    .map((upgrade) => {
      const unlocked = upgrade.unlock(state);
      const affordable = canAfford(upgrade.cost, state);
      return `
        <article class="game-card ${unlocked ? "" : "locked"}">
          <div class="meta-row">
            <span class="section-label">${upgrade.name}</span>
            <span>Permanent</span>
          </div>
          <h3>${upgrade.description}</h3>
          <p>One-time improvement for the whole town.</p>
          <div class="cost-row">
            <span class="cost-pill">${formatNumber(upgrade.cost.coins)} coins</span>
            <span class="cost-pill">${formatNumber(upgrade.cost.food)} food</span>
          </div>
          <button
            class="purchase-button"
            data-upgrade-id="${upgrade.id}"
            type="button"
            ${unlocked && affordable ? "" : "disabled"}
          >
            ${unlocked ? "Unlock" : "Locked"}
          </button>
        </article>
      `;
    })
    .join("");

  if (!dom.upgradeGrid.innerHTML.trim()) {
    dom.upgradeGrid.innerHTML = `
      <article class="game-card">
        <span class="section-label">All upgrades unlocked</span>
        <h3>The village is well-tuned.</h3>
        <p>Next phase could add more decorations, quests, and seasonal events.</p>
      </article>
    `;
  }
}

function renderPractice(state) {
  const question = state.practice.current;
  if (!question) {
    state.practice.current = generateQuestion(state, state.practice.mode);
  }

  dom.practiceStats.textContent = `Streak ${state.practice.streak} • Solved ${state.practice.solved}`;
  dom.practiceTag.textContent = state.practice.mode === "math" ? "Math Sprint" : "Chinese Sprint";
  dom.practicePrompt.textContent = state.practice.current.prompt;
  dom.practiceSubtitle.textContent = state.practice.current.subtitle;
  dom.practiceFeedback.textContent = state.practice.feedback;

  dom.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.practice.mode);
  });

  dom.practiceChoices.innerHTML = state.practice.current.choices
    .map((choice, index) => {
      const isCorrect =
        state.practice.lastChoice !== null &&
        index === state.practice.current.correctIndex &&
        state.practice.feedback.startsWith("Not");
      const isWrong = state.practice.lastChoice === index && state.practice.feedback.startsWith("Not");
      return `
        <button
          class="choice-button ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}"
          data-choice-index="${index}"
          type="button"
        >
          ${choice}
        </button>
      `;
    })
    .join("");
}

function renderHistory(state) {
  if (state.offlineSummary) {
    dom.offlineSummary.textContent = `Away ${formatDuration(
      state.offlineSummary.seconds * 1000
    )}: +${formatNumber(state.offlineSummary.coins)} coins and +${formatNumber(
      state.offlineSummary.food
    )} food`;
  } else {
    dom.offlineSummary.textContent = "Offline summary will appear here.";
  }

  dom.activityList.innerHTML = state.history
    .map(
      (entry) => `
        <li>
          <strong>${formatClock(entry.time)}</strong>
          <div class="tiny">${entry.message}</div>
        </li>
      `
    )
    .join("");
}

function renderFocus(state) {
  if (isBoostActive(state)) {
    dom.focusChip.textContent = `Focus x${getFocusMultiplier(state).toFixed(1)} for ${formatDuration(
      state.boostUntil - Date.now()
    )}`;
  } else {
    dom.focusChip.textContent = "Focus boost inactive";
  }
}

function renderScene(state) {
  dom.sceneBack.innerHTML = renderSceneItems("field", Math.min(5, state.buildings.plot));
  dom.sceneMid.innerHTML =
    renderSceneItems("tree", Math.min(4, state.buildings.orchard)) +
    renderSceneItems("windmill", Math.min(2, state.buildings.windmill)) +
    renderSceneItems("school", Math.min(1, state.buildings.school));
  dom.sceneFront.innerHTML =
    renderSceneItems("house", Math.min(4, state.buildings.cottage)) +
    renderSceneItems("market", Math.min(3, state.buildings.market)) +
    renderSceneItems("hall", Math.min(1, state.buildings.townhall));
}

function renderSceneItems(type, count) {
  return Array.from({ length: count }, () => `<span class="scene-item scene-${type}"></span>`).join("");
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, digits = 1) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (digits === 0) {
    return Math.floor(value).toString();
  }
  if (value >= 100) {
    return Math.floor(value).toString();
  }
  return value.toFixed(digits);
}

function formatSigned(value) {
  return value >= 0 ? formatNumber(value) : `-${formatNumber(Math.abs(value))}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const state = loadState();

dom.collectButton.addEventListener("click", () => runManualHarvest(state));
dom.newProblemButton.addEventListener("click", () => {
  state.practice.current = generateQuestion(state, state.practice.mode);
  state.practice.lastChoice = null;
  state.practice.feedback =
    state.practice.mode === "math"
      ? "New math prompt ready."
      : "New Chinese prompt ready.";
  render(state);
});

dom.buildingGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-building-id]");
  if (!button) {
    return;
  }
  purchaseBuilding(state, button.dataset.buildingId);
});

dom.upgradeGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-upgrade-id]");
  if (!button) {
    return;
  }
  purchaseUpgrade(state, button.dataset.upgradeId);
});

dom.practiceChoices.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice-index]");
  if (!button) {
    return;
  }
  answerPractice(state, Number(button.dataset.choiceIndex));
});

for (const button of dom.modeButtons) {
  button.addEventListener("click", () => setPracticeMode(state, button.dataset.mode));
}

let lastSaveAt = Date.now();

setInterval(() => {
  render(state);
  if (Date.now() - lastSaveAt >= SAVE_INTERVAL_MS) {
    saveState(state);
    lastSaveAt = Date.now();
  }
}, TICK_MS);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    advanceState(state);
    saveState(state);
  } else {
    applyOfflineProgress(state);
    render(state);
  }
});

window.addEventListener("beforeunload", () => {
  advanceState(state);
  saveState(state);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render(state);
