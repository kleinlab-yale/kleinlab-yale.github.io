import * as THREE from 'three';
import { PLATE, STUD } from './bricks.js';
import { CHRISTMAS_OBJECTS } from './christmas.js';

export function createChristmasModels(mesh, paint) {
  const ball = new THREE.SphereGeometry(0.5, 14, 10);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
  const taper = new THREE.CylinderGeometry(0.22, 0.5, 1, 8, 1, false, Math.PI / 8);
  const ring = new THREE.TorusGeometry(0.36, 0.092, 8, 24);
  const gem = new THREE.IcosahedronGeometry(0.5, 0);
  const brass = new THREE.MeshStandardMaterial({ color: '#deb660', roughness: 0.32, metalness: 0.58 });
  const snow = paint('snow');
  const red = paint('cranberry');
  const pine = paint('pine');
  const oak = paint('oak');
  const ink = paint('ink');
  const cream = paint('cream');
  const flame = new THREE.MeshStandardMaterial({ color: '#ffce66', emissive: '#ff7d31', emissiveIntensity: 1.35, roughness: 0.5 });
  const bulbColors = ['#ffd787', '#ff858e', '#adffe2'];
  const bulbsOn = bulbColors.map(color => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.42, roughness: 0.28 }));
  const bulbsOff = bulbColors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));

  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.5 + i / 5);
    const r = i % 2 ? 0.23 : 0.5;
    starShape[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a));
  }
  starShape.closePath();
  const star = new THREE.ExtrudeGeometry(starShape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.036, bevelThickness: 0.036, bevelSegments: 1 });
  star.center();

  const canePath = new THREE.CatmullRomCurve3([
    [0.19, 0.075, 0], [0.19, 0.48, 0], [0.19, 0.75, 0], [0.13, 0.88, 0],
    [-0.034, 0.951, 0], [-0.26, 0.889, 0], [-0.32, 0.759, 0],
  ].map(point => new THREE.Vector3(...point)));
  const cane = new THREE.TubeGeometry(canePath, 48, 0.049, 10, false);
  for (let i = 0; i < 12; i++) cane.addGroup(i * 240, 240, i % 2);

  const wire = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    [-0.46, 0.91, 0], [-0.22, 0.54, 0], [0, 0.43, 0], [0.22, 0.54, 0], [0.46, 0.91, 0],
  ].map(point => new THREE.Vector3(...point))), 24, 0.012, 6, false);

  function bulbStrands(group, positions) {
    const transform = new THREE.Object3D();
    return bulbColors.map((_, index) => {
      const lamps = positions.filter((_, i) => i % bulbColors.length === index);
      const lights = new THREE.InstancedMesh(ball, bulbsOff[index], lamps.length);
      for (const [i, [x, y, z, w, h, d]] of lamps.entries()) {
        transform.position.set(x, y, z);
        transform.scale.set(w, h, d);
        transform.updateMatrix();
        lights.setMatrixAt(i, transform.matrix);
      }
      group.add(lights);
      return lights;
    });
  }

  function switchBulbs(lights, active) {
    lights.forEach((light, i) => { light.material = active ? bulbsOn[i] : bulbsOff[i]; });
  }

  function bow(group, color, x, y, z, size) {
    for (const sign of [-1, 1]) {
      const loop = mesh(group, color, x + sign * size * 0.27, y + size * 0.15, z, size * 0.53, size * 0.30, size * 0.45, ball);
      loop.rotation.z = sign * 0.47;
      const tail = mesh(group, color, x + sign * size * 0.19, y - size * 0.21, z, size * 0.21, size * 0.48, size * 0.31);
      tail.rotation.z = sign * 0.31;
    }
    mesh(group, color, x, y, z, size * 0.27, size * 0.24, size * 0.47);
  }

  function rod(group, material, a, b, width) {
    const axis = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const piece = mesh(group, material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, width, axis.length(), width);
    piece.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, axis.normalize());
    return piece;
  }

  const models = {
    festiveTree(group, tone) {
      mesh(group, paint('cedar'), 0, 0.052, 0, 0.44, 0.104, 0.44, taper);
      mesh(group, oak, 0, 0.106, 0, 0.47, 0.029, 0.47, cylinder);
      mesh(group, paint('bark'), 0, 0.25, 0, 0.13, 0.34, 0.13, cylinder);
      const lights = [];
      for (const [i, width] of [0.97, 0.78, 0.57, 0.36].entries()) {
        const y = 0.26 + i * 0.157;
        mesh(group, tone, 0, y, 0, width * 0.94, 0.26, width * 0.94, taper);
        for (let side = 0; side < 8; side++) {
          const a = side * Math.PI / 4 + i * 0.27;
          const x = Math.cos(a), z = Math.sin(a);
          const leaf = mesh(group, side % 3 ? tone : paint('fern'), x * width * 0.34, y - 0.088, z * width * 0.34,
            width * 0.31, 0.075, width * 0.22);
          leaf.rotation.y = -a;
          leaf.rotation.z = 0.24;
          lights.push([x * width * 0.47, y - 0.071 + side % 2 * 0.016, z * width * 0.47, 0.046, 0.031, 0.046]);
          if ((side + i) % 3 === 0) {
            mesh(group, side % 2 ? brass : red, x * width * 0.423, y - 0.111, z * width * 0.423, 0.071, 0.048, 0.071, ball);
          }
        }
      }
      mesh(group, brass, 0, 0.878, 0, 0.032, 0.09, 0.032, cylinder);
      const topper = mesh(group, bulbsOn[0], 0, 0.936, 0, 0.22, 0.16, 0.29, star);
      const strands = bulbStrands(group, lights);
      return active => { switchBulbs(strands, active); topper.material = active ? bulbsOn[0] : brass; };
    },
    wrappedGift(group, tone) {
      mesh(group, tone, 0, 0.33, 0, 0.914, 0.65, 0.91);
      mesh(group, paint('redTrim'), 0, 0.644, 0, 0.865, 0.039, 0.869);
      mesh(group, brass, 0, 0.329, 0, 0.19, 0.648, 0.926);
      mesh(group, brass, 0, 0.329, 0, 0.929, 0.65, 0.17);
      const lid = new THREE.Group();
      lid.position.set(0, 0.657, -0.443);
      group.add(lid);
      mesh(lid, tone, 0, 0.074, 0.443, 0.97, 0.16, 0.971);
      mesh(lid, brass, 0, 0.112, 0.443, 0.194, 0.095, 0.977);
      mesh(lid, brass, 0, 0.112, 0.443, 0.974, 0.097, 0.18);
      bow(lid, brass, 0, 0.223, 0.443, 0.38);
      const surprise = mesh(group, bulbsOn[0], 0, 0.884, 0, 0.30, 0.31, 0.56, star);
      return (active, weight, time) => {
        lid.rotation.x += ((active ? -1.76 : 0) - lid.rotation.x) * weight;
        surprise.visible = active && lid.rotation.x < -0.6;
        surprise.position.y = 0.894 + Math.sin(time * 2.8) * 0.038;
        surprise.rotation.y = time * 0.92;
      };
    },
    bauble(group, tone) {
      mesh(group, tone, 0, 0.46, 0, 0.83, 0.81, 0.83, ball);
      mesh(group, brass, 0, 0.489, 0, 0.844, 0.078, 0.844, cylinder);
      mesh(group, brass, 0, 0.847, 0, 0.29, 0.135, 0.29, cylinder);
      mesh(group, brass, 0, 0.949, 0, 0.19, 0.16, 0.17, ring);
    },
    starTopper(group, tone) {
      mesh(group, brass, 0, 0.075, 0, 0.12, 0.15, 0.26, cylinder);
      mesh(group, tone, 0, 0.56, 0, 0.79, 0.88, 1.15, star);
      mesh(group, brass, 0, 0.56, 0.057, 0.455, 0.51, 0.63, star);
    },
    pineGarland(group, tone) {
      mesh(group, tone, 0, 0.53, 0, 0.94, 0.21, 0.55);
      for (let i = 0; i < 11; i++) {
        const x = -0.408 + i * 0.082;
        mesh(group, i % 3 ? tone : paint('fern'), x, 0.51 + Math.cos(i * 1.9) * 0.12, 0.04, 0.12, 0.6, 0.68, taper).rotation.z = 0.64;
        if (i % 2 === 0) mesh(group, red, x, 0.52, 0.38, 0.047, 0.19, 0.19, ball);
      }
      bow(group, red, 0, 0.51, 0.36, 0.22);
    },
    candyCane(group, tone) {
      mesh(group, [tone, snow], 0, 0, 0, 1.33, 0.99, 1.5, cane);
      mesh(group, snow, 0.253, 0.074, 0, 0.13, 0.095, 0.145, ball);
      mesh(group, tone, -0.426, 0.753, 0, 0.133, 0.098, 0.146, ball);
    },
    ribbonBow(group, tone) {
      mesh(group, brass, 0, 0.534, -0.078, 0.18, 0.21, 0.3, cylinder);
      bow(group, tone, 0, 0.546, 0.08, 0.78);
    },
    holidayWreath(group, tone) {
      mesh(group, pine, 0, 0.52, 0, 0.97, 0.97, 0.88, ring);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        mesh(group, i % 3 ? tone : paint('fern'), Math.cos(a) * 0.34, 0.52 + Math.sin(a) * 0.34, 0.02, 0.21, 0.27, 0.67, taper).rotation.z = a - 0.76;
        if (i % 3 === 1) mesh(group, red, Math.cos(a) * 0.354, 0.52 + Math.sin(a) * 0.354, 0.27, 0.099, 0.10, 0.22, ball);
      }
      bow(group, red, 0, 0.254, 0.249, 0.38);
    },
    stocking(group, tone) {
      mesh(group, tone, -0.13, 0.516, 0, 0.43, 0.62, 0.42);
      mesh(group, tone, 0.04, 0.232, 0, 0.79, 0.35, 0.44);
      mesh(group, snow, -0.12, 0.844, 0, 0.58, 0.19, 0.55);
      mesh(group, cream, 0.303, 0.225, 0.02, 0.26, 0.348, 0.44, ball);
      mesh(group, brass, -0.079, 0.562, 0.214, 0.26, 0.17, 0.65, star);
    },
    fireplace(group, tone) {
      mesh(group, paint('stone'), 0, 0.052, 0.032, 0.99, 0.104, 0.88);
      mesh(group, paint('beam'), 0, 0.39, -0.29, 0.82, 0.61, 0.18);
      for (const sign of [-1, 1]) for (let i = 0; i < 5; i++) {
        mesh(group, i % 2 ? paint('redwood') : tone, sign * 0.365, 0.171 + i * 0.128, 0.003, 0.23, 0.123, 0.64);
      }
      mesh(group, tone, 0, 0.756, 0.007, 0.93, 0.166, 0.61);
      mesh(group, oak, 0, 0.88, 0.04, 0.995, 0.104, 0.83);
      mesh(group, pine, 0, 0.831, 0.426, 0.89, 0.068, 0.125);
      bow(group, red, 0, 0.823, 0.41, 0.135);
      for (const [x, z, angle] of [[-0.044, 0.011, 0.43], [0.053, 0.077, -0.55]]) {
        mesh(group, oak, x, 0.142, z, 0.082, 0.395, 0.075, cylinder).rotation.z = Math.PI / 2 + angle;
      }
      const embers = [-0.117, 0, 0.12].map((x, i) => mesh(group, i === 1 ? flame : bulbsOn[0], x, 0.31, 0.098 - i * 0.038, 0.133, i === 1 ? 0.368 : 0.284, 0.26, gem));
      return (active, _weight, time) => embers.forEach((ember, i) => {
        ember.visible = active;
        ember.rotation.z = Math.sin(time * 6.2 + i * 2) * 0.24;
        ember.scale.y = 0.285 + Math.sin(time * 8 + i * 1.8) * 0.056 + Number(i === 1) * 0.113;
      });
    },
    fairyLights(group, tone) {
      mesh(group, pine, 0, 0, 0, 1, 1, 1, wire);
      for (const sign of [-1, 1]) mesh(group, brass, sign * 0.455, 0.88, 0, 0.053, 0.19, 0.18, cylinder);
      const bulbs = [];
      for (let i = 0; i < 11; i++) {
        const x = -0.418 + i * 0.0836;
        const y = 0.43 + 2.3 * x ** 2;
        mesh(group, tone, x, y - 0.028, 0, 0.034, 0.108, 0.102, cylinder);
        bulbs.push([x, y - 0.192, 0, 0.048, 0.29, 0.20]);
      }
      const strands = bulbStrands(group, bulbs);
      return active => switchBulbs(strands, active);
    },
    candles(group, tone) {
      mesh(group, brass, 0, 0.064, 0, 0.96, 0.126, 0.85, cylinder);
      const flames = [];
      for (const [x, height] of [[-0.28, 0.44], [0, 0.61], [0.28, 0.33]]) {
        mesh(group, tone, x, 0.119 + height / 2, 0, 0.195, height, 0.48, cylinder);
        mesh(group, cream, x, 0.124 + height, 0, 0.197, 0.062, 0.483, cylinder);
        mesh(group, ink, x, 0.17 + height, 0, 0.022, 0.07, 0.049);
        flames.push(mesh(group, flame, x, 0.238 + height, 0, 0.075, 0.183, 0.143, gem));
      }
      return (active, _weight, time) => flames.forEach((light, i) => {
        light.visible = active;
        light.rotation.z = Math.sin(time * 9 + i * 4) * 0.22;
      });
    },
    snowflake(group, tone) {
      mesh(group, snow, 0, 0.5, 0, 0.29, 0.27, 0.44, gem);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const x = Math.sin(a), y = Math.cos(a);
        rod(group, tone, [x * 0.058, 0.5 + y * 0.058, 0], [x * 0.432, 0.5 + y * 0.452, 0], 0.071);
        for (const sign of [-1, 1]) {
          rod(group, tone, [x * 0.244, 0.5 + y * 0.252, 0],
            [x * 0.352 + sign * y * 0.113, 0.5 + y * 0.356 - sign * x * 0.116, 0], 0.061);
        }
      }
    },
    holidayRug(group, tone) {
      mesh(group, tone, 0, 0.283, 0, 0.98, 0.55, 0.95);
      for (const side of [-1, 1]) {
        mesh(group, brass, 0, 0.566, side * 0.419, 0.921, 0.052, 0.036);
        mesh(group, brass, side * 0.449, 0.567, 0, 0.035, 0.052, 0.805);
        for (let i = -6; i <= 6; i++) mesh(group, cream, i * 0.068, 0.305, side * 0.45, 0.038, 0.42, 0.085);
      }
      for (const x of [-0.269, 0, 0.269]) {
        const mosaic = mesh(group, snow, x, 0.587, 0, 0.211, 0.26, 0.88, star);
        mosaic.rotation.x = -Math.PI / 2;
      }
    },
    snowman(group, tone) {
      mesh(group, snow, 0, 0.036, 0, 0.91, 0.071, 0.94, cylinder);
      mesh(group, tone, 0, 0.235, 0, 0.66, 0.418, 0.916, ball);
      mesh(group, tone, 0, 0.459, 0, 0.49, 0.31, 0.69, ball);
      mesh(group, tone, 0, 0.676, 0, 0.395, 0.268, 0.56, ball);
      mesh(group, red, 0, 0.565, 0, 0.417, 0.066, 0.58, cylinder);
      mesh(group, red, 0.132, 0.48, 0.237, 0.093, 0.21, 0.11).rotation.z = 0.20;
      mesh(group, ink, 0, 0.784, 0, 0.47, 0.057, 0.631, cylinder);
      mesh(group, ink, 0, 0.877, 0, 0.335, 0.16, 0.46, cylinder);
      mesh(group, red, 0, 0.812, 0, 0.344, 0.043, 0.47, cylinder);
      mesh(group, paint('vermilion'), 0, 0.663, 0.319, 0.085, 0.27, 0.077, taper).rotation.x = Math.PI / 2;
      for (const x of [-0.075, 0.075]) mesh(group, ink, x, 0.705, 0.251, 0.047, 0.042, 0.096, ball);
      for (const [y, z] of [[0.294, 0.433], [0.405, 0.335], [0.476, 0.348]]) mesh(group, ink, 0, y, z, 0.051, 0.044, 0.075, ball);
      for (const sign of [-1, 1]) {
        rod(group, oak, [sign * 0.167, 0.456, 0], [sign * 0.467, 0.581, -0.035], 0.036);
        rod(group, oak, [sign * 0.375, 0.541, -0.028], [sign * 0.456, 0.659, -0.024], 0.024);
      }
    },
    gingerbreadHouse(group, tone) {
      mesh(group, snow, 0, 0.045, 0, 0.96, 0.09, 0.95);
      mesh(group, tone, 0, 0.313, 0, 0.81, 0.46, 0.78);
      mesh(group, tone, 0, 0.586, 0, 0.566, 0.36, 0.72).rotation.z = Math.PI / 4;
      for (const sign of [-1, 1]) {
        mesh(group, paint('redwood'), sign * 0.22, 0.68, 0, 0.63, 0.132, 0.92).rotation.z = -sign * 0.61;
        mesh(group, snow, sign * 0.217, 0.726, 0, 0.631, 0.068, 0.943).rotation.z = -sign * 0.61;
        mesh(group, cream, sign * 0.238, 0.392, 0.396, 0.212, 0.211, 0.065);
        mesh(group, bulbsOff[0], sign * 0.238, 0.392, 0.433, 0.151, 0.15, 0.033);
        mesh(group, snow, sign * 0.238, 0.392, 0.454, 0.022, 0.18, 0.026);
        for (let i = 0; i < 4; i++) mesh(group, red, sign * (0.062 + i * 0.096), 0.84 - i * 0.067, 0.475, 0.076, 0.076, 0.048, ball);
      }
      mesh(group, cream, 0, 0.225, 0.41, 0.217, 0.277, 0.093);
      mesh(group, red, 0, 0.21, 0.455, 0.155, 0.245, 0.039);
      mesh(group, brass, 0.042, 0.192, 0.478, 0.041, 0.048, 0.037, ball);
      mesh(group, tone, 0.264, 0.817, -0.2, 0.137, 0.248, 0.179);
      mesh(group, snow, 0.264, 0.944, -0.2, 0.159, 0.047, 0.204);
    },
    sleigh(group, tone) {
      for (const x of [-0.344, 0.344]) {
        mesh(group, brass, x, 0.08, -0.046, 0.128, 0.086, 0.77);
        mesh(group, brass, x, 0.138, 0.363, 0.128, 0.073, 0.173).rotation.x = -0.75;
        mesh(group, brass, x, 0.21, 0.437, 0.127, 0.078, 0.077, ball);
        for (const z of [-0.276, 0.23]) mesh(group, oak, x, 0.172, z, 0.091, 0.186, 0.085);
        mesh(group, tone, x, 0.501, 0, 0.146, 0.46, 0.84);
        mesh(group, brass, x, 0.738, 0, 0.17, 0.066, 0.858);
      }
      mesh(group, tone, 0, 0.307, -0.018, 0.824, 0.137, 0.82);
      mesh(group, tone, 0, 0.58, -0.394, 0.84, 0.41, 0.13);
      mesh(group, brass, 0, 0.798, -0.401, 0.837, 0.082, 0.155);
      mesh(group, snow, 0, 0.53, -0.155, 0.572, 0.121, 0.38);
      mesh(group, tone, 0, 0.49, 0.344, 0.84, 0.34, 0.117);
      mesh(group, brass, 0, 0.664, 0.361, 0.856, 0.073, 0.13);
      mesh(group, brass, 0, 0.52, 0.404, 0.243, 0.257, 0.48, star);
    },
    toyTrain(group, tone) {
      mesh(group, ink, 0, 0.26, 0, 0.934, 0.134, 0.72);
      for (const z of [-0.324, 0.324]) for (const x of [-0.331, -0.134, 0.12, 0.335]) {
        mesh(group, paint('beam'), x, 0.17, z, 0.146, 0.168, 0.29, cylinder).rotation.x = Math.PI / 2;
        mesh(group, brass, x, 0.17, z * 1.26, 0.071, 0.065, 0.157, cylinder).rotation.x = Math.PI / 2;
      }
      mesh(group, tone, 0.178, 0.51, 0, 0.385, 0.61, 0.602, cylinder).rotation.z = Math.PI / 2;
      mesh(group, pine, -0.243, 0.55, 0, 0.284, 0.56, 0.593);
      mesh(group, tone, -0.247, 0.85, 0, 0.344, 0.112, 0.705);
      mesh(group, cream, -0.248, 0.646, 0.308, 0.167, 0.221, 0.067);
      mesh(group, bulbsOff[0], -0.248, 0.646, 0.35, 0.117, 0.153, 0.035);
      mesh(group, brass, 0.434, 0.514, 0, 0.263, 0.068, 0.434, cylinder).rotation.z = Math.PI / 2;
      mesh(group, bulbsOff[0], 0.476, 0.574, 0, 0.046, 0.143, 0.138, ball);
      mesh(group, ink, 0.306, 0.792, 0, 0.087, 0.292, 0.195, cylinder);
      mesh(group, brass, 0.306, 0.935, 0, 0.106, 0.077, 0.228, cylinder);
    },
    jingleBell(group, tone) {
      const bell = new THREE.Group();
      group.add(bell);
      mesh(bell, tone, 0, 0.368, 0, 0.76, 0.61, 0.76, taper);
      mesh(bell, brass, 0, 0.119, 0, 0.87, 0.107, 0.87, cylinder);
      mesh(bell, paint('beam'), 0, 0.066, 0, 0.209, 0.132, 0.209, ball);
      mesh(bell, brass, 0, 0.738, 0, 0.45, 0.231, 0.58, ring);
      bow(bell, red, 0, 0.826, 0.267, 0.415);
      let last;
      let ringUntil = 0;
      return (active, _weight, time) => {
        if (last !== undefined && active !== last) ringUntil = time + 0.92;
        last = active;
        bell.rotation.z = time > 0 && time < ringUntil ? Math.sin((ringUntil - time) * 24) * (ringUntil - time) * 0.21 : 0;
      };
    },
    reindeer(group, tone) {
      mesh(group, tone, 0, 0.412, -0.096, 0.65, 0.33, 0.666);
      for (const x of [-0.21, 0.21]) for (const z of [-0.303, 0.111]) {
        mesh(group, tone, x, 0.203, z, 0.175, 0.362, 0.129);
        mesh(group, paint('beam'), x, 0.064, z + 0.02, 0.183, 0.119, 0.172);
      }
      mesh(group, tone, 0, 0.527, 0.195, 0.43, 0.327, 0.33);
      mesh(group, red, 0, 0.493, 0.206, 0.456, 0.064, 0.361);
      mesh(group, brass, 0, 0.46, 0.398, 0.097, 0.071, 0.052, ball);
      mesh(group, tone, 0, 0.684, 0.272, 0.55, 0.24, 0.36);
      mesh(group, cream, 0, 0.632, 0.413, 0.458, 0.134, 0.139);
      mesh(group, red, 0, 0.659, 0.476, 0.13, 0.08, 0.047, ball);
      mesh(group, tone, 0, 0.525, -0.431, 0.189, 0.095, 0.13).rotation.x = 0.57;
      for (const sign of [-1, 1]) {
        mesh(group, ink, sign * 0.22, 0.714, 0.414, 0.066, 0.045, 0.041, ball);
        mesh(group, tone, sign * 0.317, 0.767, 0.194, 0.22, 0.114, 0.12).rotation.z = sign * 0.39;
        rod(group, cream, [sign * 0.137, 0.761, 0.205], [sign * 0.229, 0.965, 0.159], 0.063);
        rod(group, cream, [sign * 0.209, 0.906, 0.171], [sign * 0.381, 0.979, 0.165], 0.049);
        rod(group, cream, [sign * 0.178, 0.839, 0.184], [sign * 0.119, 0.953, 0.135], 0.051);
      }
    },
    toyDrum(group, tone) {
      mesh(group, tone, 0, 0.409, 0, 0.851, 0.701, 0.851, cylinder);
      for (const y of [0.098, 0.734]) mesh(group, brass, 0, y, 0, 0.88, 0.142, 0.88, cylinder);
      mesh(group, cream, 0, 0.805, 0, 0.814, 0.072, 0.814, cylinder);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, b = a + Math.PI / 4;
        rod(group, snow, [Math.cos(a) * 0.428, 0.174, Math.sin(a) * 0.428],
          [Math.cos(b) * 0.428, 0.676, Math.sin(b) * 0.428], 0.03);
      }
      for (const sign of [-1, 1]) {
        rod(group, oak, [-0.246, 0.87, sign * 0.273], [0.228, 0.89, sign * -0.198], 0.046);
        mesh(group, brass, 0.235, 0.891, sign * -0.203, 0.072, 0.13, 0.07, ball);
      }
    },
  };

  return (group, brick) => {
    const model = new THREE.Group();
    const [w, d, h] = CHRISTMAS_OBJECTS[brick.form].size;
    model.scale.set(w * STUD, h * PLATE, d * STUD);
    group.add(model);
    const animate = models[brick.form](model, paint(brick.tone));
    model.traverse(piece => { if (piece.isMesh && !piece.isInstancedMesh) piece.castShadow = true; });
    animate?.(brick.active, 1, 0);
    return animate;
  };
}
