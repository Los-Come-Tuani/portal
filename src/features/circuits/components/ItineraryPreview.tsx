import { AlertTriangle, Car, Footprints, Medal, MoveRight } from 'lucide-react'
import { useState } from 'react'
import { Panel, SegmentedControl } from '@/components/ui'
import type { CircuitKind, Stop } from '@/data/models'
import { checkStartTimes, deriveCircuit } from '@/lib/circuits'
import { cn } from '@/lib/cn'
import { formatDuration, formatTime, plural } from '@/lib/format'
import { legLabel, planItinerary, type ItineraryLeg, type TravelMode } from '@/lib/itinerary'
import { parseClock } from '@/lib/time'

interface ItineraryPreviewProps {
  stops: readonly Stop[]
  travelMode: TravelMode
  legMinutes?: Record<string, number>
  startTimes: readonly string[]
  kind: CircuitKind
  bonusBadges: number
  city: string
}

function LegIcon({ leg }: { leg: ItineraryLeg }) {
  const Icon = leg.kind === 'vehicle' ? Car : leg.kind === 'fixed' ? MoveRight : Footprints
  return <Icon size={13} aria-hidden="true" />
}

/** El itinerario que va a ver el turista, recalculado con cada cambio. */
export function ItineraryPreview({ stops, travelMode, legMinutes, startTimes, kind, bonusBadges, city }: ItineraryPreviewProps) {
  const valid = startTimes.filter((time) => parseClock(time) !== null)
  const [picked, setPicked] = useState<string | null>(null)
  const startTime = picked && valid.includes(picked) ? picked : valid[0]

  if (stops.length < 2 || !startTime) {
    return (
      <Panel title="Itinerario" description="Como lo calcula la app, a ritmo equilibrado.">
        <p className="text-body text-muted">
          {stops.length < 2 ? 'Agrega al menos dos paradas para ver a qué hora llega el grupo a cada una.' : 'Agrega una hora de salida.'}
        </p>
      </Panel>
    )
  }

  const itinerary = planItinerary({ stops, start: parseClock(startTime) ?? 0, mode: travelMode, legMinutes })
  const derived = deriveCircuit({ stops, travelMode, legMinutes, kind, bonusBadges, city })
  const checks = checkStartTimes({ stops, travelMode, legMinutes }, valid)
  const blocked = checks.filter((check) => check.blocking.length > 0)
  const bonus = kind === 'creative' ? 3 : kind === 'kplan' ? bonusBadges : 0
  const warningsAt = (stopId: string) => itinerary.warnings.filter((warning) => warning.stopId === stopId)

  return (
    <Panel title="Itinerario" description="Como lo calcula la app, a ritmo equilibrado." bodyClassName="flex flex-col gap-5 p-0">
      <div className="flex flex-col gap-3 px-5 pt-5">
        {valid.length > 1 && (
          <SegmentedControl
            label="Hora de salida"
            size="sm"
            value={startTime}
            onChange={setPicked}
            options={valid.map((time) => ({
              value: time,
              label: (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {time}
                  {blocked.some((check) => check.startTime === time) && <span className="size-1.5 rounded-full bg-danger" aria-label="con avisos" />}
                </span>
              ),
            }))}
            className="self-start"
          />
        )}
        <p className="text-small text-muted">
          Saliendo a las <span className="font-semibold text-ink tabular-nums">{startTime}</span>, termina a las{' '}
          <span className="font-semibold text-ink tabular-nums">{formatTime(itinerary.end)}</span>
        </p>
      </div>

      <ol className="px-5">
        {itinerary.stops.map((item, index) => {
          const alerts = warningsAt(item.stop.id)
          const closed = alerts.some((warning) => warning.kind === 'closed')
          return (
            <li key={item.stop.id} className="relative">
              {item.leg && (
                <div className={cn('flex items-center gap-2 py-1.5 pl-10 text-caption', alerts.some((warning) => warning.kind === 'longWalk') ? 'text-danger' : 'text-muted')}>
                  <LegIcon leg={item.leg} />
                  <span>{legLabel(item.leg)}</span>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums',
                      closed ? 'bg-danger text-canvas' : 'bg-ink text-canvas',
                    )}
                  >
                    {index + 1}
                  </span>
                  {index < itinerary.stops.length - 1 && <span className="mt-1 w-px flex-1 bg-divider" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-caption font-semibold text-muted tabular-nums">
                    {formatTime(item.arrival)} – {formatTime(item.departure)}
                  </p>
                  <p className="flex items-center gap-1.5 text-body font-semibold text-ink">
                    <span className="truncate">{item.stop.name}</span>
                    {item.stop.hasBadge && <Medal size={14} className="shrink-0 text-badge-deep" aria-label="da insignia" />}
                  </p>
                  {alerts
                    .filter((warning) => warning.kind === 'closed')
                    .map((warning) => (
                      <p key={warning.message} className="mt-0.5 text-caption text-danger">
                        {warning.message}
                      </p>
                    ))}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {itinerary.warnings.some((warning) => warning.kind === 'endsLate') && (
        <p className="mx-5 -mt-2 text-caption text-danger">{itinerary.warnings.find((warning) => warning.kind === 'endsLate')?.message}</p>
      )}

      {blocked.length > 0 && (
        <div className="mx-5 flex gap-2.5 rounded-kp border border-danger/25 bg-danger/5 px-4 py-3 text-small text-ink">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          <p>
            {blocked.length === 1 ? 'La salida de las ' : 'Las salidas de las '}
            <span className="font-semibold tabular-nums">{blocked.map((check) => check.startTime).join(', ')}</span>{' '}
            {blocked.length === 1 ? 'tiene' : 'tienen'} avisos de horario. La app no deja publicar horas así: cámbialas o guárdalo como borrador.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 border-t border-divider">
        <div className="border-r border-divider px-5 py-4">
          <dt className="text-caption text-muted">Dura</dt>
          <dd className="text-title font-semibold text-ink tabular-nums">{formatDuration(derived.totalMinutes)}</dd>
          <dd className="text-caption text-muted">{derived.durationShort} en la tarjeta</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-caption text-muted">Insignias</dt>
          <dd className="flex items-baseline gap-1.5 text-title font-semibold text-ink tabular-nums">
            {derived.badges}
            {bonus > 0 && <span className="text-body font-semibold text-brand-strong">+ {bonus} extra</span>}
          </dd>
          <dd className="text-caption text-muted">
            {plural(derived.badges, 'parada da insignia', 'paradas dan insignia')}
          </dd>
        </div>
      </dl>
      <p className="-mt-5 border-t border-divider px-5 py-4 text-caption text-muted">
        En la app: <span className="text-ink">“{derived.badgesNote}”</span>
      </p>
    </Panel>
  )
}
