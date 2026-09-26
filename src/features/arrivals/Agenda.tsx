import { useMemo } from 'react'
import { ErrorState, Skeleton } from '@/components/ui'
import { CITIES, type BadgeCampaign, type EventItem, type Stop } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { diffDays, monthGrid, monthKey } from '@/lib/dates'
import { AgendaSummary } from './components/AgendaSummary'
import { AgendaToolbar, type PlaceOption } from './components/AgendaToolbar'
import { DayPanel } from './components/DayPanel'
import { DayTimeline } from './components/DayTimeline'
import { MonthCalendar } from './components/MonthCalendar'
import { WeekGrid, type CampaignSpan, type EventChip } from './components/WeekGrid'
import { ALL_PLACES, CITY_PREFIX, useAgendaData, type AgendaState } from './hooks/use-agenda'
import { aggregate, hourRange } from './lib/agenda'

function placeOptions(isAdmin: boolean, role: string, places: readonly Stop[] | undefined): PlaceOption[] {
  if (!places) return []
  if (isAdmin) {
    return [
      { value: ALL_PLACES, label: "Todo K'Plan" },
      ...CITIES.filter((city) => places.some((stop) => stop.city === city.name)).map((city) => ({
        value: `${CITY_PREFIX}${city.name}`,
        label: city.name,
      })),
    ]
  }
  return [
    { value: ALL_PLACES, label: role === 'alcaldia' ? 'Todos los lugares' : 'Todos mis lugares' },
    ...places.map((stop) => ({ value: stop.id, label: stop.name })),
  ]
}

function campaignSpans(campaigns: BadgeCampaign[], dates: string[], places: readonly Stop[] | undefined): CampaignSpan[] {
  const first = dates[0]
  const last = dates[dates.length - 1]
  return campaigns
    .filter((campaign) => campaign.startDate <= last && campaign.endDate >= first)
    .map((campaign) => {
      const place = places?.find((stop) => stop.id === campaign.stopId)?.name ?? campaign.stopId
      return {
        id: campaign.id,
        label: `×${campaign.multiplier} insignias · ${place}`,
        start: Math.max(0, diffDays(first, campaign.startDate)),
        end: Math.min(dates.length - 1, diffDays(first, campaign.endDate)),
        continuesBefore: campaign.startDate < first,
        continuesAfter: campaign.endDate > last,
      }
    })
}

function eventChips(events: EventItem[]): EventChip[] {
  return events.map((event) => ({
    id: event.id,
    date: event.date,
    time: event.startTime,
    title: event.title,
  }))
}

export function Agenda({ state }: { state: AgendaState }) {
  const { isAdmin, role } = useSession()
  const data = useAgendaData(state)
  const places = data.places.data

  const scopedStops = useMemo(
    () => (data.stopIds ? (places ?? []).filter((stop) => data.stopIds?.includes(stop.id)) : (places ?? [])),
    [data.stopIds, places],
  )
  const range = useMemo(() => hourRange(data.groups, scopedStops), [data.groups, scopedStops])
  const totals = useMemo(() => aggregate(data.groups, range), [data.groups, range])
  const singlePlace = !isAdmin && (places?.length ?? 0) === 1
  const options = singlePlace ? [] : placeOptions(isAdmin, role, places)
  const showsOnePlace = singlePlace || (state.place !== ALL_PLACES && !state.place.startsWith(CITY_PREFIX))
  const placeNames = useMemo(
    () => (showsOnePlace ? null : new Map((places ?? []).map((stop) => [stop.id, stop.name]))),
    [showsOnePlace, places],
  )
  const chips = useMemo(() => eventChips(data.events), [data.events])
  const loading = data.visits.isPending || data.places.isPending
  const selectDate = (date: string) => state.set({ date, hour: null })

  const scopeLabel = isAdmin
    ? state.place.startsWith(CITY_PREFIX)
      ? `los lugares de ${state.place.slice(CITY_PREFIX.length)}`
      : "los lugares de K'Plan"
    : showsOnePlace
      ? singlePlace
        ? 'tu lugar'
        : (places?.find((stop) => stop.id === state.place)?.name ?? 'este lugar')
      : role === 'alcaldia'
        ? 'los lugares de tu ciudad'
        : 'tus lugares'

  return (
    <div className="flex flex-col gap-5">
      <AgendaToolbar state={state} placeOptions={options} />
      <AgendaSummary
        view={state.view}
        date={state.date}
        today={state.today}
        groups={data.groups}
        loading={loading}
        scopeLabel={scopeLabel}
        qrLabel={isAdmin || role === 'alcaldia' ? 'el QR' : 'tu QR'}
      />

      {data.visits.isError ? (
        <ErrorState error={data.visits.error} onRetry={() => void data.visits.refetch()} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-[34rem]" />
            ) : state.view === 'semana' ? (
              <WeekGrid
                dates={data.dates}
                range={range}
                cells={totals.cells}
                days={totals.days}
                maxCell={totals.maxCell}
                today={state.today}
                now={state.now}
                selectedDate={state.date}
                selectedHour={state.hour}
                onSelect={(date, hour) => state.set({ date, hour })}
                campaigns={campaignSpans(data.campaigns, data.dates, places)}
                events={chips}
              />
            ) : state.view === 'dia' ? (
              <DayTimeline
                date={state.date}
                groups={data.groups}
                range={range}
                today={state.today}
                now={state.now}
                circuits={data.circuits}
                selectedHour={state.hour}
                onSelectHour={(hour) => state.set({ hour: state.hour === hour ? null : hour })}
              />
            ) : (
              <MonthCalendar
                month={monthKey(state.date)}
                weeks={monthGrid(monthKey(state.date))}
                days={totals.days}
                maxDay={totals.maxDay}
                today={state.today}
                selectedDate={state.date}
                events={chips}
                campaigns={data.campaigns}
                onSelect={selectDate}
              />
            )}
          </div>

          <DayPanel
            date={state.date}
            hour={state.hour}
            groups={data.groups}
            today={state.today}
            circuits={data.circuits}
            placeNames={placeNames}
            onClearHour={() => state.set({ hour: null })}
            loading={loading}
          />
        </div>
      )}
    </div>
  )
}
