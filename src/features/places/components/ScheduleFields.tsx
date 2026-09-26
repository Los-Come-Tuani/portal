import { Checkbox, Field, Input, Select } from '@/components/ui'
import { clockToInput, inputToClock, parseDuration, toDurationText } from '@/lib/time'

interface HoursFieldProps {
  opensAt: string | undefined
  closesAt: string | undefined
  onChange: (hours: { opensAt: string | undefined; closesAt: string | undefined }) => void
  errors: { opensAt?: string; closesAt?: string }
}

/** Un solo horario diario, como lo entiende la app; o "no cierra". */
export function HoursField({ opensAt, closesAt, onChange, errors }: HoursFieldProps) {
  const alwaysOpen = !opensAt && !closesAt

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-small font-medium text-ink">Horario</legend>
      <Checkbox
        label="Este lugar no cierra"
        description="Un parque, una calle o un mirador. La app lo muestra como abierto todo el día."
        checked={alwaysOpen}
        onChange={(event) =>
          onChange(event.target.checked ? { opensAt: undefined, closesAt: undefined } : { opensAt: '8:00 a.m.', closesAt: '5:00 p.m.' })
        }
      />
      {!alwaysOpen && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abre" error={errors.opensAt}>
            {(control) => (
              <Input
                {...control}
                type="time"
                step={300}
                value={clockToInput(opensAt)}
                onChange={(event) => onChange({ opensAt: inputToClock(event.target.value), closesAt })}
              />
            )}
          </Field>
          <Field label="Cierra" error={errors.closesAt}>
            {(control) => (
              <Input
                {...control}
                type="time"
                step={300}
                value={clockToInput(closesAt)}
                onChange={(event) => onChange({ opensAt, closesAt: inputToClock(event.target.value) })}
              />
            )}
          </Field>
        </div>
      )}
      <p className="text-caption text-muted">
        Es el mismo todos los días. Si un turista llegaría con el lugar cerrado, la app se lo avisa antes de salir.
      </p>
    </fieldset>
  )
}

const HOURS = Array.from({ length: 9 }, (_, index) => index)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)

interface DurationFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Tiempo sugerido de visita, escrito como lo lee la app: `1 h 30 min`. */
export function DurationField({ value, onChange, error }: DurationFieldProps) {
  const total = parseDuration(value)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const update = (nextHours: number, nextMinutes: number) => {
    const next = nextHours * 60 + nextMinutes
    onChange(next > 0 ? toDurationText(next) : '')
  }

  return (
    <Field label="Tiempo sugerido de visita" error={error} hint="El itinerario de la app reserva este tiempo en tu lugar.">
      {(control) => (
        <div className="grid grid-cols-2 gap-3">
          <Select {...control} aria-label="Horas" value={hours} onChange={(event) => update(Number(event.target.value), minutes)}>
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour} h
              </option>
            ))}
          </Select>
          <Select aria-label="Minutos" value={minutes} onChange={(event) => update(hours, Number(event.target.value))}>
            {MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {minute} min
              </option>
            ))}
          </Select>
        </div>
      )}
    </Field>
  )
}
