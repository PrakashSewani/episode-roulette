import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://www.netflix.com/browse',
      },
    },
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
  },
})
