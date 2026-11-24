import * as THREE from 'three';
import { DEFAULT_LOOK, OUTFITS } from './appearance.js';
import { createFace } from './face.js';
import { createAccessories, createClothes, createHair } from './wardrobe.js';

export function createTraveler(scene, body, withShadow = true) {
  const figure = new THREE.Group();
  const material = (color, roughness = 0.54) => new THREE.MeshStandardMaterial({ color, roughness });
  const suit = material(OUTFITS[0].color, 0.69);
  const trim = material(OUTFITS[0].trim, 0.43);
  const lining = material(OUTFITS[0].trousers, 0.66);
  const skin = material('#d8a785', 0.55);
  const boots = material('#3f302a', 0.53);
  const head = new THREE.Group();
  const parts = new THREE.Group();
  const destination = new THREE.Vector3();
  const shadow = withShadow ? new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.9), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; void main() { float a = 1.0 - smoothstep(0.05, 0.49, length(vUv - 0.5)); gl_FragColor = vec4(0.04, 0.034, 0.029, 0.35 * a * a); }`,
  })) : null;
  if (shadow) {
    shadow.rotation.x = -Math.PI / 2;
    shadow.visible = false;
    scene.add(shadow);
  }
  let previousYaw = 0;
  let target = null;
  let stride = 0;
  let phase = 0;
  let strideLimit = 1;

  function brick(parent, surface, x, y, z, w, h, d) {
    const model = new THREE.Mesh(body, surface);
    model.position.set(x, y, z);
    model.scale.set(w, h, d);
    model.receiveShadow = true;
    parent.add(model);
    return model;
  }

  const torso = brick(parts, suit, 0, 0.827, 0, 0.54, 0.46, 0.32);
  const jacket = new THREE.Group();
  brick(jacket, suit, 0, 0.578, 0.01, 0.48, 0.14, 0.34);
  brick(jacket, trim, 0, 0.656, -0.008, 0.55, 0.074, 0.36);
  parts.add(jacket);
  const lapels = [-1, 1].map(side => {
    const strip = brick(parts, trim, side * 0.088, 0.921, -0.164, 0.048, 0.26, 0.025);
    strip.rotation.z = -side * 0.42;
    return strip;
  });
  const tie = brick(parts, trim, 0.105, 0.645, 0.172, 0.165, 0.102, 0.093);
  brick(parts, skin, 0, 1.068, 0, 0.177, 0.104, 0.177);
  const styleFace = createFace(head, skin);
  const styleHair = createHair(head);
  const styleAccessories = createAccessories(head, trim);
  const styleClothes = createClothes(parts, suit, trim, lining);

  const limbs = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.304, 0.969, 0);
    brick(arm, skin, side * 0.041, -0.252, 0.004, 0.131, 0.246, 0.146);
    const sleeve = brick(arm, suit, side * 0.027, -0.154, 0, 0.174, 0.32, 0.193);
    sleeve.rotation.z = side * 0.12;
    const cuff = brick(arm, trim, side * 0.043, -0.301, 0, 0.154, 0.043, 0.183);
    brick(arm, skin, side * 0.043, -0.364, 0.004, 0.129, 0.105, 0.149);
    const leg = new THREE.Group();
    leg.position.set(side * 0.119, 0.537, 0);
    const trousers = brick(leg, lining, 0, -0.193, 0, 0.195, 0.409, 0.226);
    brick(leg, trim, 0, -0.37, 0, 0.199, 0.039, 0.225);
    brick(leg, boots, 0, -0.434, -0.036, 0.202, 0.133, 0.255);
    brick(leg, boots, 0, -0.505, -0.075, 0.216, 0.064, 0.316);
    parts.add(arm, leg);
    return { arm, leg, sleeve, cuff, trousers, side };
  });

  parts.add(head);
  figure.add(parts);
  figure.visible = false;
  scene.add(figure);

  function appearance(look) {
    const outfit = OUTFITS[look.outfit];
    suit.color.set(outfit.color);
    trim.color.set(outfit.trim);
    lining.color.set(outfit.trousers);
    styleFace(look);
    styleHair(look);
    styleAccessories(look);
    const cut = styleClothes(look);
    const tailored = look.garment !== 0;
    jacket.visible = !tailored;
    torso.scale.set(tailored ? 0.447 : 0.54, 0.46, tailored ? 0.304 : 0.32);
    tie.position.x = tailored ? 0.061 : 0.105;
    tie.position.z = tailored ? 0.154 : 0.172;
    tie.scale.set(tailored ? 0.183 : 0.165, 0.102, 0.093);
    for (const [i, lapel] of lapels.entries()) {
      lapel.position.x = (i === 0 ? -1 : 1) * (tailored ? 0.068 : 0.088);
      lapel.position.z = tailored ? -0.156 : -0.166;
      lapel.scale.y = tailored ? 0.211 : 0.26;
    }
    strideLimit = cut.stride;
    for (const { arm, sleeve, cuff, trousers, side } of limbs) {
      const length = Math.min(0.348, 0.322 * cut.sleeves);
      const width = cut.sleeves > 1 ? 0.196 : 0.165;
      arm.position.x = side * (tailored ? 0.259 : 0.304);
      sleeve.position.y = -length * 0.46;
      sleeve.scale.set(width, length, cut.sleeves > 1 ? 0.221 : 0.193);
      cuff.position.y = -length + 0.014;
      cuff.scale.x = width * 0.95;
      const hidesThighs = tailored && look.garment !== 5 && look.garment !== 7;
      const trouserHeight = hidesThighs ? Math.max(0, cut.hem - 0.09) : 0.409;
      trousers.visible = trouserHeight > 0;
      trousers.scale.y = trouserHeight;
      trousers.position.y = -0.3975 + trouserHeight / 2;
    }
  }
  appearance(DEFAULT_LOOK);

  return {
    figure,
    appearance,
    state(state, snap = false) {
      target = state;
      if (!target) {
        figure.visible = false;
        if (shadow) shadow.visible = false;
        return;
      }
      destination.set(target.x, target.y, target.z);
      if (snap || !figure.visible || figure.position.distanceToSquared(destination) > 30) {
        figure.position.copy(destination);
        previousYaw = target.yaw;
      }
      figure.visible = true;
      if (shadow) shadow.visible = Boolean(target.grounded);
    },
    animate(dt) {
      if (!target) return;
      const weight = 1 - Math.exp(-Math.min(0.1, dt) * 15);
      const moving = target.moving ? (target.sprinting ? 0.79 : 0.61) : 0;
      stride += (moving - stride) * weight;
      if (target.moving) phase += dt * (target.sprinting ? 13.5 : 9.7);
      figure.position.lerp(destination, weight);
      if (shadow?.visible) {
        shadow.position.copy(figure.position);
        shadow.position.y += 0.01;
      }
      previousYaw += Math.atan2(Math.sin(target.yaw - previousYaw), Math.cos(target.yaw - previousYaw)) * weight;
      figure.rotation.y = previousYaw;
      const swing = Math.sin(phase) * stride;
      for (const { arm, leg, side } of limbs) {
        arm.rotation.x = swing * side * 0.83;
        leg.rotation.x = -swing * side * strideLimit;
      }
      parts.position.y = Math.abs(swing) * 0.027;
      parts.rotation.z = swing * 0.026;
    },
  };
}

export function appearancePreview(canvas, body) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 10);
  const key = new THREE.DirectionalLight('#ffddbc', 3.35);
  key.position.set(-3, 5, -6);
  const fill = new THREE.DirectionalLight('#f3e7fb', 1.1);
  fill.position.set(4, 2, -3);
  const rim = new THREE.DirectionalLight('#dce4ff', 1.45);
  rim.position.set(4, 4, 5);
  scene.add(key, fill, rim, new THREE.HemisphereLight('#fff2e8', '#a48076', 1.15));
  const traveler = createTraveler(scene, body, false);
  traveler.state({ x: 0, y: 0, z: 0, yaw: 0 });
  let focus = 'body';
  let manual = false;
  let yaw = 0;
  let priorWidth = 0;
  let priorHeight = 0;
  return {
    appearance: traveler.appearance,
    focus(frame) {
      focus = frame;
      manual = false;
    },
    turn(dx) {
      manual = true;
      yaw = (yaw + dx * 0.012) % (Math.PI * 2);
    },
    render(time) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      if (width !== priorWidth || height !== priorHeight) {
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        priorWidth = width;
        priorHeight = height;
      }
      const close = focus === 'face';
      const center = close ? 1.314 : 0.819;
      const distance = (close ? 1.38 : 3.22) * Math.max(1, 0.72 / camera.aspect);
      camera.position.set(0, center + (close ? 0.035 : 0.37), -distance);
      camera.lookAt(0, center, 0);
      if (!manual) yaw = Math.sin(time * 0.68) * (close ? 0.095 : 0.26);
      traveler.figure.rotation.y = yaw;
      renderer.render(scene, camera);
    },
  };
}
