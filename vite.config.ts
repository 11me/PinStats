import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        injector: resolve(__dirname, 'src/injector.ts'),
      },
      output: {
        // Output injector as IIFE bundle
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'injector') {
            return 'injector.js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
