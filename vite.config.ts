import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Ruta en GitHub Pages: https://<usuario>.github.io/ads_stills/ */
const PAGES_BASE = '/ads_stills/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'ads_stills: marco y texto',
        short_name: 'ads_stills',
        description: 'Marco y descripción para las publicaciones de @ads_stills.',
        lang: 'es-ES',
        display: 'standalone',
        background_color: '#161616',
        theme_color: '#161616',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo lo que usa la app se guarda al instalar: funciona sin red.
        globPatterns: ['**/*.{html,js,css,png,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}));
