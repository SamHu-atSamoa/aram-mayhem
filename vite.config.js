import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // relative base so the built bundle works from any sub-path or object store
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
