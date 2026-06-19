#!/usr/bin/env python3
import os

from slice_gpt_atlas import crop_keyed_cell, green_key, green_soft_alpha, read_png, scrub_green, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-kitchen-decor-atlas-source.png")

FRAMES = [
    ("gpt-kitchen-snack-cart.png", 0, 0),
    ("gpt-kitchen-fridge.png", 1, 0),
    ("gpt-kitchen-bowl-station.png", 0, 1),
    ("gpt-kitchen-breakfast-table.png", 1, 1),
]


def crop_and_key_2x2(width, height, rgba, col, row):
    return crop_keyed_cell(width, height, rgba, 2, 2, col, row, green_key, green_soft_alpha, scrub_green)


def main():
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        out_w, out_h, out = crop_and_key_2x2(width, height, rgba, col, row)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
