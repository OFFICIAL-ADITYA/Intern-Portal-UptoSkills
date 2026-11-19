import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Task J: Turn off public source maps in production
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  }
});
