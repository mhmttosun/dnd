import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/player.js'),
      name: 'DND',
      fileName: (format) => `player.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {
          DND: 'DND'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: false
  }
});
