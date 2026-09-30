import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { inputToClock, parseClock } from '@/lib/time'

interface StartTimesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  /** Las horas con avisos de horario, marcadas en rojo. */
  flagged: readonly string[]
  error?: string
}

export function StartTimesField({ value, onChange, flagged, error }: StartTimesFieldProps) {
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  const sorted = [...value].sort((a, b) => (parseClock(a) ?? 0) - (parseClock(b) ?? 0))

  const add = () => {
    const clock = inputToClock(draft)
    if (!clock) {
      setDraftError('Elige una hora')
      return
    }
    if (value.some((time) => parseClock(time) === parseClock(clock))) {
      setDraftError('Esa hora ya está')
      return
    }
    onChange([...value, clock])
    setDraft('')
    setDraftError(null)
  }

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-small font-medium text-ink">Horas de salida</legend>
      {sorted.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((time) => {
            const bad = flagged.includes(time)
            return (
              <li
                key={time}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-kp border pr-1 pl-3 text-small font-semibold tabular-nums',
                  bad ? 'border-danger/40 bg-danger/5 text-danger' : 'border-divider bg-surface text-ink',
                )}
              >
                {time}
                <button
                  type="button"
                  aria-label={`Quitar la salida de las ${time}`}
                  onClick={() => onChange(value.filter((item) => item !== time))}
                  className="flex size-7 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          type="time"
          step={900}
          aria-label="Hora de salida nueva"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setDraftError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          className="w-36"
        />
        <Button variant="secondary" icon={<Plus size={16} />} onClick={add}>
          Agregar
        </Button>
      </div>
      {(draftError || error) && <p className="text-caption font-medium text-danger">{draftError ?? error}</p>}
      <p className="text-caption text-muted">El turista elige una al agendar. Las que terminan de noche o llegan con un lugar cerrado no se pueden publicar.</p>
    </fieldset>
  )
}
