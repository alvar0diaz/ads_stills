import './style.css';
import { CaptionEditor, GX80_CAMERA, MONTHS, buildCaption, type CaptionData } from './caption';
import { MAX_PHOTOS, admit, moveSelected, removeSelected, type Carousel } from './carousel';
import {
  MARGIN_MAX, MARGIN_MIN, MARGIN_STEP, canReframe, clampMargin, dragPosition, drawFrame,
  type FrameOptions,
} from './frame';
import { decode, loadPhoto, openError, type Photo } from './images';
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
let shown: { id: number; image: HTMLImageElement } | null = null;

const current = () => carousel.items[carousel.selected];
const margin = () => clampMargin(Number(marginInput.value));
const optionsFor = (photo: Photo): FrameOptions => ({
  margin: margin(),
  original: photo.original,
  position: photo.position,
});

/* ---------- Vista previa y tira ---------- */

function drawPlaceholder(text: string): void {
  drawFrame(view, null, { margin: margin(), original: false, position: 0.5 });
  const context = view.getContext('2d')!;
  context.fillStyle = '#777';
  context.font = '44px -apple-system, sans-serif';
  context.textAlign = 'center';
  context.fillText(text, view.width / 2, view.height / 2);
}

function drawView(): void {
  const photo = current();
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
  strip.replaceChildren(
    ...carousel.items.map((photo, i) => {
      const button = document.createElement('button');
      const canvas = document.createElement('canvas');
      button.type = 'button';
      button.setAttribute('aria-label', `Foto ${i + 1}: ${photo.name}`);
      button.setAttribute('aria-pressed', String(i === carousel.selected));
      canvas.width = 120;
      canvas.height = 150;
      drawFrame(canvas, photo.thumb, optionsFor(photo));
      button.append(canvas);
      button.onclick = () => {
        carousel = { ...carousel, selected: i };
        render();
      };
      return button;
    }),
  );
  strip.scrollLeft = scroll;
  if (hadFocus) (strip.children[carousel.selected] as HTMLElement | undefined)?.focus();
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
      carousel = { ...carousel, items: [...carousel.items, photo] };
      render();
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

input('files').onchange = (event) => {
  const field = event.target as HTMLInputElement;
  const files = [...(field.files ?? [])];
  field.value = '';
  if (files.length) queue = queue.then(() => addFiles(files));
};

byId('moveBefore').onclick = () => {
  carousel = moveSelected(carousel, -1);
  render();
};
byId('moveAfter').onclick = () => {
  carousel = moveSelected(carousel, 1);
  render();
};
byId('remove').onclick = () => {
  carousel = removeSelected(carousel);
  byId('loadStatus').textContent = countText();
  render();
};

function setOriginal(original: boolean): void {
  const photo = current();
  if (!photo) return;
  photo.original = original;
  render();
}
byId('fitCrop').onclick = () => setOriginal(false);
byId('fitOriginal').onclick = () => setOriginal(true);

/* ---------- Encuadre y margen ---------- */

positionInput.oninput = () => {
  const photo = current();
  if (!photo) return;
  photo.position = Number(positionInput.value) / 100;
  drawView();
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
  photo.position = dragPosition(
    photo.thumb,
    view.clientWidth,
    { ...optionsFor(photo), position: drag.position },
    event.clientX - drag.x,
    event.clientY - drag.y,
  );
  positionInput.value = String(Math.round(photo.position * 100));
  drawView();
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
};

/* ---------- Descripción ---------- */

monthSelect.replaceChildren(
  new Option('Sin mes', '0'),
  ...MONTHS.map((name, i) => new Option(name, String(i + 1))),
);
const now = new Date();
monthSelect.value = String(now.getMonth() + 1);
input('year').value = String(now.getFullYear());
input('camera').value = recall('camera') ?? '';

const readData = (): CaptionData => ({
  phrase: input('phrase').value,
  city: input('city').value,
  country: input('country').value,
  month: Number(monthSelect.value),
  year: input('year').value,
  camera: input('camera').value,
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
}

for (const id of ['phrase', 'city', 'country', 'year', 'camera', 'placeTag', 'extraTags']) {
  input(id).addEventListener('input', dataChanged);
}
monthSelect.addEventListener('change', dataChanged);
input('camera').addEventListener('input', () => remember('camera', input('camera').value));

byId('gx80').onclick = () => {
  input('camera').value = GX80_CAMERA;
  remember('camera', GX80_CAMERA);
  dataChanged();
};

captionArea.oninput = () => {
  editor.edit(captionArea.value);
  byId('copyStatus').textContent = '';
  renderCaption();
};
byId('regenerate').onclick = () => {
  editor.regenerate();
  byId('copyStatus').textContent = 'Descripción regenerada.';
  renderCaption();
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

render();
renderCaption();
