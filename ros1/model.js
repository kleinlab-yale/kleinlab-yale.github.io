const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const stateButtons = [...document.querySelectorAll(".state-button")];
const resetViewButton = document.getElementById("resetView");
const stateTitle = document.getElementById("stateTitle");
const stateBody = document.getElementById("stateBody");
const metricLigand = document.getElementById("metricLigand");
const metricLeg = document.getElementById("metricLeg");
const metricOligomer = document.getElementById("metricOligomer");
const metricActivity = document.getElementById("metricActivity");

const palette = {
  shoulder: "#edd47c",
  arm: "#e4a6cb",
  leg: "#bbbaf1",
  core: "#a4a3e9",
  ligand: "#3d3a3d",
  ligandSoft: "#909090",
  membrane: "#d8d44d",
  text: "#151b22",
  label: "#26313d",
};

const states = {
  inactive: {
    title: "Unliganded ROS1",
    body:
      "A bent ectodomain keeps the arm packed against the shoulder and the leg relatively rigid, so ROS1 remains monomeric and inactive at the membrane.",
    metrics: {
      ligand: "None",
      leg: "Rigid",
      oligomer: "No",
      activity: "Off",
    },
  },
  clustered: {
    title: "NELL2 binding through site 1",
    body:
      "NELL2 recruits multiple ROS1 ectodomains into a surface cluster, but the arm still braces the receptor and the leg remains comparatively rigid, so clustering alone is not sufficient for activation.",
    metrics: {
      ligand: "Site 1",
      leg: "Rigid",
      oligomer: "Yes",
      activity: "Off",
    },
  },
  active: {
    title: "NELL2 engages sites 1, 2, and 3",
    body:
      "Full engagement releases the autoinhibitory arm, the leg becomes dynamic, and the receptors collapse toward a common axis. That geometry is the active state this schematic emphasizes.",
    metrics: {
      ligand: "Sites 1/2/3",
      leg: "Dynamic",
      oligomer: "Yes",
      activity: "On",
    },
  },
};

const view = {
  yaw: -0.42,
  pitch: 0.17,
  zoom: 1,
  autoYaw: -0.42,
};

const pointer = {
  dragging: false,
  x: 0,
  y: 0,
};

let activeState = "inactive";
let fromState = "inactive";
let transitionStart = 0;
let transitionDuration = 900;
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
  const nr = Math.round(r + (mix - r) * strength);
  const ng = Math.round(g + (mix - g) * strength);
  const nb = Math.round(b + (mix - b) * strength);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function rgba(color, alpha) {
  const { r, g, b } = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function polar(radius, angle, y) {
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function inactiveReceptor(index) {
  const x = -280 + index * 280;
  const z = (index - 1) * 46;
  return {
    anchor: [x, -340, z - 6],
    leg3: [x + 8, -258, z + 6],
    leg2: [x - 12, -158, z - 18],
    leg1: [x + 16, -48, z + 10],
    core: [x + 46, 28, z - 4],
    shoulder: [x + 92, 124, z - 18],
    arm1: [x + 24, 104, z + 58],
    arm2: [x + 8, 38, z + 74],
  };
}

function clusteredReceptor(index) {
  const theta = index * ((Math.PI * 2) / 3) + Math.PI / 6;
  return {
    anchor: polar(238, theta + 0.03, -340),
    leg3: polar(212, theta + 0.08, -258),
    leg2: polar(176, theta + 0.1, -158),
    leg1: polar(144, theta + 0.16, -44),
    core: polar(124, theta + 0.14, 34),
    shoulder: polar(88, theta, 126),
    arm1: polar(114, theta - 0.25, 102),
    arm2: polar(96, theta - 0.36, 36),
  };
}

function activeReceptor(index) {
  const theta = index * ((Math.PI * 2) / 3) + Math.PI / 6;
  return {
    anchor: polar(30, theta, -340),
    leg3: polar(42, theta + 0.02, -258),
    leg2: polar(40, theta + 0.02, -156),
    leg1: polar(36, theta + 0.02, -48),
    core: polar(46, theta + 0.03, 30),
    shoulder: polar(88, theta, 126),
    arm1: polar(126, theta + 0.48, 154),
    arm2: polar(154, theta + 0.65, 90),
  };
}

function getStateReceptor(state, index) {
  if (state === "clustered") {
    return clusteredReceptor(index);
  }
  if (state === "active") {
    return activeReceptor(index);
  }
  return inactiveReceptor(index);
}

function mixReceptor(stateA, stateB, index, t) {
  const a = getStateReceptor(stateA, index);
  const b = getStateReceptor(stateB, index);
  const result = {};
  Object.keys(a).forEach((key) => {
    result[key] = mixVec(a[key], b[key], t);
  });
  return result;
}

function ligandGeometry(tClustered, tActive) {
  const visible = Math.max(tClustered, tActive);
  if (visible < 0.02) {
    return null;
  }

  const top = [0, 258, 0];
  const branches = [0, 1, 2].map((index) => {
    const theta = index * ((Math.PI * 2) / 3) + Math.PI / 6;
    return {
      joint: polar(42, theta, 214),
      tip: polar(26, theta, 182),
    };
  });

  return { visible, top, branches };
}

function dynamicTrailOffsets(index, trailIndex, time) {
  const phase = time * 0.0016 + index * 1.9 + trailIndex * 0.9;
  const radial = 10 + trailIndex * 6;
  return {
    x: Math.cos(phase) * radial,
    z: Math.sin(phase * 1.2) * radial,
  };
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
  const camera = 1400 / view.zoom;
  const scale = camera / (camera - rotated.z);
  return {
    x: width / 2 + rotated.x * scale,
    y: height / 2 - rotated.y * scale,
    scale,
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

function setState(nextState) {
  if (nextState === activeState) {
    return;
  }
  fromState = activeState;
  activeState = nextState;
  transitionStart = performance.now();
  applyStateText();
  stateButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.state === nextState);
  });
}

function applyStateText() {
  const meta = states[activeState];
  stateTitle.textContent = meta.title;
  stateBody.textContent = meta.body;
  metricLigand.textContent = meta.metrics.ligand;
  metricLeg.textContent = meta.metrics.leg;
  metricOligomer.textContent = meta.metrics.oligomer;
  metricActivity.textContent = meta.metrics.activity;
}

function drawMembrane() {
  const corners = [
    [-520, -372, -320],
    [520, -372, -320],
    [520, -372, 320],
    [-520, -372, 320],
  ].map(project);

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, corners[0].y, 0, corners[2].y);
  fill.addColorStop(0, rgba(palette.membrane, 0.94));
  fill.addColorStop(1, rgba(tint(palette.membrane, -0.12), 0.96));
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.strokeStyle = rgba("#746f1c", 0.6);
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

function buildCommands(now) {
  const elapsed = transitionStart ? clamp((now - transitionStart) / transitionDuration, 0, 1) : 1;
  const t = smoothstep(elapsed);

  const tClustered = activeState === "inactive" ? 0 : activeState === "clustered" ? 1 : 1;
  const tActive = activeState === "active" ? 1 : 0;

  const liveClustered = fromState === activeState
    ? tClustered
    : lerp(fromState === "inactive" ? 0 : 1, tClustered, t);
  const liveActive = fromState === activeState
    ? tActive
    : lerp(fromState === "active" ? 1 : 0, tActive, t);

  const commands = [];
  const receptors = [0, 1, 2].map((index) =>
    mixReceptor(
      fromState,
      activeState,
      index,
      fromState === activeState ? 1 : t
    )
  );

  receptors.forEach((receptor, index) => {
    if (liveActive > 0.2) {
      for (let trailIndex = 0; trailIndex < 3; trailIndex += 1) {
        const alpha = 0.12 * liveActive * (1 - trailIndex * 0.18);
        const offset = dynamicTrailOffsets(index, trailIndex, now);
        const ghost = {
          anchor: add(receptor.anchor, [offset.x, 0, offset.z]),
          leg3: add(receptor.leg3, [offset.x, 0, offset.z]),
          leg2: add(receptor.leg2, [offset.x, 0, offset.z]),
          leg1: add(receptor.leg1, [offset.x, 0, offset.z]),
          core: add(receptor.core, [offset.x * 0.5, 0, offset.z * 0.5]),
        };
        const trailPoints = {
          anchor: project(ghost.anchor),
          leg3: project(ghost.leg3),
          leg2: project(ghost.leg2),
          leg1: project(ghost.leg1),
          core: project(ghost.core),
        };
        pushSegment(commands, trailPoints.anchor, trailPoints.leg3, palette.leg, 30, alpha);
        pushSegment(commands, trailPoints.leg3, trailPoints.leg2, palette.leg, 28, alpha);
        pushSegment(commands, trailPoints.leg2, trailPoints.leg1, palette.leg, 24, alpha);
        pushSegment(commands, trailPoints.leg1, trailPoints.core, palette.leg, 34, alpha);
      }
    }

    const projected = {};
    Object.entries(receptor).forEach(([key, value]) => {
      projected[key] = project(value);
    });

    pushSegment(commands, projected.anchor, projected.leg3, palette.leg, 32);
    pushSegment(commands, projected.leg3, projected.leg2, palette.leg, 28);
    pushSegment(commands, projected.leg2, projected.leg1, palette.leg, 24);
    pushSegment(commands, projected.leg1, projected.core, palette.leg, 36);
    pushSegment(commands, projected.shoulder, projected.arm1, palette.arm, 26);
    pushSegment(commands, projected.arm1, projected.arm2, palette.arm, 20);
    pushSegment(commands, projected.arm2, projected.core, palette.arm, 16);

    pushSphere(commands, projected.shoulder, 34, palette.shoulder);
    pushSphere(commands, projected.arm1, 14, palette.arm);
    pushSphere(commands, projected.arm2, 12, palette.arm);
    pushSphere(commands, projected.core, 40, palette.core);
    pushSphere(commands, projected.leg1, 28, palette.leg);
    pushSphere(commands, projected.anchor, 12, palette.leg);

    if (index === 0) {
      commands.push({
        type: "label",
        point: projected.shoulder,
        text: "Shoulder",
        color: palette.shoulder,
        depth: projected.shoulder.depth,
        offsetX: 22,
        offsetY: -22,
      });
      commands.push({
        type: "label",
        point: projected.arm1,
        text: "Arm",
        color: palette.arm,
        depth: projected.arm1.depth,
        offsetX: 16,
        offsetY: 8,
      });
      commands.push({
        type: "label",
        point: projected.leg1,
        text: "Leg",
        color: palette.leg,
        depth: projected.leg1.depth,
        offsetX: 18,
        offsetY: 12,
      });
    }
  });

  const ligand = ligandGeometry(liveClustered, liveActive);
  if (ligand) {
    const top = project(ligand.top);
    pushSphere(commands, top, 24 + 6 * ligand.visible, palette.ligand);
    ligand.branches.forEach((branch) => {
      const joint = project(branch.joint);
      const tip = project(branch.tip);
      pushSegment(commands, top, joint, palette.ligandSoft, 14, ligand.visible);
      pushSegment(commands, joint, tip, palette.ligand, 16, ligand.visible);
      pushSphere(commands, joint, 10, palette.ligandSoft, ligand.visible);
    });
    commands.push({
      type: "label",
      point: top,
      text: "NELL2 trimer",
      color: palette.ligand,
      depth: top.depth,
      offsetX: 20,
      offsetY: -22,
    });
  }

  return commands.sort((a, b) => a.depth - b.depth);
}

function drawSegment(command) {
  const dx = command.b.x - command.a.x;
  const dy = command.b.y - command.a.y;
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

  if (Math.abs(dx) + Math.abs(dy) > 0) {
    ctx.strokeStyle = rgba("#ffffff", command.alpha * 0.15);
    ctx.lineWidth = Math.max(1, widthPx * 0.2);
    ctx.stroke();
  }
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
  gradient.addColorStop(0.5, rgba(command.color, command.alpha));
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

function drawLabel(command) {
  ctx.save();
  ctx.font = "600 16px Avenir Next, Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  const x = command.point.x + command.offsetX;
  const y = command.point.y + command.offsetY;
  const paddingX = 10;
  const metrics = ctx.measureText(command.text);
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 28;

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

function drawBackground(now) {
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(252, 252, 250, 0.96)");
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
  if (!pointer.dragging) {
    view.yaw += (view.autoYaw - view.yaw) * 0.0025;
    view.autoYaw += 0.0007;
  }

  drawBackground(now);
  drawMembrane();
  const commands = buildCommands(now);

  commands.forEach((command) => {
    if (command.type === "segment") {
      drawSegment(command);
    } else if (command.type === "sphere") {
      drawSphere(command);
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
  view.zoom = clamp(view.zoom - event.deltaY * 0.0012, 0.72, 1.5);
}

function resetView() {
  view.yaw = -0.42;
  view.pitch = 0.17;
  view.zoom = 1;
  view.autoYaw = -0.42;
}

stateButtons.forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

resetViewButton.addEventListener("click", resetView);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointerleave", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
applyStateText();
requestAnimationFrame(render);
