/** Animación de revelado: las fotos nuevas emergen sobre el papel. */

export const DEVELOP_MS = 2400;

const started = new Map<string, number>();

export function markFresh(id: string): void {
  started.set(id, performance.now());
}

/** Milisegundos que lleva revelándose, o null si ya está revelada. */
export function elapsed(id: string, now = performance.now()): number | null {
  const start = started.get(id);
  if (start === undefined) return null;
  if (now - start >= DEVELOP_MS) {
    started.delete(id);
    return null;
  }
  return now - start;
}

/** Aplica (o quita) el revelado; si se repinta a medias, continúa donde iba. */
export function develop(element: HTMLElement, time: number | null): void {
  if (time === null) {
    element.classList.remove('developing');
    element.style.animationDelay = '';
    return;
  }
  element.style.animationDelay = `${-Math.round(time)}ms`;
  element.classList.add('developing');
}
