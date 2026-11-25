import { ISLAND_LAYOUT } from './islands.js';
import { BUILD_KITS, BUILD_PACKS } from './parts.js';
import { partIcon } from './build-menu.js';
import { PETS } from './pets.js';
import { HOUSE_GOAL } from './progression.js';

function element(tag, text, className) {
  const item = document.createElement(tag);
  item.textContent = text;
  if (className) item.className = className;
  return item;
}

function action(label, effect) {
  const button = element('button', label, 'subtle-button');
  button.type = 'button';
  button.onclick = effect;
  return button;
}

function entry(title, detail, status) {
  const row = element('article', '', 'journal-entry');
  const info = element('div', '', 'journal-entry-copy');
  info.append(element('h3', title), element('p', detail));
  if (status) info.append(element('span', status, 'journal-status'));
  row.append(info);
  return row;
}

export function createJournal(dialog, progress, { selectKit, voyage }) {
  const pages = Array.from(dialog.querySelectorAll('[data-journal-page]'));

  function renderPacks(panel) {
    for (const [key, pack] of Object.entries(BUILD_PACKS)) {
      const unlocked = progress.unlocked(key);
      const goal = key === 'house' ? `${pack.goal} · ${progress.placements}/${HOUSE_GOAL}` : pack.goal;
      const row = entry(pack.name, pack.contents, unlocked ? 'Unlocked' : goal);
      row.dataset.earned = String(unlocked);
      const kit = BUILD_KITS.find(item => item.key === key);
      row.prepend(partIcon(kit.parts[0]));
      if (unlocked) row.append(action('Open pack', () => selectKit(key)));
      panel.append(row);
    }
  }

  function renderPets(panel) {
    for (const [key, pet] of Object.entries(PETS)) {
      const rescued = progress.rescued(key);
      const active = progress.companion === key;
      const row = entry(pet.name, `${pet.kind} · ${ISLAND_LAYOUT[pet.island].name}`, active ? 'With you' : rescued ? 'Rescued' : 'Waiting to be found');
      row.dataset.earned = String(rescued);
      if (rescued && !active) row.append(action('Bring along', () => { progress.choose(key); open('pets'); }));
      panel.append(row);
    }
  }

  function renderIslands(panel) {
    panel.append(action('Open island voyage', voyage));
    for (const [key, island] of Object.entries(ISLAND_LAYOUT)) {
      const detail = island.offshore ? 'Open-water crossing' : key === 'reed' ? 'Short crossing from the south dock' : 'Find Mochi by bridge or boat';
      const reached = progress.visited(key);
      const row = entry(island.name, detail, reached ? 'Reached' : 'Explore');
      row.dataset.earned = String(reached);
      panel.append(row);
    }
  }

  const render = { packs: renderPacks, pets: renderPets, islands: renderIslands };
  function open(name = 'packs') {
    for (const button of pages) {
      const key = button.dataset.journalPage;
      const panel = dialog.querySelector(`#journal-${key}`);
      button.setAttribute('aria-pressed', String(key === name));
      panel.hidden = key !== name;
      if (key === name) {
        panel.replaceChildren();
        render[key](panel);
      }
    }
  }

  for (const button of pages) button.onclick = () => open(button.dataset.journalPage);
  return { open };
}
