const LEGACY_STORAGE_KEY = "math-pet-evolution-save-v1";
const PROFILE_INDEX_KEY = "math-pet-evolution-profiles-v1";
const ACTIVE_PROFILE_KEY = "math-pet-evolution-active-profile-v1";
const PROFILE_SAVE_PREFIX = "math-pet-evolution-profile-save-v1:";
const MAX_PROFILE_COUNT = 6;
const MAX_PROFILE_NAME_LENGTH = 18;
const FIRST_HATCH_SOLVED_TARGET = 4;
const QUEST_PASS_TARGET = 4;
const QUEST_SEQUENCE = ["multiplication", "fractions", "geometry"];
const QUEST_BUTTON_LABELS = {
  multiplication: "Start Number Quest",
  fractions: "Cross the Bridge",
  geometry: "Build Upgrade",
};
const LESSONS = {
  basicMultiply: {
    topic: "Multiply",
    title: "Equal Groups and Arrays",
    intro: "Use rows and equal groups to see multiplication as a fast way to count.",
    steps: [
      "Look for rows and columns, like 3 rows of 4 stars.",
      "Multiply rows x stars in each row: 3 x 4 = 12.",
      "You can also count by repeated addition: 4 + 4 + 4 = 12.",
    ],
    visual: {
      type: "multiply-array",
      rows: 3,
      columns: 4,
      total: 12,
    },
  },
  multiDigitMultiply: {
    topic: "Multiply",
    title: "Break Apart a Bigger Product",
    intro: "When the numbers get bigger, split a factor into tens and ones so each part is easier to multiply.",
    steps: [
      "For 24 x 16, split 16 into 10 and 6.",
      "Multiply 24 x 10 = 240 and 24 x 6 = 144.",
      "Add the partial products: 240 + 144 = 384.",
    ],
    visual: {
      type: "multiply-grid",
      leftFactor: 24,
      topParts: [10, 6],
      partials: [240, 144],
      total: 384,
    },
  },
  fractionCompare: {
    topic: "Fractions",
    title: "Compare Fractions on the Bridge",
    intro: "Change the fractions so they use the same denominator, then compare the two bars.",
    steps: [
      "Change 3/4 into eighths: 3/4 = 6/8.",
      "Now compare 6/8 and 5/8. Since 6 eighths is more than 5 eighths, 3/4 > 5/8.",
      "Matching denominators makes it easier to see which fraction is greater.",
    ],
    visual: {
      type: "fraction-compare",
      left: { numerator: 3, denominator: 4, label: "3/4" },
      right: { numerator: 5, denominator: 8, label: "5/8" },
      equivalentLeft: "6/8",
      symbol: ">",
    },
  },
  equivalentFraction: {
    topic: "Fractions",
    title: "Build an Equivalent Fraction",
    intro: "Equivalent fractions keep the same value because the numerator and denominator are scaled by the same number.",
    steps: [
      "Start with 2/3.",
      "Multiply the numerator and denominator by 2 to get 4/6.",
      "Because both parts were multiplied by the same number, the size stayed the same.",
    ],
    visual: {
      type: "fraction-scale",
      start: "2/3",
      scale: "x 2",
      result: "4/6",
    },
  },
  divisionWhole: {
    topic: "Division",
    title: "Long Division with a Whole-Number Answer",
    intro: "Divide one place value at a time and stop when nothing is left over.",
    steps: [
      "4 goes into 8 two times, so write 2 in the tens place.",
      "Subtract 8, bring down the 4, then 4 goes into 4 one time.",
      "The answer is 21. Check with 21 x 4 = 84.",
    ],
    visual: {
      type: "division-board",
      divisor: 4,
      dividend: 84,
      quotient: "21",
      work: ["8 - 8 = 0", "bring down 4", "4 - 4 = 0"],
    },
  },
  divisionRemainder: {
    topic: "Division",
    title: "Long Division with a Remainder",
    intro: "Sometimes there are pieces left over. When that happens, write the quotient and then the remainder.",
    steps: [
      "5 goes into 6 one time, so write 1 above the 6.",
      "Subtract 5, bring down the 7, and 5 goes into 17 three times.",
      "Subtract 15 to get 2 left over, so 67 ÷ 5 = 13 R 2.",
    ],
    visual: {
      type: "division-board",
      divisor: 5,
      dividend: 67,
      quotient: "13 R 2",
      work: ["6 - 5 = 1", "bring down 7", "17 - 15 = 2"],
    },
  },
  divisionDecimal: {
    topic: "Division",
    title: "Long Division into Decimals",
    intro: "Keep dividing by adding a decimal point and zeros when the division does not come out even.",
    steps: [
      "4 goes into 17 four times, so subtract 16 and get remainder 1.",
      "Place a decimal point in the quotient, bring down a 0, and divide 10 by 4 to get 2.",
      "Bring down another 0, divide 20 by 4 to get 5, so 17 ÷ 4 = 4.25.",
    ],
    visual: {
      type: "division-board",
      divisor: 4,
      dividend: 17,
      quotient: "4.25",
      work: ["17 - 16 = 1", "10 ÷ 4 = 2 R 2", "20 ÷ 4 = 5"],
    },
  },
  fractionDecimal: {
    topic: "Decimals",
    title: "Turn a Fraction into a Decimal",
    intro: "Change the fraction to hundredths or divide the numerator by the denominator.",
    steps: [
      "Start with 3/4.",
      "Rewrite it as 75/100, or divide 3 by 4 to get 0.75.",
      "That means 3/4 and 0.75 name the same amount.",
    ],
    visual: {
      type: "fraction-decimal",
      fraction: "3/4",
      bridge: "75/100",
      decimal: "0.75",
    },
  },
  geometryMeasure: {
    topic: "Measure",
    title: "Area and Perimeter",
    intro: "The same rectangle can teach both area and perimeter. The key is knowing whether the problem asks for inside space or outside distance.",
    steps: [
      "Area means the space inside, so 6 x 4 = 24 square units.",
      "Perimeter means the distance around, so 6 + 6 + 4 + 4 = 20 units.",
      "Ask: does the question want inside space or distance around the outside?",
    ],
    visual: {
      type: "rectangle-measure",
      width: 6,
      height: 4,
      area: 24,
      perimeter: 20,
    },
  },
  geometryComposite: {
    topic: "Measure",
    title: "Split a Composite Shape",
    intro: "Break the big shape into smaller rectangles, then add their areas.",
    steps: [
      "Find the area of the left rectangle: 3 x 4 = 12.",
      "Find the area of the right rectangle: 5 x 4 = 20.",
      "Add 12 + 20 to get a total area of 32 square units.",
    ],
    visual: {
      type: "composite-area",
      leftWidth: 3,
      rightWidth: 5,
      height: 4,
      leftArea: 12,
      rightArea: 20,
      total: 32,
    },
  },
  algebraEquation: {
    topic: "Algebra",
    title: "Solve a One-Step Equation",
    intro: "Undo the operation to isolate x.",
    steps: [
      "Start with x + 7 = 19.",
      "Subtract 7 from both sides so the equation stays balanced.",
      "That leaves x = 12.",
    ],
    visual: {
      type: "algebra-balance",
      equation: "x + 7 = 19",
      action: "- 7 both sides",
      result: "x = 12",
    },
  },
};
const ZONE_LESSON_KEYS = {
  nest: ["basicMultiply"],
  bridge: ["fractionCompare", "equivalentFraction"],
  grove: ["geometryMeasure"],
  sky: ["multiDigitMultiply", "geometryMeasure"],
  dunes: ["divisionWhole", "divisionRemainder"],
  caverns: ["fractionCompare", "fractionDecimal"],
  meadow: ["geometryMeasure", "geometryComposite"],
  citadel: ["divisionDecimal", "fractionDecimal", "algebraEquation"],
};

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
  },
  {
    id: "hatchling",
    name: "Glow Dragonling",
    chip: "Dragonling",
    petClass: "hatchling",
  },
  {
    id: "sprout",
    name: "Trail Drake",
    chip: "Drake",
    petClass: "sprout",
  },
  {
    id: "glider",
    name: "Sky Wyvern",
    chip: "Wyvern",
    petClass: "glider",
  },
  {
    id: "sage",
    name: "Prism Sage",
    chip: "Sage",
    petClass: "glider",
  },
  {
    id: "nova",
    name: "Nova Runner",
    chip: "Nova",
    petClass: "glider",
  },
  {
    id: "aurora",
    name: "Aurora Starwing",
    chip: "Mythic",
    petClass: "glider",
  },
  {
    id: "legend",
    name: "Celestial Legend",
    chip: "Legend",
    petClass: "glider",
  },
];

const ZONES = [
  {
    id: "nest",
    name: "Sunny Nest",
    icon: "Sun",
    color: "linear-gradient(135deg, #ffad50, #ffd65b)",
    unlockBosses: 0,
    summary: "The first cozy home where the egg waits to hatch.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 245, 205, 0.68), rgba(139, 210, 255, 0.7)), linear-gradient(180deg, #fff5c3, #9edbff)",
  },
  {
    id: "bridge",
    name: "Fraction Bridge",
    icon: "vs",
    color: "linear-gradient(135deg, #47c5e7, #7fd8ff)",
    unlockBosses: 1,
    summary: "A sparkling crossing rebuilt with smart fraction choices.",
    sceneGradient:
      "linear-gradient(180deg, rgba(219, 246, 255, 0.76), rgba(120, 196, 255, 0.78)), linear-gradient(180deg, #eaf8ff, #8ac4ff)",
  },
  {
    id: "grove",
    name: "Shape Grove",
    icon: "Tri",
    color: "linear-gradient(135deg, #72c46e, #c3f38a)",
    unlockBosses: 2,
    summary: "A habitat filled with geometry towers and playful patterns.",
    sceneGradient:
      "linear-gradient(180deg, rgba(239, 255, 214, 0.76), rgba(156, 223, 150, 0.78)), linear-gradient(180deg, #fbffd9, #8adf89)",
  },
  {
    id: "sky",
    name: "Starfall Sky",
    icon: "*",
    color: "linear-gradient(135deg, #ff8d7e, #ffc65f)",
    unlockBosses: 3,
    summary: "A high-altitude world where harder mixed quests begin to shine.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 235, 198, 0.82), rgba(255, 159, 131, 0.72)), linear-gradient(180deg, #fff5d8, #ffae7c)",
  },
  {
    id: "dunes",
    name: "Division Dunes",
    icon: "Div",
    color: "linear-gradient(135deg, #f5b15e, #ffe59a)",
    unlockBosses: 4,
    summary: "Ancient sand wheels spin when long division answers are exact.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 239, 196, 0.78), rgba(237, 196, 111, 0.78)), linear-gradient(180deg, #fff6d9, #e6b867)",
  },
  {
    id: "caverns",
    name: "Crystal Caverns",
    icon: "Gem",
    color: "linear-gradient(135deg, #59bfc2, #9fe6dc)",
    unlockBosses: 5,
    summary: "Echoing tunnels reward equivalent fractions and hidden number patterns.",
    sceneGradient:
      "linear-gradient(180deg, rgba(214, 252, 249, 0.8), rgba(95, 185, 183, 0.82)), linear-gradient(180deg, #effffd, #72cbc5)",
  },
  {
    id: "meadow",
    name: "Measure Meadow",
    icon: "Met",
    color: "linear-gradient(135deg, #89c86a, #dcf59f)",
    unlockBosses: 6,
    summary: "Perimeter trails and composite gardens stretch every measurement skill.",
    sceneGradient:
      "linear-gradient(180deg, rgba(235, 255, 215, 0.8), rgba(151, 216, 117, 0.82)), linear-gradient(180deg, #f7ffe4, #97d86e)",
  },
  {
    id: "citadel",
    name: "Aurora Citadel",
    icon: "Arc",
    color: "linear-gradient(135deg, #ff8d78, #ffd772)",
    unlockBosses: 7,
    summary: "The final world blends advanced multiplication, division, fractions, and geometry in master quests.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 234, 215, 0.82), rgba(255, 176, 126, 0.82)), linear-gradient(180deg, #fff9ea, #ffb46d)",
  },
];

const DECORATIONS = [
  { id: "flower", label: "Blossom patch", type: "flower" },
  { id: "crystal", label: "Bridge crystal", type: "crystal" },
  { id: "mushroom", label: "Mushroom stool", type: "mushroom" },
  { id: "flower-two", label: "Starlight bloom", type: "flower" },
  { id: "crystal-two", label: "Moon crystal", type: "crystal" },
  { id: "mushroom-two", label: "Forest mushroom", type: "mushroom" },
  { id: "flower-three", label: "Dune blossom", type: "flower" },
  { id: "crystal-three", label: "Cavern shard", type: "crystal" },
  { id: "mushroom-three", label: "Meadow toadstool", type: "mushroom" },
  { id: "flower-four", label: "Aurora bloom", type: "flower" },
  { id: "crystal-four", label: "Citadel prism", type: "crystal" },
  { id: "mushroom-four", label: "Starlit mushroom", type: "mushroom" },
];

const DOM = {
  playerChip: document.getElementById("playerChip"),
  switchPlayerButton: document.getElementById("switchPlayerButton"),
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
  lessonCard: document.getElementById("lessonCard"),
  lessonTitle: document.getElementById("lessonTitle"),
  lessonChip: document.getElementById("lessonChip"),
  lessonTopicRow: document.getElementById("lessonTopicRow"),
  lessonIntro: document.getElementById("lessonIntro"),
  lessonVisual: document.getElementById("lessonVisual"),
  lessonSteps: document.getElementById("lessonSteps"),
  zoneList: document.getElementById("zoneList"),
  milestoneList: document.getElementById("milestoneList"),
  milestoneCount: document.getElementById("milestoneCount"),
  profileModal: document.getElementById("profileModal"),
  profileList: document.getElementById("profileList"),
  profileEmptyState: document.getElementById("profileEmptyState"),
  profileCreateForm: document.getElementById("profileCreateForm"),
  profileNameInput: document.getElementById("profileNameInput"),
  profileHint: document.getElementById("profileHint"),
  createProfileButton: document.getElementById("createProfileButton"),
  closeProfileButton: document.getElementById("closeProfileButton"),
  setupModal: document.getElementById("setupModal"),
  setupForm: document.getElementById("setupForm"),
  petNameInput: document.getElementById("petNameInput"),
  helpModal: document.getElementById("helpModal"),
  helpButton: document.getElementById("helpButton"),
  closeHelpButton: document.getElementById("closeHelpButton"),
  resetButton: document.getElementById("resetButton"),
};

const state = createFreshState();

let profiles = [];
let currentProfileId = "";
let selectedEgg = "sun";
let selectedChoiceValue = "";
let selectedLessonKey = "";

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
    questPathStep: 0,
    activeQuest: null,
    activeQuestion: null,
    cycleLength: 0,
    questionIndex: 0,
    currentQuestCorrect: 0,
    petSpeech: "Choose an egg to begin.",
    feedbackMessage: "Your pet will react here after each answer.",
    feedbackTone: "neutral",
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
    questPathStep: clamp(savedState.questPathStep ?? fresh.questPathStep, 0, QUEST_SEQUENCE.length),
    lastRewards: {
      ...fresh.lastRewards,
      ...(savedState.lastRewards || {}),
    },
    decorations: Array.isArray(savedState.decorations) ? savedState.decorations : fresh.decorations,
    milestoneLog: Array.isArray(savedState.milestoneLog) ? savedState.milestoneLog : fresh.milestoneLog,
    stageIndex: clamp(savedState.stageIndex ?? fresh.stageIndex, 0, STAGES.length - 1),
    zoneIndex: Math.max(0, savedState.zoneIndex ?? fresh.zoneIndex),
    feedbackMessage: savedState.feedbackMessage || fresh.feedbackMessage,
    feedbackTone: savedState.feedbackTone || fresh.feedbackTone,
  };
}

function replaceState(nextState) {
  const hydrated = hydrateState(nextState);
  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, hydrated);
}

function loadJSON(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

function createProfileId() {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `player-${stamp}-${random}`;
}

function profileSaveKey(profileId) {
  return `${PROFILE_SAVE_PREFIX}${profileId}`;
}

function loadProfilesIndex() {
  const savedProfiles = loadJSON(PROFILE_INDEX_KEY);
  if (!Array.isArray(savedProfiles)) {
    return [];
  }

  return savedProfiles.filter((profile) => profile && typeof profile.id === "string" && typeof profile.name === "string");
}

function saveProfilesIndex() {
  saveJSON(PROFILE_INDEX_KEY, profiles);
}

function loadActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || "";
}

function setActiveProfileId(profileId) {
  currentProfileId = profileId;
  if (profileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

function getProfileById(profileId) {
  return profiles.find((profile) => profile.id === profileId) || null;
}

function getCurrentProfile() {
  return getProfileById(currentProfileId);
}

function touchCurrentProfile() {
  const currentProfile = getCurrentProfile();
  if (!currentProfile) {
    return;
  }

  currentProfile.lastPlayedAt = new Date().toISOString();
  saveProfilesIndex();
}

function loadProfileState(profileId) {
  return hydrateState(loadJSON(profileSaveKey(profileId)));
}

function saveState() {
  if (!currentProfileId) {
    return;
  }

  saveJSON(profileSaveKey(currentProfileId), state);
  touchCurrentProfile();
}

function migrateLegacySaveIfNeeded() {
  if (loadProfilesIndex().length > 0) {
    return;
  }

  const legacyState = loadJSON(LEGACY_STORAGE_KEY);
  if (!legacyState) {
    return;
  }

  const now = new Date().toISOString();
  const migratedProfile = {
    id: createProfileId(),
    name: "Player 1",
    createdAt: now,
    lastPlayedAt: now,
  };

  saveJSON(PROFILE_INDEX_KEY, [migratedProfile]);
  localStorage.setItem(ACTIVE_PROFILE_KEY, migratedProfile.id);
  saveJSON(profileSaveKey(migratedProfile.id), hydrateState(legacyState));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function profileSummary(profileId) {
  const profileState = loadProfileState(profileId);
  if (!profileState.petName) {
    return "No pet yet. Pick an egg to begin.";
  }

  const stage = STAGES[profileState.stageIndex] || STAGES[0];
  return `${profileState.petName} - ${stage.chip} - ${profileState.sparkles} sparkles`;
}

function setProfileHint(text, tone = "neutral") {
  DOM.profileHint.textContent = text;
  DOM.profileHint.classList.remove("good", "bad");
  if (tone === "good" || tone === "bad") {
    DOM.profileHint.classList.add(tone);
  }
}

function renderProfileChooser() {
  const limitReached = profiles.length >= MAX_PROFILE_COUNT;

  DOM.profileList.innerHTML = profiles
    .map((profile) => {
      const isActive = profile.id === currentProfileId;
      const statusLabel = isActive ? "Playing now" : "Open save";
      const profileClass = isActive ? "profile-option active" : "profile-option";
      return `
        <button class="${profileClass}" data-profile-id="${profile.id}" type="button">
          <span class="profile-option-top">
            <span class="profile-option-name">${escapeHtml(profile.name)}</span>
            <span class="profile-status-chip">${statusLabel}</span>
          </span>
          <span class="profile-option-summary">${escapeHtml(profileSummary(profile.id))}</span>
        </button>
      `;
    })
    .join("");

  DOM.profileEmptyState.hidden = profiles.length > 0;
  DOM.createProfileButton.disabled = limitReached;
  DOM.profileNameInput.disabled = limitReached;
  DOM.closeProfileButton.hidden = !currentProfileId;

  if (limitReached) {
    setProfileHint(`This browser already has ${MAX_PROFILE_COUNT} player profiles.`, "bad");
  } else {
    setProfileHint("Each player gets a separate save slot on this browser.");
  }
}

function closeSetup() {
  if (DOM.setupModal.open) {
    DOM.setupModal.close();
  }
}

function openProfileChooser() {
  closeSetup();
  renderProfileChooser();
  if (!DOM.profileModal.open) {
    DOM.profileModal.showModal();
  }
}

function closeProfileChooser() {
  if (DOM.profileModal.open) {
    DOM.profileModal.close();
  }
}

function activateProfile(profileId) {
  if (!getProfileById(profileId)) {
    return;
  }

  closeProfileChooser();
  setActiveProfileId(profileId);
  replaceState(loadProfileState(profileId));
  selectedEgg = state.eggType || "sun";
  selectedChoiceValue = "";
  DOM.profileNameInput.value = "";
  DOM.petNameInput.value = state.petName || "";
  saveState();
  render();
}

function createProfile(profileName) {
  const normalizedName = profileName.trim().replace(/\s+/g, " ").slice(0, MAX_PROFILE_NAME_LENGTH);

  if (!normalizedName) {
    setProfileHint("Enter a player name first.", "bad");
    DOM.profileNameInput.focus();
    return;
  }

  if (profiles.length >= MAX_PROFILE_COUNT) {
    setProfileHint(`This browser already has ${MAX_PROFILE_COUNT} player profiles.`, "bad");
    return;
  }

  const duplicate = profiles.find(
    (profile) => profile.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (duplicate) {
    setProfileHint("That player name already exists. Pick a different one.", "bad");
    DOM.profileNameInput.focus();
    return;
  }

  const now = new Date().toISOString();
  const profile = {
    id: createProfileId(),
    name: normalizedName,
    createdAt: now,
    lastPlayedAt: now,
  };

  profiles = [...profiles, profile];
  saveProfilesIndex();
  setActiveProfileId(profile.id);
  replaceState(createFreshState());
  selectedEgg = "sun";
  selectedChoiceValue = "";
  DOM.profileNameInput.value = "";
  DOM.petNameInput.value = "";
  saveState();
  closeProfileChooser();
  render();
}

function initializeGame() {
  migrateLegacySaveIfNeeded();
  profiles = loadProfilesIndex();

  const storedActiveProfileId = loadActiveProfileId();
  const fallbackProfileId = profiles[0] ? profiles[0].id : "";
  const nextActiveProfileId = profiles.some((profile) => profile.id === storedActiveProfileId)
    ? storedActiveProfileId
    : fallbackProfileId;

  setActiveProfileId(nextActiveProfileId);

  if (currentProfileId) {
    replaceState(loadProfileState(currentProfileId));
  } else {
    replaceState(createFreshState());
  }

  selectedEgg = state.eggType || "sun";
  selectedChoiceValue = "";
  render();
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
  return state.questPathStep >= QUEST_SEQUENCE.length && state.evolution >= 100;
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
  const totalSolved = totalSolvedCount();
  return Math.min(10, 1 + state.bossesCleared + Math.floor(totalSolved / 10));
}

function compareFractions(aNum, aDen, bNum, bDen) {
  const left = aNum * bDen;
  const right = bNum * aDen;
  if (left === right) {
    return "=";
  }
  return left > right ? ">" : "<";
}

function greatestCommonDivisor(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }

  return left || 1;
}

function formatDecimal(value, places = 3) {
  return Number(value.toFixed(places)).toString();
}

function fractionToDecimalString(numerator, denominator) {
  return formatDecimal(numerator / denominator);
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function toImproperFraction(whole, numerator, denominator) {
  return whole * denominator + numerator;
}

function formatQuestTitle(key) {
  if (key === "multiplication") {
    return "Number Forge";
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

function nextQuestInPath() {
  return QUEST_SEQUENCE[state.questPathStep] || null;
}

function questStepIndex(type) {
  return QUEST_SEQUENCE.indexOf(type);
}

function resetQuestPath() {
  state.questPathStep = 0;
  state.cycleHistory = { multiplication: 0, fractions: 0, geometry: 0 };
}

function advanceQuestPath(type) {
  if (type === nextQuestInPath()) {
    state.questPathStep = Math.min(QUEST_SEQUENCE.length, state.questPathStep + 1);
  }
}

function questCardState(type) {
  if (!currentProfileId || !state.petName) {
    return "locked";
  }

  if (state.activeQuest === type) {
    return "active";
  }

  const stepIndex = questStepIndex(type);
  if (stepIndex !== -1 && stepIndex < state.questPathStep) {
    return "completed";
  }

  if (!state.activeQuest && type === nextQuestInPath()) {
    return "available";
  }

  return "locked";
}

function totalSolvedCount() {
  return Object.values(state.questHistory).reduce((sum, count) => sum + count, 0);
}

function hatchAnswersRemaining() {
  return Math.max(FIRST_HATCH_SOLVED_TARGET - totalSolvedCount(), 0);
}

function readyToHatch() {
  return Boolean(state.petName) && state.stageIndex === 0 && hatchAnswersRemaining() === 0;
}

function triggerFirstHatch() {
  if (!readyToHatch()) {
    return false;
  }

  state.stageIndex = 1;
  state.hunger = clamp(state.hunger + 8);
  state.energy = clamp(state.energy + 10);
  state.mood = clamp(state.mood + 14);
  addMilestone(`Crack! ${state.petName} hatched into a ${currentStage().name}.`);
  state.feedbackMessage = `Crack! ${state.petName} hatched into a ${currentStage().name}. Your baby dragon is finally here.`;
  state.feedbackTone = "good";
  state.petSpeech = `${state.petName} squeaks, flaps tiny dragon wings, and looks around the habitat in surprise.`;
  return true;
}

function idleQuestState() {
  const totalSolved = totalSolvedCount();
  const recentMilestone = state.milestoneLog[0] || "A new adventure is waiting.";

  if (!state.petName) {
    return {
      counter: "0 solved",
      prompt: "Each quest turns math into something useful for your pet. Start with Number Forge for a quick hatch boost.",
      type: "First quest ready",
      text: "Your pet is waiting for its first math-powered adventure.",
    };
  }

  if (totalSolved === 0) {
    return {
      counter: "0 solved",
      prompt: `${state.petName} is ready to hatch. Start with a short Number Forge quest for a quick win.`,
      type: "First quest ready",
      text: `${state.petName} is ready for the first math-powered adventure.`,
    };
  }

  if (state.stageIndex === 0) {
    const remaining = hatchAnswersRemaining();
    return {
      counter: `${totalSolved} solved`,
      prompt:
        remaining > 0
          ? `${state.petName}'s egg is wobbling. Solve ${remaining} more correct answer${remaining === 1 ? "" : "s"} to hatch your dragon.`
          : `${state.petName}'s shell is cracking. Finish the current quest to hatch your dragon.`,
      type: "Egg progress",
      text: `${state.petName} is still inside the egg, but the shell is starting to crack.`,
    };
  }

  const nextQuest = nextQuestInPath();
  if (nextQuest) {
    const nextQuestTitle = formatQuestTitle(nextQuest);
    return {
      counter: `${totalSolved} solved`,
      prompt: `${state.petName} should do ${nextQuestTitle} next. Finish it to unlock the next quest in the path.`,
      type: "Quest path",
      text: `${nextQuestTitle} is the current quest to play.`,
    };
  }

  if (!bossReady()) {
    return {
      counter: `${totalSolved} solved`,
      prompt: `${state.petName} finished the three quest paths. Keep solving to charge the boss gate to 100%.`,
      type: "Boss charging",
      text: "All three quests are complete for this round. Fill evolution to unlock the boss challenge.",
    };
  }

  if (bossReady()) {
    return {
      counter: `${totalSolved} solved`,
      prompt: `${state.petName} is ready for a boss challenge. Recent milestone: ${recentMilestone}`,
      type: "Boss ready",
      text: `${state.petName} has already solved ${totalSolved} math challenge${totalSolved === 1 ? "" : "s"}. Choose a boss quest or keep training.`,
    };
  }

  return {
    counter: `${totalSolved} solved`,
    prompt: `Recent milestone: ${recentMilestone}`,
    type: "Adventure continues",
    text: `${state.petName} has already solved ${totalSolved} math challenge${totalSolved === 1 ? "" : "s"}. Pick the next quest to keep evolving.`,
  };
}

function startQuest(type) {
  if (!currentProfileId) {
    openProfileChooser();
    return;
  }

  if (!state.petName) {
    openSetup();
    return;
  }

  if (state.activeQuest === type) {
    return;
  }

  if (state.activeQuest) {
    state.feedbackMessage = `Finish ${formatQuestTitle(state.activeQuest)} before starting another quest.`;
    state.feedbackTone = "bad";
    renderFeedback();
    renderBossState();
    return;
  }

  if (type === "boss") {
    if (!bossReady()) {
      const nextQuest = nextQuestInPath();
      state.feedbackMessage = nextQuest
        ? `Finish ${formatQuestTitle(nextQuest)} next. The boss quest unlocks after all three quest paths are complete and evolution reaches 100%.`
        : `The boss path is unlocked, but evolution is only at ${state.evolution}%. Keep solving to charge it to 100%.`;
      state.feedbackTone = "bad";
      renderFeedback();
      renderBossState();
      return;
    }
  } else if (questCardState(type) !== "available") {
    const nextQuest = nextQuestInPath();
    state.feedbackMessage = nextQuest
      ? `${formatQuestTitle(nextQuest)} is the next quest in the path.`
      : "This quest is locked until the next round begins.";
    state.feedbackTone = "bad";
    renderFeedback();
    return;
  }

  state.activeQuest = type;
  state.cycleLength = type === "boss" ? 6 : 5;
  state.questionIndex = 0;
  state.streak = 0;
  state.currentQuestCorrect = 0;
  selectedChoiceValue = "";
  state.feedbackMessage = `${state.petName} is ready. Solve the next problem to help your pet grow.`;
  state.feedbackTone = "neutral";
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
  selectedLessonKey = state.activeQuestion?.lessonKey || "";
}

function generateMultiplicationQuestion(difficulty) {
  const zoneId = currentZone().id;

  if (zoneId === "citadel" && difficulty >= 9) {
    return shuffleArray([
      generateDecimalDivisionQuestion(difficulty),
      generateAlgebraEquationQuestion(difficulty),
      generateMultiDigitMultiplicationQuestion(difficulty + 1),
    ])[0];
  }

  if (["dunes", "caverns", "meadow", "citadel"].includes(zoneId) && difficulty >= 7) {
    return shuffleArray([
      generateDivisionQuestion(difficulty, true),
      generateRemainderDivisionQuestion(difficulty),
      generateMultiDigitMultiplicationQuestion(difficulty + 1),
    ])[0];
  }

  if (difficulty <= 2) {
    return generateBasicMultiplicationQuestion(difficulty);
  }

  if (difficulty <= 4) {
    return shuffleArray([
      generateBasicMultiplicationQuestion(difficulty + 1),
      generateScaledMultiplicationQuestion(difficulty),
      generateMissingFactorQuestion(difficulty),
    ])[0];
  }

  if (difficulty <= 6) {
    return shuffleArray([
      generateScaledMultiplicationQuestion(difficulty + 1),
      generateMultiDigitMultiplicationQuestion(difficulty),
      generateDivisionQuestion(difficulty, false),
    ])[0];
  }

  return shuffleArray([
    generateMultiDigitMultiplicationQuestion(difficulty + 1),
    generateDivisionQuestion(difficulty, true),
    generateLargeNumberStoryQuestion(difficulty),
  ])[0];
}

function generateBasicMultiplicationQuestion(difficulty) {
  const a = randomInt(2, 4 + difficulty * 2);
  const b = randomInt(2, 5 + difficulty * 2);
  const variants = [
    {
      prompt: `${a} x ${b}`,
      answer: String(a * b),
      helper: `Link ${state.questionIndex + 1}: grow a snack bundle with repeated groups.`,
    },
    {
      prompt: `A basket has ${a} rows with ${b} fruit stars in each row. How many fruit stars?`,
      answer: String(a * b),
      helper: "Multiply rows by stars in each row.",
    },
  ];

  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: "basicMultiply",
    ...variants[randomInt(0, variants.length - 1)],
  };
}

function generateScaledMultiplicationQuestion(difficulty) {
  const a = randomInt(12, 18 + difficulty * 4);
  const b = randomInt(3, 6 + Math.floor(difficulty / 2));
  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: difficulty <= 4 ? "basicMultiply" : "multiDigitMultiply",
    prompt: `${a} x ${b}`,
    answer: String(a * b),
    helper: "Break the bigger factor apart into tens and ones, then multiply each part.",
  };
}

function generateMissingFactorQuestion(difficulty) {
  const factor = randomInt(4, 9 + difficulty);
  const hidden = randomInt(3, 7 + difficulty);
  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: "divisionWhole",
    prompt: `A snack machine made ${factor * hidden} glowberries in ${factor} equal groups. How many glowberries were in each group?`,
    answer: String(hidden),
    helper: "Use the related division fact to find the missing factor.",
  };
}

function generateMultiDigitMultiplicationQuestion(difficulty) {
  if (difficulty >= 7) {
    const a = randomInt(24, 68);
    const b = randomInt(12, 29);
    return {
      kind: "numeric",
      category: "Number Forge",
      lessonKey: "multiDigitMultiply",
      prompt: `${a} x ${b}`,
      answer: String(a * b),
      helper: "Use partial products or the standard algorithm for multi-digit multiplication.",
    };
  }

  const a = randomInt(14, 39);
  const b = randomInt(11, 19);
  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: "multiDigitMultiply",
    prompt: `${a} x ${b}`,
    answer: String(a * b),
    helper: "Split one factor into tens and ones to multiply in parts.",
  };
}

function generateDivisionQuestion(difficulty, allowTwoDigitDivisor) {
  const divisor = allowTwoDigitDivisor ? randomInt(6, 12) : randomInt(3, 9);
  const quotient = allowTwoDigitDivisor ? randomInt(12, 48) : randomInt(8, 36);
  const dividend = divisor * quotient;
  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: "divisionWhole",
    prompt: `${dividend} ÷ ${divisor}`,
    answer: String(quotient),
    helper: allowTwoDigitDivisor
      ? "Use long division carefully. Each step should divide exactly with no remainder."
      : "Use multiplication facts to check the quotient.",
  };
}

function generateRemainderDivisionQuestion(difficulty) {
  const divisor = randomInt(4, Math.min(12, 7 + Math.floor(difficulty / 2)));
  const quotient = randomInt(6, 18 + difficulty);
  const remainder = randomInt(1, divisor - 1);
  const dividend = (divisor * quotient) + remainder;

  return {
    kind: "numeric",
    category: "Division",
    lessonKey: "divisionRemainder",
    answerType: "remainder",
    prompt: `${dividend} ÷ ${divisor}`,
    answer: `${quotient} R ${remainder}`,
    helper: "Use long division. Write the answer as quotient R remainder.",
  };
}

function generateDecimalDivisionQuestion(difficulty) {
  const divisorOptions = [4, 5, 8, 10];
  const divisor = divisorOptions[randomInt(0, divisorOptions.length - 1)];
  const whole = randomInt(2, 8 + Math.floor(difficulty / 2));
  const numerator = randomInt(1, divisor - 1);
  const dividend = (whole * divisor) + numerator;
  const answer = fractionToDecimalString(dividend, divisor);

  return {
    kind: "numeric",
    category: "Division",
    lessonKey: "divisionDecimal",
    answerType: "decimal",
    prompt: `${dividend} ÷ ${divisor}`,
    answer,
    helper: "Use long division. If there is a remainder, add a decimal point and keep dividing with zeros.",
  };
}

function generateAlgebraEquationQuestion(difficulty) {
  const templates = [
    () => {
      const addend = randomInt(6, 16);
      const answer = randomInt(8, 22 + difficulty);
      return {
        prompt: `Solve for x: x + ${addend} = ${answer + addend}`,
        answer: String(answer),
      };
    },
    () => {
      const subtractor = randomInt(4, 14);
      const answer = randomInt(10, 24 + difficulty);
      return {
        prompt: `Solve for x: x - ${subtractor} = ${answer - subtractor}`,
        answer: String(answer),
      };
    },
    () => {
      const factor = randomInt(3, 8);
      const answer = randomInt(4, 10 + Math.floor(difficulty / 2));
      return {
        prompt: `Solve for x: ${factor}x = ${factor * answer}`,
        answer: String(answer),
      };
    },
    () => {
      const divisor = randomInt(2, 8);
      const answer = randomInt(4, 12 + Math.floor(difficulty / 2));
      return {
        prompt: `Solve for x: x / ${divisor} = ${answer}`,
        answer: String(answer * divisor),
      };
    },
  ];

  const picked = templates[randomInt(0, templates.length - 1)]();
  return {
    kind: "numeric",
    category: "Algebra",
    lessonKey: "algebraEquation",
    ...picked,
    helper: "Undo the operation to isolate x. Whatever you do to one side, do to the other side too.",
  };
}

function generateLargeNumberStoryQuestion(difficulty) {
  const packs = randomInt(14, 28);
  const itemsPerPack = randomInt(16, 36);
  return {
    kind: "numeric",
    category: "Number Forge",
    lessonKey: "multiDigitMultiply",
    prompt: `A supply cart holds ${packs} boxes with ${itemsPerPack} lanterns in each box. How many lanterns are there in all?`,
    answer: String(packs * itemsPerPack),
    helper: "This is a larger multiplication problem. Organize the tens and ones before multiplying.",
  };
}

function generateFractionQuestion(difficulty) {
  const zoneId = currentZone().id;

  if (difficulty <= 3) {
    return generateFractionComparisonQuestion(difficulty, false);
  }

  if (zoneId === "caverns" || zoneId === "citadel" || difficulty >= 8) {
    return shuffleArray([
      generateFractionComparisonQuestion(difficulty, true),
      generateEquivalentFractionQuestion(difficulty + 1),
      generateFractionToDecimalQuestion(difficulty),
      generateMixedNumberComparisonQuestion(difficulty),
    ])[0];
  }

  if (difficulty <= 5) {
    return shuffleArray([
      generateFractionComparisonQuestion(difficulty, true),
      generateEquivalentFractionQuestion(difficulty),
    ])[0];
  }

  return shuffleArray([
    generateFractionComparisonQuestion(difficulty, true),
    generateEquivalentFractionQuestion(difficulty + 1),
    generateMixedNumberComparisonQuestion(difficulty),
  ])[0];
}

function generateFractionComparisonQuestion(difficulty, advanced) {
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

  if (advanced && randomInt(0, 2) === 0) {
    leftNum += leftDen;
  }

  if (advanced && randomInt(0, 2) === 1) {
    rightNum += rightDen;
  }

  const showVisuals = leftNum <= leftDen && rightNum <= rightDen;

  return {
    kind: "choice",
    category: "Fractions",
    lessonKey: "fractionCompare",
    prompt: `Which symbol makes the bridge true? ${leftNum}/${leftDen} ? ${rightNum}/${rightDen}`,
    answer: compareFractions(leftNum, leftDen, rightNum, rightDen),
    helper: "Choose <, >, or = after comparing the size of each fraction.",
    choices: ["<", ">", "="],
    fractions: showVisuals
      ? [
          { numerator: leftNum, denominator: leftDen, label: `${leftNum}/${leftDen}` },
          { numerator: rightNum, denominator: rightDen, label: `${rightNum}/${rightDen}` },
        ]
      : null,
  };
}

function generateEquivalentFractionQuestion(difficulty) {
  let baseDenominator = randomInt(2, 6 + Math.floor(difficulty / 2));
  let baseNumerator = randomInt(1, Math.max(1, baseDenominator - 1));
  const multiplier = randomInt(2, 4);

  while (greatestCommonDivisor(baseNumerator, baseDenominator) !== 1) {
    baseDenominator = randomInt(2, 6 + Math.floor(difficulty / 2));
    baseNumerator = randomInt(1, Math.max(1, baseDenominator - 1));
  }

  const correct = `${baseNumerator * multiplier}/${baseDenominator * multiplier}`;
  const distractors = shuffleArray([
    `${baseNumerator * multiplier}/${baseDenominator}`,
    `${baseNumerator}/${baseDenominator * multiplier}`,
    `${baseNumerator * (multiplier + 1)}/${baseDenominator * multiplier}`,
    `${baseNumerator * multiplier}/${baseDenominator * (multiplier + 1)}`,
  ]);

  return {
    kind: "choice",
    category: "Fractions",
    lessonKey: "equivalentFraction",
    prompt: `Which fraction is equivalent to ${baseNumerator}/${baseDenominator}?`,
    answer: correct,
    helper: "Equivalent fractions multiply or divide the numerator and denominator by the same number.",
    choices: shuffleArray([correct, ...distractors.slice(0, 3)]),
  };
}

function generateFractionToDecimalQuestion(difficulty) {
  const denominatorPool = difficulty >= 9 ? [2, 4, 5, 8, 10] : [2, 4, 5, 10];
  const denominator = denominatorPool[randomInt(0, denominatorPool.length - 1)];
  const numerator = randomInt(1, denominator - 1);
  const correctValue = numerator / denominator;
  const correct = formatDecimal(correctValue);
  const distractors = new Set();
  const candidateValues = [
    numerator / 10,
    denominator / 10,
    correctValue + 0.1,
    correctValue - 0.1,
    correctValue + 0.05,
    correctValue - 0.05,
  ];

  candidateValues.forEach((value) => {
    if (value > 0) {
      distractors.add(formatDecimal(value));
    }
  });

  while (distractors.size < 4) {
    const offset = (randomInt(-2, 3) || 1) / 10;
    const candidate = correctValue + offset;
    if (candidate > 0) {
      distractors.add(formatDecimal(candidate));
    }
  }

  return {
    kind: "choice",
    category: "Fractions & Decimals",
    lessonKey: "fractionDecimal",
    prompt: `Which decimal is equal to ${numerator}/${denominator}?`,
    answer: correct,
    helper: "Divide the numerator by the denominator, or rename the fraction as tenths or hundredths.",
    choices: shuffleArray([correct, ...[...distractors].filter((value) => value !== correct).slice(0, 3)]),
    fractions: [
      { numerator, denominator, label: `${numerator}/${denominator}` },
    ],
  };
}

function generateMixedNumberComparisonQuestion() {
  const leftWhole = randomInt(1, 3);
  const leftDen = randomInt(2, 8);
  const leftNum = randomInt(1, leftDen - 1);
  const rightWhole = randomInt(1, 3);
  const rightDen = randomInt(2, 8);
  const rightNum = randomInt(1, rightDen - 1);
  const leftValue = toImproperFraction(leftWhole, leftNum, leftDen);
  const rightValue = toImproperFraction(rightWhole, rightNum, rightDen);

  return {
    kind: "choice",
    category: "Fractions",
    lessonKey: "fractionCompare",
    prompt: `Which symbol makes the trail true? ${leftWhole} ${leftNum}/${leftDen} ? ${rightWhole} ${rightNum}/${rightDen}`,
    answer: compareFractions(leftValue, leftDen, rightValue, rightDen),
    helper: "Turn the mixed numbers into improper fractions or compare the whole numbers first.",
    choices: ["<", ">", "="],
  };
}

function generateGeometryQuestion(difficulty) {
  if (difficulty <= 3) {
    return generateCoreGeometryQuestion(difficulty);
  }

  if (difficulty <= 5) {
    return shuffleArray([
      generateCoreGeometryQuestion(difficulty),
      generateMissingSideQuestion(difficulty),
      generateSquarePerimeterQuestion(difficulty),
    ])[0];
  }

  return shuffleArray([
    generateCoreGeometryQuestion(difficulty),
    generateMissingSideQuestion(difficulty + 1),
    generateCompositeAreaQuestion(difficulty),
    generateFenceQuestion(difficulty),
  ])[0];
}

function generateCoreGeometryQuestion(difficulty) {
  const questionType = randomInt(0, 3);

  if (questionType === 0) {
    const width = randomInt(3, 6 + difficulty);
    const height = randomInt(2, 4 + difficulty);
    return {
      kind: "numeric",
      category: "Geometry",
      lessonKey: "geometryMeasure",
      prompt: `A rectangle garden is ${width} units by ${height} units. What is its area?`,
      answer: String(width * height),
      helper: "Area of a rectangle is length x width.",
    };
  }

  if (questionType === 1) {
    const width = randomInt(2, 7 + difficulty);
    const height = randomInt(2, 5 + difficulty);
    return {
      kind: "numeric",
      category: "Geometry",
      lessonKey: "geometryMeasure",
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
      lessonKey: "geometryMeasure",
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
    lessonKey: "geometryMeasure",
    prompt: `Which shape matches this clue: ${shape.clue}?`,
    answer: shape.answer,
    helper: "Pick the shape name that fits.",
    choices: ["triangle", "square", "hexagon", "octagon"],
  };
}

function generateMissingSideQuestion(difficulty) {
  const width = randomInt(3, 8 + difficulty);
  const height = randomInt(2, 6 + Math.floor(difficulty / 2));
  const perimeter = (width + height) * 2;
  const askForWidth = randomInt(0, 1) === 0;

  return {
    kind: "numeric",
    category: "Geometry",
    lessonKey: "geometryMeasure",
    prompt: askForWidth
      ? `A rectangle has perimeter ${perimeter} units and height ${height} units. What is its width?`
      : `A rectangle has perimeter ${perimeter} units and width ${width} units. What is its height?`,
    answer: String(askForWidth ? width : height),
    helper: "Perimeter of a rectangle is 2 x (length + width). Solve for the missing side.",
  };
}

function generateSquarePerimeterQuestion(difficulty) {
  const side = randomInt(4, 10 + difficulty);
  return {
    kind: "numeric",
    category: "Geometry",
    lessonKey: "geometryMeasure",
    prompt: `A square playground has perimeter ${side * 4} units. How long is each side?`,
    answer: String(side),
    helper: "A square has 4 equal sides, so divide the perimeter by 4.",
  };
}

function generateCompositeAreaQuestion(difficulty) {
  const leftWidth = randomInt(3, 7 + Math.floor(difficulty / 2));
  const rightWidth = randomInt(2, 5 + Math.floor(difficulty / 2));
  const height = randomInt(3, 6 + Math.floor(difficulty / 2));
  return {
    kind: "numeric",
    category: "Geometry",
    lessonKey: "geometryComposite",
    prompt: `A floor is made from two rectangles side by side: one is ${leftWidth} by ${height} and the other is ${rightWidth} by ${height}. What is the total area?`,
    answer: String((leftWidth * height) + (rightWidth * height)),
    helper: "Find each rectangle's area, then add them together.",
  };
}

function generateFenceQuestion(difficulty) {
  const length = randomInt(6, 12 + Math.floor(difficulty / 2));
  const width = randomInt(3, 8 + Math.floor(difficulty / 2));
  return {
    kind: "numeric",
    category: "Geometry",
    lessonKey: "geometryComposite",
    prompt: `A garden is ${length} units by ${width} units, but one long side rests against a wall. How many units of fence are needed for the other three sides?`,
    answer: String(length + (width * 2)),
    helper: "Add only the three sides that need fencing.",
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
  const compact = String(value).trim().toLowerCase().replace(/\s+/g, "");

  if (question.kind === "choice") {
    return compact;
  }

  if (question.answerType === "remainder") {
    return compact.replace(/remainder/gi, "r");
  }

  if (question.answerType === "decimal") {
    const parsed = Number(compact);
    return Number.isFinite(parsed) ? formatDecimal(parsed) : compact;
  }

  const parsed = Number(compact);
  return Number.isFinite(parsed) ? String(parsed) : compact;
}

function checkAnswer(rawAnswer) {
  if (!state.activeQuestion) {
    return;
  }

  const normalized = normalizeAnswer(state.activeQuestion, rawAnswer);
  const correct = normalizeAnswer(state.activeQuestion, state.activeQuestion.answer);
  const isCorrect = normalized === correct;
  const questType = state.activeQuest;

  if (isCorrect) {
    state.streak += 1;
    state.currentQuestCorrect += 1;
    state.questionIndex += 1;
    rewardCorrectAnswer(questType);
    state.feedbackMessage = makePositiveFeedback(questType);
    state.feedbackTone = "good";
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
    state.feedbackMessage = `Not yet. The best answer was ${state.activeQuestion.answer}. ${state.activeQuestion.helper}`;
    state.feedbackTone = "bad";
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
      resetQuestPath();
      addMilestone(`Boss challenge attempt complete. ${state.petName} needs more balanced practice before evolving.`);
      state.feedbackMessage =
        `Boss challenge complete with ${state.currentQuestCorrect} out of ${state.cycleLength} correct. The quest path resets to Number Forge for another training round.`;
      state.feedbackTone = "bad";
      state.petSpeech = `${state.petName} wants one more balanced training round before evolving.`;
    }
  } else {
    const title = formatQuestTitle(type);
    if (state.currentQuestCorrect >= QUEST_PASS_TARGET) {
      advanceQuestPath(type);
      if (!triggerFirstHatch()) {
        const nextQuest = nextQuestInPath();
        addMilestone(`${title} complete. ${state.petName} gained confidence and world energy.`);
        state.feedbackMessage = nextQuest
          ? `${title} complete. ${formatQuestTitle(nextQuest)} is now ready.`
          : `${title} complete. The boss path is built. Fill evolution to 100% to unlock it.`;
        state.feedbackTone = "good";
        state.petSpeech = makePetSpeech(true);
      }
    } else {
      const needed = QUEST_PASS_TARGET - state.currentQuestCorrect;
      addMilestone(`${title} practice round finished. ${state.petName} needs ${needed} more correct answer${needed === 1 ? "" : "s"} to clear it.`);
      state.feedbackMessage =
        `${title} needs ${QUEST_PASS_TARGET} correct answers to clear. You got ${state.currentQuestCorrect} out of ${state.cycleLength}. Try it again and get ${needed} more correct.`;
      state.feedbackTone = "bad";
      state.petSpeech = `${state.petName} wants to practice ${title} one more time before moving on.`;
    }
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
  resetQuestPath();
  state.zoneIndex = Math.min(unlockedZones().length - 1, state.zoneIndex + 1);

  if (state.stageIndex > beforeStage) {
    const changeText = beforeStage === 0
      ? `hatched into a ${currentStage().name}`
      : `evolved into ${currentStage().name}`;
    addMilestone(`${state.petName} ${changeText} and restored ${currentZone().name}.`);
    state.feedbackMessage =
      beforeStage === 0
        ? `Crack! ${state.petName} hatched into a ${currentStage().name}! A new habitat is now open.`
        : `${state.petName} evolved into ${currentStage().name}! A new habitat is now open.`;
    state.feedbackTone = "good";
    state.petSpeech =
      beforeStage === 0
        ? `${state.petName} bursts from the shell, flaps tiny dragon wings, and squeaks proudly.`
        : `${state.petName} is glowing with new power!`;
  } else {
    addMilestone(`${state.petName} mastered another boss quest and made the world brighter.`);
    state.feedbackMessage = `${state.petName} completed a master challenge and earned a rare sparkle burst.`;
    state.feedbackTone = "good";
    state.petSpeech = `${state.petName} shimmers proudly after another master challenge.`;
  }
}

function makePositiveFeedback(type) {
  if (type === "multiplication") {
    return "Correct. Number power is charging snack trees, gears, and supply carts.";
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
    return hatchAnswersRemaining() <= 1
      ? `${state.petName}'s shell cracks and glows with dragon-light.`
      : `${state.petName} wiggles happily inside the egg.`;
  }
  if (state.stageIndex === 1) {
    return `${state.petName} chirps, flaps tiny dragon wings, and hops with excitement.`;
  }
  if (state.stageIndex === 2) {
    return `${state.petName} swishes a tiny tail and points toward a new trail.`;
  }
  if (state.stageIndex <= 4) {
    return `${state.petName} circles the habitat and looks ready for a harder world.`;
  }
  if (state.stageIndex <= 6) {
    return `${state.petName} shines with calm confidence and watches for master quests.`;
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
  if (state.stageIndex === 0 && state.petName) {
    const solved = Math.min(totalSolvedCount(), FIRST_HATCH_SOLVED_TARGET);
    const remaining = hatchAnswersRemaining();
    return {
      line: remaining > 0 ? `Egg hatch ${solved} / ${FIRST_HATCH_SOLVED_TARGET}` : "Egg ready to hatch",
      hint:
        remaining > 0
          ? `Solve ${remaining} more correct answer${remaining === 1 ? "" : "s"} to crack the shell and meet your dragon.`
          : "Finish this quest to crack the shell and reveal your dragon.",
    };
  }

  const nextQuest = nextQuestInPath();
  if (nextQuest) {
    const nextQuestTitle = formatQuestTitle(nextQuest);
    const afterQuest = QUEST_SEQUENCE[state.questPathStep + 1];
    return {
      line: nextQuestTitle,
      hint: afterQuest
        ? `Complete ${nextQuestTitle} to unlock ${formatQuestTitle(afterQuest)}.`
        : `Complete ${nextQuestTitle} to build the boss path.`,
    };
  }

  if (bossReady()) {
    return {
      line: "Boss challenge ready",
      hint: "Complete the mixed mastery quest to evolve your pet.",
    };
  }

  return {
    line: "Boss challenge",
    hint: `All three quest paths are complete. Fill evolution to 100%. Current growth: ${state.evolution}%.`,
  };
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
          <strong>${escapeHtml(fraction.label)}</strong>
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
      return `<button class="${selectedClass}" data-choice="${escapeHtml(choice)}" type="button">${escapeHtml(choice)}</button>`;
    })
    .join("");
}

function renderQuestInterface() {
  const question = state.activeQuestion;
  const questType = state.activeQuest;

  if (!currentProfileId) {
    DOM.challengeTitle.textContent = "Choose a player first";
    DOM.questionCounter.textContent = "0 / 0";
    DOM.challengePrompt.textContent = "Player profiles keep separate progress on this browser.";
    DOM.questionType.textContent = "Player required";
    DOM.questionText.textContent = "Create or choose a player profile to begin.";
    DOM.fractionVisuals.innerHTML = "";
    DOM.choiceGrid.innerHTML = "";
    DOM.answerInput.value = "";
    DOM.answerInput.placeholder = "Create a player first";
    DOM.answerInput.disabled = true;
    return;
  }

  DOM.challengeTitle.textContent = questType ? formatQuestTitle(questType) : "Pick a quest to begin";
  DOM.questionCounter.textContent = state.cycleLength
    ? `${Math.min(state.questionIndex + 1, state.cycleLength)} / ${state.cycleLength}`
    : idleQuestState().counter;

  if (!question) {
    const idleState = idleQuestState();
    DOM.challengePrompt.textContent = idleState.prompt;
    DOM.questionType.textContent = idleState.type;
    DOM.questionText.textContent = idleState.text;
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

function lessonKeyForQuestion(question) {
  if (!question) {
    return "";
  }

  if (question.lessonKey && LESSONS[question.lessonKey]) {
    return question.lessonKey;
  }

  const promptText = `${question.prompt || ""} ${question.helper || ""}`.toLowerCase();
  const categoryText = String(question.category || "").toLowerCase();

  if (question.answerType === "decimal") {
    return categoryText.includes("division") ? "divisionDecimal" : "fractionDecimal";
  }

  if (promptText.includes("remainder")) {
    return "divisionRemainder";
  }

  if ((promptText.includes("÷") || promptText.includes("long division")) && promptText.includes("decimal")) {
    return "divisionDecimal";
  }

  if (promptText.includes("÷") || promptText.includes("long division")) {
    return "divisionWhole";
  }

  if (categoryText.includes("algebra")) {
    return "algebraEquation";
  }

  if (promptText.includes("decimal")) {
    return "fractionDecimal";
  }

  if (categoryText.includes("fraction")) {
    return "fractionCompare";
  }

  if (categoryText.includes("geometry")) {
    return "geometryMeasure";
  }

  return "multiDigitMultiply";
}

function currentZoneLessonKeys() {
  return ZONE_LESSON_KEYS[currentZone().id] || ["multiDigitMultiply"];
}

function availableLessonKeys() {
  const questionKey = lessonKeyForQuestion(state.activeQuestion);
  const zoneKeys = currentZoneLessonKeys();
  return [...new Set([questionKey, ...zoneKeys].filter((key) => key && LESSONS[key]))];
}

function defaultLessonKey() {
  const lessonKeys = availableLessonKeys();
  if (!lessonKeys.length) {
    return "multiDigitMultiply";
  }

  if (selectedLessonKey && lessonKeys.includes(selectedLessonKey)) {
    return selectedLessonKey;
  }

  const questionKey = lessonKeyForQuestion(state.activeQuestion);
  if (questionKey && lessonKeys.includes(questionKey)) {
    return questionKey;
  }

  return lessonKeys[0];
}

function currentLesson() {
  const lessonKey = defaultLessonKey();
  return { key: lessonKey, ...LESSONS[lessonKey] };
}

function fractionCardMarkup(fraction) {
  const bars = Array.from({ length: fraction.denominator }, (_, index) => {
    const filled = index < fraction.numerator ? "fraction-segment filled" : "fraction-segment";
    return `<span class="${filled}"></span>`;
  }).join("");

  return `
    <div class="fraction-card">
      <strong>${escapeHtml(fraction.label)}</strong>
      <div class="fraction-bar">${bars}</div>
    </div>
  `;
}

function renderLessonVisual(lesson) {
  const visual = lesson.visual;
  if (!visual) {
    DOM.lessonVisual.innerHTML = "";
    return;
  }

  if (visual.type === "multiply-array") {
    const dots = Array.from({ length: visual.rows * visual.columns }, () => "<span class=\"lesson-array-dot\"></span>").join("");
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-visual-surface lesson-array-model">
        <div class="lesson-array-grid" style="grid-template-columns: repeat(${visual.columns}, 1fr);">
          ${dots}
        </div>
        <div class="metric-pill-row">
          <span class="metric-pill">${escapeHtml(String(visual.rows))} rows</span>
          <span class="metric-pill">${escapeHtml(String(visual.columns))} in each row</span>
          <span class="metric-pill">${escapeHtml(String(visual.rows))} x ${escapeHtml(String(visual.columns))} = ${escapeHtml(String(visual.total))}</span>
        </div>
      </div>
    `;
    return;
  }

  if (visual.type === "multiply-grid") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-visual-surface lesson-multiply-model">
        <div class="lesson-multiply-header">
          <span>${escapeHtml(String(visual.leftFactor))} x (${escapeHtml(String(visual.topParts[0]))} + ${escapeHtml(String(visual.topParts[1]))})</span>
          <strong>${escapeHtml(String(visual.total))}</strong>
        </div>
        <div class="lesson-multiply-partials">
          <div class="lesson-multiply-cell">${escapeHtml(String(visual.leftFactor))} x ${escapeHtml(String(visual.topParts[0]))} = ${escapeHtml(String(visual.partials[0]))}</div>
          <div class="lesson-multiply-cell">${escapeHtml(String(visual.leftFactor))} x ${escapeHtml(String(visual.topParts[1]))} = ${escapeHtml(String(visual.partials[1]))}</div>
        </div>
      </div>
    `;
    return;
  }

  if (visual.type === "fraction-compare") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-fraction-compare">
        ${fractionCardMarkup(visual.left)}
        <div class="lesson-compare-sign">${escapeHtml(visual.symbol)}</div>
        ${fractionCardMarkup(visual.right)}
      </div>
      <p class="lesson-visual-caption">${escapeHtml(visual.left.label)} becomes ${escapeHtml(visual.equivalentLeft)}, so it is greater than ${escapeHtml(visual.right.label)}.</p>
    `;
    return;
  }

  if (visual.type === "fraction-scale") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-scale-flow">
        <div class="lesson-decimal-card">
          <span>Start</span>
          <strong>${escapeHtml(visual.start)}</strong>
        </div>
        <div class="lesson-scale-arrow">${escapeHtml(visual.scale)}</div>
        <div class="lesson-decimal-card highlight">
          <span>Result</span>
          <strong>${escapeHtml(visual.result)}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (visual.type === "division-board") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-visual-surface lesson-division-board">
        <div class="division-top">${escapeHtml(visual.quotient)}</div>
        <div class="division-bracket">
          <span class="division-divisor">${escapeHtml(String(visual.divisor))}</span>
          <span class="division-dividend">${escapeHtml(String(visual.dividend))}</span>
        </div>
        <div class="division-work">
          ${visual.work.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
        </div>
      </div>
    `;
    return;
  }

  if (visual.type === "fraction-decimal") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-decimal-flow">
        <div class="lesson-decimal-card">
          <span>Fraction</span>
          <strong>${escapeHtml(visual.fraction)}</strong>
        </div>
        <div class="lesson-scale-arrow">=</div>
        <div class="lesson-decimal-card">
          <span>Hundredths</span>
          <strong>${escapeHtml(visual.bridge)}</strong>
        </div>
        <div class="lesson-scale-arrow">=</div>
        <div class="lesson-decimal-card highlight">
          <span>Decimal</span>
          <strong>${escapeHtml(visual.decimal)}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (visual.type === "rectangle-measure") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-visual-surface lesson-rectangle-diagram">
        <span class="rectangle-width">${escapeHtml(String(visual.width))}</span>
        <div class="rectangle-box">
          <span class="rectangle-area">${escapeHtml(String(visual.area))} sq</span>
        </div>
        <span class="rectangle-height">${escapeHtml(String(visual.height))}</span>
      </div>
      <div class="metric-pill-row">
        <span class="metric-pill">Area = ${escapeHtml(String(visual.area))}</span>
        <span class="metric-pill">Perimeter = ${escapeHtml(String(visual.perimeter))}</span>
      </div>
    `;
    return;
  }

  if (visual.type === "composite-area") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-visual-surface lesson-composite-diagram">
        <div class="composite-shape">
          <div class="composite-left">${escapeHtml(String(visual.leftArea))}</div>
          <div class="composite-right">${escapeHtml(String(visual.rightArea))}</div>
        </div>
        <div class="metric-pill composite-total">${escapeHtml(String(visual.leftArea))} + ${escapeHtml(String(visual.rightArea))} = ${escapeHtml(String(visual.total))}</div>
      </div>
    `;
    return;
  }

  if (visual.type === "algebra-balance") {
    DOM.lessonVisual.innerHTML = `
      <div class="lesson-algebra-flow">
        <div class="lesson-decimal-card">
          <span>Start</span>
          <strong>${escapeHtml(visual.equation)}</strong>
        </div>
        <div class="lesson-scale-arrow">${escapeHtml(visual.action)}</div>
        <div class="lesson-decimal-card highlight">
          <span>Result</span>
          <strong>${escapeHtml(visual.result)}</strong>
        </div>
      </div>
    `;
    return;
  }

  DOM.lessonVisual.innerHTML = "";
}

function renderLesson() {
  const lessonKeys = availableLessonKeys();
  const lesson = currentLesson();
  const zone = currentZone();
  DOM.lessonCard.hidden = false;

  DOM.lessonTitle.textContent = lesson.title;
  DOM.lessonChip.textContent = zone.name;
  DOM.lessonIntro.textContent = `${zone.name}: ${lesson.intro}`;
  DOM.lessonTopicRow.innerHTML = lessonKeys
    .map((key) => {
      const topic = LESSONS[key];
      const selectedClass = key === lesson.key ? " selected" : "";
      return `<button class="lesson-topic-button${selectedClass}" data-lesson="${escapeHtml(key)}" type="button">${escapeHtml(topic.topic)}</button>`;
    })
    .join("");
  DOM.lessonSteps.innerHTML = lesson.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  renderLessonVisual(lesson);
}

function renderQuestOptions() {
  document.querySelectorAll(".quest-button").forEach((button) => {
    const type = button.dataset.quest;
    const stateLabel = questCardState(type);
    const card = button.closest("[data-quest-card]");
    const statusLine = card?.querySelector("[data-quest-status]");
    const defaultLabel = QUEST_BUTTON_LABELS[type] || "Start Quest";
    const previousQuest = QUEST_SEQUENCE[Math.max(questStepIndex(type) - 1, 0)];

    if (card) {
      card.classList.remove("is-available", "is-locked", "is-completed", "is-active");
      card.classList.add(`is-${stateLabel}`);
    }

    if (!currentProfileId) {
      button.disabled = true;
      button.textContent = defaultLabel;
      if (statusLine) {
        statusLine.textContent = "Choose a player first.";
      }
      return;
    }

    if (!state.petName) {
      button.disabled = true;
      button.textContent = defaultLabel;
      if (statusLine) {
        statusLine.textContent = "Choose and name an egg first.";
      }
      return;
    }

    if (stateLabel === "active") {
      button.disabled = true;
      button.textContent = "Quest In Progress";
      if (statusLine) {
        statusLine.textContent = "Finish this quest to unlock the next one.";
      }
      return;
    }

    if (stateLabel === "completed") {
      button.disabled = true;
      button.textContent = "Completed This Round";
      if (statusLine) {
        statusLine.textContent = "Done for this round. The path moves forward.";
      }
      return;
    }

    if (stateLabel === "available") {
      button.disabled = false;
      button.textContent = defaultLabel;
      if (statusLine) {
        const upcomingQuest = QUEST_SEQUENCE[state.questPathStep + 1];
        statusLine.textContent = upcomingQuest
          ? `Ready now. Complete it to unlock ${formatQuestTitle(upcomingQuest)}.`
          : "Ready now. Complete it to build the boss path.";
      }
      return;
    }

    button.disabled = true;
    button.textContent = "Locked";
    if (statusLine) {
      statusLine.textContent = state.activeQuest
        ? `Finish ${formatQuestTitle(state.activeQuest)} first.`
        : `Locked until ${formatQuestTitle(previousQuest)} is complete.`;
    }
  });
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
  DOM.zoneList.innerHTML = ZONES.map((zone) => {
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
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderDecorations() {
  DOM.sceneDecorations.innerHTML = state.decorations
    .map((decorationId, index) => {
      const definition = DECORATIONS.find((item) => item.id === decorationId);
      if (!definition) {
        return "";
      }
      const left = 10 + ((index * 17) % 75);
      const delay = (index % 3) * 0.4;
      return `<div class="decoration ${definition.type}" style="left:${left}%;animation-delay:${delay}s" title="${definition.label}"></div>`;
    })
    .join("");
}

function renderHabitatTheme() {
  const egg = EGG_TYPES[state.eggType] || EGG_TYPES.sun;
  const zone = currentZone();
  const sceneGradient = zone.sceneGradient || ZONES[0].sceneGradient;

  DOM.habitatScene.style.background = sceneGradient;
  DOM.petAvatar.style.setProperty("--pet-top", egg.colors[0]);
  DOM.petAvatar.style.setProperty("--pet-bottom", egg.colors[1]);
}

function renderBossState() {
  if (!currentProfileId) {
    DOM.bossTitle.textContent = "Pick a player first";
    DOM.bossHint.textContent = "Profiles keep separate progress for each player on this browser.";
    DOM.bossButton.disabled = true;
    DOM.bossButton.textContent = "Boss Locked";
    return;
  }

  if (!state.petName) {
    DOM.bossTitle.textContent = "Name your egg first";
    DOM.bossHint.textContent = "The boss quest appears after the quest path opens.";
    DOM.bossButton.disabled = true;
    DOM.bossButton.textContent = "Boss Locked";
    return;
  }

  if (state.activeQuest === "boss") {
    DOM.bossTitle.textContent = "Boss quest in progress";
    DOM.bossHint.textContent = "Finish the mixed challenge to trigger the next evolution step.";
    DOM.bossButton.disabled = true;
    DOM.bossButton.textContent = "Boss In Progress";
    return;
  }

  if (bossReady()) {
    DOM.bossTitle.textContent = "World boss awakened";
    DOM.bossHint.textContent =
      "Your pet has enough balanced practice to attempt the evolution challenge.";
    DOM.bossButton.disabled = false;
    DOM.bossButton.textContent = "Start Boss Quest";
    return;
  }

  const nextQuest = nextQuestInPath();
  DOM.bossTitle.textContent = nextQuest ? "Quest path still building" : "Boss gate charging";
  DOM.bossHint.textContent = nextQuest
    ? `Finish ${formatQuestTitle(nextQuest)} next. The boss unlocks only after Number Forge, Fraction Bridge, and Geometry Workshop are all complete.`
    : `All three quest paths are complete. Fill evolution to 100%. Current growth: ${state.evolution}%.`;
  DOM.bossButton.disabled = true;
  DOM.bossButton.textContent = "Boss Locked";
}

function renderFeedback() {
  DOM.feedbackCard.classList.remove("good", "bad");

  if (!currentProfileId) {
    DOM.feedbackText.textContent = "Choose or create a player profile to begin.";
    return;
  }

  if (state.feedbackTone === "good" || state.feedbackTone === "bad") {
    DOM.feedbackCard.classList.add(state.feedbackTone);
  }
  DOM.feedbackText.textContent = state.feedbackMessage;
}

function renderMeters(values) {
  DOM.hungerValue.textContent = `${values.hunger}%`;
  DOM.energyValue.textContent = `${values.energy}%`;
  DOM.moodValue.textContent = `${values.mood}%`;
  DOM.evolutionValue.textContent = `${values.evolution}%`;
  DOM.hungerMeter.style.width = `${values.hunger}%`;
  DOM.energyMeter.style.width = `${values.energy}%`;
  DOM.moodMeter.style.width = `${values.mood}%`;
  DOM.evolutionMeter.style.width = `${values.evolution}%`;
}

function renderNoProfileState() {
  DOM.resetButton.disabled = true;
  DOM.habitatName.textContent = "Sunny Nest";
  DOM.stageChip.textContent = "No Save";
  DOM.zoneChip.textContent = "Choose Player";
  DOM.petNameLabel.textContent = "Pick a player";
  DOM.petMoodLine.textContent = "Create or choose a player profile to keep progress on this browser.";
  DOM.petSpeech.textContent = "Who is playing today?";
  DOM.petAvatar.dataset.stage = "egg";
  DOM.petAvatar.dataset.mood = "okay";
  DOM.petAvatar.classList.remove("has-star", "has-leaf");
  DOM.sparkValue.textContent = "0";
  DOM.streakValue.textContent = "0";
  DOM.streakLine.textContent = "Choose a player to start building a quest streak.";
  DOM.unlockLine.textContent = "Create a profile";
  DOM.unlockHint.textContent = "Each player gets a separate save slot on this browser.";
  renderMeters({ hunger: 0, energy: 0, mood: 0, evolution: 0 });
  DOM.milestoneCount.textContent = "0 moments";
  DOM.milestoneList.innerHTML =
    "<li>Create a player profile on this browser to start a separate save.</li>";
  renderHabitatTheme();
  renderDecorations();
  renderQuestInterface();
  renderQuestOptions();
  renderRewards();
  renderLesson();
  renderZones();
  renderFeedback();
  renderBossState();
  openProfileChooser();
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

function petMoodLineText() {
  if (!state.petName) {
    return "A future friend is waiting to hatch.";
  }

  if (state.stageIndex === 0) {
    const remaining = hatchAnswersRemaining();
    if (remaining > 1) {
      return `${state.petName}'s egg is warm and wobbling. Solve ${remaining} more correct answers to hatch your dragon.`;
    }
    if (remaining === 1) {
      return `${state.petName}'s shell is cracking. One more correct answer will hatch your dragon.`;
    }
    return `${state.petName}'s shell is splitting open. Finish this round to reveal your dragon.`;
  }

  return `${state.petName} feels ${moodDescription()} and is ${EGG_TYPES[state.eggType]?.personality || "ready for adventure"}.`;
}

function updateEggSelectionUI() {
  document.querySelectorAll(".egg-option").forEach((button) => {
    button.classList.toggle("selected", button.dataset.egg === selectedEgg);
  });
}

function openSetup() {
  if (!currentProfileId) {
    openProfileChooser();
    return;
  }

  updateEggSelectionUI();
  if (!DOM.setupModal.open) {
    DOM.petNameInput.value = state.petName || "";
    DOM.setupModal.showModal();
  }
}

function render() {
  const currentProfile = getCurrentProfile();
  DOM.playerChip.textContent = currentProfile ? currentProfile.name : "Choose Player";
  renderProfileChooser();

  if (!currentProfileId || !currentProfile) {
    renderNoProfileState();
    return;
  }

  DOM.resetButton.disabled = false;

  const stage = currentStage();
  const zone = currentZone();
  const nextUnlock = nextUnlockText();
  const averageNeeds = Math.round((state.hunger + state.energy + state.mood) / 3);

  DOM.habitatName.textContent = zone.name;
  DOM.stageChip.textContent = stage.chip;
  DOM.zoneChip.textContent = `Zone ${Math.min(state.zoneIndex + 1, ZONES.length)} / ${ZONES.length}`;
  DOM.petNameLabel.textContent = state.petName || stage.name;
  DOM.petMoodLine.textContent = petMoodLineText();
  DOM.petSpeech.textContent = state.petName
    ? state.petSpeech || `${state.petName} is ${petNeedLine(averageNeeds)}`
    : "Choose an egg to begin.";

  DOM.petAvatar.dataset.stage = stage.petClass;
  DOM.petAvatar.dataset.mood = moodTier();
  DOM.petAvatar.classList.toggle("has-star", state.stageIndex >= 2);
  DOM.petAvatar.classList.toggle("has-leaf", state.stageIndex >= 3);

  renderMeters({
    hunger: state.hunger,
    energy: state.energy,
    mood: state.mood,
    evolution: state.evolution,
  });

  DOM.sparkValue.textContent = String(state.sparkles);
  DOM.streakValue.textContent = String(state.streak);
  DOM.streakLine.textContent =
    state.streak > 0 ? `${state.streak} correct in a row. Keep the chain going.` : "Answer correctly to build a chain.";
  DOM.unlockLine.textContent = nextUnlock.line;
  DOM.unlockHint.textContent = nextUnlock.hint;

  renderHabitatTheme();
  renderDecorations();
  renderQuestInterface();
  renderQuestOptions();
  renderRewards();
  renderLesson();
  renderZones();
  renderMilestones();
  renderFeedback();
  renderBossState();

  if (!state.petName && !DOM.profileModal.open) {
    openSetup();
  }
}

document.querySelectorAll(".quest-button").forEach((button) => {
  button.addEventListener("click", () => {
    startQuest(button.dataset.quest);
  });
});

DOM.switchPlayerButton.addEventListener("click", () => {
  openProfileChooser();
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

  const answer = state.activeQuestion.kind === "choice" ? selectedChoiceValue : DOM.answerInput.value;

  if (!String(answer).trim()) {
    state.feedbackMessage = "Enter an answer or choose one of the buttons first.";
    state.feedbackTone = "bad";
    renderFeedback();
    return;
  }

  checkAnswer(answer);
});

DOM.choiceGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button || !state.activeQuestion) {
    return;
  }
  selectedChoiceValue = button.dataset.choice;
  renderChoices(state.activeQuestion.choices);
});

DOM.lessonTopicRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-lesson]");
  if (!button) {
    return;
  }
  selectedLessonKey = button.dataset.lesson;
  renderLesson();
});

document.querySelectorAll(".egg-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedEgg = button.dataset.egg;
    updateEggSelectionUI();
  });
});

DOM.profileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-id]");
  if (!button) {
    return;
  }
  activateProfile(button.dataset.profileId);
});

DOM.profileCreateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createProfile(DOM.profileNameInput.value);
});

DOM.closeProfileButton.addEventListener("click", () => {
  closeProfileChooser();
});

DOM.profileModal.addEventListener("cancel", (event) => {
  if (!currentProfileId) {
    event.preventDefault();
  }
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
  state.feedbackMessage = `${nextName} is ready. Try a multiplication quest to start hatching the egg.`;
  state.feedbackTone = "good";
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
  if (!currentProfileId) {
    openProfileChooser();
    return;
  }

  const currentProfile = getCurrentProfile();
  const confirmed = window.confirm(
    `Start ${currentProfile.name}'s save over with a brand new egg? This keeps the player profile but clears current progress.`,
  );
  if (!confirmed) {
    return;
  }

  replaceState(createFreshState());
  selectedEgg = "sun";
  selectedChoiceValue = "";
  DOM.petNameInput.value = "";
  state.feedbackMessage = `${currentProfile.name} has a fresh save slot. Choose a new egg to begin again.`;
  state.feedbackTone = "good";
  saveState();
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && DOM.helpModal.open) {
    DOM.helpModal.close();
  }
});

initializeGame();
