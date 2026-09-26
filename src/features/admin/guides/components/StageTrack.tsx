import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  checkProgress,
  documentProgress,
  STAGE_LABELS,
  VERIFICATION_STAGES,
  type GuideApplication,
  type VerificationStage,
} from '@/data/models'
import { cn } from '@/lib/cn'
import { formatWaiting, lowerFirst } from '@/lib/format'

type StepState = 'done' | 'current' | 'waiting' | 'upcoming' | 'rejected'

function stepDetail(application: GuideApplication, stage: VerificationStage, state: StepState): string {
  if (stage === 'documents') {
    const progress = documentProgress(application)
    if (state === 'upcoming') return 'Sin empezar'
    const missing = progress.missing.length > 0 ? ` · faltan ${progress.missing.length}` : ''
    return `${progress.accepted} de ${progress.required} aceptados${missing}`
  }
  if (stage === 'background') {
    if (state === 'upcoming') return 'Después de los documentos'
    const progress = checkProgress(application)
    const flagged = progress.flagged > 0 ? ` · ${progress.flagged} con observaciones` : ''
    return `${progress.clear + progress.flagged} de ${progress.required} verificadas${flagged}`
  }
  if (application.status === 'approved') return 'Aprobado'
  if (application.status === 'rejected') return 'Rechazado'
  return state === 'current' ? 'Falta aprobar o rechazar' : 'Al final'
}

interface StageTrackProps {
  application: GuideApplication
  waitingMinutes: number
  /** Por qué todavía no puede pasar de etapa, si quien mira puede pasarla. */
  blocker: string | null
  /** Pedir corrección y pasar de etapa, junto a lo que las habilita. */
  actions?: ReactNode
}

/** Las tres etapas de la verificación: dónde está la solicitud, cuánto lleva ahí y qué falta para avanzar. */
export function StageTrack({ application, waitingMinutes, blocker, actions }: StageTrackProps) {
  const current = VERIFICATION_STAGES.indexOf(application.stage)

  return (
    <section aria-label="Etapas de la verificación" className="rounded-kp border border-divider bg-surface">
      <ol className="grid gap-4 p-5 sm:grid-cols-3 sm:gap-0">
        {VERIFICATION_STAGES.map((stage, index) => {
          const state: StepState =
            application.status === 'approved' || index < current
              ? 'done'
              : index > current
                ? 'upcoming'
                : application.status === 'rejected'
                  ? 'rejected'
                  : application.status === 'changes_requested'
                    ? 'waiting'
                    : 'current'
          const last = index === VERIFICATION_STAGES.length - 1
          return (
            <li key={stage} className="relative flex gap-3 sm:flex-col sm:gap-2.5 sm:pr-6" aria-current={state === 'current' ? 'step' : undefined}>
              <div className="flex items-center sm:gap-3">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-small font-semibold tabular-nums',
                    state === 'done' && 'bg-confirmed text-white',
                    (state === 'current' || state === 'waiting') && 'bg-ink text-canvas',
                    state === 'upcoming' && 'border border-outline text-muted',
                    state === 'rejected' && 'bg-danger text-white',
                  )}
                >
                  {state === 'done' ? (
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : state === 'rejected' ? (
                    <X size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cn('hidden h-0.5 flex-1 rounded-full sm:block', state === 'done' ? 'bg-confirmed' : 'bg-divider')}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className={cn('text-body font-semibold', state === 'upcoming' ? 'text-muted' : 'text-ink')}>{STAGE_LABELS[stage]}</p>
                <p className="text-small text-muted tabular-nums">{stepDetail(application, stage, state)}</p>
                {(state === 'current' || state === 'waiting') && (
                  <p className="mt-0.5 text-caption text-muted">
                    {state === 'waiting' ? 'Esperando al guía hace ' : 'Lleva '}
                    <span className="font-semibold text-ink tabular-nums">{formatWaiting(waitingMinutes)}</span>
                    {state === 'current' && ' en esta etapa'}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {actions && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-5 py-3">
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
