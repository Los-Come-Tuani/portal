import { Phone } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, Panel, Tag, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useGuideAction } from '@/data/hooks/use-guides'
import {
  BACKGROUND_CHECK_INFO,
  CHECK_STATUS_LABELS,
  requiredChecks,
  type BackgroundCheckType,
  type GuideApplication,
  type Reviewer,
} from '@/data/models'
import { formatDateTime } from '@/lib/format'
import { CHECK_STATUS_TONES } from '../status'

interface BackgroundPanelProps {
  application: GuideApplication
  canReview: boolean
  reviewers: readonly Reviewer[]
}

type Draft = { type: BackgroundCheckType; status: 'clear' | 'flagged'; note: string; error: string }

export function BackgroundPanel({ application, canReview, reviewers }: BackgroundPanelProps) {
  const action = useGuideAction(application.id)
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const started = application.stage !== 'documents'
  const byType = new Map(application.background.map((check) => [check.type, check]))
  const reviewerName = (id: string | null) => reviewers.find((reviewer) => reviewer.id === id)?.name ?? "Equipo K'Plan"

  const save = () => {
    if (!draft) return
    if (draft.status === 'flagged' && draft.note.trim().length < 10) {
      setDraft({ ...draft, error: 'Anota qué encontraste' })
      return
    }
    action.mutate(
      { kind: 'check', checkType: draft.type, input: { status: draft.status, note: draft.note.trim() } },
      {
        onSuccess: () => {
          toast({ title: `${BACKGROUND_CHECK_INFO[draft.type].label}: ${CHECK_STATUS_LABELS[draft.status].toLowerCase()}` })
          setDraft(null)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <Panel
      title="Antecedentes"
      description={
        started
          ? 'Verifica cada punto fuera del portal y anota lo que encontraste. Una observación no bloquea: la decisión final la pesa.'
          : 'Se verifican cuando todos los documentos estén aceptados.'
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-divider">
        {requiredChecks(application).map((type) => {
          const info = BACKGROUND_CHECK_INFO[type]
          const check = byType.get(type)
          const status = started ? (check?.status ?? 'pending') : 'pending'
          const editing = draft?.type === type
          return (
            <li key={type} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className={started ? 'text-body font-semibold text-ink' : 'text-body font-semibold text-muted'}>{info.label}</p>
                  <p className="text-small text-muted">{info.description}</p>
                  {type === 'referencias' && started && application.references.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {application.references.map((reference) => (
                        <li key={reference.phone} className="flex flex-wrap items-center gap-x-2 text-small">
                          <Phone size={13} className="text-muted" aria-hidden="true" />
                          <span className="font-medium text-ink">{reference.name}</span>
                          <span className="text-muted">· {reference.relation} ·</span>
                          <a href={`tel:${reference.phone.replace(/\s/g, '')}`} className="text-ink tabular-nums underline decoration-outline underline-offset-4 hover:decoration-ink">
                            {reference.phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {check?.note && status !== 'pending' && !editing && <p className="mt-2 text-body text-ink">{check.note}</p>}
                  {check?.checkedAt && status !== 'pending' && !editing && (
                    <p className="mt-1 text-caption text-muted">
                      {reviewerName(check.checkedBy)} · {formatDateTime(check.checkedAt)}
                    </p>
                  )}
                </div>
                {started ? <Tag tone={CHECK_STATUS_TONES[status]}>{CHECK_STATUS_LABELS[status]}</Tag> : <Tag tone="outline">Todavía no</Tag>}
              </div>

              {canReview && !editing && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDraft({ type, status: 'clear', note: '', error: '' })}>
                    Sin problemas
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ type, status: 'flagged', note: check?.note ?? '', error: '' })}>
                    Anotar observación
                  </Button>
                </div>
              )}

              {editing && draft && (
                <div className="mt-3 flex flex-col gap-3 rounded-kp border border-divider bg-canvas/60 p-4">
                  <Field
                    label={draft.status === 'clear' ? 'Nota' : 'Qué encontraste'}
                    optional={draft.status === 'clear'}
                    error={draft.error || undefined}
                  >
                    {(control) => (
                      <Textarea
                        {...control}
                        rows={2}
                        autoFocus
                        value={draft.note}
                        placeholder={draft.status === 'clear' ? 'Ej.: confirmado por teléfono con la Policía de León.' : 'Ej.: la referencia no contestó en tres intentos.'}
                        onChange={(event) => setDraft({ ...draft, note: event.target.value, error: '' })}
                      />
                    )}
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={action.isPending}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={save} loading={action.isPending}>
                      {draft.status === 'clear' ? 'Marcar sin problemas' : 'Guardar observación'}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
