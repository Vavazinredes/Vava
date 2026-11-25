import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'autoUpdate',
    workbox: { cleanupOutdatedCaches: true },
    manifest: {
      name: 'Proyecto Porteño', short_name: 'Porteño', lang: 'pt-BR',
      start_url: '/', display: 'standalone', theme_color: '#0a2a48', background_color: '#edf5fa',
      icons: [192, 512].map(size => ({ src: '/icon-' + size + '.png', sizes: size + 'x' + size, type: 'image/png' })),
    },
  })],
})
