import * as THREE from 'three';
import { PLATE, STUD, TONES } from './bricks.js';
import { HULL_WIDTH, HULL_LENGTH, SEA_LEVEL } from './voyage.js';

function material(color, roughness = 0.54) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function createWorldObjects(scene, body) {
  const root = new THREE.Group();
  scene.add(root);
  const counters = new Map();
  const vessels = new Map();
  const pets = new Map();
  const oak = material(TONES.oak);
  const cedar = material(TONES.redwood);
  const dark = material(TONES.darkBark);
  const rope = material(TONES.cream);
  const jade = material('#78948b', 0.3);
  const kettleGlaze = material('#386561', 0.29);
  const cupGlaze = material('#e7cbb6', 0.27);
  const brew = material('#a0653b', 0.34);
  const porcelain = material('#d9d2ba', 0.24);
  const biscuit = material('#c4844e', 0.38);
  const caramel = material('#925536', 0.43);
  const puppyCream = material('#ffe1b2', 0.35);
  const puppyNose = material('#231f22', 0.22);
  const puppyTongue = material('#cc807b', 0.43);
  const gold = material('#e9b76b', 0.28);
  const shell = material('#496c53', 0.36);
  const shellPlate = material('#72946d', 0.39);
  const turtleSkin = material('#99af7d', 0.45);
  const rabbitFur = material('#d9c9dc', 0.42);
  const rabbitCream = material('#f4e7e6', 0.38);
  const sphere = new THREE.SphereGeometry(0.5, 14, 9);
  const ring = new THREE.TorusGeometry(0.155, 0.022, 7, 18);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.42, 1, 15);
  const liquid = new THREE.CylinderGeometry(0.49, 0.49, 1, 14);
  const spout = new THREE.CylinderGeometry(0.054, 0.1, 0.19, 10);
  const cupBowl = new THREE.LatheGeometry([new THREE.Vector2(0.062, -0.04), new THREE.Vector2(0.082, -0.03),
    new THREE.Vector2(0.109, 0.035), new THREE.Vector2(0.113, 0.048), new THREE.Vector2(0.1, 0.048),
    new THREE.Vector2(0.078, -0.009), new THREE.Vector2(0, -0.01)], 19);

  function mesh(parent, geometry, texture, x, y, z, w = 1, h = 1, d = 1) {
    const piece = new THREE.Mesh(geometry, texture);
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    piece.receiveShadow = true;
    parent.add(piece);
    return piece;
  }

  function box(parent, texture, x, y, z, w, h, d) {
    return mesh(parent, body, texture, x, y, z, w, h, d);
  }

  function newCounter(brick) {
    const group = new THREE.Group();
    const surface = material(TONES[brick.tone]);
    const top = brick.h * PLATE;
    box(group, dark, 0, 0.07, 0, 1.52, 0.11, 1.0);
    box(group, surface, 0, top * 0.46, 0, 1.54, top * 0.78, 1.02);
    box(group, oak, 0, top - 0.075, 0, 1.64, 0.15, 1.09);
    for (const x of [-0.46, 0, 0.46]) {
      box(group, cedar, x, top * 0.44, -0.515, 0.42, top * 0.62, 0.045);
      box(group, rope, x, top * 0.62, -0.549, 0.13, 0.031, 0.037);
    }
    box(group, dark, 0.08, top + 0.026, 0.018, 1.15, 0.049, 0.62);
    mesh(group, sphere, kettleGlaze, -0.265, top + 0.212, 0.018, 0.33, 0.255, 0.33);
    mesh(group, cylinder, jade, -0.265, top + 0.34, 0.018, 0.21, 0.06, 0.21);
    mesh(group, sphere, rope, -0.265, top + 0.39, 0.018, 0.079, 0.052, 0.079);
    mesh(group, ring, kettleGlaze, -0.265, top + 0.288, 0.02, 1, 1.12, 1);
    const nozzle = mesh(group, spout, jade, -0.072, top + 0.243, 0.018);
    nozzle.rotation.z = -1.17;
    const cups = [];
    for (const [x, z] of [[0.21, -0.15], [0.48, -0.083]]) {
      mesh(group, cylinder, porcelain, x, top + 0.051, z, 0.247, 0.035, 0.247);
      mesh(group, cupBowl, cupGlaze, x, top + 0.103, z);
      const fill = mesh(group, liquid, brew, x, top + 0.14, z, 0.172, 0.01, 0.172);
      fill.visible = false;
      cups.push(fill);
    }
    const steam = [];
    for (let i = 0; i < 3; i++) {
      const mist = new THREE.MeshBasicMaterial({ color: '#f5e4cc', transparent: true, opacity: 0, depthWrite: false });
      steam.push(mesh(group, sphere, mist, 0, 0, 0));
    }
    group.position.set((brick.x + brick.w / 2) * STUD, brick.y * PLATE, (brick.z + brick.d / 2) * STUD);
    group.rotation.y = -brick.turn * Math.PI / 2;
    root.add(group);
    return { brick, group, surface, steam, cups, top, brewing: -Infinity, serving: -Infinity };
  }

  function sync(world) {
    for (const [id, counter] of counters) {
      if (world.bricks.get(id) === counter.brick) continue;
      root.remove(counter.group);
      counter.surface.dispose();
      for (const plume of counter.steam) plume.material.dispose();
      counters.delete(id);
    }
    for (const brick of world.bricks.values()) if (brick.form === 'tea' && !counters.has(brick.id)) counters.set(brick.id, newCounter(brick));
  }

  function newVessel(code) {
    const group = new THREE.Group();
    const cells = Array.from(code, Number);
    const occupied = cells.flatMap((value, index) => value ? [index] : []);
    const xs = occupied.map(index => index % HULL_WIDTH);
    const zs = occupied.map(index => Math.floor(index / HULL_WIDTH));
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const scale = 0.37;
    function neighbor(x, z) {
      return x >= 0 && x < HULL_WIDTH && z >= 0 && z < HULL_LENGTH && cells[z * HULL_WIDTH + x];
    }
    for (const cell of occupied) {
      const cx = cell % HULL_WIDTH;
      const cz = Math.floor(cell / HULL_WIDTH);
      const x = (cx - centerX) * scale;
      const z = (cz - centerZ) * scale;
      const sealed = cells[cell] === 2;
      box(group, sealed ? dark : cedar, x, 0.115, z, scale - 0.009, 0.19, scale - 0.007);
      box(group, sealed ? jade : oak, x, 0.228, z, scale - 0.022, 0.052, scale - 0.017);
      if (sealed) {
        for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          if (neighbor(cx + dx, cz + dz)) continue;
          box(group, cedar, x + dx * 0.17, 0.323, z + dz * 0.17, dx ? 0.062 : scale, 0.146, dz ? 0.062 : scale);
        }
      }
    }
    const width = (Math.max(...xs) - Math.min(...xs) + 1) * scale;
    const length = (Math.max(...zs) - Math.min(...zs) + 1) * scale;
    if (width >= 0.7 && length >= 0.7) {
      const oar = new THREE.Group();
      oar.position.set(width * 0.53, 0.19, -length * 0.07);
      oar.rotation.set(0.15, 0.67, -0.18);
      box(oar, rope, 0.22, 0, 0, 0.51, 0.035, 0.04);
      box(oar, cedar, 0.52, 0, 0, 0.22, 0.025, 0.13);
      group.add(oar);
    }
    root.add(group);
    return { group, code, x: 0, z: 0, yaw: 0, placed: false };
  }

  function newPuppy(adopted) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    box(body, biscuit, 0, 0.255, 0.026, 0.342, 0.24, 0.48);
    box(body, puppyCream, 0, 0.235, -0.172, 0.324, 0.218, 0.112);
    box(body, caramel, 0.063, 0.366, 0.07, 0.175, 0.026, 0.188);

    const head = new THREE.Group();
    head.position.set(0, 0.411, -0.245);
    body.add(head);
    box(head, biscuit, 0, 0.04, 0.026, 0.386, 0.271, 0.295);
    box(head, puppyCream, 0, 0.057, -0.117, 0.102, 0.228, 0.028);
    box(head, puppyCream, 0, -0.025, -0.148, 0.26, 0.126, 0.146);
    box(head, puppyNose, 0, 0.019, -0.226, 0.117, 0.069, 0.062);
    box(head, puppyTongue, 0.034, -0.084, -0.202, 0.058, 0.041, 0.047);
    for (const side of [-1, 1]) {
      const ear = box(head, caramel, side * 0.197, 0.04, 0.001, 0.101, 0.235, 0.187);
      ear.rotation.z = side * 0.21;
      ear.rotation.x = 0.11;
      mesh(head, sphere, puppyNose, side * 0.111, 0.073, -0.127, 0.055, 0.077, 0.027);
      mesh(head, sphere, porcelain, side * 0.111 - 0.009, 0.09, -0.141, 0.021, 0.025, 0.01);
    }
    if (adopted) {
      box(body, jade, 0, 0.327, -0.157, 0.347, 0.052, 0.144);
      const tag = mesh(body, cylinder, gold, 0, 0.29, -0.232, 0.073, 0.02, 0.073);
      tag.rotation.x = Math.PI / 2;
    }

    const legs = [];
    for (const z of [-0.126, 0.183]) {
      for (const x of [-0.109, 0.109]) {
        const leg = new THREE.Group();
        leg.position.set(x, 0.184, z);
        box(leg, biscuit, 0, -0.066, 0, 0.112, 0.157, 0.114);
        box(leg, puppyCream, 0, -0.142, -0.017, 0.121, 0.082, 0.148);
        body.add(leg);
        legs.push(leg);
      }
    }

    const tail = new THREE.Group();
    tail.position.set(0, 0.295, 0.244);
    box(tail, caramel, 0, 0.067, 0.09, 0.087, 0.08, 0.217).rotation.x = -0.55;
    box(tail, biscuit, 0, 0.159, 0.154, 0.085, 0.135, 0.081).rotation.x = 0.12;
    box(tail, puppyCream, 0, 0.221, 0.133, 0.088, 0.063, 0.081);
    body.add(tail);
    return { group, body, head, legs, tail };
  }

  function newTurtle(adopted) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    const head = new THREE.Group();
    const tail = new THREE.Group();
    group.add(body);
    body.add(head, tail);
    box(body, puppyCream, 0, 0.124, 0.02, 0.40, 0.11, 0.48);
    mesh(body, sphere, shell, 0, 0.207, 0.038, 0.478, 0.27, 0.537);
    mesh(body, cylinder, shellPlate, 0, 0.34, 0.038, 0.151, 0.033, 0.151);
    for (const [x, z] of [[-0.132, 0.038], [0.132, 0.038], [-0.057, -0.106], [0.057, -0.106], [-0.057, 0.181], [0.057, 0.181]]) {
      mesh(body, cylinder, shellPlate, x, 0.301, z, 0.09, 0.027, 0.09);
    }
    head.position.set(0, 0.155, -0.245);
    box(head, turtleSkin, 0, 0.011, -0.055, 0.255, 0.193, 0.236);
    box(head, puppyCream, 0, -0.053, -0.089, 0.236, 0.044, 0.168);
    for (const x of [-0.081, 0.081]) {
      mesh(head, sphere, puppyNose, x, 0.043, -0.164, 0.044, 0.057, 0.029);
      mesh(head, sphere, porcelain, x - 0.006, 0.059, -0.172, 0.017, 0.018, 0.011);
    }
    if (adopted) box(head, jade, 0, -0.02, 0.055, 0.155, 0.087, 0.042);
    tail.position.z = 0.254;
    box(tail, turtleSkin, 0, 0.114, 0.058, 0.08, 0.081, 0.167).rotation.x = 0.16;
    const legs = [];
    for (const z of [-0.135, 0.17]) {
      for (const x of [-0.159, 0.159]) {
        const leg = new THREE.Group();
        leg.position.set(x, 0.09, z);
        box(leg, turtleSkin, Math.sign(x) * 0.027, -0.045, 0, 0.147, 0.088, 0.149);
        body.add(leg);
        legs.push(leg);
      }
    }
    return { group, body, head, tail, legs };
  }

  function newRabbit(adopted) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    const head = new THREE.Group();
    const tail = new THREE.Group();
    group.add(body);
    body.add(head, tail);
    box(body, rabbitFur, 0, 0.239, 0.051, 0.344, 0.33, 0.429);
    box(body, rabbitCream, 0, 0.219, -0.139, 0.288, 0.265, 0.105);
    head.position.set(0, 0.396, -0.185);
    box(head, rabbitFur, 0, 0.05, 0.012, 0.349, 0.278, 0.279);
    box(head, rabbitCream, 0, -0.045, -0.126, 0.236, 0.102, 0.097);
    box(head, puppyTongue, 0, 0.004, -0.18, 0.058, 0.035, 0.025);
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.102, 0.159, 0.022);
      ear.rotation.z = -side * 0.16;
      ear.rotation.x = side === -1 ? -0.12 : 0.17;
      box(ear, rabbitFur, 0, 0.147, 0, 0.116, 0.337, 0.095);
      box(ear, puppyTongue, 0, 0.166, -0.048, 0.069, 0.24, 0.025);
      head.add(ear);
      mesh(head, sphere, puppyNose, side * 0.099, 0.063, -0.13, 0.047, 0.061, 0.027);
      mesh(head, sphere, porcelain, side * 0.099 - 0.007, 0.077, -0.141, 0.017, 0.023, 0.009);
    }
    if (adopted) {
      const ribbon = box(head, jade, 0.08, 0.183, -0.026, 0.146, 0.043, 0.07);
      ribbon.rotation.z = -0.35;
    }
    mesh(tail, sphere, rabbitCream, 0, 0.226, 0.281, 0.142, 0.148, 0.138);
    const legs = [];
    for (const z of [-0.13, 0.161]) {
      for (const x of [-0.105, 0.105]) {
        const leg = new THREE.Group();
        leg.position.set(x, 0.136, z);
        box(leg, rabbitCream, 0, -0.075, -0.033, 0.117, 0.123, 0.193);
        body.add(leg);
        legs.push(leg);
      }
    }
    return { group, body, head, tail, legs };
  }

  return {
    sync,
    tea(id, action) {
      const station = counters.get(id);
      if (!station) return;
      if (action === 'brew') station.brewing = performance.now();
      else station.serving = performance.now();
    },
    vessel(key, data) {
      let current = vessels.get(key);
      if (current && (!data || current.code !== data.code)) {
        root.remove(current.group);
        vessels.delete(key);
        current = null;
      }
      if (!data) return;
      if (!current) {
        current = newVessel(data.code);
        vessels.set(key, current);
      }
      Object.assign(current, { x: data.x, z: data.z, yaw: data.yaw });
      if (!current.placed) {
        current.group.position.set(data.x, SEA_LEVEL, data.z);
        current.placed = true;
      }
    },
    pet(key, data) {
      let current = pets.get(key);
      if (!current && !data) return;
      if (data && current?.id !== data.id) {
        if (current) root.remove(current.group);
        const adopted = !key.startsWith('island-');
        const model = data.id === 'pip' ? newRabbit(adopted) : data.id === 'pebble' ? newTurtle(adopted) : newPuppy(adopted);
        current = { ...model, id: data.id, target: null, stride: 0, yaw: 0 };
        root.add(current.group);
        pets.set(key, current);
      }
      const { group } = current;
      if (data && (!current.target || Math.hypot(data.x - group.position.x, data.z - group.position.z) > 4)) {
        group.position.set(data.x, data.y, data.z);
        current.yaw = data.yaw;
      }
      current.target = data;
      group.visible = Boolean(data);
    },
    animate(time, dt) {
      const now = performance.now();
      for (const counter of counters.values()) {
        const steaming = now - counter.brewing < 5800;
        for (const [i, plume] of counter.steam.entries()) {
          const phase = (time * 0.62 + i / 3) % 1;
          plume.visible = steaming;
          if (!steaming) continue;
          plume.position.set(-0.25 + Math.sin(phase * 5 + i) * 0.069, counter.top + 0.39 + phase * 0.31, 0.018);
          plume.scale.setScalar(0.03 + phase * 0.077);
          plume.material.opacity = Math.sin(phase * Math.PI) * 0.27;
        }
        for (const cup of counter.cups) cup.visible = now - counter.serving < 4500;
      }
      for (const [key, vessel] of vessels) {
        const weight = key === 'local' ? 1 : 1 - Math.exp(-dt * 15);
        const { position, rotation } = vessel.group;
        position.x += (vessel.x - position.x) * weight;
        position.z += (vessel.z - position.z) * weight;
        position.y = SEA_LEVEL + 0.024 * Math.sin(time * 3.4);
        rotation.set(Math.sin(time * 2.8) * 0.024, vessel.yaw, Math.cos(time * 2.6) * 0.017);
      }
      for (const [key, pet] of pets) {
        const { group, body, head, legs, tail, target, id } = pet;
        if (!target) continue;
        const weight = 1 - Math.exp(-Math.min(0.1, dt) * 16);
        const advance = key === 'friend' && !target.aboard ? weight : 1;
        group.position.x += (target.x - group.position.x) * advance;
        group.position.y += (target.y - group.position.y) * advance;
        group.position.z += (target.z - group.position.z) * advance;
        const turn = target.yaw - pet.yaw;
        pet.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * weight;
        group.rotation.y = pet.yaw;
        pet.stride += (Number(target.moving) - pet.stride) * weight;
        const island = key.startsWith('island-');
        const swing = Math.sin(time * (id === 'pip' ? 11 : 16)) * pet.stride;
        for (const [i, leg] of legs.entries()) {
          const phase = id === 'pip' ? i < 2 : i === 0 || i === 3;
          leg.rotation.x = swing * (phase ? 0.49 : -0.49);
        }
        body.position.y = Math.abs(swing) * (id === 'pip' ? 0.16 : 0.035) + (target.aboard ? Math.sin(time * 3.4) * 0.024 : 0);
        tail.rotation.y = Math.sin(time * (island ? 4 : 8.6)) * (id === 'mochi' ? 0.51 : 0.12);
        head.rotation.z = Math.sin(time * 1.5) * (island ? 0.13 : 0.05);
      }
    },
  };
}
