import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          // Charts are used by reporting pages, not the login/IT workspace.
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-charts': ['recharts'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['axios', 'date-fns', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
