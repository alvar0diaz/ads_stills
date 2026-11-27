/** Compartir con el menú del sistema y descargar como alternativa. */

type ShareNavigator = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> &
  Partial<Pick<Navigator, 'share' | 'canShare'>>;

export function fileName(index: number): string {
  return `ads_stills_${String(index + 1).padStart(2, '0')}.jpg`;
}

/** Fechas crecientes por si el destino ordena por ellas. */
export function toFiles(blobs: Blob[], now = Date.now()): File[] {
  return blobs.map(
    (blob, i) =>
      new File([blob], fileName(i), { type: 'image/jpeg', lastModified: now - (blobs.length - i) * 1000 }),
  );
}

/** iPhone, iPad (que se anuncia como Mac pero es táctil) y Android. */
export function prefersShare(nav: ShareNavigator): boolean {
  return /iPhone|iPad|iPod|Android/.test(nav.userAgent)
    || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

export function canShareFiles(files: File[], nav: ShareNavigator): boolean {
  if (!files.length || !nav.share || !nav.canShare) return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

export type ShareResult = { status: 'shared' } | { status: 'cancelled' } | { status: 'failed'; message: string };

/**
 * Debe llamarse directamente desde un toque: no hay ninguna espera antes de
 * share(). Solo se envían archivos, sin título ni texto.
 */
export async function shareFiles(files: File[], nav: ShareNavigator): Promise<ShareResult> {
  try {
    await nav.share!({ files });
    return { status: 'shared' };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name ?? 'desconocido';
    if (name === 'AbortError') return { status: 'cancelled' };
    const messages: Record<string, string> = {
      NotAllowedError: 'El navegador no ha permitido compartir. Vuelve a pulsar; si se repite, guarda de una en una.',
      InvalidStateError: 'Ya hay un menú de compartir abierto. Ciérralo y vuelve a pulsar.',
    };
    return {
      status: 'failed',
      message: messages[name] ?? `No se pudo compartir (${name}). Prueba a guardar de una en una.`,
    };
  }
}

export async function downloadFiles(files: File[], pause = 350): Promise<void> {
  for (const [i, file] of files.entries()) {
    // Sin una pausa, algunos navegadores se saltan descargas seguidas.
    if (i) await new Promise((resolve) => setTimeout(resolve, pause));
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
