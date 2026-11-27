import { describe, expect, it, vi } from 'vitest';
import { canShareFiles, fileName, prefersShare, sendToInstagram, shareFiles, toFiles } from '../src/share';

const nav = (extra: object = {}) => ({ userAgent: '', maxTouchPoints: 0, ...extra });
const files = toFiles([new Blob(['a']), new Blob(['b'])], 10_000);
const failing = (name: string) => nav({ share: () => Promise.reject(Object.assign(new Error(), { name })) });

describe('archivos', () => {
  it('nombres numerados', () => {
    expect([fileName(0), fileName(9), fileName(19)]).toEqual(
      ['ads_stills_01.jpg', 'ads_stills_10.jpg', 'ads_stills_20.jpg']);
  });
  it('JPEG con fechas en orden', () => {
    expect(files.map((f) => f.type)).toEqual(['image/jpeg', 'image/jpeg']);
    expect(files[0]!.lastModified).toBeLessThan(files[1]!.lastModified);
  });
});

describe('compartir', () => {
  it('prefiere compartir en iPhone y iPad, no en Mac', () => {
    expect(prefersShare(nav({ userAgent: 'Mozilla/5.0 (iPhone; …)' }))).toBe(true);
    expect(prefersShare(nav({ userAgent: 'Mozilla/5.0 (Macintosh; …)', maxTouchPoints: 5 }))).toBe(true);
    expect(prefersShare(nav({ userAgent: 'Mozilla/5.0 (Macintosh; …)' }))).toBe(false);
  });
  it('solo si el navegador admite esos archivos', () => {
    expect(canShareFiles(files, nav())).toBe(false);
    expect(canShareFiles(files, nav({ share() {}, canShare: () => false }))).toBe(false);
    expect(canShareFiles(files, nav({ share() {}, canShare: () => true }))).toBe(true);
    expect(canShareFiles([], nav({ share() {}, canShare: () => true }))).toBe(false);
  });
  it('envía solo archivos y sin esperas previas', () => {
    const share = vi.fn(() => Promise.resolve());
    void shareFiles(files, nav({ share }));
    expect(share).toHaveBeenCalledWith({ files });
  });
  it('cancelar no es un error', async () => {
    expect(await shareFiles(files, failing('AbortError'))).toEqual({ status: 'cancelled' });
  });
  it('los demás fallos se explican', async () => {
    expect(await shareFiles(files, failing('NotAllowedError'))).toMatchObject({ status: 'failed' });
    const other = await shareFiles(files, failing('DataError'));
    expect(other.status === 'failed' && other.message).toContain('DataError');
  });
});

describe('Instagram', () => {
  it('copia la descripción y comparte en el mismo toque', async () => {
    const calls: string[] = [];
    const result = sendToInstagram(files, 'texto', nav({
      clipboard: { writeText: async (t: string) => void calls.push(`copiar ${t}`) },
      share: async () => void calls.push('compartir'),
    }));
    expect(calls).toEqual(['copiar texto', 'compartir']);
    expect(await result.copied).toBe(true);
    expect(await result.shared).toEqual({ status: 'shared' });
  });
  it('comparte aunque no se pueda copiar', async () => {
    const result = sendToInstagram(files, 't', nav({ share: async () => {} }));
    expect(await result.copied).toBe(false);
    expect(await result.shared).toEqual({ status: 'shared' });
  });
});
