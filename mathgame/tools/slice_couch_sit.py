#!/usr/bin/env python3
import os

from slice_puppy_variants import read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-puppy-couch-sit-atlas-source.png")
FRAMES = [
    ("golden", 0),
    ("corgi", 1),
    ("husky", 2),
]


def crop_and_key(width, height, rgba, col):
    cell_w = width // 3
    pad_x = int(cell_w * 0.025)
    pad_y = int(height * 0.035)
    x0 = col * cell_w + pad_x
    y0 = pad_y
    out_w = cell_w - pad_x * 2
    out_h = height - pad_y * 2
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


def main():
    width, height, rgba = read_png(SOURCE)
    for breed, col in FRAMES:
        out_w, out_h, out = crop_and_key(width, height, rgba, col)
        name = f"gpt-puppy-{breed}-couch-sit.png"
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
