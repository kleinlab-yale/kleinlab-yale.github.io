const SAVE_KEY = "math-pet-sky-meadow-v3";
const QUEST_PASS = 3;
const BOSS_PASS = 5;

const ASSETS = {
  backdrop: "assets/gpt-meadow-backdrop.png",
  egg: "assets/gpt-egg.png",
  puppy: "assets/gpt-puppy-base.png",
  bow: "assets/gpt-puppy-bow.png",
  sweater: "assets/gpt-puppy-sweater.png",
  collar: "assets/gpt-puppy-collar.png",
  thinking: "assets/gpt-puppy-thinking.png",
  celebrate: "assets/gpt-puppy-celebrate.png",
  sleepy: "assets/gpt-puppy-sleepy.png",
};

const WORLDS = [
  { name: "Sky Meadow", focus: "multiplication arrays" },
  { name: "Ribbon Bridge", focus: "fraction comparison" },
  { name: "Shape Grove", focus: "area and perimeter" },
  { name: "Division Dunes", focus: "long division" },
  { name: "Crystal Decimal Cove", focus: "fractions to decimals" },
  { name: "Workshop Meadow", focus: "multi-digit multiplication" },
  { name: "Aurora Academy", focus: "equations and mixed mastery" },
];

const QUEST_FLOW = ["number", "fraction", "geometry", "boss"];
const QUEST_LABELS = {
  number: "Snack Math",
  fraction: "Bridge Math",
  geometry: "Build Math",
  boss: "World Boss",
};

const CLOSET = [
  { id: "none", name: "No extra", asset: null, kind: "all", unlock: true },
  { id: "sweater", name: "Peach sweater", asset: "assets/gpt-puppy-sweater.png", kind: "look" },
  { id: "bow", name: "Berry bow", asset: "assets/gpt-puppy-bow.png", kind: "look" },
  { id: "collar", name: "Bell collar", asset: "assets/gpt-puppy-collar.png", kind: "look" },
];

const els = {
  canvas: document.querySelector("#worldCanvas"),
  setupOverlay: document.querySelector("#setupOverlay"),
  setupForm: document.querySelector("#setupForm"),
  eggRow: document.querySelector("#eggRow"),
  playerInput: document.querySelector("#playerInput"),
  petInput: document.querySelector("#petInput"),
  profileButton: document.querySelector("#profileButton"),
  closetButton: document.querySelector("#closetButton"),
  resetButton: document.querySelector("#resetButton"),
  closetOverlay: document.querySelector("#closetOverlay"),
  closeClosetButton: document.querySelector("#closeClosetButton"),
  closetGrid: document.querySelector("#closetGrid"),
  objectiveTitle: document.querySelector("#objectiveTitle"),
  objectiveText: document.querySelector("#objectiveText"),
  petNameLabel: document.querySelector("#petNameLabel"),
  foodBar: document.querySelector("#foodBar"),
  energyBar: document.querySelector("#energyBar"),
  growthBar: document.querySelector("#growthBar"),
  worldLabel: document.querySelector("#worldLabel"),
  sparkleLabel: document.querySelector("#sparkleLabel"),
  questButton: document.querySelector("#questButton"),
  questButtonLabel: document.querySelector("#questButtonLabel"),
  callPetButton: document.querySelector("#callPetButton"),
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

function restartGame() {
  resetLocalSaves();
  selectedEgg = "sunny";
  activeRound = null;
  activeProblem = null;
  state = createInitialState();
  els.playerInput.value = "";
  els.petInput.value = "";
  document.querySelectorAll("[data-egg]").forEach((item) => {
    item.classList.toggle("active", item.dataset.egg === selectedEgg);
  });
  setOverlay(els.questOverlay, false);
  setOverlay(els.closetOverlay, false);
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

  els.setupOverlay.classList.toggle("show", !state.setup);
  els.objectiveTitle.textContent = state.stage === "egg" ? "Hatch the puppy" : `${questName}: ${world.name}`;
  els.objectiveText.textContent = state.stage === "egg"
    ? "Click Practice Math. Pass the first snack quest to hatch the egg."
    : `Practice ${world.focus}. Pass with ${pass}/${size} correct to unlock the next beat.`;
  els.petNameLabel.textContent = state.stage === "egg" ? `${state.petName}'s egg` : state.petName;
  els.foodBar.style.width = `${state.food}%`;
  els.energyBar.style.width = `${state.energy}%`;
  els.growthBar.style.width = `${state.growth}%`;
  els.worldLabel.textContent = `${world.name}  ${state.world + 1}/${WORLDS.length}`;
  els.sparkleLabel.textContent = `${state.glow} glow`;
  els.questButtonLabel.textContent = state.stage === "egg" ? "Hatch Quest" : questName;
  renderCloset();
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

function startQuest() {
  const type = currentQuestType();
  const size = currentQuestSize();
  activeRound = {
    type,
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
    els.choiceRow.append(button);
  });
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
    state.food = clamp(state.food + 8, 0, 100);
    state.energy = clamp(state.energy + 5, 0, 100);
    state.growth = clamp(state.growth + 4, 0, 100);
    els.questFeedback.textContent = "Correct. The meadow glows brighter.";
    els.questFeedback.className = "quest-feedback good";
    petPulseUntil = performance.now() + 800;
  } else {
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
  const correct = activeRound.correct;
  const pass = activeRound.pass;
  activeRound = null;
  activeProblem = null;
  setOverlay(els.questOverlay, false);

  if (!passed) {
    showToast(`Retry needed: ${correct}/${pass} correct`);
    state.growth = clamp(state.growth - 6, 0, 100);
    saveState();
    renderHud();
    return;
  }

  let message = `${QUEST_LABELS[type]} cleared: ${correct}/${pass}`;
  state.food = clamp(state.food + 10, 0, 100);
  state.energy = clamp(state.energy + 9, 0, 100);
  state.growth = clamp(state.growth + 14, 0, 100);
  state.glow += type === "boss" ? 20 : 8;

  if (type === "number" && state.stage === "egg") {
    state.stage = "puppy";
    state.equipped.look = "none";
    message = `${state.petName} hatched. A cozy closet reward is waiting in the next quests.`;
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
      state.growth = 18;
      message += ` ${currentWorld().name} opened.`;
    } else {
      state.growth = 100;
      message = `${state.petName} mastered Aurora Academy.`;
    }
  }

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
  if (type === "fraction") return makeFractionProblem(world);
  if (type === "geometry") return makeGeometryProblem(world);
  return choose([makeNumberProblem, makeFractionProblem, makeGeometryProblem])(Math.min(world + 1, WORLDS.length - 1), true);
}

function makeNumberProblem(world) {
  if (world <= 1) {
    const a = rand(3, 9);
    const b = rand(3, 9);
    return problem(`${a} x ${b} = ?`, a * b, "Multiplication array", [
      `Think of ${a} rows with ${b} snacks in each row.`,
      `Equal groups mean multiply.`,
      "Find the total number of snacks, then type that number.",
    ]);
  }
  if (world <= 3) {
    const divisor = rand(3, 9);
    const quotient = rand(12, 38);
    const remainder = rand(0, divisor - 1);
    const dividend = quotient * divisor + remainder;
    return problem(`${dividend} / ${divisor} = ? ${remainder ? "(use R for remainder)" : ""}`, remainder ? `${quotient}R${remainder}` : quotient, "Long division", [
      "Estimate how many whole groups of the divisor fit inside the dividend.",
      "Multiply the divisor by your quotient guess, then subtract.",
      remainder ? "If some are left over, write the answer as quotient R remainder." : "If nothing is left over, write just the quotient.",
    ], remainder ? "remainder" : "number");
  }
  if (world <= 5) {
    const a = rand(18, 62);
    const b = rand(12, 24);
    const tens = Math.floor(b / 10) * 10;
    const ones = b - tens;
    return problem(`${a} x ${b} = ?`, a * b, "Partial products", [
      `Split ${b} into ${tens} + ${ones}.`,
      `Multiply ${a} by the tens part, then multiply ${a} by the ones part.`,
      "Add the two partial products to get the final product.",
    ]);
  }
  const x = rand(4, 18);
  const add = rand(6, 24);
  return problem(`x + ${add} = ${x + add}. What is x?`, x, "One-step equation", [
    `Undo + ${add} by subtracting ${add}.`,
    `Subtract ${add} from the total on the right side.`,
    "The number left over is x.",
  ]);
}

function makeFractionProblem(world) {
  if (world <= 2) {
    const d = rand(4, 10);
    let a = rand(1, d - 1);
    let b = rand(1, d - 1);
    if (a === b) b = b === d - 1 ? b - 1 : b + 1;
    const answer = a > b ? "greater-than" : "less-than";
    const answerLabel = a > b ? ">" : "<";
    return problem(`${a}/${d} ? ${b}/${d}`, answer, "Compare fractions", [
      `The denominators both equal ${d}.`,
      `Compare the numerators: ${a} and ${b}.`,
      "The fraction with the larger numerator is larger.",
    ], "choice", [
      { label: "<", value: "less-than" },
      { label: "=", value: "equal" },
      { label: ">", value: "greater-than" },
    ], answerLabel);
  }
  if (world <= 4) {
    const options = [
      ["1/2", "0.5"],
      ["1/4", "0.25"],
      ["3/4", "0.75"],
      ["1/5", "0.2"],
      ["2/5", "0.4"],
    ];
    const [fraction, decimal] = choose(options);
    return problem(`${fraction} as a decimal = ?`, decimal, "Fraction to decimal", [
      "Divide the numerator by the denominator.",
      "Fractions like fourths can become hundredths.",
      "Write the decimal value without extra words.",
    ], "decimal");
  }
  const denominator = choose([3, 4, 5, 6, 8]);
  const scale = rand(2, 5);
  const numerator = rand(1, denominator - 1);
  return problem(`x/${denominator} = ${numerator * scale}/${denominator * scale}. What is x?`, numerator, "Reverse equivalent fraction", [
    `${denominator} x ${scale} = ${denominator * scale}.`,
    `Undo the same scale on the numerator: ${numerator * scale} / ${scale}.`,
    "That unscaled numerator is x.",
  ]);
}

function makeGeometryProblem(world) {
  if (world <= 2) {
    const w = rand(4, 12);
    const h = rand(3, 9);
    const askArea = Math.random() > 0.4;
    return problem(`A garden mat is ${w} by ${h}. What is its ${askArea ? "area" : "perimeter"}?`, askArea ? w * h : 2 * (w + h), "Area vs perimeter", askArea ? [
      "Area measures inside space.",
      `Use length x width: ${w} x ${h}.`,
      "Multiply to find the square units inside.",
    ] : [
      "Perimeter measures around the outside.",
      `Add all sides: ${w} + ${h} + ${w} + ${h}.`,
      "The sum is the distance around the mat.",
    ]);
  }
  if (world <= 5) {
    const a = rand(3, 7);
    const b = rand(4, 9);
    const h1 = rand(5, 9);
    const h2 = rand(2, h1 - 1);
    const total = a * h1 + b * h2;
    return problem(`Composite area: ${a}x${h1} plus ${b}x${h2} = ?`, total, "Composite area", [
      `Find the first rectangle area: ${a} x ${h1}.`,
      `Find the second rectangle area: ${b} x ${h2}.`,
      "Add both rectangle areas together.",
    ]);
  }
  const side = rand(6, 15);
  return problem(`A square has perimeter ${side * 4}. Solve 4x = ${side * 4}.`, side, "Geometry equation", [
    "A square has 4 equal sides.",
    "Perimeter equals 4 times one side.",
    "Divide the perimeter by 4 to find one side.",
  ]);
}

function problem(prompt, answer, lessonTitle, steps, answerType = "number", choices = null, displayAnswer = null) {
  return {
    prompt,
    answer,
    answerType,
    displayAnswer: displayAnswer ?? String(answer).replace("R", " R "),
    lessonTitle,
    steps,
    choices,
  };
}

function isCorrect(value, item) {
  if (item.answerType === "number") return Math.abs(Number(value) - Number(item.answer)) < 0.001;
  if (item.answerType === "decimal") return Math.abs(Number(value) - Number(item.answer)) < 0.001;
  if (item.answerType === "remainder") return normalize(value) === normalize(item.answer).replace("remainder", "r");
  if (item.answerType === "choice") return normalizeChoice(value) === normalizeChoice(item.answer);
  return normalize(value) === normalize(item.answer);
}

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "").replace(/remainder/g, "r").replace(/rem/g, "r");
}

function normalizeChoice(value) {
  const normalized = normalize(value).replace(/&lt;|‹|less-than|lessthan|less/g, "<")
    .replace(/&gt;|›|greater-than|greaterthan|morethan|greater|more/g, ">")
    .replace(/equalto|equals/g, "=");
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

els.questButton.addEventListener("click", startQuest);
els.callPetButton.addEventListener("click", () => {
  petPulseUntil = performance.now() + 1200;
  showToast(state.stage === "egg" ? "The egg wiggles." : `${state.petName} trots closer.`);
});

els.closeQuestButton.addEventListener("click", () => setOverlay(els.questOverlay, false));
els.questForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});
els.choiceRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice-index]");
  if (!button) return;
  const choice = activeProblem?.choices?.[Number(button.dataset.choiceIndex)];
  if (!choice) return;
  submitAnswer(choiceValue(choice));
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
  const cameraX = Math.sin(time * 0.00018) * 0.45 + pulse * 0.16;
  const cameraY = 2.25 + Math.sin(time * 0.00027) * 0.08;
  const projection = perspective(Math.PI / 4.5, aspect, 0.1, 80);
  const view = lookAt([cameraX, cameraY, 7.2], [0, 0.9, -1.2], [0, 1, 0]);
  const pv = multiply(projection, view);

  const objects = [
    { tex: "backdrop", x: 0, y: 1.15, z: -6.4, w: 24.0, h: 13.5, rx: 0, a: 1 },
  ];

  objects.forEach((obj) => drawObject(gl, textures[obj.tex], pv, obj, matrix, alpha));

  const bob = Math.sin(time * 0.004) * 0.045 + pulse * 0.08;
  const scale = state.stage === "egg" ? 1.15 : 1.72 + Math.min(0.25, state.growth / 500);
  const pet = { tex: state.stage === "egg" ? "egg" : petTextureKey(), x: 0.12, y: 0.56 + bob, z: 0.55, w: scale, h: scale * 1.1, rx: 0, a: 1 };
  drawObject(gl, textures[pet.tex], pv, pet, matrix, alpha);

  requestAnimationFrame(drawScene);
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
  const zAxis = normalize([
    camera[0] - target[0],
    camera[1] - target[1],
    camera[2] - target[2],
  ]);
  const xAxis = normalize(cross(up, zAxis));
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

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

renderHud();
requestAnimationFrame(drawScene);
