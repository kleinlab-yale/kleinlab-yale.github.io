const BEAT = 0.83;
const PHRASES = [
  { low: [48, 55, 60], tune: [[0, 67], [1.5, 72], [3, 74], [5, 76], [6.5, 72]] },
  { low: [45, 52, 60], tune: [[0.5, 69], [2, 67], [3.5, 64], [5.5, 62]] },
  { low: [41, 48, 57], tune: [[0, 65], [2, 69], [4, 72], [5.5, 69], [7, 67]] },
  { low: [43, 50, 55], tune: [[1, 74], [2.5, 72], [4, 67], [6, 69]] },
  { low: [48, 55, 64], tune: [[0, 76], [1, 79], [2.5, 76], [4.5, 72], [6.5, 74]] },
  { low: [40, 47, 55], tune: [[0.5, 71], [2, 67], [3, 64], [5.5, 67]] },
  { low: [41, 48, 57], tune: [[0, 69], [2.5, 72], [4, 76], [6, 74]] },
  { low: [43, 50, 60], tune: [[0, 67], [2, 62], [4, 64], [6, 67], [7, 72]] },
];

export function createAudio(saved, save) {
  let context;
  let master;
  let music;
  let effects;
  let noise;
  let nextPhrase = 0;
  let phraseIndex = 0;
  let timer = 0;
  const settings = { enabled: saved?.enabled !== false, music: saved?.music !== false, effects: saved?.effects !== false };

  function pluck(bus, when, note, amount, decay) {
    const frequency = 440 * 2 ** ((note - 69) / 12);
    for (const [ratio, strength, tail] of [[1, 1, decay], [2, 0.26, decay * 0.44], [3.01, 0.095, decay * 0.20]]) {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency * ratio;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(amount * strength, when + 0.026);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + tail);
      oscillator.connect(gain).connect(bus);
      oscillator.start(when);
      oscillator.stop(when + tail + 0.02);
    }
  }

  function scheduleMusic() {
    if (context?.state !== 'running' || !settings.enabled || !settings.music || document.hidden) return;
    const now = context.currentTime;
    if (nextPhrase < now - 0.04) nextPhrase = now + 0.08;
    if (nextPhrase > now + 0.36) return;
    const { low, tune } = PHRASES[phraseIndex];
    for (const [i, note] of low.entries()) {
      pluck(music, nextPhrase + i * BEAT * 0.38, note, 0.076 / (i * 0.33 + 1), 3.7 - i * 0.52);
    }
    for (const [i, [beat, note]] of tune.entries()) {
      pluck(music, nextPhrase + beat * BEAT, note, i ? 0.079 : 0.097, 1.85);
    }
    nextPhrase += BEAT * 8;
    phraseIndex = (phraseIndex + 1) % PHRASES.length;
  }

  function levels() {
    if (!context) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(settings.enabled && !document.hidden ? 0.73 : 0, now, 0.035);
    music.gain.setTargetAtTime(settings.music ? 0.35 : 0, now, 0.05);
    effects.gain.setTargetAtTime(settings.effects ? 0.76 : 0, now, 0.04);
    if (settings.enabled && settings.music && !document.hidden) {
      if (!timer) timer = window.setInterval(scheduleMusic, 200);
      scheduleMusic();
    } else if (timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  }

  function start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !settings.enabled || !settings.music && !settings.effects) return;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      music = context.createGain();
      effects = context.createGain();
      master.gain.value = 0;
      music.gain.value = 0;
      effects.gain.value = 0;
      music.connect(master);
      effects.connect(master);
      master.connect(context.destination);

      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const wind = context.createBufferSource();
      wind.buffer = noise;
      wind.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 225;
      const air = context.createGain();
      air.gain.value = 0.043;
      wind.connect(filter).connect(air).connect(effects);
      wind.start();
    }
    if (context.state !== 'running') context.resume().then(scheduleMusic).catch(() => {});
    levels();
  }

  function tickNoise(when, frequency, level) {
    const sample = context.createBufferSource();
    sample.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.9;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.043);
    sample.connect(filter).connect(gain).connect(effects);
    sample.start(when, 0.32, 0.048);
  }

  function tap(kind) {
    if (context?.state !== 'running' || !settings.enabled || !settings.effects || document.hidden) return;
    const now = context.currentTime + 0.005;
    if (kind === 'reward') {
      for (const [i, note] of [72, 76, 79].entries()) pluck(effects, now + i * 0.09, note, 0.055, 0.56);
      return;
    }
    const note = { place: 394, remove: 252, rotate: 510, paint: 620, use: 435, step: 98 }[kind] ?? 360;
    const amount = kind === 'step' ? 0.023 : 0.081;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note, now);
    oscillator.frequency.exponentialRampToValueAtTime(note * 0.72, now + 0.064);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(amount, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
    oscillator.connect(gain).connect(effects);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
    if (kind !== 'step') tickNoise(now, kind === 'place' ? 1760 : 1160, kind === 'place' ? 0.20 : 0.12);
  }

  document.addEventListener('visibilitychange', levels);
  return {
    start,
    resume() { if (context && context.state !== 'running') start(); },
    tap,
    get settings() { return { ...settings }; },
    set(key, value) {
      settings[key] = value;
      save(settings);
      if (value) start();
      else levels();
    },
  };
}
