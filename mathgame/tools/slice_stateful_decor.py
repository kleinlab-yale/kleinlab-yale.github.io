#!/usr/bin/env python3
import os

from slice_gpt_atlas import crop_keyed_cell, green_key, green_soft_alpha, read_png, scrub_green, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-stateful-decor-atlas-source.png")
PRESERVE_EXISTING = {
    "gpt-home-lamp-off.png",
    "gpt-home-lamp-on.png",
}

FRAMES = [
    ("gpt-home-lamp-off.png", 0, 0),
    ("gpt-home-lamp-on.png", 1, 0),
    ("gpt-home-tv-off.png", 0, 1),
    ("gpt-home-tv-animal.png", 1, 1),
    ("gpt-kitchen-fridge.png", 0, 2),
    ("gpt-kitchen-fridge-open.png", 1, 2),
    ("gpt-kitchen-oven-closed.png", 0, 3),
    ("gpt-kitchen-oven-open.png", 1, 3),
]


def crop_and_key_2x4(width, height, rgba, col, row):
    return crop_keyed_cell(width, height, rgba, 2, 4, col, row, green_key, green_soft_alpha, scrub_green)


def main():
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        if name in PRESERVE_EXISTING and os.path.exists(os.path.join(ASSETS, name)):
            print(name, "preserved")
            continue
        out_w, out_h, out = crop_and_key_2x4(width, height, rgba, col, row)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
