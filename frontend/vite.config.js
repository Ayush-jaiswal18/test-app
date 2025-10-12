import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // optional
  },
  css: {
    postcss: './postcss.config.js', // optional, Vite detects automatically
  },
})
