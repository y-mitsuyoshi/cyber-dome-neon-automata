import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    // tailwindcss(), // kept for reference, uncomment if needed
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setup.ts'],
  },
});
