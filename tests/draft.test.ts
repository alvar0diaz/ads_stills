import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosave } from '../src/autosave';
import { CaptionEditor } from '../src/caption';
import { DraftStore, type DraftImage, type DraftState } from '../src/draft';

const state = (ids: string[], text = 't'): DraftState => ({
  photos: ids.map((id) => ({ id, name: `${id}.jpg`, original: false, position: 0.2 })),
  selected: 0,
  fields: { phrase: 'f', city: 'c', country: 'España', month: 3, year: '2026', camera: '', placeTag: '', extraTags: '' },
  caption: { text, base: null },
});
const image = async (id: string): Promise<DraftImage> => ({
  id, full: new Uint8Array([1, 2, 3]).buffer, thumb: new Uint8Array([4]).buffer,
});

describe('borrador', () => {
  let factory: IDBFactory;
  const store = () => new DraftStore(() => factory);
  beforeEach(() => (factory = new IDBFactory()));

  it('vacío al principio', async () => expect(await store().load()).toBeNull());

  it('sobrevive a cerrar la app', async () => {
    await store().save(state(['b', 'a']), image);
    const draft = (await store().load())!;
    expect(draft.state).toEqual(state(['b', 'a']));
    expect(new Uint8Array(draft.images.get('a')!.full)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('escribe cada imagen una vez y borra las quitadas', async () => {
    const s = store();
    const read = vi.fn(image);
    await s.save(state(['a', 'b']), read);
    await s.save(state(['b', 'c']), read);
    expect(read.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c']);
    expect([...(await s.load())!.images.keys()].sort()).toEqual(['b', 'c']);
  });

  it('si falla una foto, se conserva lo anterior', async () => {
    const s = store();
    await s.save(state(['a']), image);
    await expect(s.save(state(['b']), () => Promise.reject(new Error('no')))).rejects.toThrow('no');
    expect((await s.load())!.state).toEqual(state(['a']));
  });

  it('recupera el texto retocado y su aviso', () => {
    const before = new CaptionEditor('a');
    before.edit('mío');
    before.update('b');
    const after = new CaptionEditor('');
    after.restore('b', before.snapshot());
    expect([after.text, after.edited, after.stale]).toEqual(['mío', true, true]);
  });
});

describe('guardado automático', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('agrupa los cambios seguidos', async () => {
    const save = vi.fn(async () => {});
    const auto = new Autosave(save, () => {}, 100);
    auto.schedule();
    auto.schedule();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('avisa si no se puede guardar y se recupera', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const report = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error('lleno')).mockResolvedValue(undefined);
    const auto = new Autosave(save, report);
    expect(await auto.flush()).toBe(false);
    expect(await auto.flush()).toBe(true);
    expect(report.mock.calls).toEqual([[false], [true]]);
  });
});
