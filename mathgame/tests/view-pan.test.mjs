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

const declarationsStart = source.indexOf("const VIEW_PAN_SCENES");
const declarationsEnd = source.indexOf("const SECRET_AWARDS", declarationsStart);
const declarations = source.slice(declarationsStart, declarationsEnd);

function makeContext({ width, height, coarse, touchPoints }) {
  const window = {
    innerWidth: width,
    innerHeight: height,
    matchMedia: () => ({ matches: coarse }),
  };
  const context = vm.createContext({ window, navigator: { maxTouchPoints: touchPoints } });
  vm.runInContext(`
    ${declarations}
    ${extractFunction("isTouchViewport")}
    ${extractFunction("isCompactViewport")}
    ${extractFunction("maxViewPan")}
    globalThis.testApi = { maxViewPan };
  `, context);
  return context;
}

test("iPad landscape rooms can pan far enough to reveal cropped sides", () => {
  const context = makeContext({ width: 1024, height: 768, coarse: true, touchPoints: 5 });
  assert.ok(context.testApi.maxViewPan("bedroom") >= 1.7);
  assert.ok(context.testApi.maxViewPan("home") >= 1.7);
});

test("wide desktop rooms retain the fixed centered view", () => {
  const context = makeContext({ width: 1440, height: 900, coarse: false, touchPoints: 0 });
  assert.equal(context.testApi.maxViewPan("bedroom"), 0);
});
