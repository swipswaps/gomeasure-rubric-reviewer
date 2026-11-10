import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// [6] https://vite.dev/guide/static-deploy
const BASE = '/gomeasure-rubric-reviewer/'
export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false, assetsDir: 'assets' },
})
