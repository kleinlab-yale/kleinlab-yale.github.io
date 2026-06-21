import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test("Decor popup keeps its frame fixed while assets scroll vertically", () => {
  assert.match(rule(".decor-panel"), /overflow:\s*hidden/);
  assert.match(rule(".decor-panel"), /height:\s*min\(/);
  assert.match(rule(".decor-panel .decor-grid"), /overflow-y:\s*auto/);
  assert.match(rule(".decor-panel .decor-grid"), /touch-action:\s*pan-y/);
});

test("Decor room headers form one horizontal touch-scrolling strip", () => {
  assert.match(rule(".decor-tabs"), /flex-wrap:\s*nowrap/);
  assert.match(rule(".decor-tabs"), /overflow-x:\s*auto/);
  assert.match(rule(".decor-tabs"), /touch-action:\s*pan-x/);
  assert.match(rule(".decor-tabs button"), /flex:\s*0 0 auto/);
});
