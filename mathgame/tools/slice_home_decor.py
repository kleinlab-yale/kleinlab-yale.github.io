#!/usr/bin/env python3
import os

from slice_gpt_atlas import crop_and_key, read_png, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-home-decor-atlas-source.png")

FRAMES = [
    ("gpt-home-couch.png", 0, 0),
    ("gpt-home-chair.png", 1, 0),
    ("gpt-home-tv-off.png", 2, 0),
    ("gpt-home-tv-star.png", 3, 0),
    ("gpt-home-plant.png", 0, 1),
    ("gpt-home-rug.png", 1, 1),
    ("gpt-home-lamp.png", 2, 1),
    ("gpt-home-table.png", 3, 1),
]


def main():
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        out_w, out_h, out = crop_and_key(width, height, rgba, col, row)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
