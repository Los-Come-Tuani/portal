import { ArrowDown, ArrowUp, Medal, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { IconButton, Input } from '@/components/ui'
import type { Stop } from '@/data/models'
import { cn } from '@/lib/cn'

type Legs = Record<string, number> | undefined

interface StopsEditorProps {
  city: string
  /** Todas las paradas publicadas, para reconocer las que no son de la ciudad. */
  stops: readonly Stop[]
  value: string[]
  legMinutes: Legs
  onChange: (stopIds: string[], legMinutes: Legs) => void
  error?: string
}

/**
 * Un traslado fijo va hacia una parada desde la anterior: si la anterior
 * cambia (o la parada queda primera), ese traslado ya no aplica.
 */
function reconcileLegs(previous: string[], next: string[], legs: Legs): { legs: Legs; dropped: string[] } {
  if (!legs) return { legs: undefined, dropped: [] }
  const kept: Record<string, number> = {}
  const dropped: string[] = []
  for (const [stopId, minutes] of Object.entries(legs)) {
    const index = next.indexOf(stopId)
    if (index < 0) continue
    if (index > 0 && previous[previous.indexOf(stopId) - 1] === next[index - 1]) kept[stopId] = minutes
    else dropped.push(stopId)
  }
  return { legs: Object.keys(kept).length > 0 ? kept : undefined, dropped }
}

function hours(stop: Stop): string {
  return stop.opensAt && stop.closesAt ? `${stop.opensAt} – ${stop.closesAt}` : 'No cierra'
}

function Thumb({ stop }: { stop: Stop }) {
  return stop.images[0] ? (
    <img src={stop.images[0]} alt="" loading="lazy" className="size-10 shrink-0 rounded-sm bg-placeholder object-cover" />
  ) : (
    <span className="size-10 shrink-0 rounded-sm bg-paper" aria-hidden="true" />
  )
}

const moverId = (stopId: string, direction: -1 | 1) => `mover-${stopId}-${direction === -1 ? 'arriba' : 'abajo'}`

/** Las paradas en el orden del recorrido, y las demás de la ciudad para agregar. */
export function StopsEditor({ city, stops, value, legMinutes, onChange, error }: StopsEditorProps) {
  const [search, setSearch] = useState('')
  const [cleared, setCleared] = useState<string[]>([])
  const byId = new Map(stops.map((stop) => [stop.id, stop]))
  const available = stops
    .filter((stop) => stop.city === city && !value.includes(stop.id))
    .filter((stop) => !search || `${stop.name} ${stop.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const reorder = (next: string[]) => {
    const { legs, dropped } = reconcileLegs(value, next, legMinutes)
    setCleared((current) => [...current.filter((id) => next.includes(id)), ...dropped])
    onChange(next, legs)
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(index + direction, 0, item)
    reorder(next)
    const edge = direction === -1 ? index + direction === 0 : index + direction === next.length - 1
    requestAnimationFrame(() => document.getElementById(moverId(item, edge ? (-direction as -1 | 1) : direction))?.focus())
  }

  const setLeg = (stopId: string, minutes: number | null) => {
    const next = { ...legMinutes }
    if (minutes === null) delete next[stopId]
    else next[stopId] = minutes
    setCleared((current) => current.filter((id) => id !== stopId))
    onChange(value, Object.keys(next).length > 0 ? next : undefined)
  }

  return (
    <div className="flex flex-col gap-5">
      {value.length === 0 ? (
        <p className={cn('rounded-kp border border-dashed px-4 py-6 text-center text-body', error ? 'border-danger/60 text-danger' : 'border-outline text-muted')}>
          Elige las paradas de abajo en el orden en que se recorren.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-divider rounded-kp border border-divider" aria-label="Paradas del circuito, en orden">
          {value.map((stopId, index) => {
            const stop = byId.get(stopId)
            const foreign = stop && stop.city !== city
            const leg = legMinutes?.[stopId]
            const previous = index > 0 ? byId.get(value[index - 1]) : undefined
            return (
              <li key={stopId} className="flex min-w-0 flex-wrap items-start gap-3 py-3 pr-2 pl-3 sm:flex-nowrap">
                <span className="mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-caption font-bold text-canvas tabular-nums">
                  {index + 1}
                </span>
                {stop && <Thumb stop={stop} />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-body font-semibold text-ink">
                    <span className="truncate">{stop?.name ?? stopId}</span>
                    {stop?.hasBadge && <Medal size={14} className="shrink-0 text-badge-deep" aria-label="da insignia" />}
                  </p>
                  <p className={cn('truncate text-caption', foreign || !stop ? 'text-danger' : 'text-muted')}>
                    {!stop
                      ? 'Ya no está en la app: quítala'
                      : foreign
                        ? `Es de ${stop.city}: quítala o cambia la ciudad`
                        : `${stop.category} · ${stop.duration} · ${hours(stop)}`}
                  </p>
                  {index > 0 && stop && !foreign && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-caption">
                      {leg === undefined ? (
                        <>
                          {cleared.includes(stopId) && <span className="text-danger">Se quitó su traslado fijo: cambió la parada anterior.</span>}
                          <button type="button" onClick={() => setLeg(stopId, 0)} className="font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
                            Fijar el traslado
                          </button>
                        </>
                      ) : (
                        <>
                          <label htmlFor={`traslado-${stopId}`} className="text-muted">
                            Traslado fijo desde {previous?.name ?? 'la anterior'}
                          </label>
                          <span className="w-20">
                            <Input
                              id={`traslado-${stopId}`}
                              type="number"
                              min={0}
                              max={600}
                              inputMode="numeric"
                              value={String(leg)}
                              onChange={(event) => setLeg(stopId, Math.max(0, Math.round(Number(event.target.value) || 0)))}
                              className="h-12! tabular-nums"
                            />
                          </span>
                          <span className="text-muted">min</span>
                          <button type="button" onClick={() => setLeg(stopId, null)} className="font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
                            Calcularlo
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex shrink-0">
                  <IconButton
                    id={moverId(stopId, -1)}
                    size="sm"
                    label={`Subir ${stop?.name ?? ''}`}
                    icon={<ArrowUp size={15} />}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    id={moverId(stopId, 1)}
                    size="sm"
                    label={`Bajar ${stop?.name ?? ''}`}
                    icon={<ArrowDown size={15} />}
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <IconButton
                    size="sm"
                    tone="danger"
                    label={`Quitar ${stop?.name ?? 'parada'}`}
                    icon={<X size={15} />}
                    onClick={() => reorder(value.filter((id) => id !== stopId))}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {error && <p className="-mt-3 text-caption font-medium text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-small font-medium text-ink">Paradas de {city}</p>
          <Input
            type="search"
            aria-label={`Buscar paradas de ${city}`}
            placeholder="Buscar"
            leading={<Search size={16} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-52"
          />
        </div>
        {available.length === 0 ? (
          <p className="text-small text-muted">{search ? 'Ninguna parada con ese nombre.' : `Ya están todas las paradas de ${city}.`}</p>
        ) : (
          <ul className="flex max-h-72 flex-col divide-y divide-divider overflow-y-auto rounded-kp border border-divider">
            {available.map((stop) => (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => onChange([...value, stop.id], legMinutes)}
                  className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-canvas"
                >
                  <Thumb stop={stop} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-body font-medium text-ink">
                      <span className="truncate">{stop.name}</span>
                      {stop.hasBadge && <Medal size={14} className="shrink-0 text-badge-deep" aria-label="da insignia" />}
                    </span>
                    <span className="block truncate text-caption text-muted">
                      {stop.category} · {stop.duration} · {hours(stop)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-small font-semibold text-muted group-hover:text-ink">
                    <Plus size={15} aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Agregar</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
