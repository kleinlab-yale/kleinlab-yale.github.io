import * as THREE from 'three';
import { BOUNDS, MAX_PATCH, PLATE, STUD, TONES } from './bricks.js';
import { dressScene } from './landscape.js';
import { noise } from './valley.js';
import { EYE } from './player.js';
import { appearancePreview, createTraveler } from './traveler.js';
import { createWorldObjects } from './world-objects.js';

const CHUNK = 18;
const GAP = 0.018;
const STUD_HEIGHT = 0.062;
const lights = new Set(['paper', 'amber']);
const bloom = new Set(['petal', 'rose', 'blush', 'ivory', 'wine']);
const colorByTone = Object.fromEntries(Object.entries(TONES).map(([name, hex]) => [name, new THREE.Color(hex)]));

function chamferBox() {
  const vertices = [];
  const normals = [];
  const inner = 0.473;
  const outer = 0.5;
  function face(verticesInFace, normal) {
    const [a, b, c] = verticesInFace.map(p => new THREE.Vector3(...p));
    const n = new THREE.Vector3(...normal).normalize();
    if (b.sub(a).cross(c.sub(a)).dot(n) < 0) verticesInFace.reverse();
    for (let i = 1; i < verticesInFace.length - 1; i++) {
      for (const corner of [verticesInFace[0], verticesInFace[i], verticesInFace[i + 1]]) {
        vertices.push(...corner);
        normals.push(n.x, n.y, n.z);
      }
    }
  }
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    for (const sign of [-1, 1]) {
      const normal = [0, 0, 0];
      normal[a] = sign;
      face([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sb, sc]) => {
        const p = [0, 0, 0];
        p[a] = sign * outer;
        p[b] = sb * inner;
        p[c] = sc * inner;
        return p;
      }), normal);
      for (const sb of [-1, 1]) {
        const bevelNormal = [...normal];
        bevelNormal[b] = sb;
        face([[outer, inner, -1], [inner, outer, -1], [inner, outer, 1], [outer, inner, 1]].map(([pa, pb, sc]) => {
          const p = [0, 0, 0];
          p[a] = sign * pa;
          p[b] = sb * pb;
          p[c] = sc * inner;
          return p;
        }), bevelNormal);
      }
    }
  }
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        face([[x * outer, y * inner, z * inner], [x * inner, y * outer, z * inner], [x * inner, y * inner, z * outer]], [x, y, z]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function fullyCovered(world, x, z, from, to) {
  let covered = from;
  while (covered < to) {
    let next = covered;
    for (const neighbor of world.at(x, z)) {
      if (neighbor.y <= covered && neighbor.y + neighbor.h > next) next = neighbor.y + neighbor.h;
    }
    if (next === covered) return false;
    covered = next;
  }
  return true;
}

function exposedFaces(world, brick, callback) {
  const { x, y, z, w, h, d } = brick;
  const top = y + h;
  let exposed = false;
  for (let b = z; b < z + d; b++) {
    for (let a = x; a < x + w; a++) {
      if (!fullyCovered(world, a, b, top, top + 1)) {
        if (brick.studs) callback(a, b, top);
        exposed = true;
      }
    }
  }
  if (exposed) return true;
  for (let a = x; a < x + w; a++) {
    if (!fullyCovered(world, a, z - 1, y, top) || !fullyCovered(world, a, z + d, y, top)) return true;
  }
  for (let b = z; b < z + d; b++) {
    if (!fullyCovered(world, x - 1, b, y, top) || !fullyCovered(world, x + w, b, y, top)) return true;
  }
  if (y <= -8) return false;
  for (let b = z; b < z + d; b++) {
    for (let a = x; a < x + w; a++) {
      if (!fullyCovered(world, a, b, y - 1, y)) return true;
    }
  }
  return false;
}

function dimensions(object, brick, gap = GAP) {
  object.position.set((brick.x + brick.w / 2) * STUD, (brick.y + brick.h / 2) * PLATE, (brick.z + brick.d / 2) * STUD);
  object.scale.set(brick.w * STUD - gap, brick.h * PLATE - gap * 0.68, brick.d * STUD - gap);
  object.updateMatrix();
}

function brickSurface(material) {
  const surface = material.clone();
  surface.onBeforeCompile = shader => {
    const varyings = 'varying vec3 vBrickWorld; varying float vBrickTop, vBrickY;';
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${varyings}`)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec4 brickPoint = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          brickPoint = instanceMatrix * brickPoint;
        #endif
        vBrickWorld = (modelMatrix * brickPoint).xyz;
        vBrickTop = normal.y;
        vBrickY = position.y;
      `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${varyings}`)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        float radius = length(fract(vBrickWorld.xz / 0.55) - 0.5);
        float rim = smoothstep(0.234, 0.273, radius) * (1.0 - smoothstep(0.282, 0.368, radius));
        float contact = rim * smoothstep(0.82, 0.99, vBrickTop) * 0.38;
        float underside = (1.0 - smoothstep(-0.5, 0.13, vBrickY)) * (1.0 - abs(vBrickTop)) * 0.1;
        diffuseColor.rgb *= 1.0 - contact - underside;
      `);
  };
  return surface;
}

function blossomGeometry() {
  const outline = new THREE.Shape();
  for (let i = 0; i <= 35; i++) {
    const angle = Math.PI * 2 * i / 35;
    const radius = 0.131 + Math.cos(angle * 5) * 0.033 - Math.cos(angle * 10) * 0.012;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) outline.moveTo(x, y);
    else outline.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.023, bevelThickness: 0.009, bevelSize: 0.011, bevelSegments: 1 });
  return geometry.rotateX(-Math.PI / 2);
}

function brickMeshes(scene, world, bodyGeometry, lowPower) {
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.035, envMapIntensity: 0.83 });
  const bodyMaterial = brickSurface(baseMaterial);
  const lanternMaterial = new THREE.MeshStandardMaterial({ color: 0xffd798, emissive: 0xffaa56, emissiveIntensity: 0.54, roughness: 0.53 });
  const studGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0.154, -0.031), new THREE.Vector2(0.154, 0.012),
    new THREE.Vector2(0.137, 0.031), new THREE.Vector2(0, 0.031),
  ], lowPower ? 11 : 16);
  const flowerGeometry = blossomGeometry();
  const pillarGeometry = new THREE.CylinderGeometry(0.48, 0.50, 1, 18);
  const group = new THREE.Group();
  scene.add(group);
  const meshByChunk = new Map();
  const dirty = new Set();
  const object = new THREE.Object3D();
  const brickColor = new THREE.Color();

  function batch(geometry, material, count, shadow) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    return mesh;
  }

  function markAll() {
    for (let z = Math.floor(BOUNDS.minZ / CHUNK); z < Math.ceil(BOUNDS.maxZ / CHUNK); z++) {
      for (let x = Math.floor(BOUNDS.minX / CHUNK); x < Math.ceil(BOUNDS.maxX / CHUNK); x++) dirty.add(`${x},${z}`);
    }
  }

  function rebuild(key) {
    const [x0, z0] = key.split(',').map(n => Number(n) * CHUNK);
    const old = meshByChunk.get(key);
    if (old) {
      for (const mesh of old) {
        group.remove(mesh);
        mesh.dispose();
      }
      meshByChunk.delete(key);
    }
    const solids = [];
    const pillars = [];
    const studs = [];
    const flowers = [];
    const glowing = [];
    for (const brick of world.query(x0, x0 + CHUNK, z0, z0 + CHUNK)) {
      if (brick.x < x0 || brick.z < z0 || brick.form === 'tea') continue;
      const visible = exposedFaces(world, brick, (x, z, y) => {
        studs.push({ x, z, y, brick });
        if (brick.form === 'flower' || (bloom.has(brick.tone) && noise(x, y + 31, z) > (y < 8 ? 0.45 : 0.935))) flowers.push({ x, z, y, brick });
      });
      if (visible) (brick.form === 'round' ? pillars : lights.has(brick.tone) ? glowing : solids).push(brick);
    }
    const meshes = [];
    for (const [bricks, material, geometry] of [[solids, bodyMaterial, bodyGeometry], [glowing, lanternMaterial, bodyGeometry], [pillars, bodyMaterial, pillarGeometry]]) {
      if (!bricks.length) continue;
      const mesh = batch(geometry, material, bricks.length, material === bodyMaterial);
      for (const [index, brick] of bricks.entries()) {
        dimensions(object, brick);
        mesh.setMatrixAt(index, object.matrix);
        if (material === bodyMaterial) {
          brickColor.copy(colorByTone[brick.tone]).multiplyScalar(0.92 + noise(brick.x, brick.y, brick.z) * 0.16);
          mesh.setColorAt(index, brickColor);
        }
      }
      meshes.push(mesh);
    }
    if (flowers.length) {
      const mesh = batch(flowerGeometry, baseMaterial, flowers.length, false);
      for (const [index, { x, y, z, brick }] of flowers.entries()) {
        const seed = noise(x, y, z);
        object.position.set((x + 0.5) * STUD, y * PLATE + STUD_HEIGHT - 0.004, (z + 0.5) * STUD);
        object.rotation.set(0, seed * 6.28 + (brick.form === 'flower' ? brick.turn * Math.PI / 2 : 0), 0);
        object.scale.setScalar(0.82 + seed * 0.42);
        object.updateMatrix();
        mesh.setMatrixAt(index, object.matrix);
        mesh.setColorAt(index, colorByTone[brick.tone === 'ivory' ? 'rose' : 'ivory']);
      }
      object.rotation.set(0, 0, 0);
      meshes.push(mesh);
    }
    if (studs.length) {
      const mesh = batch(studGeometry, baseMaterial, studs.length, false);
      object.scale.setScalar(1);
      for (const [index, { x, y, z, brick }] of studs.entries()) {
        object.position.set((x + 0.5) * STUD, y * PLATE + STUD_HEIGHT * 0.39, (z + 0.5) * STUD);
        object.updateMatrix();
        mesh.setMatrixAt(index, object.matrix);
        brickColor.copy(colorByTone[brick.tone]).multiplyScalar(0.94 + noise(brick.x, brick.y, brick.z) * 0.16);
        mesh.setColorAt(index, brickColor);
      }
      meshes.push(mesh);
    }
    if (meshes.length) {
      meshByChunk.set(key, meshes);
      group.add(...meshes);
    }
  }

  markAll();
  return {
    studGeometry,
    dirty(brick) {
      if (!brick) return markAll();
      for (let z = Math.floor((brick.z - 8) / CHUNK); z <= Math.floor((brick.z + brick.d + 1) / CHUNK); z++) {
        for (let x = Math.floor((brick.x - 8) / CHUNK); x <= Math.floor((brick.x + brick.w + 1) / CHUNK); x++) dirty.add(`${x},${z}`);
      }
    },
    update() {
      if (!dirty.size) return false;
      for (const key of dirty) rebuild(key);
      dirty.clear();
      return true;
    },
  };
}

function indicators(scene, body, studGeometry) {
  const target = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: '#ffdfc3', transparent: true, opacity: 0.78 }));
  const previewMaterial = new THREE.MeshBasicMaterial({ color: '#bcebd6', transparent: true, opacity: 0.2, depthWrite: false });
  const preview = new THREE.Group();
  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#bcebd6', transparent: true, opacity: 0.73 });
  const shapes = Array.from({ length: MAX_PATCH }, () => {
    const box = new THREE.Mesh(body, previewMaterial);
    const outline = new THREE.LineSegments(target.geometry, outlineMaterial);
    preview.add(box, outline);
    return { box, outline };
  });
  const studs = new THREE.InstancedMesh(studGeometry, previewMaterial, MAX_PATCH * 64);
  studs.frustumCulled = false;
  preview.add(studs);
  preview.visible = false;
  target.visible = false;
  scene.add(target, preview);
  const matrix = new THREE.Matrix4();
  let lastTarget = null;
  let lastPlacement = '';
  return (hit, placement, allowed, mode) => {
    target.visible = Boolean(hit);
    preview.visible = Boolean(placement);
    target.material.color.set(mode === 'remove' ? '#ffb9a5' : '#ffdfc3');
    if (hit && lastTarget !== hit.brick) {
      dimensions(target, hit.brick, -0.014);
      lastTarget = hit.brick;
    }
    if (!placement) return;
    const key = placement.blocks.map(b => `${b.x},${b.y},${b.z},${b.w},${b.d},${b.h},${b.studs}`).join('/') + allowed;
    if (lastPlacement === key) return;
    lastPlacement = key;
    let i = 0;
    for (const [index, { box, outline }] of shapes.entries()) {
      const brick = placement.blocks[index];
      box.visible = outline.visible = Boolean(brick);
      if (!brick) continue;
      dimensions(box, brick);
      dimensions(outline, brick, -0.009);
      if (!brick.studs) continue;
      for (let z = 0; z < brick.d; z++) {
        for (let x = 0; x < brick.w; x++) {
          matrix.makeTranslation((brick.x + x + 0.5) * STUD, (brick.y + brick.h) * PLATE + STUD_HEIGHT * 0.4, (brick.z + z + 0.5) * STUD);
          studs.setMatrixAt(i++, matrix);
        }
      }
    }
    studs.count = i;
    studs.instanceMatrix.needsUpdate = true;
    previewMaterial.color.set(allowed ? '#bcebd6' : '#f39d8a');
    previewMaterial.opacity = allowed ? 0.23 : 0.14;
    outlineMaterial.color.copy(previewMaterial.color);
  };
}

export function createGraphics(canvas, world) {
  const lowPower = matchMedia('(pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d2becb');
  const camera = new THREE.PerspectiveCamera(52, 1, 0.055, 260);
  camera.rotation.order = 'YXZ';
  const scenery = dressScene(scene, renderer, lowPower);
  const body = chamferBox();
  const objects = createWorldObjects(scene, body);
  const meshes = brickMeshes(scene, world, body, lowPower);
  const aim = indicators(scene, body, meshes.studGeometry);
  const traveler = createTraveler(scene, body);
  const local = createTraveler(scene, body);
  const focus = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let followDistance = 0;
  let lastView = null;
  let firstFrame = true;
  let scale = Math.min(lowPower ? 1.35 : 1.75, window.devicePixelRatio);
  let slowFrames = 0;

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(scale);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    scenery.refresh();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    aim,
    traveler,
    local,
    vessel: objects.vessel,
    puppy: objects.puppy,
    tea: objects.tea,
    preview(canvas) { return appearancePreview(canvas, body); },
    dirty(brick) { meshes.dirty(brick); },
    overview(time) {
      local.state(null);
      lastView = null;
      const drift = reduceMotion ? 0 : Math.sin(time * 0.083) * 0.8;
      const portrait = camera.aspect < 0.85;
      camera.fov = portrait ? 59 : 47;
      camera.position.set(-19 + drift, portrait ? 17 : 14.5, portrait ? 39 : 36.0);
      focus.set(portrait ? 5 : -3.6, portrait ? 6.2 : 4.4, portrait ? -7 : -5.5);
      camera.lookAt(focus);
      camera.updateProjectionMatrix();
    },
    playerView(player, view, orbit, bob, dt) {
      const portrait = camera.aspect < 0.85;
      const fov = view.fov ? view.fov + (portrait ? 8 : 0) : (portrait ? 76 : 68);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      eye.set(player.x, player.y + EYE, player.z);
      if (view.distance) {
        const cosPitch = Math.cos(orbit.pitch);
        direction.set(-Math.sin(orbit.yaw) * cosPitch, Math.sin(orbit.pitch), -Math.cos(orbit.yaw) * cosPitch);
        const shoulder = view.shoulder * (portrait ? 0.72 : 1);
        offset.copy(direction).multiplyScalar(-view.distance);
        offset.x += Math.cos(orbit.yaw) * shoulder;
        offset.z -= Math.sin(orbit.yaw) * shoulder;
        offset.y += view.height;
        const desired = offset.length();
        offset.divideScalar(desired);
        const obstruction = world.pick(eye, offset, desired);
        const clear = obstruction ? Math.max(0.06, obstruction.distance - 0.24) : desired;
        if (view !== lastView || clear < followDistance) followDistance = clear;
        else followDistance += (clear - followDistance) * (1 - Math.exp(-dt * 10));
        camera.position.copy(eye).addScaledVector(offset, followDistance);
        focus.copy(eye).addScaledVector(direction, 6.4);
        camera.lookAt(focus);
        local.state(followDistance > 1.05 ? player : null, true);
      } else {
        camera.position.copy(eye);
        camera.position.y += bob;
        camera.rotation.set(orbit.pitch, orbit.yaw, 0);
        local.state(null);
      }
      camera.updateMatrixWorld();
      lastView = view;
    },
    pick(point, distance) {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(2 * (point.x - bounds.left) / bounds.width - 1, 1 - 2 * (point.y - bounds.top) / bounds.height);
      raycaster.setFromCamera(pointer, camera);
      return world.pick(raycaster.ray.origin, raycaster.ray.direction, distance);
    },
    render(time, dt) {
      if (meshes.update() || firstFrame) {
        objects.sync(world);
        renderer.shadowMap.needsUpdate = true;
        scenery.refresh();
        firstFrame = false;
      }
      if (dt > 0.038 && dt < 0.22) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 2);
      if (slowFrames > 70 && scale > 0.77) {
        scale = Math.max(0.75, scale - 0.17);
        slowFrames = 0;
        resize();
      }
      scenery.update(reduceMotion ? 0 : time);
      traveler.animate(dt);
      local.animate(dt);
      objects.animate(reduceMotion ? 0 : time, dt);
      renderer.render(scene, camera);
    },
  };
}
