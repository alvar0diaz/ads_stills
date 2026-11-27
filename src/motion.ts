/** Movimientos de la interfaz que imitan la mecánica de una cámara. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
export const calm = (): boolean => reduce.matches;

/** Obturador: el diafragma se cierra y se abre sobre la foto y salta el flash. */
export function shutter(view: HTMLElement): void {
  if (calm()) return;
  const host = view.offsetParent as HTMLElement | null;
  if (!host) return;
  const box = document.createElement('div');
  box.className = 'shutter';
  box.setAttribute('aria-hidden', 'true');
  Object.assign(box.style, {
    left: `${view.offsetLeft}px`,
    top: `${view.offsetTop}px`,
    width: `${view.offsetWidth}px`,
    height: `${view.offsetHeight}px`,
  });
  box.append(document.createElement('span'));
  host.append(box);
  box.addEventListener('animationend', (event) => {
    if (event.pseudoElement === '::after') box.remove();
  });
  // Por si la ventana está oculta y la animación no llega a terminar.
  setTimeout(() => box.remove(), 1500);
}

/** Contador mecánico: cada cifra que cambia rueda hacia arriba. */
export function setCounter(element: HTMLElement, text: string, label: string): void {
  const previous = element.dataset.value ?? '';
  if (previous === text) return;
  element.dataset.value = text;
  element.setAttribute('aria-label', label);
  element.replaceChildren(
    ...[...text].map((char, i) => {
      const cell = document.createElement('span');
      cell.className = 'digit';
      cell.setAttribute('aria-hidden', 'true');
      const old = previous[i];
      if (!old || old === char || calm() || char === ' ' || char === '/') {
        cell.textContent = char;
        return cell;
      }
      const reel = document.createElement('span');
      reel.className = 'reel';
      const before = document.createElement('span');
      const after = document.createElement('span');
      before.textContent = old;
      after.textContent = char;
      reel.append(before, after);
      // Las cifras de la derecha giran un poco después, como un tambor.
      reel.style.animationDelay = `${i * 30}ms`;
      cell.append(reel);
      return cell;
    }),
  );
}

/** Avance de película: la tira se arrastra hacia el lado de la foto nueva. */
export function advanceFilm(strip: HTMLElement, step: number): void {
  if (calm() || !step) return;
  const shift = Math.sign(step) * 26;
  const timing = { duration: 380, easing: 'cubic-bezier(.2, .7, .25, 1)' };
  strip.animate(
    [
      { backgroundPosition: `${5 + shift}px 5px, ${5 + shift}px calc(100% - 5px)` },
      { backgroundPosition: '5px 5px, 5px calc(100% - 5px)' },
    ],
    timing,
  );
  for (const frame of strip.children) {
    (frame as HTMLElement).animate(
      [{ transform: `translateX(${shift}px)` }, { transform: 'none' }],
      timing,
    );
  }
}

/** Primera mitad del reordenado animado: dónde está cada fotograma. */
export function measure(strip: HTMLElement): Map<string, number> {
  const places = new Map<string, number>();
  for (const frame of strip.children) {
    const id = (frame as HTMLElement).dataset.id;
    if (id) places.set(id, frame.getBoundingClientRect().left);
  }
  return places;
}

/** Segunda mitad: cada fotograma se desliza desde donde estaba. */
export function slideFrom(strip: HTMLElement, places: Map<string, number>): void {
  if (calm()) return;
  for (const frame of strip.children) {
    const element = frame as HTMLElement;
    const before = places.get(element.dataset.id ?? '');
    if (before === undefined) continue;
    const delta = before - element.getBoundingClientRect().left;
    if (!delta) continue;
    element.animate(
      [{ transform: `translateX(${delta}px)` }, { transform: 'none' }],
      { duration: 320, easing: 'cubic-bezier(.3, .8, .3, 1)' },
    );
  }
}

/** Piloto: parpadea mientras guarda, se queda fijo al terminar y se apaga si falla. */
export function pilotLamp(lamp: HTMLElement | null): { busy(): void; done(ok: boolean): void } {
  let since = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    busy() {
      if (!lamp) return;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (!lamp.classList.contains('saving')) since = performance.now();
      lamp.classList.remove('failed');
      lamp.classList.add('saving');
    },
    done(ok) {
      if (!lamp) return;
      // Que se vea al menos un parpadeo aunque guarde en un instante.
      const wait = Math.max(0, 700 - (performance.now() - since));
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        lamp.classList.remove('saving');
        lamp.classList.toggle('failed', !ok);
      }, ok ? wait : 0);
    },
  };
}

/** Brillo que recorre la placa metálica al girar el dial. */
export function sheen(plate: HTMLElement): void {
  if (calm()) return;
  plate.classList.remove('sheen');
  void plate.offsetWidth; // reinicia la animación
  plate.classList.add('sheen');
}
