#!/usr/bin/env python3
import os
from collections import deque

from slice_gpt_atlas import (
    green_key,
    green_soft_alpha,
    magenta_key,
    magenta_soft_alpha,
    read_png,
    scrub_green,
    scrub_magenta,
    trim_alpha,
    write_png,
)


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

GENERATED_SOURCES = {
    "gpt-kitchen-breakfast-table-source.png": "gpt-kitchen-breakfast-table.png",
}

STATE_SHEETS = [
    {
        "source": "gpt-kitchen-fridge-state-sheet-source.png",
        "cols": 2,
        "per_frame_crop": True,
        "solidify": True,
        "preserve_key_colored_subject": True,
        "connected_background_only": True,
        "bleed_transparent_rgb": True,
        "clear_bleed": {
            "gpt-kitchen-fridge.png": [{"side": "right", "start": 0.82}],
        },
        "outputs": [
            "gpt-kitchen-fridge.png",
            "gpt-kitchen-fridge-open.png",
        ],
    },
    {
        "source": "gpt-kitchen-oven-state-sheet-source.png",
        "cols": 4,
        "outputs": [
            "gpt-kitchen-oven-closed.png",
            "gpt-kitchen-oven-cookies.png",
            "gpt-kitchen-oven-pizza.png",
            "gpt-kitchen-oven-cake.png",
        ],
    },
]

CLEAN_EXISTING = [
    "gpt-kitchen-bowl-station.png",
    "gpt-kitchen-cookie-jar.png",
    "gpt-kitchen-cookie-tray.png",
    "gpt-kitchen-cupcake-stand.png",
    "gpt-kitchen-herb-planter.png",
    "gpt-kitchen-puppy-mug.png",
    "gpt-kitchen-recipe-book.png",
    "gpt-kitchen-shelf-insert.png",
    "gpt-kitchen-snack-cart.png",
    "gpt-kitchen-tea-kettle.png",
]


def strict_magenta(r, g, b, a):
    return a > 0 and r > 215 and b > 215 and g < 120 and min(r, b) - g > 95


def obvious_magenta_key(r, g, b, a):
    return a > 0 and r > 210 and b > 170 and g < 90 and r - g > 120 and b - g > 80


def strict_green(r, g, b, a):
    return a > 0 and g > 155 and g - max(r, b) > 42


def border_key_counts(width, height, rgba):
    magenta = 0
    green = 0
    coords = [(x, 0) for x in range(width)]
    coords += [(x, height - 1) for x in range(width)]
    coords += [(0, y) for y in range(1, height - 1)]
    coords += [(width - 1, y) for y in range(1, height - 1)]
    for x, y in coords:
        pixel = (y * width + x) * 4
        color = rgba[pixel:pixel + 4]
        magenta += 1 if magenta_key(*color) else 0
        green += 1 if green_key(*color) else 0
    return magenta, green


def has_transparent_neighbor(width, height, rgba, x, y, radius=2):
    for yy in range(max(0, y - radius), min(height, y + radius + 1)):
        for xx in range(max(0, x - radius), min(width, x + radius + 1)):
            if xx == x and yy == y:
                continue
            if rgba[(yy * width + xx) * 4 + 3] <= 10:
                return True
    return False


def clean_key_fringe(width, height, rgba, should_trim=True):
    out = bytearray(rgba)
    for y in range(height):
        for x in range(width):
            pixel = (y * width + x) * 4
            r, g, b, a = out[pixel:pixel + 4]
            if a <= 2:
                out[pixel + 3] = 0
                continue
            bottom_key_residue = (
                y > height * 0.82
                and r > 130
                and b > 100
                and g < 125
                and r - g > 35
                and b - g > 25
            )
            if strict_magenta(r, g, b, a) or obvious_magenta_key(r, g, b, a):
                out[pixel + 3] = 0
                continue
            if bottom_key_residue:
                out[pixel + 3] = 0
                continue
            if not has_transparent_neighbor(width, height, out, x, y):
                continue
            if strict_green(r, g, b, a):
                out[pixel + 3] = 0
            elif r > 165 and b > 150 and g < 145 and min(r, b) - g > 30:
                out[pixel + 3] = 0
            elif a < 80 and r > 150 and b > 150 and g < 165 and min(r, b) - g > 42:
                out[pixel], out[pixel + 1], out[pixel + 2] = scrub_magenta(r, g, b)
                out[pixel + 3] = min(a, 26)
            elif a < 80 and g > 115 and g - max(r, b) > 22:
                out[pixel], out[pixel + 1], out[pixel + 2] = scrub_green(r, g, b)
                out[pixel + 3] = min(a, 26)
    if should_trim:
        return trim_alpha(width, height, out)
    return width, height, out


def clear_edge_bleed(width, height, rgba, side, start):
    out = bytearray(rgba)
    if side == "right":
        x_range = range(int(width * start), width)
    elif side == "left":
        x_range = range(0, int(width * start))
    else:
        return width, height, out
    for y in range(height):
        for x in x_range:
            out[(y * width + x) * 4 + 3] = 0
    return width, height, out


def solidify_subject_alpha(width, height, rgba, preserve_key_colored=False):
    out = bytearray(rgba)
    for index in range(0, len(out), 4):
        r, g, b, a = out[index:index + 4]
        if a <= 8:
            out[index + 3] = 0
        elif not preserve_key_colored and (strict_magenta(r, g, b, a) or obvious_magenta_key(r, g, b, a) or strict_green(r, g, b, a)):
            out[index + 3] = 0
        else:
            out[index + 3] = 255
    return width, height, out


def bleed_rgb_into_transparent(width, height, rgba):
    out = bytearray(rgba)
    known = [out[index + 3] > 8 for index in range(0, len(out), 4)]
    opaque_colors = [
        (out[index], out[index + 1], out[index + 2])
        for index in range(0, len(out), 4)
        if out[index + 3] > 8
    ]
    fallback = tuple(sum(color[channel] for color in opaque_colors) // max(1, len(opaque_colors)) for channel in range(3))
    queue = deque(pos for pos, is_known in enumerate(known) if is_known)
    while queue:
        pos = queue.popleft()
        x = pos % width
        y = pos // width
        src = pos * 4
        for yy in range(max(0, y - 1), min(height, y + 2)):
            for xx in range(max(0, x - 1), min(width, x + 2)):
                neighbor = yy * width + xx
                if known[neighbor]:
                    continue
                dst = neighbor * 4
                out[dst], out[dst + 1], out[dst + 2] = out[src], out[src + 1], out[src + 2]
                out[dst + 3] = 0
                known[neighbor] = True
                queue.append(neighbor)

    for pos, is_known in enumerate(known):
        pixel = pos * 4
        if out[pixel + 3] == 0 and not is_known:
            out[pixel], out[pixel + 1], out[pixel + 2] = fallback
    return width, height, out


def crop_sheet_cell(width, height, rgba, cols, col):
    cell_w = width // cols
    x0 = col * cell_w
    out = bytearray(cell_w * height * 4)
    for y in range(height):
        for x in range(cell_w):
            src = (y * width + x0 + x) * 4
            dst = (y * cell_w + x) * 4
            out[dst:dst + 4] = rgba[src:src + 4]
    return cell_w, height, out


def key_connected_background_preserve(width, height, rgba, key_fn, soft_alpha_fn, scrub_fn):
    mask = [False] * (width * height)
    seen = [False] * (width * height)
    stack = []

    def visit(x, y):
        index = y * width + x
        if seen[index]:
            return
        seen[index] = True
        pixel = index * 4
        if key_fn(*rgba[pixel:pixel + 4]):
            mask[index] = True
            stack.append((x, y))

    for x in range(width):
        visit(x, 0)
        visit(x, height - 1)
    for y in range(1, height - 1):
        visit(0, y)
        visit(width - 1, y)

    while stack:
        x, y = stack.pop()
        if x > 0:
            visit(x - 1, y)
        if x < width - 1:
            visit(x + 1, y)
        if y > 0:
            visit(x, y - 1)
        if y < height - 1:
            visit(x, y + 1)

    out = bytearray(rgba)
    for index, is_background in enumerate(mask):
        if is_background:
            out[index * 4 + 3] = 0

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if mask[index] or not has_masked_neighbor(mask, width, height, x, y):
                continue
            pixel = index * 4
            r, g, b, a = out[pixel:pixel + 4]
            alpha = soft_alpha_fn(r, g, b, a)
            if alpha is None or alpha >= a:
                continue
            out[pixel], out[pixel + 1], out[pixel + 2] = scrub_fn(r, g, b)
            out[pixel + 3] = alpha
    return width, height, out


def has_masked_neighbor(mask, width, height, x, y):
    for yy in range(max(0, y - 1), min(height, y + 2)):
        for xx in range(max(0, x - 1), min(width, x + 2)):
            if xx == x and yy == y:
                continue
            if mask[yy * width + xx]:
                return True
    return False


def alpha_bbox(width, height, rgba):
    min_x, min_y = width, height
    max_x, max_y = -1, -1
    for y in range(height):
        for x in range(width):
            if rgba[(y * width + x) * 4 + 3] > 8:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    return min_x, min_y, max_x, max_y


def crop_to_box(width, height, rgba, box):
    min_x, min_y, max_x, max_y = box
    out_w = max_x - min_x + 1
    out_h = max_y - min_y + 1
    out = bytearray(out_w * out_h * 4)
    for y in range(out_h):
        for x in range(out_w):
            src = ((min_y + y) * width + min_x + x) * 4
            dst = (y * out_w + x) * 4
            out[dst:dst + 4] = rgba[src:src + 4]
    return out_w, out_h, out


def key_generated_source(source):
    width, height, rgba = read_png(os.path.join(ASSETS, source))
    magenta, green = border_key_counts(width, height, rgba)
    if magenta >= green:
        keyed = key_connected_background_preserve(width, height, rgba, magenta_key, magenta_soft_alpha, scrub_magenta)
    else:
        keyed = key_connected_background_preserve(width, height, rgba, green_key, green_soft_alpha, scrub_green)
    return clean_key_fringe(*keyed)


def key_state_sheet(sheet):
    width, height, rgba = read_png(os.path.join(ASSETS, sheet["source"]))
    keyed_frames = []
    boxes = []
    for col, output in enumerate(sheet["outputs"]):
        cell_w, cell_h, cell = crop_sheet_cell(width, height, rgba, sheet["cols"], col)
        keyed = key_connected_background_preserve(cell_w, cell_h, cell, magenta_key, magenta_soft_alpha, scrub_magenta)
        if not sheet.get("connected_background_only"):
            keyed = clean_key_fringe(*keyed, should_trim=False)
        for bleed in sheet.get("clear_bleed", {}).get(output, []):
            keyed = clear_edge_bleed(*keyed, bleed["side"], bleed["start"])
        if sheet.get("solidify"):
            keyed = solidify_subject_alpha(*keyed, preserve_key_colored=sheet.get("preserve_key_colored_subject", False))
        keyed_frames.append((output, keyed))
        boxes.append(alpha_bbox(*keyed))

    valid_boxes = [box for box in boxes if box[2] >= box[0] and box[3] >= box[1]]
    if sheet.get("per_frame_crop"):
        for output, (frame_w, frame_h, frame), box in zip(sheet["outputs"], [frame for _, frame in keyed_frames], boxes):
            if box[2] < box[0] or box[3] < box[1]:
                continue
            crop_box = (
                max(0, box[0] - 18),
                max(0, box[1] - 18),
                min(frame_w - 1, box[2] + 18),
                min(frame_h - 1, box[3] + 18),
            )
            out_w, out_h, out = crop_to_box(frame_w, frame_h, frame, crop_box)
            if sheet.get("bleed_transparent_rgb"):
                out_w, out_h, out = bleed_rgb_into_transparent(out_w, out_h, out)
            write_png(os.path.join(ASSETS, output), out_w, out_h, out)
            print(output, out_w, out_h, "sheet")
        return

    min_x = max(0, min(box[0] for box in valid_boxes) - 18)
    min_y = max(0, min(box[1] for box in valid_boxes) - 18)
    max_x = min(keyed_frames[0][1][0] - 1, max(box[2] for box in valid_boxes) + 18)
    max_y = min(keyed_frames[0][1][1] - 1, max(box[3] for box in valid_boxes) + 18)
    box = (min_x, min_y, max_x, max_y)

    for output, (frame_w, frame_h, frame) in keyed_frames:
        out_w, out_h, out = crop_to_box(frame_w, frame_h, frame, box)
        if sheet.get("bleed_transparent_rgb"):
            out_w, out_h, out = bleed_rgb_into_transparent(out_w, out_h, out)
        write_png(os.path.join(ASSETS, output), out_w, out_h, out)
        print(output, out_w, out_h, "sheet")


def clean_existing_asset(name):
    width, height, rgba = read_png(os.path.join(ASSETS, name))
    return clean_key_fringe(width, height, rgba)


def main():
    for sheet in STATE_SHEETS:
        key_state_sheet(sheet)
    keyed_outputs = {}
    for source, output in GENERATED_SOURCES.items():
        width, height, rgba = key_generated_source(source)
        write_png(os.path.join(ASSETS, output), width, height, rgba)
        keyed_outputs[output] = (width, height, rgba)
        print(output, width, height)
    for name in CLEAN_EXISTING:
        path = os.path.join(ASSETS, name)
        if not os.path.exists(path):
            continue
        width, height, rgba = clean_existing_asset(name)
        write_png(path, width, height, rgba)
        print(name, width, height, "cleaned")


if __name__ == "__main__":
    main()
