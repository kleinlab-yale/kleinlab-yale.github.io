import { PLACEABLE_OBJECTS } from './parts.js';

export const OPENING_LIMITS = {
  door: { minWidth: 2, maxWidth: 12, minHeight: 9, maxHeight: 24 },
  window: { minWidth: 1, maxWidth: 12, minHeight: 2, maxHeight: 18 },
};

export function openingSizeAllowed(form, width, height) {
  const range = OPENING_LIMITS[form];
  return Boolean(range && width >= range.minWidth && width <= range.maxWidth &&
    height >= range.minHeight && height <= range.maxHeight);
}

const scales = [['small', 'Small', 0.7], ['standard', 'Standard', 1], ['large', 'Large', 1.45]];
const sizes = new Map(Object.entries(PLACEABLE_OBJECTS)
  .filter(([form]) => form !== 'tea' && !Object.hasOwn(OPENING_LIMITS, form))
  .map(([form, object]) => [form, scales.map(([key, name, scale]) => ({
    key, name, size: object.size.map(length => Math.max(1, Math.round(length * scale))),
  }))]));

sizes.set('indoorTree', [
  { key: 'small', name: 'Tabletop', size: PLACEABLE_OBJECTS.indoorTree.size },
  { key: 'standard', name: 'Medium', size: [2, 2, 12] },
  { key: 'large', name: 'Tall', size: [3, 3, 18] },
]);

export function sizeOptions(form) {
  return sizes.get(form) ?? [];
}

export function orientedSize([w, d, h], turn = 0) {
  return turn % 2 ? { w: d, d: w, h } : { w, d, h };
}

export function resizeObject(brick, size) {
  const shape = orientedSize(size, brick.turn);
  return { ...brick, ...shape,
    x: brick.x + Math.floor(brick.w / 2) - Math.floor(shape.w / 2),
    z: brick.z + Math.floor(brick.d / 2) - Math.floor(shape.d / 2),
  };
}
