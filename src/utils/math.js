export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInOut(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function segmentT(progress, start, end) {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }
  return easeInOut(clamp((progress - start) / (end - start), 0, 1));
}
