import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EXPRESSIONS, EYES, FACES, HAIR_COLORS, SKINS } from './appearance.js';

const FACE_SIZE = 256;
const WARM_WHITE = '#fff3e6';

function drawEye(context, x, y, size, pose, iris, eyelashes, side) {
  const width = 27 * size;
  const height = (pose === 'wide' ? 16 : pose === 'soft' ? 10 : 13) * size;
  if (pose === 'happy') {
    context.strokeStyle = '#35252a';
    context.lineWidth = 3.7;
    context.beginPath();
    context.moveTo(x - width, y + 4);
    context.quadraticCurveTo(x, y - 17 * size, x + width, y + 4);
    context.stroke();
  } else {
    context.save();
    context.beginPath();
    context.moveTo(x - width, y);
    context.bezierCurveTo(x - width * 0.55, y - height * 1.35, x + width * 0.5, y - height * 1.22, x + width, y - 1);
    context.bezierCurveTo(x + width * 0.57, y + height, x - width * 0.55, y + height, x - width, y);
    context.closePath();
    context.clip();
    context.fillStyle = WARM_WHITE;
    context.fillRect(x - width, y - height * 2, width * 2, height * 4);
    context.fillStyle = iris;
    context.beginPath();
    context.ellipse(x, y - 1, height * 0.83, height * 0.92, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#261d26';
    context.beginPath();
    context.ellipse(x, y - 1, height * 0.42, height * 0.66, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff7ee';
    context.beginPath();
    context.arc(x - height * 0.29, y - height * 0.4, height * 0.215, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.strokeStyle = '#392831';
    context.lineWidth = eyelashes ? 3.65 : 2.6;
    context.beginPath();
    context.moveTo(x - width, y);
    context.bezierCurveTo(x - width * 0.55, y - height * 1.35, x + width * 0.5, y - height * 1.22, x + width, y - 1);
    context.stroke();
  }
  if (eyelashes) {
    const outer = x + width * side;
    context.beginPath();
    context.moveTo(outer - side * 2, y - 1);
    context.lineTo(outer + side * 7, y - 6);
    context.moveTo(outer - side * 6, y - 4);
    context.lineTo(outer - side * 2, y - 10);
    context.lineWidth = 2.4;
    context.stroke();
  }
}

function drawMouth(context, pose, skin) {
  const lifted = pose === 'smile' || pose === 'grin' || pose === 'laugh';
  const x = 128;
  const y = 183;
  const width = lifted ? 21 : pose === 'firm' ? 16 : 13;
  const lip = skin >= 9 || skin === 4 ? '#a46165' : '#9f5860';
  context.strokeStyle = lip;
  context.fillStyle = '#7b414e';
  context.lineWidth = 3.1;
  context.beginPath();
  if (pose === 'surprised') {
    context.ellipse(x, y + 1, 9, 11, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    return;
  }
  const tilt = pose === 'curious' ? 5 : 0;
  const curve = lifted ? 15 : pose === 'firm' ? 0 : 4;
  context.moveTo(x - width, y - tilt);
  context.quadraticCurveTo(x - 2, y + curve, x + width, y + tilt);
  if (pose === 'grin' || pose === 'laugh') {
    context.quadraticCurveTo(x + 5, y + (pose === 'laugh' ? 34 : 24), x - width, y - tilt);
    context.closePath();
    context.fill();
    context.save();
    context.clip();
    context.fillStyle = WARM_WHITE;
    context.fillRect(x - width - 1, y - 2, width * 2 + 2, 13);
    context.restore();
  }
  context.stroke();
}

function paintFace(context, look) {
  const { eyeSize } = FACES[look.face];
  const expression = EXPRESSIONS[look.expression];
  const iris = EYES[look.eyes].color;
  const blush = look.detail === 2 || look.detail === 4;
  const eyelashes = look.detail === 3 || look.detail === 4;
  context.clearRect(0, 0, FACE_SIZE, FACE_SIZE);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const [i, x] of [72, 184].entries()) {
    const side = i === 0 ? -1 : 1;
    const key = expression.eyes[i];
    if (blush) {
      const gradient = context.createRadialGradient(x + side * 8, 151, 1, x + side * 8, 151, 25);
      gradient.addColorStop(0, 'rgba(186, 76, 96, .43)');
      gradient.addColorStop(1, 'rgba(186, 76, 96, 0)');
      context.fillStyle = gradient;
      context.fillRect(x - 32, 126, 64, 50);
    }
    if (look.detail === 1) {
      context.fillStyle = 'rgba(102, 53, 42, .64)';
      for (const [dx, dy, radius] of [[0, 0, 2.1], [8, 3, 2.4], [15, 0, 1.9], [20, 5, 1.6], [26, 2, 1.2]]) {
        context.beginPath();
        context.arc(x + side * dx, 146 + dy, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
    const y = 93 + expression.brows[i];
    context.strokeStyle = HAIR_COLORS[look.hairColor].color;
    context.lineWidth = look.face === 3 ? 6.3 : 4.7;
    context.beginPath();
    context.moveTo(x - side * 22, y + (look.expression === 5 ? 5 : 1));
    context.quadraticCurveTo(x + side * 4, y - 14, x + side * 23, y + 2);
    context.stroke();
    drawEye(context, x, 118, eyeSize, key, iris, eyelashes, side);
  }
  context.strokeStyle = 'rgba(123, 70, 56, .46)';
  context.lineWidth = 2.1;
  context.beginPath();
  context.moveTo(122, 152);
  context.quadraticCurveTo(128, 156.5, 134, 152);
  context.stroke();
  drawMouth(context, expression.mouth, look.skin);
}

function makeShapes() {
  return FACES.map(({ taper }) => {
    const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.13);
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const jaw = 1 - (1 - taper) * Math.max(0, -y * 2) ** 1.35;
      position.setX(i, position.getX(i) * jaw);
      normal.setX(i, normal.getX(i) / jaw);
    }
    geometry.normalizeNormals();
    return geometry;
  });
}

const shapes = makeShapes();
const earShape = new RoundedBoxGeometry(1, 1, 1, 1, 0.16);
const maskShape = new THREE.PlaneGeometry(0.363, 0.344);

export function createFace(parent, skin) {
  const head = new THREE.Mesh(shapes[0], skin);
  head.position.y = 1.254;
  head.receiveShadow = true;
  const ears = [-1, 1].map(side => {
    const ear = new THREE.Mesh(earShape, skin);
    ear.position.set(side * 0.196, 1.226, 0.003);
    ear.scale.set(0.046, 0.077, 0.079);
    ear.receiveShadow = true;
    return ear;
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = FACE_SIZE;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const surface = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.025, roughness: 0.66, depthWrite: false });
  const mask = new THREE.Mesh(maskShape, surface);
  mask.rotation.y = Math.PI;
  mask.position.set(0, 1.252, -0.172);
  mask.receiveShadow = true;
  parent.add(head, ...ears, mask);
  let previous = '';
  return look => {
    const face = FACES[look.face];
    skin.color.set(SKINS[look.skin].color);
    head.geometry = shapes[look.face];
    head.scale.set(face.width, 0.353, 0.339);
    mask.scale.x = face.width / FACES[0].width;
    for (const [i, ear] of ears.entries()) ear.position.x = face.width * 0.5 * (i === 0 ? -0.99 : 0.99);
    const key = [look.face, look.skin, look.eyes, look.expression, look.detail, look.hairColor].join(',');
    if (key === previous) return;
    previous = key;
    paintFace(context, look);
    texture.needsUpdate = true;
  };
}
