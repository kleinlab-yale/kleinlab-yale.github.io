import * as THREE from 'three';
import { PLATE, STUD, TONES, sameBrick } from './bricks.js';
import { PLACEABLE_OBJECTS } from './parts.js';
import { isChristmasPiece } from './christmas.js';
import { createChristmasModels } from './christmas-models.js';
import { decorationPose, treeDecorationKind } from './tree-decorations.js';

export function createHouseObjects(scene, brickGeometry) {
  const placed = new Map();
  let moving = null;
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
  const treeBounds = new THREE.Box3();
  const ornamentBounds = new THREE.Sphere();
  const intersection = new THREE.Vector3();
  const normal = new THREE.Vector3();

  function mesh(group, surface, x, y, z, w, h, d, geometry = brickGeometry) {
    const piece = new THREE.Mesh(geometry, surface);
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    piece.receiveShadow = true;
    group.add(piece);
    return piece;
  }
  const makeChristmas = createChristmasModels(mesh, paint);

  function position(group, { w, d }, { x, y, z }) {
    group.position.set((x + w / 2) * STUD, y * PLATE, (z + d / 2) * STUD);
  }

  function makeDoor(group, tone, height, width) {
    const opening = width - 0.24;
    const double = width >= 4 * STUD;
    const panelWidth = opening / (double ? 2 : 1) - 0.016;
    for (const sign of [-1, 1]) mesh(group, paint('beam'), sign * (width / 2 - 0.059), height / 2, 0, 0.11, height, 0.43);
    mesh(group, paint('beam'), 0, height - 0.045, 0, width - 0.02, 0.09, 0.43);
    const panels = [];
    for (const hinge of double ? [-1, 1] : [-1]) {
      const panel = new THREE.Group();
      const inward = -hinge;
      panel.position.x = hinge * opening / 2;
      group.add(panel);
      mesh(panel, tone, inward * panelWidth / 2, height * 0.477, 0, panelWidth, height * 0.91, 0.137);
      for (const row of [0.35, 0.69]) {
        for (const face of [-1, 1]) mesh(panel, paint('redwood'), inward * panelWidth / 2, height * row, face * 0.073, panelWidth - 0.105, 0.085, 0.032);
      }
      for (const face of [-1, 1]) {
        mesh(panel, paint('gold'), inward * (panelWidth - 0.125), height * 0.5, face * 0.101, 0.09, 0.09, 0.081);
        mesh(panel, paint('gold'), inward * 0.094, height * 0.31, face * 0.08, 0.133, 0.06, 0.039);
      }
      panels.push({ panel, openAngle: hinge * Math.PI / 2 });
    }
    return panels;
  }

  function makeWindow(group, tone, height, width) {
    const frame = Math.min(0.14, width * 0.18, height * 0.22);
    mesh(group, glass, 0, height / 2, 0, width - frame, height - frame, 0.075);
    for (const sign of [-1, 1]) mesh(group, tone, sign * (width - frame) / 2, height / 2, 0, frame, height, 0.27);
    for (const y of [frame / 2, height - frame / 2]) mesh(group, tone, 0, y, 0, width, frame, 0.28);
    mesh(group, tone, 0, height / 2, 0, 0.056, height, 0.155);
    if (height >= 0.68) mesh(group, tone, 0, height / 2, 0, width, 0.053, 0.154);
    mesh(group, paint('chalk'), 0, frame * 0.33, 0, width, frame * 0.66, 0.48);
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

  function create(brick, tree) {
    const group = new THREE.Group();
    const area = tree ? decorationPose(tree, brick) : brick;
    const turned = !tree && brick.turn % 2 === 1;
    const w = turned ? area.d : area.w;
    const d = turned ? area.w : area.d;
    const { h } = area;
    const tone = paint(brick.tone);
    let door = null;
    let light = null;
    let bell = null;
    let christmas = null;
    if (isChristmasPiece(brick)) christmas = makeChristmas(group, brick, { w, d, h });
    else if (brick.form === 'door') door = makeDoor(group, tone, h * PLATE, w * STUD);
    else if (brick.form === 'window') makeWindow(group, tone, h * PLATE, w * STUD);
    else {
      const [width, depth, height] = PLACEABLE_OBJECTS[brick.form].size;
      group.scale.set(w / width, h / height, d / depth);
      switch (brick.form) {
        case 'lamp':
        case 'beacon': light = makeLantern(group, brick.form, tone, height * PLATE); break;
        case 'windbell': bell = makeBell(group, tone, height * PLATE); break;
        default: makeFurniture(group, brick.form, tone, height * PLATE, width * STUD, depth * STUD);
      }
    }
    position(group, area, area);
    group.rotation.y = tree ? area.yaw : -brick.turn * Math.PI / 2;
    if (door && brick.active) for (const { panel, openAngle } of door) panel.rotation.y = openAngle;
    scene.add(group);
    return { brick, tree, area, group, door, light, bell, christmas, swing: 0 };
  }

  return {
    movePreview(brick, destination, world) {
      const item = brick && destination ? placed.get(brick.id) : null;
      if (moving && moving.item !== item) {
        for (const part of moving.parts) position(part.group, part.area, part.area);
        moving = null;
      }
      if (!item) return;
      moving ??= { item, parts: [item, ...Array.from(world.decorationsOf(brick.id), child => placed.get(child.id)).filter(Boolean)] };
      const dx = destination.x - brick.x, dy = destination.y - brick.y, dz = destination.z - brick.z;
      for (const part of moving.parts) {
        const { x, y, z } = part.area;
        position(part.group, part.area, { x: x + dx, y: y + dy, z: z + dz });
      }
    },
    pickTree(world, tree, raycaster, distance, ignoredIds) {
      treeBounds.min.set((tree.x - 1) * STUD, tree.y * PLATE, (tree.z - 1) * STUD);
      treeBounds.max.set((tree.x + tree.w + 1) * STUD, (tree.y + tree.h * 1.06) * PLATE, (tree.z + tree.d + 1) * STUD);
      if (!raycaster.ray.intersectsBox(treeBounds)) return null;
      let best = null;
      for (const brick of [...world.decorationsOf(tree.id), tree]) {
        if (ignoredIds?.has(brick.id)) continue;
        const item = placed.get(brick.id);
        if (!item) continue;
        const surface = raycaster.intersectObject(item.group, true)[0];
        let point = surface?.point;
        let depth = surface?.distance ?? Infinity;
        normal.copy(surface?.face?.normal ?? raycaster.ray.direction);
        if (surface?.face) normal.transformDirection(surface.object.matrixWorld);
        else normal.negate();
        const kind = brick.treeId === undefined ? null : treeDecorationKind(brick.form);
        if (kind === 'branch' || kind === 'top') {
          const { x, y, z, w, d, h } = item.area;
          ornamentBounds.center.set((x + w / 2) * STUD, (y + h * 0.43) * PLATE, (z + d / 2) * STUD);
          ornamentBounds.radius = Math.max(0.075, Math.min(w * STUD * 0.31, h * PLATE * 0.49));
          const near = raycaster.ray.intersectSphere(ornamentBounds, intersection);
          if (near && near.distanceTo(raycaster.ray.origin) < depth) {
            point = near.clone();
            depth = near.distanceTo(raycaster.ray.origin);
            normal.copy(near).sub(ornamentBounds.center);
          }
        }
        if (!point || depth >= distance) continue;
        const axis = Math.abs(normal.y) > Math.max(Math.abs(normal.x), Math.abs(normal.z)) ? 'y' :
          Math.abs(normal.x) > Math.abs(normal.z) ? 'x' : 'z';
        distance = depth;
        best = { brick, point, axis, distance, sign: Math.sign(normal[axis]) || 1 };
      }
      return best;
    },
    sync(world) {
      for (const [id, item] of placed) {
        const brick = world.bricks.get(id);
        const tree = brick?.treeId === undefined ? undefined : world.bricks.get(brick.treeId);
        if (sameBrick(item.brick, brick, false) && sameBrick(item.tree, tree, false)) {
          if (item.bell && item.brick.active !== brick.active) item.swing = 1.2;
          item.brick = brick;
          item.tree = tree;
          continue;
        }
        scene.remove(item.group);
        item.group.traverse(piece => { if (piece.isInstancedMesh) piece.dispose(); });
        placed.delete(id);
      }
      for (const brick of world.bricks.values()) {
        if (brick.form === 'tea' || !Object.hasOwn(PLACEABLE_OBJECTS, brick.form) || placed.has(brick.id)) continue;
        const tree = brick.treeId === undefined ? undefined : world.bricks.get(brick.treeId);
        placed.set(brick.id, create(brick, tree));
      }
    },
    animate(dt, reducedMotion, time) {
      const weight = reducedMotion ? 1 : 1 - Math.exp(-dt * 13);
      for (const item of placed.values()) {
        const { brick, tree, door, light, bell, christmas } = item;
        christmas?.(tree ? tree.active : brick.active, weight, reducedMotion ? 0 : time);
        if (door) for (const { panel, openAngle } of door) panel.rotation.y += ((brick.active ? openAngle : 0) - panel.rotation.y) * weight;
        if (light) light.material = brick.active ? amber : dim;
        if (bell && item.swing > 0) {
          item.swing = Math.max(0, item.swing - dt);
          bell.rotation.z = reducedMotion ? 0 : Math.sin((1.2 - item.swing) * 20) * item.swing * 0.17;
        }
      }
    },
  };
}
