import { describe, expect, it } from 'vitest';
import { reframeKey, stripAction } from '../src/keys';

describe('teclado en la tira', () => {
  it('las flechas eligen sin salirse', () => {
    expect(stripAction({ key: 'ArrowRight' }, 0, 3)).toEqual({ type: 'select', index: 1 });
    expect(stripAction({ key: 'ArrowLeft' }, 0, 3)).toEqual({ type: 'select', index: 0 });
    expect(stripAction({ key: 'End' }, 0, 3)).toEqual({ type: 'select', index: 2 });
    expect(stripAction({ key: 'Home' }, 2, 3)).toEqual({ type: 'select', index: 0 });
  });
  it('⌥ + flecha mueve y Supr quita', () => {
    expect(stripAction({ key: 'ArrowLeft', altKey: true }, 1, 3)).toEqual({ type: 'move', step: -1 });
    expect(stripAction({ key: 'Backspace' }, 1, 3)).toEqual({ type: 'remove' });
    expect(stripAction({ key: 'Delete' }, 1, 3)).toEqual({ type: 'remove' });
  });
  it('no se queda con los atajos del navegador', () => {
    expect(stripAction({ key: 'ArrowLeft', metaKey: true }, 1, 3)).toBeNull();
    expect(stripAction({ key: 'Backspace', altKey: true }, 1, 3)).toBeNull();
    expect(stripAction({ key: 'a' }, 1, 3)).toBeNull();
    expect(stripAction({ key: 'Delete' }, 0, 0)).toBeNull();
  });
});

describe('teclado en la vista previa', () => {
  it('mueve 1 % o 10 % y se queda entre 0 y 1', () => {
    expect(reframeKey({ key: 'ArrowRight' }, 0.5)).toBe(0.51);
    expect(reframeKey({ key: 'ArrowUp', shiftKey: true }, 0.5)).toBe(0.4);
    expect(reframeKey({ key: 'ArrowDown', shiftKey: true }, 0.95)).toBe(1);
    expect(reframeKey({ key: 'ArrowLeft' }, 0)).toBe(0);
  });
  it('ignora otras teclas', () => {
    expect(reframeKey({ key: 'Tab' }, 0.5)).toBeNull();
    expect(reframeKey({ key: 'ArrowLeft', metaKey: true }, 0.5)).toBeNull();
  });
});
