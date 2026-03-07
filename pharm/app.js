const EPS = 1e-15;
const CONC_MIN_NM = 0.1;
const CONC_MAX_NM = 5000.0;
const LINEAR_MAX_NM = 1000.0;
const NM_TO_M = 1e-9;
const BMAX_FIXED = 100.0;
const EMAX_FIXED = 100.0;
const QUANTAL_MIN_MGKG = 1.0;
const QUANTAL_MAX_MGKG = 200.0;
const PLOT_CONFIG = {
  responsive: true,
  displaylogo: false,
};

const TAB_IDS = ["binding", "efficacy", "classes", "antagonists", "partial", "spare", "quantal"];
const dirtyTabs = Object.fromEntries(TAB_IDS.map((tabId) => [tabId, true]));
let activeTabId = "binding";
let selectedAntagonistClassKey = "competitive-antagonist";

const ANTAGONIST_CLASS_DATA = {
  "antagonists-overview": {
    title: "Antagonists",
    summary: "Antagonists reduce agonist responses either by interacting with the receptor itself or by opposing the agonist through nonreceptor mechanisms.",
    bullets: [
      "Receptor antagonists change signaling at the same receptor system as the agonist.",
      "Nonreceptor antagonists reduce the final tissue response without occupying that receptor.",
      "The dose-response graph changes differently depending on the mechanism.",
    ],
  },
  "receptor-antagonists": {
    title: "Receptor antagonists",
    summary: "These antagonists act through the same receptor system used by the agonist.",
    bullets: [
      "They can bind the active site or an allosteric site on the receptor.",
      "Some are surmountable, while others reduce the maximal possible response.",
      "Graph interpretation usually focuses on changes in potency, efficacy, or both.",
    ],
  },
  "nonreceptor-antagonists": {
    title: "Nonreceptor antagonists",
    summary: "These reduce agonist effect without blocking the agonist at the receptor binding site.",
    bullets: [
      "The mechanism is outside classic receptor competition.",
      "They often do not produce the simple receptor-level right-shift pattern.",
      "Chemical and physiologic antagonism are the main teaching examples.",
    ],
  },
  "active-site-binding": {
    title: "Active site binding",
    summary: "The antagonist occupies the receptor's agonist binding site, also called the orthosteric or active site.",
    bullets: [
      "Reversible active-site antagonism typically behaves as competitive antagonism.",
      "Irreversible active-site antagonism usually lowers maximal response.",
      "The major graph question is whether Emax is preserved or lost.",
    ],
  },
  "allosteric-binding": {
    title: "Allosteric binding",
    summary: "The antagonist binds a different site on the receptor and changes receptor activation from a distance.",
    bullets: [
      "This usually produces noncompetitive behavior.",
      "Efficacy often falls because the agonist cannot fully activate the receptor system.",
      "The key teaching pattern is reduced maximal effect that is not fully overcome by more agonist.",
    ],
  },
  "active-site-reversible": {
    title: "Reversible active-site binding",
    summary: "A reversible antagonist at the active site competes with the agonist for occupancy of the same receptor site.",
    bullets: [
      "This is the classic setup for competitive antagonism.",
      "Orthosteric ligands at this site can also behave as inverse agonists or partial agonists depending on intrinsic efficacy.",
      "The agonist curve shifts right as more agonist is required to reach the same response.",
      "Efficacy stays the same because enough agonist can still outcompete the antagonist.",
    ],
  },
  "active-site-irreversible": {
    title: "Irreversible active-site binding",
    summary: "An irreversible active-site antagonist removes receptors from the available pool by long-lasting orthosteric binding.",
    bullets: [
      "This behaves as noncompetitive active-site antagonism.",
      "The maximal response falls because fewer functional receptors remain.",
      "Higher agonist concentration does not fully restore Emax.",
    ],
  },
  "allosteric-reversible": {
    title: "Reversible allosteric binding",
    summary: "A reversible negative allosteric antagonist changes receptor behavior from a separate site.",
    bullets: [
      "It is usually not overcome completely by simply adding more agonist.",
      "Graph teaching should focus on reduced efficacy rather than a simple shift in potency.",
      "The teaching pattern is generally noncompetitive with loss of maximal effect.",
    ],
  },
  "allosteric-irreversible": {
    title: "Irreversible allosteric binding",
    summary: "Persistent allosteric inhibition locks the receptor into a less responsive state from a separate binding site.",
    bullets: [
      "The agonist cannot fully recover receptor function with more concentration alone.",
      "Efficacy falls because receptor signaling capacity is reduced.",
      "This is another noncompetitive pattern, often with a durable loss of response.",
    ],
  },
  "competitive-antagonist": {
    title: "Competitive antagonist",
    summary: "A competitive antagonist reversibly occupies the active site and competes directly with the agonist.",
    graphChange: "Parallel rightward shift of the agonist dose-response curve with preserved Emax.",
    example: "Naloxone at opioid receptors; atropine at muscarinic receptors.",
    bullets: [
      "Agonist dose-response curve shifts to the right.",
      "Efficacy or Emax stays the same.",
      "More agonist can overcome the antagonism.",
      "Examples: naloxone at opioid receptors, or atropine at muscarinic receptors.",
      "Teaching pearl: competitive antagonism primarily changes potency, not maximal efficacy.",
    ],
  },
  "inverse-agonist": {
    title: "Inverse agonist",
    summary: "An inverse agonist binds the receptor and stabilizes the inactive state, reducing constitutive receptor activity below basal signaling.",
    graphChange: "Reduces basal signaling below constitutive activity; the observed response starts from a lower baseline.",
    example: "Many H1 antihistamines such as cetirizine behave as inverse agonists.",
    bullets: [
      "This is not just neutral blockade; it produces negative intrinsic efficacy.",
      "Basal activity falls even in the absence of agonist.",
      "If an agonist is added, the observed response curve can appear depressed until sufficient agonist displaces the inverse agonist.",
      "Example: many H1 antihistamines such as cetirizine behave as inverse agonists.",
      "Teaching pearl: a competitive antagonist blocks agonist effect, while an inverse agonist pushes receptor signaling in the opposite direction.",
    ],
  },
  "partial-agonist": {
    title: "Partial agonist",
    summary: "A partial agonist binds the same active site as the full agonist but has lower intrinsic efficacy, so it can function as a competitive antagonist when both drugs are present.",
    graphChange: "In the presence of a full agonist, the net response is pulled down toward the lower partial-agonist Emax because receptor occupancy is shared by a less efficacious ligand.",
    example: "Buprenorphine is a classic partial agonist at the mu-opioid receptor.",
    bullets: [
      "It competes reversibly at the same orthosteric site as the full agonist.",
      "Unlike a neutral antagonist, it has efficacy greater than zero but less than the full agonist.",
      "When it displaces a full agonist, the observed tissue response falls because the receptor is now occupied by a less efficacious drug.",
      "Example: buprenorphine is a classic partial agonist at the mu-opioid receptor.",
      "Teaching pearl: this is a useful special case of competitive antagonism because occupancy is competitive, but the blocker itself still produces some effect.",
    ],
  },
  "noncompetitive-active-site": {
    title: "Noncompetitive active-site antagonist",
    summary: "An irreversible active-site antagonist reduces the number of receptors available for agonist activation.",
    graphChange: "Reduced Emax with insurmountable antagonism; adding agonist does not fully restore the maximum.",
    example: "Phenoxybenzamine is a classic irreversible alpha-adrenoceptor antagonist.",
    bullets: [
      "Maximal response falls.",
      "The graph is not rescued fully by more agonist.",
      "Potency may not change much, but efficacy is reduced.",
      "Example: phenoxybenzamine is a classic irreversible alpha-adrenoceptor antagonist.",
      "Teaching pearl: this is insurmountable antagonism caused by receptor loss.",
    ],
  },
  "noncompetitive-allosteric": {
    title: "Noncompetitive allosteric antagonist",
    summary: "An allosteric antagonist reduces receptor activation from a separate site rather than by direct competition at the active site.",
    graphChange: "Reduced efficacy with a lower maximal effect (reduced Emax).",
    example: "Maraviroc is an allosteric antagonist at CCR5.",
    bullets: [
      "Efficacy usually falls, so the curve is lower.",
      "More agonist does not fully overcome the block.",
      "Teach this as loss of maximal effect rather than as a right-shift pattern.",
      "Example: maraviroc is an allosteric antagonist at CCR5.",
      "Teaching pearl: allosteric antagonism often changes both receptor performance and observed efficacy.",
    ],
  },
  "chemical-antagonist": {
    title: "Chemical antagonist",
    summary: "A chemical antagonist inactivates or sequesters the agonist before the agonist can act at the receptor.",
    graphChange: "No single receptor-level shift rule; the apparent response falls because active agonist is chemically neutralized.",
    example: "Protamine binds and neutralizes heparin.",
    bullets: [
      "This does not require occupation of the agonist receptor.",
      "The apparent agonist effect falls because active agonist is removed from the system.",
      "The graph change depends on how much agonist is neutralized, not on receptor competition itself.",
      "Example: protamine binds and neutralizes heparin.",
      "Teaching pearl: think direct chemical neutralization rather than receptor blockade.",
    ],
  },
  "physiologic-antagonist": {
    title: "Physiologic antagonist",
    summary: "A physiologic antagonist activates a different receptor system that produces an opposing tissue effect.",
    graphChange: "No classic receptor-blockade shift pattern; the net tissue response is opposed by a separate signaling pathway.",
    example: "Epinephrine can functionally oppose histamine-induced bronchoconstriction.",
    bullets: [
      "The original agonist receptor can remain completely unblocked.",
      "Net tissue response falls because two signaling pathways oppose each other.",
      "This is not a classic receptor-level right shift or noncompetitive blockade pattern.",
      "Example: epinephrine can functionally oppose histamine-induced bronchoconstriction.",
      "Teaching pearl: the antagonism is functional at the level of the organ response.",
    ],
  },
};

function fmtNm(valueNm) {
  if (valueNm >= 100) {
    return valueNm.toFixed(0);
  }
  if (valueNm >= 10) {
    return valueNm.toFixed(1);
  }
  return valueNm.toFixed(2);
}

function nmToM(valueNm) {
  return valueNm * NM_TO_M;
}

function linspace(start, end, points) {
  if (points <= 1) {
    return [start];
  }
  const step = (end - start) / (points - 1);
  return Array.from({ length: points }, (_, index) => start + step * index);
}

function logspace(startExp, endExp, points) {
  return linspace(startExp, endExp, points).map((value) => 10 ** value);
}

function hillResponse(concentrations, emax, ec50, hillN = 1.0) {
  const safeEc50 = Math.max(ec50, EPS);
  const safeHill = Math.max(hillN, EPS);
  const ec50Pow = safeEc50 ** safeHill;
  return concentrations.map((conc) => {
    const concPow = Math.max(conc, 0) ** safeHill;
    return (emax * concPow) / (ec50Pow + concPow);
  });
}

function competitiveMixedAgonistResponse(fullConcentrations, fullEc50, fullHill, partialConcentration, partialEc50, partialHill, partialIntrinsic) {
  const safeFullEc50 = Math.max(fullEc50, EPS);
  const safeFullHill = Math.max(fullHill, EPS);
  const safePartialEc50 = Math.max(partialEc50, EPS);
  const safePartialHill = Math.max(partialHill, EPS);
  const safeIntrinsic = Math.max(partialIntrinsic, 0);
  const partialTerm =
    Math.max(partialConcentration, 0) > 0
      ? (Math.max(partialConcentration, 0) / safePartialEc50) ** safePartialHill
      : 0;

  return fullConcentrations.map((fullConcentration) => {
    const fullTerm =
      Math.max(fullConcentration, 0) > 0
        ? (Math.max(fullConcentration, 0) / safeFullEc50) ** safeFullHill
        : 0;
    const denominator = 1 + fullTerm + partialTerm;
    const fractionalFull = fullTerm / denominator;
    const fractionalPartial = partialTerm / denominator;
    return EMAX_FIXED * (fractionalFull + safeIntrinsic * fractionalPartial);
  });
}

function concentrationGridsNm(points = 500) {
  return {
    xLogNm: logspace(Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM), points),
    xLinearNm: linspace(0, LINEAR_MAX_NM, points),
  };
}

function addReferenceLines(layout, options = {}) {
  const { vlines = [], hlines = [] } = options;
  const shapes = layout.shapes ? [...layout.shapes] : [];
  const annotations = layout.annotations ? [...layout.annotations] : [];

  vlines.forEach(([x, label, color]) => {
    shapes.push({
      type: "line",
      x0: x,
      x1: x,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color, width: 2, dash: "dot" },
      layer: "above",
    });
    if (label) {
      annotations.push({
        x,
        y: 1.01,
        xref: "x",
        yref: "paper",
        text: label,
        showarrow: false,
        font: { color, size: 11 },
        bgcolor: "rgba(255,255,255,0.85)",
      });
    }
  });

  hlines.forEach(([y, label, color]) => {
    shapes.push({
      type: "line",
      x0: 0,
      x1: 1,
      y0: y,
      y1: y,
      xref: "paper",
      yref: "y",
      line: { color, width: 2, dash: "dash" },
      layer: "above",
    });
    if (label) {
      annotations.push({
        x: 1,
        y,
        xref: "paper",
        yref: "y",
        text: label,
        showarrow: false,
        xanchor: "right",
        yanchor: "bottom",
        font: { color, size: 11 },
        bgcolor: "rgba(255,255,255,0.85)",
      });
    }
  });

  return {
    ...layout,
    shapes,
    annotations,
  };
}

function baseLayout(title, xTitle, yTitle, isLogX, yRange = null, xRange = null) {
  const layout = {
    title: {
      text: title,
      font: { family: "Newsreader, serif", size: 21, color: "#15253d" },
    },
    font: { family: "Manrope, sans-serif", size: 13, color: "#15253d" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: "rgba(255,255,255,0.76)",
    },
    margin: { l: 56, r: 30, t: 62, b: 56 },
    xaxis: {
      title: xTitle,
      showgrid: true,
      gridcolor: "#d8deea",
      zeroline: false,
      linecolor: "#aab8cb",
      tickfont: { color: "#42536d" },
    },
    yaxis: {
      title: yTitle,
      showgrid: true,
      gridcolor: "#d8deea",
      zeroline: false,
      linecolor: "#aab8cb",
      tickfont: { color: "#42536d" },
    },
  };

  if (isLogX) {
    layout.xaxis.type = "log";
  }
  if (xRange) {
    layout.xaxis.range = xRange;
  }
  if (yRange) {
    layout.yaxis.range = yRange;
  }

  return layout;
}

function plot(divId, data, layout) {
  Plotly.react(divId, data, layout, PLOT_CONFIG);
}

function legendBelow(layout, bottomMargin = 124) {
  const baseBottomMargin = layout.margin?.b ?? 56;
  const targetHeight = 450 + Math.max(0, bottomMargin - baseBottomMargin);
  return {
    ...layout,
    legend: {
      ...layout.legend,
      x: 0,
      y: -0.24,
      xanchor: "left",
      yanchor: "top",
      orientation: "v",
      bgcolor: "rgba(255,255,255,0.86)",
    },
    margin: {
      ...layout.margin,
      b: bottomMargin,
    },
    height: targetHeight,
  };
}

function getInputValue(id) {
  return Number(document.getElementById(id).value);
}

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setNote(id, text) {
  document.getElementById(id).textContent = text;
}

function renderAntagonistClasses() {
  const activeData = ANTAGONIST_CLASS_DATA[selectedAntagonistClassKey] || ANTAGONIST_CLASS_DATA["competitive-antagonist"];
  document.querySelectorAll(".ant-class-node").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.antClassKey === selectedAntagonistClassKey);
  });

  const titleNode = document.getElementById("ant-class-title");
  const summaryNode = document.getElementById("ant-class-summary");
  const graphBlock = document.getElementById("ant-class-graph-block");
  const graphNode = document.getElementById("ant-class-graph");
  const exampleBlock = document.getElementById("ant-class-example-block");
  const exampleNode = document.getElementById("ant-class-example");
  const listNode = document.getElementById("ant-class-points");
  if (!titleNode || !summaryNode || !listNode || !graphBlock || !graphNode || !exampleBlock || !exampleNode) {
    return;
  }

  titleNode.textContent = activeData.title;
  summaryNode.textContent = activeData.summary;
  graphBlock.hidden = !activeData.graphChange;
  graphNode.textContent = activeData.graphChange || "";
  exampleBlock.hidden = !activeData.example;
  exampleNode.textContent = activeData.example || "";
  listNode.replaceChildren(
    ...activeData.bullets.map((bullet) => {
      const item = document.createElement("li");
      item.textContent = bullet;
      return item;
    })
  );
}

function logisticQuantal(logDose, mu, sigma) {
  const safeSigma = Math.max(sigma, 0.01);
  return 1 / (1 + Math.exp(-(logDose - mu) / safeSigma));
}

function tiColor(tiValue) {
  if (tiValue < 2.0) {
    return "#d34134";
  }
  if (tiValue < 5.0) {
    return "#d37522";
  }
  if (tiValue <= 10.0) {
    return "#b29200";
  }
  return "#1f8a62";
}

function formatControlValue(input) {
  const value = Number(input.value);
  switch (input.dataset.format) {
    case "nm":
      return `${fmtNm(value)} nM`;
    case "mgkg":
      return `${value.toFixed(0)} mg/kg`;
    case "percent0":
      return `${value.toFixed(0)}%`;
    case "decimal1":
      return value.toFixed(1);
    case "decimal2":
      return value.toFixed(2);
    case "fractionx":
      return `${value.toFixed(2)} x`;
    default:
      return String(value);
  }
}

function syncControlOutputs(panel = document) {
  panel.querySelectorAll("input[type='range']").forEach((input) => {
    const output = panel.querySelector(`output[data-for="${input.id}"]`);
    if (output) {
      output.textContent = formatControlValue(input);
    }
  });
}

function renderBinding() {
  const kdValues = [
    Math.max(getInputValue("bind-kd1"), CONC_MIN_NM),
    Math.max(getInputValue("bind-kd2"), CONC_MIN_NM),
    Math.max(getInputValue("bind-kd3"), CONC_MIN_NM),
  ];
  const fractionalMax = 1.0;
  const colors = ["royalblue", "seagreen", "darkorange"];
  const { xLogNm, xLinearNm } = concentrationGridsNm();
  const xLogM = xLogNm.map(nmToM);
  const xLinearM = xLinearNm.map(nmToM);

  const logTraces = kdValues.map((kdNm, index) => ({
    x: xLogNm,
    y: hillResponse(xLogM, fractionalMax, nmToM(kdNm), 1.0),
    mode: "lines",
    name: `Curve ${index + 1}`,
    line: { width: 3, color: colors[index] },
  }));

  const linearTraces = kdValues.map((kdNm, index) => ({
    x: xLinearNm,
    y: hillResponse(xLinearM, fractionalMax, nmToM(kdNm), 1.0),
    mode: "lines",
    name: `Curve ${index + 1}`,
    line: { width: 3, color: colors[index] },
  }));

  let logLayout = baseLayout(
    "Binding Curve (Log X)",
    "Drug concentration [D] (nM, log scale)",
    "Fractional receptor bound [LR]/[R0]",
    true,
    [0, 1.05],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  logLayout = addReferenceLines(logLayout, {
    vlines: kdValues.map((value, index) => [value, "", colors[index]]),
    hlines: [
      [fractionalMax, "[LR]/[R0] max = 1", "gray"],
      [0.5 * fractionalMax, "0.5 bound", "steelblue"],
    ],
  });
  logLayout.showlegend = false;

  let linearLayout = baseLayout(
    "Binding Curve (Linear X)",
    "Drug concentration [D] (nM, linear scale)",
    "Fractional receptor bound [LR]/[R0]",
    false,
    [0, 1.05],
    [0, LINEAR_MAX_NM]
  );
  linearLayout = addReferenceLines(linearLayout, {
    vlines: kdValues.map((value, index) => [value, "", colors[index]]),
    hlines: [
      [fractionalMax, "[LR]/[R0] max = 1", "gray"],
      [0.5 * fractionalMax, "0.5 bound", "steelblue"],
    ],
  });
  linearLayout.showlegend = false;

  plot("binding-log", logTraces, logLayout);
  plot("binding-linear", linearTraces, linearLayout);
  setNote(
    "binding-note",
    "At KD, fractional receptor occupancy [LR]/[R0] = 0.5. Binding is normalized so the maximal fractional occupancy is 1.0."
  );
}

function renderEfficacy() {
  const kdValues = [
    Math.max(getInputValue("eff-kd1"), CONC_MIN_NM),
    Math.max(getInputValue("eff-kd2"), CONC_MIN_NM),
    Math.max(getInputValue("eff-kd3"), CONC_MIN_NM),
  ];
  const fractionalMax = 1.0;
  const colors = ["royalblue", "seagreen", "darkorange"];
  const { xLogNm, xLinearNm } = concentrationGridsNm();
  const xLogM = xLogNm.map(nmToM);
  const xLinearM = xLinearNm.map(nmToM);

  const logTraces = kdValues.map((ec50Nm, index) => ({
    x: xLogNm,
    y: hillResponse(xLogM, fractionalMax, nmToM(ec50Nm), 1.0),
    mode: "lines",
    name: `Curve ${index + 1}`,
    line: { width: 3, color: colors[index] },
  }));

  const linearTraces = kdValues.map((ec50Nm, index) => ({
    x: xLinearNm,
    y: hillResponse(xLinearM, fractionalMax, nmToM(ec50Nm), 1.0),
    mode: "lines",
    name: `Curve ${index + 1}`,
    line: { width: 3, color: colors[index] },
  }));

  let logLayout = baseLayout(
    "Efficacy Curve (Idealized: KD = EC50, Log X)",
    "Drug concentration [D] (nM, log scale)",
    "Fractional effect E/Emax",
    true,
    [0, 1.05],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  logLayout = addReferenceLines(logLayout, {
    vlines: kdValues.map((value, index) => [value, "", colors[index]]),
    hlines: [
      [fractionalMax, "E/Emax max = 1", "gray"],
      [0.5 * fractionalMax, "0.5 effect", "steelblue"],
    ],
  });
  logLayout.showlegend = false;

  let linearLayout = baseLayout(
    "Efficacy Curve (Idealized: KD = EC50, Linear X)",
    "Drug concentration [D] (nM, linear scale)",
    "Fractional effect E/Emax",
    false,
    [0, 1.05],
    [0, LINEAR_MAX_NM]
  );
  linearLayout = addReferenceLines(linearLayout, {
    vlines: kdValues.map((value, index) => [value, "", colors[index]]),
    hlines: [
      [fractionalMax, "E/Emax max = 1", "gray"],
      [0.5 * fractionalMax, "0.5 effect", "steelblue"],
    ],
  });
  linearLayout.showlegend = false;

  plot("efficacy-log", logTraces, logLayout);
  plot("efficacy-linear", linearTraces, linearLayout);
  setNote(
    "efficacy-note",
    "Effect is normalized to E/Emax, so the maximum effect is 1.0 and E/Emax = 0.5 at EC50."
  );
}

function renderAntagonists() {
  const model = getRadioValue("ant-model");
  const baseEmax = EMAX_FIXED;
  const baseEc50Nm = Math.max(getInputValue("ant-ec50"), CONC_MIN_NM);
  const hillN = getInputValue("ant-hill");
  const antConcNm = Math.max(getInputValue("ant-conc"), CONC_MIN_NM);
  const ic50Nm = Math.max(getInputValue("ant-ic50"), CONC_MIN_NM);
  const baseEc50M = nmToM(baseEc50Nm);
  const antConcM = nmToM(antConcNm);
  const ic50M = nmToM(ic50Nm);
  const doseRatio = 1.0 + antConcM / ic50M;

  const withEmax = model === "Competitive" ? baseEmax : baseEmax / doseRatio;
  const withEc50M = model === "Competitive" ? baseEc50M * doseRatio : baseEc50M;
  const withEc50Nm = withEc50M / NM_TO_M;
  const withEc50LineNm = Math.min(Math.max(withEc50Nm, CONC_MIN_NM), CONC_MAX_NM);
  const modelLine =
    model === "Competitive"
      ? "Competitive antagonist: rightward EC50 shift, unchanged Emax."
      : "Noncompetitive antagonist: reduced Emax, EC50 approximately unchanged.";

  const { xLogNm, xLinearNm } = concentrationGridsNm();
  const xLogM = xLogNm.map(nmToM);
  const xLinearM = xLinearNm.map(nmToM);
  const baseLogCurve = hillResponse(xLogM, baseEmax, baseEc50M, hillN);
  const withLogCurve = hillResponse(xLogM, withEmax, withEc50M, hillN);
  const baseLinearCurve = hillResponse(xLinearM, baseEmax, baseEc50M, hillN);
  const withLinearCurve = hillResponse(xLinearM, withEmax, withEc50M, hillN);

  const responseLogTraces = [
    {
      x: xLogNm,
      y: baseLogCurve,
      mode: "lines",
      name: "Agonist alone",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLogNm,
      y: xLogNm.map(() => 0),
      mode: "lines",
      name: "Antagonist alone (no efficacy)",
      line: { width: 3, color: "red" },
    },
    {
      x: xLogNm,
      y: withLogCurve,
      mode: "lines",
      name: `With ${model.toLowerCase()} antagonist`,
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  const responseLinearTraces = [
    {
      x: xLinearNm,
      y: baseLinearCurve,
      mode: "lines",
      name: "Agonist alone",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLinearNm,
      y: xLinearNm.map(() => 0),
      mode: "lines",
      name: "Antagonist alone (no efficacy)",
      line: { width: 3, color: "red" },
    },
    {
      x: xLinearNm,
      y: withLinearCurve,
      mode: "lines",
      name: `With ${model.toLowerCase()} antagonist`,
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  const vlineItems = [[baseEc50Nm, "Baseline EC50", "royalblue"]];
  const hlineItems = [[baseEmax, "Baseline Emax=efficacy", "royalblue"]];
  if (model === "Competitive") {
    vlineItems.push([withEc50LineNm, "Shifted EC50", "seagreen"]);
  } else {
    hlineItems.push([withEmax, "Reduced Emax=efficacy", "seagreen"]);
  }

  let responseLogLayout = baseLayout(
    `${model} Antagonism (Log X)`,
    "Agonist concentration (nM, log scale)",
    "Effect (%)",
    true,
    [0, 100],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  responseLogLayout = addReferenceLines(responseLogLayout, {
    vlines: vlineItems,
    hlines: hlineItems,
  });
  responseLogLayout = legendBelow(responseLogLayout, 140);

  let responseLinearLayout = baseLayout(
    `${model} Antagonism (Linear X)`,
    "Agonist concentration (nM, linear scale)",
    "Effect (%)",
    false,
    [0, 100],
    [0, LINEAR_MAX_NM]
  );
  responseLinearLayout = addReferenceLines(responseLinearLayout, {
    vlines: vlineItems,
    hlines: hlineItems,
  });
  responseLinearLayout = legendBelow(responseLinearLayout, 140);

  const { xLogNm: antLogGridNm, xLinearNm: antLinearGridNm } = concentrationGridsNm();
  const inhibLog = antLogGridNm.map((value) => (100.0 * value) / (ic50Nm + value));
  const inhibLinear = antLinearGridNm.map((value) => (100.0 * value) / (ic50Nm + value));
  const inhibitionAtCurrent = (100.0 * antConcNm) / (ic50Nm + antConcNm);

  const inhibitionLogTraces = [
    {
      x: antLogGridNm,
      y: inhibLog,
      mode: "lines",
      name: "Inhibition",
      line: { width: 3, color: "seagreen" },
    },
  ];
  const inhibitionLinearTraces = [
    {
      x: antLinearGridNm,
      y: inhibLinear,
      mode: "lines",
      name: "Inhibition",
      line: { width: 3, color: "seagreen" },
    },
  ];

  let inhibitionLogLayout = baseLayout(
    "Antagonist Inhibition vs [I] (Log X)",
    "Antagonist concentration [I] (nM, log scale)",
    "Inhibition (%)",
    true,
    [0, 100],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  inhibitionLogLayout = addReferenceLines(inhibitionLogLayout, {
    vlines: [
      [ic50Nm, "IC50", "seagreen"],
      [antConcNm, "[I]", "gray"],
    ],
    hlines: [[50.0, "50% inhibition", "steelblue"]],
  });

  let inhibitionLinearLayout = baseLayout(
    "Antagonist Inhibition vs [I] (Linear X)",
    "Antagonist concentration [I] (nM, linear scale)",
    "Inhibition (%)",
    false,
    [0, 100],
    [0, LINEAR_MAX_NM]
  );
  inhibitionLinearLayout = addReferenceLines(inhibitionLinearLayout, {
    vlines: [
      [ic50Nm, "IC50", "seagreen"],
      [antConcNm, "[I]", "gray"],
    ],
    hlines: [[50.0, "50% inhibition", "steelblue"]],
  });

  plot("ant-response-log", responseLogTraces, responseLogLayout);
  plot("ant-response-linear", responseLinearTraces, responseLinearLayout);
  plot("ant-inhibition-log", inhibitionLogTraces, inhibitionLogLayout);
  plot("ant-inhibition-linear", inhibitionLinearTraces, inhibitionLinearLayout);
  setNote(
    "ant-note",
    `${modelLine} Baseline Emax is fixed at ${baseEmax.toFixed(0)}%. IC50 = ${fmtNm(ic50Nm)} nM, [I] = ${fmtNm(antConcNm)} nM, inhibition at [I] = ${inhibitionAtCurrent.toFixed(1)}%. Baseline EC50 = ${fmtNm(baseEc50Nm)} nM; with antagonist EC50 = ${fmtNm(withEc50Nm)} nM.`
  );
}

function renderPartial() {
  const fullEc50Nm = Math.max(getInputValue("pa-full-ec50"), CONC_MIN_NM);
  const fullHill = getInputValue("pa-full-hill");
  const partialIntrinsic = getInputValue("pa-intrinsic");
  const partialEc50Nm = Math.max(getInputValue("pa-partial-ec50"), CONC_MIN_NM);
  const partialHill = getInputValue("pa-partial-hill");
  const partialMixLevelsNm = [
    Math.max(getInputValue("pa-mix1"), CONC_MIN_NM),
    Math.max(getInputValue("pa-mix2"), CONC_MIN_NM),
    Math.max(getInputValue("pa-mix3"), CONC_MIN_NM),
  ];
  const partialEmax = EMAX_FIXED * partialIntrinsic;
  const fullEc50M = nmToM(fullEc50Nm);
  const partialEc50M = nmToM(partialEc50Nm);

  const { xLogNm, xLinearNm } = concentrationGridsNm();
  const xLogM = xLogNm.map(nmToM);
  const xLinearM = xLinearNm.map(nmToM);

  const fullLogCurve = hillResponse(xLogM, EMAX_FIXED, fullEc50M, fullHill);
  const partialLogCurve = hillResponse(xLogM, partialEmax, partialEc50M, partialHill);
  const fullLinearCurve = hillResponse(xLinearM, EMAX_FIXED, fullEc50M, fullHill);
  const partialLinearCurve = hillResponse(xLinearM, partialEmax, partialEc50M, partialHill);
  const mixColors = ["seagreen", "darkorange", "#c44a3b"];
  const mixLogCurves = partialMixLevelsNm.map((partialLevelNm) =>
    competitiveMixedAgonistResponse(
      xLogM,
      fullEc50M,
      fullHill,
      nmToM(partialLevelNm),
      partialEc50M,
      partialHill,
      partialIntrinsic
    )
  );
  const mixLinearCurves = partialMixLevelsNm.map((partialLevelNm) =>
    competitiveMixedAgonistResponse(
      xLinearM,
      fullEc50M,
      fullHill,
      nmToM(partialLevelNm),
      partialEc50M,
      partialHill,
      partialIntrinsic
    )
  );

  const logTraces = [
    {
      x: xLogNm,
      y: fullLogCurve,
      mode: "lines",
      name: "Full agonist",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLogNm,
      y: partialLogCurve,
      mode: "lines",
      name: "Partial agonist",
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  const mixLogTraces = [
    {
      x: xLogNm,
      y: fullLogCurve,
      mode: "lines",
      name: "No partial agonist",
      line: { width: 3, color: "royalblue" },
    },
    ...mixLogCurves.map((curve, index) => ({
      x: xLogNm,
      y: curve,
      mode: "lines",
      name: `+ ${fmtNm(partialMixLevelsNm[index])} nM partial agonist`,
      line: { width: 3, color: mixColors[index] },
    })),
  ];

  const linearTraces = [
    {
      x: xLinearNm,
      y: fullLinearCurve,
      mode: "lines",
      name: "Full agonist",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLinearNm,
      y: partialLinearCurve,
      mode: "lines",
      name: "Partial agonist",
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  const mixLinearTraces = [
    {
      x: xLinearNm,
      y: fullLinearCurve,
      mode: "lines",
      name: "No partial agonist",
      line: { width: 3, color: "royalblue" },
    },
    ...mixLinearCurves.map((curve, index) => ({
      x: xLinearNm,
      y: curve,
      mode: "lines",
      name: `+ ${fmtNm(partialMixLevelsNm[index])} nM partial agonist`,
      line: { width: 3, color: mixColors[index] },
    })),
  ];

  let logLayout = baseLayout(
    "Partial vs Full Agonist (Log X)",
    "Agonist concentration (nM, log scale)",
    "Effect (%)",
    true,
    [0, 100],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  logLayout = addReferenceLines(logLayout, {
    vlines: [
      [fullEc50Nm, "Full EC50", "royalblue"],
      [partialEc50Nm, "Partial EC50", "seagreen"],
    ],
    hlines: [
      [EMAX_FIXED, "Full Emax=efficacy", "royalblue"],
      [partialEmax, "Partial Emax=efficacy", "seagreen"],
    ],
  });
  logLayout = legendBelow(logLayout, 120);

  let linearLayout = baseLayout(
    "Partial vs Full Agonist (Linear X)",
    "Agonist concentration (nM, linear scale)",
    "Effect (%)",
    false,
    [0, 100],
    [0, LINEAR_MAX_NM]
  );
  linearLayout = addReferenceLines(linearLayout, {
    vlines: [
      [fullEc50Nm, "Full EC50", "royalblue"],
      [partialEc50Nm, "Partial EC50", "seagreen"],
    ],
    hlines: [
      [EMAX_FIXED, "Full Emax=efficacy", "royalblue"],
      [partialEmax, "Partial Emax=efficacy", "seagreen"],
    ],
  });
  linearLayout = legendBelow(linearLayout, 120);

  let mixLogLayout = baseLayout(
    "Full Agonist Response with Partial Agonist Present (Log X)",
    "Full agonist concentration (nM, log scale)",
    "Effect (%)",
    true,
    [0, 100],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  mixLogLayout = addReferenceLines(mixLogLayout, {
    hlines: [[EMAX_FIXED, "Emax=efficacy", "gray"]],
  });
  mixLogLayout = legendBelow(mixLogLayout, 142);

  let mixLinearLayout = baseLayout(
    "Full Agonist Response with Partial Agonist Present (Linear X)",
    "Full agonist concentration (nM, linear scale)",
    "Effect (%)",
    false,
    [0, 100],
    [0, LINEAR_MAX_NM]
  );
  mixLinearLayout = addReferenceLines(mixLinearLayout, {
    hlines: [[EMAX_FIXED, "Emax=efficacy", "gray"]],
  });
  mixLinearLayout = legendBelow(mixLinearLayout, 142);

  plot("partial-log", logTraces, logLayout);
  plot("partial-linear", linearTraces, linearLayout);
  plot("partial-mix-log", mixLogTraces, mixLogLayout);
  plot("partial-mix-linear", mixLinearTraces, mixLinearLayout);
  setNote(
    "partial-note",
    `Full EC50 = ${fmtNm(fullEc50Nm)} nM, Partial EC50 = ${fmtNm(partialEc50Nm)} nM. Full Emax=efficacy is fixed at ${EMAX_FIXED.toFixed(0)}; Partial Emax = ${partialEmax.toFixed(1)}% (${partialIntrinsic.toFixed(2)} x full). The co-administration plots use a shared-receptor competition model, so increasing fixed partial agonist levels (${partialMixLevelsNm.map((value) => `${fmtNm(value)} nM`).join(", ")}) lowers the response to a given full agonist dose while still allowing enough full agonist to approach Emax at the far right of the curve. This is meant to approximate a heroin-plus-buprenorphine teaching example.`
  );
}

function renderSpare() {
  const kdNm = Math.max(getInputValue("spare-kd"), CONC_MIN_NM);
  const tau = Math.max(getInputValue("spare-tau"), 1e-6);
  const kdM = nmToM(kdNm);
  const ec50EffectM = kdM / (1.0 + tau);
  const ec50EffectNm = ec50EffectM / NM_TO_M;

  const { xLogNm, xLinearNm } = concentrationGridsNm();
  const xLogM = xLogNm.map(nmToM);
  const xLinearM = xLinearNm.map(nmToM);
  const occupancyLog = xLogM.map((value) => (100.0 * value) / (kdM + value));
  const occupancyLinear = xLinearM.map((value) => (100.0 * value) / (kdM + value));
  const effectLog = hillResponse(xLogM, EMAX_FIXED, ec50EffectM, 1.0);
  const effectLinear = hillResponse(xLinearM, EMAX_FIXED, ec50EffectM, 1.0);

  const logTraces = [
    {
      x: xLogNm,
      y: occupancyLog,
      mode: "lines",
      name: "Occupancy (%)",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLogNm,
      y: effectLog,
      mode: "lines",
      name: "Effect (%)",
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  const linearTraces = [
    {
      x: xLinearNm,
      y: occupancyLinear,
      mode: "lines",
      name: "Occupancy (%)",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: xLinearNm,
      y: effectLinear,
      mode: "lines",
      name: "Effect (%)",
      line: { width: 3, color: "seagreen", dash: "dash" },
    },
  ];

  let logLayout = baseLayout(
    "Spare Receptors: Occupancy vs Effect (Log X)",
    "Agonist concentration (nM, log scale)",
    "Percent",
    true,
    [0, 100],
    [Math.log10(CONC_MIN_NM), Math.log10(CONC_MAX_NM)]
  );
  logLayout = addReferenceLines(logLayout, {
    vlines: [
      [kdNm, "KD", "gray"],
      [ec50EffectNm, "Apparent EC50", "black"],
    ],
    hlines: [[EMAX_FIXED, "Emax=efficacy", "gray"]],
  });

  let linearLayout = baseLayout(
    "Spare Receptors: Occupancy vs Effect (Linear X)",
    "Agonist concentration (nM, linear scale)",
    "Percent",
    false,
    [0, 100],
    [0, LINEAR_MAX_NM]
  );
  linearLayout = addReferenceLines(linearLayout, {
    vlines: [
      [kdNm, "KD", "gray"],
      [ec50EffectNm, "Apparent EC50", "black"],
    ],
    hlines: [[EMAX_FIXED, "Emax=efficacy", "gray"]],
  });

  plot("spare-log", logTraces, logLayout);
  plot("spare-linear", linearTraces, linearLayout);
  setNote(
    "spare-note",
    `KD = ${fmtNm(kdNm)} nM, apparent effect EC50 = ${fmtNm(ec50EffectNm)} nM. When tau > 1, EC50 falls below KD while both occupancy and effect still cap at 100%.`
  );
}

function renderQuantal() {
  const ed50 = Math.max(getInputValue("q-ed50"), EPS);
  const td50 = Math.max(getInputValue("q-td50"), EPS);
  const sEff = Math.max(getInputValue("q-s-eff"), 0.01);
  const sTox = Math.max(getInputValue("q-s-tox"), 0.01);
  const ed50Log10 = Math.log10(ed50);
  const td50Log10 = Math.log10(td50);
  const ti = td50 / Math.max(ed50, EPS);
  const tiTextColor = tiColor(ti);

  const xMin = Math.log10(QUANTAL_MIN_MGKG);
  const xMax = Math.log10(QUANTAL_MAX_MGKG);
  const x = linspace(xMin, xMax, 800);
  const dose = x.map((value) => 10 ** value);
  const pEff = x.map((value) => logisticQuantal(value, ed50Log10, sEff));
  const pTox = x.map((value) => logisticQuantal(value, td50Log10, sTox));
  const fEff = pEff.map((value) => (1.0 / sEff) * value * (1.0 - value));
  const fTox = pTox.map((value) => (1.0 / sTox) * value * (1.0 - value));
  const dx = x[1] - x[0];
  const pEffPct = pEff.map((value) => 100.0 * value);
  const pToxPct = pTox.map((value) => 100.0 * value);
  const fEffPct = fEff.map((value) => 100.0 * value * dx);
  const fToxPct = fTox.map((value) => 100.0 * value * dx);
  const y2Max = Math.max(...fEffPct, ...fToxPct, 0.001) * 1.15;

  const traces = [
    {
      x: dose,
      y: pEffPct,
      mode: "lines",
      name: "Efficacy cumulative",
      line: { width: 3, color: "royalblue" },
    },
    {
      x: dose,
      y: pToxPct,
      mode: "lines",
      name: "Toxicity cumulative",
      line: { width: 3, color: "orange", dash: "dash" },
    },
    {
      x: dose,
      y: fEffPct,
      mode: "lines",
      name: "Efficacy frequency (% in dose interval)",
      line: { width: 2, color: "blue", dash: "dash" },
      yaxis: "y2",
    },
    {
      x: dose,
      y: fToxPct,
      mode: "lines",
      name: "Toxicity frequency (% in dose interval)",
      line: { width: 2, color: "orange", dash: "dash" },
      yaxis: "y2",
    },
  ];

  let layout = baseLayout(
    "Quantal Dose-Response (Log X, mg/kg)",
    "Dose (mg/kg)",
    "Cumulative population (%)",
    true,
    [0, 100],
    [xMin, xMax]
  );
  layout = addReferenceLines(layout, {
    vlines: [
      [ed50, "ED50", "blue"],
      [td50, "TD50", "orange"],
    ],
    hlines: [[50.0, "50%", "steelblue"]],
  });
  layout.margin = { l: 56, r: 40, t: 130, b: 56 };
  layout.title = {
    ...layout.title,
    x: 0.03,
    xanchor: "left",
  };
  layout.yaxis2 = {
    title: "Frequency (% in each log-dose interval)",
    overlaying: "y",
    side: "right",
    range: [0, y2Max],
    showgrid: false,
    tickfont: { color: "#42536d" },
  };
  layout.annotations = [
    ...(layout.annotations || []),
    {
      x: 0.99,
      y: 1.10,
      xref: "paper",
      yref: "paper",
      xanchor: "right",
      yanchor: "bottom",
      text: `<b>Therapeutic Index (TI) = ${ti.toFixed(2)}</b>`,
      showarrow: false,
      font: { size: 24, color: tiTextColor },
      bgcolor: "rgba(255,255,255,0.92)",
      bordercolor: tiTextColor,
      borderwidth: 2,
      borderpad: 8,
    },
  ];

  plot("quantal-plot", traces, layout);
  setNote(
    "quantal-note",
    `ED50 = ${ed50.toFixed(0)} mg/kg, TD50 = ${td50.toFixed(0)} mg/kg, Therapeutic Index (TI = TD50/ED50) = ${ti.toFixed(2)}. s_eff = ${sEff.toFixed(2)}, s_tox = ${sTox.toFixed(2)}.`
  );
}

const renderers = {
  binding: renderBinding,
  efficacy: renderEfficacy,
  antagonists: renderAntagonists,
  classes: renderAntagonistClasses,
  partial: renderPartial,
  spare: renderSpare,
  quantal: renderQuantal,
};

function renderTab(tabId) {
  const renderer = renderers[tabId];
  if (!renderer) {
    return;
  }
  renderer();
  dirtyTabs[tabId] = false;
}

function activateTab(tabId) {
  activeTabId = tabId;
  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.tabTarget === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll(".lesson-panel").forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (dirtyTabs[tabId]) {
    renderTab(tabId);
  } else {
    document
      .querySelectorAll(`[data-tab-panel="${tabId}"] .plot-frame`)
      .forEach((plotNode) => Plotly.Plots.resize(plotNode));
  }

  window.history.replaceState(null, "", `#${tabId}`);
}

function bindControls() {
  document.querySelectorAll("input[type='range']").forEach((input) => {
    input.addEventListener("input", () => {
      syncControlOutputs(input.closest(".lesson-panel"));
      const panel = input.closest(".lesson-panel");
      const tabId = panel.dataset.tabPanel;
      dirtyTabs[tabId] = true;
      if (tabId === activeTabId) {
        renderTab(tabId);
      }
    });
  });

  document.querySelectorAll("input[type='radio']").forEach((input) => {
    input.addEventListener("change", () => {
      const panel = input.closest(".lesson-panel");
      const tabId = panel.dataset.tabPanel;
      dirtyTabs[tabId] = true;
      if (tabId === activeTabId) {
        renderTab(tabId);
      }
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tabTarget);
    });
  });

  document.querySelectorAll(".ant-class-node").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAntagonistClassKey = button.dataset.antClassKey;
      renderAntagonistClasses();
      dirtyTabs.classes = false;
    });
  });
}

function init() {
  syncControlOutputs(document);
  bindControls();
  const hashTab = window.location.hash.replace("#", "");
  const initialTab = TAB_IDS.includes(hashTab) ? hashTab : "binding";
  activateTab(initialTab);
}

window.addEventListener("DOMContentLoaded", init);
