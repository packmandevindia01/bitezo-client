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
            src: 'favicon-48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'favicon-32.png',
            sizes: '32x32',
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
      "/uploads": {
        target: "http://84.255.173.131:8068/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
