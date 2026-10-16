import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    // Loại trừ pglite và worker của nó khỏi quá trình tối ưu hóa bộ nhớ đệm
    exclude: ['@electric-sql/pglite', '@electric-sql/pglite/worker'], //
  },
  plugins: [
    react(),
  ],
  // base: '/forge-page/',
  base: '/',
})
