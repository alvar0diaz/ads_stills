# ads_stills: marco y texto

PWA para preparar publicaciones: marco 4:5, descripción, guardar o compartir las imágenes y borrador en el dispositivo. Las fotos no se envían a ningún servidor.

- Web: <https://alvar0diaz.github.io/ads_stills/>
- iPad y Mac: dos columnas, arrastrar y soltar; atajos de teclado descritos en la propia app.
- Probar en el Mac: doble clic en `probar.command` (o `npm run dev`).
- Pruebas: `npm test`. Con `npm run dev`, además: `/tests/browser.html` (lienzo, píxeles y EXIF).
- Compilar y ver la versión con service worker: `npm run build && npm run preview`.
- Publicar: cada envío a `main` pasa las pruebas y despliega en GitHub Pages.
- Iconos: `python3 scripts/icons.py`.
