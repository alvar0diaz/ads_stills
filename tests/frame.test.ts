import { describe, expect, it } from 'vitest';
import {
  OUTPUT_HEIGHT as H, OUTPUT_WIDTH as W, canReframe, clampMargin, dragPosition, geometry,
  marginPixels, type FrameOptions,
} from '../src/frame';

const options = (extra: Partial<FrameOptions> = {}): FrameOptions => ({
  margin: 2, original: false, position: 0.5, ...extra,
});
const vertical = { width: 2400, height: 3200 };
const horizontal = { width: 3200, height: 2133 };
const square = { width: 3000, height: 3000 };

describe('margen', () => {
  it('es de 43 px al 2 %', () => expect(marginPixels(2)).toBe(43));
  it('se limita de 1 a 4 en pasos de 0,25', () => {
    expect(clampMargin(0)).toBe(1);
    expect(clampMargin(9)).toBe(4);
    expect(clampMargin(2.3)).toBe(2.25);
    expect(clampMargin(NaN)).toBe(2);
  });
});

describe('Mi formato', () => {
  it('vertical: llena el área interior recortando', () => {
    const g = geometry(vertical, W, options());
    expect(g).toMatchObject({ dx: 43, dy: 43, dw: W - 86, dh: H - 86 });
    expect(g.sw / g.sh).toBeCloseTo(g.dw / g.dh, 6);
    // 3:4 es más estrecha que el área interior: sobra por arriba y por abajo.
    expect(g.freeX).toBeCloseTo(0, 6);
    expect(g.freeY).toBeGreaterThan(0);
    expect(g.sy).toBeCloseTo(g.freeY / 2, 6);
  });

  it('horizontal: ancho interior, 5:4 centrada y unos 521 px de blanco', () => {
    const g = geometry(horizontal, W, options());
    expect(g.dw).toBe(2074);
    expect(g.dw / g.dh).toBeCloseTo(1.25, 2);
    expect(g.dy).toBeGreaterThanOrEqual(520);
    expect(g.dy).toBeLessThanOrEqual(521);
    expect(Math.abs(H - g.dy - g.dh - g.dy)).toBeLessThanOrEqual(1);
    expect(g.sw / g.sh).toBeCloseTo(g.dw / g.dh, 6);
    expect(g.sx).toBeCloseTo((3200 - g.sw) / 2, 6);
  });

  it('cuadrada: sigue la rama vertical', () => {
    expect(geometry(square, W, options())).toMatchObject({ dx: 43, dy: 43, dw: 2074, dh: 2614 });
  });

  it('el encuadre recorre la holgura de principio a fin', () => {
    expect(geometry(horizontal, W, options({ position: 0 })).sx).toBe(0);
    const end = geometry(horizontal, W, options({ position: 1 }));
    expect(end.sx + end.sw).toBeCloseTo(horizontal.width, 6);
  });

  it('la vista previa es la exportación a escala', () => {
    const full = geometry(horizontal, W, options());
    const half = geometry(horizontal, W / 2, options());
    expect(half.dx).toBeCloseTo(full.dx / 2);
    expect(half.dy).toBeCloseTo(full.dy / 2);
    expect(half.dh).toBeCloseTo(full.dh / 2);
    expect(half.sw).toBeCloseTo(full.sw);
  });
});

describe('Sin recorte', () => {
  const cases = { vertical, horizontal, square, alta: { width: 1000, height: 3200 }, panoramica: { width: 3200, height: 900 } };
  for (const [name, photo] of Object.entries(cases)) {
    it(`${name}: foto entera, centrada y dentro del margen`, () => {
      const g = geometry(photo, W, options({ original: true }));
      expect(g).toMatchObject({ sx: 0, sy: 0, sw: photo.width, sh: photo.height });
      expect(g.dw / g.dh).toBeCloseTo(photo.width / photo.height, 2);
      expect(g.dx).toBeGreaterThanOrEqual(43);
      expect(g.dy).toBeGreaterThanOrEqual(43);
      expect(g.dx + g.dw).toBeLessThanOrEqual(W - 43 + 1);
      expect(g.dy + g.dh).toBeLessThanOrEqual(H - 43 + 1);
      expect(canReframe(photo, options({ original: true }))).toBe(false);
    });
  }
});

describe('arrastre', () => {
  it('arrastrar a la derecha enseña la parte izquierda', () => {
    expect(dragPosition(horizontal, 400, options(), 20, 0)).toBeLessThan(0.5);
    expect(dragPosition(horizontal, 400, options(), -20, 0)).toBeGreaterThan(0.5);
  });
  it('se queda entre 0 y 1', () => {
    expect(dragPosition(horizontal, 400, options(), 9999, 0)).toBe(0);
    expect(dragPosition(horizontal, 400, options(), -9999, 0)).toBe(1);
  });
  it('usa el eje vertical en fotos muy altas', () => {
    const tall = { width: 1000, height: 3200 };
    expect(dragPosition(tall, 400, options(), 0, 20)).toBeLessThan(0.5);
  });
  it('no cambia nada sin holgura', () => {
    expect(dragPosition(vertical, 400, options({ original: true }), 50, 50)).toBe(0.5);
  });
});
