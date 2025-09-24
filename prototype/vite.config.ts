import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@server': resolve(__dirname, '../server'),
      '@contracts': resolve(__dirname, '../contracts'),
      '@agent': resolve(__dirname, '../agent-starter')
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['blocklock-js', 'ethers']
  },
  server: {
    port: 3001, // Different port to avoid conflicts
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})