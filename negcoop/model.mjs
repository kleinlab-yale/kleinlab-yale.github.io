export const TOTAL_TIME = 60;
export const DT = 0.25;
export const RECEPTOR_RANGE = { min: 30, max: 300 };
export const KD_RANGE = { min: 15, max: 180 };

export const COOPERATIVITY = {
  negative: {
    key: "negative",
    label: "Negative",
    kdMultiplier: 1.18,
    transientBias: -0.12,
    sustainBias: 1,
  },
  neutral: {
    key: "neutral",
    label: "Neutral",
    kdMultiplier: 1,
    transientBias: 0,
    sustainBias: 0.18,
  },
  positive: {
    key: "positive",
    label: "Positive",
    kdMultiplier: 0.82,
    transientBias: 0.12,
    sustainBias: 0.04,
  },
};

export const DEFAULTS = {
  receptorLevel: 45,
  dimerKd: 145,
  ligandPulse: 1.5,
  pulseDuration: 55,
  internalizationRate: 0.045,
  recyclingRate: 0.008,
  cooperativity: "negative",
};

export const PRESETS = [
  {
    id: "low-neg",
    name: "Low receptor + negative",
    description:
      "The same weak Kd stays below the transient threshold, so the response remains low but persists for roughly 30 to 60 minutes.",
    values: {
      receptorLevel: 45,
      dimerKd: 145,
      ligandPulse: 1.5,
      pulseDuration: 55,
      internalizationRate: 0.045,
      recyclingRate: 0.008,
      cooperativity: "negative",
    },
  },
  {
    id: "high-neg",
    name: "High receptor + same Kd",
    description:
      "Mass action now titrates that same weak Kd, flipping the curve into a sharp transient that is mostly gone by about 15 minutes.",
    values: {
      receptorLevel: 260,
      dimerKd: 145,
      ligandPulse: 1.5,
      pulseDuration: 55,
      internalizationRate: 0.2,
      recyclingRate: 0.01,
      cooperativity: "negative",
    },
  },
  {
    id: "neutral-burst",
    name: "Non-cooperative burst",
    description:
      "Neutral coupling sharpens activation and promotes stronger receptor stripping from the surface.",
    values: {
      receptorLevel: 145,
      dimerKd: 60,
      ligandPulse: 1.8,
      pulseDuration: 24,
      internalizationRate: 0.18,
      recyclingRate: 0.01,
      cooperativity: "neutral",
    },
  },
  {
    id: "positive-burst",
    name: "Positive cooperative burst",
    description:
      "A sharper dimerization response makes signaling even more front-loaded and growth-like.",
    values: {
      receptorLevel: 145,
      dimerKd: 50,
      ligandPulse: 1.9,
      pulseDuration: 22,
      internalizationRate: 0.22,
      recyclingRate: 0.01,
      cooperativity: "positive",
    },
  },
];

export function pulseValue(time, amplitude, duration) {
  const onset = logistic((time - 0.15) / 0.08);
  const offset = logistic((time - duration) / 0.45);
  return amplitude * Math.max(onset - offset, 0);
}

export function simulate(params) {
  const config = COOPERATIVITY[params.cooperativity];
  let internalFraction = 0;

  const profile = deriveResponseProfile(params, config);
  const series = [];

  for (let time = 0; time <= TOTAL_TIME + 1e-9; time += DT) {
    const ligand = pulseValue(time, params.ligandPulse, params.pulseDuration);
    const occupancy = ligand / (ligand + 0.7);
    const transientShape = gammaPeak(time, profile.peakTime);
    const transientGate = inverseLogistic((time - profile.transientEnd) / 1.15);
    const sustainedGate =
      logistic((time - profile.sustainRise) / 1.3) *
      inverseLogistic((time - profile.sustainEnd) / 4.2);
    const transientSignal =
      profile.transientAmplitude * transientShape * transientGate;
    const sustainedSignal =
      profile.sustainedAmplitude * sustainedGate;
    const internalizationDrive =
      transientSignal + 0.22 * sustainedSignal;

    internalFraction = clamp(
      internalFraction +
        (params.internalizationRate * internalizationDrive * (1 - internalFraction) -
          params.recyclingRate * internalFraction) *
          DT,
      0,
      0.96
    );

    const surfaceReceptors = params.receptorLevel * (1 - internalFraction);
    const surfaceFactor = surfaceReceptors / Math.max(params.receptorLevel, 1);
    const signal =
      (transientSignal + sustainedSignal) * (0.58 + 0.42 * surfaceFactor);
    const boundReceptors = surfaceReceptors * occupancy;
    const drive = boundReceptors / (params.dimerKd * config.kdMultiplier);
    const activeReceptors = clamp(
      params.receptorLevel *
        (0.16 * signal + 0.06 * profile.sustainedAmplitude * sustainedGate),
      0,
      surfaceReceptors
    );
    const activeDimers = activeReceptors / 2;
    const internalizedReceptors = params.receptorLevel * internalFraction;

    series.push({
      time,
      ligand,
      surfaceReceptors,
      internalizedReceptors,
      occupancy,
      boundReceptors,
      drive,
      activeReceptors,
      activeDimers,
      signal,
      transientSignal,
      sustainedSignal,
    });
  }

  return summarizeSeries(series, params);
}

export function scoreScenario(summary) {
  const peakNorm = summary.peakSignal / (summary.peakSignal + 1.25);
  const sustainNorm = Math.min(summary.effectiveDuration / 88, 1);
  const surfaceLossNorm = clamp(summary.surfaceLossFraction, 0, 1);
  return 0.92 * peakNorm + 0.25 * surfaceLossNorm - 0.88 * sustainNorm;
}

function summarizeSeries(series, params) {
  let peakPoint = series[0];
  let auc = 0;

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];
    auc += ((previous.signal + current.signal) / 2) * DT;
    if (current.signal > peakPoint.signal) {
      peakPoint = current;
    }
  }

  const significanceThreshold = Math.max(0.05, peakPoint.signal * 0.7);
  let sustainedDuration = 0;

  for (const point of series) {
    if (point.signal >= significanceThreshold) {
      sustainedDuration += DT;
    }
  }

  const finalPoint = series[series.length - 1];
  const latePoint = series[Math.floor(series.length * 0.8)];
  const surfaceLossFraction =
    1 - finalPoint.surfaceReceptors / Math.max(params.receptorLevel, 1);

  const summary = {
    params,
    series,
    peakPoint,
    latePoint,
    finalPoint,
    peakSignal: peakPoint.signal,
    peakTime: peakPoint.time,
    sustainedDuration,
    auc,
    effectiveDuration: auc / Math.max(peakPoint.signal, 1e-6),
    surfaceLossFraction,
  };

  const score = scoreScenario(summary);
  summary.score = score;

  if (score <= -0.04) {
    summary.fate = "differentiation";
    summary.fateLabel = "Differentiation-like sustained signaling";
  } else if (score >= 0.12) {
    summary.fate = "growth";
    summary.fateLabel = "Growth-like transient signaling";
  } else {
    summary.fate = "mixed";
    summary.fateLabel = "Mixed or threshold regime";
  }

  return summary;
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function inverseLogistic(value) {
  return 1 / (1 + Math.exp(value));
}

function gammaPeak(time, peakTime) {
  const safeTime = Math.max(time, 1e-3);
  return (safeTime / peakTime) * Math.exp(1 - safeTime / peakTime);
}

function deriveResponseProfile(params, config) {
  const receptorNorm =
    (params.receptorLevel - RECEPTOR_RANGE.min) /
    (RECEPTOR_RANGE.max - RECEPTOR_RANGE.min);
  const occupancyAtPulsePeak = params.ligandPulse / (params.ligandPulse + 0.7);
  const drive =
    (params.receptorLevel * occupancyAtPulsePeak) /
    (params.dimerKd * config.kdMultiplier);
  const dimerizationResponse = logistic((drive - 1) * 4.6);
  const weakKdBias = logistic((params.dimerKd - 95) / 18);
  const thresholdDistance = (drive - 0.55) / 0.55;
  const nearThresholdWindow = Math.exp(-Math.pow(thresholdDistance, 2));
  const transientStrength = clamp(
    0.62 * dimerizationResponse + 0.48 * receptorNorm + config.transientBias,
    0,
    1
  );
  const sustainedStrength = clamp(
    config.sustainBias *
      weakKdBias *
      nearThresholdWindow *
      (0.75 + 0.25 * (1 - receptorNorm)) *
      (1 - 0.55 * receptorNorm) *
      (1 - 0.5 * transientStrength),
    0,
    1
  );
  const pulseDurationNorm = clamp((params.pulseDuration - 12) / (60 - 12), 0, 1);

  return {
    drive,
    transientStrength,
    sustainedStrength,
    transientAmplitude:
      0.14 +
      1.55 *
        Math.pow(transientStrength, 1.1) *
        (0.75 + (0.25 * params.ligandPulse) / 1.8),
    sustainedAmplitude:
      0.02 +
      0.22 * sustainedStrength * (0.85 + 0.5 * pulseDurationNorm),
    peakTime: 2.1 - 0.28 * clamp(transientStrength - 0.5, -1, 1),
    transientEnd: 15 - 2.6 * clamp(transientStrength - 0.55, -0.5, 0.5),
    sustainEnd:
      28 + 34 * sustainedStrength * (0.55 + 0.45 * pulseDurationNorm),
    sustainRise: 2.2 + 1.0 * (1 - sustainedStrength),
  };
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
