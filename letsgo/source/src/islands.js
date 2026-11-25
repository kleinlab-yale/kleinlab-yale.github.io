export const INNER_BUILD_EDGE = 150;

export const ISLAND_LAYOUT = {
  reed: { name: 'Reed Islet', gridX: -5, gridZ: 94, rx: 9, rz: 7 },
  lantern: { name: 'Lantern Island', gridX: 28, gridZ: 129, rx: 12, rz: 9 },
  shell: { name: 'Shell Cove', gridX: -31, gridZ: 188, rx: 11, rz: 8, offshore: true },
  berry: { name: 'Cloudberry Isle', gridX: -11, gridZ: 236, rx: 12, rz: 9, offshore: true },
  reef: { name: 'Driftglass Reef', gridX: 43, gridZ: 285, rx: 14, rz: 11, offshore: true },
  moon: { name: 'Moonbell Isle', gridX: -28, gridZ: 382, rx: 14, rz: 11, offshore: true },
};

const offshore = Object.values(ISLAND_LAYOUT).filter(island => island.offshore);

export function canBuildAt({ x, z, w, d }) {
  if (z + d <= INNER_BUILD_EDGE) return true;
  return offshore.some(({ gridX, gridZ, rx, rz }) => x >= gridX - rx - 3 &&
    x + w <= gridX + rx + 3 && z >= gridZ - rz - 2 && z + d <= gridZ + rz + 2);
}
