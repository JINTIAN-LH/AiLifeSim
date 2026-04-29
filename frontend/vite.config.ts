import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Use relative paths so the app works from any deployment path (root, subdirectory, etc.)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Inline small assets for easier static deployment
    assetsInlineLimit: 4096,
  },
  // Allow the server to be accessed from network (for mobile testing)
  server: {
    host: true,
  },
});
