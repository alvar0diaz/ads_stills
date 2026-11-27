/** Apertura, reducción y exportación de fotos en el dispositivo. */
import type { DraftImage, DraftPhoto } from './draft';
import { JPEG_QUALITY, OUTPUT_HEIGHT, OUTPUT_WIDTH, drawFrame, type FrameOptions } from './frame';

export const WORKING_SIDE = 3200;
const THUMB_SIDE = 480;
/** Calidad de la copia de trabajo, alta porque luego se vuelve a codificar. */
const WORKING_QUALITY = 0.97;

export interface Photo {
  id: string;
  name: string;
  /** Copia de trabajo comprimida; se descodifica solo cuando hace falta. */
  blob: Blob;
  thumb: HTMLCanvasElement;
  original: boolean;
  position: number;
}

export function fitWithin(width: number, height: number, side: number) {
  const k = Math.min(1, side / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export function openError(file: { name: string; type: string }): string {
  const heic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
  return heic
    ? `«${file.name}»: este navegador no puede abrir fotos HEIC. Conviértela a JPEG o pruébalo en Safari.`
    : `«${file.name}»: no se pudo abrir. Prueba con un JPEG.`;
}

/** <img> aplica la orientación EXIF por defecto, también al pasarla a un lienzo. */
export function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    image.src = url;
  });
}

function scaled(source: CanvasImageSource, size: { width: number; height: number }) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  // Las transparencias (PNG) van sobre blanco, no sobre negro.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, size.width, size.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

export function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', quality),
  );
}

/** Safari tarda en liberar los lienzos; ponerlos a cero devuelve la memoria. */
function release(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/** Único también entre sesiones, porque las fotos se guardan en el borrador. */
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function loadPhoto(file: File): Promise<Photo> {
  const image = await decode(file);
  const size = fitWithin(image.naturalWidth, image.naturalHeight, WORKING_SIDE);
  const working = scaled(image, size);
  try {
    const blob = await toJpeg(working, WORKING_QUALITY);
    const thumb = scaled(working, fitWithin(size.width, size.height, THUMB_SIDE));
    return { id: newId(), name: file.name, blob, thumb, original: false, position: 0.5 };
  } finally {
    release(working);
  }
}

export async function exportPhoto(photo: Photo, margin: number): Promise<Blob> {
  const image = await decode(photo.blob);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  try {
    const options: FrameOptions = { margin, original: photo.original, position: photo.position };
    drawFrame(canvas, image, options);
    return await toJpeg(canvas, JPEG_QUALITY);
  } finally {
    release(canvas);
  }
}

export async function toDraftImage(photo: Photo): Promise<DraftImage> {
  const thumb = await toJpeg(photo.thumb, 0.9);
  return { id: photo.id, full: await photo.blob.arrayBuffer(), thumb: await thumb.arrayBuffer() };
}

export async function fromDraftImage(saved: DraftPhoto, image: DraftImage): Promise<Photo> {
  const type = 'image/jpeg';
  const small = await decode(new Blob([image.thumb], { type }));
  const thumb = scaled(small, { width: small.naturalWidth, height: small.naturalHeight });
  return { ...saved, blob: new Blob([image.full], { type }), thumb };
}
