export function createAudio() {
  let context;
  let volume;
  let enabled = true;
  let noise;

  function start() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !enabled) return;
    if (!context) {
      context = new AudioContext();
      volume = context.createGain();
      volume.gain.value = 0.72;
      volume.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const samples = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < samples.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.035) / 1.035;
        samples[i] = last * 2.7;
      }
      const wind = context.createBufferSource();
      wind.buffer = noise;
      wind.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 460;
      const level = context.createGain();
      level.gain.value = 0.12;
      wind.connect(filter).connect(level).connect(volume);
      wind.start();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function tap(kind) {
    if (!context || !enabled || context.state !== 'running') return;
    const now = context.currentTime;
    const level = context.createGain();
    const oscillator = context.createOscillator();
    const note = kind === 'place' ? 375 : kind === 'remove' ? 190 : 94;
    oscillator.type = kind === 'step' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(note, now);
    oscillator.frequency.exponentialRampToValueAtTime(note * 0.55, now + 0.073);
    level.gain.setValueAtTime(kind === 'step' ? 0.028 : 0.11, now);
    level.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(level).connect(volume);
    oscillator.start(now);
    oscillator.stop(now + 0.125);
  }

  return {
    start,
    tap,
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      if (enabled) start();
      if (volume) volume.gain.setTargetAtTime(enabled ? 0.72 : 0.0001, context.currentTime, 0.05);
      return enabled;
    },
  };
}
