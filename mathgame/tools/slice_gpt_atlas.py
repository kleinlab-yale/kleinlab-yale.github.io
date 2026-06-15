#!/usr/bin/env python3
import os
import struct
import zlib


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-puppy-atlas-source.png")

FRAMES = [
    ("gpt-puppy-base.png", 0, 0),
    ("gpt-puppy-bow.png", 1, 0),
    ("gpt-puppy-sweater.png", 2, 0),
    ("gpt-puppy-collar.png", 3, 0),
    ("gpt-puppy-thinking.png", 0, 1),
    ("gpt-puppy-celebrate.png", 1, 1),
    ("gpt-puppy-sleepy.png", 2, 1),
    ("gpt-egg.png", 3, 1),
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
    for i, value in enumerate(out):
        left = out[i - bpp] if i >= bpp else 0
        up = prev[i]
        upper_left = prev[i - bpp] if i >= bpp else 0
        if filter_type == 1:
            out[i] = (value + left) & 255
        elif filter_type == 2:
            out[i] = (value + up) & 255
        elif filter_type == 3:
            out[i] = (value + ((left + up) // 2)) & 255
        elif filter_type == 4:
            out[i] = (value + paeth(left, up, upper_left)) & 255
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


def green_key(r, g, b, a):
    return a > 0 and g > 170 and g - max(r, b) > 58


def green_soft_alpha(r, g, b, a):
    score = g - max(r, b)
    if a > 0 and g > 120 and score > 24:
        return max(0, min(a, int((70 - score) * 5)))
    return None


def scrub_green(r, g, b):
    return r, min(g, max(r, b) + 18), b


def magenta_key(r, g, b, a):
    return a > 0 and r > 185 and b > 185 and g < 115 and min(r, b) - g > 85


def magenta_soft_alpha(r, g, b, a):
    score = min(r, b) - g
    if a > 0 and r > 150 and b > 150 and g < 155 and score > 42:
        return max(0, min(a, int((95 - score) * 6)))
    return None


def scrub_magenta(r, g, b):
    return min(r, max(g, b) + 18), g, min(b, max(r, g) + 18)


def crop_cell(width, height, rgba, cols, rows, col, row):
    cell_w = width // cols
    cell_h = height // rows
    pad_x = int(cell_w * 0.035)
    pad_y = int(cell_h * 0.035)
    x0 = col * cell_w + pad_x
    y0 = row * cell_h + pad_y
    out_w = cell_w - pad_x * 2
    out_h = cell_h - pad_y * 2
    out = bytearray(out_w * out_h * 4)
    for y in range(out_h):
        for x in range(out_w):
            src = ((y0 + y) * width + x0 + x) * 4
            dst = (y * out_w + x) * 4
            out[dst:dst + 4] = rgba[src:src + 4]
    return out_w, out_h, out


def _masked_neighbor(mask, width, height, x, y):
    for yy in range(max(0, y - 1), min(height, y + 2)):
        for xx in range(max(0, x - 1), min(width, x + 2)):
            if xx == x and yy == y:
                continue
            if mask[yy * width + xx]:
                return True
    return False


def key_connected_background(width, height, rgba, key_fn, soft_alpha_fn, scrub_fn):
    mask = [False] * (width * height)
    seen = [False] * (width * height)
    stack = []

    def visit(x, y):
        index = y * width + x
        if seen[index]:
            return
        seen[index] = True
        pixel = index * 4
        if key_fn(*rgba[pixel:pixel + 4]):
            mask[index] = True
            stack.append((x, y))

    for x in range(width):
        visit(x, 0)
        visit(x, height - 1)
    for y in range(1, height - 1):
        visit(0, y)
        visit(width - 1, y)

    while stack:
        x, y = stack.pop()
        if x > 0:
            visit(x - 1, y)
        if x < width - 1:
            visit(x + 1, y)
        if y > 0:
            visit(x, y - 1)
        if y < height - 1:
            visit(x, y + 1)

    out = bytearray(rgba)
    for index, is_background in enumerate(mask):
        if is_background:
            out[index * 4 + 3] = 0

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if mask[index] or not _masked_neighbor(mask, width, height, x, y):
                continue
            pixel = index * 4
            r, g, b, a = out[pixel:pixel + 4]
            alpha = soft_alpha_fn(r, g, b, a)
            if alpha is None or alpha >= a:
                continue
            out[pixel], out[pixel + 1], out[pixel + 2] = scrub_fn(r, g, b)
            out[pixel + 3] = alpha

    return trim_alpha(width, height, out)


def keep_largest_component(width, height, rgba, alpha_threshold=8):
    labels = [-1] * (width * height)
    components = []

    for start in range(width * height):
        if labels[start] != -1 or rgba[start * 4 + 3] <= alpha_threshold:
            continue
        label = len(components)
        labels[start] = label
        stack = [start]
        pixels = []
        while stack:
            index = stack.pop()
            pixels.append(index)
            x = index % width
            y = index // width
            neighbors = []
            if x > 0:
                neighbors.append(index - 1)
            if x < width - 1:
                neighbors.append(index + 1)
            if y > 0:
                neighbors.append(index - width)
            if y < height - 1:
                neighbors.append(index + width)
            for neighbor in neighbors:
                if labels[neighbor] == -1 and rgba[neighbor * 4 + 3] > alpha_threshold:
                    labels[neighbor] = label
                    stack.append(neighbor)
        components.append(pixels)

    if len(components) <= 1:
        return width, height, rgba

    keep = max(range(len(components)), key=lambda index: len(components[index]))
    out = bytearray(rgba)
    for label, pixels in enumerate(components):
        if label == keep:
            continue
        for index in pixels:
            out[index * 4 + 3] = 0
    return trim_alpha(width, height, out)


def crop_keyed_cell(width, height, rgba, cols, rows, col, row, key_fn, soft_alpha_fn, scrub_fn):
    out_w, out_h, out = crop_cell(width, height, rgba, cols, rows, col, row)
    return key_connected_background(out_w, out_h, out, key_fn, soft_alpha_fn, scrub_fn)


def crop_and_key(width, height, rgba, col, row):
    return crop_keyed_cell(width, height, rgba, 4, 2, col, row, green_key, green_soft_alpha, scrub_green)


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
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        out_w, out_h, out = crop_and_key(width, height, rgba, col, row)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
