import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      react(),
    ],
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@babel/runtime': '@babel/runtime-corejs3',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: true,
          pure_funcs: isProduction ? ['console.log', 'console.debug', 'console.info'] : []
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        external: ['winrt'],
        input: {
          main: resolve(__dirname, 'index.html'),
          'box-float': resolve(__dirname, 'box-float.html'),
          'box-float-menu': resolve(__dirname, 'box-float-menu.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              if (id.includes('@tauri-apps')) {
                return 'tauri';
              }
              return 'other-vendor';
            }
          },
          compact: true,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: false,
      sourcemap: false,
      assetsDir: 'assets',
    },
    base: './',
    server: {
      port: 3000,
      strictPort: true,
      open: false,
      host: '0.0.0.0',
      hmr: {
        port: 3000
      },
      headers: {
        'Content-Security-Policy': "default-src 'self' ipc.localhost; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file: https:; connect-src 'self' ipc.localhost http://localhost:* ws://localhost:* ws://127.0.0.1:*; font-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; worker-src 'self' blob:; frame-src 'none';"
      }
    },
  }
})
