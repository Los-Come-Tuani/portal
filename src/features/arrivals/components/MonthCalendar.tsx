import { cn } from '@/lib/cn'
import type { ISODate } from '@/lib/dates'
import { formatPeople, formatWeekdayDate, WEEKDAYS_SHORT } from '@/lib/format'
import type { BadgeCampaign } from '@/data/models'
import { intensity, type DayTotals } from '../lib/agenda'
import { ConfirmedChip, type EventChip } from './WeekGrid'

interface MonthCalendarProps {
  month: string
  weeks: ISODate[][]
  days: Map<ISODate, DayTotals>
  maxDay: number
  today: ISODate
  selectedDate: ISODate
  events: EventChip[]
  campaigns: BadgeCampaign[]
  onSelect: (date: ISODate) => void
}

const TINTS = ['bg-surface', 'bg-planned/8', 'bg-planned/16', 'bg-planned/28', 'bg-planned/45', 'bg-planned/70'] as const

export function MonthCalendar({ month, weeks, days, maxDay, today, selectedDate, events, campaigns, onSelect }: MonthCalendarProps) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-panel border border-divider bg-surface">
      <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0" aria-label="Personas por día del mes">
        <thead>
          <tr>
            {WEEKDAYS_SHORT.map((day) => (
              <th
                key={day}
                scope="col"
                className="border-b border-divider px-3 py-2.5 text-left text-caption font-semibold tracking-label text-muted uppercase"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((date, index) => {
                const totals = days.get(date)
                const inMonth = date.startsWith(month)
                const isPast = date < today
                const level = intensity(totals?.planned ?? 0, maxDay)
                const dayEvents = events.filter((event) => event.date === date)
                const hasCampaign = campaigns.some((campaign) => date >= campaign.startDate && date <= campaign.endDate)
                return (
                  <td
                    key={date}
                    className={cn('border-divider p-0', index > 0 && 'border-l', 'border-b', inMonth ? TINTS[level] : 'bg-canvas/60')}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(date)}
                      aria-pressed={date === selectedDate}
                      aria-label={`${formatWeekdayDate(date)}: ${totals ? formatPeople(totals.planned) : 'sin grupos'}`}
                      className={cn(
                        'relative flex h-24 w-full flex-col p-2 text-left transition-shadow duration-150 hover:shadow-[inset_0_0_0_1px_var(--color-ink)]',
                        date === selectedDate && 'shadow-[inset_0_0_0_2px_var(--color-ink)]',
                        !inMonth && 'opacity-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-full text-small font-semibold tabular-nums',
                          date === today ? 'bg-action text-on-action' : 'text-ink',
                        )}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {totals && totals.planned > 0 && (
                        <span className="mt-auto flex items-baseline gap-2 tabular-nums">
                          <span className={cn('text-title font-semibold', level === 5 ? 'text-white' : 'text-ink')}>
                            {totals.planned}
                          </span>
                          {isPast && <ConfirmedChip count={totals.arrived} className="relative" />}
                        </span>
                      )}
                      {dayEvents.length > 0 && (
                        <span
                          className="absolute top-2.5 right-2 size-2 rounded-full bg-ink"
                          title={dayEvents.map((event) => event.title).join(', ')}
                        />
                      )}
                      {hasCampaign && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-badge" />}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
