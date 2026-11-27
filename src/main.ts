import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-600.css';
import '@fontsource/michroma/latin-400.css';
import './style.css';
import { Autosave } from './autosave';
import { createCameraPanel } from './camera-panel';
import { suggestedTags } from './cameras';
import { CaptionEditor, MONTHS, buildCaption, type CaptionData } from './caption';
import { MAX_PHOTOS, admit, moveSelected, removeSelected, type Carousel } from './carousel';
import { develop, elapsed, markFresh } from './develop';
import { DraftStore, type DraftState } from './draft';
import { createDropZone } from './dropzone';
import {
  MARGIN_MAX, MARGIN_MIN, MARGIN_STEP, canReframe, clampMargin, dragPosition, drawFrame,
  type FrameOptions,
} from './frame';
import { decode, fromDraftImage, loadPhoto, openError, toDraftImage, type Photo } from './images';
import { reframeKey, stripAction } from './keys';
import { startServiceWorker } from './pwa';
import { createSavePanel } from './save-panel';
import { startTheme } from './theme';
import { recall, remember } from './settings';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta #${id}`);
  return element as T;
}

const input = (id: string) => byId<HTMLInputElement>(id);
const view = byId<HTMLCanvasElement>('view');
const marginInput = input('margin');
const positionInput = input('position');
const monthSelect = byId<HTMLSelectElement>('month');
const captionArea = byId<HTMLTextAreaElement>('caption');

let carousel: Carousel<Photo> = { items: [], selected: 0 };
/** Única foto descodificada a tamaño de trabajo: la que se está viendo. */
let shown: { id: string; image: HTMLImageElement } | null = null;

const current = () => carousel.items[carousel.selected];
const margin = () => clampMargin(Number(marginInput.value));
const optionsFor = (photo: Photo): FrameOptions => ({
  margin: margin(),
  original: photo.original,
  position: photo.position,
});

const savePanel = createSavePanel({ photos: () => carousel.items, margin });

/** Cambio en las fotos o el marco: lo preparado deja de valer. */
function photosChanged(): void {
  savePanel.invalidate();
  autosave.schedule();
}

/* ---------- Vista previa y tira ---------- */

function drawPlaceholder(text: string): void {
  drawFrame(view, null, { margin: margin(), original: false, position: 0.5 });
  const context = view.getContext('2d')!;
  context.fillStyle = '#777';
  context.font = '44px Jost, -apple-system, sans-serif';
  context.textAlign = 'center';
  context.fillText(text, view.width / 2, view.height / 2);
}

/** Foto cuyo revelado está puesto en la vista grande. */
let developingView: string | null = null;
view.addEventListener('animationend', () => develop(view, null));

function developView(id: string | null): void {
  if (id === developingView) return;
  developingView = id;
  develop(view, null);
  void view.offsetWidth; // reinicia la animación
  if (id) develop(view, elapsed(id));
}

function drawView(): void {
  const photo = current();
  developView(photo?.id ?? null);
  if (!photo) {
    shown = null;
    drawPlaceholder('Aquí verás tu foto con el marco');
    return;
  }
  if (shown?.id === photo.id) {
    drawFrame(view, shown.image, optionsFor(photo));
    return;
  }
  // Mientras se descodifica la copia de trabajo se pinta la miniatura.
  drawFrame(view, photo.thumb, optionsFor(photo));
  decode(photo.blob).then(
    (image) => {
      if (current()?.id !== photo.id) return;
      shown = { id: photo.id, image };
      drawFrame(view, image, optionsFor(photo));
    },
    () => drawPlaceholder('No se pudo mostrar esta foto'),
  );
}

function renderStrip(): void {
  const strip = byId('strip');
  const scroll = strip.scrollLeft;
  const hadFocus = strip.contains(document.activeElement);
  strip.hidden = !carousel.items.length;
  strip.replaceChildren(
    ...carousel.items.map((photo, i) => {
      const button = document.createElement('button');
      const canvas = document.createElement('canvas');
      button.type = 'button';
      button.setAttribute('aria-label', `Foto ${i + 1}: ${photo.name}`);
      button.setAttribute('aria-pressed', String(i === carousel.selected));
      // Un solo alto en el tabulador: dentro de la tira se va con las flechas.
      button.tabIndex = i === carousel.selected ? 0 : -1;
      canvas.width = 120;
      canvas.height = 150;
      drawFrame(canvas, photo.thumb, optionsFor(photo));
      develop(canvas, elapsed(photo.id));
      button.append(canvas);
      button.onclick = () => selectPhoto(i);
      return button;
    }),
  );
  strip.scrollLeft = scroll;
  if (hadFocus) focusSelected();
}

function focusSelected(): void {
  const button = byId('strip').children[carousel.selected] as HTMLElement | undefined;
  button?.focus({ preventScroll: true });
  button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function selectPhoto(index: number): void {
  carousel = { ...carousel, selected: index };
  render();
  // Safari no da el foco a un botón al pulsarlo y el teclado no respondería.
  focusSelected();
  autosave.schedule();
}

function renderReframe(): void {
  const photo = current();
  const possible = !!photo && canReframe(photo.thumb, optionsFor(photo));
  byId('positionField').hidden = !possible;
  view.classList.toggle('draggable', possible);
  if (photo) positionInput.value = String(Math.round(photo.position * 100));
}

function render(): void {
  const photo = current();
  byId('marginOut').textContent = `${String(margin()).replace('.', ',')} % del ancho`;
  byId('tools').hidden = !photo;
  byId('counter').hidden = !photo;
  const two = (n: number) => String(n).padStart(2, '0');
  byId('counter').textContent = `${two(carousel.selected + 1)} / ${two(carousel.items.length)}`;
  drawView();
  renderStrip();
  renderReframe();
  if (!photo) return;
  byId<HTMLButtonElement>('moveBefore').disabled = carousel.selected === 0;
  byId<HTMLButtonElement>('moveAfter').disabled = carousel.selected === carousel.items.length - 1;
  byId('fitCrop').setAttribute('aria-pressed', String(!photo.original));
  byId('fitOriginal').setAttribute('aria-pressed', String(photo.original));
}

/* ---------- Fotos ---------- */

const countText = () => {
  const n = carousel.items.length;
  return n === 1 ? '1 foto en el carrusel.' : `${n} fotos en el carrusel.`;
};

let queue = Promise.resolve();
/** Tandas de carga pendientes. */
let loading = 0;

function setLoading(step: 1 | -1): void {
  loading += step;
  savePanel.setBusy(loading > 0);
  byId<HTMLButtonElement>('newPost').disabled = loading > 0;
  byId<HTMLButtonElement>('update').disabled = loading > 0;
}

async function addFiles(files: File[]): Promise<void> {
  const { accepted, rejected } = admit(carousel.items.length, files);
  const errors = byId('loadErrors');
  const status = byId('loadStatus');
  errors.replaceChildren();
  // De una en una para no disparar la memoria en el iPhone.
  for (const [i, file] of accepted.entries()) {
    status.textContent = `Cargando ${i + 1} de ${accepted.length}…`;
    try {
      const photo = await loadPhoto(file);
      markFresh(photo.id);
      carousel = { ...carousel, items: [...carousel.items, photo] };
      render();
      photosChanged();
    } catch {
      const item = document.createElement('li');
      item.textContent = openError(file);
      errors.append(item);
    }
  }
  const over = rejected
    ? ` Instagram admite ${MAX_PHOTOS} como máximo: ${rejected === 1 ? 'se ha quedado fuera 1' : `se han quedado fuera ${rejected}`}.`
    : '';
  status.textContent = countText() + over;
}

function enqueue(files: File[]): void {
  if (!files.length) return;
  setLoading(1);
  queue = queue.then(() => addFiles(files)).finally(() => setLoading(-1));
}

input('files').onchange = (event) => {
  const field = event.target as HTMLInputElement;
  const files = [...(field.files ?? [])];
  field.value = '';
  enqueue(files);
};

// Mientras se recupera el borrador la página está inactiva y no admite fotos.
createDropZone(byId('dropOverlay'), (files) => {
  if (!document.querySelector('main')!.inert) enqueue(files);
});

function move(step: -1 | 1): void {
  const next = moveSelected(carousel, step);
  if (next === carousel) return;
  carousel = next;
  render();
  photosChanged();
}

function remove(): void {
  if (!current()) return;
  carousel = removeSelected(carousel);
  byId('loadStatus').textContent = countText();
  render();
  photosChanged();
}

byId('moveBefore').onclick = () => move(-1);
byId('moveAfter').onclick = () => move(1);
byId('remove').onclick = remove;

byId('strip').onkeydown = (event) => {
  const action = stripAction(event, carousel.selected, carousel.items.length);
  if (!action) return;
  event.preventDefault();
  if (action.type === 'select') selectPhoto(action.index);
  else if (action.type === 'move') move(action.step);
  else remove();
  focusSelected();
};

function setOriginal(original: boolean): void {
  const photo = current();
  if (!photo) return;
  if (photo.original === original) return;
  photo.original = original;
  render();
  photosChanged();
}
byId('fitCrop').onclick = () => setOriginal(false);
byId('fitOriginal').onclick = () => setOriginal(true);

/* ---------- Encuadre y margen ---------- */

positionInput.oninput = () => {
  const photo = current();
  if (!photo) return;
  photo.position = Number(positionInput.value) / 100;
  drawView();
  photosChanged();
};
positionInput.onchange = renderStrip;

let drag: { pointer: number; x: number; y: number; position: number } | null = null;

view.onpointerdown = (event) => {
  const photo = current();
  if (!photo || drag || !view.classList.contains('draggable')) return;
  drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, position: photo.position };
  view.setPointerCapture(event.pointerId);
};
view.onpointermove = (event) => {
  const photo = current();
  if (!drag || !photo || event.pointerId !== drag.pointer) return;
  const position = dragPosition(
    photo.thumb,
    view.clientWidth,
    { ...optionsFor(photo), position: drag.position },
    event.clientX - drag.x,
    event.clientY - drag.y,
  );
  if (position === photo.position) return;
  photo.position = position;
  positionInput.value = String(Math.round(photo.position * 100));
  drawView();
  photosChanged();
};
view.onkeydown = (event) => {
  const photo = current();
  if (!photo || !view.classList.contains('draggable')) return;
  const position = reframeKey(event, photo.position);
  if (position === null) return;
  event.preventDefault();
  if (position === photo.position) return;
  photo.position = position;
  positionInput.value = String(Math.round(position * 100));
  drawView();
  renderStrip();
  photosChanged();
};

view.onpointerup = view.onpointercancel = (event) => {
  if (!drag || event.pointerId !== drag.pointer) return;
  drag = null;
  renderStrip();
};

marginInput.min = String(MARGIN_MIN);
marginInput.max = String(MARGIN_MAX);
marginInput.step = String(MARGIN_STEP);
const storedMargin = recall('margin');
marginInput.value = String(clampMargin(storedMargin === null ? NaN : Number(storedMargin)));
marginInput.oninput = () => {
  remember('margin', marginInput.value);
  render();
  savePanel.invalidate();
};

/* ---------- Descripción ---------- */

monthSelect.replaceChildren(
  new Option('Sin mes', '0'),
  ...MONTHS.map((name, i) => new Option(name, String(i + 1))),
);

const cameraPanel = createCameraPanel(() => dataChanged());

/** Campos de una publicación nueva, con la cámara predeterminada. */
function emptyFields(): CaptionData {
  const now = new Date();
  return {
    phrase: '', city: '', country: 'España', month: now.getMonth() + 1, year: String(now.getFullYear()),
    ...cameraPanel.initial(), placeTag: '', extraTags: '',
  };
}

const TEXT_FIELDS = ['phrase', 'city', 'country', 'year', 'placeTag', 'extraTags'] as const;

function writeFields(data: CaptionData): void {
  for (const id of TEXT_FIELDS) input(id).value = data[id];
  monthSelect.value = String(data.month);
  cameraPanel.write(data);
}
writeFields(emptyFields());

const readData = (): CaptionData => ({
  phrase: input('phrase').value,
  city: input('city').value,
  country: input('country').value,
  month: Number(monthSelect.value),
  year: input('year').value,
  ...cameraPanel.read(),
  placeTag: input('placeTag').value,
  extraTags: input('extraTags').value,
});

const editor = new CaptionEditor(buildCaption(readData()));

function renderCaption(): void {
  // Reasignar el mismo valor movería el cursor.
  if (captionArea.value !== editor.text) captionArea.value = editor.text;
  byId('staleBox').hidden = !editor.stale;
  byId('regenerate').hidden = !editor.edited;
}

function dataChanged(): void {
  editor.update(buildCaption(readData()));
  byId('copyStatus').textContent = '';
  renderCaption();
  autosave.schedule();
}

for (const id of TEXT_FIELDS) {
  input(id).addEventListener('input', dataChanged);
}
monthSelect.addEventListener('change', dataChanged);
captionArea.oninput = () => {
  editor.edit(captionArea.value);
  byId('copyStatus').textContent = '';
  renderCaption();
  autosave.schedule();
};
byId('regenerate').onclick = () => {
  editor.regenerate();
  byId('copyStatus').textContent = 'Descripción regenerada.';
  renderCaption();
  autosave.schedule();
};
byId('copy').onclick = async () => {
  const status = byId('copyStatus');
  try {
    await navigator.clipboard.writeText(captionArea.value);
    status.textContent = 'Copiada. Pégala en Instagram.';
  } catch {
    captionArea.focus();
    captionArea.setSelectionRange(0, captionArea.value.length);
    status.textContent = 'No se pudo copiar sola. El texto está seleccionado: usa «Copiar».';
  }
};

/* ---------- Borrador ---------- */

const store = new DraftStore();
/** Falso hasta haber leído el borrador: así nunca se pisa sin querer. */
let canSave = false;

const draftState = (): DraftState => ({
  photos: carousel.items.map(({ id, name, original, position }) => ({ id, name, original, position })),
  selected: carousel.selected,
  fields: readData(),
  caption: editor.snapshot(),
});

const autosave = new Autosave(
  async () => {
    if (!canSave) throw new Error('Borrador no disponible');
    const items = carousel.items;
    await store.save(draftState(), (id) => toDraftImage(items.find((p) => p.id === id)!));
  },
  (ok) => {
    byId('draftStatus').textContent = ok
      ? ''
      : 'No se está guardando el borrador (puede faltar espacio). Si cierras la app, se perderá.';
  },
);

/** Devuelve cuántas fotos del borrador no se han podido abrir. */
async function restoreDraft(): Promise<number> {
  const draft = await store.load();
  if (!draft) return 0;
  const photos: Photo[] = [];
  let lost = 0;
  for (const saved of draft.state.photos) {
    const image = draft.images.get(saved.id);
    try {
      if (!image) throw new Error('sin imagen');
      photos.push(await fromDraftImage(saved, image));
    } catch {
      lost++;
    }
  }
  carousel = {
    items: photos,
    selected: Math.max(0, Math.min(draft.state.selected, photos.length - 1)),
  };
  const { fields } = draft.state;
  // Los borradores antiguos no guardaban las etiquetas de la cámara.
  writeFields({ ...fields, cameraTags: fields.cameraTags ?? suggestedTags(fields.camera) });
  editor.restore(buildCaption(readData()), draft.state.caption);
  if (photos.length) byId('loadStatus').textContent = countText();
  return lost;
}

byId('newPost').onclick = async () => {
  if (!confirm('¿Empezar una publicación nueva? Se borran las fotos y los textos actuales.')) return;
  carousel = { items: [], selected: 0 };
  writeFields(emptyFields());
  editor.restore(buildCaption(readData()), { text: '', base: null });
  byId('loadErrors').replaceChildren();
  byId('loadStatus').textContent = 'Puedes elegir hasta 20. Se ordenan como irán en el carrusel.';
  byId('copyStatus').textContent = '';
  render();
  renderCaption();
  savePanel.invalidate();
  // También sirve para salir de un borrador que no se pudo leer.
  canSave = true;
  await autosave.flush();
  window.scrollTo({ top: 0 });
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && canSave) void autosave.flush();
});
window.addEventListener('pagehide', () => {
  if (canSave) void autosave.flush();
});

async function start(): Promise<void> {
  try {
    const lost = await restoreDraft();
    // Si falta alguna, no se guarda: se borraría del borrador y quizá el fallo sea pasajero.
    canSave = lost === 0;
    if (lost) {
      byId('draftStatus').textContent =
        `Fotos del borrador sin recuperar: ${lost}. Cierra y vuelve a abrir la app, o pulsa «Nueva publicación». Mientras tanto no se guarda nada.`;
    }
  } catch (error) {
    console.error(error);
    byId('draftStatus').textContent =
      'No se pudo leer el borrador. No se guardará nada hasta que cierres y abras la app, o pulses «Nueva publicación».';
  }
  render();
  renderCaption();
  savePanel.invalidate();
  document.querySelector('main')!.inert = false;
  // Pide que el sistema no borre el borrador; puede denegarlo.
  navigator.storage?.persist?.().catch(() => {});
}

// El texto del lienzo vacío se repinta cuando llega la letra.
document.fonts.load('44px Jost').then(() => current() || drawView(), () => {});

startTheme(byId<HTMLButtonElement>('themeSwitch'));

// La vista previa se queda fija justo debajo de la cabecera, mida lo que mida.
const cap = document.querySelector<HTMLElement>('.cap')!;
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--cap-h', `${cap.offsetHeight}px`);
}).observe(cap);
startServiceWorker(() => autosave.flush());
void start();
