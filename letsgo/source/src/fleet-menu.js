import { SHIPS, fleetGoal } from './ship-data.js';

export function renderFleet(panel, craft, progress, { selected, choose, guide }) {
  panel.replaceChildren();
  for (const [id, ship] of Object.entries(SHIPS)) {
    const ready = craft.hasShip(id);
    const card = document.createElement('article');
    card.className = 'fleet-card';
    card.dataset.ship = id;
    card.dataset.ready = String(ready);
    card.style.setProperty('--ship-color', ship.color);
    const title = document.createElement('h3');
    title.textContent = ship.name;
    const stats = document.createElement('p');
    stats.className = 'fleet-stats';
    stats.textContent = `${ship.range} m range · ${ship.speed} m/s`;
    const description = document.createElement('p');
    description.textContent = ship.description;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'subtle-button';
    if (ready) {
      const routes = document.createElement('p');
      routes.textContent = ship.routeHint;
      card.append(title, stats, description, routes);
      button.textContent = selected === id ? 'Selected' : selected === undefined ? 'Open at a harbor' : `Select ${ship.name}`;
      button.onclick = () => choose?.(id);
      if (selected !== undefined) button.setAttribute('aria-pressed', String(selected === id));
    } else {
      const goal = fleetGoal(id, craft, progress);
      const detail = document.createElement('p');
      detail.className = 'fleet-goal';
      detail.textContent = goal.detail;
      card.append(title, stats, description, detail);
      button.textContent = goal.track ? 'Track objective' : 'Plan crossing';
      button.setAttribute('aria-label', `${button.textContent} for ${ship.name}`);
      button.onclick = () => guide(id);
    }
    card.append(button);
    panel.append(card);
  }
}
