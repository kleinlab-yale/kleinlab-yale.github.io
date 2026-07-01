#!/usr/bin/env python3
"""Rebuild puppy frame PNGs from their source atlases without clipping.

The older slicers cut each atlas slot as a fixed rectangle. That works only
when the generated art stays perfectly inside its slot. Several puppy poses
cross slot boundaries slightly, so fixed slicing can either shave feet/tails
or keep a sliver from the neighboring pose. This script keys the whole source
sheet, finds connected foreground components, assigns each component to the
frame slot containing its centroid, and then crops the intended component(s)
with consistent transparent padding.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
MARGIN = 18
ALPHA_THRESHOLD = 16

BREEDS = ("golden", "corgi", "husky")
OUTFIT_LOOKS = ("sweater", "bow", "collar")

BASE_FRAMES = [
    ("base", 0, 0),
    ("bow", 1, 0),
    ("sweater", 2, 0),
    ("collar", 3, 0),
    ("thinking", 0, 1),
    ("celebrate", 1, 1),
    ("sleepy", 2, 1),
    ("wag-a", 3, 1),
    ("wag-b", 0, 2),
    ("roll-a", 1, 2),
    ("roll-b", 2, 2),
    ("roll-c", 3, 2),
]

ACTION_FRAMES = [
    ("thinking", 0, 0),
    ("celebrate", 1, 0),
    ("sleepy", 2, 0),
    ("wag-a", 0, 1),
    ("wag-b", 1, 1),
    ("roll-a", 2, 1),
    ("roll-b", 0, 2),
    ("roll-c", 1, 2),
    ("couch-sit", 2, 2),
]

SCUBA_FRAMES = [
    ("base", 0, 0),
    ("thinking", 1, 0),
    ("celebrate", 2, 0),
    ("sleepy", 0, 1),
    ("wag-a", 1, 1),
    ("wag-b", 2, 1),
    ("roll-a", 0, 2),
    ("roll-b", 1, 2),
    ("roll-c", 2, 2),
]

COUCH_SIT_FRAMES = [
    ("golden", 0, 0),
    ("corgi", 1, 0),
    ("husky", 2, 0),
]


@dataclass
class Component:
    area: int
    bbox: tuple[int, int, int, int]
    centroid: tuple[float, float]
    pixels: list[int]


def is_scuba_background_pixel(r: int, g: int, b: int) -> bool:
    """Return true for the pink/magenta scuba atlas background gradient."""

    return r > 160 and b > 145 and (r - g) > 10 and (b - g) > 10


def flood_key_scuba_background(image: Image.Image, cols: int = 3, rows: int = 3) -> Image.Image:
    """Remove scuba atlas background by flood-filling from each cell edge.

    The scuba sheets use a magenta-to-pale-pink gradient plus white grid lines.
    A raw color threshold either misses the pale background or eats cute pink
    dog details. Flood-filling from known background edges removes the connected
    backdrop while leaving interior dog details alone.
    """

    keyed = image.convert("RGBA")
    width, height = keyed.size
    pixels = keyed.load()
    visited = bytearray(width * height)
    stack: list[int] = []

    def add_seed(x: int, y: int) -> None:
        if not (0 <= x < width and 0 <= y < height):
            return
        index = y * width + x
        if visited[index]:
            return
        r, g, b, _ = pixels[x, y]
        if is_scuba_background_pixel(r, g, b):
            visited[index] = 1
            stack.append(index)

    for row in range(rows):
        y0 = round(height * row / rows)
        y1 = round(height * (row + 1) / rows) - 1
        for col in range(cols):
            x0 = round(width * col / cols)
            x1 = round(width * (col + 1) / cols) - 1
            for x in range(x0 + 3, x1 - 2, 8):
                add_seed(x, y0 + 3)
                add_seed(x, y1 - 3)
            for y in range(y0 + 3, y1 - 2, 8):
                add_seed(x0 + 3, y)
                add_seed(x1 - 3, y)

    while stack:
        index = stack.pop()
        x = index % width
        y = index // width
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

        if x > 0:
            neighbor = index - 1
            if not visited[neighbor]:
                r, g, b, _ = pixels[x - 1, y]
                if is_scuba_background_pixel(r, g, b):
                    visited[neighbor] = 1
                    stack.append(neighbor)
        if x < width - 1:
            neighbor = index + 1
            if not visited[neighbor]:
                r, g, b, _ = pixels[x + 1, y]
                if is_scuba_background_pixel(r, g, b):
                    visited[neighbor] = 1
                    stack.append(neighbor)
        if y > 0:
            neighbor = index - width
            if not visited[neighbor]:
                r, g, b, _ = pixels[x, y - 1]
                if is_scuba_background_pixel(r, g, b):
                    visited[neighbor] = 1
                    stack.append(neighbor)
        if y < height - 1:
            neighbor = index + width
            if not visited[neighbor]:
                r, g, b, _ = pixels[x, y + 1]
                if is_scuba_background_pixel(r, g, b):
                    visited[neighbor] = 1
                    stack.append(neighbor)

    # Catch saturated magenta islands that may be isolated by the white grid.
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            score = min(r, b) - g
            if r > 185 and b > 185 and g < 140 and score > 48:
                pixels[x, y] = (r, g, b, 0)
            elif r > 165 and b > 165 and g < 155 and score > 32:
                alpha = max(0, min(255, int((48 - score) * 8)))
                pixels[x, y] = (
                    min(r, max(g, b) + 18) if alpha < 255 else r,
                    g,
                    min(b, max(r, g) + 18) if alpha < 255 else b,
                    alpha,
                )

    return keyed


def key_background(image: Image.Image, mode: str) -> Image.Image:
    """Convert source background color to transparent alpha."""

    if mode == "magenta":
        return flood_key_scuba_background(image)

    keyed = image.convert("RGBA")
    pixels = keyed.load()
    width, height = keyed.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            score = g - max(r, b)
            if g > 150 and score > 42:
                alpha = 0
            elif g > 115 and score > 18:
                alpha = max(0, min(255, int((42 - score) * 10)))
            else:
                alpha = a
            pixels[x, y] = (
                r,
                min(g, max(r, b) + 18) if alpha < 255 else g,
                b,
                alpha,
            )
    return keyed


def clear_grid_lines(image: Image.Image, cols: int, rows: int, radius: int = 2) -> None:
    """Remove explicit white atlas dividers before component detection."""

    pixels = image.load()
    width, height = image.size
    for col in range(1, cols):
        x0 = round(width * col / cols)
        for x in range(max(0, x0 - radius), min(width, x0 + radius + 1)):
            for y in range(height):
                r, g, b, a = pixels[x, y]
                if a and r > 220 and g > 220 and b > 220:
                    pixels[x, y] = (r, g, b, 0)
    for row in range(1, rows):
        y0 = round(height * row / rows)
        for y in range(max(0, y0 - radius), min(height, y0 + radius + 1)):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a and r > 220 and g > 220 and b > 220:
                    pixels[x, y] = (r, g, b, 0)


def connected_components(image: Image.Image) -> list[Component]:
    alpha = image.getchannel("A")
    width, height = image.size
    values = alpha.tobytes()
    visited = bytearray(width * height)
    components: list[Component] = []

    for start, value in enumerate(values):
        if visited[start] or value <= ALPHA_THRESHOLD:
            continue

        visited[start] = 1
        stack = [start]
        pixels: list[int] = []
        area = 0
        sum_x = 0
        sum_y = 0
        min_x = max_x = start % width
        min_y = max_y = start // width

        while stack:
            index = stack.pop()
            x = index % width
            y = index // width
            pixels.append(index)
            area += 1
            sum_x += x
            sum_y += y
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)

            if x > 0:
                neighbor = index - 1
                if not visited[neighbor] and values[neighbor] > ALPHA_THRESHOLD:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if x < width - 1:
                neighbor = index + 1
                if not visited[neighbor] and values[neighbor] > ALPHA_THRESHOLD:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if y > 0:
                neighbor = index - width
                if not visited[neighbor] and values[neighbor] > ALPHA_THRESHOLD:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if y < height - 1:
                neighbor = index + width
                if not visited[neighbor] and values[neighbor] > ALPHA_THRESHOLD:
                    visited[neighbor] = 1
                    stack.append(neighbor)

        components.append(
            Component(
                area=area,
                bbox=(min_x, min_y, max_x, max_y),
                centroid=(sum_x / area, sum_y / area),
                pixels=pixels,
            )
        )

    return components


def component_distance(a: Component, b: Component) -> tuple[int, int]:
    ax0, ay0, ax1, ay1 = a.bbox
    bx0, by0, bx1, by1 = b.bbox
    dx = max(ax0 - bx1, bx0 - ax1, 0)
    dy = max(ay0 - by1, by0 - ay1, 0)
    return dx, dy


def useful_components(components: list[Component]) -> list[Component]:
    if not components:
        return []

    largest = max(components, key=lambda component: component.area)
    useful = [largest]
    for component in components:
        if component is largest or component.area < 12:
            continue
        dx, dy = component_distance(component, largest)
        if component.area >= 80 or (component.area >= 25 and dx <= 70 and dy <= 70):
            useful.append(component)
    return useful


def write_components(
    image: Image.Image,
    components: list[Component],
    output_path: Path,
    margin: int = MARGIN,
) -> None:
    selected = useful_components(components)
    if not selected:
        raise ValueError(f"No usable foreground components for {output_path.name}")

    width, height = image.size
    min_x = max(0, min(component.bbox[0] for component in selected) - margin)
    min_y = max(0, min(component.bbox[1] for component in selected) - margin)
    max_x = min(width - 1, max(component.bbox[2] for component in selected) + margin)
    max_y = min(height - 1, max(component.bbox[3] for component in selected) + margin)

    out_width = max_x - min_x + 1
    out_height = max_y - min_y + 1
    output = Image.new("RGBA", (out_width, out_height), (0, 0, 0, 0))
    source_pixels = image.load()
    output_pixels = output.load()

    for component in selected:
        for index in component.pixels:
            x = index % width
            y = index // width
            if min_x <= x <= max_x and min_y <= y <= max_y:
                output_pixels[x - min_x, y - min_y] = source_pixels[x, y]

    output.save(output_path)
    print(f"{output_path.name}\t{out_width}x{out_height}")


def rebuild_atlas(
    source_name: str,
    cols: int,
    rows: int,
    frames: list[tuple[str, int, int]],
    output_name,
    background: str = "green",
    remove_grid: bool = False,
) -> None:
    source = Image.open(ASSETS / source_name)
    keyed = key_background(source, background)
    if remove_grid:
        clear_grid_lines(keyed, cols, rows)

    width, height = keyed.size
    cell_width = width / cols
    cell_height = height / rows
    frame_slots = {(col, row) for _, col, row in frames}
    grouped = {slot: [] for slot in frame_slots}

    for component in connected_components(keyed):
        if component.area < 10:
            continue
        centroid_x, centroid_y = component.centroid
        col = min(cols - 1, max(0, int(centroid_x // cell_width)))
        row = min(rows - 1, max(0, int(centroid_y // cell_height)))
        if (col, row) in grouped:
            grouped[(col, row)].append(component)

    for frame, col, row in frames:
        name = output_name(frame)
        write_components(keyed, grouped.get((col, row), []), ASSETS / name)


def main() -> None:
    for breed in BREEDS:
        rebuild_atlas(
            f"gpt-puppy-{breed}-atlas-source.png",
            cols=4,
            rows=3,
            frames=BASE_FRAMES,
            output_name=lambda frame, breed=breed: f"gpt-puppy-{breed}-{frame}.png",
        )

    for breed in BREEDS:
        for look in OUTFIT_LOOKS:
            rebuild_atlas(
                f"gpt-puppy-{breed}-{look}-action-atlas-source.png",
                cols=3,
                rows=3,
                frames=ACTION_FRAMES,
                output_name=lambda frame, breed=breed, look=look: f"gpt-puppy-{breed}-{look}-{frame}.png",
            )

    for breed in BREEDS:
        rebuild_atlas(
            f"gpt-puppy-{breed}-scuba-atlas-source.png",
            cols=3,
            rows=3,
            frames=SCUBA_FRAMES,
            output_name=lambda frame, breed=breed: f"gpt-puppy-{breed}-scuba-{frame}.png",
            background="magenta",
            remove_grid=True,
        )

    rebuild_atlas(
        "gpt-puppy-couch-sit-atlas-source.png",
        cols=3,
        rows=1,
        frames=COUCH_SIT_FRAMES,
        output_name=lambda breed: f"gpt-puppy-{breed}-couch-sit.png",
    )


if __name__ == "__main__":
    main()
