import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app calls the backend by ABSOLUTE URL (chosen in the header, see
// src/config.js), so it works both in `npm run dev` and when published online.
// No dev proxy: the default backend is Production (VITE_API_BASE_URL).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
