import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { noise, WATER_LEVEL } from './valley.js';

const mist = new THREE.Color('#d2becb');
const sun = new THREE.Vector3(-0.72, 0.47, 0.62).normalize();
const fogDensity = 0.0108;
const shaderNoise = `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
  }
`;

function makeSky(scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sun: { value: sun },
      zenith: { value: new THREE.Color('#9cbddc') },
      horizon: { value: new THREE.Color('#f7d5c2') },
      cloudColor: { value: new THREE.Color('#fff1e2') },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 sun, zenith, horizon, cloudColor;
      ${shaderNoise}
      void main() {
        vec3 ray = normalize(vWorld - cameraPosition);
        float altitude = max(0.0, ray.y);
        vec3 color = mix(horizon, zenith, pow(smoothstep(0.0, 0.63, altitude), 0.65));
        float glow = max(0.0, dot(ray, sun));
        color += vec3(0.40, 0.22, 0.12) * pow(glow, 16.0);
        color += vec3(1.3, 0.76, 0.40) * smoothstep(0.99955, 0.99979, glow);
        vec2 p = ray.xz / (0.27 + altitude) * vec2(4.7, 8.5);
        float cloud = noise(p) * 0.61 + noise(p * 2.19) * 0.27 + noise(p * 5.11) * 0.12;
        float cover = smoothstep(0.49, 0.77, cloud) * smoothstep(0.02, 0.17, altitude) * (1.0 - altitude * 0.38);
        color = mix(color, cloudColor, cover * 0.7);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(235, 36, 20), material);
  sky.renderOrder = -5;
  sky.frustumCulled = false;
  scene.add(sky);
}

function makeEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#8faac3');
  gradient.addColorStop(0.38, '#b6c4d5');
  gradient.addColorStop(0.49, '#ffe3cb');
  gradient.addColorStop(0.57, '#766f71');
  gradient.addColorStop(1, '#353a36');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  for (const [x, y, radius, color] of [[115, 78, 50, '255, 244, 222'], [330, 48, 57, '218, 228, 255']]) {
    const light = context.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, `rgba(${color}, 1)`);
    light.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = light;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture);
  texture.dispose();
  pmrem.dispose();
  return environment.texture;
}

function ridge(zBase, shade, side = 0, variant = 0) {
  const positions = [];
  const colors = [];
  const indices = [];
  const width = 56;
  const depth = 12;
  const color = new THREE.Color(shade);
  for (let b = 0; b <= depth; b++) {
    for (let a = 0; a <= width; a++) {
      const x = (a - width / 2) * 4.2;
      const z = zBase - (b - depth / 2) * 3.5;
      const peak = 7 + 7 * Math.abs(Math.sin(a * 0.19 + variant)) + 16 * Math.abs(Math.sin(a * 0.072 + variant * 4.2));
      const spine = Math.pow(Math.sin(Math.PI * b / depth), 1.22);
      const detail = 0.78 + Math.sin(a * 0.84 + variant) * 0.1 + noise(a, b, variant * 5) * 0.24;
      const y = peak * spine * detail - 1.1;
      positions.push(x + (noise(a, b, 9) - 0.5) * 2.6, y, z);
      const tone = color.clone().multiplyScalar(0.76 + detail * 0.38 + y * 0.003);
      colors.push(tone.r, tone.g, tone.b);
      if (a < width && b < depth) {
        const i = b * (width + 1) + a;
        const next = i + width + 1;
        indices.push(i, i + 1, next, i + 1, next + 1, next);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const hills = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.94, flatShading: true }));
  hills.rotation.y = side;
  return hills;
}

function makeWater(lowPower) {
  const water = new Reflector(new THREE.PlaneGeometry(550, 550), {
    textureWidth: lowPower ? 384 : 768,
    textureHeight: lowPower ? 256 : 448,
    multisample: 0,
    clipBias: 0.002,
    color: '#396b68',
    shader: {
      name: 'ValleyWater',
      uniforms: {
        color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
        time: { value: 0 }, sun: { value: sun }, haze: { value: mist }, density: { value: fogDensity },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 reflected;
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          reflected = textureMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec4 reflected;
        varying vec3 vWorld;
        uniform vec3 color, sun, haze;
        uniform float time, density;
        uniform sampler2D tDiffuse;
        ${shaderNoise}
        void main() {
          vec2 p = vWorld.xz;
          vec3 diff = cameraPosition - vWorld;
          float dist = length(diff);
          vec3 viewDir = diff / dist;
          float swell = sin(p.x * 1.23 + p.y * 2.9 + time * 1.15);
          float crosswave = sin(p.x * -3.9 + p.y * 1.73 - time * 1.39);
          float streak = sin(p.x * 0.52 + p.y * 8.4 + time * 1.62 + swell * 0.72);
          vec2 uv = reflected.xy / reflected.w;
          float warp = 1.0 / (1.0 + dist * 0.052);
          uv += vec2(swell + crosswave * 0.7, crosswave * 0.47 + streak * 0.46) * (0.011 * warp);
          vec3 mirror = texture2D(tDiffuse, clamp(uv, 0.002, 0.998)).rgb;
          float fresnel = pow(1.0 - max(0.0, viewDir.y), 3.15);
          float depth = noise(p * 0.28 + vec2(0.0, time * 0.025));
          vec3 tint = color * (0.72 + depth * 0.45) + vec3(0.009, 0.017, 0.022);
          vec3 waterColor = mix(tint, mirror * vec3(0.84, 0.92, 1.0), 0.29 + fresnel * 0.56);
          vec3 normal = normalize(vec3(swell * 0.026 + crosswave * 0.021, 1.0, streak * 0.035 + swell * 0.014));
          float spec = pow(max(0.0, dot(reflect(-sun, normal), viewDir)), 85.0);
          waterColor += vec3(1.0, 0.7, 0.44) * spec * 0.7;
          float ripples = smoothstep(0.79, 0.99, streak) * (0.35 + 0.65 * depth) * warp;
          waterColor += vec3(0.013, 0.031, 0.034) * ripples;
          waterColor = mix(waterColor, haze, 1.0 - exp(-density * density * dist * dist));
          gl_FragColor = vec4(waterColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_LEVEL;
  const reflection = water.onBeforeRender;
  const lastPosition = new THREE.Vector3(1e5, 0, 0);
  const lastRotation = new THREE.Quaternion();
  let lastFov = -1;
  let lastAspect = -1;
  water.refresh = true;
  water.onBeforeRender = function (renderer, scene, camera) {
    if (!this.refresh && lastPosition.distanceToSquared(camera.position) < 0.0012 &&
        Math.abs(lastRotation.dot(camera.quaternion)) > 0.999994 && lastFov === camera.fov && lastAspect === camera.aspect) return;
    lastPosition.copy(camera.position);
    lastRotation.copy(camera.quaternion);
    lastFov = camera.fov;
    lastAspect = camera.aspect;
    this.refresh = false;
    reflection.call(this, renderer, scene, camera);
  };
  return water;
}

function makePetals(lowPower) {
  const count = lowPower ? 72 : 148;
  const petal = new THREE.SphereGeometry(1, 7, 4);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.02, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(petal, material, count);
  const colors = ['#f1a4b8', '#f4becc', '#e294ac', '#edc9be', '#df8098'];
  const seeds = Array.from({ length: count }, (_, i) => [noise(i, 1), noise(i, 2), noise(i, 3), noise(i, 4)]);
  for (let i = 0; i < count; i++) mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const object = new THREE.Object3D();
  const update = time => {
    for (const [i, [a, b, c, d]] of seeds.entries()) {
      const cycle = (b + time * (0.027 + d * 0.025)) % 1;
      const sway = time * (0.56 + a * 0.7) + c * 21;
      const focus = i % 3 === 0 ? -17 : 10.7;
      object.position.set(focus + (a - 0.5) * 19 + cycle * 7 + Math.sin(sway) * 0.7,
        (1 - cycle) * (focus > 0 ? 15 : 10) + 0.1, (c - 0.5) * 35 + Math.cos(sway * 0.73) * 0.8);
      object.rotation.set(sway, sway * 0.41, sway * 0.82);
      object.scale.set(0.046 + d * 0.03, 0.015, 0.071 + d * 0.039);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

function makeSnow(lowPower) {
  const positions = [];
  for (let i = 0; i < (lowPower ? 430 : 810); i++) positions.push(noise(i, 15), noise(i, 16), noise(i, 17));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, pixels: { value: 1 } },
    vertexShader: `
      uniform float time;
      uniform float pixels;
      varying float opacity;
      void main() {
        float speed = 0.39 + position.x * 0.73;
        vec3 field = vec3(48.0, 18.0, 48.0);
        vec3 drift = vec3(time * 0.22 + sin(time * 0.67 + position.z * 27.0) * 0.44,
          -time * speed, cos(time * 0.58 + position.x * 37.0) * 0.6);
        vec3 range = mod(position * field + drift - cameraPosition + vec3(24.0, 5.0, 24.0), field);
        vec3 world = cameraPosition + range - vec3(24.0, 5.0, 24.0);
        vec4 view = viewMatrix * vec4(world, 1.0);
        float depth = -view.z;
        gl_Position = projectionMatrix * view;
        gl_PointSize = pixels * clamp((10.0 + position.y * 15.0) / max(0.7, depth), 1.1, 6.8);
        opacity = (0.38 + position.z * 0.35) * smoothstep(0.9, 2.2, depth) * (1.0 - smoothstep(13.0, 24.0, depth));
        opacity *= smoothstep(0.0, 1.3, range.y) * (1.0 - smoothstep(16.0, 18.0, range.y));
      }
    `,
    fragmentShader: `
      varying float opacity;
      void main() {
        float edge = 1.0 - smoothstep(0.16, 0.5, length(gl_PointCoord - vec2(0.5)));
        gl_FragColor = vec4(0.96, 0.98, 1.0, edge * opacity);
      }
    `,
  });
  const snow = new THREE.Points(geometry, material);
  snow.frustumCulled = false;
  snow.visible = false;
  return snow;
}

export function dressScene(scene, renderer, lowPower) {
  scene.fog = new THREE.FogExp2(mist, fogDensity);
  makeSky(scene);
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.63;
  scene.add(ridge(-142, '#77768e', 0, 1.5), ridge(-106, '#656e81', 0, 0.4), ridge(-76, '#526b69', 0, 2.2));
  scene.add(ridge(-108, '#6b7482', -1.2, 4.4), ridge(-89, '#677b76', 1.32, 3.3), ridge(-248, '#78848c', 3.04, 5.7));
  const light = new THREE.DirectionalLight('#ffdfbe', 2.85);
  light.position.copy(sun.clone().multiplyScalar(62));
  light.castShadow = true;
  light.shadow.mapSize.setScalar(lowPower ? 2048 : 4096);
  Object.assign(light.shadow.camera, { left: -40, right: 40, top: 36, bottom: -38, near: 0.5, far: 131 });
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.normalBias = 0.033;
  light.shadow.bias = -0.00016;
  light.shadow.intensity = 0.93;
  const fill = new THREE.DirectionalLight('#d5d9ff', 0.53);
  fill.position.set(8, 11, -17);
  scene.add(light, new THREE.HemisphereLight('#ffeee7', '#78918b', 0.94), fill);
  const water = makeWater(lowPower);
  const petals = makePetals(lowPower);
  const snow = makeSnow(lowPower);
  scene.add(water, petals.mesh, snow);
  return {
    refresh() { water.refresh = true; },
    christmas(active) { snow.visible = active; petals.mesh.visible = !active; },
    update(time) {
      water.material.uniforms.time.value = time;
      if (petals.mesh.visible) petals.update(time);
      if (snow.visible) {
        snow.material.uniforms.time.value = time;
        snow.material.uniforms.pixels.value = renderer.getPixelRatio();
      }
    },
  };
}
