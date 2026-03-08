const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const stateButtons = [...document.querySelectorAll(".state-button")];
const antibodyButtons = [...document.querySelectorAll(".antibody-button")];
const resetViewButton = document.getElementById("resetView");
const stateTitle = document.getElementById("stateTitle");
const stateBody = document.getElementById("stateBody");
const metricLigand = document.getElementById("metricLigand");
const metricLeg = document.getElementById("metricLeg");
const metricOligomer = document.getElementById("metricOligomer");
const metricActivity = document.getElementById("metricActivity");
const viewerBadge = document.getElementById("viewerBadge");
const viewerBadgeStatus = document.getElementById("viewerBadgeStatus");
const viewerBadgeLabel = document.getElementById("viewerBadgeLabel");

const palette = {
  propeller: "#edd47c",
  hand: "#d77faf",
  arm: "#d77faf",
  leg: "#8c8df0",
  kinase: "#134e8f",
  ligand: "#343338",
  ligandSoft: "#8d9098",
  ligandBlade: "#d7d9df",
  ligandBladeEdge: "#9ea2aa",
  rx5: "#ff4048",
  ct4: "#ff7864",
  membrane: "#d8d44d",
};

const baseStates = {
  inactive: {
    title: "Unliganded ROS1",
    body:
      "The small CATCH hand is tucked into a pocket around the hip beta-propeller. The arm and hand behave like a rigid unit around the shoulder pivot, the leg stays constrained, and ROS1 remains inactive.",
    metrics: {
      ligand: "None",
      leg: "Constrained",
      oligomer: "No",
      activity: "Off",
    },
  },
  clustered: {
    title: "NELL2 binding through site 1",
    body:
      "The rigid NELL2 trimer engages the strong site-1 interaction on YWTD-A, but the ROS1 arm has not yet flipped up as a rigid body to add site 2 on FNIII-2 and site 3 on FNIII-1. CATCH remains parked in the hip pocket, so clustering alone is not enough to activate the receptor.",
    metrics: {
      ligand: "Site 1",
      leg: "Constrained",
      oligomer: "Yes",
      activity: "Off",
    },
  },
  active: {
    title: "NELL2 engages sites 1, 2, and 3",
    body:
      "The rigid NELL2 trimer remains anchored at the strong site-1 interaction on YWTD-A while the ROS1 arm flips up as a rigid CATCH plus FNIII-1/2 body, adding site 2 on FNIII-2 and site 3 on FNIII-1. CATCH does not contact ligand; it simply releases from the YWTD-B pocket, allowing the legs to come closer together so the transmembrane and kinase regions can engage and activate.",
    metrics: {
      ligand: "Sites 1/2/3",
      leg: "Dynamic",
      oligomer: "Yes",
      activity: "On",
    },
  },
};

function buildProfile(state, antibody) {
  if (antibody === "rx5") {
    if (state === "inactive") {
      return {
        title: "RX5 occupies the site-1 epitope",
        body:
          "RX5 sits over the NELL2 site-1 epitope on YWTD-A, precluding productive ligand engagement before clustering can begin.",
        metrics: {
          ligand: "RX5 bound",
          leg: "Constrained",
          oligomer: "No",
          activity: "Off",
        },
        geometryState: "inactive",
        ligandMode: "none",
        showRX5: true,
        showCT4: false,
      };
    }

    return {
      title: "RX5 blocks NELL2 site 1",
      body:
        "RX5 masks ligand epitope 1 on YWTD-A, so NELL2 cannot engage site 1 productively and remains unbound off to the side. ROS1 therefore fails to cluster and never reaches the active geometry.",
      metrics: {
        ligand: "Site 1 blocked",
        leg: "Constrained",
        oligomer: "No",
        activity: "Off",
      },
      geometryState: "inactive",
      ligandMode: "blocked",
      showRX5: true,
      showCT4: false,
    };
  }

  if (antibody === "ct4") {
    if (state === "active") {
      return {
        title: "CT4 traps a pre-active assembly",
        body:
          "CT4 binds between the FNIII arm and YWTD-A shoulder, so the arm-hand rigid body cannot release and swing upward to add site 2 on FNIII-2 and site 3 on FNIII-1. ROS1 can still form a site-1-driven cluster, but the transmembrane and kinase regions never fully converge.",
        metrics: {
          ligand: "Site 1 trapped",
          leg: "Constrained",
          oligomer: "Yes",
          activity: "Off",
        },
        geometryState: "clustered",
        ligandMode: "site1",
        showRX5: false,
        showCT4: true,
      };
    }

    if (state === "clustered") {
      return {
        title: "CT4 clamps the arm to the shoulder",
        body:
          "With CT4 bound between the arm and YWTD-A shoulder, NELL2 can still collect ROS1 into a cluster through site 1, but the rigid arm remains pocketed, sites 2 and 3 cannot be added, and activation does not proceed.",
        metrics: {
          ligand: "Site 1",
          leg: "Constrained",
          oligomer: "Yes",
          activity: "Off",
        },
        geometryState: "clustered",
        ligandMode: "site1",
        showRX5: false,
        showCT4: true,
      };
    }

    return {
      title: "CT4 reinforces the inactive clamp",
      body:
        "CT4 binds between the FNIII arm and YWTD-A shoulder, reinforcing the pocketed inactive state and opposing the arm-release step needed for activation.",
      metrics: {
        ligand: "CT4 bound",
        leg: "Constrained",
        oligomer: "No",
        activity: "Off",
      },
      geometryState: "inactive",
      ligandMode: "none",
      showRX5: false,
      showCT4: true,
    };
  }

  return {
    ...baseStates[state],
    geometryState: state,
    ligandMode: state === "inactive" ? "none" : state === "clustered" ? "site1" : "full",
    showRX5: false,
    showCT4: false,
  };
}

const nodeStyles = {
  shoulder: { radius: 34, color: palette.propeller },
  upper: { radius: 18, color: palette.leg },
  hip: { radius: 30, color: palette.leg },
  mid1: { radius: 18, color: palette.leg },
  mid2: { radius: 18, color: palette.leg },
  knee: { radius: 28, color: palette.leg },
  low1: { radius: 18, color: palette.leg },
  low2: { radius: 18, color: palette.leg },
  low3: { radius: 16, color: palette.leg },
  low4: { radius: 16, color: palette.leg },
  tm: { radius: 10, color: palette.leg },
  kinase: { radius: 30, color: palette.kinase },
  armProx: { radius: 16, color: palette.arm },
  armDist: { radius: 16, color: palette.arm },
  hand: { radius: 12, color: palette.hand },
};

const structureScale = 2.4;
const structureTmDrop = 56;
const structureKinaseDrop = 116;

const clusteredStructureRaw = {
  hand: [75.2, -57.0, -8.6],
  armDist: [54.9, -57.7, 0.0],
  armProx: [20.8, -4.6, 13.6],
  site1: [34.7, -56.5, -32.0],
  shoulder: [0.0, 0.0, 0.0],
  upper: [22.4, 0.6, 11.3],
  hip: [7.4, 64.6, 6.8],
  mid1: [40.2, 58.9, -17.8],
  mid2: [38.5, 116.2, -23.6],
  knee: [43.3, 153.1, -35.4],
  low1: [15.3, 159.5, -55.2],
  low2: [34.7, 164.6, -45.3],
  low3: [14.1, 226.0, -15.7],
  low4: [0.0, 238.4, 0.0],
};

const activeProtomer1Raw = {
  hand: [103.7, -76.3, -17.6],
  armDist: [103.0, -63.7, 0.0],
  armProx: [5.5, -3.7, 24.5],
  site1: [42.8, -55.9, -26.0],
  shoulder: [0.0, 0.0, 0.0],
  upper: [27.8, -29.9, -67.2],
  hip: [100.7, 59.7, -29.9],
  mid1: [-11.3, 26.9, -61.4],
  mid2: [88.4, 82.5, -96.1],
  knee: [-41.7, 111.8, -69.4],
  low1: [58.2, 155.1, -26.9],
  low2: [-42.7, 125.4, -69.6],
  low3: [-55.2, 170.2, -130.1],
  low4: [0.0, 237.9, 0.0],
};

const activeProtomer2Raw = {
  hand: [100.8, -79.0, -18.1],
  armDist: [99.8, -67.2, -0.0],
  armProx: [4.1, -3.7, 24.8],
  site1: [78.1, -43.6, 2.5],
  shoulder: [0.0, 0.0, 0.0],
  upper: [33.9, -29.3, -71.4],
  hip: [3.0, 61.0, 4.8],
  mid1: [98.2, 36.7, -59.0],
  mid2: [49.6, 114.6, 7.3],
  knee: [87.7, 104.6, -118.0],
  low1: [-19.5, 130.6, -75.3],
  low2: [-39.9, 124.2, -79.3],
  low3: [-44.6, 170.9, -139.5],
  low4: [0.0, 237.9, 0.0],
};

const activeProtomer3Raw = {
  hand: [98.9, -81.0, -17.8],
  armDist: [98.9, -68.7, 0.0],
  armProx: [3.0, -3.7, 25.0],
  site1: [30.4, -41.4, 17.9],
  shoulder: [0.0, 0.0, 0.0],
  upper: [34.9, -30.5, -68.5],
  hip: [27.9, 27.4, -89.5],
  mid1: [39.0, 62.9, 24.9],
  mid2: [-18.6, 78.4, -72.7],
  knee: [63.4, 148.0, 5.7],
  low1: [67.1, 121.8, -112.7],
  low2: [-36.9, 124.1, -73.2],
  low3: [-45.6, 169.8, -133.7],
  low4: [-0.0, 237.9, -0.0],
};

const nell2TrimerModel = {
  A: [
    [55.858, 26.472, 34.383],
    [73.002, 21.444, 32.157],
    [103.384, 13.763, 21.25],
    [97.781, 20.22, 12.307],
    [85.094, 22.8, 11.439],
    [55.943, 37.904, 16.233],
    [51.151, 27.683, 0.72],
    [23.317, 23.968, 1.316],
  ],
  B: [
    [35.148, 28.919, 54.639],
    [38.48, 46.476, 56.384],
    [37.627, 79.405, 60.45],
    [26.235, 75.042, 62.621],
    [21.489, 63.265, 59.403],
    [15.489, 30.76, 61.706],
    [2.822, 34.55, 47.773],
    [-1.431, 10.732, 33.602],
  ],
  C: [
    [49.503, 3.841, 51.828],
    [47.533, 0.096, 69.225],
    [41.519, -12.828, 99.052],
    [41.81, -22.105, 90.967],
    [41.187, -21.296, 77.902],
    [50.847, -17.088, 46.369],
    [33.39, -24.324, 42.52],
    [26.104, -15.948, 16.434],
  ],
};

function finalizeStructureLocal(raw) {
  const local = {};

  Object.entries(raw).forEach(([key, point]) => {
    local[key] = [point[0] * structureScale, -point[1] * structureScale, point[2] * structureScale];
  });

  local.tm = [local.low4[0], local.low4[1] - structureTmDrop, local.low4[2]];
  local.kinase = [local.tm[0], local.tm[1] - structureKinaseDrop, local.tm[2]];

  return local;
}

const clusteredStructureLocal = finalizeStructureLocal(clusteredStructureRaw);
const activeStructureLocals = [
  finalizeStructureLocal(activeProtomer1Raw),
  finalizeStructureLocal(activeProtomer2Raw),
  finalizeStructureLocal(activeProtomer3Raw),
];

const armExtendedLocal = {
  armProx: [26, 18, 20],
  armDist: [58, 72, 28],
  hand: [82, 128, 30],
};

const armSwingRadians = (130 * Math.PI) / 180;

const bentLocal = {
  upper: [20, -52, 10],
  hip: [40, -110, 18],
  mid1: [22, -166, 8],
  mid2: [6, -222, -8],
  knee: [18, -278, -6],
  low1: [8, -332, 0],
  low2: [0, -384, -4],
  low3: [-6, -432, -6],
  low4: [0, -478, -4],
  tm: [2, -520, -2],
  kinase: [26, -620, -10],
  ...buildArmPoseLocal(0),
};

const inactiveLegScale = 1.44;
const inactiveBentLocal = {
  ...bentLocal,
  upper: scaleVec(bentLocal.upper, inactiveLegScale),
  hip: scaleVec(bentLocal.hip, inactiveLegScale),
  mid1: scaleVec(bentLocal.mid1, inactiveLegScale),
  mid2: scaleVec(bentLocal.mid2, inactiveLegScale),
  knee: scaleVec(bentLocal.knee, inactiveLegScale),
  low1: scaleVec(bentLocal.low1, inactiveLegScale),
  low2: scaleVec(bentLocal.low2, inactiveLegScale),
  low3: scaleVec(bentLocal.low3, inactiveLegScale),
  low4: scaleVec(bentLocal.low4, inactiveLegScale),
  tm: scaleVec(bentLocal.tm, inactiveLegScale),
  kinase: scaleVec(bentLocal.kinase, inactiveLegScale),
};

const clusteredLegLocal = {
  upper: [0, -72, 0],
  hip: [2, -150, 0],
  mid1: [16, -232, 2],
  mid2: [28, -318, 6],
  knee: [34, -398, 8],
  low1: [42, -478, 10],
  low2: [48, -554, 12],
  low3: [54, -626, 14],
  low4: [58, -692, 16],
  tm: [62, -748, 18],
  kinase: [68, -862, 20],
};

const activeLegLocal = {
  upper: [0, -72, 0],
  hip: [-6, -150, 0],
  mid1: [-20, -232, -2],
  mid2: [-38, -318, -4],
  knee: [-52, -398, -5],
  low1: [-66, -478, -6],
  low2: [-76, -554, -7],
  low3: [-84, -626, -8],
  low4: [-90, -692, -8],
  tm: [-94, -748, -8],
  kinase: [-96, -862, -8],
};

const defaultView = Object.freeze({
  yaw: 0,
  pitch: 0,
  zoom: 0.38,
  centerYFactor: 0.57,
});

const view = {
  yaw: defaultView.yaw,
  pitch: defaultView.pitch,
  zoom: defaultView.zoom,
  centerYFactor: defaultView.centerYFactor,
  autoYaw: defaultView.yaw,
  autoRotate: true,
};

const pointer = {
  dragging: false,
  x: 0,
  y: 0,
  hoverX: 0,
  hoverY: 0,
  hoverActive: false,
};

const labelIndex = 1;
const legKeys = ["shoulder", "upper", "hip", "mid1", "mid2", "knee", "low1", "low2", "low3", "low4", "tm", "tmBase"];
const armKeys = ["shoulder", "armProx", "armDist", "hand"];
const membraneY = -394;

let activeState = "inactive";
let fromState = "inactive";
let activeAntibody = "none";
let fromAntibody = "none";
let transitionStart = 0;
let transitionDuration = 950;
let width = 0;
let height = 0;
let deviceScale = Math.min(window.devicePixelRatio || 1, 2);

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

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function orthogonalize(vector, normal) {
  return subtract(vector, scaleVec(normal, dot(vector, normal)));
}

function polar(radius, angle, y) {
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
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

function transformLocal(anchor, local, yaw) {
  return add(anchor, rotateY(local, yaw));
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

function basisPoint(origin, outward, tangent, coords) {
  return add(
    origin,
    add(
      scaleVec(outward, coords[0]),
      add([0, coords[1], 0], scaleVec(tangent, coords[2]))
    )
  );
}

function rotateAroundTangent(local, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    local[0] * cos - local[1] * sin,
    local[0] * sin + local[1] * cos,
    local[2],
  ];
}

function buildArmPoseLocal(liftFactor) {
  const angle = lerp(-armSwingRadians, 0, liftFactor);
  const pose = {};

  Object.entries(armExtendedLocal).forEach(([key, value]) => {
    pose[key] = rotateAroundTangent(value, angle);
  });

  return pose;
}

function buildInactiveReceptor(index) {
  const x = (index - labelIndex) * 260;
  const z = (index - labelIndex) * 22;
  const shoulder = [x + 42, membraneY - inactiveBentLocal.tm[1], z - 12];
  const yaw = Math.PI * 0.98;
  const nodes = { shoulder };
  Object.entries(inactiveBentLocal).forEach(([key, value]) => {
    nodes[key] = transformLocal(shoulder, value, yaw);
  });
  nodes.tmBase = transformLocal(shoulder, add(inactiveBentLocal.tm, [0, -26, 0]), yaw);
  return { nodes };
}

function buildBoundReceptor(state, index) {
  const theta = index * ((Math.PI * 2) / 3) + Math.PI / 6;
  const outward = [Math.cos(theta), 0, Math.sin(theta)];
  const tangent = [-Math.sin(theta), 0, Math.cos(theta)];
  const legLocal = state === "active" ? activeLegLocal : clusteredLegLocal;
  const shoulder = add(scaleVec(outward, 92), [0, membraneY - legLocal.tm[1], 0]);
  const armLocal = buildArmPoseLocal(state === "active" ? 1 : 0);
  const nodes = { shoulder };

  Object.entries(legLocal).forEach(([key, value]) => {
    nodes[key] = basisPoint(shoulder, outward, tangent, value);
  });

  Object.entries(armLocal).forEach(([key, value]) => {
    nodes[key] = basisPoint(shoulder, outward, tangent, value);
  });

  nodes.tmBase = basisPoint(
    shoulder,
    outward,
    tangent,
    [legLocal.tm[0], legLocal.tm[1] - 28, legLocal.tm[2]]
  );
  return { nodes };
}

function buildReceptor(state, index) {
  if (state === "inactive") {
    return buildInactiveReceptor(index);
  }
  return buildBoundReceptor(state, index);
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
  const camera = 1380;
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

function transitionFlag(fromValue, toValue, progress) {
  return lerp(fromValue ? 1 : 0, toValue ? 1 : 0, progress);
}

function modeFactor(modeName, fromMode, toMode, progress) {
  return transitionFlag(fromMode === modeName, toMode === modeName, progress);
}

function setState(nextState) {
  if (nextState === activeState) {
    return;
  }
  fromState = activeState;
  fromAntibody = activeAntibody;
  activeState = nextState;
  transitionStart = performance.now();
  applyViewText();
  stateButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.state === nextState);
  });
}

function setAntibody(nextAntibody) {
  if (nextAntibody === activeAntibody) {
    return;
  }
  fromState = activeState;
  fromAntibody = activeAntibody;
  activeAntibody = nextAntibody;
  transitionStart = performance.now();
  applyViewText();
  antibodyButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.antibody === nextAntibody);
  });
}

function applyViewText() {
  const meta = buildProfile(activeState, activeAntibody);
  const isActive = meta.metrics.activity === "On";
  const isClustered = meta.metrics.oligomer === "Yes";
  stateTitle.textContent = meta.title;
  stateBody.textContent = meta.body;
  metricLigand.textContent = meta.metrics.ligand;
  metricLeg.textContent = meta.metrics.leg;
  metricOligomer.textContent = meta.metrics.oligomer;
  metricActivity.textContent = meta.metrics.activity;
  viewerBadgeStatus.textContent = isActive ? "Active" : "Inactive";
  viewerBadgeLabel.textContent = isClustered ? "Clustered" : "Monomer";
  viewerBadge.classList.toggle("state-badge--active", isActive);
  viewerBadge.classList.toggle("state-badge--inactive", !isActive);
}

function drawMembrane() {
  const corners = [
    [-540, membraneY, -320],
    [540, membraneY, -320],
    [540, membraneY, 320],
    [-540, membraneY, 320],
  ].map(project);

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, corners[0].y, 0, corners[2].y);
  fill.addColorStop(0, rgba(palette.membrane, 0.94));
  fill.addColorStop(1, rgba(tint(palette.membrane, -0.14), 0.98));
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.strokeStyle = rgba("#7a7422", 0.64);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function pushSegment(commands, a, b, color, widthUnits, alpha = 1) {
  commands.push({
    type: "segment",
    a,
    b,
    color,
    widthUnits,
    alpha,
    depth: (a.depth + b.depth) / 2,
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

function pushLabel(commands, point, text, color, offsetX, offsetY) {
  commands.push({
    type: "label",
    point,
    text,
    color,
    depth: point.depth,
    offsetX,
    offsetY,
  });
}

function dynamicTrailOffsets(index, trailIndex, time) {
  const phase = time * 0.0016 + index * 1.9 + trailIndex * 0.8;
  return {
    x: Math.cos(phase) * (10 + trailIndex * 6),
    z: Math.sin(phase * 1.15) * (8 + trailIndex * 5),
  };
}

function drawProjectedChain(commands, projected, keys, color, widths, alpha) {
  for (let i = 0; i < keys.length - 1; i += 1) {
    pushSegment(commands, projected[keys[i]], projected[keys[i + 1]], color, widths[i], alpha);
  }
}

function site1Anchor(nodes) {
  if (nodes.site1) {
    return nodes.site1;
  }
  const lift = normalize(subtract(nodes.shoulder, nodes.upper));
  return add(nodes.shoulder, scaleVec(lift, 18));
}

function site2Anchor(nodes) {
  return add(nodes.armProx, [2, 10, 0]);
}

function site3Anchor(nodes) {
  return add(nodes.armDist, [4, 12, 0]);
}

function ct4Anchor(nodes) {
  return mixVec(nodes.shoulder, nodes.armProx, 0.44);
}

function averagePoint(points) {
  return points.reduce((sum, point) => add(sum, point), [0, 0, 0]).map((value) => value / points.length);
}

function buildTriangleFrame(points) {
  const origin = averagePoint(points);
  const xAxis = normalize(subtract(points[0], points[2]));
  let zAxis = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));

  if (Math.hypot(zAxis[0], zAxis[1], zAxis[2]) < 0.001) {
    zAxis = [0, 0, 1];
  }

  zAxis = normalize(zAxis);
  const yAxis = normalize(cross(zAxis, xAxis));

  return { origin, xAxis, yAxis, zAxis };
}

function pointToFrameLocal(frame, point, scale = 1) {
  const delta = subtract(point, frame.origin);
  return [
    dot(delta, frame.xAxis) * scale,
    dot(delta, frame.yAxis) * scale,
    dot(delta, frame.zAxis) * scale,
  ];
}

function pointFromFrameLocal(frame, local) {
  return add(
    frame.origin,
    add(
      scaleVec(frame.xAxis, local[0]),
      add(scaleVec(frame.yAxis, local[1]), scaleVec(frame.zAxis, local[2]))
    )
  );
}

const nell2ProtomerOrder = ["A", "B", "C"];
const nell2ModelSite1Points = nell2ProtomerOrder.map((key) => nell2TrimerModel[key][1]);
const nell2ModelFrame = buildTriangleFrame(nell2ModelSite1Points);

function transformNell2Trimer(site1Targets, offset = [0, 0, 0]) {
  const targetFrame = buildTriangleFrame(site1Targets);

  return nell2ProtomerOrder.map((key) => {
    const trace = nell2TrimerModel[key].map((point) => {
      const local = pointToFrameLocal(nell2ModelFrame, point, structureScale);
      return add(pointFromFrameLocal(targetFrame, local), offset);
    });

    return {
      key,
      trace,
      branch: trace[0],
      site1: trace[1],
      stemTop: trace[1],
      stemMid: trace[2],
      stemBase: trace[3],
      bladeRoot: trace[4],
      bladeMid: trace[5],
      bladeTip: trace[7],
    };
  });
}

function buildNell2Glyph(spineBaseWorld, site1) {
  const outward = normalize([site1[0] - spineBaseWorld[0], 0, site1[2] - spineBaseWorld[2]]);
  const tangent = normalize([-outward[2], 0, outward[0]]);

  const branch = add(spineBaseWorld, scaleVec(outward, 10));
  const stemTop = add(spineBaseWorld, add(scaleVec(outward, 6), [0, -20, 0]));
  const stemMid = add(site1, add(scaleVec(outward, 8), [0, 132, 0]));
  const stemBase = add(site1, add(scaleVec(outward, 8), [0, 76, 0]));
  const bladeRoot = add(site1, add(scaleVec(outward, 10), [0, 16, 0]));
  const bladeMid = add(bladeRoot, add(scaleVec(outward, 20), add([0, 56, 0], scaleVec(tangent, 10))));
  const bladeTip = add(bladeRoot, add(scaleVec(outward, 30), add([0, 108, 0], scaleVec(tangent, 18))));
  const ligandSite2 = add(bladeRoot, add(scaleVec(outward, 18), add([0, 44, 0], scaleVec(tangent, 8))));
  const ligandSite3 = add(bladeRoot, add(scaleVec(outward, 26), add([0, 82, 0], scaleVec(tangent, 13))));

  return {
    site1,
    branch,
    stemTop,
    stemMid,
    stemBase,
    bladeRoot,
    bladeMid,
    bladeTip,
    ligandSite2,
    ligandSite3,
  };
}

function buildNell2Protomer(nodes, spineBaseWorld) {
  const site1 = site1Anchor(nodes);
  const site2 = site2Anchor(nodes);
  const site3 = site3Anchor(nodes);
  return {
    site2,
    site3,
    ...buildNell2Glyph(spineBaseWorld, site1),
  };
}

function buildDetachedNell2Protomer(spineBaseWorld, angle) {
  const outward = [Math.cos(angle), 0, Math.sin(angle)];
  const site1 = add(spineBaseWorld, add(scaleVec(outward, 18), [0, -190, 0]));
  return buildNell2Glyph(spineBaseWorld, site1);
}

function pushFab(commands, point, color, angle, sizeUnits, alpha = 1) {
  commands.push({
    type: "fab",
    point,
    color,
    angle,
    sizeUnits,
    alpha,
    depth: point.depth,
  });
}

function pushIgg(commands, points, color, alpha = 1) {
  commands.push({
    type: "antibodyY",
    ...points,
    color,
    alpha,
    depth:
      (
        points.contactTip.depth +
        points.contactElbow.depth +
        points.junction.depth +
        points.freeFabTip.depth +
        points.fcTip.depth
      ) / 5,
  });
}

function pushClampFab(commands, points, color, alpha = 1) {
  commands.push({
    type: "antibodyY",
    ...points,
    color,
    alpha,
    depth:
      (
        points.contactTip.depth +
        points.contactElbow.depth +
        points.junction.depth +
        points.freeFabTip.depth +
        points.fcTip.depth
      ) / 5,
  });
}

function pushFlatSegment(commands, a, b, color, widthUnits, alpha = 1) {
  commands.push({
    type: "flatSegment",
    a,
    b,
    color,
    widthUnits,
    alpha,
    depth: (a.depth + b.depth) / 2,
  });
}

function pushNell2Core(commands, head, spineBase, alpha = 1) {
  commands.push({
    type: "nell2Core",
    head,
    spineBase,
    alpha,
    depth: (head.depth + spineBase.depth) / 2,
  });
}

function pushNell2Protomer(commands, parts, alpha = 1) {
  commands.push({
    type: "nell2Protomer",
    ...parts,
    alpha,
    depth:
      (
        parts.stemMid.depth +
        parts.stemBase.depth +
        parts.bladeRoot.depth +
        parts.bladeMid.depth +
        parts.bladeTip.depth
      ) / 5,
  });
}

function pushKinaseGlow(commands, point, radiusUnits, alpha = 1) {
  commands.push({
    type: "kinaseGlow",
    point,
    radiusUnits,
    alpha,
    depth: point.depth - 1,
  });
}

function pushLegHaze(commands, point, radiusXUnits, radiusYUnits, alpha = 1) {
  commands.push({
    type: "legHaze",
    point,
    radiusXUnits,
    radiusYUnits,
    alpha,
    depth: point.depth - 6,
  });
}

function projectAntibodyWorld(anchorWorld, awayDir, sideHint, size) {
  const primary = normalize(awayDir);
  let side = orthogonalize(sideHint, primary);

  if (Math.hypot(side[0], side[1], side[2]) < 0.001) {
    side = orthogonalize([0, 1, 0], primary);
  }

  if (Math.hypot(side[0], side[1], side[2]) < 0.001) {
    side = orthogonalize([1, 0, 0], primary);
  }

  side = normalize(side);

  const contactTip = anchorWorld;
  const contactElbow = add(anchorWorld, add(scaleVec(primary, size * 0.28), scaleVec(side, size * 0.08)));
  const junction = add(anchorWorld, add(scaleVec(primary, size * 0.72), scaleVec(side, size * 0.02)));
  const freeFabTip = add(junction, add(scaleVec(primary, size * 0.54), scaleVec(side, size * 0.68)));
  const fcTip = add(junction, add(scaleVec(primary, size * 0.52), scaleVec(side, -size * 0.7)));

  return {
    contactTip: project(contactTip),
    contactElbow: project(contactElbow),
    junction: project(junction),
    freeFabTip: project(freeFabTip),
    fcTip: project(fcTip),
  };
}

function labelOffsets(point, distance, rise = 0) {
  const direction = point.x < width * 0.5 ? -1 : 1;
  return [direction * distance, rise];
}

function addBoundLigand(commands, receptors, site1Factor, fullFactor) {
  const visible = clamp(site1Factor + fullFactor, 0, 1);
  if (visible < 0.02 || receptors.length < 3) {
    return;
  }

  const site1Targets = receptors.map((receptor) => site1Anchor(receptor.nodes));
  const protomers = transformNell2Trimer(site1Targets);
  const branchCentroid = averagePoint(protomers.map((protomer) => protomer.branch));
  const spineBaseWorld = branchCentroid;
  const headWorld = add(branchCentroid, [0, 134, 0]);
  const head = project(headWorld);
  const spineBase = project(spineBaseWorld);

  pushNell2Core(commands, head, spineBase, visible);

  protomers.forEach((protomer) => {
    pushNell2Protomer(
      commands,
      {
        spineBase,
        branch: project(protomer.branch),
        stemTop: project(protomer.stemTop),
        stemMid: project(protomer.stemMid),
        stemBase: project(protomer.stemBase),
        site1: project(protomer.site1),
        bladeRoot: project(protomer.bladeRoot),
        bladeMid: project(protomer.bladeMid),
        bladeTip: project(protomer.bladeTip),
      },
      visible
    );
  });

  pushLabel(commands, head, "NELL2 trimer", palette.ligand, 22, -24);
}

function addDetachedLigand(commands, protomers, alpha, labelText) {
  if (alpha < 0.02) {
    return;
  }

  const branchCentroid = averagePoint(protomers.map((protomer) => protomer.branch));
  const headWorld = add(branchCentroid, [0, 134, 0]);
  const head = project(headWorld);
  const spineBase = project(branchCentroid);

  pushNell2Core(commands, head, spineBase, alpha);

  protomers.forEach((protomer) => {
    pushNell2Protomer(
      commands,
      {
        spineBase,
        branch: project(protomer.branch),
        stemTop: project(protomer.stemTop),
        stemMid: project(protomer.stemMid),
        stemBase: project(protomer.stemBase),
        site1: project(protomer.site1),
        bladeRoot: project(protomer.bladeRoot),
        bladeMid: project(protomer.bladeMid),
        bladeTip: project(protomer.bladeTip),
      },
      alpha
    );
  });

  pushLabel(commands, head, labelText, palette.ligand, 22, -24);
}

function addBlockedLigand(commands, receptors, blockedFactor) {
  if (blockedFactor < 0.02) {
    return;
  }

  const templateReceptors = [0, 1, 2].map((index) => ({ nodes: buildReceptor("clustered", index).nodes, index }));
  const boundProtomers = transformNell2Trimer(
    templateReceptors.map((receptor) => site1Anchor(receptor.nodes))
  );
  const shift = [260, 26, -10];
  const detachedProtomers = boundProtomers.map((protomer) => ({
    ...protomer,
    branch: add(protomer.branch, shift),
    site1: add(protomer.site1, shift),
    stemTop: add(protomer.stemTop, shift),
    stemMid: add(protomer.stemMid, shift),
    stemBase: add(protomer.stemBase, shift),
    bladeRoot: add(protomer.bladeRoot, shift),
    bladeMid: add(protomer.bladeMid, shift),
    bladeTip: add(protomer.bladeTip, shift),
  }));
  addDetachedLigand(commands, detachedProtomers, blockedFactor * 0.9, "NELL2 unbound");
}

function addRx5(commands, receptors, visible) {
  if (visible < 0.02) {
    return;
  }

  receptors.forEach((receptor) => {
    const anchorWorld = site1Anchor(receptor.nodes);
    const liftVector = normalize(subtract(anchorWorld, receptor.nodes.shoulder));
    const awayDir = normalize(add(scaleVec(liftVector, 1), [0, 0.95, 0]));
    const sideHint = subtract(receptor.nodes.armProx, receptor.nodes.shoulder);
    const points = projectAntibodyWorld(anchorWorld, awayDir, sideHint, 98);
    pushIgg(commands, points, palette.rx5, visible);

    if (receptor.index === labelIndex) {
      pushLabel(commands, points.contactTip, "RX5", palette.rx5, 22, -22);
    }
  });
}

function addCt4(commands, receptors, visible) {
  if (visible < 0.02) {
    return;
  }

  receptors.forEach((receptor) => {
    const interfaceNormal = normalize(subtract(receptor.nodes.armProx, receptor.nodes.shoulder));
    const anchorWorld = add(ct4Anchor(receptor.nodes), scaleVec(interfaceNormal, 8));
    const shoulderAway = normalize(subtract(anchorWorld, receptor.nodes.shoulder));
    const armAway = normalize(subtract(anchorWorld, receptor.nodes.armProx));
    const combinedAway = normalize(add(add(shoulderAway, armAway), [0, 0.45, 0]));
    const sideHint = subtract(receptor.nodes.armProx, receptor.nodes.shoulder);
    const points = projectAntibodyWorld(anchorWorld, combinedAway, sideHint, 90);
    pushClampFab(commands, points, palette.ct4, visible);

    if (receptor.index === labelIndex) {
      pushLabel(commands, points.contactTip, "CT4", palette.ct4, 20, -20);
    }
  });
}

function buildCommands(now) {
  const elapsed = transitionStart ? clamp((now - transitionStart) / transitionDuration, 0, 1) : 1;
  const progress = smoothstep(elapsed);
  const fromProfile = buildProfile(fromState, fromAntibody);
  const toProfile = buildProfile(activeState, activeAntibody);
  const dynamicFactor = transitionFlag(
    fromProfile.geometryState === "active",
    toProfile.geometryState === "active",
    progress
  );
  const pocketFactor = transitionFlag(
    fromProfile.geometryState !== "active",
    toProfile.geometryState !== "active",
    progress
  );
  const site1Factor = modeFactor("site1", fromProfile.ligandMode, toProfile.ligandMode, progress);
  const fullFactor = modeFactor("full", fromProfile.ligandMode, toProfile.ligandMode, progress);
  const blockedFactor = modeFactor("blocked", fromProfile.ligandMode, toProfile.ligandMode, progress);
  const rx5Factor = transitionFlag(fromProfile.showRX5, toProfile.showRX5, progress);
  const ct4Factor = transitionFlag(fromProfile.showCT4, toProfile.showCT4, progress);
  const morph = fromProfile.geometryState === toProfile.geometryState ? 1 : progress;

  const commands = [];
  const hoverCandidates = [];
  const receptors = [0, 1, 2].map((index) =>
    mixReceptor(
      buildReceptor(fromProfile.geometryState, index),
      buildReceptor(toProfile.geometryState, index),
      morph
    )
  );
  const receptorVisibility = receptors.map((_, index) =>
    transitionFlag(
      fromProfile.geometryState !== "inactive" || index === labelIndex,
      toProfile.geometryState !== "inactive" || index === labelIndex,
      progress
    )
  );
  const ligandReceptors = receptors
    .map((receptor, index) => ({ nodes: receptor.nodes, index }))
    .filter((_, index) => receptorVisibility[index] > 0.02);
  const ligandAnchorMode =
    toProfile.ligandMode === "site1" || toProfile.ligandMode === "full"
      ? toProfile.ligandMode
      : fromProfile.ligandMode === "site1" || fromProfile.ligandMode === "full"
        ? fromProfile.ligandMode
        : "none";
  const ligandAnchorState =
    ligandAnchorMode === "none"
      ? "inactive"
      : toProfile.ligandMode === "site1" || toProfile.ligandMode === "full"
        ? toProfile.geometryState
        : fromProfile.geometryState;
  const stableLigandReceptors =
    ligandAnchorMode === "none"
      ? []
      : [0, 1, 2].map((index) => ({ nodes: buildReceptor(ligandAnchorState, index).nodes, index }));

  receptors.forEach((receptor, index) => {
    const receptorAlpha = receptorVisibility[index];
    if (receptorAlpha < 0.02) {
      return;
    }

    const projected = {};
    Object.entries(receptor.nodes).forEach(([key, value]) => {
      projected[key] = project(value);
    });

    if (dynamicFactor > 0.18) {
      const ghostKeys = ["shoulder", "upper", "hip", "mid1", "mid2", "knee", "low1", "low2", "low3", "low4", "tm", "tmBase"];
      for (let trailIndex = 0; trailIndex < 3; trailIndex += 1) {
        const alpha = 0.11 * dynamicFactor * receptorAlpha * (1 - trailIndex * 0.18);
        const offset = dynamicTrailOffsets(index, trailIndex, now);
        const ghost = {};

        ghostKeys.forEach((key, keyIndex) => {
          const scale = key === "shoulder" ? 0 : 0.16 + (keyIndex / ghostKeys.length) * 1.05;
          ghost[key] = add(receptor.nodes[key], [offset.x * scale, 0, offset.z * scale]);
        });

        const projectedGhost = {};
        ghostKeys.forEach((key) => {
          projectedGhost[key] = project(ghost[key]);
        });
        drawProjectedChain(commands, projectedGhost, ghostKeys, palette.leg, [20, 22, 20, 20, 22, 20, 18, 18, 16, 14, 10], alpha);
      }
    }

    drawProjectedChain(commands, projected, legKeys, palette.leg, [22, 24, 22, 20, 24, 20, 18, 18, 16, 14, 10], receptorAlpha);
    drawProjectedChain(commands, projected, armKeys, palette.arm, [20, 18, 14], receptorAlpha);
    pushSegment(commands, projected.tmBase, projected.kinase, palette.kinase, 16, receptorAlpha);

    Object.entries(nodeStyles).forEach(([key, style]) => {
      pushSphere(commands, projected[key], style.radius, style.color, receptorAlpha);
    });

    if (pocketFactor > 0.15) {
      pushSphere(commands, projected.hip, 38, palette.leg, 0.08 * pocketFactor * receptorAlpha);
      pushSphere(commands, projected.hand, 20, palette.hand, 0.12 * pocketFactor * receptorAlpha);
    }

    if (receptorAlpha > 0.4) {
      hoverCandidates.push(
        { point: projected.hand, text: "CATCH", color: palette.hand },
        { point: projected.armProx, text: "FNIII-2", color: palette.arm },
        { point: projected.armDist, text: "FNIII-1", color: palette.arm },
        { point: projected.shoulder, text: "YWTD-A", color: palette.propeller },
        { point: projected.upper, text: "FNIII-3", color: palette.leg },
        { point: projected.hip, text: "YWTD-B", color: palette.leg },
        { point: projected.mid1, text: "FNIII-4/5", color: palette.leg },
        { point: projected.knee, text: "YWTD-C", color: palette.leg },
        { point: projected.low2, text: "FNIII-6-9", color: palette.leg },
        { point: projected.tm, text: "TM", color: palette.leg },
        { point: projected.kinase, text: "Kinase", color: palette.kinase }
      );
    }

    if (index === labelIndex && receptorAlpha > 0.35) {
      const [armX, armY] = labelOffsets(projected.armDist, 110, -10);
      const [shoulderX, shoulderY] = labelOffsets(projected.shoulder, 118, -30);
      const [legX, legY] = labelOffsets(projected.low2, 102, 12);
      const [kinaseX, kinaseY] = labelOffsets(projected.kinase, 112, 18);
      pushLabel(commands, projected.armDist, "Arm", palette.arm, armX, armY);
      pushLabel(commands, projected.shoulder, "Shoulder", palette.propeller, shoulderX, shoulderY);
      pushLabel(commands, projected.low2, "Leg", palette.leg, legX, legY);
      pushLabel(commands, projected.kinase, "Kinase", palette.kinase, kinaseX, kinaseY);
    }
  });

  if (dynamicFactor > 0.18 && ligandReceptors.length > 1) {
    const axisClouds = [
      { key: "mid2", radiusX: 28, radiusY: 68, alpha: 0.12 },
      { key: "knee", radiusX: 40, radiusY: 96, alpha: 0.145 },
      { key: "low1", radiusX: 52, radiusY: 118, alpha: 0.17 },
      { key: "low2", radiusX: 60, radiusY: 134, alpha: 0.19 },
      { key: "low4", radiusX: 48, radiusY: 104, alpha: 0.15 },
      { key: "tm", radiusX: 36, radiusY: 76, alpha: 0.125 },
    ];

    axisClouds.forEach((cloud, cloudIndex) => {
      const axisWorld = ligandReceptors.reduce(
        (sum, receptor) => add(sum, receptor.nodes[cloud.key]),
        [0, 0, 0]
      ).map((value) => value / ligandReceptors.length);
      const axisPoint = project(axisWorld);
      const pulse = dynamicTrailOffsets(9, cloudIndex + 5, now);
      const pulseStrength = Math.abs(pulse.x) * 0.58 + Math.abs(pulse.z) * 0.34;
      const baseAlpha = cloud.alpha * dynamicFactor;

      pushLegHaze(
        commands,
        axisPoint,
        cloud.radiusX + pulseStrength,
        cloud.radiusY + pulseStrength * 1.8,
        baseAlpha
      );
      pushLegHaze(
        commands,
        axisPoint,
        cloud.radiusX + 22 + pulseStrength * 1.7,
        cloud.radiusY + 28 + pulseStrength * 2.5,
        baseAlpha * 0.72
      );
    });
  }

  if (receptorVisibility[labelIndex] > 0.35) {
    const membranePoint = project([-260, membraneY, 0]);
    pushLabel(commands, membranePoint, "Membrane", palette.membrane, -12, -16);
  }

  addBoundLigand(commands, stableLigandReceptors, site1Factor, fullFactor);
  addBlockedLigand(commands, ligandReceptors, blockedFactor);
  addRx5(commands, ligandReceptors, rx5Factor);
  addCt4(commands, ligandReceptors, ct4Factor);

  if (fullFactor > 0.12) {
    ligandReceptors.forEach((receptor) => {
      pushKinaseGlow(commands, project(receptor.nodes.kinase), 38, 0.24 * fullFactor);
    });
    const centroidWorld = ligandReceptors.reduce(
      (sum, receptor) => add(sum, receptor.nodes.kinase),
      [0, 0, 0]
    ).map((value) => value / Math.max(ligandReceptors.length, 1));
    const centroid = project(centroidWorld);
    pushKinaseGlow(commands, centroid, 74, 0.34 * fullFactor);
  }

  if (pocketFactor > 0.15) {
    const receptor = receptors[labelIndex];
    const hand = project(receptor.nodes.hand);
    const hip = project(receptor.nodes.hip);
    commands.push({
      type: "callout",
      a: hand,
      b: hip,
      color: palette.hand,
      depth: (hand.depth + hip.depth) / 2,
      alpha: 0.18 * pocketFactor,
    });
  }

  if (pointer.hoverActive && !pointer.dragging) {
    let bestCandidate = null;
    let bestDistance = 34;

    hoverCandidates.forEach((candidate) => {
      const dx = pointer.hoverX - candidate.point.x;
      const dy = pointer.hoverY - candidate.point.y;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCandidate = candidate;
      }
    });

    if (bestCandidate) {
      const [offsetX, offsetY] = labelOffsets(bestCandidate.point, 26, -18);
      pushLabel(commands, bestCandidate.point, bestCandidate.text, bestCandidate.color, offsetX, offsetY);
    }
  }

  return commands.sort((a, b) => a.depth - b.depth);
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

  const shadow = ctx.createLinearGradient(command.a.x, command.a.y, command.b.x, command.b.y);
  shadow.addColorStop(0, rgba(tint(command.color, 0.16), command.alpha * 0.5));
  shadow.addColorStop(1, rgba(tint(command.color, -0.22), command.alpha * 0.55));
  ctx.strokeStyle = shadow;
  ctx.lineWidth = Math.max(1, widthPx * 0.62);
  ctx.stroke();

  ctx.strokeStyle = rgba("#ffffff", command.alpha * 0.14);
  ctx.lineWidth = Math.max(1, widthPx * 0.18);
  ctx.stroke();
}

function drawSphere(command) {
  const radius = Math.max(2, command.radiusUnits * command.point.scale);
  const x = command.point.x;
  const y = command.point.y;
  const gradient = ctx.createRadialGradient(
    x - radius * 0.36,
    y - radius * 0.38,
    radius * 0.14,
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

function strokeRoundedPath(points, width, color, alpha) {
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
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawFlatSegment(command) {
  const widthPx = Math.max(2, ((command.a.scale + command.b.scale) * 0.5) * command.widthUnits);
  ctx.beginPath();
  ctx.moveTo(command.a.x, command.a.y);
  ctx.lineTo(command.b.x, command.b.y);
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(command.color, command.alpha);
  ctx.lineWidth = widthPx;
  ctx.stroke();
}

function drawNell2Core(command) {
  const avgScale = (command.head.scale + command.spineBase.scale) * 0.5;
  const lineWidth = Math.max(4, avgScale * 5.4);
  const dx = command.spineBase.x - command.head.x;
  const dy = command.spineBase.y - command.head.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const rodOffsets = [-0.65, 0.65];

  rodOffsets.forEach((offset, index) => {
    const start = {
      x: command.head.x + nx * lineWidth * offset,
      y: command.head.y + ny * lineWidth * offset,
    };
    const end = {
      x: command.spineBase.x + nx * lineWidth * offset,
      y: command.spineBase.y + ny * lineWidth * offset,
    };

    drawFlatSegment({
      a: { ...start, scale: command.head.scale, depth: command.head.depth },
      b: { ...end, scale: command.spineBase.scale, depth: command.spineBase.depth },
      color: palette.ligandSoft,
      widthUnits: (lineWidth * 1.42) / Math.max(avgScale, 0.001),
      alpha: command.alpha * 0.94,
    });
    drawFlatSegment({
      a: { ...start, scale: command.head.scale, depth: command.head.depth },
      b: { ...end, scale: command.spineBase.scale, depth: command.spineBase.depth },
      color: index === 0 ? palette.ligand : tint(palette.ligand, 0.08),
      widthUnits: lineWidth / Math.max(avgScale, 0.001),
      alpha: command.alpha,
    });
  });
}

function drawNell2Protomer(command) {
  const avgScale = (command.stemTop.scale + command.stemBase.scale) * 0.5;
  const stalkWidth = Math.max(7, avgScale * 10.5);
  const bladeSpineWidth = Math.max(8, avgScale * 12.5);
  const hookWidth = Math.max(10, avgScale * 19);
  const site = command.site1 || command.stemBase;
  const axisDx = command.bladeTip.x - command.branch.x;
  const axisDy = command.bladeTip.y - command.branch.y;
  const axisAngle = Math.atan2(axisDy, axisDx);
  const px = -Math.sin(axisAngle);
  const py = Math.cos(axisAngle);
  const hookControlA = {
    x: command.branch.x + px * hookWidth * 0.45,
    y: command.branch.y + py * hookWidth * 0.45,
  };
  const hookControlB = {
    x: site.x + px * hookWidth * 0.22,
    y: site.y + py * hookWidth * 0.16,
  };
  const stalkPath = [
    command.branch,
    command.stemTop,
    command.stemMid,
    command.stemBase,
    command.bladeRoot,
  ];
  const bladeSpinePath = [
    command.stemBase,
    command.bladeRoot,
    command.bladeMid,
    command.bladeTip,
  ];

  strokeRoundedPath(
    stalkPath,
    stalkWidth + 3,
    palette.ligandBladeEdge,
    command.alpha
  );
  strokeRoundedPath(
    stalkPath,
    stalkWidth,
    palette.ligandSoft,
    command.alpha * 0.98
  );
  strokeRoundedPath(
    stalkPath,
    Math.max(2, stalkWidth * 0.34),
    "#f5f5f5",
    command.alpha * 0.9
  );

  strokeRoundedPath(
    bladeSpinePath,
    bladeSpineWidth + 3,
    palette.ligandBladeEdge,
    command.alpha
  );
  strokeRoundedPath(
    bladeSpinePath,
    bladeSpineWidth,
    palette.ligandBlade,
    command.alpha * 0.98
  );

  strokeRoundedPath(
    [command.branch, hookControlA, hookControlB, site],
    hookWidth + 3,
    palette.ligandBladeEdge,
    command.alpha
  );
  strokeRoundedPath(
    [command.branch, hookControlA, hookControlB, site],
    hookWidth,
    palette.ligandBlade,
    command.alpha
  );
  strokeRoundedPath(
    [command.branch, hookControlA, hookControlB, site],
    Math.max(3, hookWidth * 0.34),
    "#efefef",
    command.alpha * 0.96
  );

  const ovalCenter = {
    x: (command.bladeRoot.x + command.bladeMid.x + command.bladeTip.x) / 3,
    y: (command.bladeRoot.y + command.bladeMid.y + command.bladeTip.y) / 3,
  };
  const ovalLong = Math.max(14, avgScale * 28);
  const ovalShort = Math.max(8, avgScale * 15);

  ctx.save();
  ctx.translate(ovalCenter.x, ovalCenter.y);
  ctx.rotate(axisAngle - 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, ovalLong, ovalShort, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(palette.ligandBlade, command.alpha);
  ctx.fill();
  ctx.lineWidth = Math.max(2, avgScale * 4.2);
  ctx.strokeStyle = rgba(palette.ligandBladeEdge, command.alpha);
  ctx.stroke();
  ctx.restore();

  const accentCenter = {
    x: site.x + px * hookWidth * 0.1,
    y: site.y + py * hookWidth * 0.06,
  };
  ctx.save();
  ctx.translate(accentCenter.x, accentCenter.y);
  ctx.rotate(axisAngle + 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(8, avgScale * 12), Math.max(14, avgScale * 20), 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(palette.ligand, command.alpha);
  ctx.fill();
  ctx.restore();
}

function drawFab(command) {
  const size = Math.max(12, command.sizeUnits * command.point.scale * 0.85);
  const branch = size * 0.82;
  const stem = size * 0.78;
  const spread = Math.PI / 3.2;
  const armWidth = Math.max(4, size * 0.22);

  function mapLocal(localX, localY) {
    const cos = Math.cos(command.angle);
    const sin = Math.sin(command.angle);
    return {
      x: command.point.x + localX * cos - localY * sin,
      y: command.point.y + localX * sin + localY * cos,
    };
  }

  const contact = mapLocal(0, stem * 0.56);
  const hub = mapLocal(0, 0);
  const left = mapLocal(Math.cos(-spread) * branch, Math.sin(-spread) * branch);
  const right = mapLocal(Math.cos(spread) * branch, Math.sin(spread) * branch);

  ctx.beginPath();
  ctx.moveTo(contact.x, contact.y);
  ctx.lineTo(hub.x, hub.y);
  ctx.lineTo(left.x, left.y);
  ctx.moveTo(hub.x, hub.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(command.color, command.alpha);
  ctx.lineWidth = armWidth;
  ctx.stroke();

  const gloss = ctx.createLinearGradient(contact.x, contact.y, left.x, left.y);
  gloss.addColorStop(0, rgba(tint(command.color, 0.2), command.alpha * 0.6));
  gloss.addColorStop(1, rgba(tint(command.color, -0.18), command.alpha * 0.7));
  ctx.strokeStyle = gloss;
  ctx.lineWidth = Math.max(2, armWidth * 0.55);
  ctx.stroke();

  [contact, hub, left, right].forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === 1 ? armWidth * 0.44 : armWidth * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = rgba(tint(command.color, index === 1 ? 0.15 : 0.05), command.alpha);
    ctx.fill();
  });
}

function drawAntibodyY(command) {
  const avgScale =
    (
      command.contactTip.scale +
      command.contactElbow.scale +
      command.junction.scale +
      command.freeFabTip.scale +
      command.fcTip.scale
    ) / 5;
  const armWidth = Math.max(6, avgScale * 28);

  strokeRoundedPath([command.contactTip, command.contactElbow, command.junction], armWidth, command.color, command.alpha);
  strokeRoundedPath([command.junction, command.freeFabTip], armWidth, command.color, command.alpha);
  strokeRoundedPath([command.junction, command.fcTip], armWidth, command.color, command.alpha);
  strokeRoundedPath([command.contactTip, command.contactElbow, command.junction], Math.max(2, armWidth * 0.24), tint(command.color, 0.22), command.alpha * 0.45);
  strokeRoundedPath([command.junction, command.freeFabTip], Math.max(2, armWidth * 0.24), tint(command.color, 0.22), command.alpha * 0.45);
  strokeRoundedPath([command.junction, command.fcTip], Math.max(2, armWidth * 0.24), tint(command.color, 0.22), command.alpha * 0.45);
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
  gradient.addColorStop(0, `rgba(72, 212, 106, ${command.alpha * 1.2})`);
  gradient.addColorStop(0.5, `rgba(72, 212, 106, ${command.alpha * 0.45})`);
  gradient.addColorStop(1, "rgba(72, 212, 106, 0)");
  ctx.beginPath();
  ctx.arc(command.point.x, command.point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawLegHaze(command) {
  const radiusX = Math.max(16, command.radiusXUnits * command.point.scale);
  const radiusY = Math.max(24, command.radiusYUnits * command.point.scale);

  ctx.save();
  ctx.translate(command.point.x, command.point.y);
  ctx.scale(1, radiusY / radiusX);

  const gradient = ctx.createRadialGradient(0, 0, radiusX * 0.16, 0, 0, radiusX);
  gradient.addColorStop(0, rgba(tint(palette.leg, -0.2), command.alpha * 1.05));
  gradient.addColorStop(0.4, rgba(tint(palette.leg, -0.08), command.alpha * 0.7));
  gradient.addColorStop(0.72, rgba(palette.leg, command.alpha * 0.34));
  gradient.addColorStop(1, rgba(palette.leg, 0));

  ctx.beginPath();
  ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
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

  ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x - paddingX, y - boxHeight / 2, boxWidth, boxHeight, 14);
  } else {
    const left = x - paddingX;
    const top = y - boxHeight / 2;
    const radius = 14;
    const right = left + boxWidth;
    const bottom = top + boxHeight;
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
  ctx.fill();

  ctx.strokeStyle = "rgba(30, 36, 44, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = command.color;
  ctx.fillText(command.text, x, y + 0.5);
  ctx.restore();
}

function drawCallout(command) {
  ctx.beginPath();
  ctx.moveTo(command.a.x, command.a.y);
  ctx.quadraticCurveTo(
    (command.a.x + command.b.x) * 0.5 + 16,
    Math.min(command.a.y, command.b.y) - 18,
    command.b.x,
    command.b.y
  );
  ctx.strokeStyle = rgba(command.color, command.alpha);
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
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

function render(now) {
  if (view.autoRotate && !pointer.dragging) {
    view.yaw += (view.autoYaw - view.yaw) * 0.0025;
  }

  drawBackground(now);
  drawMembrane();
  const commands = buildCommands(now);

  commands.forEach((command) => {
    if (command.type === "legHaze") {
      drawLegHaze(command);
    } else if (command.type === "segment") {
      drawSegment(command);
    } else if (command.type === "flatSegment") {
      drawFlatSegment(command);
    } else if (command.type === "sphere") {
      drawSphere(command);
    } else if (command.type === "kinaseGlow") {
      drawKinaseGlow(command);
    } else if (command.type === "nell2Core") {
      drawNell2Core(command);
    } else if (command.type === "nell2Protomer") {
      drawNell2Protomer(command);
    } else if (command.type === "antibodyY") {
      drawAntibodyY(command);
    } else if (command.type === "fab") {
      drawFab(command);
    } else if (command.type === "callout") {
      drawCallout(command);
    }
  });

  commands.forEach((command) => {
    if (command.type === "label") {
      drawLabel(command);
    }
  });

  requestAnimationFrame(render);
}

function onPointerDown(event) {
  view.autoRotate = false;
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
  view.pitch = clamp(view.pitch + dy * 0.006, -0.9, 0.9);
  view.autoYaw = view.yaw;
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
  view.autoRotate = false;
  view.zoom = clamp(view.zoom - event.deltaY * 0.0009, 0.24, 1.3);
}

function resetView() {
  view.yaw = defaultView.yaw;
  view.pitch = defaultView.pitch;
  view.zoom = defaultView.zoom;
  view.centerYFactor = defaultView.centerYFactor;
  view.autoYaw = defaultView.yaw;
  view.autoRotate = true;
}

stateButtons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

antibodyButtons.forEach((button) => {
  button.addEventListener("click", () => setAntibody(button.dataset.antibody));
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
