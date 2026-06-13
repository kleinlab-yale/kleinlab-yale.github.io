#!/usr/bin/env python3
import math
import os
import random
import struct
import zlib


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
random.seed(12)


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def mix(a, b, t):
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(4))


class Canvas:
    def __init__(self, width, height, color=(0, 0, 0, 0)):
        self.width = width
        self.height = height
        self.data = bytearray(color * width * height)

    def blend_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        idx = (y * self.width + x) * 4
        sr, sg, sb, sa = color
        if sa <= 0:
            return
        da = self.data[idx + 3]
        inv = 255 - sa
        out_a = sa + da * inv // 255
        if out_a <= 0:
            return
        self.data[idx] = clamp((sr * sa + self.data[idx] * da * inv // 255) / out_a)
        self.data[idx + 1] = clamp((sg * sa + self.data[idx + 1] * da * inv // 255) / out_a)
        self.data[idx + 2] = clamp((sb * sa + self.data[idx + 2] * da * inv // 255) / out_a)
        self.data[idx + 3] = clamp(out_a)

    def fill_gradient(self, top, bottom):
        for y in range(self.height):
            t = y / max(1, self.height - 1)
            col = mix(top, bottom, t)
            row = bytearray(col * self.width)
            start = y * self.width * 4
            self.data[start:start + self.width * 4] = row

    def noise(self, amount=9, alpha_only=False):
        for y in range(self.height):
            for x in range(self.width):
                idx = (y * self.width + x) * 4
                n = random.randint(-amount, amount)
                if alpha_only:
                    self.data[idx + 3] = clamp(self.data[idx + 3] + n)
                else:
                    self.data[idx] = clamp(self.data[idx] + n)
                    self.data[idx + 1] = clamp(self.data[idx + 1] + n)
                    self.data[idx + 2] = clamp(self.data[idx + 2] + n)

    def ellipse(self, cx, cy, rx, ry, color, softness=0.06):
        x0 = int(cx - rx - 3)
        x1 = int(cx + rx + 3)
        y0 = int(cy - ry - 3)
        y1 = int(cy + ry + 3)
        for y in range(y0, y1 + 1):
            yy = (y - cy) / ry
            for x in range(x0, x1 + 1):
                xx = (x - cx) / rx
                d = xx * xx + yy * yy
                if d <= 1.0:
                    edge = min(1.0, max(0.0, (1.0 - d) / max(0.001, softness)))
                    self.blend_px(x, y, (color[0], color[1], color[2], clamp(color[3] * edge)))

    def ellipse_gradient(self, cx, cy, rx, ry, inner, outer, light=(-0.35, -0.45), softness=0.05):
        x0 = int(cx - rx - 3)
        x1 = int(cx + rx + 3)
        y0 = int(cy - ry - 3)
        y1 = int(cy + ry + 3)
        for y in range(y0, y1 + 1):
            yy = (y - cy) / ry
            for x in range(x0, x1 + 1):
                xx = (x - cx) / rx
                d = xx * xx + yy * yy
                if d <= 1.0:
                    radial = math.sqrt(d)
                    col = mix(inner, outer, radial)
                    lx = xx - light[0]
                    ly = yy - light[1]
                    shine = max(0.0, 1.0 - math.sqrt(lx * lx + ly * ly) * 1.55)
                    shade = max(0.0, (xx + yy) * 0.14)
                    r = clamp(col[0] + shine * 54 - shade * 32)
                    g = clamp(col[1] + shine * 54 - shade * 32)
                    b = clamp(col[2] + shine * 48 - shade * 28)
                    edge = min(1.0, max(0.0, (1.0 - d) / max(0.001, softness)))
                    self.blend_px(x, y, (r, g, b, clamp(col[3] * edge)))

    def rounded_rect(self, x, y, w, h, radius, color, softness=0.06):
        x0 = int(x - 2)
        x1 = int(x + w + 2)
        y0 = int(y - 2)
        y1 = int(y + h + 2)
        for py in range(y0, y1 + 1):
            for px in range(x0, x1 + 1):
                qx = abs(px - (x + w / 2)) - w / 2 + radius
                qy = abs(py - (y + h / 2)) - h / 2 + radius
                ox = max(qx, 0)
                oy = max(qy, 0)
                dist = math.sqrt(ox * ox + oy * oy) + min(max(qx, qy), 0) - radius
                if dist <= 0:
                    edge = min(1.0, max(0.0, -dist / max(0.001, radius * softness)))
                    self.blend_px(px, py, (color[0], color[1], color[2], clamp(color[3] * edge)))

    def polygon(self, points, color):
        ys = [p[1] for p in points]
        min_y = max(0, int(min(ys)))
        max_y = min(self.height - 1, int(max(ys)))
        for y in range(min_y, max_y + 1):
            hits = []
            for i, p1 in enumerate(points):
                p2 = points[(i + 1) % len(points)]
                if (p1[1] <= y < p2[1]) or (p2[1] <= y < p1[1]):
                    t = (y - p1[1]) / (p2[1] - p1[1])
                    hits.append(p1[0] + (p2[0] - p1[0]) * t)
            hits.sort()
            for i in range(0, len(hits), 2):
                if i + 1 >= len(hits):
                    continue
                for x in range(max(0, int(hits[i])), min(self.width - 1, int(hits[i + 1])) + 1):
                    self.blend_px(x, y, color)

    def line(self, x0, y0, x1, y1, color, width=6):
        steps = max(1, int(math.hypot(x1 - x0, y1 - y0)))
        for i in range(steps + 1):
            t = i / steps
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            self.ellipse(x, y, width / 2, width / 2, color, 0.8)

    def save(self, path):
        raw = bytearray()
        stride = self.width * 4
        for y in range(self.height):
            raw.append(0)
            raw.extend(self.data[y * stride:(y + 1) * stride])
        def chunk(tag, payload):
            return (
                struct.pack(">I", len(payload))
                + tag
                + payload
                + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
            )
        png = (
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + chunk(b"IEND", b"")
        )
        with open(path, "wb") as fh:
            fh.write(png)


def cast_shadow(c, cx, cy, rx, ry, alpha=68):
    c.ellipse(cx, cy, rx, ry, (33, 38, 46, alpha), 0.32)


def scene_sky():
    c = Canvas(2048, 1152)
    c.fill_gradient((105, 183, 218, 255), (249, 208, 159, 255))
    c.ellipse(1580, 210, 170, 170, (255, 231, 150, 210), 0.3)
    c.ellipse(1580, 210, 90, 90, (255, 250, 203, 255), 0.2)
    for base_y, col in [(690, (96, 151, 181, 180)), (760, (78, 133, 161, 210))]:
        for x in range(-80, 2150, 210):
            c.polygon([(x, base_y), (x + 170, base_y - random.randint(130, 260)), (x + 360, base_y)], col)
    for _ in range(18):
        x = random.randint(80, 1900)
        y = random.randint(120, 470)
        c.ellipse(x, y, random.randint(80, 190), random.randint(28, 62), (255, 255, 255, random.randint(75, 150)), 0.45)
    c.ellipse(520, 915, 720, 190, (90, 183, 147, 190), 0.22)
    c.ellipse(1570, 900, 780, 210, (79, 168, 147, 180), 0.22)
    c.noise(5)
    c.save(os.path.join(OUT, "scene-sky.png"))


def floor_texture():
    c = Canvas(1024, 1024)
    c.fill_gradient((106, 199, 139, 255), (80, 168, 124, 255))
    for _ in range(1600):
        x = random.randint(0, 1023)
        y = random.randint(0, 1023)
        col = random.choice([(148, 224, 148, 55), (49, 132, 91, 40), (255, 232, 155, 32)])
        c.line(x, y, x + random.randint(-12, 12), y + random.randint(4, 22), col, random.randint(1, 3))
    for y in range(1024):
        t = y / 1024
        center = 512
        width = 80 + t * 420
        for x in range(1024):
            d = abs(x - center) / width
            if d < 1:
                a = int((1 - d) * 205)
                c.blend_px(x, y, (231, 193, 135, a))
    for _ in range(180):
        c.ellipse(random.randint(0, 1023), random.randint(0, 1023), random.randint(4, 13), random.randint(2, 7), (255, 236, 165, 95), 0.5)
    c.noise(6)
    c.save(os.path.join(OUT, "scene-floor.png"))


def puppy_base():
    c = Canvas(768, 768)
    cast_shadow(c, 386, 680, 230, 42, 74)
    fur_a = (244, 203, 154, 255)
    fur_b = (189, 126, 83, 255)
    cream = (255, 239, 208, 255)
    c.ellipse_gradient(540, 444, 105, 82, fur_a, fur_b)
    c.ellipse_gradient(386, 468, 204, 180, fur_a, fur_b)
    c.ellipse_gradient(244, 258, 88, 150, fur_a, fur_b)
    c.ellipse_gradient(528, 258, 88, 150, fur_a, fur_b)
    c.ellipse_gradient(386, 286, 190, 176, fur_a, fur_b)
    c.ellipse_gradient(386, 462, 96, 112, cream, (235, 196, 154, 255))
    c.ellipse_gradient(386, 326, 98, 66, cream, (238, 197, 152, 255))
    c.ellipse_gradient(300, 596, 72, 55, cream, fur_b)
    c.ellipse_gradient(474, 596, 72, 55, cream, fur_b)
    c.ellipse(286, 298, 28, 36, (32, 38, 50, 255), 0.12)
    c.ellipse(486, 298, 28, 36, (32, 38, 50, 255), 0.12)
    c.ellipse(276, 285, 8, 10, (255, 255, 255, 230), 0.15)
    c.ellipse(476, 285, 8, 10, (255, 255, 255, 230), 0.15)
    c.ellipse_gradient(386, 340, 34, 22, (54, 42, 42, 255), (25, 29, 38, 255), (0, -0.8))
    c.line(386, 356, 360, 382, (73, 55, 54, 205), 8)
    c.line(386, 356, 414, 382, (73, 55, 54, 205), 8)
    c.ellipse(238, 350, 45, 24, (255, 145, 163, 92), 0.25)
    c.ellipse(534, 350, 45, 24, (255, 145, 163, 92), 0.25)
    for _ in range(260):
        x = random.randint(190, 570)
        y = random.randint(145, 620)
        c.blend_px(x, y, (255, 235, 196, random.randint(10, 38)))
    c.save(os.path.join(OUT, "pet-puppy.png"))


def egg():
    c = Canvas(768, 768)
    cast_shadow(c, 386, 676, 170, 34, 60)
    c.ellipse_gradient(386, 390, 180, 260, (255, 230, 151, 255), (239, 141, 84, 255), (-0.42, -0.55))
    c.ellipse(306, 238, 56, 104, (255, 255, 255, 88), 0.35)
    c.ellipse(456, 430, 58, 72, (255, 255, 255, 58), 0.25)
    c.ellipse(332, 516, 52, 42, (255, 255, 255, 55), 0.25)
    c.line(248, 402, 304, 375, (119, 90, 69, 96), 8)
    c.line(304, 375, 348, 420, (119, 90, 69, 96), 8)
    c.line(348, 420, 410, 378, (119, 90, 69, 96), 8)
    c.line(410, 378, 470, 420, (119, 90, 69, 96), 8)
    c.line(470, 420, 526, 392, (119, 90, 69, 96), 8)
    c.save(os.path.join(OUT, "pet-egg.png"))


def overlay_bow():
    c = Canvas(768, 768)
    c.ellipse_gradient(296, 158, 82, 54, (255, 146, 190, 255), (205, 72, 124, 255))
    c.ellipse_gradient(472, 158, 82, 54, (255, 146, 190, 255), (205, 72, 124, 255))
    c.ellipse_gradient(384, 162, 36, 34, (255, 178, 208, 255), (216, 83, 138, 255))
    c.save(os.path.join(OUT, "item-bow.png"))


def overlay_sweater():
    c = Canvas(768, 768)
    c.rounded_rect(238, 420, 296, 188, 58, (255, 135, 104, 240))
    c.ellipse(386, 426, 88, 42, (255, 245, 225, 205), 0.16)
    for y in [478, 538]:
        c.line(260, y, 512, y - 8, (255, 205, 160, 145), 11)
    c.save(os.path.join(OUT, "item-sweater.png"))


def overlay_collar():
    c = Canvas(768, 768)
    c.line(292, 392, 476, 392, (87, 160, 226, 240), 22)
    c.ellipse_gradient(384, 414, 25, 25, (255, 224, 108, 255), (206, 129, 52, 255))
    c.save(os.path.join(OUT, "item-collar.png"))


def cottage():
    c = Canvas(768, 768)
    cast_shadow(c, 390, 656, 250, 42, 70)
    c.rounded_rect(178, 310, 408, 300, 56, (245, 213, 162, 255))
    c.polygon([(148, 328), (388, 168), (626, 328)], (230, 112, 105, 255))
    c.polygon([(194, 330), (388, 205), (580, 330)], (255, 158, 124, 230))
    c.rounded_rect(318, 432, 126, 178, 36, (112, 94, 83, 255))
    c.rounded_rect(226, 382, 96, 78, 24, (139, 211, 232, 220))
    c.rounded_rect(468, 382, 96, 78, 24, (139, 211, 232, 220))
    c.ellipse(422, 516, 8, 8, (255, 213, 94, 255), 0.2)
    c.save(os.path.join(OUT, "prop-cottage.png"))


def tree():
    c = Canvas(640, 768)
    cast_shadow(c, 320, 668, 210, 40, 72)
    c.rounded_rect(284, 332, 70, 270, 30, (137, 91, 62, 255))
    for cx, cy, rx, ry, col in [
        (230, 282, 130, 120, (83, 169, 118, 255)),
        (356, 238, 148, 140, (96, 190, 132, 255)),
        (418, 354, 126, 112, (71, 153, 110, 255)),
        (258, 390, 142, 116, (105, 196, 132, 255)),
    ]:
        c.ellipse_gradient(cx, cy, rx, ry, col, (44, 119, 87, 255))
    c.save(os.path.join(OUT, "prop-tree.png"))


def portal():
    c = Canvas(768, 768)
    cast_shadow(c, 384, 650, 190, 34, 65)
    c.ellipse(384, 390, 164, 240, (90, 108, 226, 190), 0.12)
    c.ellipse(384, 390, 124, 192, (117, 221, 243, 175), 0.2)
    c.ellipse(384, 390, 86, 138, (255, 255, 255, 120), 0.4)
    for i in range(10):
        angle = i / 10 * math.tau
        c.ellipse(384 + math.cos(angle) * 170, 390 + math.sin(angle) * 236, 18, 18, (255, 226, 115, 220), 0.2)
    c.save(os.path.join(OUT, "prop-portal.png"))


def bridge():
    c = Canvas(768, 768)
    cast_shadow(c, 384, 590, 270, 42, 70)
    for i in range(7):
        x = 154 + i * 76
        c.rounded_rect(x, 402 - abs(i - 3) * 12, 60, 172, 18, (210, 160, 102, 255))
    c.line(156, 380, 612, 338, (157, 105, 69, 255), 20)
    c.line(156, 510, 612, 468, (157, 105, 69, 255), 16)
    c.save(os.path.join(OUT, "prop-bridge.png"))


def math_station():
    c = Canvas(768, 768)
    cast_shadow(c, 384, 642, 220, 36, 65)
    c.rounded_rect(170, 260, 428, 304, 48, (246, 248, 239, 255))
    c.rounded_rect(214, 306, 340, 184, 28, (105, 177, 204, 255))
    c.line(252, 360, 350, 360, (255, 255, 255, 210), 12)
    c.line(416, 360, 512, 360, (255, 255, 255, 210), 12)
    c.line(300, 416, 300, 470, (255, 255, 255, 210), 12)
    c.line(466, 416, 466, 470, (255, 255, 255, 210), 12)
    c.ellipse_gradient(384, 590, 56, 56, (255, 213, 94, 255), (238, 118, 92, 255))
    c.save(os.path.join(OUT, "prop-math-station.png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    scene_sky()
    floor_texture()
    egg()
    puppy_base()
    overlay_bow()
    overlay_sweater()
    overlay_collar()
    cottage()
    tree()
    portal()
    bridge()
    math_station()
    print("Generated game PNG assets in", OUT)


if __name__ == "__main__":
    main()
