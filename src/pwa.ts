/** Service worker: funcionamiento sin conexión y aviso de versión nueva. */
import { registerSW } from 'virtual:pwa-register';

export function startServiceWorker(beforeUpdate: () => Promise<boolean>): void {
  const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  byId('version').textContent = `Versión ${__APP_VERSION__}.`;
  const offline = byId('offline');

  const update = registerSW({
    onNeedRefresh() {
      byId('updateBox').hidden = false;
    },
    onOfflineReady() {
      offline.textContent = 'Lista para usar sin conexión.';
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) offline.textContent = 'Lista para usar sin conexión.';
      // Instalada, la app puede pasar días abierta: se comprueba al volver a ella.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {});
      });
    },
  });

  byId<HTMLButtonElement>('update').onclick = async () => {
    if (await beforeUpdate()) await update(true);
    else byId('updateText').textContent = 'No se ha podido guardar el borrador. Copia tu texto antes de cerrar la app.';
  };
}
