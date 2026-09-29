import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre busca su worker junto a su propio archivo, y eso se rompe al empaquetar.
maplibregl.setWorkerUrl(workerUrl)

export { maplibregl }

/** OpenFreeMap, el mismo proveedor que usa la app: gratis y sin llave. */
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** MapLibre no entiende `color-mix` ni `oklch`: se leen los tokens base, que son hex. */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

/** Tiñe el mapa con los colores de papel de la app (map_style.dart). */
export function paintLikeTheApp(map: maplibregl.Map) {
  const land = token('--color-map-land')
  const water = token('--color-map-water')
  const park = token('--color-map-park')
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', land)
    else if (layer.type === 'fill' && /water/.test(layer.id)) map.setPaintProperty(layer.id, 'fill-color', water)
    else if (layer.type === 'fill' && /park|wood|grass|landcover/.test(layer.id)) map.setPaintProperty(layer.id, 'fill-color', park)
  }
}
