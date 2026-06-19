#!/usr/bin/env python3
import os

from slice_gpt_atlas import crop_cell, read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

ATLASES = [
    (
        "gpt-bedroom-furniture-atlas.png",
        [
            ("gpt-bedroom-bed.png", 0, 0),
            ("gpt-bedroom-desk.png", 1, 0),
            ("gpt-bedroom-toy-dresser.png", 0, 1),
            ("gpt-bedroom-cubby.png", 1, 1),
        ],
    ),
    (
        "gpt-bedroom-keepsakes-atlas.png",
        [
            ("gpt-bedroom-lamp.png", 0, 0),
            ("gpt-bedroom-plushies.png", 1, 0),
            ("gpt-bedroom-ballet-bag.png", 0, 1),
            ("gpt-bedroom-hamper.png", 1, 1),
        ],
    ),
]


def main():
    for source_name, sprites in ATLASES:
        width, height, rgba = read_png(os.path.join(ASSETS, source_name))
        for output_name, col, row in sprites:
            out_w, out_h, out = crop_cell(width, height, rgba, 2, 2, col, row)
            out_w, out_h, out = trim_alpha(out_w, out_h, out)
            write_png(os.path.join(ASSETS, output_name), out_w, out_h, out)
            print(output_name, out_w, out_h)


if __name__ == "__main__":
    main()
