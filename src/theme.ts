/** Tema claro (plata) u oscuro (carbón): sigue al sistema hasta que se elige. */
import { recall, remember } from './settings';

export type Theme = 'light' | 'dark';

export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return systemDark ? 'dark' : 'light';
}

/**
 * Cambia al otro tema. Si coincide con el del sistema no se guarda nada, y así
 * la app vuelve a seguir al sistema.
 */
export function toggleTheme(current: Theme, systemDark: boolean): { theme: Theme; store: Theme | '' } {
  const theme = current === 'dark' ? 'light' : 'dark';
  return { theme, store: theme === resolveTheme(null, systemDark) ? '' : theme };
}

export function startTheme(button: HTMLButtonElement): void {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  // Copia en memoria: sirve aunque no se pueda escribir en el almacenamiento.
  let stored = recall('theme');

  const apply = () => {
    const theme = resolveTheme(stored, system.matches);
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-checked', String(theme === 'dark'));
    button.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  };

  button.onclick = () => {
    stored = toggleTheme(resolveTheme(stored, system.matches), system.matches).store;
    remember('theme', stored);
    apply();
  };
  system.addEventListener('change', apply);
  apply();
}
