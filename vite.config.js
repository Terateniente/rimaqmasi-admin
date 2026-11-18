import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('recharts')) return 'vendor-charts';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    testTimeout: 15000,
  },
})
