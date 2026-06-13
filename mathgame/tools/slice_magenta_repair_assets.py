#!/usr/bin/env python3
import os

from slice_puppy_variants import read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

ATLASES = [
    {
        "source": "gpt-home-repair-atlas-source.png",
        "cols": 3,
        "rows": 3,
        "frames": [
            ("gpt-home-couch.png", 0, 0),
            ("gpt-home-plant.png", 1, 0),
            ("gpt-home-lamp-off.png", 2, 0),
            ("gpt-home-lamp-on.png", 0, 1),
            ("gpt-home-tv-off.png", 1, 1),
            ("gpt-home-tv-animal.png", 2, 1),
            ("gpt-home-tv-nature.png", 0, 2),
            ("gpt-home-tv-math.png", 1, 2),
            ("gpt-home-remote.png", 2, 2),
        ],
    },
    {
        "source": "gpt-kitchen-repair-decor-atlas-source.png",
        "cols": 3,
        "rows": 3,
        "frames": [
            ("gpt-kitchen-snack-cart.png", 0, 0),
            ("gpt-kitchen-bowl-station.png", 1, 0),
            ("gpt-kitchen-breakfast-table.png", 2, 0),
            ("gpt-kitchen-fridge.png", 0, 1),
            ("gpt-kitchen-fridge-open.png", 1, 1),
            ("gpt-kitchen-oven-closed.png", 2, 1),
            ("gpt-kitchen-oven-open.png", 0, 2),
            ("gpt-kitchen-cookie-tray.png", 1, 2),
            ("gpt-kitchen-shelf-insert.png", 2, 2),
        ],
    },
    {
        "source": "gpt-kitchen-counter-decor-atlas-source.png",
        "cols": 2,
        "rows": 3,
        "frames": [
            ("gpt-kitchen-cookie-jar.png", 0, 0),
            ("gpt-kitchen-cupcake-stand.png", 1, 0),
            ("gpt-kitchen-tea-kettle.png", 0, 1),
            ("gpt-kitchen-recipe-book.png", 1, 1),
            ("gpt-kitchen-herb-planter.png", 0, 2),
            ("gpt-kitchen-puppy-mug.png", 1, 2),
        ],
    },
]


def crop_and_key(width, height, rgba, cols, rows, col, row):
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
            r, g, b, a = rgba[src:src + 4]
            magenta_score = min(r, b) - g
            if r > 185 and b > 185 and g < 105 and magenta_score > 95:
                alpha = 0
            elif r > 160 and b > 160 and g < 135 and magenta_score > 55:
                alpha = max(0, min(255, int((95 - magenta_score) * 8)))
            else:
                alpha = a
            out[dst] = min(r, max(g, b) + 18) if alpha < 255 else r
            out[dst + 1] = g
            out[dst + 2] = min(b, max(r, g) + 18) if alpha < 255 else b
            out[dst + 3] = alpha
    return trim_alpha(out_w, out_h, out)


def main():
    for atlas in ATLASES:
        width, height, rgba = read_png(os.path.join(ASSETS, atlas["source"]))
        for name, col, row in atlas["frames"]:
            out_w, out_h, out = crop_and_key(width, height, rgba, atlas["cols"], atlas["rows"], col, row)
            write_png(os.path.join(ASSETS, name), out_w, out_h, out)
            print(name, out_w, out_h)


if __name__ == "__main__":
    main()
