/** Operaciones sobre la lista de fotos del carrusel. */

export const MAX_PHOTOS = 20;

export interface Carousel<T> {
  items: T[];
  selected: number;
}

/** Cuántos archivos caben y cuántos se quedan fuera. */
export function admit<T>(current: number, files: T[]): { accepted: T[]; rejected: number } {
  const room = Math.max(0, MAX_PHOTOS - current);
  return { accepted: files.slice(0, room), rejected: Math.max(0, files.length - room) };
}

/** Mueve la foto seleccionada una posición; la selección la acompaña. */
export function moveSelected<T>(carousel: Carousel<T>, step: -1 | 1): Carousel<T> {
  const { items, selected } = carousel;
  const target = selected + step;
  const a = items[selected];
  const b = items[target];
  if (a === undefined || b === undefined) return carousel;
  const next = [...items];
  next[selected] = b;
  next[target] = a;
  return { items: next, selected: target };
}

export function removeSelected<T>(carousel: Carousel<T>): Carousel<T> {
  const items = carousel.items.filter((_, i) => i !== carousel.selected);
  return { items, selected: Math.max(0, Math.min(carousel.selected, items.length - 1)) };
}
