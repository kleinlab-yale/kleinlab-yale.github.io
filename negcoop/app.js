import {
  COOPERATIVITY,
  DEFAULTS,
  KD_RANGE,
  PRESETS,
  RECEPTOR_RANGE,
  simulate,
  scoreScenario,
  TOTAL_TIME,
} from "./model.mjs";

const state = { ...DEFAULTS };

const controls = {
  receptorLevel: document.querySelector("#receptorLevel"),
  dimerKd: document.querySelector("#dimerKd"),
  ligandPulse: document.querySelector("#ligandPulse"),
  pulseDuration: document.querySelector("#pulseDuration"),
  internalizationRate: document.querySelector("#internalizationRate"),
  recyclingRate: document.querySelector("#recyclingRate"),
};

const valueTargets = {
  receptorLevel: document.querySelector("#receptorLevelValue"),
  dimerKd: document.querySelector("#dimerKdValue"),
  ligandPulse: document.querySelector("#ligandPulseValue"),
  pulseDuration: document.querySelector("#pulseDurationValue"),
  internalizationRate: document.querySelector("#internalizationRateValue"),
  recyclingRate: document.querySelector("#recyclingRateValue"),
};

const presetGrid = document.querySelector("#presetGrid");
const cooperativityButtons = document.querySelector("#cooperativityButtons");
const resetDefaultsButton = document.querySelector("#resetDefaults");
const timecourseChart = document.querySelector("#timecourseChart");
const phaseCanvas = document.querySelector("#phaseCanvas");
const phaseContext = phaseCanvas.getContext("2d");

const outcomeNodes = {
  fateTitle: document.querySelector("#fateTitle"),
  fateBadge: document.querySelector("#fateBadge"),
  insightText: document.querySelector("#insightText"),
  peakSignalMetric: document.querySelector("#peakSignalMetric"),
  peakTimeMetric: document.querySelector("#peakTimeMetric"),
  durationMetric: document.querySelector("#durationMetric"),
  surfaceLossMetric: document.querySelector("#surfaceLossMetric"),
};

const snapshotNodes = {
  peakSnapshotLabel: document.querySelector("#peakSnapshotLabel"),
  peakSnapshotBar: document.querySelector("#peakSnapshotBar"),
  peakSnapshotText: document.querySelector("#peakSnapshotText"),
  lateSnapshotLabel: document.querySelector("#lateSnapshotLabel"),
  lateSnapshotBar: document.querySelector("#lateSnapshotBar"),
  lateSnapshotText: document.querySelector("#lateSnapshotText"),
};

let phaseMapTimeout = null;

initialize();

function initialize() {
  buildPresetButtons();
  buildCooperativityButtons();
  wireControls();
  syncControlsFromState();
  renderAll();
}

function buildPresetButtons() {
  for (const preset of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.dataset.presetId = preset.id;
    button.innerHTML = `<strong>${preset.name}</strong><span>${preset.description}</span>`;
    button.addEventListener("click", () => {
      Object.assign(state, preset.values);
      syncControlsFromState();
      highlightPreset(preset.id);
      renderAll();
    });
    presetGrid.append(button);
  }

  highlightPreset("low-neg");
}

function buildCooperativityButtons() {
  for (const config of Object.values(COOPERATIVITY)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = config.label;
    button.dataset.cooperativity = config.key;
    button.addEventListener("click", () => {
      state.cooperativity = config.key;
      syncCooperativityButtons();
      highlightPreset(null);
      renderAll();
    });
    cooperativityButtons.append(button);
  }

  syncCooperativityButtons();
}

function wireControls() {
  for (const [key, control] of Object.entries(controls)) {
    control.addEventListener("input", () => {
      state[key] = Number(control.value);
      highlightPreset(null);
      updateValueLabels();
      renderFromState();
      schedulePhaseMap();
    });
  }

  resetDefaultsButton.addEventListener("click", () => {
    Object.assign(state, DEFAULTS);
    syncControlsFromState();
    highlightPreset("low-neg");
    renderAll();
  });
}

function syncControlsFromState() {
  for (const [key, control] of Object.entries(controls)) {
    control.value = state[key];
  }
  updateValueLabels();
  syncCooperativityButtons();
}

function syncCooperativityButtons() {
  for (const button of cooperativityButtons.querySelectorAll("button")) {
    button.classList.toggle(
      "active",
      button.dataset.cooperativity === state.cooperativity
    );
  }
}

function highlightPreset(presetId) {
  for (const button of presetGrid.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.presetId === presetId);
  }
}

function updateValueLabels() {
  valueTargets.receptorLevel.textContent = `${state.receptorLevel.toFixed(0)} AU`;
  valueTargets.dimerKd.textContent = `${state.dimerKd.toFixed(0)} AU`;
  valueTargets.ligandPulse.textContent = `${state.ligandPulse.toFixed(1)} AU`;
  valueTargets.pulseDuration.textContent = `${state.pulseDuration.toFixed(0)} min`;
  valueTargets.internalizationRate.textContent =
    `${state.internalizationRate.toFixed(3)} / min`;
  valueTargets.recyclingRate.textContent =
    `${state.recyclingRate.toFixed(3)} / min`;
}

function renderAll() {
  renderFromState();
  renderPhaseMap();
}

function renderFromState() {
  const summary = simulate(state);
  renderSummary(summary);
  renderTimecourse(summary);
  renderSnapshots(summary);
}

function renderSummary(summary) {
  const peakDrive = summary.peakPoint.drive;
  const receptorLoss = summary.surfaceLossFraction * 100;

  outcomeNodes.fateTitle.textContent = summary.fateLabel;
  outcomeNodes.fateBadge.textContent = badgeLabel(summary.fate);
  outcomeNodes.fateBadge.className = `fate-badge ${summary.fate}`;

  outcomeNodes.insightText.textContent = buildInsight(summary, peakDrive);
  outcomeNodes.peakSignalMetric.textContent = `${summary.peakSignal.toFixed(2)} AU`;
  outcomeNodes.peakTimeMetric.textContent = `${summary.peakTime.toFixed(0)} min`;
  outcomeNodes.durationMetric.textContent = `${summary.sustainedDuration.toFixed(0)} min`;
  outcomeNodes.surfaceLossMetric.textContent = `${receptorLoss.toFixed(0)}%`;
}

function renderTimecourse(summary) {
  const { series } = summary;
  const width = 860;
  const height = 360;
  const margin = { top: 22, right: 74, bottom: 38, left: 58 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const signalMax = niceMax(Math.max(...series.map((point) => point.signal), 0.1));

  const xAt = (time) => margin.left + (time / TOTAL_TIME) * chartWidth;
  const ySignalAt = (signal) =>
    margin.top + chartHeight - (signal / signalMax) * chartHeight;
  const ySurfaceAt = (surface) =>
    margin.top + chartHeight - (surface / state.receptorLevel) * chartHeight;
  const yLigandAt = (ligand) =>
    margin.top + chartHeight - (ligand / state.ligandPulse) * (chartHeight * 0.28);

  const signalPath = linePath(series, (point) => xAt(point.time), (point) =>
    ySignalAt(point.signal)
  );
  const surfacePath = linePath(series, (point) => xAt(point.time), (point) =>
    ySurfaceAt(point.surfaceReceptors)
  );

  const ligandAreaPath = areaPath(
    series,
    (point) => xAt(point.time),
    (point) => yLigandAt(point.ligand),
    margin.top + chartHeight
  );

  const horizontalTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => signalMax * fraction);
  const verticalTicks = [0, 30, 60, 90, 120, 150, 180];

  timecourseChart.innerHTML = `
    <defs>
      <filter id="signalGlow">
        <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
        <feMerge>
          <feMergeNode in="blur"></feMergeNode>
          <feMergeNode in="SourceGraphic"></feMergeNode>
        </feMerge>
      </filter>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="22" fill="transparent"></rect>
    ${horizontalTicks
      .map(
        (tick) => `
        <g>
          <line x1="${margin.left}" y1="${ySignalAt(tick)}" x2="${width - margin.right}" y2="${ySignalAt(
            tick
          )}" stroke="rgba(31,36,48,0.08)" stroke-width="1"></line>
          <text x="${margin.left - 14}" y="${ySignalAt(tick) + 4}" fill="#5f6470" font-size="12" text-anchor="end">${tick.toFixed(
            tick === signalMax ? 0 : 1
          )}</text>
        </g>
      `
      )
      .join("")}
    ${verticalTicks
      .map(
        (tick) => `
        <g>
          <line x1="${xAt(tick)}" y1="${margin.top}" x2="${xAt(tick)}" y2="${margin.top + chartHeight}" stroke="rgba(31,36,48,0.06)" stroke-width="1"></line>
          <text x="${xAt(tick)}" y="${height - 12}" fill="#5f6470" font-size="12" text-anchor="middle">${tick}</text>
        </g>
      `
      )
      .join("")}
    <text x="${margin.left}" y="${height - 12}" fill="#5f6470" font-size="12">time (min)</text>
    <text x="22" y="${margin.top - 4}" fill="#5f6470" font-size="12">signal (AU)</text>
    <text x="${width - margin.right + 10}" y="${margin.top - 4}" fill="#5f6470" font-size="12">surface (%)</text>
    <path d="${ligandAreaPath}" fill="rgba(215,163,48,0.25)"></path>
    <path d="${surfacePath}" fill="none" stroke="#b7552d" stroke-width="3" stroke-dasharray="8 6"></path>
    <path d="${signalPath}" fill="none" stroke="#1c5d99" stroke-width="4" filter="url(#signalGlow)"></path>
    <circle cx="${xAt(summary.peakTime)}" cy="${ySignalAt(summary.peakSignal)}" r="5" fill="#1c5d99"></circle>
    <text x="${xAt(summary.peakTime) + 12}" y="${ySignalAt(summary.peakSignal) - 10}" fill="#1f2430" font-size="12">peak ${summary.peakSignal.toFixed(
      2
    )}</text>
    <text x="${width - margin.right + 12}" y="${margin.top + 4}" fill="#b7552d" font-size="12">100</text>
    <text x="${width - margin.right + 12}" y="${margin.top + chartHeight + 4}" fill="#b7552d" font-size="12">0</text>
  `;
}

function renderSnapshots(summary) {
  renderSnapshot(summary.peakPoint, snapshotNodes.peakSnapshotBar);
  renderSnapshot(summary.latePoint, snapshotNodes.lateSnapshotBar);

  snapshotNodes.peakSnapshotLabel.textContent =
    `${summary.peakPoint.time.toFixed(0)} min`;
  snapshotNodes.peakSnapshotText.textContent = snapshotNarrative(summary.peakPoint);
  snapshotNodes.lateSnapshotLabel.textContent =
    `${summary.latePoint.time.toFixed(0)} min`;
  snapshotNodes.lateSnapshotText.textContent = snapshotNarrative(summary.latePoint);
}

function renderSnapshot(point, container) {
  const total = state.receptorLevel;
  const activeFraction = clampFraction(point.activeReceptors / total);
  const internalFraction = clampFraction(point.internalizedReceptors / total);
  const silentFraction = clampFraction(1 - activeFraction - internalFraction);
  const segments = [
    { className: "silent", fraction: silentFraction },
    { className: "active", fraction: activeFraction },
    { className: "internal", fraction: internalFraction },
  ];

  container.innerHTML = segments
    .map(
      ({ className, fraction }) =>
        `<span class="bar-segment ${className}" style="width:${(fraction * 100).toFixed(
          2
        )}%"></span>`
    )
    .join("");
}

function snapshotNarrative(point) {
  const total = state.receptorLevel;
  const active = ((point.activeReceptors / total) * 100).toFixed(0);
  const surfaceSilent = (((point.surfaceReceptors - point.activeReceptors) / total) * 100).toFixed(
    0
  );
  const internalized = ((point.internalizedReceptors / total) * 100).toFixed(0);

  return `${surfaceSilent}% silent on the surface, ${active}% in active dimers, ${internalized}% internalized.`;
}

function schedulePhaseMap() {
  clearTimeout(phaseMapTimeout);
  phaseMapTimeout = setTimeout(() => {
    renderPhaseMap();
  }, 120);
}

function renderPhaseMap() {
  const width = phaseCanvas.width;
  const height = phaseCanvas.height;
  const margin = { top: 18, right: 18, bottom: 38, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const receptorSteps = 26;
  const kdSteps = 18;
  const cellWidth = plotWidth / receptorSteps;
  const cellHeight = plotHeight / kdSteps;

  phaseContext.clearRect(0, 0, width, height);
  phaseContext.fillStyle = "rgba(255,252,245,0.96)";
  roundRect(phaseContext, 0, 0, width, height, 22);
  phaseContext.fill();

  for (let y = 0; y < kdSteps; y += 1) {
    const kd = interpolate(KD_RANGE.min, KD_RANGE.max, y / (kdSteps - 1));
    for (let x = 0; x < receptorSteps; x += 1) {
      const receptorLevel = interpolate(
        RECEPTOR_RANGE.min,
        RECEPTOR_RANGE.max,
        x / (receptorSteps - 1)
      );
      const summary = simulate({
        ...state,
        receptorLevel,
        dimerKd: kd,
      });
      const score = scoreScenario(summary);
      phaseContext.fillStyle = scoreColor(score);
      phaseContext.fillRect(
        margin.left + x * cellWidth,
        margin.top + y * cellHeight,
        cellWidth + 1,
        cellHeight + 1
      );
    }
  }

  phaseContext.strokeStyle = "rgba(31,36,48,0.08)";
  phaseContext.lineWidth = 1;
  phaseContext.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

  drawPhaseAxes(phaseContext, margin, plotWidth, plotHeight);

  const dotX =
    margin.left +
    ((state.receptorLevel - RECEPTOR_RANGE.min) /
      (RECEPTOR_RANGE.max - RECEPTOR_RANGE.min)) *
      plotWidth;
  const dotY =
    margin.top +
    ((state.dimerKd - KD_RANGE.min) / (KD_RANGE.max - KD_RANGE.min)) * plotHeight;

  phaseContext.beginPath();
  phaseContext.arc(dotX, dotY, 7, 0, Math.PI * 2);
  phaseContext.fillStyle = "#1f2430";
  phaseContext.fill();
  phaseContext.lineWidth = 2;
  phaseContext.strokeStyle = "rgba(255,255,255,0.95)";
  phaseContext.stroke();
}

function drawPhaseAxes(context, margin, plotWidth, plotHeight) {
  const receptorTicks = [50, 100, 150, 200, 250, 300];
  const kdTicks = [20, 60, 100, 140, 180];

  context.fillStyle = "#5f6470";
  context.font = '12px "Space Grotesk", sans-serif';
  context.textAlign = "center";
  for (const tick of receptorTicks) {
    const x =
      margin.left +
      ((tick - RECEPTOR_RANGE.min) / (RECEPTOR_RANGE.max - RECEPTOR_RANGE.min)) *
        plotWidth;
    context.beginPath();
    context.moveTo(x, margin.top + plotHeight);
    context.lineTo(x, margin.top + plotHeight + 6);
    context.strokeStyle = "rgba(31,36,48,0.14)";
    context.stroke();
    context.fillText(String(tick), x, margin.top + plotHeight + 20);
  }

  context.save();
  context.textAlign = "right";
  for (const tick of kdTicks) {
    const y =
      margin.top +
      ((tick - KD_RANGE.min) / (KD_RANGE.max - KD_RANGE.min)) * plotHeight;
    context.beginPath();
    context.moveTo(margin.left - 6, y);
    context.lineTo(margin.left, y);
    context.strokeStyle = "rgba(31,36,48,0.14)";
    context.stroke();
    context.fillText(String(tick), margin.left - 10, y + 4);
  }
  context.restore();

  context.fillStyle = "#5f6470";
  context.textAlign = "center";
  context.fillText(
    "receptor abundance (AU)",
    margin.left + plotWidth / 2,
    margin.top + plotHeight + 34
  );

  context.save();
  context.translate(16, margin.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("dimerization Kd (AU)", 0, 0);
  context.restore();
}

function buildInsight(summary, peakDrive) {
  const driveSentence =
    peakDrive < 0.9
      ? "At the signal peak, receptor occupancy still sits below the weak dimerization threshold, so the pathway never fully commits to a burst."
      : "At the signal peak, receptor abundance is high enough to titrate the weak dimerization step, so mass action pushes the system into a stronger pulse.";

  const internalizationSentence =
    summary.surfaceLossFraction > 0.38
      ? "That larger active receptor pool drives substantial internalization, stripping the surface and forcing the signal to collapse."
      : "Because active dimers stay comparatively sparse, internalization remains modest and the surface pool is not exhausted quickly.";

  const fateSentence =
    summary.fate === "differentiation"
      ? "This is the low-amplitude, longer-lived regime that best illustrates differentiation-like output."
      : summary.fate === "growth"
        ? "This is the sharp, front-loaded regime that best illustrates growth-like output."
        : "This setting sits near the transition zone where both interpretations are plausible depending on threshold choice.";

  return `${driveSentence} ${internalizationSentence} ${fateSentence}`;
}

function badgeLabel(fate) {
  if (fate === "differentiation") {
    return "Sustained";
  }
  if (fate === "growth") {
    return "Transient";
  }
  return "Borderline";
}

function linePath(points, getX, getY) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(point)} ${getY(point)}`)
    .join(" ");
}

function areaPath(points, getX, getY, baseY) {
  if (points.length === 0) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  const topLine = linePath(points, getX, getY);
  return `${topLine} L ${getX(last)} ${baseY} L ${getX(first)} ${baseY} Z`;
}

function scoreColor(score) {
  const clamped = Math.max(-0.32, Math.min(0.42, score));
  if (clamped < 0) {
    const t = (clamped + 0.32) / 0.32;
    return mixColor([107, 167, 214], [243, 215, 169], t);
  }
  const t = clamped / 0.42;
  return mixColor([243, 215, 169], [230, 126, 75], t);
}

function mixColor(start, end, t) {
  const values = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * t)
  );
  return `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
}

function interpolate(start, end, t) {
  return start + (end - start) * t;
}

function niceMax(value) {
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power / 0.25) * 0.25 * power;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function clampFraction(value) {
  return Math.max(0, Math.min(1, value));
}
