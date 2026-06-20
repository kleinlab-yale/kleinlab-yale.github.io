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
const itemsEnd = source.indexOf("const DECOR_POSITION_MIGRATIONS", itemsStart);
const itemsDeclaration = source.slice(itemsStart, itemsEnd);
const scenesDeclaration = source.match(/const DECOR_SCENES = \[[^\n]+;/)?.[0];
assert.ok(itemsStart >= 0 && itemsEnd > itemsStart && scenesDeclaration, "missing decor inventory declarations");

function makeContext(state) {
  const context = vm.createContext({ state });
  vm.runInContext(`
    ${itemsDeclaration}
    ${scenesDeclaration}
    ${extractFunction("decorItemsForScene")}
    ${extractFunction("completedDecorSections")}
    ${extractFunction("newlyCompletedDecorSections")}
    ${extractFunction("depositCompletedDecorSections")}
    globalThis.testApi = { DECOR_ITEMS, DECOR_SCENES, completedDecorSections, newlyCompletedDecorSections, depositCompletedDecorSections };
  `, context);
  return context;
}

test("a section earns exactly one dollar only after every asset is owned", () => {
  const context = makeContext({ decorOwned: [], bankedSections: [], dollars: 0 });
  const { DECOR_ITEMS, completedDecorSections, depositCompletedDecorSections } = context.testApi;
  const homeIds = DECOR_ITEMS.filter((item) => item.scene === "home").map((item) => item.id);

  context.state.decorOwned = homeIds.slice(0, -1);
  assert.deepEqual(Array.from(completedDecorSections(context.state.decorOwned)), []);
  assert.deepEqual(Array.from(depositCompletedDecorSections()), []);
  assert.equal(context.state.dollars, 0);

  context.state.decorOwned.push(homeIds.at(-1));
  assert.deepEqual(Array.from(depositCompletedDecorSections()), ["home"]);
  assert.equal(context.state.dollars, 1);
  assert.deepEqual(Array.from(context.state.bankedSections), ["home"]);

  assert.deepEqual(Array.from(depositCompletedDecorSections()), []);
  assert.equal(context.state.dollars, 1, "re-rendering or rechecking must not duplicate the reward");
});

test("completed legacy saves receive missing section dollars once", () => {
  const context = makeContext({ decorOwned: [], bankedSections: ["home", "kitchen"], dollars: 2 });
  const { DECOR_ITEMS, DECOR_SCENES, depositCompletedDecorSections } = context.testApi;
  context.state.decorOwned = DECOR_ITEMS.map((item) => item.id);

  const newlyBanked = Array.from(depositCompletedDecorSections());
  assert.deepEqual(newlyBanked, Array.from(DECOR_SCENES).slice(2));
  assert.equal(context.state.dollars, DECOR_SCENES.length);
  assert.equal(new Set(context.state.bankedSections).size, DECOR_SCENES.length);

  assert.deepEqual(Array.from(depositCompletedDecorSections()), []);
  assert.equal(context.state.dollars, DECOR_SCENES.length);
});

test("bank display repairs a stale dollar total from completed rooms", () => {
  const context = makeContext({ decorOwned: [], bankedSections: ["home", "bedroom"], dollars: 1 });
  const { depositCompletedDecorSections } = context.testApi;

  assert.deepEqual(Array.from(depositCompletedDecorSections()), []);
  assert.equal(context.state.dollars, 2);
  assert.deepEqual(Array.from(context.state.bankedSections), ["home", "bedroom"]);
});
