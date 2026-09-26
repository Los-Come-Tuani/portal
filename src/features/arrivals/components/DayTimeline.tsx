import { cn } from '@/lib/cn'
import type { ISODate } from '@/lib/dates'
import { formatHour, formatPeople, formatTimeRange } from '@/lib/format'
import type { Circuit } from '@/data/models'
import { circuitLabel, presentDuring, type ArrivalGroup, type GroupStatus, type HourRange } from '../lib/agenda'

interface DayTimelineProps {
  date: ISODate
  groups: readonly ArrivalGroup[]
  range: HourRange
  today: ISODate
  now: number
  circuits: readonly Circuit[] | undefined
  selectedHour: number | null
  onSelectHour: (hour: number) => void
}

const BAR_TONES: Record<GroupStatus, string> = {
  upcoming: 'border-planned/40 bg-planned/15 text-planned',
  arriving: 'border-brand bg-brand/15 text-brand-strong',
  arrived: 'border-confirmed/40 bg-confirmed/15 text-confirmed',
  dropped: 'border-danger/30 bg-danger/8 text-danger line-through decoration-danger/50',
  unconfirmed: 'border-outline bg-paper text-muted',
}

const SLOT = 30

/** El día como una hoja de turnos: cada grupo es una barra desde que llega hasta que se va. */
export function DayTimeline({ date, groups, range, today, now, circuits, selectedHour, onSelectHour }: DayTimelineProps) {
  const ofDay = groups.filter((group) => group.date === date)
  const span = range.end - range.start
  const position = (minutes: number) => `${((Math.min(Math.max(minutes, range.start), range.end) - range.start) / span) * 100}%`

  const lanes: ArrivalGroup[][] = []
  for (const group of ofDay) {
    const lane = lanes.find((items) => items[items.length - 1].departure <= group.arrival)
    if (lane) lane.push(group)
    else lanes.push([group])
  }

  const slots: { start: number; people: number; arrived: number }[] = []
  for (let start = range.start; start < range.end; start += SLOT) {
    const present = presentDuring(ofDay, date, start, start + SLOT)
    slots.push({
      start,
      people: present.reduce((sum, group) => sum + group.groupSize, 0),
      arrived: present.filter((group) => group.status === 'arrived').reduce((sum, group) => sum + group.groupSize, 0),
    })
  }
  const peak = Math.max(1, ...slots.map((slot) => slot.people))
  const hours: number[] = []
  for (let hour = range.start; hour <= range.end; hour += 60) hours.push(hour)
  const showNow = date === today && now >= range.start && now <= range.end

  return (
    <div className="overflow-x-auto rounded-kp border border-divider bg-surface">
      <div className="relative min-w-[44rem] px-5 pt-4 pb-5">
        <div className="relative h-5">
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute -translate-x-1/2 text-caption text-muted tabular-nums"
              style={{ left: position(hour) }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>

        <div className="relative mt-2">
          {hours.map((hour) => (
            <span
              key={hour}
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-divider"
              style={{ left: position(hour) }}
            />
          ))}

          <div className="relative flex h-20 items-end gap-px" aria-label="Personas en el lugar cada media hora">
            {slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                title={`${formatTimeRange(slot.start, slot.start + SLOT)}: ${formatPeople(slot.people)}`}
                onClick={() => onSelectHour(Math.floor(slot.start / 60) * 60)}
                className={cn(
                  'relative flex h-full flex-1 flex-col justify-end rounded-t-sm transition-colors',
                  selectedHour !== null && slot.start >= selectedHour && slot.start < selectedHour + 60
                    ? 'bg-ink/6'
                    : 'hover:bg-ink/4',
                )}
              >
                <span className="sr-only">
                  {formatTimeRange(slot.start, slot.start + SLOT)}: {formatPeople(slot.people)}
                </span>
                <span
                  aria-hidden="true"
                  className="relative w-full overflow-hidden rounded-t-sm bg-planned/35"
                  style={{ height: `${(slot.people / peak) * 100}%` }}
                >
                  <span
                    className="absolute inset-x-0 bottom-0 bg-confirmed"
                    style={{ height: slot.people ? `${(slot.arrived / slot.people) * 100}%` : 0 }}
                  />
                </span>
              </button>
            ))}
          </div>

          <ol className="relative mt-4 flex flex-col gap-1.5" aria-label="Grupos del día">
            {lanes.length === 0 && (
              <li className="py-8 text-center text-small text-muted">Ningún itinerario pasa por aquí este día.</li>
            )}
            {lanes.map((lane, laneIndex) => (
              <li key={laneIndex} className="relative h-8">
                {lane.map((group) => {
                  const label = `${formatPeople(group.groupSize)} · ${circuitLabel(group.circuitId, circuits)}`
                  return (
                    <button
                      key={group.key}
                      type="button"
                      title={`${formatTimeRange(group.arrival, group.departure)}: ${label}`}
                      onClick={() => onSelectHour(Math.floor(group.arrival / 60) * 60)}
                      className={cn(
                        'absolute inset-y-0 flex items-center overflow-hidden rounded-sm border px-2 text-caption font-semibold whitespace-nowrap transition-shadow hover:shadow-[inset_0_0_0_1px_currentColor]',
                        BAR_TONES[group.status],
                      )}
                      style={{
                        left: position(group.arrival),
                        width: `calc(${((group.departure - group.arrival) / span) * 100}% - 2px)`,
                      }}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  )
                })}
              </li>
            ))}
          </ol>

          {showNow && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 bottom-0 w-0.5 bg-brand"
              style={{ left: position(now) }}
            >
              <span className="absolute -top-1 -left-[3px] size-2 rounded-full bg-brand" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
