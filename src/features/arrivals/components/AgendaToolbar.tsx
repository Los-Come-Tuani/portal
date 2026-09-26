import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, IconButton, SegmentedControl, Select } from '@/components/ui'
import { addDays, addMonths, monthKey, startOfWeek } from '@/lib/dates'
import { formatDateSpan, formatMonth, formatWeekdayDate } from '@/lib/format'
import type { AgendaChanges, AgendaState, Timebase } from '../hooks/use-agenda'

const TIMEBASE_OPTIONS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
] as const satisfies readonly { value: Timebase; label: string }[]

const STEP_LABELS: Record<Timebase, [string, string]> = {
  dia: ['Día anterior', 'Día siguiente'],
  semana: ['Semana anterior', 'Semana siguiente'],
  mes: ['Mes anterior', 'Mes siguiente'],
}

export interface PlaceOption {
  value: string
  label: string
}

interface AgendaToolbarProps {
  state: AgendaState
  placeOptions: PlaceOption[]
}

function agendaTitle(view: Timebase, date: string): string {
  if (view === 'dia') return formatWeekdayDate(date)
  if (view === 'semana') {
    const monday = startOfWeek(date)
    return formatDateSpan(monday, addDays(monday, 6))
  }
  const month = formatMonth(monthKey(date))
  return month.charAt(0).toUpperCase() + month.slice(1)
}

function shifted(view: Timebase, date: string, direction: 1 | -1): AgendaChanges {
  if (view === 'dia') return { date: addDays(date, direction), hour: null }
  if (view === 'semana') return { date: addDays(date, 7 * direction), hour: null }
  return { date: `${addMonths(monthKey(date), direction)}-01`, hour: null }
}

export function AgendaToolbar({ state, placeOptions }: AgendaToolbarProps) {
  const [previousLabel, nextLabel] = STEP_LABELS[state.view]
  const isCurrent =
    state.view === 'dia'
      ? state.date === state.today
      : state.view === 'semana'
        ? startOfWeek(state.date) === startOfWeek(state.today)
        : monthKey(state.date) === monthKey(state.today)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-headline font-bold tracking-tight text-ink">
          <span className="sr-only">Agenda: </span>
          {agendaTitle(state.view, state.date)}
        </h1>
        <div className="flex items-center">
          <IconButton
            label={previousLabel}
            icon={<ChevronLeft size={18} />}
            onClick={() => state.set(shifted(state.view, state.date, -1))}
          />
          <IconButton
            label={nextLabel}
            icon={<ChevronRight size={18} />}
            onClick={() => state.set(shifted(state.view, state.date, 1))}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={isCurrent}
            onClick={() => state.set({ date: state.today, hour: null })}
          >
            Hoy
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {placeOptions.length > 1 && (
          <Select
            aria-label="Lugar"
            value={state.place}
            onChange={(event) => state.set({ place: event.target.value, hour: null })}
            className="w-56"
          >
            {placeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
        <SegmentedControl
          label="Vista"
          value={state.view}
          options={TIMEBASE_OPTIONS}
          onChange={(view) => state.set({ view, hour: null })}
        />
      </div>
    </div>
  )
}
