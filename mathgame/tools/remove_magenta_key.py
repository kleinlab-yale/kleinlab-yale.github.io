#!/usr/bin/env python3
import argparse

from slice_puppy_variants import read_png, trim_alpha, write_png


def remove_magenta(width, height, rgba):
    out = bytearray(rgba)
    for index in range(0, len(out), 4):
        r, g, b, a = out[index:index + 4]
        magenta_score = min(r, b) - g
        if r > 185 and b > 185 and g < 110 and magenta_score > 90:
            alpha = 0
        elif r > 160 and b > 160 and g < 140 and magenta_score > 50:
            alpha = max(0, min(255, int((90 - magenta_score) * 7)))
        else:
            alpha = a
        if alpha < 255:
            out[index] = min(r, max(g, b) + 18)
            out[index + 2] = min(b, max(r, g) + 18)
        out[index + 3] = alpha
    return trim_alpha(width, height, out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    width, height, rgba = read_png(args.input)
    out_w, out_h, out = remove_magenta(width, height, rgba)
    write_png(args.output, out_w, out_h, out)
    print(args.output, out_w, out_h)


if __name__ == "__main__":
    main()
