import { ISLAND_LAYOUT } from './islands.js';
import { CHESTS, STORY_STEPS } from './adventure-data.js';
import { BUILD_KITS, BUILD_PACKS } from './parts.js';
import { partIcon } from './build-menu.js';
import { PETS } from './pets.js';
import { HOUSE_GOAL } from './progression.js';
import { christmasActive } from './christmas.js';
import { COAST_STEPS } from './mainland-data.js';

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

export function createJournal(dialog, progress, { selectKit, voyage, track, trainSound, canCoast }) {
  const pages = Array.from(dialog.querySelectorAll('[data-journal-page]'));

  function done(step) {
    switch (step.type) {
      case 'keeper': return progress.metKeeper;
      case 'visit': return progress.visited(step.id);
      case 'chest': return progress.opened(step.id);
      case 'beacon': return progress.lit(step.id);
      default: return progress.coastDone(step.id);
    }
  }

  function chapter(panel, steps, summary, completion) {
    const next = steps.find(step => !done(step));
    panel.append(element('p', summary, 'panel-copy'));
    if (next) {
      const current = entry(next.title, next.detail, 'Current objective');
      current.append(next.type === 'visit' ? action('Plan crossing', () => voyage(next.id)) : action('Track', () => track(next.type, next.id)));
      panel.append(current);
    } else {
      const complete = entry(completion.title, completion.detail, 'Complete');
      if (completion.lookout) complete.append(action('Track Cedar Pass', () => track('pass', 'cedar-pass')));
      panel.append(complete);
    }
    const list = element('ol', '', 'story-steps');
    for (const step of steps) {
      const row = element('li', step.title);
      if (done(step)) row.dataset.done = 'true';
      if (step === next) row.setAttribute('aria-current', 'step');
      list.append(row);
    }
    panel.append(list);
  }

  function renderStory(panel) {
    if (christmasActive()) {
      const event = entry('Christmas in Blossom Valley', 'Decorate with three free packs through December 25.', 'Christmas event');
      event.classList.add('christmas-entry');
      event.append(action('See packs', () => open('packs')));
      panel.append(event);
    }
    const mainland = canCoast();
    if (mainland) {
      panel.append(element('h3', 'Beyond Moonbell', 'story-heading'));
      chapter(panel, COAST_STEPS, 'The mainland channel leads to Cedar Coast. Help the harbor town recover from the high tide.',
        { title: 'Cedar Coast is restored', detail: 'Follow the inland trail to Cedar Pass, or train Tsubaki for the Summit cache.', lookout: true });
    }
    const trail = mainland ? element('details', '', 'treasure-guide') : panel;
    trail.append(element(mainland ? 'summary' : 'h3', 'The Lantern Trail', mainland ? '' : 'story-heading'));
    chapter(trail, STORY_STEPS, 'Follow Keeper Aya’s chart to find the lost lenses and relight three sea lanterns.',
      { title: 'The Lantern Trail is restored', detail: 'Search Moonbell’s east shelf for the Stargazer chest.' });
    if (mainland) panel.append(trail);
    const guide = element('details', '', 'treasure-guide');
    guide.append(element('summary', 'Treasure hints'));
    for (const [id, chest] of Object.entries(CHESTS)) {
      if (!mainland && ['quay', 'terrace', 'ridge', 'summit'].includes(id)) continue;
      const detail = entry(chest.name, chest.hint, chest.refill ? 'Refills with the tide' : progress.opened(id) ? 'Opened' : `${chest.power} power`);
      if (chest.refill || !progress.opened(id)) detail.append(action('Track', () => track('chest', id)));
      guide.append(detail);
    }
    panel.append(guide);
  }

  function renderPacks(panel) {
    if (christmasActive()) panel.append(element('p', 'On December 26, your holiday pieces are packed away and the full collection stays available in your Christmas Kit.', 'christmas-copy'));
    for (const [key, pack] of Object.entries(BUILD_PACKS)) {
      if (!progress.packVisible(key)) continue;
      const unlocked = progress.unlocked(key);
      const goal = key === 'house' ? `${pack.goal} · ${progress.placements}/${HOUSE_GOAL}` : pack.goal;
      const row = entry(pack.name, pack.contents, pack.season === 'event' ? 'Free through December 25' : unlocked ? 'Unlocked' : goal);
      if (pack.season) row.classList.add('christmas-entry');
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
        key === 'moon' ? 'From Driftglass Reef or Cloudberry Isle · light Driftglass first' :
          key === 'cedar' ? 'Mainland crossing from Moonbell harbor · light Moonbell first' : 'Open-water crossing';
      const detail = island.offshore ? route : key === 'reed' ? 'Short crossing from the south dock' : 'Find Mochi by bridge or boat';
      const reached = progress.visited(key);
      const row = entry(island.name, detail, reached ? 'Reached' : (key === 'cedar' ? canCoast() : progress.charted(key)) ? 'Explore' : 'Chart locked');
      row.dataset.earned = String(reached);
      panel.append(row);
    }
  }

  const render = { story: renderStory, packs: renderPacks, pets: renderPets, islands: renderIslands };
  let currentPage = 'story';
  function open(name = 'story') {
    currentPage = name;
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
  return { open, refresh() { if (dialog.open) open(currentPage); } };
}
