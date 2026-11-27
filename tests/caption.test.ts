import { describe, expect, it } from 'vitest';
import { CaptionEditor, buildCaption, buildTags, slug, type CaptionData } from '../src/caption';

const data = (extra: Partial<CaptionData> = {}): CaptionData => ({
  phrase: '', city: '', country: 'España', month: 0, year: '2026', camera: '', cameraTags: '', placeTag: '', extraTags: '', ...extra,
});

describe('etiquetas', () => {
  it('GX80 + Conil de la Frontera + conil + summer', () => {
    const d = data({ camera: 'Lumix GX80', cameraTags: 'microfourthirds lumixgx80', city: 'Conil de la Frontera', placeTag: 'conil', extraTags: 'summer' });
    expect(buildTags(d).join(' ')).toBe('#streetphotography #microfourthirds #lumixgx80 #conil #summer');
  });
  it('otra cámara + Salamanca', () => {
    expect(buildTags(data({ camera: 'Otra', city: 'Salamanca' })).join(' ')).toBe('#streetphotography #salamanca');
  });
  it('sin etiqueta de lugar usa la ciudad, sin tildes ni espacios', () => {
    expect(buildTags(data({ city: 'Cádiz de Ñ' }))).toEqual(['#streetphotography', '#cadizden']);
  });
  it('quita duplicados, almohadillas y mayúsculas', () => {
    const d = data({ city: 'Conil', extraTags: '#Summer, conil  summer #StreetPhotography' });
    expect(buildTags(d)).toEqual(['#streetphotography', '#conil', '#summer']);
  });
  it('slug', () => expect(slug(' Peñíscola 2 ')).toBe('peniscola2'));
  it('solo usa las etiquetas de la cámara si hay cámara', () => {
    expect(buildTags(data({ cameraTags: 'x100' }))).toEqual(['#streetphotography']);
    expect(buildTags(data({ camera: 'X', cameraTags: '#Uno, dos' }))).toEqual(['#streetphotography', '#uno', '#dos']);
  });
});

describe('descripción', () => {
  it('sigue la plantilla', () => {
    const d = data({ phrase: 'Si miras hacia arriba…', city: 'Salamanca', month: 3, camera: 'Otra' });
    expect(buildCaption(d)).toBe(
      'Si miras hacia arriba…\n\n📍 Salamanca, España\n📅 Marzo, 2026\n📷 Otra\n\n.\n.\n.\n\n#streetphotography #salamanca',
    );
  });
  it('omite las líneas sin dato', () => {
    expect(buildCaption(data())).toBe('.\n.\n.\n\n#streetphotography');
    expect(buildCaption(data({ month: 1, year: ' ' }))).not.toContain('📅');
    expect(buildCaption(data({ city: 'Roma', country: '' }))).toContain('📍 Roma\n');
  });
});

describe('texto retocado', () => {
  it('sigue a los datos mientras no se retoque', () => {
    const e = new CaptionEditor('a');
    e.update('b');
    expect([e.text, e.edited, e.stale]).toEqual(['b', false, false]);
  });
  it('no se pisa y avisa hasta regenerar', () => {
    const e = new CaptionEditor('a');
    e.edit('a mi manera');
    expect([e.edited, e.stale]).toEqual([true, false]);
    e.update('b');
    e.edit('a mi manera, más');
    expect([e.text, e.stale]).toEqual(['a mi manera, más', true]);
    e.regenerate();
    expect([e.text, e.edited, e.stale]).toEqual(['b', false, false]);
  });
  it('deja de avisar si los datos vuelven atrás', () => {
    const e = new CaptionEditor('a');
    e.edit('mío');
    e.update('b');
    e.update('a');
    expect([e.text, e.stale]).toEqual(['mío', false]);
  });
  it('deshacer el retoque vuelve a seguir los datos', () => {
    const e = new CaptionEditor('a');
    e.edit('a!');
    e.edit('a');
    e.update('b');
    expect(e.text).toBe('b');
  });
});
