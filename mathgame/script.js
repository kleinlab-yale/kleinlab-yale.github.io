const STORAGE_KEY = "math-pet-evolution-save-v1";

const EGG_TYPES = {
  sun: {
    label: "Sunbeam Egg",
    personality: "cheerful and brave",
    colors: ["#ffe8a6", "#ffa95f"],
    habitatHue: "sunny",
  },
  tide: {
    label: "Tide Egg",
    personality: "curious and calm",
    colors: ["#b9f3ff", "#4bb8ff"],
    habitatHue: "tide",
  },
  grove: {
    label: "Grove Egg",
    personality: "creative and bold",
    colors: ["#dcffa1", "#58c76e"],
    habitatHue: "grove",
  },
};

const STAGES = [
  {
    id: "egg",
    name: "Mystery Egg",
    chip: "Egg",
    petClass: "egg",
    minBosses: 0,
    reaction: "The egg wiggles when math energy reaches it.",
  },
  {
    id: "hatchling",
    name: "Glow Hatchling",
    chip: "Hatchling",
    petClass: "hatchling",
    minBosses: 1,
    reaction: "Your hatchling bounces after every correct answer.",
  },
  {
    id: "sprout",
    name: "Trail Sprout",
    chip: "Explorer",
    petClass: "sprout",
    minBosses: 2,
    reaction: "Your pet is exploring farther and showing more personality.",
  },
  {
    id: "glider",
    name: "Sky Glider",
    chip: "Guardian",
    petClass: "glider",
    minBosses: 3,
    reaction: "Your fully evolved friend protects every restored habitat.",
  },
];

const ZONES = [
  {
    id: "nest",
    name: "Sunny Nest",
    icon: "☀",
    color: "linear-gradient(135deg, #ffad50, #ffd65b)",
    unlockBosses: 0,
    summary: "The first cozy home where the egg waits to hatch.",
  },
  {
    id: "bridge",
    name: "Fraction Bridge",
    icon: "≶",
    color: "linear-gradient(135deg, #47c5e7, #7fd8ff)",
    unlockBosses: 1,
    summary: "A sparkling crossing rebuilt with smart fraction choices.",
  },
  {
    id: "grove",
    name: "Shape Grove",
    icon: "△",
    color: "linear-gradient(135deg, #72c46e, #c3f38a)",
    unlockBosses: 2,
    summary: "A habitat filled with geometry towers and playful patterns.",
  },
  {
    id: "sky",
    name: "Starfall Sky",
    icon: "✦",
    color: "linear-gradient(135deg, #ff8d7e, #ffc65f)",
    unlockBosses: 3,
    summary: "The final region where advanced mixed quests shine.",
  },
];

const DECORATIONS = [
  { id: "flower", label: "Blossom patch", type: "flower" },
  { id: "crystal", label: "Bridge crystal", type: "crystal" },
  { id: "mushroom", label: "Mushroom stool", type: "mushroom" },
  { id: "flower-two", label: "Starlight bloom", type: "flower" },
  { id: "crystal-two", label: "Moon crystal", type: "crystal" },
  { id: "mushroom-two", label: "Forest mushroom", type: "mushroom" },
];

const DOM = {
  habitatName: document.getElementById("habitatName"),
  stageChip: document.getElementById("stageChip"),
  zoneChip: document.getElementById("zoneChip"),
  petSpeech: document.getElementById("petSpeech"),
  petAvatar: document.getElementById("petAvatar"),
  petNameLabel: document.getElementById("petNameLabel"),
  petMoodLine: document.getElementById("petMoodLine"),
  habitatScene: document.getElementById("habitatScene"),
  sceneDecorations: document.getElementById("sceneDecorations"),
  hungerValue: document.getElementById("hungerValue"),
  energyValue: document.getElementById("energyValue"),
  moodValue: document.getElementById("moodValue"),
  evolutionValue: document.getElementById("evolutionValue"),
  hungerMeter: document.getElementById("hungerMeter"),
  energyMeter: document.getElementById("energyMeter"),
  moodMeter: document.getElementById("moodMeter"),
  evolutionMeter: document.getElementById("evolutionMeter"),
  sparkValue: document.getElementById("sparkValue"),
  streakValue: document.getElementById("streakValue"),
  streakLine: document.getElementById("streakLine"),
  unlockLine: document.getElementById("unlockLine"),
  unlockHint: document.getElementById("unlockHint"),
  bossTitle: document.getElementById("bossTitle"),
  bossHint: document.getElementById("bossHint"),
  bossButton: document.getElementById("bossButton"),
  challengeTitle: document.getElementById("challengeTitle"),
  questionCounter: document.getElementById("questionCounter"),
  challengePrompt: document.getElementById("challengePrompt"),
  questionType: document.getElementById("questionType"),
  questionText: document.getElementById("questionText"),
  fractionVisuals: document.getElementById("fractionVisuals"),
  choiceGrid: document.getElementById("choiceGrid"),
  answerForm: document.getElementById("answerForm"),
  answerInput: document.getElementById("answerInput"),
  feedbackCard: document.getElementById("feedbackCard"),
  feedbackText: document.getElementById("feedbackText"),
  rewardStrip: document.getElementById("rewardStrip"),
  zoneList: document.getElementById("zoneList"),
  milestoneList: document.getElementById("milestoneList"),
  milestoneCount: document.getElementById("milestoneCount"),
  setupModal: document.getElementById("setupModal"),
  setupForm: document.getElementById("setupForm"),
  petNameInput: document.getElementById("petNameInput"),
  helpModal: document.getElementById("helpModal"),
  helpButton: document.getElementById("helpButton"),
  closeHelpButton: document.getElementById("closeHelpButton"),
  resetButton: document.getElementById("resetButton"),
};

const state = hydrateState(loadState());

let selectedEgg = state.eggType || "sun";
let selectedChoiceValue = "";

function createFreshState() {
  return {
    petName: "",
    eggType: "",
    sparkles: 0,
    hunger: 42,
    energy: 44,
    mood: 58,
    evolution: 0,
    stageIndex: 0,
    zoneIndex: 0,
    streak: 0,
    bossesCleared: 0,
    decorations: [],
    milestoneLog: [
      "A mysterious egg arrived. Choose a shell and begin the first hatch quest.",
    ],
    questHistory: {
      multiplication: 0,
      fractions: 0,
      geometry: 0,
    },
    cycleHistory: {
      multiplication: 0,
      fractions: 0,
      geometry: 0,
    },
    activeQuest: null,
    activeQuestion: null,
    cycleLength: 0,
    questionIndex: 0,
    currentQuestCorrect: 0,
    petSpeech: "Choose an egg to begin.",
    lastRewards: {
      food: 0,
      energy: 0,
      mood: 0,
      sparkles: 0,
    },
  };
}

function hydrateState(savedState) {
  const fresh = createFreshState();
  if (!savedState) {
    return fresh;
  }

  return {
    ...fresh,
    ...savedState,
    questHistory: {
      ...fresh.questHistory,
      ...(savedState.questHistory || {}),
    },
    cycleHistory: {
      ...fresh.cycleHistory,
      ...(savedState.cycleHistory || {}),
    },
    lastRewards: {
      ...fresh.lastRewards,
      ...(savedState.lastRewards || {}),
    },
    decorations: Array.isArray(savedState.decorations) ? savedState.decorations : fresh.decorations,
    milestoneLog: Array.isArray(savedState.milestoneLog) ? savedState.milestoneLog : fresh.milestoneLog,
    stageIndex: clamp(savedState.stageIndex ?? fresh.stageIndex, 0, STAGES.length - 1),
    zoneIndex: Math.max(0, savedState.zoneIndex ?? fresh.zoneIndex),
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function currentStage() {
  return STAGES[state.stageIndex];
}

function unlockedZones() {
  return ZONES.filter((zone) => zone.unlockBosses <= state.bossesCleared);
}

function currentZone() {
  return unlockedZones()[state.zoneIndex] || ZONES[0];
}

function bossReady() {
  const balancedPractice = Object.values(state.cycleHistory).every((count) => count >= 1);
  return state.evolution >= 100 && balancedPractice;
}

function addMilestone(text) {
  state.milestoneLog.unshift(text);
  state.milestoneLog = state.milestoneLog.slice(0, 8);
}

function bumpNeeds({
  hunger = 0,
  energy = 0,
  mood = 0,
  evolution = 0,
  sparkles = 0,
}) {
  state.hunger = clamp(state.hunger + hunger);
  state.energy = clamp(state.energy + energy);
  state.mood = clamp(state.mood + mood);
  state.evolution = clamp(state.evolution + evolution);
  state.sparkles += sparkles;
  state.lastRewards = { food: hunger, energy, mood, sparkles };
}

function cycleDifficulty() {
  const totalSolved = Object.values(state.questHistory).reduce((sum, count) => sum + count, 0);
  return Math.min(4, state.stageIndex + 1 + Math.floor(totalSolved / 12));
}

function compareFractions(aNum, aDen, bNum, bDen) {
  const left = aNum * bDen;
  const right = bNum * aDen;
  if (left === right) {
    return "=";
  }
  return left > right ? ">" : "<";
}

function formatQuestTitle(key) {
  if (key === "multiplication") {
    return "Multiplication Chain";
  }
  if (key === "fractions") {
    return "Fraction Bridge";
  }
  if (key === "geometry") {
    return "Geometry Workshop";
  }
  if (key === "boss") {
    return "Boss Challenge";
  }
  return "Math Quest";
}

function startQuest(type) {
  if (!state.petName) {
    openSetup();
    return;
  }

  state.activeQuest = type;
  state.cycleLength = type === "boss" ? 6 : 5;
  state.questionIndex = 0;
  state.streak = 0;
  state.currentQuestCorrect = 0;
  selectedChoiceValue = "";
  nextQuestion();
  saveState();
  render();
}

function nextQuestion() {
  if (!state.activeQuest) {
    return;
  }

  if (state.questionIndex >= state.cycleLength) {
    finishQuest();
    return;
  }

  const type = state.activeQuest;
  const difficulty = cycleDifficulty();

  if (type === "multiplication") {
    state.activeQuestion = generateMultiplicationQuestion(difficulty);
  } else if (type === "fractions") {
    state.activeQuestion = generateFractionQuestion(difficulty);
  } else if (type === "geometry") {
    state.activeQuestion = generateGeometryQuestion(difficulty);
  } else {
    state.activeQuestion = generateBossQuestion(difficulty);
  }

  selectedChoiceValue = "";
}

function generateMultiplicationQuestion(difficulty) {
  const a = randomInt(2, 4 + difficulty * 2);
  const b = randomInt(2, 5 + difficulty * 2);
  const variants = [
    {
      prompt: `${a} × ${b}`,
      answer: String(a * b),
      helper: `Link ${state.questionIndex + 1}: grow a snack bundle with repeated groups.`,
    },
    {
      prompt: `A basket has ${a} rows with ${b} fruit stars in each row. How many fruit stars?`,
      answer: String(a * b),
      helper: `Multiply rows by stars in each row.`,
    },
  ];
  return {
    kind: "numeric",
    category: "Multiplication",
    ...variants[randomInt(0, variants.length - 1)],
  };
}

function generateFractionQuestion(difficulty) {
  const denominatorPool = difficulty < 3 ? [2, 3, 4, 6, 8] : [3, 4, 5, 6, 8, 10, 12];
  let leftDen = denominatorPool[randomInt(0, denominatorPool.length - 1)];
  let rightDen = denominatorPool[randomInt(0, denominatorPool.length - 1)];
  let leftNum = randomInt(1, leftDen - 1);
  let rightNum = randomInt(1, rightDen - 1);

  if (randomInt(0, 5) === 0) {
    leftDen = rightDen;
    rightNum = randomInt(1, rightDen - 1);
  }

  if (randomInt(0, 6) === 0) {
    leftNum = Math.max(1, Math.floor(leftDen / 2));
    rightNum = Math.max(1, Math.floor(rightDen / 2));
  }

  return {
    kind: "choice",
    category: "Fractions",
    prompt: `Which symbol makes the bridge true? ${leftNum}/${leftDen} ? ${rightNum}/${rightDen}`,
    answer: compareFractions(leftNum, leftDen, rightNum, rightDen),
    helper: "Choose <, >, or = after comparing the size of each fraction.",
    choices: ["<", ">", "="],
    fractions: [
      { numerator: leftNum, denominator: leftDen, label: `${leftNum}/${leftDen}` },
      { numerator: rightNum, denominator: rightDen, label: `${rightNum}/${rightDen}` },
    ],
  };
}

function generateGeometryQuestion(difficulty) {
  const questionType = randomInt(0, 3);

  if (questionType === 0) {
    const width = randomInt(3, 6 + difficulty);
    const height = randomInt(2, 4 + difficulty);
    return {
      kind: "numeric",
      category: "Geometry",
      prompt: `A rectangle garden is ${width} units by ${height} units. What is its area?`,
      answer: String(width * height),
      helper: "Area of a rectangle is length × width.",
    };
  }

  if (questionType === 1) {
    const width = randomInt(2, 7 + difficulty);
    const height = randomInt(2, 5 + difficulty);
    return {
      kind: "numeric",
      category: "Geometry",
      prompt: `A path is ${width} units long and ${height} units wide. What is its perimeter?`,
      answer: String(width * 2 + height * 2),
      helper: "Perimeter is the total distance around the outside.",
    };
  }

  if (questionType === 2) {
    const shapeOptions = [
      { name: "triangle", answer: "3" },
      { name: "quadrilateral", answer: "4" },
      { name: "pentagon", answer: "5" },
      { name: "hexagon", answer: "6" },
      { name: "octagon", answer: "8" },
    ];
    const shape = shapeOptions[randomInt(0, shapeOptions.length - 1)];
    return {
      kind: "numeric",
      category: "Geometry",
      prompt: `How many sides does a ${shape.name} have?`,
      answer: shape.answer,
      helper: "Count the edges around the shape.",
    };
  }

  const nameChoices = [
    { clue: "A shape with 4 equal sides", answer: "square" },
    { clue: "A shape with 3 sides", answer: "triangle" },
    { clue: "A shape with 6 sides", answer: "hexagon" },
    { clue: "A shape with 8 sides", answer: "octagon" },
  ];
  const shape = nameChoices[randomInt(0, nameChoices.length - 1)];
  return {
    kind: "choice",
    category: "Geometry",
    prompt: `Which shape matches this clue: ${shape.clue}?`,
    answer: shape.answer,
    helper: "Pick the shape name that fits.",
    choices: ["triangle", "square", "hexagon", "octagon"],
  };
}

function generateBossQuestion(difficulty) {
  const pool = [
    generateMultiplicationQuestion(difficulty + 1),
    generateFractionQuestion(difficulty + 1),
    generateGeometryQuestion(difficulty + 1),
  ];
  const picked = pool[randomInt(0, pool.length - 1)];
  picked.category = `Boss ${picked.category}`;
  picked.helper = `${picked.helper} Boss rounds mix every skill together.`;
  return picked;
}

function normalizeAnswer(question, value) {
  if (question.kind === "choice") {
    return String(value).trim().toLowerCase();
  }
  return String(value).trim().replace(/\s+/g, "");
}

function checkAnswer(rawAnswer) {
  if (!state.activeQuestion) {
    return;
  }

  const normalized = normalizeAnswer(state.activeQuestion, rawAnswer);
  const correct = normalizeAnswer(state.activeQuestion, state.activeQuestion.answer);
  const isCorrect = normalized === correct;
  const questType = state.activeQuest;

  DOM.feedbackCard.classList.remove("good", "bad");

  if (isCorrect) {
    state.streak += 1;
    state.currentQuestCorrect += 1;
    state.questionIndex += 1;
    rewardCorrectAnswer(questType);
    DOM.feedbackCard.classList.add("good");
    DOM.feedbackText.textContent = makePositiveFeedback(questType);
    state.petSpeech = makePetSpeech(true);
  } else {
    state.streak = 0;
    bumpNeeds({
      hunger: questType === "boss" ? -3 : -1,
      energy: questType === "boss" ? -4 : -2,
      mood: -2,
      evolution: 0,
      sparkles: 0,
    });
    DOM.feedbackCard.classList.add("bad");
    DOM.feedbackText.textContent = `Not yet. The best answer was ${state.activeQuestion.answer}. ${state.activeQuestion.helper}`;
    state.petSpeech = makePetSpeech(false);
    state.questionIndex += 1;
  }

  if (state.activeQuest) {
    if (state.questionIndex >= state.cycleLength) {
      finishQuest();
    } else {
      nextQuestion();
    }
  }

  saveState();
  render();
}

function rewardCorrectAnswer(questType) {
  if (questType === "multiplication") {
    bumpNeeds({ hunger: 9, energy: 7, mood: 2, evolution: 8, sparkles: 2 });
    state.questHistory.multiplication += 1;
    state.cycleHistory.multiplication += 1;
    return;
  }

  if (questType === "fractions") {
    bumpNeeds({ hunger: 3, energy: 3, mood: 8, evolution: 9, sparkles: 3 });
    state.questHistory.fractions += 1;
    state.cycleHistory.fractions += 1;
    if (state.zoneIndex < unlockedZones().length - 1) {
      state.zoneIndex += 1;
    }
    return;
  }

  if (questType === "geometry") {
    bumpNeeds({ hunger: 2, energy: 6, mood: 5, evolution: 9, sparkles: 4 });
    state.questHistory.geometry += 1;
    state.cycleHistory.geometry += 1;
    unlockDecoration();
    return;
  }

  bumpNeeds({ hunger: 6, energy: 6, mood: 8, evolution: 10, sparkles: 6 });
}

function unlockDecoration() {
  const nextDecoration = DECORATIONS[state.decorations.length];
  if (nextDecoration) {
    state.decorations.push(nextDecoration.id);
  }
}

function finishQuest() {
  const type = state.activeQuest;
  if (!type) {
    return;
  }

  if (type === "boss") {
    if (state.currentQuestCorrect >= 4) {
      clearBoss();
    } else {
      state.evolution = 70;
      state.cycleHistory = { multiplication: 0, fractions: 0, geometry: 0 };
      addMilestone(`Boss challenge attempt complete. ${state.petName} needs more balanced practice before evolving.`);
      DOM.feedbackText.textContent =
        `Boss challenge complete with ${state.currentQuestCorrect} out of ${state.cycleLength} correct. Train across all three quest types and try again.`;
      state.petSpeech = `${state.petName} wants one more balanced training round before evolving.`;
    }
  } else {
    const title = formatQuestTitle(type);
    addMilestone(`${title} complete. ${state.petName} gained confidence and world energy.`);
    DOM.feedbackText.textContent = `${title} complete. Rewards were added to your pet's meters.`;
    state.petSpeech = makePetSpeech(true);
  }

  state.activeQuest = null;
  state.activeQuestion = null;
  state.cycleLength = 0;
  state.questionIndex = 0;
  state.currentQuestCorrect = 0;
  selectedChoiceValue = "";
  saveState();
  render();
}

function clearBoss() {
  const beforeStage = state.stageIndex;
  state.bossesCleared += 1;
  state.stageIndex = Math.min(STAGES.length - 1, state.stageIndex + 1);
  state.evolution = 15;
  state.hunger = clamp(state.hunger + 10);
  state.energy = clamp(state.energy + 12);
  state.mood = clamp(state.mood + 14);
  state.cycleHistory = { multiplication: 0, fractions: 0, geometry: 0 };
  state.zoneIndex = Math.min(unlockedZones().length - 1, state.zoneIndex + 1);
  if (state.stageIndex > beforeStage) {
    addMilestone(`${state.petName} evolved into ${currentStage().name} and restored ${currentZone().name}.`);
    DOM.feedbackText.textContent = `${state.petName} evolved into ${currentStage().name}! A new habitat is now open.`;
    state.petSpeech = `${state.petName} is glowing with new power!`;
  } else {
    addMilestone(`${state.petName} mastered another boss quest and made the world brighter.`);
    DOM.feedbackText.textContent = `${state.petName} completed a master challenge and earned a rare sparkle burst.`;
    state.petSpeech = `${state.petName} shimmers proudly after another master challenge.`;
  }
}

function makePositiveFeedback(type) {
  if (type === "multiplication") {
    return "Correct. Snack trees are blooming and your chain streak is growing.";
  }
  if (type === "fractions") {
    return "Correct. A section of the bridge lights up and the path grows steadier.";
  }
  if (type === "geometry") {
    return "Correct. New shapes click into place and the habitat looks brighter.";
  }
  return "Correct. The boss arena fills with evolution energy.";
}

function makePetSpeech(correct) {
  if (!correct) {
    return `${state.petName} says, "Let's slow down and try the next one together."`;
  }
  if (state.stageIndex === 0) {
    return `${state.petName} wiggles happily inside the egg.`;
  }
  if (state.stageIndex === 1) {
    return `${state.petName} chirps and hops with excitement.`;
  }
  if (state.stageIndex === 2) {
    return `${state.petName} beams and points toward a new trail.`;
  }
  return `${state.petName} glides in a proud circle above the habitat.`;
}

function moodTier() {
  const average = (state.hunger + state.energy + state.mood) / 3;
  if (average < 45) {
    return "low";
  }
  if (average > 80) {
    return "great";
  }
  return "okay";
}

function nextUnlockText() {
  if (bossReady()) {
    return {
      line: "Boss challenge ready",
      hint: "Complete the mixed mastery quest to evolve your pet.",
    };
  }

  const nextZone = ZONES.find((zone) => zone.unlockBosses === state.bossesCleared + 1);
  if (nextZone) {
    return {
      line: nextZone.name,
      hint: "Balance the three quest types and fill evolution to unlock it.",
    };
  }

  return {
    line: "Rare sparkle rewards",
    hint: "Your pet is fully evolved. Keep practicing for extra decorations.",
  };
}

function renderQuestInterface() {
  const question = state.activeQuestion;
  const questType = state.activeQuest;

  DOM.challengeTitle.textContent = questType ? formatQuestTitle(questType) : "Pick a quest to begin";
  DOM.questionCounter.textContent = state.cycleLength
    ? `${Math.min(state.questionIndex + 1, state.cycleLength)} / ${state.cycleLength}`
    : "0 / 0";

  if (!question) {
    DOM.challengePrompt.textContent =
      "Each quest turns math into something useful for your pet. Start with multiplication for a quick hatch boost.";
    DOM.questionType.textContent = "Quest ready";
    DOM.questionText.textContent =
      "Your pet is waiting for its first math-powered adventure.";
    DOM.fractionVisuals.innerHTML = "";
    DOM.choiceGrid.innerHTML = "";
    DOM.answerInput.value = "";
    DOM.answerInput.placeholder = "Type your answer";
    DOM.answerInput.disabled = true;
    return;
  }

  DOM.challengePrompt.textContent = question.helper;
  DOM.questionType.textContent = question.category;
  DOM.questionText.textContent = question.prompt;
  DOM.answerInput.disabled = question.kind === "choice";
  DOM.answerInput.placeholder = question.kind === "choice" ? "Use the buttons below" : "Type your answer";
  DOM.answerInput.value = "";

  if (question.fractions) {
    renderFractionVisuals(question.fractions);
  } else {
    DOM.fractionVisuals.innerHTML = "";
  }

  if (question.kind === "choice") {
    renderChoices(question.choices);
  } else {
    DOM.choiceGrid.innerHTML = "";
  }
}

function renderFractionVisuals(fractions) {
  DOM.fractionVisuals.innerHTML = fractions
    .map((fraction) => {
      const bars = Array.from({ length: fraction.denominator }, (_, index) => {
        const filled = index < fraction.numerator ? "fraction-segment filled" : "fraction-segment";
        return `<span class="${filled}"></span>`;
      }).join("");
      return `
        <div class="fraction-card">
          <strong>${fraction.label}</strong>
          <div class="fraction-bar">${bars}</div>
        </div>
      `;
    })
    .join("");
}

function renderChoices(choices) {
  DOM.choiceGrid.innerHTML = choices
    .map((choice) => {
      const selectedClass = selectedChoiceValue === choice ? "selected" : "";
      return `<button class="${selectedClass}" data-choice="${choice}" type="button">${choice}</button>`;
    })
    .join("");
}

function renderRewards() {
  const { food, energy, mood, sparkles } = state.lastRewards;
  DOM.rewardStrip.innerHTML = [
    `Food ${food >= 0 ? "+" : ""}${food}`,
    `Energy ${energy >= 0 ? "+" : ""}${energy}`,
    `Mood ${mood >= 0 ? "+" : ""}${mood}`,
    `Sparkles ${sparkles >= 0 ? "+" : ""}${sparkles}`,
  ]
    .map((label) => `<div class="reward-pill">${label}</div>`)
    .join("");
}

function renderZones() {
  DOM.zoneList.innerHTML = ZONES.map((zone, index) => {
    const unlocked = zone.unlockBosses <= state.bossesCleared;
    const active = currentZone().id === zone.id;
    const statusLabel = unlocked ? (active ? "Current habitat" : "Unlocked") : "Locked";
    return `
      <article class="zone-card ${unlocked ? "" : "locked"}">
        <div class="zone-marker" style="background:${zone.color}">${zone.icon}</div>
        <div>
          <h3>${zone.name}</h3>
          <p>${zone.summary}</p>
        </div>
        <span class="zone-tag">${statusLabel}</span>
      </article>
    `;
  }).join("");
}

function renderMilestones() {
  DOM.milestoneCount.textContent = `${state.milestoneLog.length} moments`;
  DOM.milestoneList.innerHTML = state.milestoneLog
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function renderDecorations() {
  DOM.sceneDecorations.innerHTML = state.decorations
    .map((decorationId, index) => {
      const definition = DECORATIONS.find((item) => item.id === decorationId);
      const left = 10 + ((index * 17) % 75);
      const delay = (index % 3) * 0.4;
      return `<div class="decoration ${definition.type}" style="left:${left}%;animation-delay:${delay}s" title="${definition.label}"></div>`;
    })
    .join("");
}

function renderHabitatTheme() {
  const egg = EGG_TYPES[state.eggType] || EGG_TYPES.sun;
  const zone = currentZone();
  let sceneGradient =
    "linear-gradient(180deg, rgba(255, 245, 205, 0.68), rgba(139, 210, 255, 0.7)), linear-gradient(180deg, #fff5c3, #9edbff)";

  if (egg.habitatHue === "tide") {
    sceneGradient =
      "linear-gradient(180deg, rgba(219, 246, 255, 0.76), rgba(120, 196, 255, 0.78)), linear-gradient(180deg, #eaf8ff, #8ac4ff)";
  } else if (egg.habitatHue === "grove") {
    sceneGradient =
      "linear-gradient(180deg, rgba(239, 255, 214, 0.76), rgba(156, 223, 150, 0.78)), linear-gradient(180deg, #fbffd9, #8adf89)";
  }

  if (zone.id === "sky") {
    sceneGradient =
      "linear-gradient(180deg, rgba(255, 235, 198, 0.82), rgba(255, 159, 131, 0.72)), linear-gradient(180deg, #fff5d8, #ffae7c)";
  }

  DOM.habitatScene.style.background = sceneGradient;
  DOM.petAvatar.style.setProperty("--pet-top", egg.colors[0]);
  DOM.petAvatar.style.setProperty("--pet-bottom", egg.colors[1]);
}

function renderBossState() {
  if (bossReady()) {
    DOM.bossTitle.textContent = "World boss awakened";
    DOM.bossHint.textContent =
      "Your pet has enough balanced practice to attempt the evolution challenge.";
    DOM.bossButton.disabled = false;
    DOM.bossButton.textContent = "Start Boss Quest";
    return;
  }

  const questsNeeded = ["multiplication", "fractions", "geometry"]
    .filter((key) => state.cycleHistory[key] < 1)
    .map(formatQuestTitle);

  DOM.bossTitle.textContent = "Not ready yet";
  DOM.bossHint.textContent =
    state.evolution < 100
      ? `Fill the evolution meter first. Current growth: ${state.evolution}%.`
      : `Complete one more round of: ${questsNeeded.join(", ")}.`;
  DOM.bossButton.disabled = true;
  DOM.bossButton.textContent = "Boss Locked";
}

function render() {
  const stage = currentStage();
  const zone = currentZone();
  const nextUnlock = nextUnlockText();
  const averageNeeds = Math.round((state.hunger + state.energy + state.mood) / 3);

  DOM.habitatName.textContent = zone.name;
  DOM.stageChip.textContent = stage.chip;
  DOM.zoneChip.textContent = `Zone ${state.bossesCleared + 1}`;
  DOM.petNameLabel.textContent = state.petName || stage.name;
  DOM.petMoodLine.textContent = state.petName
    ? `${state.petName} feels ${moodDescription()} and is ${EGG_TYPES[state.eggType]?.personality || "ready for adventure"}.`
    : "A future friend is waiting to hatch.";
  DOM.petSpeech.textContent = state.petName
    ? state.petSpeech || `${state.petName} is ${petNeedLine(averageNeeds)}`
    : "Choose an egg to begin.";

  DOM.petAvatar.dataset.stage = stage.petClass;
  DOM.petAvatar.dataset.mood = moodTier();
  DOM.petAvatar.classList.toggle("has-star", state.stageIndex >= 1);
  DOM.petAvatar.classList.toggle("has-leaf", state.stageIndex >= 2);

  DOM.hungerValue.textContent = `${state.hunger}%`;
  DOM.energyValue.textContent = `${state.energy}%`;
  DOM.moodValue.textContent = `${state.mood}%`;
  DOM.evolutionValue.textContent = `${state.evolution}%`;
  DOM.hungerMeter.style.width = `${state.hunger}%`;
  DOM.energyMeter.style.width = `${state.energy}%`;
  DOM.moodMeter.style.width = `${state.mood}%`;
  DOM.evolutionMeter.style.width = `${state.evolution}%`;
  DOM.sparkValue.textContent = String(state.sparkles);
  DOM.streakValue.textContent = String(state.streak);
  DOM.streakLine.textContent =
    state.streak > 0 ? `${state.streak} correct in a row. Keep the chain going.` : "Answer correctly to build a chain.";
  DOM.unlockLine.textContent = nextUnlock.line;
  DOM.unlockHint.textContent = nextUnlock.hint;

  renderHabitatTheme();
  renderDecorations();
  renderQuestInterface();
  renderRewards();
  renderZones();
  renderMilestones();
  renderBossState();

  if (!state.petName) {
    openSetup();
  }
}

function petNeedLine(averageNeeds) {
  if (averageNeeds < 45) {
    return "a little tired and needs a helpful quest.";
  }
  if (averageNeeds > 82) {
    return "glowing with confidence and ready for a big challenge.";
  }
  return "ready for another round of math adventure.";
}

function moodDescription() {
  if (state.mood < 40) {
    return "a bit uncertain";
  }
  if (state.mood > 80) {
    return "joyful";
  }
  return "curious";
}

function openSetup() {
  updateEggSelectionUI();
  if (!DOM.setupModal.open) {
    DOM.petNameInput.value = state.petName || "";
    DOM.setupModal.showModal();
  }
}

function closeSetup() {
  if (DOM.setupModal.open) {
    DOM.setupModal.close();
  }
}

function updateEggSelectionUI() {
  document.querySelectorAll(".egg-option").forEach((button) => {
    button.classList.toggle("selected", button.dataset.egg === selectedEgg);
  });
}

document.querySelectorAll(".quest-button").forEach((button) => {
  button.addEventListener("click", () => {
    startQuest(button.dataset.quest);
  });
});

DOM.bossButton.addEventListener("click", () => {
  if (bossReady()) {
    startQuest("boss");
  }
});

DOM.answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.activeQuestion) {
    return;
  }

  const answer =
    state.activeQuestion.kind === "choice" ? selectedChoiceValue : DOM.answerInput.value;

  if (!String(answer).trim()) {
    DOM.feedbackCard.classList.remove("good");
    DOM.feedbackCard.classList.add("bad");
    DOM.feedbackText.textContent = "Enter an answer or choose one of the buttons first.";
    return;
  }

  checkAnswer(answer);
});

DOM.choiceGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) {
    return;
  }
  selectedChoiceValue = button.dataset.choice;
  renderChoices(state.activeQuestion.choices);
});

document.querySelectorAll(".egg-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedEgg = button.dataset.egg;
    updateEggSelectionUI();
  });
});

DOM.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const proposedName = DOM.petNameInput.value.trim();
  if (!proposedName) {
    DOM.petNameInput.focus();
    return;
  }

  const nextName = proposedName.slice(0, 18);
  state.petName = nextName;
  state.eggType = selectedEgg;
  state.milestoneLog = [
    `${nextName} the ${EGG_TYPES[selectedEgg].label} joined the habitat.`,
    ...state.milestoneLog,
  ].slice(0, 8);
  state.petSpeech = `${nextName} is ready for the first hatch quest.`;
  DOM.feedbackCard.classList.remove("bad");
  DOM.feedbackCard.classList.add("good");
  DOM.feedbackText.textContent = `${nextName} is ready. Try a multiplication quest to start hatching the egg.`;
  closeSetup();
  saveState();
  render();
});

DOM.helpButton.addEventListener("click", () => {
  DOM.helpModal.showModal();
});

DOM.closeHelpButton.addEventListener("click", () => {
  DOM.helpModal.close();
});

DOM.resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("Start over with a brand new egg? This clears current progress.");
  if (!confirmed) {
    return;
  }

  const fresh = createFreshState();
  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, fresh);
  selectedEgg = "sun";
  DOM.petNameInput.value = "";
  saveState();
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && DOM.helpModal.open) {
    DOM.helpModal.close();
  }
});

render();
