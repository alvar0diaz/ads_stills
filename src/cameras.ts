/** Cámaras guardadas por el usuario, con sus etiquetas y una predeterminada. */

export interface Camera {
  id: string;
  name: string;
  /** Etiquetas que se añaden a la descripción, separadas por espacios. */
  tags: string;
}

export interface CameraBook {
  list: Camera[];
  defaultId: string | null;
}

/** La cámara de una publicación: el nombre puede ser libre. */
export interface CameraChoice {
  camera: string;
  cameraTags: string;
}

export const emptyBook = (): CameraBook => ({ list: [], defaultId: null });

/** La GX800 es otra cámara: no debe contar. */
export function isGX80(name: string): boolean {
  return /gx[\s-]?80(?!\d)/i.test(name);
}

/** Etiquetas propuestas al guardar una cámara conocida sin escribir ninguna. */
export function suggestedTags(name: string): string {
  return isGX80(name) ? 'microfourthirds lumixgx80' : '';
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const findByName = (book: CameraBook, name: string) =>
  name.trim() ? book.list.find((c) => sameName(c.name, name)) : undefined;

export const defaultCamera = (book: CameraBook) => book.list.find((c) => c.id === book.defaultId);

export const choiceOf = (camera: Camera | undefined): CameraChoice => ({
  camera: camera?.name ?? '',
  cameraTags: camera?.tags ?? '',
});

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Añade o modifica una cámara. Devuelve un mensaje si los datos no valen.
 * La primera que se guarda queda como predeterminada.
 */
export function saveCamera(
  book: CameraBook,
  input: { id?: string; name: string; tags: string },
): CameraBook | string {
  const name = input.name.trim();
  if (!name) return 'Escribe el nombre de la cámara.';
  const clash = findByName(book, name);
  if (clash && clash.id !== input.id) return `Ya tienes guardada «${clash.name}».`;
  const tags = input.tags.trim() || suggestedTags(name);
  if (input.id && book.list.some((c) => c.id === input.id)) {
    return { ...book, list: book.list.map((c) => (c.id === input.id ? { id: c.id, name, tags } : c)) };
  }
  const camera = { id: newId(), name, tags };
  return {
    list: [...book.list, camera],
    defaultId: book.list.length ? book.defaultId : camera.id,
  };
}

export function removeCamera(book: CameraBook, id: string): CameraBook {
  return {
    list: book.list.filter((c) => c.id !== id),
    defaultId: book.defaultId === id ? null : book.defaultId,
  };
}

export const setDefault = (book: CameraBook, id: string | null): CameraBook => ({ ...book, defaultId: id });

/** Qué cámara debe tener la publicación en curso tras cambiar la lista. */
export function reconcile(before: CameraBook, after: CameraBook, current: CameraChoice): CameraChoice {
  const used = findByName(before, current.camera);
  const defaultChanged = before.defaultId !== after.defaultId && !!defaultCamera(after);
  // Seguía la predeterminada (o no tenía ninguna): sigue a la nueva.
  if (defaultChanged && (!current.camera.trim() || used?.id === before.defaultId && used !== undefined)) {
    return choiceOf(defaultCamera(after));
  }
  if (!used) return current;
  const updated = after.list.find((c) => c.id === used.id);
  return choiceOf(updated ?? defaultCamera(after));
}

/**
 * Lee la lista guardada. `legacy` es la cámara que recordaba la versión
 * anterior: se conserva en la lista, pero la GX80 no queda predeterminada.
 */
export function parseBook(stored: string | null, legacy: string | null): CameraBook {
  if (stored !== null) {
    try {
      const data = JSON.parse(stored) as Partial<CameraBook>;
      const list = (Array.isArray(data.list) ? data.list : []).filter(
        (c): c is Camera =>
          !!c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.tags === 'string',
      );
      const defaultId = list.some((c) => c.id === data.defaultId) ? data.defaultId! : null;
      return { list, defaultId };
    } catch {
      return emptyBook();
    }
  }
  const saved = saveCamera(emptyBook(), { name: legacy ?? '', tags: '' });
  if (typeof saved === 'string') return emptyBook();
  return isGX80(legacy!) ? setDefault(saved, null) : saved;
}
