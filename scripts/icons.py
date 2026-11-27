"""Genera los iconos PNG: una cámara color carbón (solo biblioteca estándar). Uso: python3 scripts/icons.py"""
import math, random, struct, zlib
from pathlib import Path

def render(size, scale):
    s = size * 3  # se dibuja al triple y se promedia para suavizar bordes
    rng = random.Random(5)
    noise = [rng.uniform(-5, 5) for _ in range(4096)]
    w = s * scale; h = w * .64
    x0, y0 = (s - w) / 2, (s - h) / 2 + h * .03
    def inside(x, y, l, t, r, b, rad):
        if not (l <= x <= r and t <= y <= b): return False
        dx = max(l + rad - x, 0, x - (r - rad)); dy = max(t + rad - y, 0, y - (b - rad))
        return dx * dx + dy * dy <= rad * rad
    cx, cy = x0 + w * .46, y0 + h * .62
    rings = [(.300, (22, 22, 22)), (.272, (120, 114, 106)), (.258, (34, 33, 32)), (.170, (12, 12, 13)),
             (.150, (52, 50, 48)), (.118, (8, 10, 11)), (.064, (28, 62, 54))]
    def pixel(x, y):
        c = (22, 22, 22) if scale < .7 else (16, 16, 16)
        if inside(x, y, x0 + w * .08, y0 - h * .09, x0 + w * .26, y0 + h * .05, w * .015):
            c = (92, 87, 81) if int((x - x0) / (w * .012)) % 2 else (52, 49, 46)
        if inside(x, y, x0, y0, x0 + w, y0 + h, w * .045):
            if y < y0 + h * .31:
                v = 12 * (1 - (y - y0) / (h * .31))
                c = (66 + v, 62 + v, 58 + v)
            elif y > y0 + h * .94:
                c = (58, 55, 51)
            else:
                k = noise[(int(x / (s / 170)) * 73 + int(y / (s / 170)) * 151) % 4096] * 2.2
                c = (26 + k, 26 + k, 26 + k)
        if inside(x, y, x0 + w * .75, y0 + h * .055, x0 + w * .94, y0 + h * .255, w * .012):
            c = (6, 7, 8)
        if inside(x, y, x0 + w * .57, y0 + h * .08, x0 + w * .69, y0 + h * .235, w * .008):
            c = (190, 186, 172) if int((y - y0) / (h * .022)) % 2 else (160, 156, 144)
        if (x - (x0 + w * .34)) ** 2 + (y - (y0 + h * .16)) ** 2 < (w * .016) ** 2:
            c = (255, 154, 60)
        d = math.hypot(x - cx, y - cy) / w
        for radius, colour in rings:
            if d <= radius: c = colour
        if math.hypot(x - (cx - w * .022), y - (cy - w * .024)) < w * .014: c = (170, 220, 205)
        return c
    big = [[pixel(x + .5, y + .5) for x in range(s)] for y in range(s)]
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            for k in range(3):
                total = sum(big[y * 3 + j][x * 3 + i][k] for j in range(3) for i in range(3))
                rows.append(max(0, min(255, round(total / 9))))
    return rows

def png(path, size, scale):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    head = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', head)
                     + chunk(b'IDAT', zlib.compress(bytes(render(size, scale)), 9)) + chunk(b'IEND', b''))

out = Path(__file__).resolve().parent.parent / 'public'
png(out / 'icon-192.png', 192, .84)
png(out / 'icon-512.png', 512, .84)
png(out / 'icon-maskable-512.png', 512, .66)
png(out / 'apple-touch-icon.png', 180, .82)
