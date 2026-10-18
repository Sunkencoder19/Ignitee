import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const clientDir = fileURLToPath(new URL('.', import.meta.url))
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Calls to /api go to the IGNITE server (server/, port 4000).
    proxy: { '/api': 'http://localhost:4000' },
    // Vite only serves files from client/ unless told otherwise. shared/game.js
    // lives outside it, so allow exactly these two folders (not the whole repo,
    // so nothing in server/, like server/.env, can ever be served).
    fs: { allow: [clientDir, sharedDir] },
  },
})
