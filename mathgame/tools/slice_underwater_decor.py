#!/usr/bin/env python3
import os

from slice_puppy_variants import read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-underwater-decor-atlas-source.png")

FRAMES = [
    ("gpt-underwater-shell-seat.png", 0, 0),
    ("gpt-underwater-pearl-lamp-off.png", 1, 0),
    ("gpt-underwater-pearl-lamp-on.png", 2, 0),
    ("gpt-underwater-treasure-chest.png", 0, 1),
    ("gpt-underwater-bubble-hoop.png", 1, 1),
    ("gpt-underwater-kelp-hideout.png", 2, 1),
]


def crop_and_key(width, height, rgba, col, row):
    cell_w = width // 3
    cell_h = height // 2
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
            magenta_score = min(r, b) - g
            if r > 185 and b > 185 and g < 115 and magenta_score > 88:
                alpha = 0
            elif r > 155 and b > 155 and g < 145 and magenta_score > 48:
                alpha = max(0, min(255, int((88 - magenta_score) * 8)))
            else:
                alpha = a
            out[dst] = min(r, max(g, b) + 18) if alpha < 255 else r
            out[dst + 1] = g
            out[dst + 2] = min(b, max(r, g) + 18) if alpha < 255 else b
            out[dst + 3] = alpha
    return trim_alpha(out_w, out_h, out)


def main():
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        out_w, out_h, out = crop_and_key(width, height, rgba, col, row)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
