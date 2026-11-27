/** Geometría y dibujo del marco. Sin dependencias de la interfaz. */

export const OUTPUT_WIDTH = 2160;
export const OUTPUT_HEIGHT = 2700;
export const JPEG_QUALITY = 0.94;

export const MARGIN_MIN = 1;
export const MARGIN_MAX = 4;
export const MARGIN_STEP = 0.25;
export const MARGIN_DEFAULT = 2;

/** Proporción del recorte de las horizontales en «Mi formato». */
const LANDSCAPE_RATIO = 5 / 4;

export interface Size {
  width: number;
  height: number;
}

export interface FrameOptions {
  /** Margen en % del ancho. */
  margin: number;
  /** true = «Sin recorte». */
  original: boolean;
  /** Encuadre sobre el eje con holgura: 0 = principio, 0,5 = centrado, 1 = final. */
  position: number;
}

export interface Geometry {
  /** Rectángulo de la foto que se usa. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Rectángulo del lienzo donde se pinta. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** Píxeles de la foto que quedan fuera en cada eje. */
  freeX: number;
  freeY: number;
}

export function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return MARGIN_DEFAULT;
  const stepped = Math.round(value / MARGIN_STEP) * MARGIN_STEP;
  return Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, stepped));
}

export function marginPixels(margin: number): number {
  return Math.round((OUTPUT_WIDTH * margin) / 100);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * La caja de destino se calcula en píxeles enteros del tamaño de salida y se
 * escala al lienzo pedido (siempre 4:5), así la vista previa coincide con la
 * exportación.
 */
export function geometry(photo: Size, canvasWidth: number, options: FrameOptions): Geometry {
  const margin = marginPixels(options.margin);
  const innerW = OUTPUT_WIDTH - 2 * margin;
  const innerH = OUTPUT_HEIGHT - 2 * margin;
  const ratio = photo.width / photo.height;

  let boxW = innerW;
  let boxH = innerH;
  if (ratio > 1) {
    boxH = innerW / (options.original ? ratio : LANDSCAPE_RATIO);
  } else if (options.original) {
    if (ratio > innerW / innerH) boxH = innerW / ratio;
    else boxW = innerH * ratio;
  }
  boxW = Math.round(boxW);
  boxH = Math.round(boxH);

  const boxRatio = boxW / boxH;
  let sw = photo.width;
  let sh = photo.height;
  // En «Sin recorte» se usa la foto entera: el redondeo de la caja no recorta.
  if (!options.original) {
    if (ratio > boxRatio) sw = photo.height * boxRatio;
    else sh = photo.width / boxRatio;
  }

  const freeX = photo.width - sw;
  const freeY = photo.height - sh;
  const position = clamp01(options.position);
  const k = canvasWidth / OUTPUT_WIDTH;

  return {
    sx: freeX * position,
    sy: freeY * position,
    sw,
    sh,
    dx: Math.round((OUTPUT_WIDTH - boxW) / 2) * k,
    dy: Math.round((OUTPUT_HEIGHT - boxH) / 2) * k,
    dw: boxW * k,
    dh: boxH * k,
    freeX,
    freeY,
  };
}

/** Nuevo encuadre tras arrastrar (dx, dy) píxeles sobre un lienzo de ese ancho. */
export function dragPosition(
  photo: Size,
  canvasWidth: number,
  options: FrameOptions,
  deltaX: number,
  deltaY: number,
): number {
  const g = geometry(photo, canvasWidth, options);
  const horizontal = g.freeX >= g.freeY;
  const free = horizontal ? g.freeX : g.freeY;
  if (free < 1) return options.position;
  const travel = free * (horizontal ? g.dw / g.sw : g.dh / g.sh);
  return clamp01(options.position - (horizontal ? deltaX : deltaY) / travel);
}

export function canReframe(photo: Size, options: FrameOptions): boolean {
  const g = geometry(photo, OUTPUT_WIDTH, options);
  return g.freeX >= 1 || g.freeY >= 1;
}

/** Pinta fondo blanco y la foto enmarcada en un lienzo 4:5. */
export function drawFrame(
  canvas: HTMLCanvasElement,
  image: (CanvasImageSource & Size) | null,
  options: FrameOptions,
): void {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el lienzo');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!image) return;
  const g = geometry(image, canvas.width, options);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, g.sx, g.sy, g.sw, g.sh, g.dx, g.dy, g.dw, g.dh);
}
