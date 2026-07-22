import { defineConfig } from 'vitest/config'

// Config enxuta só para os testes: ambiente Node e sem os plugins do app
// (PWA/Tailwind), que não são necessários para testar lógica pura.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
