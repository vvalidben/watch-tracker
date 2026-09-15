import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    // Renderer tests need a DOM (React Testing Library); main/shared stay on
    // the lighter plain-node environment they've always used.
    environmentMatchGlobs: [['src/renderer/**', 'jsdom']],
    setupFiles: ['src/renderer/src/vitest.setup.ts'],
    include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/renderer/**/*.test.{ts,tsx}']
  }
})
