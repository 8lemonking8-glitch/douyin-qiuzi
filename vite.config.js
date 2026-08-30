import path from 'node:path';
import { defineConfig } from 'vite';

// Builds the quiz UI and the vendored Dycast TypeScript core into one Tauri frontend.
export default defineConfig({
  root: 'web',
  publicDir: false,
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'vendor/dycast-desktop/src') } },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome110',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        admin: path.resolve(import.meta.dirname, 'web/admin.html'),
        overlay: path.resolve(import.meta.dirname, 'web/overlay.html')
      }
    }
  }
});
