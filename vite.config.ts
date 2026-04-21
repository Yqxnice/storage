import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'main.ts',
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            minify: 'terser',
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.warn', 'console.info']
              },
              format: {
                comments: false
              }
            }
          }
        }
      },
      {
        entry: 'preload.js',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            minify: 'terser',
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.warn', 'console.info']
              },
              format: {
                comments: false
              }
            }
          }
        }
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
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.info']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      external: ['winrt', '@babel/runtime', /^@babel\/runtime\/.*$/],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd';
            }
            if (id.includes('@dnd-kit')) {
              return 'dnd-kit';
            }
          }
        },
        compact: true,
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
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
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file: https:; connect-src 'self' http://localhost:* ws://localhost:* ws://127.0.0.1:*; font-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; worker-src 'self' blob:; frame-src 'none';"
    }
  },
})
