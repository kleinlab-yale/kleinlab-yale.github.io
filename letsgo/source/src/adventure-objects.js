import * as THREE from 'three';
import { DEFAULT_LOOK } from './appearance.js';
import { createTraveler } from './traveler.js';
import { PLATE, STUD } from './bricks.js';
import { GARDEN_CHANNELS } from './mainland-data.js';
import { CHANNEL_BUOYS, SEA_LEVEL } from './voyage.js';

export function createAdventureObjects(scene, brick, world, makeShip) {
  const root = new THREE.Group();
  scene.add(root);
  const residents = new Map();
  const yards = new Map();
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
  const braid = new THREE.TorusGeometry(0.115, 0.024, 6, 14);
  const linen = material('#d9c6a5');
  const cherry = material('#ac6f78');
  const buoyRed = material('#9c4a43');
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

  const channelBuoys = CHANNEL_BUOYS.map(({ x, z }) => {
    const buoy = new THREE.Group();
    buoy.position.set(x, SEA_LEVEL, z);
    mesh(buoy, log, buoyRed, 0, 0.08, 0, 0.56, 0.27, 0.56);
    mesh(buoy, log, stone, 0, 0.21, 0, 0.45, 0.11, 0.45);
    box(buoy, copper, 0, 0.45, 0, 0.08, 0.49, 0.08);
    box(buoy, glow, 0, 0.73, 0, 0.19, 0.21, 0.19);
    mesh(buoy, jewel, buoyRed, 0, 0.91, 0, 0.30, 0.17, 0.30);
    root.add(buoy);
    return buoy;
  });

  function traveler(data) {
    const model = createTraveler(scene, brick, true, world);
    model.appearance({ ...DEFAULT_LOOK, ...data.look });
    const hand = model.hand;
    switch (data.cargo) {
      case 'seedling':
        mesh(hand, log, wood, 0, -0.047, -0.085, 0.22, 0.16, 0.22);
        box(hand, cane, 0, 0.057, -0.085, 0.038, 0.22, 0.041);
        box(hand, cane, -0.051, 0.09, -0.075, 0.108, 0.055, 0.085).rotation.z = 0.41;
        mesh(hand, jewel, cherry, 0.04, 0.159, -0.087, 0.104, 0.091, 0.1);
        break;
      case 'tea':
        box(hand, wood, 0.01, -0.076, -0.067, 0.29, 0.143, 0.21);
        box(hand, fiber, 0.01, -0.008, -0.067, 0.31, 0.043, 0.23);
        mesh(hand, log, linen, 0.08, 0.046, -0.074, 0.089, 0.102, 0.089);
        break;
      case 'rope':
        mesh(hand, braid, fiber, 0, -0.055, -0.085, 1.18, 1.39, 0.94);
        mesh(hand, braid, fiber, 0.011, -0.055, -0.113, 1.09, 1.34, 0.89);
        break;
      case 'mallet':
        box(hand, deep, 0.01, 0.045, -0.085, 0.048, 0.31, 0.053).rotation.z = -0.16;
        box(hand, copper, 0.033, 0.206, -0.085, 0.205, 0.095, 0.105);
        break;
      case 'canvas':
        mesh(hand, log, linen, 0, -0.051, -0.04, 0.17, 0.47, 0.17).rotation.z = 0.72;
        mesh(hand, log, cherry, 0, -0.051, -0.04, 0.178, 0.075, 0.178).rotation.z = 0.72;
        break;
      default:
        box(hand, dusk, 0.018, -0.034, -0.096, 0.192, 0.23, 0.068).rotation.z = -0.19;
        box(hand, pale, 0.027, -0.022, -0.088, 0.173, 0.213, 0.055).rotation.z = -0.19;
    }
    return model;
  }

  function shipyard(id, spot, data) {
    let site = yards.get(id);
    if (!site) {
      const bench = new THREE.Group();
      const ship = makeShip(id);
      box(bench, deep, 0.29, 0.14, 0.52, 0.16, 0.28, 0.34);
      box(bench, deep, 0.83, 0.14, 0.52, 0.16, 0.28, 0.34);
      box(bench, wood, 0.57, 0.30, 0.52, 0.82, 0.12, 0.49);
      box(bench, linen, 0.54, 0.368, 0.51, 0.37, 0.021, 0.32).rotation.y = 0.2;
      box(bench, glow, 0.85, 0.51, 0.55, 0.114, 0.19, 0.114);
      box(bench, copper, 0.85, 0.62, 0.55, 0.152, 0.057, 0.16);
      root.add(bench, ship.group);
      site = { bench, ship };
      yards.set(id, site);
    }
    site.bench.position.set(spot.x, spot.y, spot.z);
    site.ship.group.position.set(data.mooring.x * STUD, SEA_LEVEL, data.mooring.z * STUD);
    site.ship.group.rotation.y = data.mooring.yaw;
  }

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
      if (type === 'shipyard') { shipyard(id, spot, data); return; }
      if (type === 'bridge' || type === 'pass') return;
      if (type === 'sluice') { sluice.position.set(spot.x, spot.y, spot.z); return; }
      if (type === 'supply') { supply(id, data.kind).group.position.set(spot.x, spot.y, spot.z); return; }
      const item = type === 'chest' ? chest(id) : lantern(id);
      item.group.position.set(spot.x, spot.y, spot.z);
      if (type === 'chest') item.group.rotation.y = 0.19;
    },
    resident(id, data, pose) {
      if (pose && !residents.has(id)) residents.set(id, traveler(data));
      residents.get(id)?.state(pose, true);
    },
    shipStage(id, stage) {
      const site = yards.get(id);
      const finished = site.ship.stage(stage);
      const wreck = id === 'sloop' && !finished;
      site.ship.group.rotation.z = wreck ? 0.25 - stage * 0.072 : 0;
      site.ship.group.position.y = SEA_LEVEL - (wreck ? 0.59 - stage * 0.153 : 0);
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
      for (const resident of residents.values()) resident.animate(dt, time);
      for (const [index, buoy] of channelBuoys.entries()) buoy.position.y = SEA_LEVEL + Math.sin(time * 2.7 + index) * 0.07;
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
