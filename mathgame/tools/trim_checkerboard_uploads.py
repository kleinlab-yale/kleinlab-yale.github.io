#!/usr/bin/env python3
from collections import deque
import os
import sys

from slice_gpt_atlas import keep_largest_component, read_png, trim_alpha, write_png


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def is_border_checker(r, g, b, a):
    if a == 0:
        return True
    avg = (r + g + b) // 3
    chroma = max(r, g, b) - min(r, g, b)
    return 70 <= avg <= 255 and chroma <= 10


def is_gray_edge_halo(r, g, b, a):
    if a == 0:
        return True
    avg = (r + g + b) // 3
    chroma = max(r, g, b) - min(r, g, b)
    return 78 <= avg <= 218 and chroma <= 16


def flood_connected_background(width, height, rgba):
    mask = bytearray(width * height)
    seen = bytearray(width * height)
    queue = deque()

    def visit(index):
        if seen[index]:
            return
        seen[index] = 1
        pixel = index * 4
        if is_border_checker(*rgba[pixel:pixel + 4]):
            mask[index] = 1
            queue.append(index)

    for x in range(width):
        visit(x)
        visit((height - 1) * width + x)
    for y in range(1, height - 1):
        visit(y * width)
        visit(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if x > 0:
            visit(index - 1)
        if x < width - 1:
            visit(index + 1)
        if y > 0:
            visit(index - width)
        if y < height - 1:
            visit(index + width)

    return mask


def has_transparent_neighbor(mask, width, height, x, y):
    for yy in range(max(0, y - 1), min(height, y + 2)):
        for xx in range(max(0, x - 1), min(width, x + 2)):
            if xx == x and yy == y:
                continue
            if mask[yy * width + xx]:
                return True
    return False


def remove_gray_halo(width, height, rgba, mask, passes=3):
    for _ in range(passes):
        next_mask = bytearray(mask)
        for y in range(height):
            for x in range(width):
                index = y * width + x
                if mask[index] or not has_transparent_neighbor(mask, width, height, x, y):
                    continue
                pixel = index * 4
                if is_gray_edge_halo(*rgba[pixel:pixel + 4]):
                    next_mask[index] = 1
        mask = next_mask
    return mask


def remove_large_gray_checker_components(width, height, rgba, min_area=2000):
    mask = bytearray(width * height)
    for index in range(width * height):
        pixel = index * 4
        r, g, b, a = rgba[pixel:pixel + 4]
        avg = (r + g + b) // 3
        chroma = max(r, g, b) - min(r, g, b)
        if a > 8 and chroma <= 10 and 90 <= avg <= 235:
            mask[index] = 1

    seen = bytearray(width * height)
    for start in range(width * height):
        if seen[start] or not mask[start]:
            continue
        seen[start] = 1
        queue = [start]
        pixels = []
        while queue:
            index = queue.pop()
            pixels.append(index)
            x = index % width
            y = index // width
            for neighbor in (
                index - 1 if x > 0 else None,
                index + 1 if x < width - 1 else None,
                index - width if y > 0 else None,
                index + width if y < height - 1 else None,
            ):
                if neighbor is None or seen[neighbor] or not mask[neighbor]:
                    continue
                seen[neighbor] = 1
                queue.append(neighbor)
        if len(pixels) >= min_area:
            for index in pixels:
                rgba[index * 4 + 3] = 0
    return rgba


def bleed_rgb_into_transparent(width, height, rgba):
    out = bytearray(rgba)
    seen = bytearray(width * height)
    queue = deque()

    for index in range(width * height):
        if rgba[index * 4 + 3] > 8:
            seen[index] = 1
            queue.append(index)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        for neighbor in (
            index - 1 if x > 0 else None,
            index + 1 if x < width - 1 else None,
            index - width if y > 0 else None,
            index + width if y < height - 1 else None,
        ):
            if neighbor is None or seen[neighbor]:
                continue
            src = index * 4
            dst = neighbor * 4
            out[dst] = out[src]
            out[dst + 1] = out[src + 1]
            out[dst + 2] = out[src + 2]
            seen[neighbor] = 1
            queue.append(neighbor)
    return out


def trim_uploaded_asset(source, destination):
    width, height, rgba = read_png(source)
    mask = flood_connected_background(width, height, rgba)
    mask = remove_gray_halo(width, height, rgba, mask)

    keyed = bytearray(rgba)
    for index, is_background in enumerate(mask):
        if is_background:
            keyed[index * 4 + 3] = 0

    keyed = remove_large_gray_checker_components(width, height, keyed)
    width, height, keyed = keep_largest_component(width, height, keyed)
    width, height, keyed = trim_alpha(width, height, keyed)
    keyed = bleed_rgb_into_transparent(width, height, keyed)
    write_png(destination, width, height, keyed)
    print(f"{destination}: {width}x{height}")


def main():
    if len(sys.argv) < 3 or len(sys.argv[1:]) % 2:
        raise SystemExit("usage: trim_checkerboard_uploads.py source.png destination.png [source.png destination.png ...]")
    for source, destination in zip(sys.argv[1::2], sys.argv[2::2]):
        trim_uploaded_asset(source, destination)


if __name__ == "__main__":
    main()
