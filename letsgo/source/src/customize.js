import { LOOK_CHOICES, OUTFITS, PRESETS } from './appearance.js';

export function createCustomizer(dialog, initialLook, makePreview, onChange) {
  const canvas = dialog.querySelector('#avatar-preview');
  const tabs = Array.from(dialog.querySelectorAll('[role="tab"]'));
  const zoomButtons = dialog.querySelectorAll('[data-preview]');
  const choices = [];
  const presets = [];
  let look = initialLook;
  let frame = 'body';
  let preview;
  let attempted = false;
  let turn = null;

  function refresh() {
    for (const { key, buttons, label, options } of choices) {
      for (const [index, button] of buttons.entries()) {
        button.setAttribute('aria-pressed', String(index === look[key]));
      }
      if (label) label.textContent = options[look[key]].name;
    }
    for (const { button, preset } of presets) {
      button.setAttribute('aria-pressed', String(choices.every(({ key }) => look[key] === preset.look[key])));
    }
    preview?.appearance(look);
  }

  function choose(next) {
    look = next;
    onChange(next);
    refresh();
  }

  for (const [key, options] of Object.entries(LOOK_CHOICES)) {
    const container = dialog.querySelector(`#${key}-options`);
    const label = dialog.querySelector(`#${key}-choice`);
    const buttons = options.map((option, index) => {
      const button = document.createElement('button');
      const name = typeof option === 'string' ? option : option.name;
      button.type = 'button';
      if (option.color) {
        button.className = 'swatch';
        button.style.setProperty('--swatch', option.color);
        button.setAttribute('aria-label', name);
        button.title = name;
      } else {
        button.textContent = name;
      }
      button.addEventListener('click', () => choose({ ...look, [key]: index }));
      container.append(button);
      return button;
    });
    choices.push({ key, options, buttons, label });
  }

  const presetList = dialog.querySelector('#preset-options');
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    const name = document.createElement('strong');
    const description = document.createElement('span');
    button.type = 'button';
    button.style.setProperty('--preset-color', OUTFITS[preset.look.outfit].color);
    name.textContent = preset.name;
    description.textContent = preset.description;
    button.append(name, description);
    button.addEventListener('click', () => choose({ ...preset.look }));
    presetList.append(button);
    presets.push({ button, preset });
  }

  function zoom(value) {
    frame = value;
    for (const button of zoomButtons) button.setAttribute('aria-pressed', String(button.dataset.preview === frame));
    preview?.focus(frame);
  }

  function openTab(tab) {
    for (const button of tabs) {
      const active = button === tab;
      button.tabIndex = active ? 0 : -1;
      button.setAttribute('aria-selected', String(active));
      dialog.querySelector(`#${button.getAttribute('aria-controls')}`).hidden = !active;
    }
    dialog.querySelector('.appearance-options').scrollTop = 0;
    zoom(tab.id === 'face-tab' || tab.id === 'hair-tab' ? 'face' : 'body');
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => openTab(tab));
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const target = { ArrowLeft: (index - 1 + tabs.length) % tabs.length, ArrowRight: (index + 1) % tabs.length,
        Home: 0, End: tabs.length - 1 }[event.code];
      if (target === undefined) return;
      event.preventDefault();
      openTab(tabs[target]);
      tabs[target].focus();
    });
  }
  for (const button of zoomButtons) button.addEventListener('click', () => zoom(button.dataset.preview));
  canvas.addEventListener('pointerdown', event => {
    if (!preview || turn || event.button !== 0) return;
    turn = { id: event.pointerId, x: event.clientX };
    canvas.setPointerCapture(turn.id);
  });
  canvas.addEventListener('pointermove', event => {
    if (turn?.id !== event.pointerId) return;
    preview.turn(event.clientX - turn.x);
    turn.x = event.clientX;
  });
  canvas.addEventListener('lostpointercapture', () => { turn = null; });
  refresh();

  return {
    show() {
      if (attempted) return;
      attempted = true;
      try {
        preview = makePreview(canvas);
        preview.focus(frame);
        preview.appearance(look);
      } catch {
        canvas.parentElement.hidden = true;
        dialog.classList.add('preview-unavailable');
      }
    },
    render(time) { preview?.render(time); },
  };
}
