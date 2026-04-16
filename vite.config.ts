import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import electron from 'vite-plugin-electron'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'main.ts',
        onstart(args) {
          args.startup();
        },
      },
      {
        entry: 'preload.js',
        onstart(args) {
          args.reload();
        },
      },
    ]),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['electron', 'electron-store']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    host: '0.0.0.0',
    hmr: {
      port: 5173
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; connect-src 'self' http://localhost:* ws://localhost:* ws://127.0.0.1:*; font-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; worker-src 'self' blob:; frame-src 'none';"
    }
  },
})
