export function damp(state, target, frequency, dt) {
  // Integrate a critically damped spring at the current frame rate.
  const offset = state.value - target;
  const drift = state.velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  state.value = target + (offset + drift * dt) * decay;
  state.velocity = (state.velocity - frequency * drift * dt) * decay;
  return state.value;
}

export function snapMotion(state, value) {
  state.value = value;
  state.velocity = 0;
  return value;
}

export function stepLength(sprinting) {
  return sprinting ? 0.84 : 0.65;
}
