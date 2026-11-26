export const COAST_BOUNDS = { minX: -53, maxX: 55, minZ: 498, maxZ: 663 };
export const COAST_HARBOR = { name: 'Cedar Coast', gridX: -18, gridZ: 519, rx: 19, rz: 17, offshore: true };
export const COAST_LANDING = { x: -17.5, z: 516.5 };
export const COAST_BRIDGE = { x: -3, z: 567, width: 7, rows: 3, y: 0 };
export const CANAL_END = 604;

export const REI = { name: 'Harbormaster Rei', x: -12.5, z: 524.5, prompt: 'Talk to Harbormaster Rei' };
export const BRIDGE_BOARD = { name: 'Canal bridge', x: -6.5, z: 568.5, prompt: 'Inspect canal bridge' };
export const SLUICE = { name: 'Terrace sluice', x: 11.5, z: 574.5, prompt: 'Work the terrace sluice' };
export const COAST_PASS = { name: 'Cedar Pass', x: 17.5, z: 651.5, prompt: 'Read the mountain sign' };
export const IRRIGATION = { source: 1, beds: [2, 1, 0], gates: ['Upper', 'Middle', 'Lower'], start: [0, 1, 0] };
export const GARDEN_CHANNELS = [{ x: 23, level: 0 }, { x: 29, level: 2 }, { x: 35, level: 4 }];

export const COAST_MILESTONES = {
  rei: { coins: 0 },
  bridge: { requires: 'rei', coins: 45 },
  water: { requires: 'bridge', coins: 65 },
};

export const COAST_STEPS = [
  { type: 'visit', id: 'cedar', title: 'Sail to Cedar Coast', detail: 'The Moonbell light has revealed the mainland. Collect the refit supplies near Moonbell harbor and launch a watertight boat.' },
  { type: 'harbormaster', id: 'rei', title: 'Meet Harbormaster Rei', detail: 'Follow the pale paving from the pier to the lantern arch.' },
  { type: 'bridge', id: 'bridge', title: 'Repair the canal bridge', detail: 'Use the repair board or build a continuous deck between the oak landings at Canal Market.' },
  { type: 'sluice', id: 'water', title: 'Water the Terrace Gardens', detail: 'Cross the bridge and route the spring through all three beds at the terrace sluice.' },
  { type: 'chest', id: 'terrace', title: 'Recover the Terrace Lens', detail: 'Look beyond the tea rows. Kumo can open the cache once you train them.' },
  { type: 'chest', id: 'ridge', title: 'Find the Brass Vane', detail: 'Climb the stone road to Windward Ridge. Bring a pet with 28 power.' },
  { type: 'beacon', id: 'ridge', title: 'Wake the Ridge Observatory', detail: 'Bring both instruments to the courtyard at the top of the ridge.' },
];

export function coastDistrict(x, z) {
  if (x < COAST_BOUNDS.minX || x >= COAST_BOUNDS.maxX || z < COAST_BOUNDS.minZ || z >= COAST_BOUNDS.maxZ) return '';
  if (z >= 648) return 'Cedar Pass';
  if (z >= 607) return 'Windward Ridge';
  if (z >= 549 && x >= 4) return 'Terrace Gardens';
  if (z >= 541) return 'Canal Market';
  return 'Cedar Harbor';
}

export function irrigationFlow(gates) {
  const wet = [IRRIGATION.source];
  for (const [i, bed] of IRRIGATION.beds.entries()) {
    if (wet.at(-1) + gates[i] !== bed) break;
    wet.push(bed);
  }
  return wet;
}
