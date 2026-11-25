import { ISLAND_LAYOUT } from './islands.js';
import { CHESTS, STORY_STEPS } from './adventure-data.js';
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

export function createJournal(dialog, progress, { selectKit, voyage, track, trainSound }) {
  const pages = Array.from(dialog.querySelectorAll('[data-journal-page]'));

  function renderStory(panel) {
    const done = step => step.type === 'keeper' ? progress.metKeeper : step.type === 'chest' ? progress.opened(step.id) : progress.lit(step.id);
    const next = STORY_STEPS.find(step => !done(step));
    panel.append(element('h3', 'The Lantern Trail', 'story-heading'));
    panel.append(element('p', 'Follow Keeper Aya’s chart to find the lost lenses and relight three sea lanterns.', 'panel-copy'));
    if (next) {
      const current = entry(next.title, next.detail, 'Current objective');
      current.append(action('Track', () => track(next.type, next.id)));
      panel.append(current);
    } else panel.append(entry('The Lantern Trail is restored', 'Search Moonbell’s east shelf for the Stargazer chest.', 'Complete'));
    const steps = element('ol', '', 'story-steps');
    for (const step of STORY_STEPS) {
      const row = element('li', step.title);
      if (done(step)) row.dataset.done = 'true';
      if (step === next) row.setAttribute('aria-current', 'step');
      steps.append(row);
    }
    panel.append(steps);
    const guide = element('details', '', 'treasure-guide');
    guide.append(element('summary', 'Treasure hints'));
    for (const [id, chest] of Object.entries(CHESTS)) {
      const detail = entry(chest.name, chest.hint, chest.refill ? 'Refills with the tide' : progress.opened(id) ? 'Opened' : `${chest.power} power`);
      if (chest.refill || !progress.opened(id)) detail.append(action('Track', () => track('chest', id)));
      guide.append(detail);
    }
    panel.append(guide);
  }

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
    const balance = element('p', `${progress.coins.toLocaleString()} coins`, 'coin-balance');
    panel.append(balance, element('p', 'Train companions to add 3 power per level. Stronger pets open heavier chests faster.', 'panel-copy'));
    for (const [key, pet] of Object.entries(PETS)) {
      const rescued = progress.rescued(key);
      const active = progress.companion === key;
      const { level, power, cost } = progress.petStats(key);
      const row = entry(pet.name, `${pet.kind} · ${ISLAND_LAYOUT[pet.island].name} · Level ${level} · ${power} power`, active ? 'With you' : rescued ? 'Rescued' : 'Waiting to be found');
      row.dataset.earned = String(rescued);
      if (rescued) {
        const controls = element('div', '', 'pet-actions');
        if (!active) controls.append(action('Bring along', () => { progress.choose(key); open('pets'); }));
        if (cost !== null) {
          const train = action(`Train · ${cost} coins`, () => { if (progress.train(key)) { trainSound(); open('pets'); } });
          train.disabled = progress.coins < cost;
          train.setAttribute('aria-label', `Train ${pet.name} for ${cost} coins`);
          controls.append(train);
        } else controls.append(element('span', 'Max level', 'journal-status'));
        row.append(controls);
      }
      panel.append(row);
    }
  }

  function renderIslands(panel) {
    panel.append(action('Open island voyage', voyage));
    for (const [key, island] of Object.entries(ISLAND_LAYOUT)) {
      const route = key === 'reef' ? 'From Shell Cove or Cloudberry Isle · light Shell Cove first' :
        key === 'moon' ? 'From Driftglass Reef or Cloudberry Isle · light Driftglass first' : 'Open-water crossing';
      const detail = island.offshore ? route : key === 'reed' ? 'Short crossing from the south dock' : 'Find Mochi by bridge or boat';
      const reached = progress.visited(key);
      const row = entry(island.name, detail, reached ? 'Reached' : progress.charted(key) ? 'Explore' : 'Chart locked');
      row.dataset.earned = String(reached);
      panel.append(row);
    }
  }

  const render = { story: renderStory, packs: renderPacks, pets: renderPets, islands: renderIslands };
  function open(name = 'story') {
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
