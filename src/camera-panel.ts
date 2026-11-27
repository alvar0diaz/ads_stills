/** Selector de cámara de la publicación y ventana «Mis cámaras». */
import {
  choiceOf, findByName, parseBook, reconcile, removeCamera, saveCamera, setDefault, defaultCamera,
  type CameraBook, type CameraChoice,
} from './cameras';
import { recall, remember } from './settings';

const NONE = '';
const OTHER = 'other';

export interface CameraPanel {
  read: () => CameraChoice;
  write: (choice: CameraChoice) => void;
  /** Cámara para una publicación nueva. */
  initial: () => CameraChoice;
}

export function createCameraPanel(changed: () => void): CameraPanel {
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const select = byId<HTMLSelectElement>('cameraSelect');
  const otherField = byId('otherCamera');
  const other = byId<HTMLInputElement>('camera');
  const dialog = byId<HTMLDialogElement>('cameraDialog');
  const list = byId('cameraList');
  const form = byId<HTMLFormElement>('cameraForm');
  const nameInput = byId<HTMLInputElement>('cameraName');
  const tagsInput = byId<HTMLInputElement>('cameraTags');
  const submit = byId<HTMLButtonElement>('cameraSubmit');
  const cancel = byId<HTMLButtonElement>('cameraCancel');
  const message = byId('cameraMessage');

  let book: CameraBook = parseBook(recall('cameras'), recall('camera'));
  let choice: CameraChoice = { camera: '', cameraTags: '' };
  let editing: string | undefined;

  function renderSelect(forceOther = false): void {
    const saved = findByName(book, choice.camera);
    const value = forceOther ? OTHER : saved ? saved.id : choice.camera ? OTHER : NONE;
    select.replaceChildren(
      new Option('Sin cámara', NONE),
      ...book.list.map((c) => new Option(c.name, c.id)),
      new Option('Otra (escribirla)', OTHER),
    );
    select.value = value;
    otherField.hidden = value !== OTHER;
    if (other.value !== choice.camera) other.value = choice.camera;
  }

  function store(next: CameraBook): void {
    const previous = book;
    book = next;
    remember('cameras', JSON.stringify(book));
    choice = reconcile(previous, book, choice);
    renderSelect();
    renderList();
    changed();
  }

  function resetForm(): void {
    editing = undefined;
    form.reset();
    submit.textContent = 'Añadir cámara';
    cancel.hidden = true;
  }

  function button(text: string, action: () => void): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.onclick = action;
    return element;
  }

  function renderList(): void {
    if (!book.list.length) {
      const empty = document.createElement('li');
      empty.className = 'soft';
      empty.textContent = 'Todavía no has guardado ninguna. Añade la primera.';
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(
      ...book.list.map((camera) => {
        const item = document.createElement('li');
        const label = document.createElement('label');
        const radio = document.createElement('input');
        const text = document.createElement('span');
        const name = document.createElement('strong');
        const detail = document.createElement('small');
        const isDefault = camera.id === defaultCamera(book)?.id;
        radio.type = 'radio';
        radio.name = 'defaultCamera';
        radio.checked = isDefault;
        radio.onchange = () => {
          store(setDefault(book, camera.id));
          message.textContent = `«${camera.name}» es ahora la predeterminada.`;
        };
        name.textContent = camera.name;
        detail.textContent = [
          isDefault ? 'Predeterminada.' : '',
          camera.tags ? `Etiquetas: ${camera.tags}` : 'Sin etiquetas',
        ].join(' ');
        text.append(name, detail);
        label.append(radio, text);
        const actions = document.createElement('div');
        actions.className = 'row';
        const edit = button('Editar', () => {
          editing = camera.id;
          nameInput.value = camera.name;
          tagsInput.value = camera.tags;
          submit.textContent = 'Guardar cambios';
          cancel.hidden = false;
          nameInput.focus();
        });
        const remove = button('Borrar', () => {
          if (!confirm(`¿Borrar «${camera.name}» de tus cámaras?`)) return;
          if (editing === camera.id) resetForm();
          store(removeCamera(book, camera.id));
          message.textContent = `«${camera.name}» borrada.`;
        });
        edit.setAttribute('aria-label', `Editar ${camera.name}`);
        remove.setAttribute('aria-label', `Borrar ${camera.name}`);
        actions.append(edit, remove);
        item.append(label, actions);
        return item;
      }),
    );
  }

  select.onchange = () => {
    if (select.value === OTHER) {
      choice = { camera: '', cameraTags: '' };
      renderSelect(true);
      other.focus();
    } else {
      choice = choiceOf(book.list.find((c) => c.id === select.value));
      renderSelect();
    }
    changed();
  };
  other.oninput = () => {
    // Una cámara escrita a mano no lleva etiquetas, salvo que sea una guardada.
    choice = { camera: other.value, cameraTags: findByName(book, other.value)?.tags ?? '' };
    changed();
  };

  byId('manageCameras').onclick = () => {
    resetForm();
    message.textContent = '';
    renderList();
    dialog.showModal();
  };
  byId('cameraClose').onclick = () => dialog.close();
  cancel.onclick = resetForm;
  form.onsubmit = (event) => {
    event.preventDefault();
    const result = saveCamera(book, { id: editing, name: nameInput.value, tags: tagsInput.value });
    if (typeof result === 'string') {
      message.textContent = result;
      return;
    }
    const done = editing ? 'Cambios guardados.' : 'Cámara añadida.';
    resetForm();
    store(result);
    message.textContent = done;
  };

  remember('cameras', JSON.stringify(book));

  return {
    read: () => ({ ...choice }),
    write(next) {
      choice = { ...next };
      renderSelect();
    },
    initial: () => choiceOf(defaultCamera(book)),
  };
}
