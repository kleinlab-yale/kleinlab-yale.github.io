import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../script.js", import.meta.url), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

const itemsStart = source.indexOf("const DECOR_ITEMS = [");
const itemsEnd = source.indexOf("const ORIENTABLE_DECOR_IDS", itemsStart);
const inventoryDeclarations = source.slice(itemsStart, itemsEnd);
const scenesDeclaration = source.match(/const DECOR_SCENES = \[[^\n]+;/)?.[0];
const awardsStart = source.indexOf("const SECRET_AWARDS = {");
const awardsEnd = source.indexOf("const TV_CHANNELS", awardsStart);
const awardsDeclaration = source.slice(awardsStart, awardsEnd);
assert.ok(itemsStart >= 0 && itemsEnd > itemsStart && scenesDeclaration, "missing secret stuffy declarations");

function makeContext(state) {
  const context = vm.createContext({ state });
  vm.runInContext(`
    ${inventoryDeclarations}
    ${scenesDeclaration}
    ${extractFunction("decorItemsForScene")}
    ${extractFunction("secretStuffyItems")}
    ${extractFunction("isSecretStuffyEarned")}
    ${extractFunction("placedDecorForScene")}
    globalThis.testApi = { DECOR_ITEMS, SECRET_STUFFY_BY_AWARD, decorItemsForScene, secretStuffyItems, placedDecorForScene };
  `, context);
  return context;
}

test("all seven room secrets award a portable stuffy", () => {
  const context = makeContext({ secretAwards: [], decorPlaced: [], secretStuffyScenes: {} });
  const { DECOR_ITEMS, SECRET_STUFFY_BY_AWARD } = context.testApi;
  assert.equal(Object.keys(SECRET_STUFFY_BY_AWARD).length, 7);
  for (const [awardId, itemId] of Object.entries(SECRET_STUFFY_BY_AWARD)) {
    const item = DECOR_ITEMS.find((candidate) => candidate.id === itemId);
    assert.ok(item, `${awardId} should map to an inventory item`);
    assert.equal(item.secretAward, awardId);
    assert.equal(item.secretReward, true);
    assert.equal(item.portable, true);
  }
});

test("unearned secrets stay out of Decor and out of every room", () => {
  const context = makeContext({ secretAwards: [], decorPlaced: ["rockingDogToy"], secretStuffyScenes: { rockingDogToy: "home" } });
  const { decorItemsForScene, placedDecorForScene } = context.testApi;
  assert.equal(Array.from(decorItemsForScene("home")).some((item) => item.secretReward), false);
  assert.equal(Array.from(placedDecorForScene("home")).some((item) => item.id === "rockingDogToy"), false);
});

test("an earned stuffy appears only in its selected room and can move worlds", () => {
  const state = {
    secretAwards: ["snackChef"],
    decorPlaced: ["secretKitchenCupcakeChef"],
    secretStuffyScenes: { secretKitchenCupcakeChef: "mountain" },
  };
  const context = makeContext(state);
  const { placedDecorForScene } = context.testApi;
  assert.equal(Array.from(placedDecorForScene("kitchen")).some((item) => item.id === "secretKitchenCupcakeChef"), false);
  const mountainStuffy = Array.from(placedDecorForScene("mountain")).find((item) => item.id === "secretKitchenCupcakeChef");
  assert.ok(mountainStuffy);
  assert.equal(mountainStuffy.scene, "mountain");
});

test("Secrets tab renders only earned rewards", () => {
  assert.match(source, /secretStuffyItems\(\)\.filter\(isSecretStuffyEarned\)/);
  assert.match(source, /data-secret-stuffy=/);
  assert.match(source, /No secret stuffies found yet/);
});

test("granting a secret unlocks, owns, places, and locates its stuffy", () => {
  const state = {
    secretAwards: [], coins: 0, gems: 0, glow: 0,
    decorUnlocked: [], decorOwned: [], decorPlaced: [], decorPositions: {}, secretStuffyScenes: {},
    underwaterUnlocked: false,
  };
  const context = vm.createContext({ state });
  vm.runInContext(`
    ${inventoryDeclarations}
    ${awardsDeclaration}
    function decorItemById(id) { return DECOR_ITEMS.find((item) => item.id === id) || null; }
    function defaultDecorPosition() { return { x: 1, y: 2 }; }
    function unlockNextDecorReward() { return "fully stocked"; }
    function triggerPetAction() {}
    function showToast() {}
    ${extractFunction("grantSecretAward")}
    globalThis.testApi = { grantSecretAward };
  `, context);
  assert.equal(context.testApi.grantSecretAward("snackChef"), true);
  assert.deepEqual(Array.from(state.secretAwards), ["snackChef"]);
  assert.ok(state.decorUnlocked.includes("secretKitchenCupcakeChef"));
  assert.ok(state.decorOwned.includes("secretKitchenCupcakeChef"));
  assert.ok(state.decorPlaced.includes("secretKitchenCupcakeChef"));
  assert.equal(state.secretStuffyScenes.secretKitchenCupcakeChef, "kitchen");
});

test("portable stuffy positions normalize before global state is available", () => {
  const context = vm.createContext({});
  vm.runInContext(`
    ${inventoryDeclarations}
    const DECOR_POSITION_MIGRATIONS = {};
    function clampDecorPosition() { throw new Error("portable positions must not need global state"); }
    ${extractFunction("normalizeDecorPositions")}
    globalThis.position = normalizeDecorPositions({ secretKitchenCupcakeChef: { x: 3.2, y: 1.4 } }).secretKitchenCupcakeChef;
  `, context);
  assert.deepEqual({ ...context.position }, { x: 3.2, y: 1.4 });
});
