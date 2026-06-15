#!/usr/bin/env python3
import os

from slice_gpt_atlas import crop_and_key, keep_largest_component, read_png, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "gpt-home-decor-atlas-source.png")

PRESERVE_EXISTING = {
    "gpt-home-couch.png",
    "gpt-home-tv-off.png",
    "gpt-home-plant.png",
    "gpt-home-rug.png",
    "gpt-home-lamp.png",
}

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


def remove_chair_atlas_sliver(width, height, rgba):
    out = bytearray(rgba)
    left_guard = int(width * 0.13)
    for y in range(height):
        for x in range(left_guard):
            index = (y * width + x) * 4
            r, g, b, a = out[index:index + 4]
            if a > 8 and r > g + 22 and r > b + 28:
                out[index + 3] = 0
    return keep_largest_component(width, height, out)


def main():
    width, height, rgba = read_png(SOURCE)
    for name, col, row in FRAMES:
        if name in PRESERVE_EXISTING and os.path.exists(os.path.join(ASSETS, name)):
            print(name, "preserved")
            continue
        out_w, out_h, out = crop_and_key(width, height, rgba, col, row)
        if name == "gpt-home-chair.png":
            out_w, out_h, out = keep_largest_component(out_w, out_h, out)
            out_w, out_h, out = remove_chair_atlas_sliver(out_w, out_h, out)
        write_png(os.path.join(ASSETS, name), out_w, out_h, out)
        print(name, out_w, out_h)


if __name__ == "__main__":
    main()
