import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        devOptions: {
          enabled: false
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            // a) Supabase - NetworkOnly (never cache API calls)
            {
              urlPattern: ({ url }) => 
                url.pathname.includes('/auth/v1/') || 
                url.pathname.includes('/rest/v1/') || 
                url.pathname.includes('/realtime/v1/') || 
                url.pathname.includes('/functions/v1/'),
              handler: 'NetworkOnly',
            },
            // c) Checkout & Payments - NetworkOnly
            {
              urlPattern: ({ url }) => 
                url.pathname.includes('/checkout') || 
                url.pathname.includes('/callback') || 
                url.pathname.includes('/webhook') || 
                url.pathname.includes('/sucesso'),
              handler: 'NetworkOnly',
            },
            // b) Navigation/HTML - NetworkFirst
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                networkTimeoutSeconds: 3,
                cacheName: 'pages',
                expiration: {
                  maxEntries: 50,
                },
              },
            },
            // d) Exercise videos and images from Supabase Storage - StaleWhileRevalidate
            // Excluding signed URLs (token=) and progress photos (/progresso/)
            {
              urlPattern: ({ url }) => 
                (url.pathname.includes('/storage/v1/object/public/exercicios/') || 
                 url.href.includes('supabase.co/storage/v1/object/public/exercicios/')) &&
                !url.search.includes('token=') &&
                !url.pathname.includes('/progresso/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'exercise-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ]
        },
        manifest: {
          name: "Zelos Personal",
          short_name: "Zelos",
          description: "Plataforma de treino para personal trainers e alunos",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#EDE9E3",
          theme_color: "#F26A1B",
          lang: "pt-BR",
          icons: [
            { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
            { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
            { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
