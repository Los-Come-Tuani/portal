import { describe, expect, it } from 'vitest'
import { routeErrorKind } from './route-error'

/** La forma de la respuesta de error que arma React Router. */
const routeResponse = (status: number) => ({ status, statusText: 'x', internal: true, data: '' })

describe('routeErrorKind', () => {
  it('reconoce un módulo que ya no existe tras publicar una versión nueva', () => {
    expect(routeErrorKind(new TypeError('Failed to fetch dynamically imported module: https://portal.kplan.dev/assets/PlacesPage-a1b2.js'))).toBe(
      'stale',
    )
    expect(routeErrorKind(new TypeError('Importing a module script failed.'))).toBe('stale')
    expect(routeErrorKind(new TypeError('error loading dynamically imported module: /assets/x.js'))).toBe('stale')
    expect(routeErrorKind(new Error('Unable to preload CSS for /assets/index.css'))).toBe('stale')
    expect(routeErrorKind(Object.assign(new Error('Loading chunk 3 failed.'), { name: 'ChunkLoadError' }))).toBe('stale')
  })

  it('un 404 de la ruta es una página que no existe', () => {
    expect(routeErrorKind(routeResponse(404))).toBe('not-found')
  })

  it('lo demás es un error sin explicación para la persona', () => {
    expect(routeErrorKind(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe('unknown')
    expect(routeErrorKind(routeResponse(500))).toBe('unknown')
    expect(routeErrorKind('texto')).toBe('unknown')
    expect(routeErrorKind(null)).toBe('unknown')
  })
})
