import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { LatLng, Stop } from '@/data/models'
import { maplibregl, paintLikeTheApp, roundCoordinate, STYLE_URL, token } from '@/features/places/components/map-theme'
import { hasLocation } from '../lib/form'

interface CircuitMapProps {
  stops: readonly Stop[]
  location: LatLng
  onLocationChange: (value: LatLng) => void
}

const ROUTE_SOURCE = 'recorrido'

function routeData(stops: readonly Stop[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: stops.map((stop) => [stop.coordinates.longitude, stop.coordinates.latitude]) },
  }
}

/** Encuadra las paradas y el punto de encuentro. */
function fitToRoute(map: maplibregl.Map, stops: readonly Stop[], meeting: maplibregl.Marker | null, duration: number) {
  if (stops.length === 0) return
  const bounds = new maplibregl.LngLatBounds()
  stops.forEach((stop) => bounds.extend([stop.coordinates.longitude, stop.coordinates.latitude]))
  if (meeting) bounds.extend(meeting.getLngLat())
  map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration })
}

function stopPin(number: number): HTMLElement {
  const pin = document.createElement('div')
  pin.className =
    'flex size-7 items-center justify-center rounded-full border-2 border-white bg-ink text-[12px] font-bold text-canvas tabular-nums shadow-raise'
  pin.textContent = String(number)
  return pin
}

/** Las paradas numeradas en orden y el punto de encuentro, que se arrastra o se marca con un clic. */
export default function CircuitMap({ stops, location, onLocationChange }: CircuitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const stopMarkersRef = useRef<maplibregl.Marker[]>([])
  const meetingRef = useRef<maplibregl.Marker | null>(null)
  const onChangeRef = useRef(onLocationChange)
  const initial = useRef({ stops, location })
  const stopsRef = useRef(stops)
  const locationRef = useRef(location)
  const placeMeetingRef = useRef<((value: LatLng) => void) | null>(null)
  const fittedRef = useRef('')

  useEffect(() => {
    onChangeRef.current = onLocationChange
  }, [onLocationChange])

  useEffect(() => {
    if (!containerRef.current) return
    const first = initial.current.stops[0]?.coordinates ?? initial.current.location
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [first.longitude || -85.956, first.latitude || 11.934],
      zoom: 14,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const placeMeeting = (value: LatLng) => {
      if (!meetingRef.current) {
        const pin = document.createElement('div')
        pin.className = 'z-10 size-5 cursor-grab rounded-full border-[3px] border-white bg-brand shadow-pop'
        pin.title = 'Punto de encuentro'
        const marker = new maplibregl.Marker({ element: pin, draggable: true }).setLngLat([value.longitude, value.latitude]).addTo(map)
        marker.on('dragend', () => {
          const { lng, lat } = marker.getLngLat()
          onChangeRef.current({ latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) })
        })
        meetingRef.current = marker
      } else {
        meetingRef.current.setLngLat([value.longitude, value.latitude])
      }
    }
    placeMeetingRef.current = placeMeeting
    if (hasLocation(initial.current.location)) placeMeeting(initial.current.location)

    map.on('click', (event) => {
      const value = { latitude: roundCoordinate(event.lngLat.lat), longitude: roundCoordinate(event.lngLat.lng) }
      placeMeeting(value)
      onChangeRef.current(value)
    })
    map.on('load', () => {
      paintLikeTheApp(map)
      map.resize()
      fitToRoute(map, stopsRef.current, meetingRef.current, 0)
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: routeData(stopsRef.current) })
      map.addLayer({
        id: ROUTE_SOURCE,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': token('--kp-primary-60'), 'line-width': 2.5, 'line-opacity': 0.55, 'line-dasharray': [1.5, 1.5] },
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      meetingRef.current = null
      placeMeetingRef.current = null
      stopMarkersRef.current = []
    }
  }, [])

  useEffect(() => {
    stopsRef.current = stops
    const map = mapRef.current
    if (!map) return
    stopMarkersRef.current.forEach((marker) => marker.remove())
    stopMarkersRef.current = stops.map((stop, index) =>
      new maplibregl.Marker({ element: stopPin(index + 1) }).setLngLat([stop.coordinates.longitude, stop.coordinates.latitude]).addTo(map),
    )
    const source = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined
    source?.setData(routeData(stops))

    const key = stops.map((stop) => stop.id).join(',')
    if (key === fittedRef.current) return
    fittedRef.current = key
    fitToRoute(map, stops, meetingRef.current, 500)
  }, [stops])

  useEffect(() => {
    locationRef.current = location
    if (!hasLocation(location)) return
    const current = meetingRef.current?.getLngLat()
    if (!current || roundCoordinate(current.lat) !== location.latitude || roundCoordinate(current.lng) !== location.longitude) {
      placeMeetingRef.current?.(location)
    }
  }, [location])

  /** Con el mapa enfocado: Enter pone el punto en el centro y las flechas lo mueven (Mayús: más lejos). */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const map = mapRef.current
    if (!map || event.target !== event.currentTarget) return
    const current = hasLocation(locationRef.current) ? locationRef.current : null
    if (event.key === 'Enter' && !current) {
      event.preventDefault()
      const center = map.getCenter()
      onChangeRef.current({ latitude: roundCoordinate(center.lat), longitude: roundCoordinate(center.lng) })
      return
    }
    const step = event.shiftKey ? 0.001 : 0.0002
    const moves: Record<string, [number, number]> = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] }
    const move = moves[event.key]
    if (!move || !current) return
    event.preventDefault()
    onChangeRef.current({ latitude: roundCoordinate(current.latitude + move[0]), longitude: roundCoordinate(current.longitude + move[1]) })
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="h-80 w-full overflow-hidden rounded-kp border border-outline bg-map-land focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label="Mapa del recorrido: las paradas van numeradas en orden. Marca el punto de encuentro con un clic o arrastrando el punto terracota; con el teclado, Enter lo pone en el centro y las flechas lo mueven."
      role="application"
    />
  )
}
