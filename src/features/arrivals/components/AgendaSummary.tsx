import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui'
import { addDays, monthKey, startOfWeek, weekdayIndex, type ISODate } from '@/lib/dates'
import {
  formatHour,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPeople,
  formatRelativeDay,
  plural,
  WEEKDAYS,
} from '@/lib/format'
import type { Timebase } from '../hooks/use-agenda'
import type { ArrivalGroup } from '../lib/agenda'

interface AgendaSummaryProps {
  view: Timebase
  date: ISODate
  today: ISODate
  groups: readonly ArrivalGroup[]
  loading: boolean
  /** "tu lugar", "tus lugares", "los lugares de K'Plan"… */
  scopeLabel: string
  /** "tu QR" o "el QR". */
  qrLabel: string
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>
}

function scopeText(view: Timebase, date: ISODate, today: ISODate): string {
  if (view === 'dia') return formatRelativeDay(date, today)
  if (view === 'semana') {
    const current = startOfWeek(date) === startOfWeek(today)
    if (current) return 'Esta semana'
    return startOfWeek(date) === addDays(startOfWeek(today), 7) ? 'La próxima semana' : 'Esa semana'
  }
  return monthKey(date) === monthKey(today) ? 'Este mes' : `En ${formatMonth(monthKey(date))}`
}

/** Una oración en vez de tarjetas de métricas: lo que importa de la vista, dicho claro. */
export function AgendaSummary({ view, date, today, groups, loading, scopeLabel, qrLabel }: AgendaSummaryProps) {
  if (loading) return <Skeleton className="h-6 w-full max-w-2xl" />

  const inView = view === 'mes' ? groups.filter((group) => group.date.slice(0, 7) === monthKey(date)) : groups
  const scope = scopeText(view, date, today)
  const people = inView.reduce((sum, group) => sum + group.groupSize, 0)

  if (people === 0) {
    return (
      <p className="max-w-[76ch] text-lead text-muted">
        {scope}, ningún itinerario pasa por {scopeLabel}. Una ficha completa y una campaña de insignias ayudan a que los
        turistas lo agreguen a su día.
      </p>
    )
  }

  const due = inView.filter((group) => group.status !== 'upcoming' && group.status !== 'arriving')
  const duePeople = due.reduce((sum, group) => sum + group.groupSize, 0)
  const arrived = due.filter((group) => group.status === 'arrived').reduce((sum, group) => sum + group.groupSize, 0)
  const allPast = due.length === inView.length

  const byDay = new Map<ISODate, number>()
  const byHour = new Map<number, number>()
  for (const group of inView) {
    byDay.set(group.date, (byDay.get(group.date) ?? 0) + group.groupSize)
    const hour = Math.floor(group.arrival / 60) * 60
    byHour.set(hour, (byHour.get(hour) ?? 0) + group.groupSize)
  }
  const [busiestDay] = [...byDay.entries()].sort((a, b) => b[1] - a[1])
  const [busiestHour] = [...byHour.entries()].sort((a, b) => b[1] - a[1])

  return (
    <p className="max-w-[84ch] text-lead text-muted">
      {scope} {allPast ? 'hubo' : 'hay'} <Strong>{formatPeople(people)}</Strong> en{' '}
      {plural(inView.length, 'grupo', 'grupos')} con visita planeada a {scopeLabel}.
      {duePeople > 0 && (
        <>
          {' '}
          De las que ya debían llegar, <Strong>{`${formatNumber(arrived)} de ${formatNumber(duePeople)}`}</Strong>{' '}
          escanearon {qrLabel} (
          {formatPercent(arrived / duePeople)}).
        </>
      )}{' '}
      {view !== 'dia' && busiestDay && (
        <>
          El día más lleno: <Strong>{`${WEEKDAYS[weekdayIndex(busiestDay[0])].toLowerCase()} ${Number(busiestDay[0].slice(8))}`}</Strong>.{' '}
        </>
      )}
      {busiestHour && (
        <>
          La hora con más llegadas: <Strong>{formatHour(busiestHour[0])}</Strong>
          {formatHour(busiestHour[0]).endsWith('.') ? '' : '.'}
        </>
      )}
    </p>
  )
}
