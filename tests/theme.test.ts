import { describe, expect, it } from 'vitest';
import { resolveTheme, toggleTheme } from '../src/theme';

describe('tema', () => {
  it('sigue al sistema si no se ha elegido', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('', false)).toBe('light');
    expect(resolveTheme('otro', false)).toBe('light');
  });
  it('lo elegido manda sobre el sistema', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('al volver al tema del sistema deja de guardar la elección', () => {
    expect(toggleTheme('dark', true)).toEqual({ theme: 'light', store: 'light' });
    expect(toggleTheme('light', true)).toEqual({ theme: 'dark', store: '' });
    expect(toggleTheme('light', false)).toEqual({ theme: 'dark', store: 'dark' });
  });
});
