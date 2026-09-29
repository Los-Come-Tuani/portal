import { useEffect, useRef } from 'react'
import type { LatLng } from '@/data/models'
import { maplibregl, paintLikeTheApp, roundCoordinate as round, STYLE_URL } from './map-theme'

interface MapPickerProps {
  value: LatLng
  onChange: (value: LatLng) => void
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onChangeRef = useRef(onChange)
  const initial = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    const start: [number, number] = [initial.current.longitude, initial.current.latitude]
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: start,
      zoom: 16,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => paintLikeTheApp(map))

    const pin = document.createElement('div')
    pin.className = 'size-5 cursor-grab rounded-full border-[3px] border-white bg-brand shadow-pop'
    const marker = new maplibregl.Marker({ element: pin, draggable: true }).setLngLat(start).addTo(map)
    const report = () => {
      const { lng, lat } = marker.getLngLat()
      onChangeRef.current({ latitude: round(lat), longitude: round(lng) })
    }
    marker.on('dragend', report)
    map.on('click', (event) => {
      marker.setLngLat(event.lngLat)
      report()
    })

    mapRef.current = map
    markerRef.current = marker
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    const current = marker.getLngLat()
    if (round(current.lat) === round(value.latitude) && round(current.lng) === round(value.longitude)) return
    marker.setLngLat([value.longitude, value.latitude])
    mapRef.current?.easeTo({ center: [value.longitude, value.latitude], duration: 400 })
  }, [value.latitude, value.longitude])

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-kp border border-outline bg-map-land"
      aria-label="Mapa: haz clic o arrastra el punto para ubicar el lugar"
      role="application"
    />
  )
}
