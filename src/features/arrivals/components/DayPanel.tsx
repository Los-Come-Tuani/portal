import { CalendarOff, Users, X } from 'lucide-react'
import { Skeleton, Tag } from '@/components/ui'
import { DROP_REASONS, type Circuit } from '@/data/models'
import type { ISODate } from '@/lib/dates'
import { formatPeople, formatTime, formatTimeRange, formatWeekdayDate, plural } from '@/lib/format'
import { circuitLabel, presentDuring, type ArrivalGroup } from '../lib/agenda'
import { GroupStatusTag } from './GroupStatusTag'

interface DayPanelProps {
  date: ISODate
  hour: number | null
  groups: readonly ArrivalGroup[]
  today: ISODate
  circuits: readonly Circuit[] | undefined
  /** Sólo cuando se ven varios lugares a la vez. */
  placeNames: Map<string, string> | null
  onClearHour: () => void
  loading: boolean
}

export function DayPanel({ date, hour, groups, today, circuits, placeNames, onClearHour, loading }: DayPanelProps) {
  const ofDay = groups.filter((group) => group.date === date)
  const shown = hour === null ? ofDay : presentDuring(ofDay, date, hour, hour + 60)
  const people = ofDay.reduce((sum, group) => sum + group.groupSize, 0)
  const arrived = ofDay.filter((group) => group.status === 'arrived').reduce((sum, group) => sum + group.groupSize, 0)
  const presentPeople = shown.reduce((sum, group) => sum + group.groupSize, 0)

  return (
    <aside
      aria-label={`Grupos del ${formatWeekdayDate(date)}`}
      className="flex min-w-0 flex-col rounded-panel border border-divider bg-surface xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7.5rem)]"
    >
      <header className="rounded-t-panel border-b border-divider bg-canvas/45 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-title font-semibold text-ink">{formatWeekdayDate(date)}</h2>
          {date === today && <Tag tone="brand">Hoy</Tag>}
        </div>
        <p className="mt-0.5 text-small text-muted">
          {people > 0 ? (
            <>
              {formatPeople(people)} en {plural(ofDay.length, 'grupo', 'grupos')}
              {arrived > 0 && ` · ${arrived} con QR`}
            </>
          ) : (
            'Nadie planea llegar'
          )}
        </p>
        {hour !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag tone="ink">{formatTimeRange(hour, hour + 60)}</Tag>
            <span className="text-caption text-muted">{formatPeople(presentPeople)} en el lugar</span>
            <button
              type="button"
              onClick={onClearHour}
              className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-sm text-caption font-semibold text-ink hover:underline"
            >
              <X size={13} aria-hidden="true" />
              Todo el día
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <CalendarOff size={22} className="text-muted" aria-hidden="true" />
          <p className="mt-3 max-w-[30ch] text-small text-muted">
            {hour === null
              ? 'Ningún itinerario pasa por aquí este día.'
              : 'Nadie estará en el lugar a esa hora.'}
          </p>
        </div>
      ) : (
        <ol className="flex-1 divide-y divide-divider overflow-y-auto">
          {shown.map((group) => (
            <li key={group.key} className="flex items-start gap-3 px-5 py-4">
              <div className="w-[4.75rem] shrink-0 tabular-nums">
                <p className="text-small font-semibold text-ink">{formatTime(group.arrival)}</p>
                <p className="text-caption text-muted">a {formatTime(group.departure)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-small font-semibold text-ink">
                    <Users size={14} aria-hidden="true" className="text-muted" />
                    {formatPeople(group.groupSize)}
                  </p>
                  <GroupStatusTag group={group} />
                </div>
                <p className="mt-0.5 text-caption text-muted">
                  {circuitLabel(group.circuitId, circuits)}
                  {placeNames && ` · ${placeNames.get(group.stopId) ?? group.stopId}`}
                </p>
                {group.status === 'dropped' && group.dropReason && (
                  <p className="text-caption font-medium text-danger">{DROP_REASONS[group.dropReason]}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
