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

function makeContext() {
  const positions = {};
  const context = vm.createContext({ positions });
  vm.runInContext(`
    const PET_HIDE_MIN_DELAY = 180000;
    const PET_HIDE_MAX_DELAY = 300000;
    const PET_MAX_HIDES_PER_SESSION = 2;
    let petNextHideAt = 0;
    let petHideCount = 0;
    let petPresenceScene = "";
    let petActivity = { type: "hide" };
    let petIsAway = true;
    const state = { stage: "puppy" };
    const rand = (min) => min;
    const visibleDefaultPetPosition = () => ({ x: 0.1, y: 0.5 });
    const setPetPosition = (scene, position) => { positions[scene] = position; };
    const updateCallPetButton = () => {};
    const updatePetCareButtons = () => {};
    ${extractFunction("scheduleNextPetHide")}
    ${extractFunction("preparePetForMath")}
    ${extractFunction("welcomePetBackFromMath")}
    globalThis.testApi = {
      preparePetForMath,
      welcomePetBackFromMath,
      snapshot: () => ({ petNextHideAt, petHideCount, petIsAway, petActivity, petPresenceScene }),
      setHideCount: (value) => { petHideCount = value; },
    };
  `, context);
  return context;
}

test("math pauses hiding and returning schedules a fresh full delay", () => {
  const context = makeContext();
  context.testApi.preparePetForMath("bedroom");
  let snapshot = context.testApi.snapshot();
  assert.equal(snapshot.petNextHideAt, Number.POSITIVE_INFINITY);
  assert.equal(snapshot.petIsAway, false);
  assert.equal(snapshot.petActivity, null);

  context.testApi.welcomePetBackFromMath("bedroom", 1000);
  snapshot = context.testApi.snapshot();
  assert.equal(snapshot.petNextHideAt, 181000);
  assert.equal(context.positions.bedroom.x, 0.1);
  assert.equal(context.positions.bedroom.y, 0.5);
});

test("pet hides at most twice per browser session", () => {
  const context = makeContext();
  context.testApi.setHideCount(2);
  context.testApi.welcomePetBackFromMath("home", 1000);
  assert.equal(context.testApi.snapshot().petNextHideAt, Number.POSITIVE_INFINITY);
});

test("quest entry and exit both use the math presence helpers", () => {
  assert.match(extractFunction("startQuest"), /preparePetForMath\(currentScene\(\)\)/);
  assert.match(extractFunction("finishRound"), /welcomePetBackFromMath\(roundLocation\)/);
});
