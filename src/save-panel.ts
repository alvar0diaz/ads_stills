/** Sección «Guardar»: primero se generan los JPEG y después se comparten con un toque. */
import { exportPhoto, type Photo } from './images';
import { canShareFiles, downloadFiles, prefersShare, shareFiles, toFiles } from './share';

interface Source {
  photos: () => Photo[];
  margin: () => number;
}

export interface SavePanel {
  /** Descarta lo preparado: ya no coincide con lo que hay en pantalla. */
  invalidate: () => void;
  setBusy: (busy: boolean) => void;
}

export function createSavePanel(source: Source): SavePanel {
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const prepare = byId<HTMLButtonElement>('prepare');
  const status = byId('saveStatus');
  const results = byId('results');
  const shareAll = byId<HTMLButtonElement>('shareAll');
  const downloadAll = byId<HTMLButtonElement>('downloadAll');
  const outputs = byId('outputs');
  const progress = byId<HTMLProgressElement>('progress');
  const useShare = prefersShare(navigator);

  /** Cambia con cada invalidación; una preparación antigua se abandona. */
  let version = 0;
  let urls: string[] = [];
  let busy = false;
  let preparing = false;

  const refresh = () => {
    prepare.disabled = busy || preparing || !source.photos().length;
  };

  function invalidate(): void {
    version++;
    const had = !results.hidden || preparing;
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls = [];
    outputs.replaceChildren();
    results.hidden = true;
    shareAll.onclick = downloadAll.onclick = null;
    if (!source.photos().length) status.textContent = '';
    else if (had) status.textContent = 'Has cambiado las fotos o el marco: prepáralas de nuevo.';
    refresh();
  }

  async function share(files: File[]): Promise<void> {
    const result = await shareFiles(files, navigator);
    if (result.status === 'shared') status.textContent = 'Hecho. Comprueba que están en su sitio y en orden.';
    else if (result.status === 'cancelled') status.textContent = 'Cancelado. Puedes volver a pulsar.';
    else status.textContent = result.message;
  }

  async function download(files: File[]): Promise<void> {
    await downloadFiles(files);
    status.textContent = files.length === 1
      ? `Descarga iniciada: ${files[0]!.name}.`
      : `${files.length} descargas iniciadas. Si el navegador pide permiso para descargar varias, acéptalo.`;
  }

  function show(files: File[]): void {
    const shareable = canShareFiles(files, navigator);
    const shareFirst = useShare && shareable;
    const count = files.length;

    shareAll.hidden = !shareable;
    shareAll.textContent = shareFirst ? `Guardar todas (${count})` : `Compartir todas (${count})`;
    shareAll.classList.toggle('primary', shareFirst);
    shareAll.onclick = () => void share(files);

    downloadAll.hidden = shareFirst;
    downloadAll.textContent = `Descargar todas (${count})`;
    downloadAll.classList.toggle('primary', !shareFirst);
    downloadAll.onclick = () => void download(files);

    outputs.replaceChildren(
      ...files.map((file, i) => {
        const item = document.createElement('li');
        const image = document.createElement('img');
        const button = document.createElement('button');
        const url = URL.createObjectURL(file);
        urls.push(url);
        image.src = url;
        // Se revelan una tras otra.
        image.className = 'developing';
        image.style.animationDelay = `${Math.min(i * 180, 1800)}ms`;
        image.alt = `Foto ${i + 1} con marco`;
        const single = useShare && canShareFiles([file], navigator);
        button.type = 'button';
        button.textContent = `${single ? 'Guardar' : 'Descargar'} foto ${i + 1}`;
        button.onclick = () => void (single ? share([file]) : download([file]));
        item.append(image, button);
        return item;
      }),
    );
    results.hidden = false;
    status.textContent = shareFirst
      ? 'Listas. Pulsa «Guardar todas» y elige «Guardar imágenes» en el menú.'
      : useShare
        ? 'Listas. Este navegador no deja compartirlas: descárgalas o mantén pulsada cada foto.'
        : 'Listas.';
  }

  prepare.onclick = async () => {
    invalidate();
    const mine = version;
    const photos = [...source.photos()];
    const margin = source.margin();
    preparing = true;
    progress.value = 0;
    progress.hidden = false;
    refresh();
    try {
      const blobs: Blob[] = [];
      for (const [i, photo] of photos.entries()) {
        status.textContent = `Preparando ${i + 1} de ${photos.length}…`;
        blobs.push(await exportPhoto(photo, margin));
        if (mine !== version) return;
        progress.value = (i + 1) / photos.length;
      }
      show(toFiles(blobs));
    } catch {
      if (mine === version) status.textContent = 'No se pudieron preparar las fotos. Cierra otras apps y vuelve a probar.';
    } finally {
      preparing = false;
      progress.hidden = true;
      refresh();
    }
  };

  refresh();
  return {
    invalidate,
    setBusy(value) {
      busy = value;
      refresh();
    },
  };
}
