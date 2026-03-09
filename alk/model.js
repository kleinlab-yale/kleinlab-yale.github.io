const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const stateButtons = [...document.querySelectorAll(".state-button")];
const resetViewButton = document.getElementById("resetView");
const stateTitle = document.getElementById("stateTitle");
const stateBody = document.getElementById("stateBody");
const metricLigand = document.getElementById("metricLigand");
const metricPose = document.getElementById("metricPose");
const metricContact = document.getElementById("metricContact");
const metricActivity = document.getElementById("metricActivity");
const viewerBadge = document.getElementById("viewerBadge");
const viewerBadgeStatus = document.getElementById("viewerBadgeStatus");
const viewerBadgeLabel = document.getElementById("viewerBadgeLabel");

const palette = {
  grd: "#d6b05e",
  egf: "#78c6d8",
  handle: "#df8a71",
  pole: "#f0d99a",
  pxl: "#cb7aa0",
  tm: "#8f90ef",
  kinase: "#185c73",
  ligand: "#43a85f",
  ligandSoft: "#b6e2c1",
  membrane: "#d7d25d",
  contact: "#4f6a79",
};

const stateMeta = {
  apo: {
    title: "Unliganded ALK",
    body:
      "Before ligand binding, ALK is shown as separated monomers whose handle-pole-PXL GRD is not yet organized into the membrane-parallel signaling arrangement. The membrane pocket that later accepts ALKAL is not productively formed, the EGF-like spacer has not yet repositioned, and no symmetric dimer interface is created.",
    metrics: {
      ligand: "None",
      pose: "Undocked",
      contact: "No",
      activity: "Off",
    },
    badgeStatus: "Inactive",
    badgeLabel: "Separated monomers",
    badgeTone: "inactive",
  },
  bound: {
    title: "ALKAL binds in the membrane gap",
    body:
      "The EGF-like domain acts as a spacer between the membrane and the handle, creating a narrow pocket where ALKAL can nest. In this ligand-bound state the two complexes are already arranged as an antiparallel pre-dimer, with the handle of one facing the other protomer's PXL, so only a modest closing motion is needed for signaling.",
    metrics: {
      ligand: "ALKAL bound",
      pose: "Membrane-parallel",
      contact: "Poised",
      activity: "Primed",
    },
    badgeStatus: "Primed",
    badgeLabel: "ALKAL-bound pair",
    badgeTone: "primed",
  },
  dimer: {
    title: "A small exposed ligand patch helps build the symmetric dimer",
    body:
      "With both GRDs lying flat over the membrane, the two complexes line up antiparallel so the handle of one sits beside the PXL of the other. Each ALKAL then spans the interface from its own handle to the opposite protomer's PXL, pulling the transmembrane helices together and turning signaling on.",
    metrics: {
      ligand: "ALKAL x2",
      pose: "Parallel + locked",
      contact: "Yes",
      activity: "On",
    },
    badgeStatus: "Active",
    badgeLabel: "Symmetric dimer",
    badgeTone: "active",
  },
};

const membraneY = -142;

const localPoses = {
  apo: {
    kinase: [0, -132, 0],
    tmBase: [0, -40, 0],
    tm: [0, 0, 0],
    egfBase: [0, 24, 0],
    egfTop: [10, 72, 8],
    handle: [26, 116, 18],
    pole: [20, 166, 54],
    pxl: [14, 190, 92],
    ligandBase: [36, 126, 14],
    ligandMid: [58, 128, 14],
    ligandTip: [82, 130, 14],
  },
  boundLeft: {
    kinase: [0, -132, 0],
    tmBase: [0, -40, 0],
    tm: [0, 0, 0],
    egfBase: [0, 24, 0],
    egfTop: [16, 76, -18],
    handle: [34, 92, -24],
    pole: [34, 94, 0],
    pxl: [34, 92, 24],
    ligandBase: [38, 90, -24],
    ligandMid: [66, 92, -24],
    ligandTip: [96, 94, -24],
  },
  boundRight: {
    kinase: [0, -132, 0],
    tmBase: [0, -40, 0],
    tm: [0, 0, 0],
    egfBase: [0, 24, 0],
    egfTop: [16, 76, 18],
    handle: [34, 92, 24],
    pole: [34, 94, 0],
    pxl: [34, 92, -24],
    ligandBase: [38, 90, 24],
    ligandMid: [66, 92, 24],
    ligandTip: [96, 94, 24],
  },
  dimerLeft: {
    kinase: [54, -132, 0],
    tmBase: [50, -40, 0],
    tm: [52, 0, 0],
    egfBase: [48, 24, 0],
    egfTop: [46, 78, -18],
    handle: [42, 92, -24],
    pole: [42, 94, 0],
    pxl: [42, 92, 24],
    ligandBase: [46, 90, -24],
    ligandMid: [74, 92, -24],
    ligandTip: [104, 94, -24],
  },
  dimerRight: {
    kinase: [54, -132, 0],
    tmBase: [50, -40, 0],
    tm: [52, 0, 0],
    egfBase: [48, 24, 0],
    egfTop: [46, 78, 18],
    handle: [42, 92, 24],
    pole: [42, 94, 0],
    pxl: [42, 92, -24],
    ligandBase: [46, 90, 24],
    ligandMid: [74, 92, 24],
    ligandTip: [104, 94, 24],
  },
};

const sceneSpecs = {
  apo: {
    pose: "apo",
    ligandAlpha: 0,
    gapAlpha: 0,
    contactAlpha: 0,
    kinaseGlow: 0,
    receptors: [
      { anchor: [-230, membraneY, -44], yaw: -0.68, direction: -1 },
      { anchor: [230, membraneY, 44], yaw: 0.68, direction: 1 },
    ],
  },
  bound: {
    ligandAlpha: 1,
    gapAlpha: 1,
    contactAlpha: 0,
    kinaseGlow: 0,
    receptors: [
      { anchor: [-98, membraneY, 0], yaw: -0.08, direction: 1, pose: "boundLeft" },
      { anchor: [98, membraneY, 0], yaw: 0.08, direction: -1, pose: "boundRight" },
    ],
  },
  dimer: {
    ligandAlpha: 1,
    gapAlpha: 1,
    contactAlpha: 1,
    kinaseGlow: 1,
    receptors: [
      { anchor: [-56, membraneY, 0], yaw: -0.08, direction: 1, pose: "dimerLeft" },
      { anchor: [56, membraneY, 0], yaw: 0.08, direction: -1, pose: "dimerRight" },
    ],
  },
};

const nodeStyles = {
  kinase: { radius: 24, color: palette.kinase },
  tmBase: { radius: 8, color: palette.tm },
  tm: { radius: 10, color: palette.tm },
  egfBase: { radius: 10, color: palette.egf },
  egfTop: { radius: 13, color: palette.egf },
  handle: { radius: 18, color: palette.handle },
  pole: { radius: 14, color: palette.pole },
  pxl: { radius: 13, color: palette.pxl },
};

const defaultView = Object.freeze({
  yaw: 0.08,
  pitch: 0.48,
  zoom: 1.02,
  centerYFactor: 0.58,
});

const view = {
  yaw: defaultView.yaw,
  pitch: defaultView.pitch,
  zoom: defaultView.zoom,
  centerYFactor: defaultView.centerYFactor,
};

const pointer = {
  dragging: false,
  x: 0,
  y: 0,
  hoverX: 0,
  hoverY: 0,
  hoverActive: false,
};

let activeState = "apo";
let fromState = "apo";
let transitionStart = 0;
let transitionDuration = 900;
let width = 0;
let height = 0;
let deviceScale = Math.min(window.devicePixelRatio || 1, 2);
const labelIndex = 0;
const ligandLength = 52;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function mixVec(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function rotateY(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    point[0] * cos - point[2] * sin,
    point[1],
    point[0] * sin + point[2] * cos,
  ];
}

function transformLocal(anchor, local, yaw, direction) {
  return add(anchor, rotateY([local[0] * direction, local[1], local[2]], yaw));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function parseColor(color) {
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }

  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    throw new Error(`Unsupported color format: ${color}`);
  }

  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
  };
}

function tint(color, amount) {
  const { r, g, b } = parseColor(color);
  const mix = amount >= 0 ? 255 : 0;
  const strength = Math.abs(amount);
  return `rgb(${Math.round(r + (mix - r) * strength)}, ${Math.round(g + (mix - g) * strength)}, ${Math.round(b + (mix - b) * strength)})`;
}

function rgba(color, alpha) {
  const { r, g, b } = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function averagePoint(points) {
  return points.reduce((sum, point) => add(sum, point), [0, 0, 0]).map((value) => value / points.length);
}

function rotatePoint(point) {
  const cosY = Math.cos(view.yaw);
  const sinY = Math.sin(view.yaw);
  const x1 = point[0] * cosY - point[2] * sinY;
  const z1 = point[0] * sinY + point[2] * cosY;

  const cosX = Math.cos(view.pitch);
  const sinX = Math.sin(view.pitch);
  const y2 = point[1] * cosX - z1 * sinX;
  const z2 = point[1] * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

function project(point) {
  const rotated = rotatePoint(point);
  const camera = 1100;
  const scale = camera / (camera - rotated.z);
  const zoomScale = scale * view.zoom;
  const centerY = height * view.centerYFactor;
  return {
    x: width / 2 + rotated.x * zoomScale,
    y: centerY - rotated.y * zoomScale,
    scale: zoomScale,
    depth: rotated.z,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * deviceScale;
  canvas.height = height * deviceScale;
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
}

function buildReceptor(spec, poseName) {
  const pose = localPoses[poseName];
  const nodes = {};

  Object.entries(pose).forEach(([key, value]) => {
    nodes[key] = transformLocal(spec.anchor, value, spec.yaw, spec.direction);
  });

  return { nodes };
}

function buildScene(stateName) {
  const spec = sceneSpecs[stateName];
  return {
    ligandAlpha: spec.ligandAlpha,
    gapAlpha: spec.gapAlpha,
    contactAlpha: spec.contactAlpha,
    kinaseGlow: spec.kinaseGlow,
    receptors: spec.receptors.map((receptor) => buildReceptor(receptor, receptor.pose || spec.pose)),
  };
}

function buildInterfaceLigands(receptors) {
  if (receptors.length !== 2) {
    return [];
  }

  return receptors.map((receptor, index) => {
    const base = receptor.nodes.handle;
    const target = receptors[(index + 1) % 2].nodes.pxl;
    const direction = normalize(subtract(target, base));
    return {
      base,
      mid: add(base, scaleVec(direction, ligandLength * 0.54)),
      tip: add(base, scaleVec(direction, ligandLength)),
    };
  });
}

function mixReceptor(a, b, t) {
  const nodes = {};
  const keys = new Set([...Object.keys(a.nodes), ...Object.keys(b.nodes)]);

  keys.forEach((key) => {
    const fromNode = a.nodes[key] || b.nodes[key];
    const toNode = b.nodes[key] || a.nodes[key];
    nodes[key] = mixVec(fromNode, toNode, t);
  });

  return { nodes };
}

function setState(nextState) {
  if (nextState === activeState) {
    return;
  }

  fromState = activeState;
  activeState = nextState;
  transitionStart = performance.now();
  applyViewText();
  stateButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.state === nextState);
  });
}

function applyViewText() {
  const meta = stateMeta[activeState];
  stateTitle.textContent = meta.title;
  stateBody.textContent = meta.body;
  metricLigand.textContent = meta.metrics.ligand;
  metricPose.textContent = meta.metrics.pose;
  metricContact.textContent = meta.metrics.contact;
  metricActivity.textContent = meta.metrics.activity;
  viewerBadgeStatus.textContent = meta.badgeStatus;
  viewerBadgeLabel.textContent = meta.badgeLabel;
  viewerBadge.classList.toggle("state-badge--inactive", meta.badgeTone === "inactive");
  viewerBadge.classList.toggle("state-badge--primed", meta.badgeTone === "primed");
  viewerBadge.classList.toggle("state-badge--active", meta.badgeTone === "active");
}

function pushSegment(commands, a, b, color, widthUnits, alpha = 1) {
  commands.push({
    type: "segment",
    a,
    b,
    color,
    widthUnits,
    alpha,
    depth: (a.depth + b.depth) * 0.5,
  });
}

function pushSphere(commands, point, radiusUnits, color, alpha = 1) {
  commands.push({
    type: "sphere",
    point,
    radiusUnits,
    color,
    alpha,
    depth: point.depth,
  });
}

function pushGapHalo(commands, center, angle, radiusXUnits, radiusYUnits, alpha = 1) {
  commands.push({
    type: "gapHalo",
    center,
    angle,
    radiusXUnits,
    radiusYUnits,
    alpha,
    depth: center.depth - 4,
  });
}

function pushLigand(commands, base, mid, tip, alpha = 1) {
  commands.push({
    type: "ligand",
    base,
    mid,
    tip,
    alpha,
    depth: (base.depth + mid.depth + tip.depth) / 3,
  });
}

function pushBridge(commands, a, b, alpha = 1) {
  commands.push({
    type: "bridge",
    a,
    b,
    alpha,
    depth: (a.depth + b.depth) * 0.5,
  });
}

function pushKinaseGlow(commands, point, radiusUnits, alpha = 1) {
  commands.push({
    type: "kinaseGlow",
    point,
    radiusUnits,
    alpha,
    depth: point.depth - 5,
  });
}

function pushLabel(labels, point, text, color, offsetX, offsetY) {
  labels.push({
    point,
    text,
    color,
    offsetX,
    offsetY,
  });
}

function labelOffsets(point, distance, rise = 0) {
  const direction = point.x < width * 0.5 ? -1 : 1;
  return [direction * distance, rise];
}

function drawMembrane() {
  const corners = [
    [-520, membraneY, -280],
    [520, membraneY, -280],
    [520, membraneY, 280],
    [-520, membraneY, 280],
  ].map(project);

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, corners[0].y, 0, corners[2].y);
  fill.addColorStop(0, rgba(palette.membrane, 0.96));
  fill.addColorStop(1, rgba(tint(palette.membrane, -0.14), 0.98));
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.strokeStyle = rgba("#827b20", 0.56);
  ctx.lineWidth = 2;
  ctx.stroke();

  const stripeCount = 7;
  for (let index = 1; index < stripeCount; index += 1) {
    const t = index / stripeCount;
    const left = {
      x: lerp(corners[0].x, corners[3].x, t),
      y: lerp(corners[0].y, corners[3].y, t),
    };
    const right = {
      x: lerp(corners[1].x, corners[2].x, t),
      y: lerp(corners[1].y, corners[2].y, t),
    };
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.strokeStyle = `rgba(130, 123, 32, ${0.05 + (1 - t) * 0.03})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function strokeRoundedPath(points, widthPx, color, alpha) {
  if (points.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const midX = (points[index].x + points[index + 1].x) * 0.5;
    const midY = (points[index].y + points[index + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[index].x, points[index].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = widthPx;
  ctx.stroke();
}

function drawSegment(command) {
  const widthPx = Math.max(2, ((command.a.scale + command.b.scale) * 0.5) * command.widthUnits);
  ctx.beginPath();
  ctx.moveTo(command.a.x, command.a.y);
  ctx.lineTo(command.b.x, command.b.y);
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(command.color, command.alpha);
  ctx.lineWidth = widthPx;
  ctx.stroke();

  const gloss = ctx.createLinearGradient(command.a.x, command.a.y, command.b.x, command.b.y);
  gloss.addColorStop(0, rgba(tint(command.color, 0.15), command.alpha * 0.48));
  gloss.addColorStop(1, rgba(tint(command.color, -0.18), command.alpha * 0.56));
  ctx.strokeStyle = gloss;
  ctx.lineWidth = Math.max(1, widthPx * 0.58);
  ctx.stroke();

  ctx.strokeStyle = rgba("#ffffff", command.alpha * 0.13);
  ctx.lineWidth = Math.max(1, widthPx * 0.16);
  ctx.stroke();
}

function drawSphere(command) {
  const radius = Math.max(2, command.radiusUnits * command.point.scale);
  const x = command.point.x;
  const y = command.point.y;
  const gradient = ctx.createRadialGradient(
    x - radius * 0.36,
    y - radius * 0.38,
    radius * 0.12,
    x,
    y,
    radius
  );

  gradient.addColorStop(0, rgba(tint(command.color, 0.28), command.alpha));
  gradient.addColorStop(0.52, rgba(command.color, command.alpha));
  gradient.addColorStop(1, rgba(tint(command.color, -0.18), command.alpha));

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = rgba("#ffffff", command.alpha * 0.22);
  ctx.lineWidth = Math.max(1, radius * 0.08);
  ctx.stroke();
}

function drawGapHalo(command) {
  const radiusX = Math.max(12, command.radiusXUnits * command.center.scale);
  const radiusY = Math.max(8, command.radiusYUnits * command.center.scale);
  const gradient = ctx.createRadialGradient(
    command.center.x,
    command.center.y,
    radiusX * 0.14,
    command.center.x,
    command.center.y,
    radiusX
  );
  gradient.addColorStop(0, `rgba(120, 198, 216, ${command.alpha * 0.28})`);
  gradient.addColorStop(0.55, `rgba(214, 176, 94, ${command.alpha * 0.2})`);
  gradient.addColorStop(1, "rgba(214, 176, 94, 0)");

  ctx.save();
  ctx.translate(command.center.x, command.center.y);
  ctx.rotate(command.angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawLigand(command) {
  const avgScale = (command.base.scale + command.mid.scale + command.tip.scale) / 3;
  const widthPx = Math.max(8, avgScale * 15);
  const path = [command.base, command.mid, command.tip];

  strokeRoundedPath(path, widthPx + 3, palette.ligandSoft, command.alpha);
  strokeRoundedPath(path, widthPx, palette.ligand, command.alpha);
  strokeRoundedPath(path, Math.max(3, widthPx * 0.28), "#f3f4f7", command.alpha * 0.24);

  ctx.beginPath();
  ctx.arc(command.tip.x, command.tip.y, Math.max(3, avgScale * 5.5), 0, Math.PI * 2);
  ctx.fillStyle = rgba(tint(palette.ligand, 0.18), command.alpha);
  ctx.fill();
}

function drawBridge(command) {
  const control = {
    x: (command.a.x + command.b.x) * 0.5,
    y: Math.min(command.a.y, command.b.y) - 10,
  };
  const widthPx = Math.max(2, ((command.a.scale + command.b.scale) * 0.5) * 5.2);
  const guide = [command.a, control, command.b];
  strokeRoundedPath(guide, widthPx, palette.contact, command.alpha * 0.7);
  strokeRoundedPath(guide, Math.max(1, widthPx * 0.28), "#ffffff", command.alpha * 0.16);

  ctx.beginPath();
  ctx.arc(control.x, control.y, Math.max(2, widthPx * 0.32), 0, Math.PI * 2);
  ctx.fillStyle = rgba(tint(palette.contact, 0.18), command.alpha);
  ctx.fill();
}

function drawKinaseGlow(command) {
  const radius = Math.max(10, command.radiusUnits * command.point.scale);
  const gradient = ctx.createRadialGradient(
    command.point.x,
    command.point.y,
    radius * 0.16,
    command.point.x,
    command.point.y,
    radius
  );
  gradient.addColorStop(0, `rgba(72, 212, 106, ${command.alpha * 1.18})`);
  gradient.addColorStop(0.5, `rgba(72, 212, 106, ${command.alpha * 0.42})`);
  gradient.addColorStop(1, "rgba(72, 212, 106, 0)");

  ctx.beginPath();
  ctx.arc(command.point.x, command.point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawLabel(command) {
  ctx.save();
  ctx.font = "600 16px Avenir Next, Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  const x = command.point.x + command.offsetX;
  const y = command.point.y + command.offsetY;
  const paddingX = 10;
  const boxHeight = 28;
  const metrics = ctx.measureText(command.text);
  const boxWidth = metrics.width + paddingX * 2;

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x - paddingX, y - boxHeight / 2, boxWidth, boxHeight, 14);
  } else {
    const left = x - paddingX;
    const top = y - boxHeight / 2;
    const right = left + boxWidth;
    const bottom = top + boxHeight;
    const radius = 14;
    ctx.moveTo(left + radius, top);
    ctx.lineTo(right - radius, top);
    ctx.quadraticCurveTo(right, top, right, top + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(left + radius, bottom);
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.fill();
  ctx.strokeStyle = "rgba(30, 36, 44, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = command.color;
  ctx.fillText(command.text, x, y + 0.5);
  ctx.restore();
}

function drawBackground(now) {
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(252, 252, 250, 0.97)");
  wash.addColorStop(1, "rgba(220, 221, 224, 0.82)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  const pulse = 0.2 + Math.sin(now * 0.0011) * 0.03;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.18 + pulse})`;
  ctx.beginPath();
  ctx.ellipse(width * 0.18, height * 0.18, width * 0.17, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(55, 67, 82, 0.04)";
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.82, width * 0.28, height * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hoverLabel(commands, hoverCandidates) {
  if (!pointer.hoverActive || pointer.dragging) {
    return;
  }

  let best = null;
  let bestDistance = Infinity;

  hoverCandidates.forEach((candidate) => {
    const dx = pointer.hoverX - candidate.point.x;
    const dy = pointer.hoverY - candidate.point.y;
    const distance = Math.hypot(dx, dy);
    const threshold = candidate.threshold || 28;
    if (distance < threshold && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  });

  if (!best) {
    return;
  }

  const [offsetX, offsetY] = best.offsets || labelOffsets(best.point, 22, -24);
  pushLabel(commands, best.point, best.text, best.color, offsetX, offsetY);
}

function buildCommands(now) {
  const progressRaw = clamp((now - transitionStart) / transitionDuration, 0, 1);
  const progress = smoothstep(progressRaw);
  const fromScene = buildScene(fromState);
  const toScene = buildScene(activeState);
  const commands = [];
  const labels = [];
  const hoverCandidates = [];
  const receptors = fromScene.receptors.map((receptor, index) => mixReceptor(receptor, toScene.receptors[index], progress));
  const ligandAlpha = lerp(fromScene.ligandAlpha, toScene.ligandAlpha, progress);
  const gapAlpha = lerp(fromScene.gapAlpha, toScene.gapAlpha, progress);
  const contactAlpha = lerp(fromScene.contactAlpha, toScene.contactAlpha, progress);
  const kinaseGlow = lerp(fromScene.kinaseGlow, toScene.kinaseGlow, progress);
  const interfaceLigands = ligandAlpha > 0.02 ? buildInterfaceLigands(receptors) : [];

  receptors.forEach((receptor, index) => {
    const projected = {};
    Object.entries(receptor.nodes).forEach(([key, value]) => {
      projected[key] = project(value);
    });
    const ligand = interfaceLigands[index] || null;
    const projectedLigand = ligand
      ? {
          base: project(ligand.base),
          mid: project(ligand.mid),
          tip: project(ligand.tip),
        }
      : null;

    pushSegment(commands, projected.kinase, projected.tmBase, palette.kinase, 22, 0.88);
    pushSegment(commands, projected.tmBase, projected.tm, palette.tm, 10, 0.94);
    pushSegment(commands, projected.tm, projected.egfBase, palette.egf, 10, 0.94);
    pushSegment(commands, projected.egfBase, projected.egfTop, palette.egf, 12, 0.96);
    pushSegment(commands, projected.egfTop, projected.handle, palette.egf, 8, 0.88);
    pushSegment(commands, projected.handle, projected.pole, palette.grd, 16, 0.96);
    pushSegment(commands, projected.pole, projected.pxl, palette.grd, 15, 0.96);

    Object.entries(nodeStyles).forEach(([key, style]) => {
      pushSphere(commands, projected[key], style.radius, style.color);
    });

    if (gapAlpha > 0.02) {
      const gapCenterWorld = averagePoint([
        ligand ? ligand.mid : receptor.nodes.handle,
        receptor.nodes.handle,
        mixVec(receptor.nodes.tm, receptor.nodes.handle, 0.5),
      ]);
      const gapAxisWorld = subtract(receptor.nodes.pxl, receptor.nodes.handle);
      const gapCenter = project(gapCenterWorld);
      const axisPoint = project(add(gapCenterWorld, scaleVec(normalize(gapAxisWorld), 40)));
      pushGapHalo(
        commands,
        gapCenter,
        Math.atan2(axisPoint.y - gapCenter.y, axisPoint.x - gapCenter.x),
        42,
        18,
        gapAlpha * 0.8
      );
    }

    if (projectedLigand) {
      pushLigand(commands, projectedLigand.base, projectedLigand.mid, projectedLigand.tip, ligandAlpha);
      hoverCandidates.push({
        point: projectedLigand.mid,
        text: "ALKAL",
        color: palette.ligand,
      });
    }

    hoverCandidates.push(
      {
        point: projected.handle,
        text: "Handle",
        color: palette.handle,
        threshold: 32,
      },
      {
        point: projected.egfTop,
        text: "EGF-like domain",
        color: palette.egf,
      },
      {
        point: projected.pole,
        text: "Pole",
        color: palette.pole,
      },
      {
        point: projected.pxl,
        text: "PXL",
        color: palette.pxl,
      },
      {
        point: projected.tm,
        text: "TM helix",
        color: palette.tm,
      },
      {
        point: projected.kinase,
        text: "Kinase",
        color: palette.kinase,
      }
    );

    if (kinaseGlow > 0.02) {
      pushKinaseGlow(commands, projected.kinase, 42, kinaseGlow * 0.28);
    }

    if (index === labelIndex) {
      const [egfX, egfY] = labelOffsets(projected.egfTop, 128, -34);
      const [handleX, handleY] = labelOffsets(projected.handle, 138, -10);
      const [poleX, poleY] = labelOffsets(projected.pole, 132, 6);
      const [pxlX, pxlY] = labelOffsets(projected.pxl, 126, 26);
      const [tmX, tmY] = labelOffsets(projected.tm, 116, 10);
      const [kinaseX, kinaseY] = labelOffsets(projected.kinase, 116, 22);

      pushLabel(labels, projected.egfTop, "EGF-like domain", palette.egf, egfX, egfY);
      pushLabel(labels, projected.handle, "Handle", palette.handle, handleX, handleY);
      pushLabel(labels, projected.pole, "Pole", palette.pole, poleX, poleY);
      pushLabel(labels, projected.pxl, "PXL", palette.pxl, pxlX, pxlY);
      pushLabel(labels, projected.tm, "TM helix", palette.tm, tmX, tmY);
      pushLabel(labels, projected.kinase, "Kinase", palette.kinase, kinaseX, kinaseY);

      if (projectedLigand) {
        const [ligandX, ligandY] = labelOffsets(projectedLigand.mid, 138, -26);
        pushLabel(labels, projectedLigand.mid, "ALKAL", palette.ligand, ligandX, ligandY);
      }
    }
  });

  if (receptors[labelIndex]) {
    const membranePoint = project([-250, membraneY, 0]);
    pushLabel(labels, membranePoint, "Membrane", palette.membrane, -12, -16);
  }

  hoverLabel(labels, hoverCandidates);
  commands.sort((a, b) => a.depth - b.depth);

  return { commands, labels };
}

function render(now) {
  drawBackground(now);
  drawMembrane();
  const { commands, labels } = buildCommands(now);

  commands.forEach((command) => {
    if (command.type === "segment") {
      drawSegment(command);
    } else if (command.type === "sphere") {
      drawSphere(command);
    } else if (command.type === "gapHalo") {
      drawGapHalo(command);
    } else if (command.type === "ligand") {
      drawLigand(command);
    } else if (command.type === "bridge") {
      drawBridge(command);
    } else if (command.type === "kinaseGlow") {
      drawKinaseGlow(command);
    }
  });

  labels.forEach(drawLabel);
  requestAnimationFrame(render);
}

function onPointerDown(event) {
  pointer.dragging = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.hoverX = event.offsetX;
  pointer.hoverY = event.offsetY;
  pointer.hoverActive = true;
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  pointer.hoverX = event.offsetX;
  pointer.hoverY = event.offsetY;
  pointer.hoverActive = true;

  if (!pointer.dragging) {
    return;
  }

  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  view.yaw += dx * 0.008;
  view.pitch = clamp(view.pitch + dy * 0.006, -0.2, 1.0);
}

function onPointerUp(event) {
  pointer.dragging = false;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function onPointerLeave(event) {
  pointer.dragging = false;
  pointer.hoverActive = false;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function onWheel(event) {
  event.preventDefault();
  view.zoom = clamp(view.zoom - event.deltaY * 0.0009, 0.58, 1.65);
}

function resetView() {
  view.yaw = defaultView.yaw;
  view.pitch = defaultView.pitch;
  view.zoom = defaultView.zoom;
  view.centerYFactor = defaultView.centerYFactor;
}

stateButtons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

resetViewButton.addEventListener("click", resetView);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointerleave", onPointerLeave);
canvas.addEventListener("wheel", onWheel, { passive: false });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
applyViewText();
requestAnimationFrame(render);
