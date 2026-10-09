import { Copy } from 'lucide-react'
import { Button, Checkbox, Input } from '@/components/ui'
import { HOURS_DAYS, type DayHours } from '@/data/models'
import type { FieldErrors } from '@/data/schemas/application.schema'

interface HoursFieldsProps {
  hours: DayHours[]
  onChange: (hours: DayHours[]) => void
  errors: FieldErrors
}

/** El horario de la semana: cada día abre y cierra a una hora, o está cerrado. */
export function HoursFields({ hours, onChange, errors }: HoursFieldsProps) {
  const setDay = (index: number, patch: Partial<DayHours>) =>
    onChange(hours.map((row, position) => (position === index ? { ...row, ...patch } : row)))

  // Lo más común es abrir a la misma hora casi toda la semana: se escribe el lunes y se copia.
  const copyFirstDay = () => {
    const first = hours[0]
    if (!first) return
    onChange(hours.map((row) => ({ ...row, closed: first.closed, opens: first.opens, closes: first.closes })))
  }

  const general = errors.hours

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={general ? 'hours-error' : undefined}>
      <legend className="sr-only">Horario de la semana</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-small font-medium text-ink" aria-hidden="true">
          Horario de la semana
        </span>
        <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={copyFirstDay}>
          Copiar el del lunes a todos
        </Button>
      </div>
      <p className="-mt-1 text-caption text-muted">Si cierras después de la medianoche, escribe la hora de cierre del día siguiente: 01:00 es la una de la madrugada.</p>
      <ul className="flex flex-col divide-y divide-divider rounded-kp border border-divider bg-surface">
        {hours.map((row, index) => {
          const day = HOURS_DAYS.find((item) => item.weekday === row.weekday)?.label ?? ''
          const opensError = errors[`hours.${index}.opens`]
          const closesError = errors[`hours.${index}.closes`]
          return (
            <li key={row.weekday} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
              <span className="w-24 shrink-0 text-body font-medium text-ink">{day}</span>
              <Checkbox
                label="Cerrado"
                className="min-h-11 py-0"
                checked={row.closed}
                onChange={(event) => setDay(index, event.target.checked ? { closed: true, opens: '', closes: '' } : { closed: false })}
              />
              {!row.closed && (
                // Las dos horas van juntas: si no caben en la fila, bajan las dos.
                <div className="flex flex-nowrap items-center gap-2">
                  <Input
                    type="time"
                    step={300}
                    aria-label={`${day}: abre`}
                    aria-invalid={opensError ? true : undefined}
                    className="w-36"
                    value={row.opens}
                    onChange={(event) => setDay(index, { opens: event.target.value })}
                  />
                  <span className="text-muted" aria-hidden="true">
                    a
                  </span>
                  <Input
                    type="time"
                    step={300}
                    aria-label={`${day}: cierra`}
                    aria-invalid={closesError ? true : undefined}
                    className="w-36"
                    value={row.closes}
                    onChange={(event) => setDay(index, { closes: event.target.value })}
                  />
                </div>
              )}
              {(opensError || closesError) && <p className="basis-full text-caption font-medium text-danger">{opensError ?? closesError}</p>}
            </li>
          )
        })}
      </ul>
      {general && (
        <p id="hours-error" className="text-caption font-medium text-danger">
          {general}
        </p>
      )}
    </fieldset>
  )
}
