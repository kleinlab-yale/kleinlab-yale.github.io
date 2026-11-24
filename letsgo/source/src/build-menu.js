import { TONES } from './bricks.js';
import { BUILD_KITS, PARTS, layoutPart } from './parts.js';

export function toneName(tone) {
  const spaced = tone.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced[0].toUpperCase() + spaced.slice(1);
}

export function partIcon(part, turn = 0, tone = null) {
  const image = document.createElement('canvas');
  image.width = 112;
  image.height = 82;
  image.setAttribute('aria-hidden', 'true');
  const painter = image.getContext('2d');
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

  const ordered = [...layout.blocks].sort((a, b) => (a.x + a.z + a.y / 3) - (b.x + b.z + b.y / 3));
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
  let kit = initialKit;
  let group = 'All';
  let tone = null;

  for (const option of BUILD_KITS) {
    const element = document.createElement('option');
    element.value = option.key;
    element.textContent = option.name;
    kitSelect.append(element);
  }
  kitSelect.value = kit.key;

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
    const source = group === 'Objects' ? PARTS : kit.key === 'all' ? PARTS : kit.parts;
    grid.replaceChildren();
    for (const part of source) {
      if (group !== 'All' && part.group !== group) continue;
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

  kitSelect.onchange = () => {
    kit = BUILD_KITS.find(item => item.key === kitSelect.value);
    allColors.checked = false;
    tone = null;
    callbacks.kit(kit);
    showGroups();
    filter('All');
    palette();
  };
  allColors.onchange = palette;
  dialog.querySelector('#use-part-colors').onclick = () => { tone = null; callbacks.color(null); palette(); parts(); };
  dialog.querySelector('#pick-brick').onclick = callbacks.pick;
  dialog.querySelector('#paint-with-color').onclick = callbacks.paint;
  dialog.querySelector('#turn-next-brick').onclick = callbacks.turn;
  dialog.querySelector('#workshop-from-parts').onclick = callbacks.workshop;

  return {
    open(mode, selectedTone) {
      tone = selectedTone;
      showGroups();
      filter(mode === 'objects' ? 'Objects' : 'All');
      palette();
      if (mode === 'colors') dialog.querySelector('#chosen-color').scrollIntoView({ block: 'nearest' });
    },
  };
}
