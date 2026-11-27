/** Ajustes recordados. Si el almacenamiento falla, la app sigue funcionando. */

type Key = 'margin' | 'cameras' | 'camera';

export function recall(key: Key): string | null {
  try {
    return localStorage.getItem(`ads_stills.${key}`);
  } catch {
    return null;
  }
}

export function remember(key: Key, value: string): void {
  try {
    localStorage.setItem(`ads_stills.${key}`, value);
  } catch {
    /* modo privado o sin espacio */
  }
}
