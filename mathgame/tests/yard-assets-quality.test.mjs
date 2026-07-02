import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import zlib from "node:zlib";

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(row, previous, filter, bytesPerPixel) {
  const output = Uint8Array.from(row);
  for (let index = 0; index < output.length; index += 1) {
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const up = previous[index] || 0;
    const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    if (filter === 1) output[index] = (output[index] + left) & 255;
    else if (filter === 2) output[index] = (output[index] + up) & 255;
    else if (filter === 3) output[index] = (output[index] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) output[index] = (output[index] + paeth(left, up, upperLeft)) & 255;
    else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
  }
  return output;
}

async function readPngAlpha(path) {
  const data = await readFile(path);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  let position = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks = [];

  while (position < data.length) {
    const length = data.readUInt32BE(position);
    const type = data.subarray(position + 4, position + 8).toString("ascii");
    const payload = data.subarray(position + 8, position + 8 + length);
    position += 12 + length;
    if (type === "IHDR") {
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      colorType = payload[9];
      assert.equal(payload[8], 8, `${path} should use 8-bit PNG channels`);
      assert.ok(colorType === 2 || colorType === 6, `${path} should be RGB/RGBA`);
    } else if (type === "IDAT") {
      chunks.push(payload);
    } else if (type === "IEND") {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const alpha = new Uint8Array(width * height);
  let offset = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset];
    offset += 1;
    const row = unfilter(raw.subarray(offset, offset + stride), previous, filter, channels);
    offset += stride;
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = channels === 4 ? row[x * channels + 3] : 255;
    }
    previous = row;
  }

  return alpha;
}

test("sky meadow ball and basket are opaque inside their cutouts", async () => {
  for (const name of ["gpt-yard-ball.png", "gpt-yard-basket.png"]) {
    const alpha = await readPngAlpha(new URL(`../assets/${name}`, import.meta.url));
    const semiTransparent = alpha.filter((value) => value > 0 && value < 255);
    assert.equal(semiTransparent.length, 0, `${name} should not have see-through visible pixels`);
    assert.ok(alpha.some((value) => value === 0), `${name} should keep transparent background outside the item`);
    assert.ok(alpha.some((value) => value === 255), `${name} should contain solid visible art`);
  }
});
