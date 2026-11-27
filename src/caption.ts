/** Descripción de la publicación y protección del texto retocado. */

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export interface CaptionData {
  phrase: string;
  city: string;
  country: string;
  /** 1 a 12; 0 = sin mes. */
  month: number;
  year: string;
  camera: string;
  /** Etiquetas de la cámara elegida. */
  cameraTags: string;
  placeTag: string;
  extraTags: string;
}

/** Etiqueta sin tildes, espacios ni signos, en minúsculas. */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

/** Texto libre («#a, b c») convertido en etiquetas. */
const splitTags = (text: string) => text.split(/[\s,;#]+/).map(slug);

export function buildTags(data: CaptionData): string[] {
  const tags = [
    'streetphotography',
    ...(data.camera.trim() ? splitTags(data.cameraTags) : []),
    slug(data.placeTag) || slug(data.city),
    ...splitTags(data.extraTags),
  ];
  return [...new Set(tags.filter(Boolean))].map((tag) => `#${tag}`);
}

export function buildCaption(data: CaptionData): string {
  const city = data.city.trim();
  const country = data.country.trim();
  const camera = data.camera.trim();
  const year = data.year.trim();
  const month = MONTHS[data.month - 1];

  const info = [
    city && `📍 ${[city, country].filter(Boolean).join(', ')}`,
    month && year && `📅 ${month}, ${year}`,
    camera && `📷 ${camera}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [data.phrase.trim(), info, '.\n.\n.', buildTags(data).join(' ')]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Mientras no se retoque, el texto sigue a los datos. Una vez retocado no se
 * pisa: queda marcado como desfasado hasta que se pida «Regenerar».
 */
export class CaptionEditor {
  text: string;
  private generated: string;
  /** Texto generado del que parte el retoque; null si no hay retoque. */
  private base: string | null = null;

  constructor(generated: string) {
    this.generated = generated;
    this.text = generated;
  }

  snapshot(): { text: string; base: string | null } {
    return { text: this.text, base: this.base };
  }

  restore(generated: string, saved: { text: string; base: string | null }): void {
    this.generated = generated;
    this.base = saved.base;
    this.text = saved.base === null ? generated : saved.text;
  }

  get edited(): boolean {
    return this.base !== null;
  }

  get stale(): boolean {
    return this.base !== null && this.base !== this.generated;
  }

  update(generated: string): void {
    this.generated = generated;
    if (this.base === null) this.text = generated;
  }

  edit(text: string): void {
    this.text = text;
    if (text === this.generated) this.base = null;
    else this.base ??= this.generated;
  }

  regenerate(): void {
    this.base = null;
    this.text = this.generated;
  }
}
