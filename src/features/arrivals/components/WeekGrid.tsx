import { Check, Medal, Users } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import type { ISODate } from '@/lib/dates'
import { formatHour, formatPeople, formatTimeRange, formatWeekdayDate, plural, WEEKDAYS_SHORT } from '@/lib/format'
import { cellKey, intensity, type DayTotals, type HourCell, type HourRange } from '../lib/agenda'

export interface CampaignSpan {
  id: string
  label: string
  /** Índices de columna (0 = lunes) que cubre esta semana. */
  start: number
  end: number
  continuesBefore: boolean
  continuesAfter: boolean
}

export interface EventChip {
  id: string
  date: ISODate
  time?: string
  title: string
}

interface WeekGridProps {
  dates: ISODate[]
  range: HourRange
  cells: Map<string, HourCell>
  days: Map<ISODate, DayTotals>
  maxCell: number
  today: ISODate
  now: number
  selectedDate: ISODate
  selectedHour: number | null
  onSelect: (date: ISODate, hour: number | null) => void
  campaigns: CampaignSpan[]
  events: EventChip[]
}

const TINTS = ['', 'bg-planned/8', 'bg-planned/18', 'bg-planned/32', 'bg-planned/52', 'bg-planned'] as const

const PHASES = [
  { label: 'Mañana', from: 0, to: 12 * 60 },
  { label: 'Mediodía', from: 12 * 60, to: 14 * 60 },
  { label: 'Tarde', from: 14 * 60, to: 18 * 60 },
  { label: 'Noche', from: 18 * 60, to: 24 * 60 },
]

function phaseOf(hour: number) {
  return PHASES.find((phase) => hour >= phase.from && hour < phase.to) ?? PHASES[0]
}

/** Llegadas confirmadas con QR. Cero no es verde: nadie llegó. */
export function ConfirmedChip({ count, className }: { count: number; className?: string }) {
  if (count === 0) {
    return (
      <span
        className={cn(
          'flex h-4 items-center rounded-sm border border-ink/25 bg-surface px-1 text-caption leading-none font-semibold text-muted tabular-nums',
          className ?? 'absolute right-1 bottom-1 z-[7]',
        )}
      >
        0
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex h-4 items-center gap-px rounded-sm bg-confirmed px-1 text-caption leading-none font-semibold text-white tabular-nums',
        className ?? 'absolute right-1 bottom-1 z-[7]',
      )}
    >
      <Check size={10} strokeWidth={3} aria-hidden="true" />
      {count}
    </span>
  )
}

export function WeekGrid({
  dates,
  range,
  cells,
  days,
  maxCell,
  today,
  now,
  selectedDate,
  selectedHour,
  onSelect,
  campaigns,
  events,
}: WeekGridProps) {
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const movedByKeyboard = useRef(false)
  const hours: number[] = []
  for (let hour = range.start; hour < range.end; hour += 60) hours.push(hour)

  useEffect(() => {
    if (!movedByKeyboard.current) return
    movedByKeyboard.current = false
    tableRef.current?.querySelector<HTMLElement>(`[data-cell="${selectedDate}|${selectedHour}"]`)?.focus()
  }, [selectedDate, selectedHour])

  // En pantallas angostas la semana no cabe: al abrir una semana se muestra el día elegido (hoy, de entrada).
  const weekKey = dates[0]
  useEffect(() => {
    const scroller = scrollerRef.current
    const column = tableRef.current?.querySelector<HTMLElement>('[data-selected-day="true"]')
    if (!scroller || !column || scroller.scrollWidth <= scroller.clientWidth) return
    const gutter = tableRef.current?.querySelector<HTMLElement>('[data-gutter]')?.offsetWidth ?? 0
    scroller.scrollLeft = Math.max(0, column.offsetLeft - gutter)
  }, [weekKey])

  const focusDate = dates.includes(selectedDate) ? selectedDate : dates[0]
  const focusHour =
    selectedHour ?? hours.find((hour) => (cells.get(cellKey(focusDate, hour))?.planned ?? 0) > 0) ?? range.start

  const onCellKeyDown = (event: KeyboardEvent, dayIndex: number, hour: number) => {
    let nextDay = dayIndex
    let nextHour = hour
    switch (event.key) {
      case 'ArrowLeft':
        nextDay = Math.max(0, dayIndex - 1)
        break
      case 'ArrowRight':
        nextDay = Math.min(dates.length - 1, dayIndex + 1)
        break
      case 'ArrowUp':
        nextHour = Math.max(range.start, hour - 60)
        break
      case 'ArrowDown':
        nextHour = Math.min(range.end - 60, hour + 60)
        break
      case 'Home':
        nextHour = range.start
        break
      case 'End':
        nextHour = range.end - 60
        break
      case 'Escape':
        onSelect(dates[dayIndex], null)
        return
      default:
        return
    }
    event.preventDefault()
    movedByKeyboard.current = true
    onSelect(dates[nextDay], nextHour)
  }

  const gutter = 'sticky z-10 bg-surface'

  return (
    <div ref={scrollerRef} className="overflow-x-auto rounded-kp border border-divider bg-surface">
      <table
        ref={tableRef}
        role="grid"
        aria-label="Personas que llegan por día y por hora"
        className="w-full min-w-[46rem] table-fixed border-separate border-spacing-0"
      >
        <colgroup>
          <col className="w-8" />
          <col className="w-[4.25rem]" />
          {dates.map((date) => (
            <col key={date} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <td data-gutter colSpan={2} className={cn(gutter, 'left-0 border-b border-divider')} />
            {dates.map((date, index) => {
              const isToday = date === today
              const isSelectedDay = date === selectedDate
              const totals = days.get(date)
              return (
                <th
                  key={date}
                  scope="col"
                  data-selected-day={isSelectedDay}
                  className={cn(
                    'border-b border-l border-divider px-2 pt-2.5 pb-2 text-left align-bottom font-normal',
                    isToday && 'shadow-[inset_0_3px_0_var(--color-brand)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(date, null)}
                    aria-pressed={isSelectedDay && selectedHour === null}
                    aria-label={`${formatWeekdayDate(date)}: ${totals ? formatPeople(totals.planned) : 'nadie planea llegar'}`}
                    className="group flex w-full flex-col items-start gap-1 rounded-sm text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-lead font-semibold tabular-nums transition-colors duration-150',
                          isSelectedDay ? 'bg-ink text-canvas' : 'text-ink group-hover:bg-paper',
                        )}
                      >
                        {Number(date.slice(8))}
                      </span>
                      <span
                        className={cn(
                          'text-caption font-semibold tracking-label uppercase',
                          isToday ? 'text-brand-strong' : 'text-muted',
                        )}
                      >
                        {isToday ? 'Hoy' : WEEKDAYS_SHORT[index]}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 pl-1 text-caption text-muted tabular-nums">
                      <Users size={12} aria-hidden="true" />
                      {totals ? totals.planned : 0}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>

          {campaigns.map((campaign, index) => (
            <tr key={campaign.id}>
              <th
                colSpan={2}
                scope="row"
                className={cn(gutter, 'left-0 px-2 py-1 text-left text-caption font-semibold text-muted')}
              >
                {index === 0 ? 'Insignias' : ''}
              </th>
              {campaign.start > 0 && <td colSpan={campaign.start} className="border-l border-divider" />}
              <td colSpan={campaign.end - campaign.start + 1} className="border-l border-divider px-1 py-1">
                <div
                  className={cn(
                    'flex h-7 items-center gap-1.5 bg-badge px-2 text-caption font-semibold text-ink',
                    campaign.continuesBefore ? 'rounded-l-none' : 'rounded-l-sm',
                    campaign.continuesAfter ? 'rounded-r-none' : 'rounded-r-sm',
                  )}
                >
                  <Medal size={13} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{campaign.label}</span>
                </div>
              </td>
              {campaign.end < dates.length - 1 && (
                <td colSpan={dates.length - 1 - campaign.end} className="border-l border-divider" />
              )}
            </tr>
          ))}

          {events.length > 0 && (
            <tr>
              <th
                colSpan={2}
                scope="row"
                className={cn(gutter, 'left-0 px-2 py-1 text-left align-top text-caption font-semibold text-muted')}
              >
                Eventos
              </th>
              {dates.map((date) => (
                <td key={date} className="border-l border-divider px-1 py-1 align-top">
                  <div className="flex flex-col gap-1">
                    {events
                      .filter((event) => event.date === date)
                      .map((event) => (
                        <p
                          key={event.id}
                          title={event.time ? `${event.title}, ${event.time}` : event.title}
                          className="rounded-sm border border-ink/15 bg-canvas px-1.5 py-1 text-caption leading-tight text-ink"
                        >
                          <span className="line-clamp-2 font-semibold break-words">{event.title}</span>
                          {event.time && <span className="block truncate text-muted">{event.time}</span>}
                        </p>
                      ))}
                  </div>
                </td>
              ))}
            </tr>
          )}
        </thead>

        <tbody>
          {hours.map((hour, rowIndex) => {
            const phase = phaseOf(hour)
            const startsPhase = rowIndex === 0 || phaseOf(hours[rowIndex - 1]) !== phase
            const phaseRows = hours.filter((item) => phaseOf(item) === phase).length
            return (
              <tr key={hour}>
                {startsPhase && (
                  <th
                    scope="rowgroup"
                    rowSpan={phaseRows}
                    title={phase.label}
                    className={cn(gutter, 'left-0 border-t border-ink/15 p-0 align-middle')}
                  >
                    {phaseRows > 1 ? (
                      <span className="mx-auto block rotate-180 text-caption font-semibold tracking-label text-muted uppercase [writing-mode:vertical-rl]">
                        {phase.label}
                      </span>
                    ) : (
                      <span className="sr-only">{phase.label}</span>
                    )}
                  </th>
                )}
                <th
                  scope="row"
                  className={cn(
                    gutter,
                    'left-8 border-t pr-2 text-right align-top text-caption font-medium whitespace-nowrap text-muted tabular-nums',
                    startsPhase ? 'border-ink/15' : 'border-divider',
                  )}
                >
                  <span className="relative -top-2 bg-surface pl-1">{formatHour(hour)}</span>
                  {startsPhase && phaseRows === 1 && (
                    <span aria-hidden="true" className="-mt-1 block text-[10px] font-semibold tracking-label text-muted uppercase">
                      {phase.label}
                    </span>
                  )}
                </th>
                {dates.map((date, dayIndex) => {
                  const cell = cells.get(cellKey(date, hour))
                  const planned = cell?.planned ?? 0
                  const level = intensity(planned, maxCell)
                  const isPast = date < today || (date === today && hour + 60 <= now)
                  const selected = date === selectedDate && hour === selectedHour
                  const focusable = date === focusDate && hour === focusHour
                  const showNow = date === today && now >= hour && now < hour + 60
                  const label =
                    `${formatWeekdayDate(date)}, ${formatTimeRange(hour, hour + 60)}: ` +
                    (planned > 0
                      ? `llegan ${formatPeople(planned)} en ${plural(cell?.groups ?? 0, 'grupo', 'grupos')}` +
                        (isPast ? `, ${cell?.arrived ?? 0} con QR` : '')
                      : 'nadie planea llegar')

                  return (
                    <td
                      key={date}
                      role="gridcell"
                      data-cell={`${date}|${hour}`}
                      aria-selected={selected}
                      aria-label={label}
                      tabIndex={focusable ? 0 : -1}
                      onClick={() => onSelect(date, hour)}
                      onKeyDown={(event) => onCellKeyDown(event, dayIndex, hour)}
                      className={cn(
                        'relative h-11 cursor-pointer border-t border-l p-0 text-center align-middle transition-shadow duration-150',
                        startsPhase ? 'border-t-ink/15 border-l-divider' : 'border-divider',
                        TINTS[level],
                        selected
                          ? 'z-[5] shadow-[inset_0_0_0_2px_var(--color-ink)]'
                          : 'hover:shadow-[inset_0_0_0_1px_var(--color-ink)]',
                        'focus-visible:shadow-[inset_0_0_0_2px_var(--color-ink)] focus-visible:outline-none',
                      )}
                    >
                      {planned > 0 && (
                        <span
                          className={cn(
                            'relative z-[7] text-small font-semibold tabular-nums',
                            level === 5 ? 'text-white' : 'text-ink',
                            // La línea de "ahora" pasa por detrás del número, no lo tacha.
                            showNow && 'rounded-sm px-1.5 py-px',
                            showNow && (level === 5 ? 'bg-planned' : 'bg-surface shadow-raise'),
                          )}
                        >
                          {planned}
                        </span>
                      )}
                      {isPast && planned > 0 && <ConfirmedChip count={cell?.arrived ?? 0} />}
                      {showNow && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-[6] h-0.5 bg-brand"
                          style={{ top: `${((now - hour) / 60) * 100}%` }}
                        >
                          <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-brand" />
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
