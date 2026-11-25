import * as THREE from 'three';
import { PLATE, STUD, TONES, sameBrick } from './bricks.js';
import { PLACEABLE_OBJECTS } from './parts.js';

export function createHouseObjects(scene, brickGeometry) {
  const placed = new Map();
  const surfaces = new Map();
  const paint = tone => {
    if (!surfaces.has(tone)) surfaces.set(tone, new THREE.MeshStandardMaterial({ color: TONES[tone], roughness: 0.56 }));
    return surfaces.get(tone);
  };
  const round = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  const glass = new THREE.MeshStandardMaterial({ color: '#bdd9cf', transparent: true, opacity: 0.47,
    depthWrite: false, metalness: 0.15, roughness: 0.18 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ffdb98', emissive: '#ffad52', emissiveIntensity: 1.55, roughness: 0.27 });
  const dim = new THREE.MeshStandardMaterial({ color: '#ba986c', roughness: 0.66 });

  function mesh(group, surface, x, y, z, w, h, d, geometry = brickGeometry) {
    const piece = new THREE.Mesh(geometry, surface);
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    piece.receiveShadow = true;
    group.add(piece);
    return piece;
  }

  function makeDoor(group, tone, height) {
    for (const sign of [-1, 1]) mesh(group, paint('beam'), sign * 0.77, height / 2, 0, 0.11, height, 0.43);
    mesh(group, paint('beam'), 0, height - 0.045, 0, 1.56, 0.09, 0.43);
    const panel = new THREE.Group();
    panel.position.x = -0.71;
    group.add(panel);
    mesh(panel, tone, 0.71, height * 0.477, 0, 1.40, height * 0.91, 0.137);
    for (const row of [0.35, 0.69]) {
      for (const face of [-1, 1]) mesh(panel, paint('redwood'), 0.71, height * row, face * 0.073, 1.27, 0.085, 0.032);
    }
    for (const face of [-1, 1]) {
      mesh(panel, paint('gold'), 1.24, height * 0.5, face * 0.101, 0.09, 0.09, 0.081);
      mesh(panel, paint('gold'), 0.12, height * 0.31, face * 0.08, 0.15, 0.06, 0.039);
    }
    return panel;
  }

  function makeWindow(group, tone, height) {
    mesh(group, glass, 0, height / 2, 0, 1.44, height * 0.85, 0.075);
    for (const sign of [-1, 1]) mesh(group, tone, sign * 0.75, height / 2, 0, 0.14, height, 0.27);
    for (const y of [0.052, height - 0.052]) mesh(group, tone, 0, y, 0, 1.53, 0.101, 0.28);
    mesh(group, tone, 0, height / 2, 0, 0.056, height, 0.155);
    mesh(group, tone, 0, height / 2, 0, 1.6, 0.053, 0.154);
    mesh(group, paint('chalk'), 0, 0.044, 0, 1.64, 0.087, 0.48);
  }

  function makeFurniture(group, form, tone, height, width, depth) {
    const couch = form === 'couch';
    const table = form === 'table';
    const seat = couch ? 0.374 : height * (table ? 0.88 : 0.52);
    const foot = couch ? 0.11 : 0.084;
    for (const x of [-width * 0.38, width * 0.38]) {
      for (const z of [-depth * 0.32, depth * 0.32]) {
        mesh(group, paint('beam'), x, (seat - 0.08) / 2, z, foot, seat - 0.07, foot);
      }
    }
    mesh(group, table ? tone : paint('oak'), 0, seat - 0.042, 0, width * 0.96, 0.11, depth * 0.93);
    if (table) return;
    const cushions = couch ? [-width * 0.24, width * 0.24] : [0];
    for (const x of cushions) {
      mesh(group, tone, x, seat + 0.05, -0.06, width * (couch ? 0.44 : 0.84), 0.105, depth * 0.76);
      mesh(group, tone, x, height - 0.193, depth * 0.35, width * (couch ? 0.47 : 0.91), 0.38, depth * 0.25);
    }
    if (!couch) return;
    for (const x of [-width * 0.441, width * 0.441]) mesh(group, tone, x, seat + 0.09, -0.02, 0.21, 0.29, depth * 0.91);
    const pillow = mesh(group, paint('blush'), width * 0.28, seat + 0.20, depth * 0.12, 0.30, 0.28, 0.103);
    pillow.rotation.z = -0.22;
  }

  function makeLantern(group, form, tone, height) {
    const wide = form === 'beacon';
    const width = wide ? 0.89 : 0.42;
    mesh(group, paint('shale'), 0, 0.062, 0, width * 1.13, 0.124, width * 1.13);
    mesh(group, tone, 0, height * 0.252, 0, width * 0.57, height * 0.39, width * 0.57, round);
    mesh(group, tone, 0, height * 0.52, 0, width, height * 0.12, width);
    const globe = mesh(group, dim, 0, height * 0.69, 0, width * 0.77, height * 0.26, width * 0.77, round);
    for (const sign of [-1, 1]) {
      for (const other of [-1, 1]) mesh(group, tone, sign * width * 0.35, height * 0.68, other * width * 0.35, 0.052, height * 0.27, 0.052);
    }
    mesh(group, tone, 0, height * 0.87, 0, width, height * 0.13, width);
    mesh(group, paint('gold'), 0, height * 0.97, 0, width * 0.34, height * 0.06, width * 0.34, round);
    return globe;
  }

  function makeBell(group, tone, height) {
    mesh(group, paint('stone'), 0, 0.069, 0, 0.51, 0.14, 0.49);
    for (const side of [-1, 1]) mesh(group, paint('beam'), side * 0.205, height / 2, 0, 0.062, height, 0.145);
    mesh(group, paint('teal'), 0, height - 0.056, 0, 0.535, 0.11, 0.31);
    const swinging = new THREE.Group();
    swinging.position.y = height - 0.11;
    group.add(swinging);
    mesh(swinging, paint('cream'), 0, -0.08, 0, 0.026, 0.16, 0.026);
    mesh(swinging, tone, 0, -0.247, 0, 0.279, 0.26, 0.279, round);
    mesh(swinging, paint('gold'), 0, -0.37, 0, 0.318, 0.055, 0.318, round);
    mesh(swinging, paint('redTrim'), 0, -0.45, 0, 0.042, 0.18, 0.035);
    return swinging;
  }

  function create(brick) {
    const group = new THREE.Group();
    const { size: [w, d] } = PLACEABLE_OBJECTS[brick.form];
    const height = brick.h * PLATE;
    const tone = paint(brick.tone);
    let door = null;
    let light = null;
    let bell = null;
    switch (brick.form) {
      case 'door': door = makeDoor(group, tone, height); break;
      case 'window': makeWindow(group, tone, height); break;
      case 'lamp':
      case 'beacon': light = makeLantern(group, brick.form, tone, height); break;
      case 'windbell': bell = makeBell(group, tone, height); break;
      default: makeFurniture(group, brick.form, tone, height, w * STUD, d * STUD);
    }
    group.position.set((brick.x + brick.w / 2) * STUD, brick.y * PLATE, (brick.z + brick.d / 2) * STUD);
    group.rotation.y = -brick.turn * Math.PI / 2;
    if (door) door.rotation.y = brick.active ? -Math.PI / 2 : 0;
    scene.add(group);
    return { brick, group, door, light, bell, swing: 0 };
  }

  return {
    sync(world) {
      for (const [id, item] of placed) {
        const brick = world.bricks.get(id);
        if (sameBrick(item.brick, brick, false)) {
          if (item.bell && item.brick.active !== brick.active) item.swing = 1.2;
          item.brick = brick;
          continue;
        }
        scene.remove(item.group);
        placed.delete(id);
      }
      for (const brick of world.bricks.values()) {
        if (brick.form !== 'tea' && Object.hasOwn(PLACEABLE_OBJECTS, brick.form) && !placed.has(brick.id)) placed.set(brick.id, create(brick));
      }
    },
    animate(dt, reducedMotion) {
      const weight = reducedMotion ? 1 : 1 - Math.exp(-dt * 13);
      for (const item of placed.values()) {
        const { brick, door, light, bell } = item;
        if (door) door.rotation.y += ((brick.active ? -Math.PI / 2 : 0) - door.rotation.y) * weight;
        if (light) light.material = brick.active ? amber : dim;
        if (bell && item.swing > 0) {
          item.swing = Math.max(0, item.swing - dt);
          bell.rotation.z = reducedMotion ? 0 : Math.sin((1.2 - item.swing) * 20) * item.swing * 0.17;
        }
      }
    },
  };
}
