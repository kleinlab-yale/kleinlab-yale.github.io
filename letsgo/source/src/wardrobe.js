import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ACCESSORIES, GARMENTS, HAIR, HAIR_COLORS } from './appearance.js';

const rounded = new RoundedBoxGeometry(1, 1, 1, 2, 0.16);
const bead = new THREE.SphereGeometry(0.5, 12, 8);
const hoop = new THREE.TorusGeometry(0.023, 0.004, 6, 13);
const blossomShape = new THREE.Shape();
for (let i = 0; i < 30; i++) {
  const angle = i / 30 * Math.PI * 2;
  const radius = 0.36 + 0.13 * Math.cos(angle * 5);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  if (i === 0) blossomShape.moveTo(x, y);
  else blossomShape.lineTo(x, y);
}
blossomShape.closePath();
const blossom = new THREE.ShapeGeometry(blossomShape);
const strawCone = new THREE.CylinderGeometry(0.046, 0.339, 0.145, 32);
const strawEdge = new THREE.CylinderGeometry(0.337, 0.329, 0.023, 32);
const strawBand = new THREE.CylinderGeometry(0.227, 0.238, 0.019, 32);

function model(parent, geometry, material, x, y, z, w = 1, h = 1, d = 1) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function softPiece(parent, material, x, y, z, w, h, d) {
  return model(parent, rounded, material, x, y, z, w, h, d);
}

function swatch(color, roughness = 0.54, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function createHair(parent) {
  const base = swatch(HAIR_COLORS[0].color, 0.5);
  const shadow = base.clone();
  const sheen = base.clone();
  const tint = swatch('#dbaba6', 0.63);
  const groups = HAIR.map(() => new THREE.Group());
  parent.add(...groups);

  function lock(group, x, y, z, w, h, d, tilt = 0, shades = base) {
    const shape = softPiece(group, shades, x, y, z, w, h, d);
    shape.rotation.z = tilt;
    return shape;
  }

  function crown(group, fringe = 'side') {
    lock(group, 0, 1.437, 0.027, 0.421, 0.153, 0.386);
    lock(group, 0, 1.338, 0.133, 0.402, 0.235, 0.17, 0, shadow);
    if (fringe === 'side') {
      lock(group, -0.083, 1.405, -0.140, 0.246, 0.095, 0.104, -0.28);
      lock(group, 0.127, 1.419, -0.137, 0.132, 0.078, 0.096, 0.31, sheen);
    } else {
      lock(group, -0.117, 1.398, -0.142, 0.154, 0.091, 0.093, -0.43);
      lock(group, 0.116, 1.410, -0.145, 0.158, 0.072, 0.096, 0.26, sheen);
    }
    for (const s of [-1, 1]) lock(group, s * 0.185, 1.337, 0.008, 0.055, 0.128, 0.13, s * 0.10);
  }

  function braid(group, x, y, z, length, tilt) {
    const plait = new THREE.Group();
    plait.position.set(x, y, z);
    plait.rotation.z = tilt;
    group.add(plait);
    for (let i = 0; i < length; i++) {
      const side = i % 2 ? 1 : -1;
      const taper = 1 - 0.39 * i / length;
      lock(plait, side * 0.025 * taper, -i * 0.05, side * 0.008, 0.118 * taper, 0.076, 0.065, side * 0.63, i % 3 ? base : sheen);
    }
    lock(plait, 0, -length * 0.05 + 0.009, 0, 0.061, 0.026, 0.07, 0, tint);
    lock(plait, 0, -length * 0.05 - 0.027, 0, 0.046, 0.075, 0.058, -0.21);
  }

  crown(groups[0]);
  crown(groups[1]);
  lock(groups[1], 0, 1.516, 0.126, 0.187, 0.125, 0.17, -0.1);
  lock(groups[1], 0, 1.482, 0.139, 0.153, 0.028, 0.14, 0, tint);

  for (const [index, length, wavy] of [[2, 0.27, false], [3, 0.42, true], [4, 0.63, true], [9, 0.68, false]]) {
    const group = groups[index];
    crown(group, index === 2 ? 'side' : 'part');
    lock(group, 0, 1.404 - length * 0.45, 0.167, 0.391, length, 0.147, 0, shadow);
    for (const side of [-1, 1]) {
      lock(group, side * 0.179, 1.404 - length * 0.33, 0.083, 0.113, length * 0.9, 0.202, side * 0.08);
      lock(group, side * 0.181, 1.286 - length * 0.39, -0.045, 0.08, length * 0.63, 0.107, side * 0.05, sheen);
      if (wavy) {
        lock(group, side * 0.192, 1.256 - length * 0.56, 0.039, 0.109, length * 0.43, 0.136, side * 0.29);
        lock(group, side * 0.187, 1.166 - length * 0.45, 0.064, 0.099, length * 0.23, 0.132, side * -0.32, shadow);
      }
    }
  }

  crown(groups[5], 'part');
  lock(groups[5], 0, 1.452, 0.199, 0.147, 0.069, 0.076, 0, tint);
  lock(groups[5], 0.026, 1.364, 0.238, 0.151, 0.235, 0.103, 0.22);
  lock(groups[5], 0.075, 1.205, 0.215, 0.094, 0.219, 0.087, 0.31, sheen);

  crown(groups[6], 'part');
  lock(groups[6], 0.133, 1.257, 0.12, 0.158, 0.208, 0.138, 0.28);
  braid(groups[6], 0.192, 1.225, 0.026, 7, 0.23);
  crown(groups[7], 'part');
  for (const side of [-1, 1]) braid(groups[7], side * 0.187, 1.3, 0.021, 6, side * 0.14);
  crown(groups[8], 'part');
  for (const side of [-1, 1]) {
    model(groups[8], bead, shadow, side * 0.178, 1.505, 0.088, 0.191, 0.139, 0.169);
    model(groups[8], bead, base, side * 0.208, 1.539, 0.102, 0.15, 0.146, 0.152);
    lock(groups[8], side * 0.177, 1.492, 0.07, 0.15, 0.029, 0.108, side * 0.42, tint);
  }
  crown(groups[10]);
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      const z = -0.119 + row * 0.135;
      const y = 1.463 + (row === 1 ? 0.036 : 0.011) - Math.abs(col) * 0.009;
      model(groups[10], bead, (row + col) % 3 ? base : sheen, col * 0.077, y, z, 0.121, 0.091, 0.132);
    }
  }

  return look => {
    base.color.set(HAIR_COLORS[look.hairColor].color);
    shadow.color.copy(base.color).multiplyScalar(0.67);
    sheen.color.copy(base.color).multiplyScalar(1.24);
    for (const [index, group] of groups.entries()) group.visible = index === look.hair;
  };
}

export function createAccessories(parent, trim) {
  const straw = swatch('#c5a579', 0.78);
  const braid = swatch('#9e784e', 0.8);
  const gold = swatch('#c99854', 0.39, 0.38);
  const silver = swatch('#bec5c8', 0.37, 0.43);
  const jade = swatch('#679b89', 0.26, 0.08);
  const petal = swatch('#ef96ad');
  petal.side = THREE.DoubleSide;
  const groups = ACCESSORIES.map(() => new THREE.Group());
  parent.add(...groups);

  // All three layers share the head's centerline.
  model(groups[1], strawCone, straw, 0, 1.542, 0);
  model(groups[1], strawEdge, braid, 0, 1.467, 0);
  model(groups[1], strawBand, trim, 0, 1.521, 0);

  model(groups[2], blossom, petal, 0.17, 1.429, -0.177, 0.127, 0.127, 1).rotation.z = 0.18;
  model(groups[2], bead, gold, 0.17, 1.429, -0.183, 0.019, 0.019, 0.009);
  for (const side of [-1, 1]) {
    softPiece(groups[3], trim, side * 0.072, 1.46, 0.261, 0.11, 0.064, 0.052).rotation.z = side * 0.19;
    softPiece(groups[3], trim, side * 0.052, 1.391, 0.253, 0.044, 0.11, 0.021).rotation.z = side * 0.25;
    model(groups[5], bead, jade, side * 0.215, 1.18, -0.003, 0.047, 0.084, 0.028);
    model(groups[5], bead, gold, side * 0.215, 1.224, -0.003, 0.021, 0.028, 0.021);
    model(groups[7], hoop, silver, side * 0.211, 1.186, -0.004).rotation.y = side * 0.6;
  }
  softPiece(groups[3], trim, 0, 1.455, 0.286, 0.049, 0.058, 0.038);
  softPiece(groups[4], gold, -0.143, 1.487, -0.14, 0.125, 0.022, 0.036).rotation.z = -0.4;
  for (const [x, height] of [[-0.201, 0.021], [-0.177, 0.032], [-0.155, 0.05], [-0.129, 0.04], [-0.105, 0.025]]) {
    model(groups[4], bead, gold, x, 1.516 + height / 2, -0.14, 0.02, height, 0.018);
  }
  softPiece(groups[6], trim, 0, 1.431, 0.017, 0.438, 0.066, 0.391);
  softPiece(groups[6], trim, -0.142, 1.314, 0.215, 0.077, 0.218, 0.039).rotation.z = -0.34;
  softPiece(groups[6], trim, -0.077, 1.345, 0.225, 0.07, 0.157, 0.049).rotation.z = 0.27;

  return look => {
    for (const [index, group] of groups.entries()) group.visible = index === look.accessory;
  };
}

const cuts = [
  null,
  { hem: 0.21, waist: 0.643, bottom: 0.356, top: 0.213, depth: 0.68, border: 0.046, pattern: 'flowers', sleeves: 0.52, stride: 0.58 },
  { hem: 0.155, waist: 0.65, bottom: 0.305, top: 0.218, depth: 0.67, border: 0.021, pattern: 'wrap', sleeves: 0.85, stride: 0.52 },
  { hem: 0.285, waist: 0.645, bottom: 0.346, top: 0.207, depth: 0.68, border: 0.014, pattern: 'pleats', sleeves: 0.56, stride: 0.66 },
  { hem: 0.079, waist: 0.657, bottom: 0.34, top: 0.218, depth: 0.62, border: 0.072, pattern: 'flowers', sleeves: 1.1, stride: 0.3 },
  { hem: 0.41, waist: 0.65, bottom: 0.274, top: 0.227, depth: 0.68, border: 0.033, pattern: 'leaves', sleeves: 0.64, stride: 0.84 },
  { hem: 0.055, waist: 0.673, bottom: 0.419, top: 0.208, depth: 0.67, border: 0.04, pattern: 'embroidery', sleeves: 0.74, stride: 0.28 },
  { hem: 0.27, waist: 0.64, bottom: 0.284, top: 0.22, depth: 0.69, border: 0.026, pattern: 'open', sleeves: 1, stride: 0.8 },
  { hem: 0.19, waist: 0.645, bottom: 0.36, top: 0.207, depth: 0.66, border: 0.038, pattern: 'layered', sleeves: 0.46, stride: 0.56 },
];

export function createClothes(parent, fabric, trim, lining) {
  const groups = GARMENTS.map(() => new THREE.Group());
  parent.add(...groups);
  const embroidery = trim.clone();
  embroidery.side = THREE.DoubleSide;
  const lapel = lining.clone();
  lapel.side = THREE.DoubleSide;
  for (const [index, cut] of cuts.entries()) {
    if (!cut) continue;
    const group = groups[index];
    const { hem, waist, bottom, top, depth, border, pattern } = cut;
    const height = waist - hem;
    const radius = y => bottom + (top - bottom) * (y - hem) / height;
    const sides = pattern === 'pleats' ? 18 : 12;
    function band(inside, lower, upper, material, margin = 0.004) {
      const angle = Math.PI / sides + (inside ? 0.49 : 0);
      const geometry = new THREE.CylinderGeometry(radius(upper) + margin, radius(lower) + margin, upper - lower,
        sides, 1, true, angle, inside ? Math.PI * 2 - 0.98 : Math.PI * 2);
      const shape = model(group, geometry, material, 0, (lower + upper) / 2, 0, 1, 1, depth);
      if (inside) shape.rotation.y = Math.PI;
    }
    const open = pattern === 'open';
    band(open, hem, waist, fabric);
    band(open, hem, hem + border, trim, 0.011);
    if (pattern === 'layered') {
      const middle = hem + 0.14;
      band(false, middle, middle + 0.045, trim, 0.013);
      band(false, middle + 0.045, middle + 0.07, lining, 0.009);
    }
    if (pattern === 'pleats' || pattern === 'layered') {
      for (const side of [-1, 1]) {
        for (const factor of [-0.55, -0.24, 0.24, 0.55]) {
          const y = (hem + waist) / 2;
          const z = side * radius(y) * depth * Math.sqrt(1 - factor ** 2);
          softPiece(group, lining, radius(y) * factor, y, z, 0.015, height * 0.86, 0.024).rotation.z = factor * 0.18;
        }
      }
    }
    if (pattern === 'wrap' || open) {
      const seam = softPiece(group, trim, open ? 0.147 : 0.077, (waist + hem) / 2, -radius((waist + hem) / 2) * depth,
        0.024, height * 0.95, 0.066);
      seam.rotation.z = open ? 0.17 : 0.34;
      seam.rotation.x = -0.12;
    }
    if (['flowers', 'embroidery', 'leaves'].includes(pattern)) {
      const count = pattern === 'embroidery' ? 5 : 3;
      for (const side of [-1, 1]) {
        for (let i = 0; i < count; i++) {
          const theta = (i - (count - 1) / 2) * 0.38;
          const y = hem + border + 0.042 + (i % 2) * 0.041 + (pattern === 'embroidery' ? 0.029 : 0);
          const x = Math.sin(theta) * radius(y);
          const z = side * Math.cos(theta) * radius(y) * depth * 0.994;
          const motif = model(group, blossom, pattern === 'leaves' ? lapel : embroidery, x, y, z, 0.099, 0.097, 1);
          motif.rotation.set(-side * 0.15, side * theta, i * 0.61);
        }
      }
    }
    const obi = softPiece(group, trim, 0, 0.64, -0.006, index === 4 ? 0.473 : 0.444, index === 4 ? 0.092 : 0.068, 0.323);
    obi.position.y += 0.005;
  }
  return look => {
    for (const [index, group] of groups.entries()) group.visible = index === look.garment;
    embroidery.color.copy(trim.color);
    lapel.color.copy(lining.color);
    return cuts[look.garment] ?? { sleeves: 1, stride: 1 };
  };
}
