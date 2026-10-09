import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useBadgeCampaigns } from '@/data/hooks/use-badges'
import { useEvents } from '@/data/hooks/use-events'
import { usePlaces } from '@/data/hooks/use-places'
import { useCircuits, useVisitEvents } from '@/data/hooks/use-visits'
import type { Stop } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useNow } from '@/hooks/use-now'
import { isISODate, monthGrid, monthKey, weekDates, type ISODate } from '@/lib/dates'
import { buildGroups } from '../lib/agenda'

export type Timebase = 'dia' | 'semana' | 'mes'
const TIMEBASES: readonly Timebase[] = ['dia', 'semana', 'mes']

/** Todos los lugares visibles; también `ciudad:León` para el admin. */
export const ALL_PLACES = 'todos'
export const CITY_PREFIX = 'ciudad:'

export interface AgendaChanges {
  view?: Timebase
  date?: ISODate
  hour?: number | null
  place?: string
}

/** El estado de la agenda vive en la URL: se puede compartir y el botón atrás funciona. */
export function useAgendaState() {
  const [params, setParams] = useSearchParams()
  const { today, minutes } = useNow()

  const rawView = params.get('vista') as Timebase | null
  const view: Timebase = rawView && TIMEBASES.includes(rawView) ? rawView : 'semana'
  const rawDate = params.get('fecha') ?? ''
  const date = isISODate(rawDate) ? rawDate : today
  const rawHour = params.get('hora')
  const hour = rawHour !== null && Number.isFinite(Number(rawHour)) ? Number(rawHour) : null
  const place = params.get('lugar') ?? ALL_PLACES

  const set = useCallback(
    (changes: AgendaChanges) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          const apply = (key: string, value: string | null) => (value === null ? next.delete(key) : next.set(key, value))
          if (changes.view !== undefined) apply('vista', changes.view === 'semana' ? null : changes.view)
          if (changes.date !== undefined) apply('fecha', changes.date === today ? null : changes.date)
          if (changes.hour !== undefined) apply('hora', changes.hour === null ? null : String(changes.hour))
          if (changes.place !== undefined) apply('lugar', changes.place === ALL_PLACES ? null : changes.place)
          return next
        },
        { replace: true },
      )
    },
    [setParams, today],
  )

  return { view, date, hour, place, today, now: minutes, set }
}

export type AgendaState = ReturnType<typeof useAgendaState>

export function viewDates(view: Timebase, date: ISODate): ISODate[] {
  if (view === 'dia') return [date]
  if (view === 'semana') return weekDates(date)
  return monthGrid(monthKey(date)).flat()
}

/** Ids de los lugares del filtro; `undefined` = todos los que el usuario puede ver. */
function scopeStopIds(place: string, places: readonly Stop[] | undefined): string[] | undefined {
  if (place === ALL_PLACES || !places) return undefined
  if (place.startsWith(CITY_PREFIX)) {
    const city = place.slice(CITY_PREFIX.length)
    return places.filter((stop) => stop.city === city).map((stop) => stop.id)
  }
  return [place]
}

export function useAgendaData(state: AgendaState) {
  const { isAdmin, organizationId, user, can } = useSession()
  const places = usePlaces()
  const dates = useMemo(() => viewDates(state.view, state.date), [state.view, state.date])
  const from = dates[0]
  const to = dates[dates.length - 1]
  const stopIds = useMemo(() => scopeStopIds(state.place, places.data), [state.place, places.data])

  const visits = useVisitEvents({ stopIds, from, to }, places.isSuccess)
  const circuits = useCircuits()
  // La agenda cultural la ven el equipo con `content.moderate` y quien programa eventos (institución o alcaldía).
  const seesEvents = isAdmin ? can('content.moderate') : user.organizationRef?.kind === 'institution' || user.organizationRef?.kind === 'municipality'
  const events = useEvents({ fromDate: from, toDate: to }, seesEvents)
  const campaigns = useBadgeCampaigns(organizationId)

  const groups = useMemo(
    () => buildGroups(visits.data ?? [], state.today, state.now),
    [visits.data, state.today, state.now],
  )

  const scopedEvents = useMemo(() => {
    const list = (events.data ?? []).filter((event) => !event.hidden && event.status !== 'cancelled')
    if (!stopIds) return list
    const cities = new Set(places.data?.filter((stop) => stopIds.includes(stop.id)).map((stop) => stop.city))
    return list.filter((event) => (event.pointId ? stopIds.includes(event.pointId) : cities.has(event.city)))
  }, [events.data, stopIds, places.data])

  const scopedCampaigns = useMemo(
    () =>
      (campaigns.data ?? []).filter(
        (campaign) => campaign.status !== 'cancelled' && (!stopIds || stopIds.includes(campaign.stopId)),
      ),
    [campaigns.data, stopIds],
  )

  return {
    places,
    visits,
    circuits: circuits.data,
    groups,
    dates,
    from,
    to,
    stopIds,
    events: scopedEvents,
    campaigns: scopedCampaigns,
  }
}

export type AgendaData = ReturnType<typeof useAgendaData>
