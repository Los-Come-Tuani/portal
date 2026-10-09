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

/**
 * En `npm run dev` el portal le habla al API a través de este prefijo (`VITE_API_URL=/_api`) y
 * Vite reenvía a `API_PROXY_TARGET`. Para el navegador todo es `localhost`: el API no tiene que
 * aceptar ese origen en CORS y las cookies de sesión son del mismo sitio.
 */
const DEV_API_PREFIX = '/_api'

/**
 * El API publicado manda sus cookies como `Secure; SameSite=None; Partitioned`, pensadas para un
 * portal https en otro sitio. Detrás del proxy son cookies propias de `http://localhost`.
 */
function toLocalCookie(cookie: string): string {
  return cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => !/^(secure|partitioned|domain=.*)$/i.test(part))
    .map((part) => (/^samesite=none$/i.test(part) ? 'SameSite=Lax' : part))
    .join('; ')
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    assertProductionEnv(loadEnv(mode, process.cwd(), 'VITE_'))
  }

  const proxyTarget = command === 'serve' ? (loadEnv(mode, process.cwd(), '').API_PROXY_TARGET ?? '').trim() : ''

  return {
    plugins: [react(), tailwindcss()],
    server: proxyTarget
      ? {
          proxy: {
            [`${DEV_API_PREFIX}/`]: {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.slice(DEV_API_PREFIX.length),
              configure: (proxy) => {
                // Con `Origin`, Django exige que esté entre sus orígenes de confianza, y ni
                // `localhost` ni el propio host del API lo están en develop. Sin él, el CSRF se
                // valida con el token y la cookie, como con cualquier cliente que no es navegador.
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.removeHeader('origin')
                })
                proxy.on('proxyRes', (proxyRes) => {
                  const cookies = proxyRes.headers['set-cookie']
                  if (cookies) proxyRes.headers['set-cookie'] = cookies.map(toLocalCookie)
                })
              },
            },
          },
        }
      : undefined,
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
