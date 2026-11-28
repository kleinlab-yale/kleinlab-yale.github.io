export const SHIPS = {
  sloop: {
    name: 'Lantern Sloop', description: 'A cedar day-sailer with an ivory sail, brass lanterns and a jade stripe.',
    routeHint: 'Sail straight from the south dock to Driftglass Reef once Shell Cove’s lantern is lit.',
    beam: 2.35, length: 6.65, deckHeight: 0.78, range: 156, speed: 5.2, color: '#5f8c7d',
    routes: { home: ['reef'], reef: ['home'], shell: ['moon'], moon: ['shell'] },
    work: [
      { name: 'Seal the hull', cost: { timber: 7 }, result: 'The new cedar strakes have closed the gaps in the hull.' },
      { name: 'Refit the deck', cost: { timber: 4, fittings: 5 }, result: 'The deck and railings are back in place.' },
      { name: 'Raise the sail', cost: { reeds: 3, fittings: 2 }, result: 'The Lantern Sloop is seaworthy. Select it in Fleet at any harbor.' },
    ],
  },
  galleon: {
    name: 'Cedar Galleon', description: 'A three-masted deep-water ship with ivory canvas and a gilded stern gallery.',
    routeHint: 'Sail directly between Cedar Coast and the south dock.',
    beam: 3.65, length: 10.7, deckHeight: 1.08, range: 316, speed: 6.3, color: '#cca066',
    routes: { home: ['cedar', 'reef'], cedar: ['home'], reef: ['home'], shell: ['moon'], moon: ['shell'] },
    work: [
      { name: 'Commission the galleon', cost: { timber: 14, fittings: 12, reeds: 8 },
        result: 'The Cedar Galleon is ready. Its open-water chart includes a direct crossing from the south dock to Cedar Coast.' },
    ],
  },
};

export const SHIPYARDS = {
  sloop: { name: 'Lantern wreck', prompt: 'Inspect the Lantern wreck', x: -23.5, z: 184.5,
    mooring: { x: -18.6, z: 185.3, yaw: -0.16 } },
  galleon: { name: 'Cedar shipyard', prompt: 'Visit the Cedar shipyard', x: -25.5, z: 513.5,
    mooring: { x: -33.5, z: 500.2, yaw: -1.46 } },
};

export function fleetGoal(id, craft, progress) {
  if (id === 'sloop') {
    if (craft.hasShip(id)) return { detail: 'The sloop is ready at the harbor.' };
    if (!progress.visited('shell')) return { detail: 'Reach Shell Cove and find the wreck on the east beach.', destination: 'shell' };
    return { detail: `${craft.shipWork(id).name} at the wreck on Shell Cove’s east beach.`, track: ['shipyard', id] };
  }
  if (!craft.hasShip('sloop')) {
    return { ...fleetGoal('sloop', craft, progress), detail: 'Restore the Lantern Sloop to earn your shipwright’s commission.' };
  }
  if (!progress.visited('cedar')) {
    if (progress.charted('cedar')) return { detail: 'Sail to Cedar Coast from Moonbell Harbor.', destination: 'cedar' };
    if (progress.visited('moon')) return { detail: 'Relight the Moonbell lantern to chart Cedar Coast.', track: ['beacon', 'moon'] };
    return { detail: 'Reach Moonbell and relight its lantern to chart Cedar Coast.', destination: 'moon' };
  }
  if (!progress.coastDone('rei')) return { detail: 'Meet Harbormaster Rei at Cedar Harbor.', track: ['harbormaster', 'rei'] };
  if (!progress.coastDone('bridge')) return { detail: 'Repair the canal bridge to reopen Cedar Harbor’s supply road.', track: ['bridge', 'bridge'] };
  return { detail: 'Meet the crew at the shipyard on Cedar Harbor’s west shore.', track: ['shipyard', id] };
}

export function shipyardOpen(id, craft, progress) {
  return id === 'sloop' ? progress.visited('shell') :
    craft.hasShip('sloop') && progress.visited('cedar') && progress.coastDone('bridge');
}
