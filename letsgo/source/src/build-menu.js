import { TONES } from './bricks.js';
import { BUILD_KITS, BUILD_PACKS, PARTS, layoutPart } from './parts.js';
import { drawChristmasIcon } from './christmas-icons.js';
import { isChristmasPiece } from './christmas.js';

export function toneName(tone) {
  const spaced = tone.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced[0].toUpperCase() + spaced.slice(1);
}

function previewBlocks(block) {
  const { w, d, h, form, tone } = block;
  const piece = (x, y, z, a, b, c, surface = tone) => ({
    x: block.x + x * w, y: block.y + y * h, z: block.z + z * d, w: a * w, h: b * h, d: c * d, tone: surface, studs: false,
  });
  if (form === 'door') return [block, piece(0.07, 0.68, 1, 0.86, 0.08, 0.11, 'beam'), piece(0.76, 0.45, 1, 0.12, 0.10, 0.17, 'gold')];
  if (form === 'window') return [block, piece(0.08, 0.12, 1, 0.84, 0.76, 0.055, 'patina'),
    piece(0.47, 0.12, 1.056, 0.06, 0.76, 0.073), piece(0.08, 0.48, 1.057, 0.84, 0.08, 0.07)];
  if (form === 'lamp' || form === 'beacon') return [piece(0, 0, 0, 1, 0.16, 1, 'shale'),
    piece(0.29, 0.16, 0.29, 0.42, 0.33, 0.42), piece(0.11, 0.49, 0.11, 0.78, 0.31, 0.78, 'paper'),
    piece(0, 0.8, 0, 1, 0.20, 1)];
  if (['table', 'couch', 'chair'].includes(form)) {
    const seat = form === 'table' ? 0.83 : 0.41;
    const pieces = [];
    for (const x of [0.09, 0.79]) for (const z of [0.09, 0.79]) pieces.push(piece(x, 0, z, 0.12, seat, 0.12, 'beam'));
    pieces.push(piece(0, seat, 0, 1, 0.17, 1));
    if (form !== 'table') pieces.push(piece(0, seat + 0.12, 0, 1, 0.47, 0.24));
    if (form === 'couch') for (const x of [0.07, 0.77]) pieces.push(piece(x, seat, 0.08, 0.16, 0.29, 0.83));
    return pieces;
  }
  return [block];
}

export function partIcon(part, turn = 0, tone = null) {
  const image = document.createElement('canvas');
  image.width = 112;
  image.height = 82;
  image.setAttribute('aria-hidden', 'true');
  const painter = image.getContext('2d');
  if (isChristmasPiece(part)) {
    drawChristmasIcon(painter, part.form, tone ?? part.tone, (part.turn ?? 0) + turn);
    return image;
  }
  const layout = layoutPart(part, turn, tone);
  const scale = Math.min(20, 86 / (layout.w + layout.d), 69 / ((layout.w + layout.d) * 0.45 + layout.h / 3));
  const iso = (x, y, z) => [56 + (x - layout.w / 2 - z + layout.d / 2) * scale,
    43 + ((x - layout.w / 2 + z - layout.d / 2) * 0.46 - y / 3 + layout.h / 6) * scale];

  function polygon(points, color) {
    painter.beginPath();
    for (const [index, point] of points.entries()) {
      const [x, y] = iso(...point);
      if (index === 0) painter.moveTo(x, y);
      else painter.lineTo(x, y);
    }
    painter.closePath();
    painter.fillStyle = color;
    painter.fill();
    painter.strokeStyle = '#201c1a68';
    painter.lineWidth = 1;
    painter.stroke();
  }

  const ordered = layout.blocks.flatMap(previewBlocks).sort((a, b) => (a.x + a.z + a.y / 3) - (b.x + b.z + b.y / 3));
  for (const { x, y, z, w, d, h, tone, studs } of ordered) {
    const components = TONES[tone].slice(1).match(/.{2}/g).map(value => parseInt(value, 16));
    const tint = factor => `rgb(${components.map(value => Math.min(255, Math.round(value * factor))).join(' ')})`;
    const top = y + h;
    polygon([[x,y,z+d], [x+w,y,z+d], [x+w,top,z+d], [x,top,z+d]], tint(0.81));
    polygon([[x+w,y,z+d], [x+w,y,z], [x+w,top,z], [x+w,top,z+d]], tint(0.58));
    polygon([[x,top,z], [x+w,top,z], [x+w,top,z+d], [x,top,z+d]], tint(1.22));
    if (!studs) continue;
    for (let b = z; b < z + d; b++) {
      for (let a = x; a < x + w; a++) {
        const [u, v] = iso(a + 0.5, top, b + 0.5);
        for (const [offset, color] of [[0, tint(0.79)], [-scale * 0.16, tint(1.51)]]) {
          painter.beginPath();
          painter.ellipse(u, v + offset, scale * 0.33, scale * 0.15, 0, 0, Math.PI * 2);
          painter.fillStyle = color;
          painter.fill();
        }
      }
    }
  }
  return image;
}

export function partButton(part, number, active, turn = 0, tone = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'piece';
  button.title = `${part.name} (${number})`;
  button.setAttribute('aria-label', part.name);
  button.setAttribute('aria-pressed', String(active));
  const hint = document.createElement('span');
  hint.className = 'slot-number';
  hint.textContent = String(number);
  hint.setAttribute('aria-hidden', 'true');
  button.append(hint, partIcon(part, turn, tone));
  return button;
}

function makeButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  return button;
}

export function createBuildMenu(dialog, initialKit, callbacks) {
  const kitSelect = dialog.querySelector('#kit-select');
  const groups = dialog.querySelector('#part-groups');
  const grid = dialog.querySelector('#part-grid');
  const swatches = dialog.querySelector('#brick-colors');
  const allColors = dialog.querySelector('#show-all-tones');
  const colorStatus = dialog.querySelector('#chosen-color');
  const phoneTabs = Array.from(dialog.querySelectorAll('[data-parts-page]'));
  let kit = initialKit;
  let group = 'All';
  let tone = null;

  function updateAvailability() {
    kitSelect.replaceChildren();
    for (const item of BUILD_KITS) {
      if (!callbacks.visible(item.key)) continue;
      const option = document.createElement('option');
      option.value = item.key;
      option.disabled = Boolean(BUILD_PACKS[item.key] && !callbacks.unlocked(item.key));
      option.textContent = option.disabled ? `${item.name} (locked)` : item.name;
      kitSelect.append(option);
    }
    if (!callbacks.visible(kit.key)) selectKit(callbacks.visible('christmas') ? 'christmas' : 'all', true);
    kitSelect.value = kit.key;
  }

  function phonePage(page) {
    dialog.dataset.phonePage = page;
    for (const button of phoneTabs) button.setAttribute('aria-pressed', String(button.dataset.partsPage === page));
    if (dialog.closest('#game').dataset.compact === 'true') dialog.scrollTop = 0;
  }
  for (const button of phoneTabs) button.onclick = () => phonePage(button.dataset.partsPage);

  function palette() {
    const names = kit.colors.length && !allColors.checked ? kit.colors : Object.keys(TONES);
    swatches.replaceChildren();
    for (const name of names) {
      const button = makeButton('');
      button.className = 'swatch';
      button.style.setProperty('--swatch', TONES[name]);
      button.setAttribute('aria-label', toneName(name));
      button.setAttribute('aria-pressed', String(tone === name));
      button.title = toneName(name);
      button.onclick = () => { tone = name; callbacks.color(name); palette(); parts(); };
      swatches.append(button);
    }
    colorStatus.textContent = tone ? toneName(tone) : 'Part colors';
    allColors.parentElement.hidden = !kit.colors.length;
  }

  function parts() {
    const source = kit.key === 'all' || group === 'Objects' && !BUILD_PACKS[kit.key]?.season ? PARTS : kit.parts;
    grid.replaceChildren();
    for (const part of source) {
      if ((group !== 'All' && part.group !== group) || part.pack && !callbacks.unlocked(part.pack)) continue;
      const button = makeButton('');
      button.setAttribute('aria-label', part.name);
      const title = document.createElement('strong');
      title.textContent = part.name;
      const size = document.createElement('small');
      size.textContent = `${part.w} × ${part.d} studs`;
      button.append(partIcon(part, 0, tone), title, size);
      button.onclick = () => callbacks.part(part);
      grid.append(button);
    }
    const workshop = dialog.querySelector('#workshop-from-parts');
    workshop.hidden = group !== 'Objects' && kit.key !== 'boat';
  }

  function filter(value) {
    group = value;
    for (const button of groups.children) button.setAttribute('aria-pressed', String(button.textContent === group));
    parts();
  }

  function showGroups() {
    const visible = kit.key === 'all' ? PARTS : kit.parts;
    groups.replaceChildren();
    for (const label of ['All', ...new Set(visible.map(part => part.group).concat('Objects'))]) {
      const button = makeButton(label);
      button.onclick = () => filter(label);
      groups.append(button);
    }
  }

  function selectKit(value, keepTool = false) {
    const next = BUILD_KITS.find(item => item.key === value);
    if (!next || !callbacks.visible(value) || BUILD_PACKS[value] && !callbacks.unlocked(value)) return;
    kit = next;
    kitSelect.value = kit.key;
    allColors.checked = false;
    tone = null;
    callbacks.kit(kit, keepTool);
    showGroups();
    filter('All');
    palette();
  }
  kitSelect.onchange = () => selectKit(kitSelect.value);
  allColors.onchange = palette;
  dialog.querySelector('#use-part-colors').onclick = () => { tone = null; callbacks.color(null); palette(); parts(); };
  dialog.querySelector('#pick-brick').onclick = callbacks.pick;
  dialog.querySelector('#paint-with-color').onclick = callbacks.paint;
  dialog.querySelector('#turn-next-brick').onclick = callbacks.turn;
  dialog.querySelector('#workshop-from-parts').onclick = callbacks.workshop;
  dialog.querySelector('#parts-journal').onclick = callbacks.journal;

  return {
    refresh() {
      updateAvailability();
      if (dialog.open) parts();
    },
    open(mode, selectedTone, kitKey) {
      updateAvailability();
      if (kitKey) selectKit(kitKey);
      else tone = selectedTone;
      showGroups();
      filter(mode === 'objects' ? 'Objects' : 'All');
      palette();
      phonePage(mode === 'colors' ? 'colors' : 'pieces');
      if (mode === 'colors' && dialog.closest('#game').dataset.compact !== 'true') colorStatus.scrollIntoView({ block: 'nearest' });
    },
  };
}
