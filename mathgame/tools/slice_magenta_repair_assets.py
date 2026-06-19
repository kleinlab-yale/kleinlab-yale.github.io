#!/usr/bin/env python3
import os

from slice_gpt_atlas import (
    crop_keyed_cell,
    keep_largest_component,
    magenta_key,
    magenta_soft_alpha,
    read_png,
    scrub_magenta,
    write_png,
)


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
PRESERVE_EXISTING = {
    # These were repaired from individual magenta-key sources because the atlas
    # crops were not clean enough for in-game placement.
    "gpt-home-couch.png",
    "gpt-home-plant.png",
    "gpt-kitchen-snack-cart.png",
}

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
    {
        "source": "gpt-mountain-decor-atlas-source.png",
        "cols": 3,
        "rows": 2,
        "frames": [
            ("gpt-mountain-tent.png", 0, 0),
            ("gpt-mountain-campfire-off.png", 1, 0),
            ("gpt-mountain-campfire-on.png", 2, 0),
            ("gpt-mountain-snacks.png", 0, 1),
            ("gpt-mountain-shelter.png", 1, 1),
            ("gpt-mountain-lantern.png", 2, 1),
        ],
    },
]


def crop_and_key(width, height, rgba, cols, rows, col, row):
    return crop_keyed_cell(width, height, rgba, cols, rows, col, row, magenta_key, magenta_soft_alpha, scrub_magenta)


def main():
    for atlas in ATLASES:
        width, height, rgba = read_png(os.path.join(ASSETS, atlas["source"]))
        for name, col, row in atlas["frames"]:
            if name in PRESERVE_EXISTING and os.path.exists(os.path.join(ASSETS, name)):
                print(name, "preserved")
                continue
            out_w, out_h, out = crop_and_key(width, height, rgba, atlas["cols"], atlas["rows"], col, row)
            if name in {"gpt-home-lamp-off.png", "gpt-home-lamp-on.png"}:
                out_w, out_h, out = keep_largest_component(out_w, out_h, out)
            write_png(os.path.join(ASSETS, name), out_w, out_h, out)
            print(name, out_w, out_h)


if __name__ == "__main__":
    main()
