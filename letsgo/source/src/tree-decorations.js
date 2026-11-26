export const TREE_TIERS = [0.97, 0.78, 0.57, 0.36].map((width, index) => ({
  width, height: 0.26 + index * 0.157, angle: index * 0.27,
}));

const branches = TREE_TIERS.flatMap((tier, i) => (i === 3 ? [0, 4] : [0, 2, 4, 6]).map(side => ({
  ...tier, angle: tier.angle + side * Math.PI / 4,
})));
const branchSlots = branches.map((_, i) => i);
const tierSlots = TREE_TIERS.map((_, i) => i);
const starSlot = [0];
const decorationKinds = new Map([
  ['bauble', 'branch'], ['candyCane', 'branch'], ['ribbonBow', 'branch'],
  ['starTopper', 'top'], ['pineGarland', 'garland'], ['fairyLights', 'lights'],
]);

export function treeDecorationKind(form) {
  return decorationKinds.get(form);
}

export function treeSlots(form) {
  const kind = treeDecorationKind(form);
  if (kind === 'branch') return branchSlots;
  if (kind === 'top') return starSlot;
  return kind ? tierSlots : [];
}

export function treeSlotKey(form, slot) {
  return `${treeDecorationKind(form)}:${slot}`;
}

export function decorationPose(tree, { form, slot, turn }) {
  const kind = treeDecorationKind(form);
  const treeAngle = tree.turn * Math.PI / 2;
  const angle = treeAngle + turn * Math.PI / 2;
  const cx = tree.x + tree.w / 2;
  const cz = tree.z + tree.d / 2;
  const width = Math.min(tree.w, tree.d);
  if (kind === 'top') {
    const w = width * 0.29;
    return { x: cx - w / 2, y: tree.y + tree.h * 0.917, z: cz - w / 2, w, d: w, h: tree.h * 0.083, yaw: -angle };
  }
  if (kind === 'branch') {
    const branch = branches[slot];
    const a = branch.angle + treeAngle;
    const w = width * 0.22;
    const h = tree.h * 0.11;
    const r = branch.width * 0.48;
    return { x: cx + Math.cos(a) * r * tree.w - w / 2, y: tree.y + (branch.height - 0.1) * tree.h - h,
      z: cz + Math.sin(a) * r * tree.d - w / 2, w, d: w, h, yaw: Math.PI / 2 - a - turn * Math.PI / 2 };
  }
  const tier = TREE_TIERS[slot];
  const w = width * tier.width * 1.05;
  return { x: cx - w / 2, y: tree.y + (tier.height - (kind === 'lights' ? 0.145 : 0.093)) * tree.h,
    z: cz - w / 2, w, d: w, h: tree.h * 0.055, yaw: -angle };
}
