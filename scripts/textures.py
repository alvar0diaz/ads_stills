"""Genera las texturas de cuero y metal (solo biblioteca estándar). Uso: python3 scripts/textures.py"""
import math, random, struct, zlib
from pathlib import Path

def png_grey(path, size, pixels):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        rows.extend(pixels[y * size:(y + 1) * size])
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    head = struct.pack('>IIBBBBB', size, size, 8, 0, 0, 0, 0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', head)
                     + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))

def leather(size=256, cell=8, seed=7):
    """Granulado: celdas irregulares abombadas, iluminadas desde arriba a la izquierda. Se repite sin costuras."""
    rng = random.Random(seed)
    n = size // cell
    pts = [[((i + rng.uniform(.05, .95)) * cell, (j + rng.uniform(.05, .95)) * cell) for i in range(n)] for j in range(n)]
    height = [0.0] * (size * size)
    for y in range(size):
        for x in range(size):
            d1 = d2 = 1e9
            cx, cy = x // cell, y // cell
            for j in range(cy - 2, cy + 3):
                for i in range(cx - 2, cx + 3):
                    px, py = pts[j % n][i % n]
                    px += (i - i % n) * cell; py += (j - j % n) * cell
                    d = math.hypot(x - px, y - py)
                    if d < d1: d1, d2 = d, d1
                    elif d < d2: d2 = d
            height[y * size + x] = min(1.0, (d2 - d1) / (cell * .65)) ** .55
    out = bytearray(size * size)
    for y in range(size):
        for x in range(size):
            h = height[y * size + x]
            slope = height[((y - 1) % size) * size + (x - 1) % size] - height[((y + 1) % size) * size + (x + 1) % size]
            v = 15 + 9 * h - 20 * slope + rng.uniform(-2, 2)
            out[y * size + x] = max(0, min(255, round(v)))
    return size, out

def grain(size=128, seed=3):
    """Metal granallado: ruido fino alrededor del gris medio, para superponer."""
    rng = random.Random(seed)
    return size, bytearray(max(0, min(255, round(rng.gauss(128, 22)))) for _ in range(size * size))

out = Path(__file__).resolve().parent.parent / 'src' / 'assets'
out.mkdir(exist_ok=True)
png_grey(out / 'leather.png', *leather())
png_grey(out / 'grain.png', *grain())
