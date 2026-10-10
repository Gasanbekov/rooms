import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the browser talks only to Vite (same origin), and Vite forwards
// /api/* to the Node server without the /api prefix. This keeps the session cookie
// working without CORS. In production nginx will do the same forwarding.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
