/** Atajos de teclado, separados de la interfaz para poder probarlos. */

interface Key {
  key: string;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}

export type StripAction =
  | { type: 'select'; index: number }
  | { type: 'move'; step: -1 | 1 }
  | { type: 'remove' };

/** En la tira: flechas para elegir, ⌥ + flechas para mover, Supr para quitar. */
export function stripAction(event: Key, selected: number, count: number): StripAction | null {
  // ⌘ y Ctrl se dejan al navegador.
  if (event.metaKey || event.ctrlKey || !count) return null;
  const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
  if (step) {
    if (event.altKey) return { type: 'move', step };
    return { type: 'select', index: Math.min(count - 1, Math.max(0, selected + step)) };
  }
  if (event.altKey) return null;
  if (event.key === 'Home') return { type: 'select', index: 0 };
  if (event.key === 'End') return { type: 'select', index: count - 1 };
  if (event.key === 'Delete' || event.key === 'Backspace') return { type: 'remove' };
  return null;
}

/** Sobre la vista previa: nuevo encuadre, o null si la tecla no es para eso. */
export function reframeKey(event: Key, position: number): number | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key)
    ? -1
    : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0;
  if (!direction) return null;
  const step = event.shiftKey ? 0.1 : 0.01;
  return Math.min(1, Math.max(0, Math.round((position + direction * step) * 100) / 100));
}
