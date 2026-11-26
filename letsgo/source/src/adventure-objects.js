import * as THREE from 'three';
import { DEFAULT_LOOK } from './appearance.js';
import { createTraveler } from './traveler.js';
import { PLATE, STUD } from './bricks.js';
import { GARDEN_CHANNELS } from './mainland-data.js';

export function createAdventureObjects(scene, brick) {
  const root = new THREE.Group();
  scene.add(root);
  const keeper = createTraveler(scene, brick);
  keeper.appearance({ ...DEFAULT_LOOK, outfit: 4, skin: 3, hair: 4, hairColor: 6 });
  const harbormaster = createTraveler(scene, brick);
  harbormaster.appearance({ ...DEFAULT_LOOK, outfit: 3, skin: 5, hair: 6, hairColor: 1 });
  const chests = new Map();
  const lanterns = new Map();
  const supplyPiles = new Map();
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, ...extra });
  const wood = material('#a26346');
  const deep = material('#593d35');
  const copper = material('#c29b62', { metalness: 0.28, roughness: 0.33 });
  const pale = material('#aab0a0');
  const stone = material('#535a60');
  const dusk = material('#354950');
  const prism = material('#76beae', { roughness: 0.25 });
  const glow = material('#ffdfab', { emissive: '#ffb250', emissiveIntensity: 1.5, roughness: 0.28 });
  const jewel = new THREE.OctahedronGeometry(0.5, 0);
  const beaconRay = new THREE.CylinderGeometry(0.08, 0.26, 3.0, 16, 1, true);
  const rayMaterial = new THREE.MeshBasicMaterial({ color: '#ffc985', transparent: true, opacity: 0.15,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const stream = material('#679ca2', { emissive: '#4c7e81', emissiveIntensity: 0.18, roughness: 0.23, metalness: 0.08 });
  const cane = material('#7b864f');
  const fiber = material('#c3ae77');
  const log = new THREE.CylinderGeometry(0.5, 0.47, 1, 10);
  const wetBeds = new THREE.Group();
  const sluice = new THREE.Group();
  const wheel = new THREE.Group();
  let waterRunning = false;

  function mesh(parent, geometry, surface, x, y, z, w, h, d) {
    const item = new THREE.Mesh(geometry, surface);
    item.position.set(x, y, z);
    item.scale.set(w, h, d);
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  const box = (parent, surface, x, y, z, w, h, d) => mesh(parent, brick, surface, x, y, z, w, h, d);

  for (const { x, level } of GARDEN_CHANNELS) {
    box(wetBeds, stream, (x + 0.5) * STUD, level * PLATE - 0.08, 586 * STUD, STUD * 0.95, 0.07, 22 * STUD);
  }
  wetBeds.visible = false;
  wheel.position.set(0, 0.64, 0.11);
  sluice.add(wheel);
  box(sluice, stone, 0, 0.115, 0, 0.92, 0.23, 0.64);
  for (const x of [-0.33, 0.33]) box(sluice, deep, x, 0.46, 0, 0.13, 0.83, 0.48);
  box(sluice, dusk, 0, 0.904, 0, 0.89, 0.096, 0.46);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const tip = box(wheel, copper, Math.cos(angle) * 0.238, Math.sin(angle) * 0.238, 0.155, 0.263, 0.089, 0.07);
    tip.rotation.z = angle;
  }
  mesh(wheel, jewel, prism, 0, 0, 0.192, 0.163, 0.163, 0.106);
  root.add(sluice, wetBeds);

  function supply(id, kind) {
    if (supplyPiles.has(id)) return supplyPiles.get(id);
    const group = new THREE.Group();
    const goods = new THREE.Group();
    group.add(goods);
    root.add(group);
    box(group, deep, 0, 0.045, 0, 0.78, 0.09, 0.64);
    if (kind === 'reeds') {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 0.075;
        const height = 0.48 + i % 3 * 0.10;
        box(goods, i % 2 ? cane : fiber, x, height / 2 + 0.09, i % 2 ? 0.032 : -0.067, 0.054, height, 0.061).rotation.z = (i - 3) * 0.067;
      }
      box(goods, fiber, 0, 0.23, -0.036, 0.4, 0.069, 0.27);
    } else if (kind === 'timber') {
      for (const [x, y] of [[-0.19, 0.18], [0, 0.18], [0.19, 0.18], [-0.1, 0.34], [0.1, 0.34]]) {
        mesh(goods, log, wood, x, y, 0, 0.19, 0.61, 0.19).rotation.x = Math.PI / 2;
        mesh(goods, log, fiber, x, y, 0.306, 0.163, 0.018, 0.163).rotation.x = Math.PI / 2;
      }
      box(goods, pale, 0, 0.28, -0.077, 0.54, 0.28, 0.061);
    } else {
      box(group, wood, 0, 0.145, 0, 0.70, 0.17, 0.57);
      for (const x of [-0.31, 0.31]) box(group, deep, x, 0.28, 0, 0.085, 0.28, 0.54);
      for (const z of [-0.25, 0.25]) box(group, wood, 0, 0.275, z, 0.635, 0.115, 0.067);
      for (const [i, x] of [-0.18, -0.052, 0.09, 0.21].entries()) {
        mesh(goods, log, i % 2 ? copper : pale, x, 0.31, -0.081 + 0.041 * i, 0.089, 0.18, 0.089).rotation.z = 0.74 - i * 0.4;
      }
    }
    group.rotation.y = 0.25;
    const pile = { group, goods };
    supplyPiles.set(id, pile);
    return pile;
  }

  function chest(id) {
    if (chests.has(id)) return chests.get(id);
    const group = new THREE.Group();
    root.add(group);
    const vault = ['moon', 'stars', 'ridge', 'summit'].includes(id);
    const color = vault ? dusk : wood;
    box(group, deep, 0, 0.165, 0, 1.0, 0.33, 0.55);
    box(group, color, 0, 0.196, 0, 0.93, 0.26, 0.573);
    for (const x of [-0.411, 0.41]) for (const z of [-0.285, 0.285]) box(group, copper, x, 0.173, z, 0.096, 0.29, 0.043);
    const lid = new THREE.Group();
    lid.position.set(0, 0.318, 0.271);
    group.add(lid);
    box(lid, color, 0, 0.089, -0.272, 1.02, 0.173, 0.575);
    box(lid, deep, 0, 0.164, -0.271, 0.97, 0.055, 0.49);
    for (const x of [-0.36, 0.36]) box(lid, copper, x, 0.158, -0.27, 0.096, 0.079, 0.576);
    box(lid, copper, 0, 0.06, -0.56, 0.164, 0.172, 0.066);
    box(lid, deep, 0, 0.059, -0.597, 0.038, 0.052, 0.016);
    if (vault || id === 'reef') mesh(lid, jewel, prism, 0, 0.21, -0.271, 0.19, 0.142, 0.19);
    if (vault) group.scale.setScalar(1.24);
    const item = { group, lid, opened: false, working: false, seeded: false };
    chests.set(id, item);
    return item;
  }

  function lantern(id) {
    if (lanterns.has(id)) return lanterns.get(id);
    const group = new THREE.Group();
    root.add(group);
    box(group, stone, 0, 0.088, 0, 1.20, 0.177, 1.12);
    box(group, dusk, 0, 0.172, 0, 0.99, 0.233, 0.93);
    box(group, pale, 0, 0.49, 0, 0.64, 0.53, 0.60);
    box(group, copper, 0, 0.796, 0, 0.79, 0.114, 0.78);
    const lens = mesh(group, jewel, prism, 0, 1.079, 0, 0.49, 0.59, 0.51);
    for (const [x, z] of [[-0.31, -0.32], [0.31, -0.32], [-0.31, 0.32], [0.31, 0.32]]) {
      box(group, dusk, x, 1.09, z, 0.077, 0.51, 0.077);
    }
    box(group, dusk, 0, 1.353, 0, 0.86, 0.117, 0.88);
    box(group, stone, 0, 1.448, 0, 0.70, 0.15, 0.67);
    mesh(group, jewel, copper, 0, 1.563, 0, 0.236, 0.23, 0.24);
    const ray = mesh(group, beaconRay, rayMaterial, 0, 3.08, 0, 1, 1, 1);
    ray.visible = false;
    if (id === 'ridge') {
      group.scale.set(1.38, 1.38, 1.38);
      box(group, copper, 0, 0.809, 0, 0.99, 0.063, 0.99);
      box(group, copper, 0, 1.405, 0, 0.93, 0.052, 0.91);
    }
    const item = { group, lens, ray, lit: false };
    lanterns.set(id, item);
    return item;
  }

  return {
    place(type, id, spot, data) {
      if (type === 'keeper') {
        keeper.state({ ...spot, yaw: 2.36, grounded: true, moving: false }, true);
        return;
      }
      if (type === 'harbormaster') {
        harbormaster.state({ ...spot, yaw: 0.64, grounded: true, moving: false }, true);
        return;
      }
      if (type === 'bridge' || type === 'pass') return;
      if (type === 'sluice') { sluice.position.set(spot.x, spot.y, spot.z); return; }
      if (type === 'supply') { supply(id, data.kind).group.position.set(spot.x, spot.y, spot.z); return; }
      const item = type === 'chest' ? chest(id) : lantern(id);
      item.group.position.set(spot.x, spot.y, spot.z);
      if (type === 'chest') item.group.rotation.y = 0.19;
    },
    showChest(id, opened, working) {
      const item = chests.get(id);
      item.opened = opened;
      item.working = working;
      if (!item.seeded) {
        item.lid.rotation.x = opened ? 1.21 : 0;
        item.seeded = true;
      }
    },
    showLantern(id, lit) { lanterns.get(id).lit = lit; },
    showSupply(id, ready) { supplyPiles.get(id).goods.visible = ready; },
    water(active) { waterRunning = active; wetBeds.visible = active; },
    animate(time, dt) {
      keeper.animate(dt);
      harbormaster.animate(dt);
      wheel.rotation.z = waterRunning ? time * 0.57 : 0;
      const weight = 1 - Math.exp(-Math.min(dt, 0.13) * 9);
      for (const chest of chests.values()) {
        const angle = chest.opened ? 1.21 : chest.working ? Math.abs(Math.sin(time * 24)) * 0.065 : 0;
        chest.lid.rotation.x += (angle - chest.lid.rotation.x) * weight;
      }
      for (const lamp of lanterns.values()) {
        lamp.lens.material = lamp.lit ? glow : prism;
        lamp.ray.visible = lamp.lit;
        lamp.lens.rotation.y = time * (lamp.lit ? 0.92 : 0.23);
      }
    },
  };
}
