/** Ajustes recordados. Si el almacenamiento falla, la app sigue funcionando. */

export function recall(key: 'margin' | 'camera'): string | null {
  try {
    return localStorage.getItem(`ads_stills.${key}`);
  } catch {
    return null;
  }
}

export function remember(key: 'margin' | 'camera', value: string): void {
  try {
    localStorage.setItem(`ads_stills.${key}`, value);
  } catch {
    /* modo privado o sin espacio */
  }
}
