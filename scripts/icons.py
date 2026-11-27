"""Genera los iconos PNG (solo biblioteca estándar). Uso: python3 scripts/icons.py"""
import struct, zlib
from pathlib import Path

BACK, PAPER, SKY, GROUND = (23, 25, 24), (255, 255, 255), (141, 184, 242), (31, 78, 140)

def png(path, size, scale):
    # Hoja 4:5 con una foto horizontal dentro, como en el marco.
    h = round(size * scale); w = round(h * 4 / 5)
    x0, y0 = (size - w) // 2, (size - h) // 2
    m = max(1, round(w * 0.06))
    ph = round((w - 2 * m) * 4 / 5)
    py = y0 + (h - ph) // 2
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        row = [BACK] * size
        if y0 <= y < y0 + h:
            row[x0:x0 + w] = [PAPER] * w
            if py <= y < py + ph:
                colour = SKY if y < py + ph * 0.62 else GROUND
                row[x0 + m:x0 + w - m] = [colour] * (w - 2 * m)
        rows.extend(bytes(v for pixel in row for v in pixel))
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    head = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', head)
                           + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))

out = Path(__file__).resolve().parent.parent / 'public'
png(out / 'icon-192.png', 192, 0.72)
png(out / 'icon-512.png', 512, 0.72)
png(out / 'icon-maskable-512.png', 512, 0.56)
png(out / 'apple-touch-icon.png', 180, 0.70)
