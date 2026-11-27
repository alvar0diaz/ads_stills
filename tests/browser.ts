/** Pruebas que necesitan un lienzo real: exportación, píxeles y orientación EXIF. */
import { decode, exportPhoto, loadPhoto, toJpeg } from '../src/images';

const lines: string[] = [];
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures++;
  lines.push(`${ok ? 'BIEN ' : 'FALLO'} ${name}${detail ? ` (${detail})` : ''}`);
}

/** Mitad izquierda roja, mitad derecha azul. */
async function sample(width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#d00000';
  c.fillRect(0, 0, width / 2, height);
  c.fillStyle = '#0000d0';
  c.fillRect(width / 2, 0, width / 2, height);
  return toJpeg(canvas, 0.95);
}

/** Inserta un bloque EXIF mínimo con la orientación indicada. */
async function withOrientation(jpeg: Blob, orientation: number): Promise<Blob> {
  const exif = new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  return new Blob([jpeg.slice(0, 2), exif, jpeg.slice(2)], { type: 'image/jpeg' });
}

async function pixels(blob: Blob) {
  const image = await decode(blob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const c = canvas.getContext('2d')!;
  c.drawImage(image, 0, 0);
  const at = (x: number, y: number) => Array.from(c.getImageData(x, y, 1, 1).data.slice(0, 3));
  return { width: canvas.width, height: canvas.height, at };
}

const white = (p: number[]) => p.every((v) => v > 245);
const red = (p: number[]) => p[0]! > 150 && p[1]! < 80 && p[2]! < 80;
const blue = (p: number[]) => p[2]! > 150 && p[0]! < 80 && p[1]! < 80;
const file = (blob: Blob, name: string) => new File([blob], name, { type: blob.type });

async function run(): Promise<void> {
  const vertical = await loadPhoto(file(await sample(3000, 4000), 'v.jpg'));
  const copy = await decode(vertical.blob);
  check('Copia de trabajo a 3200 px', copy.naturalHeight === 3200 && copy.naturalWidth === 2400,
    `${copy.naturalWidth}×${copy.naturalHeight}`);

  const out = await exportPhoto(vertical, 2);
  const v = await pixels(out);
  check('Exporta JPEG', out.type === 'image/jpeg', out.type);
  check('Mide 2160×2700', v.width === 2160 && v.height === 2700, `${v.width}×${v.height}`);
  check('Fondo blanco en la esquina', white(v.at(2, 2)), String(v.at(2, 2)));
  check('Margen de 43 px a la izquierda', white(v.at(40, 1350)) && red(v.at(46, 1350)));
  check('Margen de 43 px arriba', white(v.at(500, 40)) && red(v.at(500, 46)));
  check('Margen de 43 px a la derecha y abajo', white(v.at(2120, 1350)) && blue(v.at(2113, 1350))
    && white(v.at(500, 2660)) && red(v.at(500, 2653)));

  const wide = await loadPhoto(file(await sample(4000, 3000), 'h.jpg'));
  const h = await pixels(await exportPhoto(wide, 2));
  check('Horizontal: blanco hasta unos 521 px arriba y abajo',
    white(h.at(500, 517)) && red(h.at(500, 525)) && red(h.at(500, 2175)) && white(h.at(500, 2183)));

  // Orientación 6: la foto se guarda tumbada y debe verse girada 90° a la derecha.
  const rotated = await loadPhoto(file(await withOrientation(await sample(1200, 800), 6), 'exif.jpg'));
  const r = await pixels(rotated.blob);
  check('EXIF: la foto queda vertical', r.width === 800 && r.height === 1200, `${r.width}×${r.height}`);
  check('EXIF: gira en el sentido correcto', red(r.at(400, 200)) && blue(r.at(400, 1000)));

  const heic = await loadPhoto(file(new Blob(['no es una imagen']), 'mala.jpg')).then(() => false, () => true);
  check('Un archivo ilegible da error', heic);
}

run()
  .catch((error) => check('Sin errores inesperados', false, String(error)))
  .finally(() => {
    lines.push('', failures ? `${failures} comprobaciones con fallo` : 'Todo correcto');
    document.getElementById('log')!.textContent = lines.join('\n');
  });
