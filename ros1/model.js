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

const palette = {
  propeller: "#edd47c",
  hand: "#d77faf",
  arm: "#7ed6e6",
  leg: "#8c8df0",
  ligand: "#353336",
  ligandSoft: "#8f8f8f",
  rx5: "#cf5977",
  ctx: "#ef9d34",
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
      "NELL2 clusters ROS1 ectodomains, but the hand is still parked in the hip pocket and the arm has not swung up. Clustering alone is therefore not enough to activate the receptor.",
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
      "Full ligand engagement rotates the CATCH plus FNIII-1/2 block about 130 degrees around YWTD-A, pulls the hand out of the hip pocket, and frees the leg to become dynamic while the lower receptor regions come together.",
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
        showCTX: false,
      };
    }

    return {
      title: "RX5 blocks NELL2 site 1",
      body:
        "RX5 masks ligand epitope 1 on YWTD-A, so NELL2 cannot engage site 1 productively. ROS1 therefore fails to cluster and never reaches the active geometry.",
      metrics: {
        ligand: "Site 1 blocked",
        leg: "Constrained",
        oligomer: "No",
        activity: "Off",
      },
      geometryState: "inactive",
      ligandMode: "blocked",
      showRX5: true,
      showCTX: false,
    };
  }

  if (antibody === "ctx") {
    if (state === "active") {
      return {
        title: "CTX traps a pre-active assembly",
        body:
          "CTX binds between the FNIII arm and YWTD-A shoulder, so the arm-hand rigid body cannot release and swing upward. ROS1 can still form a ligand-driven cluster, but it is trapped before activation.",
        metrics: {
          ligand: "Site 1 trapped",
          leg: "Constrained",
          oligomer: "Yes",
          activity: "Off",
        },
        geometryState: "clustered",
        ligandMode: "site1",
        showRX5: false,
        showCTX: true,
      };
    }

    if (state === "clustered") {
      return {
        title: "CTX clamps the arm to the shoulder",
        body:
          "With CTX bound between the arm and YWTD-A shoulder, NELL2 can still collect ROS1 into a cluster through site 1, but the arm remains pocketed and activation does not proceed.",
        metrics: {
          ligand: "Site 1",
          leg: "Constrained",
          oligomer: "Yes",
          activity: "Off",
        },
        geometryState: "clustered",
        ligandMode: "site1",
        showRX5: false,
        showCTX: true,
      };
    }

    return {
      title: "CTX reinforces the inactive clamp",
      body:
        "CTX binds between the FNIII arm and YWTD-A shoulder, reinforcing the pocketed inactive state and opposing the arm-release step needed for activation.",
      metrics: {
        ligand: "CTX bound",
        leg: "Constrained",
        oligomer: "No",
        activity: "Off",
      },
      geometryState: "inactive",
      ligandMode: "none",
      showRX5: false,
      showCTX: true,
    };
  }

  return {
    ...baseStates[state],
    geometryState: state,
    ligandMode: state === "inactive" ? "none" : state === "clustered" ? "site1" : "full",
    showRX5: false,
    showCTX: false,
  };
}

const nodeStyles = {
  shoulder: { radius: 34, color: palette.propeller },
  upper: { radius: 18, color: palette.leg },
  hip: { radius: 30, color: palette.propeller },
  mid1: { radius: 18, color: palette.leg },
  mid2: { radius: 18, color: palette.leg },
  knee: { radius: 28, color: palette.propeller },
  low1: { radius: 18, color: palette.leg },
  low2: { radius: 18, color: palette.leg },
  low3: { radius: 16, color: palette.leg },
  low4: { radius: 16, color: palette.leg },
  tm: { radius: 10, color: palette.leg },
  armProx: { radius: 16, color: palette.arm },
  armDist: { radius: 16, color: palette.arm },
  hand: { radius: 12, color: palette.hand },
};

const armRotationRadians = (130 * Math.PI) / 180;
const bentArmLocal = {
  armProx: [-18, -24, 26],
  armDist: [-32, -74, 34],
  hand: [38, -112, 18],
};

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
  ...bentArmLocal,
};

const activeLocal = {
  upper: [16, -58, 8],
  hip: [26, -118, 12],
  mid1: [36, -178, 8],
  mid2: [46, -236, 4],
  knee: [54, -296, 2],
  low1: [58, -352, 1],
  low2: [60, -406, 0],
  low3: [62, -458, 0],
  low4: [64, -506, 0],
  tm: [64, -548, 0],
  armProx: rotateZ(bentArmLocal.armProx, armRotationRadians),
  armDist: rotateZ(bentArmLocal.armDist, armRotationRadians),
  hand: rotateZ(bentArmLocal.hand, armRotationRadians),
};

const view = {
  yaw: -0.4,
  pitch: 0.18,
  zoom: 0.52,
  autoYaw: -0.4,
  autoRotate: true,
};

const pointer = {
  dragging: false,
  x: 0,
  y: 0,
};

const labelIndex = 1;
const legKeys = ["shoulder", "upper", "hip", "mid1", "mid2", "knee", "low1", "low2", "low3", "low4", "tm", "tmBase"];
const armKeys = ["shoulder", "armProx", "armDist", "hand"];

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

function rotateZ(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    point[0] * cos - point[1] * sin,
    point[0] * sin + point[1] * cos,
    point[2],
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

function getLocalGeometry(state) {
  return state === "active" ? activeLocal : bentLocal;
}

function getPlacement(state, index) {
  if (state === "inactive") {
    return {
      shoulder: [-312 + index * 312, 156, (index - 1) * 28],
      yaw: Math.PI + (index - 1) * 0.08,
    };
  }

  const theta = index * ((Math.PI * 2) / 3) + Math.PI / 6;
  return {
    shoulder: polar(state === "active" ? 92 : 118, theta, state === "active" ? 156 : 150),
    yaw: theta + Math.PI,
  };
}

function buildReceptor(state, index) {
  const placement = getPlacement(state, index);
  const local = getLocalGeometry(state);
  const nodes = {
    shoulder: placement.shoulder,
  };

  Object.entries(local).forEach(([key, value]) => {
    nodes[key] = transformLocal(placement.shoulder, value, placement.yaw);
  });
  nodes.tmBase = transformLocal(placement.shoulder, add(local.tm, [0, -26, 0]), placement.yaw);

  return { nodes };
}

function mixReceptor(a, b, t) {
  const nodes = {};
  Object.keys(a.nodes).forEach((key) => {
    nodes[key] = mixVec(a.nodes[key], b.nodes[key], t);
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
  const centerY = height * 0.52;
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
  stateTitle.textContent = meta.title;
  stateBody.textContent = meta.body;
  metricLigand.textContent = meta.metrics.ligand;
  metricLeg.textContent = meta.metrics.leg;
  metricOligomer.textContent = meta.metrics.oligomer;
  metricActivity.textContent = meta.metrics.activity;
}

function drawMembrane() {
  const corners = [
    [-540, -394, -320],
    [540, -394, -320],
    [540, -394, 320],
    [-540, -394, 320],
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
  return add(mixVec(nodes.shoulder, nodes.armProx, 0.16), [0, 14, 0]);
}

function ctxAnchor(nodes) {
  return mixVec(nodes.shoulder, nodes.armProx, 0.44);
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

function addBoundLigand(commands, receptors, site1Factor, fullFactor) {
  const visible = clamp(site1Factor + fullFactor, 0, 1);
  if (visible < 0.02) {
    return;
  }

  const topWorld = [0, 288 + fullFactor * 14, 0];
  const top = project(topWorld);
  pushSphere(commands, top, 28, palette.ligand, visible);

  receptors.forEach((receptor, index) => {
    const site1World = site1Anchor(receptor.nodes);
    const fullTarget = mixVec(site1World, receptor.nodes.hand, 0.72);
    const targetWorld = mixVec(site1World, fullTarget, fullFactor);
    const jointWorld = mixVec(topWorld, targetWorld, 0.44);
    jointWorld[1] += 18 - index * 2;
    const joint = project(jointWorld);
    const target = project(targetWorld);
    pushSegment(commands, top, joint, palette.ligandSoft, 13, visible);
    pushSegment(commands, joint, target, palette.ligand, 15, visible);
    pushSphere(commands, joint, 10, palette.ligandSoft, visible);
  });

  pushLabel(commands, top, fullFactor > 0.4 ? "NELL2 trimer" : "NELL2 site 1", palette.ligand, 22, -24);
}

function addBlockedLigand(commands, receptors, blockedFactor) {
  if (blockedFactor < 0.02) {
    return;
  }

  const topWorld = [0, 318, 0];
  const top = project(topWorld);
  pushSphere(commands, top, 26, palette.ligand, blockedFactor * 0.72);

  receptors.forEach((receptor, index) => {
    const blockedTarget = add(site1Anchor(receptor.nodes), [0, 22, 0]);
    const jointWorld = mixVec(topWorld, blockedTarget, 0.5);
    jointWorld[1] += 10 - index * 3;
    const joint = project(jointWorld);
    const target = project(blockedTarget);
    pushSegment(commands, top, joint, palette.ligandSoft, 10, blockedFactor * 0.42);
    pushSegment(commands, joint, target, palette.ligandSoft, 8, blockedFactor * 0.32);
  });

  pushLabel(commands, top, "NELL2 blocked", palette.ligand, 22, -24);
}

function addRx5(commands, receptors, visible) {
  if (visible < 0.02) {
    return;
  }

  receptors.forEach((receptor, index) => {
    const anchor = project(site1Anchor(receptor.nodes));
    const shoulder = project(receptor.nodes.shoulder);
    const angle = Math.atan2(shoulder.y - anchor.y, shoulder.x - anchor.x);
    pushFab(commands, anchor, palette.rx5, angle, 38, visible);

    if (index === labelIndex) {
      pushLabel(commands, anchor, "RX5", palette.rx5, 22, -22);
    }
  });
}

function addCtx(commands, receptors, visible) {
  if (visible < 0.02) {
    return;
  }

  receptors.forEach((receptor, index) => {
    const anchorWorld = ctxAnchor(receptor.nodes);
    const anchor = project(anchorWorld);
    const shoulder = project(receptor.nodes.shoulder);
    const arm = project(receptor.nodes.armProx);
    const angle = Math.atan2((shoulder.y + arm.y) * 0.5 - anchor.y, (shoulder.x + arm.x) * 0.5 - anchor.x);
    pushFab(commands, anchor, palette.ctx, angle, 40, visible);

    if (index === labelIndex) {
      pushLabel(commands, anchor, "CTX", palette.ctx, 20, -20);
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
  const ctxFactor = transitionFlag(fromProfile.showCTX, toProfile.showCTX, progress);
  const morph = fromProfile.geometryState === toProfile.geometryState ? 1 : progress;

  const commands = [];
  const receptors = [0, 1, 2].map((index) =>
    mixReceptor(
      buildReceptor(fromProfile.geometryState, index),
      buildReceptor(toProfile.geometryState, index),
      morph
    )
  );

  receptors.forEach((receptor, index) => {
    if (dynamicFactor > 0.18) {
      const ghostKeys = ["shoulder", "upper", "hip", "mid1", "mid2", "knee", "low1", "low2", "low3", "low4", "tm", "tmBase"];
      for (let trailIndex = 0; trailIndex < 3; trailIndex += 1) {
        const alpha = 0.11 * dynamicFactor * (1 - trailIndex * 0.18);
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

    const projected = {};
    Object.entries(receptor.nodes).forEach(([key, value]) => {
      projected[key] = project(value);
    });

    drawProjectedChain(commands, projected, legKeys, palette.leg, [22, 24, 22, 20, 24, 20, 18, 18, 16, 14, 10], 1);
    drawProjectedChain(commands, projected, armKeys, palette.arm, [20, 18, 14], 1);

    Object.entries(nodeStyles).forEach(([key, style]) => {
      pushSphere(commands, projected[key], style.radius, style.color);
    });

    if (pocketFactor > 0.15) {
      pushSphere(commands, projected.hip, 38, palette.propeller, 0.08 * pocketFactor);
      pushSphere(commands, projected.hand, 20, palette.hand, 0.12 * pocketFactor);
    }

    if (index === labelIndex) {
      pushLabel(commands, projected.hand, "CATCH", palette.hand, 24, -16);
      pushLabel(commands, projected.armDist, "FNIII-1/2", palette.arm, 26, 8);
      pushLabel(commands, projected.shoulder, "YWTD-A", palette.propeller, 26, -22);
      pushLabel(commands, projected.upper, "FNIII-3", palette.leg, 24, 12);
      pushLabel(commands, projected.hip, "YWTD-B", palette.propeller, 24, 10);
      pushLabel(commands, projected.mid1, "FNIII-4/5", palette.leg, 24, 12);
      pushLabel(commands, projected.knee, "YWTD-C", palette.propeller, 24, 10);
      pushLabel(commands, projected.low2, "FNIII-6-9", palette.leg, 26, 12);
    }
  });

  addBoundLigand(commands, receptors, site1Factor, fullFactor);
  addBlockedLigand(commands, receptors, blockedFactor);
  addRx5(commands, receptors, rx5Factor);
  addCtx(commands, receptors, ctxFactor);

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
    view.autoYaw += 0.00045;
  }

  drawBackground(now);
  drawMembrane();
  const commands = buildCommands(now);

  commands.forEach((command) => {
    if (command.type === "segment") {
      drawSegment(command);
    } else if (command.type === "sphere") {
      drawSphere(command);
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
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
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

function onWheel(event) {
  event.preventDefault();
  view.autoRotate = false;
  view.zoom = clamp(view.zoom - event.deltaY * 0.0009, 0.42, 1.3);
}

function resetView() {
  view.yaw = -0.4;
  view.pitch = 0.18;
  view.zoom = 0.52;
  view.autoYaw = -0.4;
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
canvas.addEventListener("pointerleave", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
applyViewText();
requestAnimationFrame(render);
