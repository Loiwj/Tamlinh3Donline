import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, '../assets'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true
      }
    },
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
