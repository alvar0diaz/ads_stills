import { describe, expect, it } from 'vitest';
import {
  choiceOf, defaultCamera, emptyBook, isGX80, parseBook, reconcile, removeCamera, saveCamera, setDefault,
  type CameraBook,
} from '../src/cameras';

const add = (book: CameraBook, name: string, tags = '') => saveCamera(book, { name, tags }) as CameraBook;
const two = () => add(add(emptyBook(), 'Una', 'uno'), 'Dos', 'dos');

describe('mis cámaras', () => {
  it('la primera queda predeterminada', () => {
    expect(defaultCamera(two())!.name).toBe('Una');
  });
  it('no admite nombres vacíos ni repetidos', () => {
    expect(saveCamera(emptyBook(), { name: '  ', tags: '' })).toContain('nombre');
    expect(saveCamera(two(), { name: ' una ', tags: '' })).toContain('Una');
  });
  it('edita sin duplicar', () => {
    const book = two();
    const edited = saveCamera(book, { id: book.list[0]!.id, name: 'Una', tags: 'nueva' }) as CameraBook;
    expect(edited.list.map((c) => c.tags)).toEqual(['nueva', 'dos']);
  });
  it('borrar la predeterminada la deja sin elegir', () => {
    const book = two();
    expect(removeCamera(book, book.defaultId!).defaultId).toBeNull();
  });
  it('propone las etiquetas de la GX80, no las de la GX800', () => {
    expect(add(emptyBook(), 'Lumix GX80').list[0]!.tags).toBe('microfourthirds lumixgx80');
    expect(add(emptyBook(), 'Lumix GX800').list[0]!.tags).toBe('');
    for (const n of ['GX80', 'gx 80', 'Panasonic GX-80']) expect(isGX80(n)).toBe(true);
    for (const n of ['GX800', 'GX85', '']) expect(isGX80(n)).toBe(false);
  });
});

describe('publicación en curso', () => {
  const book = two();
  const [una, dos] = [book.list[0]!, book.list[1]!];

  it('sigue a la nueva predeterminada si usaba la anterior o ninguna', () => {
    const next = setDefault(book, dos.id);
    expect(reconcile(book, next, choiceOf(una)).camera).toBe('Dos');
    expect(reconcile(book, next, choiceOf(undefined)).camera).toBe('Dos');
  });
  it('no cambia otra elegida a propósito ni una escrita a mano', () => {
    expect(reconcile(book, setDefault(book, null), choiceOf(dos)).camera).toBe('Dos');
    const free = { camera: 'Prestada', cameraTags: '' };
    expect(reconcile(book, setDefault(book, dos.id), free)).toEqual(free);
  });
  it('recoge los cambios de la cámara usada', () => {
    const next = saveCamera(book, { id: dos.id, name: 'Dos II', tags: 'x' }) as CameraBook;
    expect(reconcile(book, next, choiceOf(dos))).toEqual({ camera: 'Dos II', cameraTags: 'x' });
  });
  it('si se borra la usada, pasa a la predeterminada', () => {
    expect(reconcile(book, removeCamera(book, dos.id), choiceOf(dos)).camera).toBe('Una');
    expect(reconcile(book, removeCamera(book, una.id), choiceOf(una)).camera).toBe('');
  });
});

describe('lista guardada', () => {
  it('empieza vacía', () => expect(parseBook(null, null)).toEqual(emptyBook()));
  it('conserva la cámara recordada por la versión anterior', () => {
    expect(defaultCamera(parseBook(null, 'Otra'))!.name).toBe('Otra');
  });
  it('la GX80 antigua se conserva sin quedar predeterminada', () => {
    const book = parseBook(null, 'Lumix GX80');
    expect([book.list.length, book.defaultId]).toEqual([1, null]);
  });
  it('una vez guardada la lista, ignora lo antiguo y resiste datos dañados', () => {
    expect(parseBook(JSON.stringify(emptyBook()), 'Vieja')).toEqual(emptyBook());
    expect(parseBook('{mal', null)).toEqual(emptyBook());
    expect(parseBook('{"list":[{"id":1}],"defaultId":"z"}', null)).toEqual(emptyBook());
    const saved = two();
    expect(parseBook(JSON.stringify(saved), null)).toEqual(saved);
  });
});
