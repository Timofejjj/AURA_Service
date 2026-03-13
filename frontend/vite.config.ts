import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    // Явно разрешаем Tailscale Funnel и локальные хосты (мобильный Chrome и др.)
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ts.net',
      'aura-app.tail8dfcfc.ts.net',
      'aura-app-api.tail8dfcfc.ts.net',
    ],
    // Отключаем HMR для работы через Tailscale Funnel
    hmr: false,
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'app.html'),
      },
    },
    // Оптимизация бандла
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild', // Используем встроенный esbuild вместо terser
  },
})
