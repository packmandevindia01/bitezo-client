import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/** Path aliases (Phase 0) — keep in sync with tsconfig.app.json and vitest.config.ts */
const aliases = {
  '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
  '@pos': fileURLToPath(new URL('./src/features/pos', import.meta.url)),
  '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
  '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: aliases },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': never reload a running POS by itself; AppStatusBanner asks the user (src/app/AppStatusBanner.tsx).
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MiB
      },
      manifest: {
        name: 'Bitezo POS',
        short_name: 'BitezoPOS',
        description: 'Bitezo Point of Sale Terminal',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'fullscreen',
        icons: [
          {
            src: 'favicon-48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'favicon-32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'bitezo-logo-hq-original.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'bitezo-logo-hq-original.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],

  optimizeDeps: {
    include: ['react-is', 'recharts']
  },

  server: {
    proxy: {
      "/api": {
        target: "http://192.168.1.53:8060/",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://192.168.1.53:8060/",
        changeOrigin: true,
        secure: false,
      },
      "/images": {
        target: "http://192.168.1.53:8060/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: ['es2015', 'chrome74'],
    rollupOptions: {
      // Strip console.log / console.debug from production bundles (warn / error stay for diagnostics).
      treeshake: {
        manualPureFunctions: ['console.log', 'console.debug'],
      },
      output: {
        // Do not pin recharts here: its shared helpers (immer, reselect, decimal) would come with it and every page
        // would then load the charts. Left alone, it loads with the dashboard.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query') || id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'vendor-state';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        }
      }
    }
  }
})
