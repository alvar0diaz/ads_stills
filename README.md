# ads_stills: marco y texto

App web instalable (PWA) para preparar publicaciones de fotografía en iPhone, iPad y Mac: marco 4:5, descripción y guardado de las imágenes. La publicación se termina a mano en Instagram.

**Web:** <https://alvar0diaz.github.io/ads_stills/>

Las fotos y los textos se quedan en el dispositivo. No hay servidor propio, cuentas, analítica, claves ni servicios de pago.

## Instalar

La primera vez hace falta conexión. Espera a que abajo ponga «Lista para usar sin conexión».

| Dispositivo | Pasos |
|---|---|
| iPhone y iPad | Abrir la web en Safari → Compartir → **Añadir a pantalla de inicio** |
| Mac | Abrir la web en Safari → Archivo → **Añadir al Dock** |

Usa la app desde su icono. Cada instalación (y Safari por separado) tiene su propio borrador y su propia lista de cámaras; no se sincronizan.

## Usar

1. **Mis cámaras** (en «Datos de la publicación»): añade tus cámaras, con sus etiquetas si quieres, y marca la predeterminada. «Otra» permite escribir una sin guardarla.
2. **Elegir fotos** (en el Mac, también arrastrándolas). Hasta 20.
3. Ordena, elige «Mi formato» o «Sin recorte», encuadra y ajusta el grosor del marco.
4. Escribe la frase y los datos. Si retocas la descripción, no se pisa hasta que pulses «Regenerar».
5. **Preparar fotos** y después guardarlas.

Las imágenes salen a 2160 × 2700, JPEG, como `ads_stills_01.jpg`, `02`…

Para publicar, guarda las imágenes y súbelas a mano en Instagram.

### Tema

El dial de arriba a la derecha cambia entre plata (claro) y carbón (oscuro). Mientras no lo toques, o si lo devuelves al tema del dispositivo, la app sigue al sistema.

### Borrador y actualizaciones

- El borrador se guarda solo y sobrevive a cerrar la app. «Nueva publicación» lo borra.
- No es una copia de seguridad: borrar los datos del sitio, desinstalar la app o la falta de espacio pueden eliminarlo, junto con la lista de cámaras.
- Cuando haya versión nueva aparece un aviso; «Actualizar» conserva el borrador.
- El icono de la pantalla de inicio no cambia solo: para renovarlo hay que quitar la app y volver a añadirla, lo que **borra el borrador y las cámaras** de esa instalación.

### Si algo falla

| Problema | Qué hacer |
|---|---|
| Una foto HEIC no abre | Usar Safari o convertirla a JPEG |
| No aparece «Guardar imágenes» | Mantener pulsada cada foto preparada, o guardar de una en una |
| Safari del Mac solo baja una foto | Permitir las descargas múltiples para la web |
| No aparece el aviso de actualización | Cerrar la app del todo y abrirla con conexión |

## Desarrollo

Requiere Node 22.12 o posterior (en este Mac, `~/.local/node/bin`).

```bash
npm ci
npm run dev
```

- En el Mac basta con hacer doble clic en `probar.command`.
- `npm test`: pruebas automáticas.
- Con `npm run dev`, abrir `/tests/browser.html`: tamaño de salida, márgenes y orientación EXIF en un navegador real.
- `npm run build` y `npm run preview`: la versión con service worker, en `/ads_stills/`.
- `python3 scripts/icons.py` y `python3 scripts/textures.py`: regeneran iconos y texturas.

| Archivo | Contenido |
|---|---|
| `src/frame.ts` | Geometría y dibujo del marco |
| `src/caption.ts` | Descripción y etiquetas |
| `src/cameras.ts`, `src/camera-panel.ts` | Cámaras guardadas |
| `src/draft.ts`, `src/autosave.ts` | Borrador en IndexedDB |
| `src/share.ts`, `src/save-panel.ts` | Compartir y descargar |
| `src/style.css`, `src/develop.ts` | Aspecto (carbón de noche, plata de día) y animación de revelado |

Letras incluidas en la app, con licencia libre SIL OFL: Michroma y Jost (paquetes `@fontsource`).

## Despliegue

Cada envío a `main` ejecuta `.github/workflows/pages.yml`: instala, prueba, compila y publica en GitHub Pages. Si una prueba falla, no se publica.

```bash
git push origin main
```

Para publicarlo desde cero en otro repositorio:

1. Crear un repositorio **público** (el plan gratuito de GitHub lo exige para Pages).
2. Cambiar `PAGES_BASE` en `vite.config.ts` por `/<nombre-del-repositorio>/`.
3. En el repositorio: Settings → Pages → Source → **GitHub Actions**.
4. Enviar `main`.

Cambiar de dirección obliga a reinstalar la app y se pierden borradores y cámaras.

Límites de GitHub Pages (consultados en noviembre de 2026): sitio de hasta 1 GB y 100 GB de tráfico al mes como límite orientativo. [Condiciones vigentes](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
