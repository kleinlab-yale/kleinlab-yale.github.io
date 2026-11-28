import * as THREE from 'three';
import { SHIPS } from './ship-data.js';

// The sections run from the pointed bow to the broad stern.
const sections = [
  [-0.51, 0.025, 0.26], [-0.448, 0.37, 0.16], [-0.352, 0.70, 0.07], [-0.22, 0.91, 0.01],
  [-0.065, 1, 0], [0.105, 0.985, 0], [0.27, 0.89, 0.055], [0.405, 0.74, 0.17], [0.493, 0.64, 0.255],
];
const levels = [0, 0.19, 0.39, 0.60, 0.79, 0.91, 1];
const flare = [0.24, 0.50, 0.69, 0.85, 0.95, 1, 1.02];

export function createShipModels(brick) {
  const material = (color, properties = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.58, ...properties });
  const timber = material('#774833');
  const trim = material('#3e2a27');
  const oak = material('#bd8a52');
  const paleOak = material('#d3a06a');
  const teal = material('#426e65');
  const indigo = material('#354956');
  const brass = material('#c29750', { metalness: 0.48, roughness: 0.38 });
  const glass = material('#f3b867', { emissive: '#ce8137', emissiveIntensity: 0.7, roughness: 0.22 });
  const rope = material('#a7936c', { roughness: 0.91 });
  const enamel = material('#8b3739', { roughness: 0.46 });
  const plank = material('#ffffff', { vertexColors: true, side: THREE.DoubleSide });
  const canvas = material('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  const column = new THREE.CylinderGeometry(0.5, 0.46, 1, 10);
  const ring = new THREE.TorusGeometry(0.13, 0.035, 6, 14);
  const up = new THREE.Vector3(0, 1, 0);
  const offWhite = new THREE.Color('#f2dfb6');
  const fadedCloth = new THREE.Color('#d9c294');
  const sailMark = new THREE.Color('#9d5245');

  return function makeShip(id) {
    const ship = SHIPS[id];
    const large = id === 'galleon';
    const { beam, length, deckHeight } = ship;
    const group = new THREE.Group();
    const refit = new THREE.Group(), framing = new THREE.Group(), deck = new THREE.Group(), rig = new THREE.Group();
    group.add(refit, framing, deck, rig);
    const hardware = large ? brass : teal;
    const boatside = large ? indigo : timber;
    const batches = new Map();
    const disposables = [];
    const transform = new THREE.Object3D();

    function piece(parent, geometry, surface, x, y, z, w, h, d, rotation = null) {
      if (!batches.has(parent)) batches.set(parent, new Map());
      const key = `${geometry.id}/${surface.id}`;
      const byMaterial = batches.get(parent);
      if (!byMaterial.has(key)) byMaterial.set(key, { geometry, surface, pieces: [] });
      byMaterial.get(key).pieces.push({ x, y, z, w, h, d, rotation });
    }
    const box = (parent, surface, x, y, z, w, h, d, rotation) => piece(parent, brick, surface, x, y, z, w, h, d, rotation);

    function spar(parent, surface, a, b, width, geometry = column) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const axis = end.clone().sub(start);
      const middle = start.lerp(end, 0.5);
      const span = axis.length();
      const rotation = new THREE.Quaternion().setFromUnitVectors(up, axis.normalize());
      piece(parent, geometry, surface, middle.x, middle.y, middle.z, width, span, width, rotation);
    }

    function skin(parent, surface, vertices, colors, indices = null) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      if (indices) geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, surface);
      mesh.receiveShadow = true;
      parent.add(mesh);
      disposables.push(geometry);
    }

    function sectionPoint(section, row, side) {
      const [offset, width, rise] = section;
      const keel = large ? -0.88 : -0.63;
      const deckY = deckHeight + rise * (large ? 1.3 : 1) - 0.055;
      return [side * beam * 0.5 * width * flare[row], THREE.MathUtils.lerp(keel, deckY, levels[row]), offset * length];
    }

    const hullColors = (large ? ['#3a3634', '#424b4d', '#364a52', '#405964', '#ac7c48', '#3d5159'] :
      ['#5d4036', '#8d5539', '#a66a44', '#8c5039', '#51796b', '#a7754d']).map(color => new THREE.Color(color));
    for (const patched of [false, true]) {
      const vertices = [], colors = [];
      for (const side of [-1, 1]) for (let row = 0; row < levels.length - 1; row++) {
        for (let i = 0; i < sections.length - 1; i++) {
          const gap = (row === 3 && i >= 2 && i <= 4) || (row === 2 && i === (side === 1 ? 2 : 5)) ||
            (row >= 4 && i === 0);
          if (gap !== patched) continue;
          const a = sectionPoint(sections[i], row, side);
          const b = sectionPoint(sections[i + 1], row, side);
          const c = sectionPoint(sections[i + 1], row + 1, side);
          const d = sectionPoint(sections[i], row + 1, side);
          const color = hullColors[row].clone().multiplyScalar(0.92 + ((i * 11 + row * 23 + side * 7 + 90) % 11) * 0.016);
          if (patched && !large && row < 4) color.lerp(new THREE.Color('#c6864a'), 0.20);
          for (const point of [a, b, c, a, c, d]) {
            vertices.push(...point);
            colors.push(color.r, color.g, color.b);
          }
        }
      }
      skin(patched ? refit : group, plank, vertices, colors);
    }
    const [sternX, sternY, sternZ] = sectionPoint(sections.at(-1), levels.length - 1, 1);
    box(group, boatside, 0, sternY - 0.43, sternZ - 0.065, sternX * 1.95, 0.84, 0.12);
    box(deck, hardware, 0, sternY + 0.015, sternZ - 0.028, sternX * 2.04, 0.085, 0.141);

    for (let i = 0; i < sections.length - 1; i++) {
      const a = sectionPoint(sections[i], levels.length - 1, 1);
      const b = sectionPoint(sections[i + 1], levels.length - 1, 1);
      const h = (a[1] + b[1]) / 2;
      const strips = Math.max(1, Math.round((b[2] - a[2]) / 0.24));
      for (let j = 0; j < strips; j++) {
        const fraction = (j + 0.5) / strips;
        const x = THREE.MathUtils.lerp(a[0], b[0], fraction);
        const z = THREE.MathUtils.lerp(a[2], b[2], fraction);
        const surface = (i + j) % 4 ? oak : paleOak;
        box(deck, surface, 0, h + 0.018, z, Math.max(0.06, 2 * x - 0.08), 0.075, (b[2] - a[2]) / strips - 0.009);
      }
      if (i > 0 && i < sections.length - 2) {
        spar(framing, trim, [-a[0] * 0.83, h - 0.21, a[2]], [a[0] * 0.83, h - 0.21, a[2]], 0.15, brick);
      }
      for (const side of [-1, 1]) {
        const left = [a[0] * side, a[1] + 0.16, a[2]];
        const right = [b[0] * side, b[1] + 0.16, b[2]];
        spar(deck, trim, left, right, large ? 0.14 : 0.098, brick);
        spar(deck, hardware, [left[0], left[1] + 0.026, left[2]], [right[0], right[1] + 0.026, right[2]], 0.046, brick);
        if (i > 0) {
          box(deck, brass, left[0], left[1] + 0.02, left[2], 0.105, 0.071, 0.10);
          box(deck, timber, left[0], left[1] - 0.105, left[2], 0.073, 0.21, 0.085);
        }
      }
    }

    function lantern(parent, x, y, z) {
      box(parent, trim, x, y - 0.12, z, 0.112, 0.24, 0.098);
      box(parent, glass, x, y + 0.042, z, 0.139, 0.154, 0.139);
      box(parent, brass, x, y + 0.131, z, 0.179, 0.056, 0.178);
      box(parent, brass, x, y - 0.04, z, 0.168, 0.039, 0.165);
    }
    for (const side of [-1, 1]) {
      lantern(deck, beam * 0.27 * side, sternY + 0.19, sternZ - 0.22);
      box(deck, teal, side * 0.57, deckHeight + 0.124, length * 0.21, 0.42, 0.25, 0.48);
      piece(deck, ring, rope, side * 0.45, deckHeight + 0.072, -length * 0.24, 1.45, 1.26, 0.65,
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
    }

    if (large) {
      for (const [tier, y, width, deep] of [[0, deckHeight + 0.42, beam * 0.76, length * 0.254],
        [1, deckHeight + 1.02, beam * 0.66, length * 0.175]]) {
        const z = sternZ - deep / 2 - 0.12;
        box(deck, indigo, 0, y, z, width, tier ? 0.53 : 0.66, deep);
        box(deck, trim, 0, y + 0.34, z, width + 0.15, 0.14, deep + 0.22);
        box(deck, brass, 0, y - 0.235, sternZ - 0.103, width + 0.04, 0.065, 0.084);
        for (const i of [-2, -1, 0, 1, 2]) {
          const x = i * (width / 5.9);
          box(deck, brass, x, y + 0.024, sternZ - 0.083, 0.286, 0.341, 0.078);
          box(deck, glass, x, y + 0.033, sternZ - 0.034, 0.194, 0.249, 0.047);
          box(deck, trim, x, y + 0.04, sternZ + 0.001, 0.029, 0.256, 0.029);
        }
        for (const side of [-1, 1]) for (const off of [-0.26, 0.13, 0.51]) {
          box(deck, brass, side * (width * 0.5 + 0.015), y + 0.028, z + off, 0.09, 0.31, 0.30);
          box(deck, glass, side * (width * 0.5 + 0.07), y + 0.035, z + off, 0.035, 0.22, 0.207);
        }
      }
      for (let i = 0; i < 4; i++) box(deck, oak, 0, deckHeight + 0.09 + i * 0.115, length * 0.19 + i * 0.18,
        0.83, 0.18 + i * 0.23, 0.185);
      lantern(deck, 0, deckHeight + 1.69, sternZ - 0.30);
    } else {
      box(deck, trim, 0, deckHeight + 0.13, length * 0.265, beam * 0.81, 0.28, length * 0.26);
      box(deck, paleOak, 0, deckHeight + 0.30, length * 0.264, beam * 0.88, 0.097, length * 0.27);
    }
    spar(deck, trim, [0, deckHeight + 0.12, -length * 0.31], [0, deckHeight + (large ? 0.76 : 0.53), -length * 0.62], large ? 0.23 : 0.136);
    spar(deck, brass, [0, deckHeight + 0.23, -length * 0.47], [0, deckHeight + (large ? 0.51 : 0.42), -length * 0.563], 0.088);
    spar(framing, timber, [0, deckHeight - 0.38, length * 0.09], [0.21, deckHeight + 1.1, length * 0.12], 0.19);

    function sail(evaluate, emblem = false) {
      const vertices = [], colors = [], triangles = [];
      const across = 20, tall = 16;
      for (let row = 0; row <= tall; row++) for (let col = 0; col <= across; col++) {
        const u = col / across, v = row / tall;
        vertices.push(...evaluate(u, v));
        const overcast = Math.min(0.60, Math.abs(u - 0.5) * 0.60 + (col % 5 === 0 ? 0.095 : 0));
        const color = offWhite.clone().lerp(fadedCloth, overcast);
        const px = (u - 0.5) * 1.38, py = v - 0.52;
        const radius = 0.138 + Math.cos(Math.atan2(py, px) * 5) * 0.032;
        if (emblem) color.lerp(sailMark, THREE.MathUtils.smoothstep(radius - Math.hypot(px, py), -0.015, 0.017) * 0.87);
        colors.push(color.r, color.g, color.b);
        if (row && col) {
          const corner = row * (across + 1) + col;
          triangles.push(corner - across - 2, corner - across - 1, corner, corner - across - 2, corner, corner - 1);
        }
      }
      skin(rig, canvas, vertices, colors, triangles);
    }

    function mast(z, height, width, joints) {
      spar(rig, timber, [0, deckHeight - 0.16, z], [0, height + 0.36, z], large ? 0.193 : 0.167);
      spar(rig, brass, [0, height + 0.28, z], [0, height + 0.33, z], 0.23);
      for (const side of [-1, 1]) {
        spar(rig, rope, [side * beam * 0.46, deckHeight + 0.18, z + 0.67], [0, height + 0.10, z], 0.025);
        for (let i = 0; i < (large ? 6 : 3); i++) {
          const t = 0.1 + i * 0.09;
          const x = beam * 0.46 * side * (1 - t);
          const y = THREE.MathUtils.lerp(deckHeight + 0.18, height + 0.10, t);
          spar(rig, rope, [x, y, z + 0.67 * (1 - t)], [x * 0.84, y + 0.16, z + 0.37 * (1 - t)], 0.022);
        }
      }
      const pennant = (u, v) => [0.033 + 0.074 * Math.sin(u * Math.PI * 2) * v, height + 0.31 + v * 0.231 * (1 - u), z + 0.62 * u];
      const flag = [pennant(0, 0), pennant(1, 0), pennant(0, 1)];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([...flag.flat(), ...[...flag].reverse().flat()], 3));
      geometry.computeVertexNormals();
      rig.add(new THREE.Mesh(geometry, enamel));
      disposables.push(geometry);
      for (const [i, [upper, lower]] of joints.entries()) {
        const end = width * (i ? 0.82 : 1);
        const point = (u, v) => [(u - 0.5) * end * (1.04 - v * 0.16),
          THREE.MathUtils.lerp(lower, upper, v) - Math.sin(u * Math.PI) * 0.087 * (1 - v),
          z - 0.06 - Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.9) * (large ? 0.49 : 0.27)];
        sail(point, large && width > 2.9 && i === 0);
        spar(rig, trim, [-end * 0.51, upper + 0.035, z], [end * 0.51, upper + 0.035, z], 0.103);
        spar(rig, rope, [-end * 0.53, lower - 0.04, z - 0.05], [end * 0.53, lower - 0.04, z - 0.05], 0.037);
      }
    }

    if (large) {
      mast(-length * 0.265, 5.3, beam * 0.81, [[4.11, 2.34], [5.16, 4.29]]);
      mast(length * 0.055, 6.32, beam * 0.97, [[4.52, 2.47], [6.03, 4.76]]);
      mast(length * 0.3, 5.05, beam * 0.62, [[4.63, 2.83]]);
      spar(rig, rope, [0, 5.31, -length * 0.265], [0, deckHeight + 0.70, -length * 0.61], 0.035);
      spar(rig, rope, [0, 6.27, length * 0.055], [0, 4.99, length * 0.3], 0.041);
    } else {
      const z = length * 0.055;
      mast(z, 4.48, 0, []);
      const gaff = (u, v) => [0.039 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.31,
        THREE.MathUtils.lerp(1.62 + u * 0.05, 3.77 + u * 0.56, v), z - 0.016 + u * (2.33 - v * 0.69)];
      sail(gaff, true);
      spar(rig, trim, gaff(0, 1), gaff(1, 1), 0.102);
      spar(rig, timber, gaff(0, 0), gaff(1, 0), 0.087);
      const jib = (u, v) => [0.033 - Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.25,
        1.33 + v * 2.63 + 0.14 * u, THREE.MathUtils.lerp(z - 3.03 * u, z - 0.055, v)];
      sail(jib);
      spar(rig, rope, jib(1, 0), jib(1, 1), 0.034);
      spar(rig, rope, [0, 4.47, z], [0, deckHeight + 0.32, length * 0.48], 0.026);
    }

    for (const [parent, kinds] of batches) for (const { geometry, surface, pieces } of kinds.values()) {
      const mesh = new THREE.InstancedMesh(geometry, surface, pieces.length);
      for (const [i, block] of pieces.entries()) {
        transform.position.set(block.x, block.y, block.z);
        transform.scale.set(block.w, block.h, block.d);
        if (block.rotation) transform.quaternion.copy(block.rotation);
        else transform.quaternion.identity();
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      }
      mesh.receiveShadow = true;
      parent.add(mesh);
    }

    return {
      group,
      stage(value) {
        const finished = value >= ship.work.length;
        refit.visible = large ? finished : value >= 1;
        deck.visible = large ? finished : value >= 2;
        rig.visible = finished;
        framing.visible = !deck.visible;
        return finished;
      },
      dispose() {
        for (const geometry of disposables) geometry.dispose();
        group.traverse(mesh => { if (mesh.isInstancedMesh) mesh.dispose(); });
      },
    };
  };
}
