const PROFILE_INDEX_KEY = "mandarin-lantern-journey-profiles-v1";
const ACTIVE_PROFILE_KEY = "mandarin-lantern-journey-active-profile-v1";
const PROFILE_SAVE_PREFIX = "mandarin-lantern-journey-profile-save-v1:";
const MAX_PROFILE_COUNT = 6;
const MAX_PROFILE_NAME_LENGTH = 18;

const GUIDE_TYPES = {
  panda: {
    label: "Lantern Panda",
    personality: "A steady study pet who keeps pinyin and first phrases calm and clear.",
  },
  crane: {
    label: "Jade Crane",
    personality: "A precise study pet who loves clean tones and tidy character reading.",
  },
  otter: {
    label: "River Otter",
    personality: "A playful study pet who keeps short sentences quick and lively.",
  },
};

const STAGES = [
  { id: "starter", chip: "Starter", name: "Sound Scout" },
  { id: "tones", chip: "Tone", name: "Tone Climber" },
  { id: "hanzi", chip: "Hanzi", name: "Character Builder" },
  { id: "greetings", chip: "Greetings", name: "Greeting Walker" },
  { id: "daily", chip: "Daily", name: "Sentence Starter" },
  { id: "guide", chip: "Guide", name: "Lantern Guide" },
];

const DISTRICTS = [
  {
    id: "sound-garden",
    name: "Sound Garden",
    icon: "Zi",
    color: "linear-gradient(135deg, #ef7d57, #efc664)",
    unlockCheckpoints: 0,
    summary: "Begin with core pinyin spellings and the hello phrase.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 248, 232, 0.78), rgba(214, 241, 227, 0.72)), linear-gradient(180deg, #fff2d7 0%, #d5f1df 100%)",
    focus: { english: "hello", hanzi: "你好", pinyin: "nǐ hǎo" },
  },
  {
    id: "tone-bridge",
    name: "Tone Bridge",
    icon: "Mā",
    color: "linear-gradient(135deg, #56af8b, #9de3c1)",
    unlockCheckpoints: 1,
    summary: "Learn the five tone patterns and connect them to marked syllables.",
    sceneGradient:
      "linear-gradient(180deg, rgba(234, 251, 243, 0.82), rgba(201, 242, 225, 0.78)), linear-gradient(180deg, #effff7 0%, #c8efde 100%)",
    focus: { english: "tone practice", hanzi: "妈 / 麻 / 马 / 骂", pinyin: "mā / má / mǎ / mà" },
  },
  {
    id: "hanzi-market",
    name: "Hanzi Market",
    icon: "汉",
    color: "linear-gradient(135deg, #5a92d0, #8ecfe7)",
    unlockCheckpoints: 2,
    summary: "Match simplified characters to pinyin and meaning.",
    sceneGradient:
      "linear-gradient(180deg, rgba(236, 246, 255, 0.82), rgba(211, 234, 255, 0.78)), linear-gradient(180deg, #f2f9ff 0%, #d7ecff 100%)",
    focus: { english: "student", hanzi: "学生", pinyin: "xué sheng" },
  },
  {
    id: "greeting-alley",
    name: "Greeting Alley",
    icon: "你好",
    color: "linear-gradient(135deg, #9376d8, #cfb9ff)",
    unlockCheckpoints: 3,
    summary: "Read and understand short greeting and courtesy sentences.",
    sceneGradient:
      "linear-gradient(180deg, rgba(247, 241, 255, 0.84), rgba(230, 220, 255, 0.78)), linear-gradient(180deg, #fbf7ff 0%, #e8dcff 100%)",
    focus: { english: "thank you", hanzi: "谢谢你", pinyin: "xiè xie nǐ" },
  },
  {
    id: "family-courtyard",
    name: "Family Courtyard",
    icon: "他",
    color: "linear-gradient(135deg, #d88953, #efc664)",
    unlockCheckpoints: 4,
    summary: "Use pronouns and identity words in simple pattern sentences.",
    sceneGradient:
      "linear-gradient(180deg, rgba(255, 244, 230, 0.84), rgba(246, 225, 188, 0.82)), linear-gradient(180deg, #fff7ee 0%, #f6ddbe 100%)",
    focus: { english: "he is a teacher", hanzi: "他是老师", pinyin: "tā shì lǎo shī" },
  },
  {
    id: "daily-life-park",
    name: "Daily Life Park",
    icon: "我",
    color: "linear-gradient(135deg, #56af8b, #5a92d0)",
    unlockCheckpoints: 5,
    summary: "Finish the intro course with simple self-introduction and daily phrases.",
    sceneGradient:
      "linear-gradient(180deg, rgba(236, 255, 247, 0.84), rgba(212, 239, 255, 0.82)), linear-gradient(180deg, #f4fff9 0%, #d7eefe 100%)",
    focus: { english: "I am a student", hanzi: "我是学生", pinyin: "wǒ shì xué sheng" },
  },
];

const LESSONS = {
  pinyin: {
    title: "Pinyin Path",
    intro: "Read the sound spelling system and get comfortable with tone-marked pinyin.",
    length: 4,
  },
  tones: {
    title: "Tone Trail",
    intro: "Practice first, second, third, fourth, and neutral tones with quick checks.",
    length: 4,
  },
  characters: {
    title: "Hanzi Match",
    intro: "Connect simplified characters to pinyin and English meanings.",
    length: 4,
  },
  sentences: {
    title: "Sentence Studio",
    intro: "Use short greetings and identity sentences in context.",
    length: 4,
  },
  checkpoint: {
    title: "Checkpoint Conversation",
    intro: "Mixed review across pinyin, tones, hanzi, and sentence reading.",
    length: 5,
  },
};

const VOCAB = [
  { id: "ni", hanzi: "你", pinyin: "nǐ", plain: "ni", english: "you" },
  { id: "hao", hanzi: "好", pinyin: "hǎo", plain: "hao", english: "good / well" },
  { id: "nihao", hanzi: "你好", pinyin: "nǐ hǎo", plain: "ni hao", english: "hello" },
  { id: "ma", hanzi: "吗", pinyin: "ma", plain: "ma", english: "question particle" },
  { id: "wo", hanzi: "我", pinyin: "wǒ", plain: "wo", english: "I / me" },
  { id: "hen", hanzi: "很", pinyin: "hěn", plain: "hen", english: "very" },
  { id: "shi", hanzi: "是", pinyin: "shì", plain: "shi", english: "to be" },
  { id: "bu", hanzi: "不", pinyin: "bù", plain: "bu", english: "not / no" },
  { id: "xiexie", hanzi: "谢谢", pinyin: "xiè xie", plain: "xie xie", english: "thank you" },
  { id: "zaijian", hanzi: "再见", pinyin: "zài jiàn", plain: "zai jian", english: "goodbye" },
  { id: "jiao", hanzi: "叫", pinyin: "jiào", plain: "jiao", english: "to be called" },
  { id: "xuesheng", hanzi: "学生", pinyin: "xué sheng", plain: "xue sheng", english: "student" },
  { id: "laoshi", hanzi: "老师", pinyin: "lǎo shī", plain: "lao shi", english: "teacher" },
  { id: "ta-he", hanzi: "他", pinyin: "tā", plain: "ta", english: "he / him" },
  { id: "ta-she", hanzi: "她", pinyin: "tā", plain: "ta", english: "she / her" },
];

const SENTENCES = [
  { id: "hello", hanzi: "你好。", pinyin: "Nǐ hǎo.", english: "Hello.", words: ["你", "好"] },
  { id: "how_are_you", hanzi: "你好吗？", pinyin: "Nǐ hǎo ma?", english: "How are you?", words: ["你", "好", "吗"] },
  { id: "im_fine", hanzi: "我很好。", pinyin: "Wǒ hěn hǎo.", english: "I am very well.", words: ["我", "很", "好"] },
  { id: "thanks", hanzi: "谢谢你。", pinyin: "Xiè xie nǐ.", english: "Thank you.", words: ["谢谢", "你"] },
  { id: "goodbye", hanzi: "再见。", pinyin: "Zài jiàn.", english: "Goodbye.", words: ["再见"] },
  { id: "im_student", hanzi: "我是学生。", pinyin: "Wǒ shì xué sheng.", english: "I am a student.", words: ["我", "是", "学生"] },
  { id: "he_teacher", hanzi: "他是老师。", pinyin: "Tā shì lǎo shī.", english: "He is a teacher.", words: ["他", "是", "老师"] },
  { id: "she_teacher", hanzi: "她是老师。", pinyin: "Tā shì lǎo shī.", english: "She is a teacher.", words: ["她", "是", "老师"] },
];

const LESSON_PACKS = {
  pinyin: [
    {
      title: "Lesson 1: Hello sounds",
      summary: "Meet your first sound spellings for hello, you, I, and the question particle ma.",
      items: ["ni", "hao", "nihao", "wo", "ma"],
    },
    {
      title: "Lesson 2: Helpful everyday words",
      summary: "Add very, to be, thank you, and goodbye.",
      items: ["hen", "shi", "xiexie", "zaijian", "bu"],
    },
    {
      title: "Lesson 3: Name and school words",
      summary: "Add name, student, teacher, and the pronoun tā.",
      items: ["jiao", "xuesheng", "laoshi", "ta-he", "ta-she"],
    },
  ],
  tones: [
    {
      title: "Lesson 1: Tone marks on hello words",
      summary: "See how tone marks change the look of ma, ni, and hao.",
      series: ["ma", "ni", "hao"],
    },
    {
      title: "Lesson 2: Tone marks in useful words",
      summary: "Read tone marks on everyday words like wǒ, hěn, shì, and xiè.",
      series: ["wo", "hen", "shi", "xie"],
    },
    {
      title: "Lesson 3: Tone marks in school words",
      summary: "Practice longer syllables used in goodbye, student, teacher, and name words.",
      series: ["zai", "jian", "jiao", "xue", "lao", "ta"],
    },
  ],
  characters: [
    {
      title: "Lesson 1: First characters",
      summary: "Learn the key characters used in hello and simple question sentences.",
      items: ["ni", "hao", "ma", "wo", "hen"],
    },
    {
      title: "Lesson 2: Courteous words",
      summary: "Add character forms for thank you, goodbye, and to be.",
      items: ["xiexie", "zaijian", "shi", "bu"],
    },
    {
      title: "Lesson 3: School and people words",
      summary: "Add characters for student, teacher, and the he / she pronouns.",
      items: ["xuesheng", "laoshi", "ta-he", "ta-she", "jiao"],
    },
  ],
  sentences: [
    {
      title: "Lesson 1: Hello and how are you?",
      summary: "Read short greeting sentences and how to answer them.",
      sentences: ["hello", "how_are_you", "im_fine"],
    },
    {
      title: "Lesson 2: Thanks and goodbye",
      summary: "Read polite everyday sentences for thanks and goodbye.",
      sentences: ["thanks", "goodbye"],
    },
    {
      title: "Lesson 3: I am a student",
      summary: "Read simple identity sentences using student and teacher words.",
      sentences: ["im_student", "he_teacher", "she_teacher"],
    },
  ],
};

const TONE_SERIES = [
  { base: "ma", forms: ["mā", "má", "mǎ", "mà", "ma"] },
  { base: "shi", forms: ["shī", "shí", "shǐ", "shì", "shi"] },
  { base: "ni", forms: ["nī", "ní", "nǐ", "nì", "ni"] },
  { base: "hao", forms: ["hāo", "háo", "hǎo", "hào", "hao"] },
  { base: "wo", forms: ["wō", "wó", "wǒ", "wò", "wo"] },
  { base: "hen", forms: ["hēn", "hén", "hěn", "hèn", "hen"] },
  { base: "xie", forms: ["xiē", "xié", "xiě", "xiè", "xie"] },
  { base: "zai", forms: ["zāi", "zái", "zǎi", "zài", "zai"] },
  { base: "jian", forms: ["jiān", "jián", "jiǎn", "jiàn", "jian"] },
  { base: "jiao", forms: ["jiāo", "jiáo", "jiǎo", "jiào", "jiao"] },
  { base: "xue", forms: ["xuē", "xué", "xuě", "xuè", "xue"] },
  { base: "lao", forms: ["lāo", "láo", "lǎo", "lào", "lao"] },
  { base: "ta", forms: ["tā", "tá", "tǎ", "tà", "ta"] },
];

const TONE_LABELS = {
  0: "Neutral tone",
  1: "1st tone",
  2: "2nd tone",
  3: "3rd tone",
  4: "4th tone",
};

const TONE_CONTOURS = {
  0: "light and short",
  1: "high and level",
  2: "rising upward",
  3: "dip then rise",
  4: "sharp falling",
};

const ACCENT_MAP = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

const VOCAB_BY_ID = Object.fromEntries(VOCAB.map((item) => [item.id, item]));
const SENTENCES_BY_ID = Object.fromEntries(SENTENCES.map((sentence) => [sentence.id, sentence]));
const TONE_SERIES_BY_BASE = Object.fromEntries(TONE_SERIES.map((series) => [series.base, series]));

const DOM = {
  playerChip: document.getElementById("playerChip"),
  switchPlayerButton: document.getElementById("switchPlayerButton"),
  helpButton: document.getElementById("helpButton"),
  resetButton: document.getElementById("resetButton"),
  districtName: document.getElementById("districtName"),
  stageChip: document.getElementById("stageChip"),
  unitChip: document.getElementById("unitChip"),
  studyScene: document.getElementById("studyScene"),
  guideSpeech: document.getElementById("guideSpeech"),
  guideAvatar: document.getElementById("guideAvatar"),
  guideNameLabel: document.getElementById("guideNameLabel"),
  guideMoodLine: document.getElementById("guideMoodLine"),
  focusMeaning: document.getElementById("focusMeaning"),
  focusHanzi: document.getElementById("focusHanzi"),
  focusPinyin: document.getElementById("focusPinyin"),
  challengeTitle: document.getElementById("challengeTitle"),
  questionCounter: document.getElementById("questionCounter"),
  lessonPrompt: document.getElementById("lessonPrompt"),
  questionType: document.getElementById("questionType"),
  questionText: document.getElementById("questionText"),
  lessonVisuals: document.getElementById("lessonVisuals"),
  choiceGrid: document.getElementById("choiceGrid"),
  answerForm: document.getElementById("answerForm"),
  answerInput: document.getElementById("answerInput"),
  answerButton: document.getElementById("answerButton"),
  feedbackCard: document.getElementById("feedbackCard"),
  feedbackText: document.getElementById("feedbackText"),
  rewardStrip: document.getElementById("rewardStrip"),
  lessonButtons: Array.from(document.querySelectorAll(".lesson-button")),
  pinyinValue: document.getElementById("pinyinValue"),
  toneValue: document.getElementById("toneValue"),
  characterValue: document.getElementById("characterValue"),
  sentenceValue: document.getElementById("sentenceValue"),
  pinyinMeter: document.getElementById("pinyinMeter"),
  toneMeter: document.getElementById("toneMeter"),
  characterMeter: document.getElementById("characterMeter"),
  sentenceMeter: document.getElementById("sentenceMeter"),
  lanternValue: document.getElementById("lanternValue"),
  streakValue: document.getElementById("streakValue"),
  streakLine: document.getElementById("streakLine"),
  unlockLine: document.getElementById("unlockLine"),
  unlockHint: document.getElementById("unlockHint"),
  checkpointTitle: document.getElementById("checkpointTitle"),
  checkpointHint: document.getElementById("checkpointHint"),
  checkpointButton: document.getElementById("checkpointButton"),
  checkpointMeterValue: document.getElementById("checkpointMeterValue"),
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
  guideGrid: document.getElementById("guideGrid"),
  helpModal: document.getElementById("helpModal"),
  closeHelpButton: document.getElementById("closeHelpButton"),
};

const state = createFreshState();

let profiles = [];
let currentProfileId = "";
let selectedGuide = "panda";
let selectedChoiceValue = "";

function createLessonCounterMap() {
  return {
    pinyin: 0,
    tones: 0,
    characters: 0,
    sentences: 0,
  };
}

function createFreshState() {
  return {
    guideType: "",
    lanterns: 0,
    pinyinSkill: 18,
    toneSkill: 12,
    characterSkill: 10,
    sentenceSkill: 10,
    reviewMeter: 0,
    stageIndex: 0,
    zoneIndex: 0,
    streak: 0,
    checkpointsCleared: 0,
    milestoneLog: [
      "A new intro Mandarin course is ready. Pick a guide and begin with pinyin.",
    ],
    lessonHistory: createLessonCounterMap(),
    lessonCompletions: createLessonCounterMap(),
    cycleHistory: createLessonCounterMap(),
    activeLesson: null,
    activeLessonPhase: null,
    activeQuestion: null,
    activePackIndex: 0,
    cycleLength: 0,
    questionIndex: 0,
    currentLessonCorrect: 0,
    guideSpeech: "Choose a player to begin.",
    feedbackMessage: "Your guide will react here after each answer.",
    feedbackTone: "neutral",
    focusCard: DISTRICTS[0].focus,
    lastRewards: {
      pinyin: 0,
      tones: 0,
      characters: 0,
      sentences: 0,
      lanterns: 0,
      review: 0,
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
    lessonHistory: {
      ...fresh.lessonHistory,
      ...(savedState.lessonHistory || {}),
    },
    lessonCompletions: {
      ...fresh.lessonCompletions,
      ...(savedState.lessonCompletions || {}),
    },
    cycleHistory: {
      ...fresh.cycleHistory,
      ...(savedState.cycleHistory || {}),
    },
    lastRewards: {
      ...fresh.lastRewards,
      ...(savedState.lastRewards || {}),
    },
    milestoneLog: Array.isArray(savedState.milestoneLog) ? savedState.milestoneLog : fresh.milestoneLog,
    focusCard: savedState.focusCard || fresh.focusCard,
    pinyinSkill: clamp(savedState.pinyinSkill ?? fresh.pinyinSkill),
    toneSkill: clamp(savedState.toneSkill ?? fresh.toneSkill),
    characterSkill: clamp(savedState.characterSkill ?? fresh.characterSkill),
    sentenceSkill: clamp(savedState.sentenceSkill ?? fresh.sentenceSkill),
    reviewMeter: clamp(savedState.reviewMeter ?? fresh.reviewMeter),
    stageIndex: clamp(savedState.stageIndex ?? fresh.stageIndex, 0, STAGES.length - 1),
    zoneIndex: clamp(savedState.zoneIndex ?? fresh.zoneIndex, 0, DISTRICTS.length - 1),
    checkpointsCleared: clamp(savedState.checkpointsCleared ?? fresh.checkpointsCleared, 0, DISTRICTS.length - 1),
    activeLesson: fresh.activeLesson,
    activeLessonPhase: fresh.activeLessonPhase,
    activeQuestion: fresh.activeQuestion,
    activePackIndex: fresh.activePackIndex,
    cycleLength: fresh.cycleLength,
    questionIndex: fresh.questionIndex,
    currentLessonCorrect: fresh.currentLessonCorrect,
    feedbackMessage: savedState.feedbackMessage || fresh.feedbackMessage,
    feedbackTone: savedState.feedbackTone || fresh.feedbackTone,
  };
}

function replaceState(nextState) {
  const hydrated = hydrateState(nextState);
  Object.keys(state).forEach((key) => delete state[key]);
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
  return `learner-${stamp}-${random}`;
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

function profileSummary(profileId) {
  const profileState = loadProfileState(profileId);
  const stage = STAGES[profileState.stageIndex] || STAGES[0];
  if (!profileState.guideType) {
    return "Study pet not chosen yet.";
  }

  return `${GUIDE_TYPES[profileState.guideType].label} - ${stage.name} - ${profileState.lanterns} lanterns`;
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
      const statusLabel = isActive ? "Studying now" : "Open save";
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
    setProfileHint(`This browser already has ${MAX_PROFILE_COUNT} learner profiles.`, "bad");
  } else {
    setProfileHint("Each learner gets a separate save slot on this browser.");
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
  selectedGuide = state.guideType || "panda";
  selectedChoiceValue = "";
  DOM.profileNameInput.value = "";
  DOM.answerInput.value = "";
  saveState();
  render();
}

function createProfile(profileName) {
  const normalizedName = profileName.trim().replace(/\s+/g, " ").slice(0, MAX_PROFILE_NAME_LENGTH);

  if (!normalizedName) {
    setProfileHint("Enter a learner name first.", "bad");
    DOM.profileNameInput.focus();
    return;
  }

  if (profiles.length >= MAX_PROFILE_COUNT) {
    setProfileHint(`This browser already has ${MAX_PROFILE_COUNT} learner profiles.`, "bad");
    return;
  }

  const duplicate = profiles.find(
    (profile) => profile.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (duplicate) {
    setProfileHint("That learner name already exists. Pick a different one.", "bad");
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
  selectedGuide = "panda";
  selectedChoiceValue = "";
  DOM.profileNameInput.value = "";
  saveState();
  closeProfileChooser();
  render();
}

function initializeCourse() {
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

  selectedGuide = state.guideType || "panda";
  selectedChoiceValue = "";
  render();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sampleOne(items) {
  return items[randomInt(0, items.length - 1)];
}

function lessonPackIndexForStart(lessonType) {
  const packs = LESSON_PACKS[lessonType] || [];
  if (!packs.length) {
    return 0;
  }

  return Math.min(state.lessonCompletions[lessonType] || 0, packs.length - 1);
}

function activeLessonPack(lessonType) {
  const packs = LESSON_PACKS[lessonType] || [];
  if (!packs.length) {
    return null;
  }

  return packs[Math.min(state.activePackIndex || 0, packs.length - 1)] || packs[0];
}

function introducedPackCount(lessonType) {
  const packs = LESSON_PACKS[lessonType] || [];
  if (!packs.length) {
    return 0;
  }

  const completed = state.lessonCompletions[lessonType] || 0;
  return Math.min(Math.max(completed, 1), packs.length);
}

function introducedPacks(lessonType) {
  return (LESSON_PACKS[lessonType] || []).slice(0, introducedPackCount(lessonType));
}

function vocabPoolFromPack(pack) {
  return (pack?.items || []).map((id) => VOCAB_BY_ID[id]).filter(Boolean);
}

function tonePoolFromPack(pack) {
  return (pack?.series || []).map((base) => TONE_SERIES_BY_BASE[base]).filter(Boolean);
}

function sentencePoolFromPack(pack) {
  return (pack?.sentences || []).map((id) => SENTENCES_BY_ID[id]).filter(Boolean);
}

function reviewVocabPool(lessonType) {
  if (lessonType === "sentences") {
    return introducedPacks("sentences")
      .flatMap((pack) => sentencePoolFromPack(pack))
      .flatMap((sentence) => sentence.words)
      .filter(Boolean);
  }

  return introducedPacks(lessonType).flatMap((pack) => vocabPoolFromPack(pack));
}

function reviewSentencePool() {
  return introducedPacks("sentences").flatMap((pack) => sentencePoolFromPack(pack));
}

function reviewTonePool() {
  return introducedPacks("tones").flatMap((pack) => tonePoolFromPack(pack));
}

function normalizePinyin(value) {
  const replacements = Object.entries(ACCENT_MAP).flatMap(([plain, forms]) =>
    forms.map((form) => [form, plain]),
  );

  let normalized = String(value || "").toLowerCase().trim();
  replacements.forEach(([form, plain]) => {
    normalized = normalized.split(form).join(plain);
  });

  return normalized.replace(/[^a-z0-9]+/g, "");
}

function currentStage() {
  return STAGES[state.stageIndex] || STAGES[0];
}

function unlockedDistricts() {
  return DISTRICTS.filter((district) => district.unlockCheckpoints <= state.checkpointsCleared);
}

function currentDistrict() {
  const districts = unlockedDistricts();
  return districts[Math.min(state.zoneIndex, districts.length - 1)] || DISTRICTS[0];
}

function nextLockedDistrict() {
  return DISTRICTS.find((district) => district.unlockCheckpoints > state.checkpointsCleared) || null;
}

function checkpointReady() {
  const balancedPractice = Object.values(state.cycleHistory).every((count) => count >= 1);
  return state.reviewMeter >= 100 && balancedPractice;
}

function totalSolvedCount() {
  return Object.values(state.lessonHistory).reduce((sum, count) => sum + count, 0);
}

function addMilestone(text) {
  state.milestoneLog.unshift(text);
  state.milestoneLog = state.milestoneLog.slice(0, 8);
}

function applyRewards(rewards) {
  state.pinyinSkill = clamp(state.pinyinSkill + (rewards.pinyin || 0));
  state.toneSkill = clamp(state.toneSkill + (rewards.tones || 0));
  state.characterSkill = clamp(state.characterSkill + (rewards.characters || 0));
  state.sentenceSkill = clamp(state.sentenceSkill + (rewards.sentences || 0));
  state.reviewMeter = clamp(state.reviewMeter + (rewards.review || 0));
  state.lanterns += rewards.lanterns || 0;
  state.lastRewards = {
    pinyin: rewards.pinyin || 0,
    tones: rewards.tones || 0,
    characters: rewards.characters || 0,
    sentences: rewards.sentences || 0,
    lanterns: rewards.lanterns || 0,
    review: rewards.review || 0,
  };
}

function setFeedback(text, tone = "neutral") {
  state.feedbackMessage = text;
  state.feedbackTone = tone;
}

function guideLine(kind, lessonType) {
  const lines = {
    intro: [
      "Start small. Mandarin gets easier when you layer sound, tone, character, then sentence.",
      "Short loops work well here. One lesson path at a time.",
    ],
    pinyin: [
      "Good. Read the pinyin first, then let the tones ride on top of it.",
      "Nice. Pinyin is your map before the characters feel natural.",
    ],
    tones: [
      "Good tone check. Keep watching the mark shape and the pitch direction together.",
      "Nice. The tone mark is a quick visual shortcut once it starts to stick.",
    ],
    characters: [
      "Good match. Simplified characters become easier when tied to sound and meaning together.",
      "Nice. Hanzi memory grows faster when the word is useful in a sentence.",
    ],
    sentences: [
      "Good. Simple full sentences are where vocab starts turning into real language.",
      "Nice. Short sentence patterns carry a lot of beginner Mandarin.",
    ],
    checkpoint: [
      "Mixed review clears weak spots fast. Keep it balanced.",
      "This checkpoint is the bridge to the next district. Stay sharp.",
    ],
    retry: [
      "Not quite. Read the clue again and use the pinyin or tone mark as an anchor.",
      "Close. Slow the step down and use one clue at a time.",
    ],
  };

  if (kind === "retry") {
    return sampleOne(lines.retry);
  }

  return sampleOne(lines[lessonType] || lines.intro);
}

function collectUnique(items, keyFn, count) {
  const collected = [];
  const seen = new Set();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      collected.push(item);
    }
  });
  return collected.slice(0, count);
}

function pinyinChoiceOptions(answerItem, pool) {
  const distractors = collectUnique(
    shuffleArray(
      pool.filter((item) => normalizePinyin(item.pinyin) !== normalizePinyin(answerItem.pinyin)),
    ),
    (item) => normalizePinyin(item.pinyin),
    3,
  );

  return shuffleArray([
    { label: answerItem.pinyin, value: answerItem.pinyin },
    ...distractors.map((item) => ({ label: item.pinyin, value: item.pinyin })),
  ]);
}

function englishChoiceOptions(answerItem, pool) {
  const distractors = collectUnique(
    shuffleArray(pool.filter((item) => item.english !== answerItem.english)),
    (item) => item.english,
    3,
  );

  return shuffleArray([
    { label: answerItem.english, value: answerItem.english },
    ...distractors.map((item) => ({ label: item.english, value: item.english })),
  ]);
}

function hanziChoiceOptions(answerItem, pool) {
  const distractors = collectUnique(
    shuffleArray(pool.filter((item) => item.hanzi !== answerItem.hanzi)),
    (item) => item.hanzi,
    3,
  );

  return shuffleArray([
    { label: answerItem.hanzi, value: answerItem.hanzi },
    ...distractors.map((item) => ({ label: item.hanzi, value: item.hanzi })),
  ]);
}

function sentenceTranslationOptions(answerSentence, pool) {
  const distractors = collectUnique(
    shuffleArray(pool.filter((sentence) => sentence.english !== answerSentence.english)),
    (sentence) => sentence.english,
    3,
  );

  return shuffleArray([
    { label: answerSentence.english, value: answerSentence.english },
    ...distractors.map((sentence) => ({ label: sentence.english, value: sentence.english })),
  ]);
}

function sentenceWordPool(pool = SENTENCES) {
  const words = [];
  pool.forEach((sentence) => {
    sentence.words.forEach((word) => {
      if (!words.includes(word)) {
        words.push(word);
      }
    });
  });
  return words;
}

function createPinyinQuestion(pack) {
  const pool = vocabPoolFromPack(pack);
  const item = sampleOne(pool);

  if (Math.random() < 0.55) {
    return {
      sourceLesson: "pinyin",
      typeLabel: "Pinyin match",
      text: `Which pinyin matches ${item.hanzi}?`,
      prompt: `${item.hanzi} means "${item.english}".`,
      mode: "choice",
      choices: pinyinChoiceOptions(item, pool),
      answer: item.pinyin,
      judge: (value) => normalizePinyin(value) === normalizePinyin(item.pinyin),
      visual: {
        kind: "card",
        kicker: item.english,
        main: item.hanzi,
        sub: "Pick the matching pinyin.",
      },
      rewards: { pinyin: 10, lanterns: 3, review: 12 },
      successMessage: `Correct. ${item.hanzi} is ${item.pinyin}.`,
      mistakeMessage: `Almost. ${item.hanzi} is ${item.pinyin}.`,
      focus: { english: item.english, hanzi: item.hanzi, pinyin: item.pinyin },
    };
  }

  return {
    sourceLesson: "pinyin",
    typeLabel: "Type the pinyin",
    text: `Type the pinyin for ${item.hanzi}.`,
    prompt: `Tone marks are welcome, but plain letters also count here.`,
    mode: "input",
    inputPlaceholder: "Type pinyin",
    answer: item.pinyin,
    judge: (value) => normalizePinyin(value) === normalizePinyin(item.pinyin),
    visual: {
      kind: "card",
      kicker: item.english,
      main: item.hanzi,
      sub: "Use pinyin letters with or without tone marks.",
    },
    rewards: { pinyin: 11, lanterns: 3, review: 12 },
    successMessage: `Yes. ${item.hanzi} is written ${item.pinyin}.`,
    mistakeMessage: `Not this time. ${item.hanzi} is ${item.pinyin}.`,
    focus: { english: item.english, hanzi: item.hanzi, pinyin: item.pinyin },
  };
}

function createToneQuestion(pack) {
  const pool = tonePoolFromPack(pack);
  if (Math.random() < 0.5) {
    const series = sampleOne(pool);
    const tone = randomInt(1, 4);
    const answer = series.forms[tone - 1];
    const choices = shuffleArray(
      series.forms.slice(0, 4).map((form) => ({
        label: form,
        value: form,
      })),
    );

    return {
      sourceLesson: "tones",
      typeLabel: "Tone mark check",
      text: `Which spelling shows the ${TONE_LABELS[tone].toLowerCase()} for ${series.base}?`,
      prompt: `Match the base syllable to the correct tone mark.`,
      mode: "choice",
      choices,
      answer,
      judge: (value) => value === answer,
      visual: {
        kind: "tone",
        kicker: "Tone target",
        syllable: series.base,
        chip: `${TONE_LABELS[tone]} • ${TONE_CONTOURS[tone]}`,
        sub: "Pick the version with the correct mark.",
      },
      rewards: { tones: 10, lanterns: 3, review: 12 },
      successMessage: `Correct. ${answer} is the ${TONE_LABELS[tone].toLowerCase()}.`,
      mistakeMessage: `Almost. ${answer} is the ${TONE_LABELS[tone].toLowerCase()}.`,
      focus: { english: TONE_CONTOURS[tone], hanzi: answer, pinyin: TONE_LABELS[tone] },
    };
  }

  const series = sampleOne(pool);
  const tone = randomInt(0, 4);
  const marked = series.forms[tone === 0 ? 4 : tone - 1];
  const choices = shuffleArray(
    Object.entries(TONE_LABELS).map(([value, label]) => ({
      label,
      value,
      detail: TONE_CONTOURS[value],
    })),
  );

  return {
    sourceLesson: "tones",
    typeLabel: "Tone number check",
    text: `What tone does ${marked} use?`,
    prompt: `Use the mark shape and the tone legend together.`,
    mode: "choice",
    choices,
    answer: String(tone),
    judge: (value) => String(value) === String(tone),
    visual: {
      kind: "tone",
      kicker: "Read the mark",
      syllable: marked,
      chip: "Pick the tone number",
      sub: `Contour: ${TONE_CONTOURS[tone]}.`,
    },
    rewards: { tones: 11, lanterns: 3, review: 12 },
    successMessage: `Right. ${marked} uses the ${TONE_LABELS[tone].toLowerCase()}.`,
    mistakeMessage: `Not yet. ${marked} uses the ${TONE_LABELS[tone].toLowerCase()}.`,
    focus: { english: TONE_CONTOURS[tone], hanzi: marked, pinyin: TONE_LABELS[tone] },
  };
}

function createCharacterQuestion(pack) {
  const pool = vocabPoolFromPack(pack);
  const item = sampleOne(pool);

  if (Math.random() < 0.5) {
    return {
      sourceLesson: "characters",
      typeLabel: "Hanzi match",
      text: `Which simplified character matches ${item.pinyin}?`,
      prompt: `Meaning: "${item.english}".`,
      mode: "choice",
      choices: hanziChoiceOptions(item, pool),
      answer: item.hanzi,
      judge: (value) => value === item.hanzi,
      visual: {
        kind: "card",
        kicker: item.english,
        main: item.pinyin,
        sub: "Choose the simplified character.",
      },
      rewards: { characters: 10, lanterns: 3, review: 12 },
      successMessage: `Correct. ${item.pinyin} is ${item.hanzi}.`,
      mistakeMessage: `Almost. ${item.pinyin} is ${item.hanzi}.`,
      focus: { english: item.english, hanzi: item.hanzi, pinyin: item.pinyin },
    };
  }

  return {
    sourceLesson: "characters",
    typeLabel: "Meaning check",
    text: `What does ${item.hanzi} mean?`,
    prompt: `Use the pinyin clue if you already know it.`,
    mode: "choice",
    choices: englishChoiceOptions(item, pool),
    answer: item.english,
    judge: (value) => value === item.english,
    visual: {
      kind: "card",
      kicker: item.pinyin,
      main: item.hanzi,
      sub: "Choose the English meaning.",
    },
    rewards: { characters: 11, lanterns: 3, review: 12 },
    successMessage: `Yes. ${item.hanzi} means "${item.english}".`,
    mistakeMessage: `Not this one. ${item.hanzi} means "${item.english}".`,
    focus: { english: item.english, hanzi: item.hanzi, pinyin: item.pinyin },
  };
}

function createSentenceQuestion(pack) {
  const pool = sentencePoolFromPack(pack);
  if (Math.random() < 0.5) {
    const sentence = sampleOne(pool);
    return {
      sourceLesson: "sentences",
      typeLabel: "Sentence meaning",
      text: "What does this sentence mean?",
      prompt: `Read the hanzi first, then use the pinyin for support.`,
      mode: "choice",
      choices: sentenceTranslationOptions(sentence, pool),
      answer: sentence.english,
      judge: (value) => value === sentence.english,
      visual: {
        kind: "sentence",
        kicker: "Read the line",
        hanzi: sentence.hanzi,
        pinyin: sentence.pinyin,
        note: "Pick the best English meaning.",
      },
      rewards: { sentences: 11, lanterns: 4, review: 14 },
      successMessage: `Correct. "${sentence.hanzi}" means "${sentence.english}".`,
      mistakeMessage: `Almost. "${sentence.hanzi}" means "${sentence.english}".`,
      focus: { english: sentence.english, hanzi: sentence.hanzi, pinyin: sentence.pinyin },
    };
  }

  const sentence = sampleOne(pool.filter((entry) => entry.words.length >= 2));
  const missingIndex = randomInt(0, sentence.words.length - 1);
  const answer = sentence.words[missingIndex];
  const masked = sentence.words
    .map((word, index) => (index === missingIndex ? "____" : word))
    .join("");
  const choices = shuffleArray([
    { label: answer, value: answer },
    ...collectUnique(
      shuffleArray(sentenceWordPool(pool).filter((word) => word !== answer)),
      (word) => word,
      3,
    ).map((word) => ({ label: word, value: word })),
  ]);

  return {
    sourceLesson: "sentences",
    typeLabel: "Fill the blank",
    text: "Choose the missing word.",
    prompt: `English clue: "${sentence.english}"`,
    mode: "choice",
    choices,
    answer,
    judge: (value) => value === answer,
    visual: {
      kind: "sentence",
      kicker: "Complete the line",
      hanzi: `${masked}${sentence.hanzi.endsWith("？") ? "？" : sentence.hanzi.endsWith("。") ? "。" : ""}`,
      pinyin: sentence.pinyin,
      note: "Use the meaning and sentence pattern.",
    },
    rewards: { sentences: 10, lanterns: 4, review: 14 },
    successMessage: `Correct. The missing word is ${answer}.`,
    mistakeMessage: `Almost. The missing word is ${answer}.`,
    focus: { english: sentence.english, hanzi: sentence.hanzi, pinyin: sentence.pinyin },
  };
}

function createCheckpointQuestion() {
  const lessonType = sampleOne(["pinyin", "tones", "characters", "sentences"]);
  const packs = {
    pinyin: {
      items: collectUnique(reviewVocabPool("pinyin"), (item) => item.id, 12).map((item) => item.id),
    },
    tones: {
      series: collectUnique(reviewTonePool(), (item) => item.base, 12).map((item) => item.base),
    },
    characters: {
      items: collectUnique(reviewVocabPool("characters"), (item) => item.id, 12).map((item) => item.id),
    },
    sentences: {
      sentences: collectUnique(reviewSentencePool(), (item) => item.id, 12).map((item) => item.id),
    },
  };
  const builders = {
    pinyin: createPinyinQuestion,
    tones: createToneQuestion,
    characters: createCharacterQuestion,
    sentences: createSentenceQuestion,
  };
  const question = builders[lessonType](packs[lessonType]);
  return {
    ...question,
    typeLabel: `Checkpoint • ${question.typeLabel}`,
    rewards: {
      ...question.rewards,
      lanterns: (question.rewards.lanterns || 0) + 2,
      review: Math.max(8, question.rewards.review || 0),
    },
  };
}

function buildQuestionForLesson(lessonType) {
  if (lessonType === "pinyin") {
    return createPinyinQuestion(activeLessonPack("pinyin"));
  }
  if (lessonType === "tones") {
    return createToneQuestion(activeLessonPack("tones"));
  }
  if (lessonType === "characters") {
    return createCharacterQuestion(activeLessonPack("characters"));
  }
  if (lessonType === "sentences") {
    return createSentenceQuestion(activeLessonPack("sentences"));
  }
  return createCheckpointQuestion();
}

function lessonStudyVisual(lessonType, pack) {
  if (!pack) {
    return {
      kind: "sentence",
      kicker: "Mini lesson",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      note: "This lesson will teach a few items first, then use only those in practice.",
    };
  }

  if (lessonType === "pinyin" || lessonType === "characters") {
    const rows = vocabPoolFromPack(pack)
      .slice(0, 4)
      .map((item) => `${item.hanzi} • ${item.pinyin} • ${item.english}`);
    return {
      kind: "study",
      kicker: "Mini lesson",
      title: pack.title,
      summary: `${pack.summary} Practice will only use these items.`,
      rows,
    };
  }

  if (lessonType === "tones") {
    const rows = tonePoolFromPack(pack)
      .slice(0, 4)
      .map((series) => `${series.forms[0]} / ${series.forms[1]} / ${series.forms[2]} / ${series.forms[3]}`);
    return {
      kind: "study",
      kicker: "Mini lesson",
      title: pack.title,
      summary: `${pack.summary} Watch the mark shape before you answer.`,
      rows,
    };
  }

  if (lessonType === "sentences") {
    const rows = sentencePoolFromPack(pack)
      .slice(0, 3)
      .map((sentence) => `${sentence.hanzi} • ${sentence.english}`);
    return {
      kind: "study",
      kicker: "Mini lesson",
      title: pack.title,
      summary: `${pack.summary} Practice will stay inside these sentence patterns.`,
      rows,
    };
  }

  const rows = [
    "Pinyin, tones, hanzi, and sentences are all in this mixed review.",
    "Checkpoint questions only use material already taught in earlier mini lessons.",
  ];
  return {
    kind: "study",
    kicker: "Review first",
    title: "Checkpoint review",
    summary: "Nothing new appears here. This is mixed review of introduced material only.",
    rows,
  };
}

function beginPracticeRound() {
  state.activeLessonPhase = "quiz";
  state.questionIndex = 0;
  state.currentLessonCorrect = 0;
  state.activeQuestion = buildQuestionForLesson(state.activeLesson);
  state.guideSpeech = "Mini lesson complete. Now the practice round will stay inside what you just learned.";
  state.focusCard = state.activeQuestion.focus || state.focusCard;
  selectedChoiceValue = "";
  DOM.answerInput.value = "";
  saveState();
  render();
}

function startLesson(lessonType) {
  if (!currentProfileId) {
    openProfileChooser();
    return;
  }

  if (!state.guideType) {
    openGuideSetup();
    return;
  }

  if (lessonType === "checkpoint" && !checkpointReady()) {
    setFeedback(
      "Checkpoint is still locked. Practice each lesson path and fill the review meter first.",
      "bad",
    );
    state.guideSpeech = "Build a balanced round first: pinyin, tones, hanzi, then sentences.";
    render();
    return;
  }

  state.activeLesson = lessonType;
  state.activeLessonPhase = "study";
  state.activePackIndex = lessonType === "checkpoint" ? 0 : lessonPackIndexForStart(lessonType);
  state.cycleLength = LESSONS[lessonType].length;
  state.questionIndex = 0;
  state.currentLessonCorrect = 0;
  state.activeQuestion = null;
  state.guideSpeech =
    lessonType === "checkpoint"
      ? "Quick lesson first, then mixed review. No unseen material will appear in the checkpoint."
      : "Mini lesson first, then a short practice round that only uses the taught items.";
  state.focusCard = currentDistrict().focus;
  DOM.answerInput.value = "";
  selectedChoiceValue = "";
  saveState();
  render();
}

function evaluateCurrentQuestion(rawValue) {
  const question = state.activeQuestion;
  if (!question) {
    return;
  }

  const correct = question.judge(rawValue);
  const sourceLesson = question.sourceLesson || state.activeLesson;

  if (correct) {
    state.currentLessonCorrect += 1;
    state.streak += 1;
    state.lessonHistory[sourceLesson] += 1;
    if (state.activeLesson !== "checkpoint") {
      state.cycleHistory[sourceLesson] += 1;
    }
    applyRewards(question.rewards);
    state.guideSpeech = guideLine("success", sourceLesson);
    setFeedback(question.successMessage, "good");
  } else {
    state.streak = 0;
    state.guideSpeech = guideLine("retry", sourceLesson);
    setFeedback(question.mistakeMessage, "bad");
  }

  state.focusCard = question.focus || state.focusCard;
}

function finishLesson() {
  const lessonType = state.activeLesson;
  const lesson = LESSONS[lessonType];
  const scoreLine = `${state.currentLessonCorrect}/${state.cycleLength}`;

  if (lessonType === "checkpoint") {
    const passTarget = 4;
    if (state.currentLessonCorrect >= passTarget) {
      state.checkpointsCleared = clamp(state.checkpointsCleared + 1, 0, DISTRICTS.length - 1);
      state.stageIndex = Math.min(state.checkpointsCleared, STAGES.length - 1);
      state.zoneIndex = Math.min(state.checkpointsCleared, DISTRICTS.length - 1);
      state.reviewMeter = 0;
      state.cycleHistory = createLessonCounterMap();
      state.guideSpeech = guideLine("success", "checkpoint");
      applyRewards({ pinyin: 4, tones: 4, characters: 4, sentences: 4, lanterns: 8, review: 0 });
      const unlocked = currentDistrict();
      addMilestone(`Checkpoint cleared (${scoreLine}). ${unlocked.name} is now open.`);
      setFeedback(`Checkpoint cleared. You unlocked ${unlocked.name}.`, "good");
    } else {
      state.reviewMeter = Math.max(40, state.reviewMeter - 24);
      state.guideSpeech = "The checkpoint needs one more round. Tighten the weak spots, then try again.";
      addMilestone(`Checkpoint review came up short at ${scoreLine}.`);
      setFeedback(`Checkpoint result: ${scoreLine}. Do one more balanced review round first.`, "bad");
    }
  } else {
    const packs = LESSON_PACKS[lessonType] || [];
    const canAdvancePack =
      state.currentLessonCorrect >= 3
      && (state.lessonCompletions[lessonType] || 0) === state.activePackIndex
      && (state.lessonCompletions[lessonType] || 0) < packs.length;

    if (canAdvancePack) {
      state.lessonCompletions[lessonType] += 1;
      const nextPack = packs[Math.min(state.lessonCompletions[lessonType], packs.length - 1)];
      if (nextPack && state.lessonCompletions[lessonType] < packs.length) {
        addMilestone(`${lesson.title} mastered. ${nextPack.title} is ready next time.`);
      }
    }

    addMilestone(`${lesson.title} complete: ${scoreLine}.`);
    if (checkpointReady()) {
      state.guideSpeech = "Balanced practice is complete. The checkpoint review is open.";
      setFeedback("Checkpoint unlocked. Start the mixed review when you are ready.", "good");
    } else {
      state.guideSpeech = guideLine("success", lessonType);
      setFeedback(`${lesson.title} complete: ${scoreLine}.`, state.currentLessonCorrect >= 3 ? "good" : "neutral");
    }
  }

  state.activeLesson = null;
  state.activeLessonPhase = null;
  state.activeQuestion = null;
  state.activePackIndex = 0;
  state.questionIndex = 0;
  state.cycleLength = 0;
  state.currentLessonCorrect = 0;
  selectedChoiceValue = "";
  DOM.answerInput.value = "";
  saveState();
  render();
}

function submitCurrentAnswer() {
  if (state.activeLessonPhase === "study") {
    beginPracticeRound();
    return;
  }

  if (!state.activeQuestion) {
    setFeedback("Choose a lesson first.", "bad");
    render();
    return;
  }

  const question = state.activeQuestion;
  const rawValue = question.mode === "input" ? DOM.answerInput.value.trim() : selectedChoiceValue;

  if (!rawValue) {
    setFeedback(question.mode === "input" ? "Type your answer first." : "Pick a choice first.", "bad");
    render();
    return;
  }

  evaluateCurrentQuestion(rawValue);

  if (state.questionIndex + 1 >= state.cycleLength) {
    finishLesson();
    return;
  }

  state.questionIndex += 1;
  state.activeQuestion = buildQuestionForLesson(state.activeLesson);
  state.focusCard = state.activeQuestion.focus || state.focusCard;
  selectedChoiceValue = "";
  DOM.answerInput.value = "";
  saveState();
  render();
}

function resetCurrentProfile() {
  if (!currentProfileId) {
    return;
  }

  const profile = getCurrentProfile();
  const shouldReset = window.confirm(
    `Reset the Mandarin course for ${profile ? profile.name : "this learner"}?`,
  );

  if (!shouldReset) {
    return;
  }

  replaceState(createFreshState());
  selectedGuide = "panda";
  saveState();
  render();
}

function openGuideSetup() {
  if (!DOM.setupModal.open) {
    DOM.setupModal.showModal();
  }
}

function closeGuideSetup() {
  if (DOM.setupModal.open) {
    DOM.setupModal.close();
  }
}

function selectGuide(guideId) {
  selectedGuide = guideId;
  Array.from(DOM.guideGrid.querySelectorAll(".guide-option")).forEach((button) => {
    button.classList.toggle("selected", button.dataset.guide === guideId);
  });
}

function beginCourseWithGuide() {
  state.guideType = selectedGuide;
  state.guideSpeech = `${GUIDE_TYPES[selectedGuide].label} is ready. Start with the mini lesson in pinyin or tones.`;
  state.focusCard = currentDistrict().focus;
  saveState();
  closeGuideSetup();
  render();
}

function idleChallengeState() {
  if (!currentProfileId) {
    return {
      title: "Pick a learner to begin",
      counter: "0 / 0",
      prompt: "Create a learner profile to keep separate course progress on this browser.",
      type: "Course ready",
      text: "The intro Mandarin course will begin after a learner profile is selected.",
    };
  }

  if (!state.guideType) {
    return {
      title: "Choose a study pet to begin",
      counter: "0 / 0",
      prompt: "Pick a study pet, then start with Pinyin Path.",
      type: "Setup ready",
      text: "Each lesson path begins with a mini lesson before any questions appear.",
    };
  }

  if (checkpointReady()) {
    const nextDistrict = nextLockedDistrict();
    return {
      title: "Checkpoint review is open",
      counter: "Ready",
      prompt: nextDistrict
        ? `Balanced practice unlocked the mixed review for ${nextDistrict.name}.`
        : "You unlocked every district. Keep reviewing to strengthen the course.",
      type: "Mixed review",
      text: "Start the checkpoint when you want a combined pinyin, tone, hanzi, and sentence round.",
    };
  }

  if (totalSolvedCount() === 0) {
    return {
      title: "Begin with Pinyin Path",
      counter: "0 solved",
      prompt: "Start with pinyin. The game will teach a small set first, then quiz only that set.",
      type: "First lesson",
      text: "Your guide recommends learning the writing system before the rest of the course.",
    };
  }

  const recommended = Object.entries(state.lessonHistory).sort((left, right) => left[1] - right[1])[0][0];
  return {
    title: "Choose the next lesson",
    counter: `${totalSolvedCount()} solved`,
    prompt: `Best next move: ${LESSONS[recommended].title}. Balanced practice unlocks checkpoints faster.`,
    type: "Study path",
    text: `Keep rotating between pinyin, tones, characters, and sentences to open the next district.`,
  };
}

function renderVisual(visual) {
  if (!visual) {
    return "";
  }

  if (visual.kind === "study") {
    return `
      <div class="visual-card study-visual">
        <p class="visual-kicker">${escapeHtml(visual.kicker)}</p>
        <div class="visual-main">${escapeHtml(visual.title)}</div>
        <p class="visual-sub">${escapeHtml(visual.summary)}</p>
        <div class="study-list">
          ${visual.rows
            .map((row) => `<div class="study-row">${escapeHtml(row)}</div>`)
            .join("")}
        </div>
      </div>
    `;
  }

  if (visual.kind === "tone") {
    return `
      <div class="tone-visual">
        <p class="visual-kicker">${escapeHtml(visual.kicker)}</p>
        <div class="tone-visual-main">
          <span class="tone-syllable">${escapeHtml(visual.syllable)}</span>
          <span class="tone-chip">${escapeHtml(visual.chip)}</span>
        </div>
        <p class="visual-sub">${escapeHtml(visual.sub)}</p>
      </div>
    `;
  }

  if (visual.kind === "sentence") {
    return `
      <div class="sentence-visual">
        <p class="visual-kicker">${escapeHtml(visual.kicker)}</p>
        <div class="sentence-main">${escapeHtml(visual.hanzi)}</div>
        <p class="sentence-pinyin">${escapeHtml(visual.pinyin)}</p>
        <p class="sentence-note">${escapeHtml(visual.note)}</p>
      </div>
    `;
  }

  return `
    <div class="visual-card">
      <p class="visual-kicker">${escapeHtml(visual.kicker)}</p>
      <div class="visual-main">${escapeHtml(visual.main)}</div>
      <p class="visual-sub">${escapeHtml(visual.sub)}</p>
    </div>
  `;
}

function renderChoices(choices) {
  DOM.choiceGrid.innerHTML = choices
    .map((choice) => {
      const selectedClass = selectedChoiceValue === choice.value ? "choice-button selected" : "choice-button";
      return `
        <button class="${selectedClass}" data-choice-value="${escapeHtml(choice.value)}" type="button">
          <span class="choice-label">${escapeHtml(choice.label)}</span>
          ${choice.detail ? `<span class="choice-detail">${escapeHtml(choice.detail)}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function renderLessonInterface() {
  if (state.activeLesson && state.activeLessonPhase === "study") {
    const lesson = LESSONS[state.activeLesson];
    const studyVisual = lessonStudyVisual(state.activeLesson, activeLessonPack(state.activeLesson));
    DOM.challengeTitle.textContent = lesson.title;
    DOM.questionCounter.textContent = "Lesson first";
    DOM.lessonPrompt.textContent =
      state.activeLesson === "checkpoint"
        ? "This review only uses material already taught in earlier mini lessons."
        : "Mini lesson first. Practice starts after you review these items.";
    DOM.questionType.textContent = "Mini lesson";
    DOM.questionText.textContent =
      state.activeLesson === "checkpoint"
        ? "Review the summary, then begin the mixed checkpoint."
        : "Read the new material first, then start the short practice round.";
    DOM.lessonVisuals.innerHTML = renderVisual(studyVisual);
    DOM.choiceGrid.innerHTML = "";
    DOM.answerInput.classList.add("hidden");
    DOM.answerInput.disabled = true;
    DOM.answerButton.textContent = state.activeLesson === "checkpoint" ? "Start Review" : "Start Practice";
    DOM.answerButton.disabled = false;
    return;
  }

  if (!state.activeQuestion || !state.activeLesson) {
    const idle = idleChallengeState();
    DOM.challengeTitle.textContent = idle.title;
    DOM.questionCounter.textContent = idle.counter;
    DOM.lessonPrompt.textContent = idle.prompt;
    DOM.questionType.textContent = idle.type;
    DOM.questionText.textContent = idle.text;
    DOM.lessonVisuals.innerHTML = renderVisual({
      kind: "sentence",
      kicker: "Course overview",
      hanzi: "你好 · 谢谢 · 再见",
      pinyin: "nǐ hǎo · xiè xie · zài jiàn",
      note: "This intro course starts with core greetings and classroom words.",
    });
    DOM.choiceGrid.innerHTML = "";
    DOM.answerInput.classList.add("hidden");
    DOM.answerInput.disabled = true;
    DOM.answerButton.textContent = "Check Answer";
    DOM.answerButton.disabled = true;
    return;
  }

  const lesson = LESSONS[state.activeLesson];
  const question = state.activeQuestion;

  DOM.challengeTitle.textContent = lesson.title;
  DOM.questionCounter.textContent = `${state.questionIndex + 1} / ${state.cycleLength}`;
  DOM.lessonPrompt.textContent = question.prompt || lesson.intro;
  DOM.questionType.textContent = question.typeLabel;
  DOM.questionText.textContent = question.text;
  DOM.lessonVisuals.innerHTML = renderVisual(question.visual);

  if (question.mode === "choice") {
    renderChoices(question.choices || []);
    DOM.answerInput.classList.add("hidden");
    DOM.answerInput.disabled = true;
    DOM.answerButton.textContent = "Check Choice";
  } else {
    DOM.choiceGrid.innerHTML = "";
    DOM.answerInput.classList.remove("hidden");
    DOM.answerInput.disabled = false;
    DOM.answerInput.placeholder = question.inputPlaceholder || "Type your answer";
    DOM.answerButton.textContent = "Check Answer";
  }

  updateAnswerButtonState();
}

function renderRewards() {
  const rewards = state.lastRewards;
  DOM.rewardStrip.innerHTML = [
    `Pinyin +${rewards.pinyin}`,
    `Tones +${rewards.tones}`,
    `Hanzi +${rewards.characters}`,
    `Sentences +${rewards.sentences}`,
    `Lanterns +${rewards.lanterns}`,
  ]
    .map((label) => `<div class="reward-pill">${escapeHtml(label)}</div>`)
    .join("");
}

function renderDistricts() {
  const unlocked = unlockedDistricts();
  DOM.zoneList.innerHTML = DISTRICTS.map((district) => {
    const isUnlocked = unlocked.some((item) => item.id === district.id);
    const isCurrent = currentDistrict().id === district.id;
    const classes = [
      "zone-card",
      isUnlocked ? "unlocked" : "locked",
      isCurrent ? "current" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `
      <article class="${classes}">
        <div class="zone-card-top">
          <div class="zone-icon" style="background:${district.color};">${escapeHtml(district.icon)}</div>
          <span class="chip zone-status">${isUnlocked ? "Open" : "Locked"}</span>
        </div>
        <h3>${escapeHtml(district.name)}</h3>
        <p class="zone-copy">${escapeHtml(district.summary)}</p>
      </article>
    `;
  }).join("");
}

function renderMilestones() {
  DOM.milestoneList.innerHTML = state.milestoneLog
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  DOM.milestoneCount.textContent = `${state.milestoneLog.length} moments`;
}

function renderScene() {
  const district = currentDistrict();
  const guide = GUIDE_TYPES[state.guideType || selectedGuide] || GUIDE_TYPES.panda;
  const focus = state.focusCard || district.focus;

  DOM.districtName.textContent = district.name;
  DOM.stageChip.textContent = currentStage().name;
  DOM.unitChip.textContent = `Unit ${Math.min(state.checkpointsCleared + 1, DISTRICTS.length)}`;
  DOM.studyScene.style.background = district.sceneGradient;
  DOM.guideAvatar.dataset.guide = state.guideType || selectedGuide;
  DOM.guideSpeech.textContent = state.guideSpeech;
  DOM.guideNameLabel.textContent = guide.label;
  DOM.guideMoodLine.textContent = guide.personality;
  DOM.focusMeaning.textContent = focus.english;
  DOM.focusHanzi.textContent = focus.hanzi;
  DOM.focusPinyin.textContent = focus.pinyin;
}

function renderFeedback() {
  DOM.feedbackText.textContent = state.feedbackMessage;
  DOM.feedbackCard.classList.remove("good", "bad");
  if (state.feedbackTone === "good" || state.feedbackTone === "bad") {
    DOM.feedbackCard.classList.add(state.feedbackTone);
  }
}

function renderMeters() {
  const meterPairs = [
    [DOM.pinyinValue, DOM.pinyinMeter, state.pinyinSkill],
    [DOM.toneValue, DOM.toneMeter, state.toneSkill],
    [DOM.characterValue, DOM.characterMeter, state.characterSkill],
    [DOM.sentenceValue, DOM.sentenceMeter, state.sentenceSkill],
  ];

  meterPairs.forEach(([label, meter, value]) => {
    label.textContent = `${value}%`;
    meter.style.width = `${value}%`;
  });

  DOM.lanternValue.textContent = state.lanterns;
  DOM.streakValue.textContent = state.streak;
  DOM.streakLine.textContent =
    state.streak > 0
      ? `${state.streak} correct answer${state.streak === 1 ? "" : "s"} in a row.`
      : "Correct answers in a row will build momentum.";
}

function renderCheckpointState() {
  const nextDistrict = nextLockedDistrict();

  DOM.checkpointMeterValue.textContent = `${state.reviewMeter}%`;

  if (checkpointReady()) {
    DOM.checkpointTitle.textContent = nextDistrict ? `${nextDistrict.name} is ready` : "All districts unlocked";
    DOM.checkpointHint.textContent = nextDistrict
      ? `Start the mixed review to unlock ${nextDistrict.name}.`
      : "You have unlocked every district. Keep using checkpoints as mixed review.";
    DOM.checkpointButton.textContent = "Start Checkpoint";
    DOM.checkpointButton.disabled = false;
  } else {
    DOM.checkpointTitle.textContent = "Checkpoint locked";
    DOM.checkpointHint.textContent =
      "Finish some practice in all four lesson paths and fill the review meter to 100%.";
    DOM.checkpointButton.textContent = "Checkpoint Locked";
    DOM.checkpointButton.disabled = true;
  }

  if (nextDistrict) {
    DOM.unlockLine.textContent = nextDistrict.name;
    DOM.unlockHint.textContent = checkpointReady()
      ? "The mixed review can unlock it now."
      : "Balance all four lesson paths to open the checkpoint.";
  } else {
    DOM.unlockLine.textContent = "Course complete";
    DOM.unlockHint.textContent = "Keep reviewing to strengthen core beginner Mandarin.";
  }
}

function renderProfileChip() {
  const currentProfile = getCurrentProfile();
  DOM.playerChip.textContent = currentProfile ? currentProfile.name : "Choose Player";
}

function renderLessonButtons() {
  const disabled = !currentProfileId || !state.guideType;
  DOM.lessonButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function updateAnswerButtonState() {
  if (state.activeLessonPhase === "study") {
    DOM.answerButton.disabled = false;
    return;
  }

  if (!state.activeQuestion || !state.activeLesson) {
    DOM.answerButton.disabled = true;
    return;
  }

  if (state.activeQuestion.mode === "choice") {
    DOM.answerButton.disabled = !selectedChoiceValue;
    return;
  }

  DOM.answerButton.disabled = !DOM.answerInput.value.trim();
}

function render() {
  renderProfileChip();
  renderScene();
  renderLessonInterface();
  renderFeedback();
  renderRewards();
  renderMeters();
  renderCheckpointState();
  renderDistricts();
  renderMilestones();
  renderLessonButtons();

  if (!currentProfileId) {
    openProfileChooser();
    return;
  }

  if (!state.guideType) {
    selectGuide(selectedGuide);
    openGuideSetup();
  } else {
    closeGuideSetup();
  }
}

DOM.profileCreateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createProfile(DOM.profileNameInput.value);
});

DOM.profileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-id]");
  if (!button) {
    return;
  }

  activateProfile(button.dataset.profileId);
});

DOM.switchPlayerButton.addEventListener("click", openProfileChooser);
DOM.closeProfileButton.addEventListener("click", closeProfileChooser);
DOM.helpButton.addEventListener("click", () => DOM.helpModal.showModal());
DOM.closeHelpButton.addEventListener("click", () => DOM.helpModal.close());
DOM.resetButton.addEventListener("click", resetCurrentProfile);
DOM.checkpointButton.addEventListener("click", () => startLesson("checkpoint"));

DOM.lessonButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startLesson(button.dataset.lesson);
  });
});

DOM.choiceGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) {
    return;
  }

  selectedChoiceValue = button.dataset.choiceValue;
  renderLessonInterface();
});

DOM.answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitCurrentAnswer();
});

DOM.answerInput.addEventListener("input", updateAnswerButtonState);

DOM.guideGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-guide]");
  if (!button) {
    return;
  }

  selectGuide(button.dataset.guide);
});

DOM.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  beginCourseWithGuide();
});

initializeCourse();
