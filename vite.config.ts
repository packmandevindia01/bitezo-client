import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
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
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
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
        target: "http://84.255.173.131:8068/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})