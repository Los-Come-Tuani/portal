/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Un build de producción nunca debe salir en modo demo, sin API o con una API sin
 * https. `VITE_*` se compila dentro del bundle, así que un error aquí se publicaría.
 * Para una demo publicada, usa `npm run build:demo` (modo `demo`).
 */
function assertProductionEnv(vars: Record<string, string>): void {
  if (vars.VITE_USE_MOCKS === 'true') {
    throw new Error('Build de producción con VITE_USE_MOCKS=true: el modo demo no se publica por accidente. Usa `npm run build:demo`.')
  }

  const apiUrl = (vars.VITE_API_URL ?? '').trim()
  if (apiUrl === '') {
    throw new Error('Build de producción sin VITE_API_URL. Defínela en .env.production o como variable de entorno del build, p. ej. https://develop-api.kplan.dev')
  }

  let url: URL
  try {
    url = new URL(apiUrl)
  } catch {
    throw new Error(`VITE_API_URL no es una URL válida: ${apiUrl}`)
  }

  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !isLocal) {
    throw new Error(`VITE_API_URL debe usar https en producción: ${apiUrl}`)
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    assertProductionEnv(loadEnv(mode, process.cwd(), 'VITE_'))
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // maplibre-gl (~1 MB) va en su propio chunk y sólo se descarga al abrir un mapa.
      chunkSizeWarningLimit: 1100,
    },
    worker: {
      // MapLibre crea su worker con { type: 'module' }.
      format: 'es',
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
