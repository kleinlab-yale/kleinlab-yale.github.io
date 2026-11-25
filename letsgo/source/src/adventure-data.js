import { ISLAND_LAYOUT } from './islands.js';

function onIsland(id, x, z) {
  const { gridX, gridZ } = ISLAND_LAYOUT[id];
  return { x: gridX + x, z: gridZ + z };
}

export const KEEPER = { name: 'Keeper Aya', x: 15.5, z: 28.5 };

export const CHESTS = {
  supplies: { name: 'Keeper’s supply chest', x: 19.5, z: 32.5, power: 0, coins: 26, refill: 90000,
    hint: 'Beside the path south through Building Meadow.' },
  bridge: { name: 'Bridge foot chest', x: 7.5, z: 15.5, power: 3, coins: 30,
    hint: 'Look by the meadow end of Vermilion Bridge.' },
  reeds: { name: 'Reed drift chest', ...onIsland('reed', -3.5, -1.5), power: 3, coins: 32, refill: 120000,
    hint: 'Look on the west side of Reed Islet.' },
  lantern: { name: 'Blossom chest', ...onIsland('lantern', -4.5, -1.5), power: 3, coins: 36,
    hint: 'Search the grass left of the Lantern Island gate.' },
  shell: { name: 'Shellglass chest', ...onIsland('shell', -4.5, -1.5), power: 5, coins: 48, relic: 'Shellglass Prism',
    hint: 'Follow the pale paving at Shell Cove, then look west.' },
  berry: { name: 'Cloudberry chest', ...onIsland('berry', -4.5, -3.5), power: 7, coins: 54, relic: 'Silver Mirror',
    hint: 'Look between the left lantern and the cottage at Cloudberry Isle.' },
  reef: { name: 'Driftglass chest', ...onIsland('reef', -2.5, 2.5), power: 10, coins: 72, relic: 'Driftglass Lens',
    requires: 'shell', hint: 'Search the paved clearing near the coral gate on Driftglass Reef.' },
  moon: { name: 'Moonbell vault', ...onIsland('moon', -4.5, -0.5), power: 17, coins: 112, relic: 'Moonbell Crown',
    requires: 'reef', hint: 'The dark vault sits at the base of Moonbell’s tower.' },
  stars: { name: 'Stargazer chest', ...onIsland('moon', 7.5, 2.5), power: 26, coins: 170,
    requires: 'moon', hint: 'Follow the eastern rock shelf beyond the Moonbell lanterns.' },
};

export const SYMBOLS = ['Wave', 'Blossom', 'Star', 'Moon', 'Shell'];

export const BEACONS = {
  shell: { name: 'Shell Cove lantern', ...onIsland('shell', 3.5, 0.5), chests: ['shell'], coins: 24,
    start: [2, 4, 0], answer: [0, 4, 2], clue: 'The keeper’s chart shows a wave rolling into a shell, with a star overhead.',
    restored: 'The Shell Cove lantern is lit. Driftglass Reef is on your sailing chart.' },
  reef: { name: 'Driftglass lantern', ...onIsland('reef', 4.5, 1.5), chests: ['reef', 'berry'], coins: 44,
    start: [1, 2, 0], answer: [1, 0, 3], clue: 'The silver mirror shows blossom, wave, then moon.',
    restored: 'Driftglass is shining. The channel to Moonbell Isle is open.' },
  moon: { name: 'Moonbell lantern', ...onIsland('moon', 3.5, 0.5), chests: ['moon'], coins: 80,
    start: [0, 3, 4], answer: [3, 2, 1], clue: 'The crown is stamped with moon, star, then blossom.',
    restored: 'All three sea lanterns are lit. The lantern trail is yours to explore.' },
};

export const STORY_STEPS = [
  { type: 'keeper', id: 'keeper', title: 'Meet Keeper Aya', detail: 'Find Aya by the meadow path just north of your starting point.' },
  { type: 'chest', id: 'shell', title: 'Recover the Shellglass Prism', detail: 'Sail from the south dock to Shell Cove. Pebble has the 5 power you need to open the chest.' },
  { type: 'beacon', id: 'shell', title: 'Light Shell Cove', detail: 'Fit the prism into the lantern and align its three symbols.' },
  { type: 'chest', id: 'berry', title: 'Find the Silver Mirror', detail: 'Open the Cloudberry chest with a pet that has 7 power.' },
  { type: 'chest', id: 'reef', title: 'Find the Driftglass Lens', detail: 'Launch for Driftglass Reef from Shell Cove or Cloudberry Isle. Its chest takes 10 power.' },
  { type: 'beacon', id: 'reef', title: 'Open the Moonbell channel', detail: 'Use the lens and mirror to light the Driftglass lantern.' },
  { type: 'chest', id: 'moon', title: 'Open the Moonbell vault', detail: 'Bring a pet with 17 power. Juniper is on Moonbell Isle and can be trained in the journal.' },
  { type: 'beacon', id: 'moon', title: 'Restore the lantern trail', detail: 'Fit the crown and align the last lantern at Moonbell’s tower.' },
];
