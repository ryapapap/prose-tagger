import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      'webworker-threads': fileURLToPath(new URL('./src/empty-shim.js', import.meta.url)),
    },
  },
  build: {
    outDir: 'build',
  },
});
