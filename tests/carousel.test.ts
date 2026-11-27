import { describe, expect, it } from 'vitest';
import { admit, moveSelected, removeSelected } from '../src/carousel';
import { fitWithin, openError } from '../src/images';

const c = (items: string[], selected: number) => ({ items, selected });

describe('carrusel', () => {
  it('admite como máximo 20', () => {
    const files = Array.from({ length: 25 }, (_, i) => i);
    expect(admit(0, files)).toMatchObject({ rejected: 5 });
    expect(admit(18, files).accepted).toEqual([0, 1]);
    expect(admit(20, files).accepted).toEqual([]);
  });
  it('reordena y la selección acompaña', () => {
    expect(moveSelected(c(['a', 'b', 'c'], 1), -1)).toEqual(c(['b', 'a', 'c'], 0));
    expect(moveSelected(c(['a', 'b', 'c'], 1), 1)).toEqual(c(['a', 'c', 'b'], 2));
    expect(moveSelected(c(['a', 'b'], 0), -1)).toEqual(c(['a', 'b'], 0));
  });
  it('quita la seleccionada', () => {
    expect(removeSelected(c(['a', 'b', 'c'], 2))).toEqual(c(['a', 'b'], 1));
    expect(removeSelected(c(['a'], 0))).toEqual(c([], 0));
  });
});

describe('fotos', () => {
  it('reduce el lado mayor a 3200 sin ampliar', () => {
    expect(fitWithin(6000, 4000, 3200)).toEqual({ width: 3200, height: 2133 });
    expect(fitWithin(3024, 4032, 3200)).toEqual({ width: 2400, height: 3200 });
    expect(fitWithin(800, 600, 3200)).toEqual({ width: 800, height: 600 });
  });
  it('explica el fallo con HEIC', () => {
    expect(openError({ name: 'IMG_1.HEIC', type: '' })).toContain('HEIC');
    expect(openError({ name: 'x.jpg', type: 'image/jpeg' })).toContain('JPEG');
  });
});
