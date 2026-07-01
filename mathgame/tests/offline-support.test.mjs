import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

function extractFunction(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const bodyStart = script.indexOf("{", start);
  let depth = 0;
  for (let position = bodyStart; position < script.length; position += 1) {
    if (script[position] === "{") depth += 1;
    if (script[position] === "}") depth -= 1;
    if (depth === 0) return script.slice(start, position + 1);
  }
  throw new Error(`unterminated ${name}`);
}

test("offline cache includes every runtime game asset and every file exists", async () => {
  const declarations = script.slice(0, script.indexOf("const WORLDS"));
  const context = vm.createContext({});
  vm.runInContext(`
    ${declarations}
    ${extractFunction("offlineGameAssets")}
    globalThis.assets = offlineGameAssets();
  `, context);

  const assetUrls = Array.from(context.assets)
    .filter((url) => String(url).startsWith("assets/"))
    .map((url) => String(url).split("?")[0]);
  assert.ok(assetUrls.length > 100, "the complete pet and room library should be cached");
  await Promise.all(Array.from(new Set(assetUrls)).map((path) => access(new URL(`../${path}`, import.meta.url))));
});

test("service worker caches the shell, warms the full game, and has an offline navigation fallback", () => {
  assert.match(index, /<script src="script\.js\?v=20260701-dog-assets"><\/script>/);
  assert.match(serviceWorker, /self\.addEventListener\("install"/);
  assert.match(serviceWorker, /self\.addEventListener\("activate"/);
  assert.match(serviceWorker, /event\.data\?\.type !== "CACHE_GAME"/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorker, /cache\.match\(new Request\(new URL\("\.\/index\.html"/);
  assert.match(script, /\.\.\.Object\.values\(ASSETS\)/);
  assert.match(script, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
});
