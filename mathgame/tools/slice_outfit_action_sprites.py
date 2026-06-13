#!/usr/bin/env python3
import os

from slice_puppy_variants import read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
BREEDS = ("golden", "corgi", "husky")
LOOKS = ("sweater", "bow", "collar")
FRAMES = [
    ("thinking", 0, 0),
    ("celebrate", 1, 0),
    ("sleepy", 2, 0),
    ("wag-a", 0, 1),
    ("wag-b", 1, 1),
    ("roll-a", 2, 1),
    ("roll-b", 0, 2),
    ("roll-c", 1, 2),
    ("couch-sit", 2, 2),
]


def crop_and_key_3x3(width, height, rgba, col, row):
    cell_w = width // 3
    cell_h = height // 3
    pad_x = int(cell_w * 0.03)
    pad_y = int(cell_h * 0.03)
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
            if g > 145 and green_score > 42:
                alpha = 0
            elif g > 110 and green_score > 18:
                alpha = max(0, min(255, int((45 - green_score) * 10)))
            else:
                alpha = a
            out[dst] = r
            out[dst + 1] = min(g, max(r, b) + 16) if alpha < 255 else g
            out[dst + 2] = b
            out[dst + 3] = alpha
    return trim_alpha(out_w, out_h, out)


def main():
    for breed in BREEDS:
        for look in LOOKS:
            source = os.path.join(ASSETS, f"gpt-puppy-{breed}-{look}-action-atlas-source.png")
            width, height, rgba = read_png(source)
            for frame, col, row in FRAMES:
                out_w, out_h, out = crop_and_key_3x3(width, height, rgba, col, row)
                name = f"gpt-puppy-{breed}-{look}-{frame}.png"
                write_png(os.path.join(ASSETS, name), out_w, out_h, out)
                print(name, out_w, out_h)


if __name__ == "__main__":
    main()
