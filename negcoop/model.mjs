export const TOTAL_TIME = 180;
export const DT = 0.5;
export const RECEPTOR_RANGE = { min: 30, max: 300 };
export const KD_RANGE = { min: 15, max: 180 };

export const COOPERATIVITY = {
  negative: {
    key: "negative",
    label: "Negative",
    exponent: 0.72,
    kdMultiplier: 1.16,
  },
  neutral: {
    key: "neutral",
    label: "Neutral",
    exponent: 1,
    kdMultiplier: 1,
  },
  positive: {
    key: "positive",
    label: "Positive",
    exponent: 1.5,
    kdMultiplier: 0.82,
  },
};

export const DEFAULTS = {
  receptorLevel: 45,
  dimerKd: 110,
  ligandPulse: 1.5,
  pulseDuration: 60,
  internalizationRate: 0.035,
  recyclingRate: 0.008,
  cooperativity: "negative",
};

export const PRESETS = [
  {
    id: "low-neg",
    name: "Low receptor + negative",
    description:
      "Weak dimerization stays sub-threshold, so internalization stays modest and signaling stretches out.",
    values: {
      receptorLevel: 45,
      dimerKd: 110,
      ligandPulse: 1.5,
      pulseDuration: 60,
      internalizationRate: 0.035,
      recyclingRate: 0.008,
      cooperativity: "negative",
    },
  },
  {
    id: "high-neg",
    name: "High receptor + same Kd",
    description:
      "Mass action titrates the weak dimerization step, producing a larger but shorter burst from the same Kd.",
    values: {
      receptorLevel: 220,
      dimerKd: 110,
      ligandPulse: 1.5,
      pulseDuration: 60,
      internalizationRate: 0.055,
      recyclingRate: 0.008,
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
      pulseDuration: 40,
      internalizationRate: 0.06,
      recyclingRate: 0.007,
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
      pulseDuration: 36,
      internalizationRate: 0.064,
      recyclingRate: 0.007,
      cooperativity: "positive",
    },
  },
];

export function pulseValue(time, amplitude, duration) {
  const onset = logistic((time - 6) / 1.7);
  const offset = logistic((time - (6 + duration)) / 2.6);
  return amplitude * Math.max(onset - offset, 0);
}

export function simulate(params) {
  const config = COOPERATIVITY[params.cooperativity];
  let surfaceReceptors = params.receptorLevel;
  let internalizedReceptors = 0;
  let signal = 0;

  const series = [];

  for (let time = 0; time <= TOTAL_TIME + 1e-9; time += DT) {
    const ligand = pulseValue(time, params.ligandPulse, params.pulseDuration);
    const occupancy = ligand / (ligand + 1);
    const boundReceptors = surfaceReceptors * occupancy;
    const drive = boundReceptors / (params.dimerKd * config.kdMultiplier);
    const cooperativeTerm = hillLike(drive, config.exponent);
    const activeReceptors = clamp(boundReceptors * cooperativeTerm, 0, surfaceReceptors);
    const activeDimers = activeReceptors / 2;

    signal += ((activeReceptors / 44) - 0.14 * signal) * DT;

    const internalizedFlux = params.internalizationRate * activeReceptors * DT;
    const recycledFlux = params.recyclingRate * internalizedReceptors * DT;

    surfaceReceptors = clamp(
      surfaceReceptors - internalizedFlux + recycledFlux,
      0,
      params.receptorLevel
    );
    internalizedReceptors = clamp(
      internalizedReceptors + internalizedFlux - recycledFlux,
      0,
      params.receptorLevel
    );

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

  const significanceThreshold = Math.max(0.28, peakPoint.signal * 0.7);
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

function hillLike(value, exponent) {
  const safeValue = Math.max(value, 0);
  const numerator = safeValue ** exponent;
  return numerator / (1 + numerator);
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
