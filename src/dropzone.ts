/** Arrastrar y soltar archivos sobre toda la ventana. */

export function createDropZone(overlay: HTMLElement, accept: (files: File[]) => void): void {
  /** Arrastre nacido en la propia página (p. ej. una foto ya preparada): no cuenta. */
  let internal = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    clearTimeout(timer);
    overlay.hidden = true;
  };
  const isFileDrag = (event: DragEvent) =>
    !internal && !!event.dataTransfer?.types.includes('Files');

  document.addEventListener('dragstart', () => (internal = true));
  document.addEventListener('dragend', () => (internal = false));

  const over = (event: DragEvent) => {
    if (!isFileDrag(event)) return;
    // Sin esto el navegador abriría la foto en lugar de la app.
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    overlay.hidden = false;
    // «dragover» se repite mientras se arrastra; si deja de llegar, se ha salido.
    clearTimeout(timer);
    timer = setTimeout(hide, 200);
  };
  window.addEventListener('dragenter', over);
  window.addEventListener('dragover', over);

  window.addEventListener('drop', (event) => {
    hide();
    if (!isFileDrag(event)) return;
    event.preventDefault();
    const files = [...event.dataTransfer!.files];
    if (files.length) accept(files);
  });
}
