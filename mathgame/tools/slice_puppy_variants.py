#!/usr/bin/env python3
import os
import struct
import zlib


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

SOURCES = {
    "golden": "gpt-puppy-golden-atlas-source.png",
    "corgi": "gpt-puppy-corgi-atlas-source.png",
    "husky": "gpt-puppy-husky-atlas-source.png",
}

FRAMES = [
    ("base", 0, 0),
    ("bow", 1, 0),
    ("sweater", 2, 0),
    ("collar", 3, 0),
    ("thinking", 0, 1),
    ("celebrate", 1, 1),
    ("sleepy", 2, 1),
    ("wag-a", 3, 1),
    ("wag-b", 0, 2),
    ("roll-a", 1, 2),
    ("roll-b", 2, 2),
    ("roll-c", 3, 2),
]


def read_png(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("not a PNG")
    pos = 8
    width = height = None
    color_type = None
    chunks = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if tag == b"IHDR":
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            if bit_depth != 8 or compression != 0 or filtering != 0 or interlace != 0:
                raise ValueError("unsupported PNG encoding")
        elif tag == b"IDAT":
            chunks.append(payload)
        elif tag == b"IEND":
            break
    raw = zlib.decompress(b"".join(chunks))
    channels = {2: 3, 6: 4}[color_type]
    stride = width * channels
    rows = []
    prev = [0] * stride
    offset = 0
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        row = list(raw[offset:offset + stride])
        offset += stride
        recon = unfilter(row, prev, filter_type, channels)
        rows.append(recon)
        prev = recon
    rgba = bytearray(width * height * 4)
    for y, row in enumerate(rows):
        for x in range(width):
            src = x * channels
            dst = (y * width + x) * 4
            rgba[dst] = row[src]
            rgba[dst + 1] = row[src + 1]
            rgba[dst + 2] = row[src + 2]
            rgba[dst + 3] = row[src + 3] if channels == 4 else 255
    return width, height, rgba


def unfilter(row, prev, filter_type, bpp):
    out = row[:]
    for index, value in enumerate(out):
        left = out[index - bpp] if index >= bpp else 0
        up = prev[index]
        upper_left = prev[index - bpp] if index >= bpp else 0
        if filter_type == 1:
            out[index] = (value + left) & 255
        elif filter_type == 2:
            out[index] = (value + up) & 255
        elif filter_type == 3:
            out[index] = (value + ((left + up) // 2)) & 255
        elif filter_type == 4:
            out[index] = (value + paeth(left, up, upper_left)) & 255
        elif filter_type != 0:
            raise ValueError("unsupported filter")
    return out


def paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def write_png(path, width, height, rgba):
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba[y * stride:(y + 1) * stride])

    def chunk(tag, payload):
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    data = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(data)


def crop_and_key(width, height, rgba, col, row):
    cell_w = width // 4
    cell_h = height // 3
    pad_x = int(cell_w * 0.025)
    pad_y = int(cell_h * 0.025)
    x0 = col * cell_w + pad_x
    y0 = row * cell_h + pad_y
    out_w = cell_w - pad_x * 2
    out_h = cell_h - pad_y * 2
    out = bytearray(out_w * out_h * 4)
    for y in range(out_h):
        for x in range(out_w):
            src = ((y0 + y) * width + x0 + x) * 4
            dst = (y * out_w + x) * 4
            r, g, b, a = rgba[src:src + 4]
            green_score = g - max(r, b)
            if g > 150 and green_score > 42:
                alpha = 0
            elif g > 115 and green_score > 18:
                alpha = max(0, min(255, int((42 - green_score) * 10)))
            else:
                alpha = a
            out[dst] = r
            out[dst + 1] = min(g, max(r, b) + 18) if alpha < 255 else g
            out[dst + 2] = b
            out[dst + 3] = alpha
    return trim_alpha(out_w, out_h, out)


def trim_alpha(width, height, rgba):
    min_x, min_y = width, height
    max_x, max_y = 0, 0
    for y in range(height):
        for x in range(width):
            if rgba[(y * width + x) * 4 + 3] > 8:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if min_x > max_x:
        return width, height, rgba
    margin = 18
    min_x = max(0, min_x - margin)
    min_y = max(0, min_y - margin)
    max_x = min(width - 1, max_x + margin)
    max_y = min(height - 1, max_y + margin)
    out_w = max_x - min_x + 1
    out_h = max_y - min_y + 1
    out = bytearray(out_w * out_h * 4)
    for y in range(out_h):
        for x in range(out_w):
            src = ((min_y + y) * width + min_x + x) * 4
            dst = (y * out_w + x) * 4
            out[dst:dst + 4] = rgba[src:src + 4]
    return out_w, out_h, out


def main():
    for breed, source_name in SOURCES.items():
        width, height, rgba = read_png(os.path.join(ASSETS, source_name))
        for frame, col, row in FRAMES:
            out_w, out_h, out = crop_and_key(width, height, rgba, col, row)
            name = f"gpt-puppy-{breed}-{frame}.png"
            write_png(os.path.join(ASSETS, name), out_w, out_h, out)
            print(name, out_w, out_h)


if __name__ == "__main__":
    main()
