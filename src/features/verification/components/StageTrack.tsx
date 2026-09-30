import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatWaiting, lowerFirst } from '@/lib/format'

export type StepState = 'done' | 'current' | 'waiting' | 'upcoming' | 'rejected'

export interface StageStep {
  key: string
  label: string
  detail: string
  state: StepState
}

interface StageTrackProps {
  steps: StageStep[]
  waitingMinutes: number
  /** "Esperando al guía", "Esperando al negocio". */
  waitingLabel: string
  /** Por qué todavía no puede pasar de etapa, si quien mira puede pasarla. */
  blocker: string | null
  /** Pedir corrección y pasar de etapa, junto a lo que las habilita. */
  actions?: ReactNode
}

/** Las etapas de una verificación: dónde está, cuánto lleva ahí y qué falta para avanzar. */
export function StageTrack({ steps, waitingMinutes, waitingLabel, blocker, actions }: StageTrackProps) {
  return (
    <section aria-label="Etapas de la verificación" className="rounded-panel border border-divider bg-surface">
      <ol className={cn('grid gap-5 p-5 sm:p-6 sm:gap-0', steps.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <li key={step.key} className="relative flex gap-3 sm:flex-col sm:gap-2.5 sm:pr-6" aria-current={step.state === 'current' ? 'step' : undefined}>
              <div className="flex items-center sm:gap-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-small font-semibold tabular-nums',
                    step.state === 'done' && 'bg-confirmed text-white',
                    (step.state === 'current' || step.state === 'waiting') && 'bg-ink text-canvas',
                    step.state === 'upcoming' && 'border border-outline text-muted',
                    step.state === 'rejected' && 'bg-danger text-white',
                  )}
                >
                  {step.state === 'done' ? (
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : step.state === 'rejected' ? (
                    <X size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cn('hidden h-0.5 flex-1 rounded-full sm:block', step.state === 'done' ? 'bg-confirmed' : 'bg-divider')}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className={cn('text-body font-semibold', step.state === 'upcoming' ? 'text-muted' : 'text-ink')}>{step.label}</p>
                <p className="text-small text-muted tabular-nums">{step.detail}</p>
                {(step.state === 'current' || step.state === 'waiting') && (
                  <p className="mt-0.5 text-caption text-muted">
                    {step.state === 'waiting' ? `${waitingLabel} desde hace ` : 'Lleva '}
                    <span className="font-semibold text-ink tabular-nums">{formatWaiting(waitingMinutes)}</span>
                    {step.state === 'current' && ' en esta etapa'}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {actions && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-canvas/40 px-5 py-4">
          <p className="text-small text-muted">
            {blocker ? (
              <>
                <span className="font-semibold text-ink">Para avanzar:</span> {lowerFirst(blocker)}.
              </>
            ) : (
              'Todo listo para pasar a la siguiente etapa.'
            )}
          </p>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </section>
  )
}