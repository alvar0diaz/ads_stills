/** Borrador de la publicación en IndexedDB. */
import type { CaptionData } from './caption';

export interface DraftPhoto {
  id: string;
  name: string;
  original: boolean;
  position: number;
}

export interface DraftState {
  photos: DraftPhoto[];
  selected: number;
  fields: CaptionData;
  caption: { text: string; base: string | null };
}

/** Se guardan bytes y no Blob: es lo más fiable en Safari. */
export interface DraftImage {
  id: string;
  full: ArrayBuffer;
  thumb: ArrayBuffer;
}

export interface Draft {
  state: DraftState;
  images: Map<string, DraftImage>;
}

const STATE = 'state';
const IMAGES = 'images';
const KEY = 'current';

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const finished = (t: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = t.onabort = () => reject(t.error ?? new Error('Transacción cancelada'));
  });

export class DraftStore {
  private database: Promise<IDBDatabase> | null = null;

  constructor(
    private factory: () => IDBFactory = () => indexedDB,
    private name = 'ads_stills',
  ) {}

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = this.factory().open(this.name, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore(STATE);
        r.result.createObjectStore(IMAGES, { keyPath: 'id' });
      };
      r.onsuccess = () => {
        // Safari puede cerrar la conexión en segundo plano: se reabre en el siguiente uso.
        r.result.onclose = () => (this.database = null);
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
    }).catch((error) => {
      this.database = null;
      throw error;
    });
    return this.database;
  }

  async load(): Promise<Draft | null> {
    const db = await this.open();
    const t = db.transaction([STATE, IMAGES], 'readonly');
    const [state, images] = await Promise.all([
      request(t.objectStore(STATE).get(KEY) as IDBRequest<DraftState | undefined>),
      request(t.objectStore(IMAGES).getAll() as IDBRequest<DraftImage[]>),
    ]);
    if (!state) return null;
    return { state, images: new Map(images.map((image) => [image.id, image])) };
  }

  /**
   * Cada imagen se escribe una sola vez. Estado, altas y bajas van en la misma
   * transacción para que el borrador nunca quede a medias.
   */
  async save(state: DraftState, image: (id: string) => Promise<DraftImage>): Promise<void> {
    const db = await this.open();
    const stored = new Set(
      await request(db.transaction(IMAGES).objectStore(IMAGES).getAllKeys() as IDBRequest<string[]>),
    );
    const wanted = new Set(state.photos.map((p) => p.id));
    // Los bytes se leen antes: una transacción no sobrevive a una espera ajena.
    const added: DraftImage[] = [];
    for (const id of wanted) if (!stored.has(id)) added.push(await image(id));

    const t = db.transaction([STATE, IMAGES], 'readwrite');
    const done = finished(t);
    const images = t.objectStore(IMAGES);
    added.forEach((item) => images.put(item));
    stored.forEach((id) => !wanted.has(id) && images.delete(id));
    t.objectStore(STATE).put(state, KEY);
    await done;
  }
}
