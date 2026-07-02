#!/usr/bin/env python3
"""Make selected yard decor visibly opaque while keeping the outer cutout.

The sky meadow ball and basket were sliced from a keyed atlas with partially
transparent interior pixels. This fills the whole visible silhouette to alpha
255, while leaving only the background connected to the canvas edge transparent.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
TARGETS = ("gpt-yard-ball.png", "gpt-yard-basket.png")
TRANSPARENT_THRESHOLD = 8


def exterior_background(alpha: bytes, width: int, height: int) -> bytearray:
    exterior = bytearray(width * height)
    stack: list[int] = []

    def seed(index: int) -> None:
        if exterior[index] or alpha[index] > TRANSPARENT_THRESHOLD:
            return
        exterior[index] = 1
        stack.append(index)

    for x in range(width):
        seed(x)
        seed((height - 1) * width + x)
    for y in range(height):
        seed(y * width)
        seed(y * width + width - 1)

    while stack:
        index = stack.pop()
        x = index % width
        y = index // width
        if x > 0:
            neighbor = index - 1
            if not exterior[neighbor] and alpha[neighbor] <= TRANSPARENT_THRESHOLD:
                exterior[neighbor] = 1
                stack.append(neighbor)
        if x < width - 1:
            neighbor = index + 1
            if not exterior[neighbor] and alpha[neighbor] <= TRANSPARENT_THRESHOLD:
                exterior[neighbor] = 1
                stack.append(neighbor)
        if y > 0:
            neighbor = index - width
            if not exterior[neighbor] and alpha[neighbor] <= TRANSPARENT_THRESHOLD:
                exterior[neighbor] = 1
                stack.append(neighbor)
        if y < height - 1:
            neighbor = index + width
            if not exterior[neighbor] and alpha[neighbor] <= TRANSPARENT_THRESHOLD:
                exterior[neighbor] = 1
                stack.append(neighbor)

    return exterior


def solidify(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = bytearray(image.tobytes())
    alpha = bytes(pixels[3::4])
    exterior = exterior_background(alpha, width, height)

    opaque = 0
    transparent = 0
    for index, is_exterior in enumerate(exterior):
        alpha_offset = index * 4 + 3
        if is_exterior:
            pixels[alpha_offset] = 0
            transparent += 1
        else:
            pixels[alpha_offset] = 255
            opaque += 1

    Image.frombytes("RGBA", (width, height), bytes(pixels)).save(path)
    print(f"{path.name}\topaque={opaque}\ttransparent={transparent}")


def main() -> None:
    for name in TARGETS:
        solidify(ASSETS / name)


if __name__ == "__main__":
    main()
