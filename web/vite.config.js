import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The calculation module is shared with the API (../shared/calc) and imported as "@calc/…".
const calcDir = fileURLToPath(new URL('../shared/calc', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@calc': calcDir } },
  server: {
    port: 5173,
    fs: { allow: ['..'] }, // lets the dev server serve ../shared
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
})
