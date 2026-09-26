import { useState } from 'react'
import { Button, ConfirmDialog, Field, Panel, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useGuideAction } from '@/data/hooks/use-guides'
import {
  BACKGROUND_CHECK_INFO,
  checkProgress,
  documentProgress,
  SERVICE_ROLE_LABELS,
  type GuideApplication,
} from '@/data/models'
import { plural } from '@/lib/format'

export function DecisionPanel({ application, canDecide }: { application: GuideApplication; canDecide: boolean }) {
  const action = useGuideAction(application.id)
  const toast = useToast()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<'approved' | 'rejected' | null>(null)
  const documents = documentProgress(application)
  const checks = checkProgress(application)
  const flagged = application.background.filter((check) => check.status === 'flagged')

  const ask = (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && note.trim().length < 10) {
      setError('Explica por qué se rechaza: el guía lo lee en la app')
      return
    }
    setConfirming(decision)
  }

  const decide = () => {
    if (!confirming) return
    action.mutate(
      { kind: 'decide', input: { decision: confirming, note: note.trim() } },
      {
        onSuccess: () => {
          setConfirming(null)
          toast({ title: confirming === 'approved' ? `${application.name} ya está verificado` : 'Solicitud rechazada' })
        },
        onError: (caught) => toast({ title: errorMessage(caught), tone: 'error' }),
      },
    )
  }

  return (
    <Panel title="Decisión" description="Lo que se revisó, en una mirada. Al aprobar, aparece en la app como verificado.">
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2 text-body">
          <li className="text-ink">
            <span className="font-semibold tabular-nums">
              {documents.accepted} de {documents.required}
            </span>{' '}
            documentos aceptados.
          </li>
          <li className="text-ink">
            <span className="font-semibold tabular-nums">{plural(checks.clear, 'verificación', 'verificaciones')}</span> sin problemas
            {checks.flagged > 0 && (
              <>
                {' y '}
                <span className="font-semibold text-danger tabular-nums">{checks.flagged} con observaciones</span>
              </>
            )}
            .
          </li>
        </ul>

        {flagged.length > 0 && (
          <ul className="flex flex-col gap-2">
            {flagged.map((check) => (
              <li key={check.type} className="rounded-kp border border-danger/25 bg-danger/5 px-4 py-3">
                <p className="text-small font-semibold text-danger">{BACKGROUND_CHECK_INFO[check.type].label}</p>
                <p className="mt-0.5 text-body text-ink">{check.note}</p>
              </li>
            ))}
          </ul>
        )}

        {canDecide ? (
          <>
            <Field
              label="Nota para el guía"
              optional
              hint="Obligatoria si lo rechazas. Llega a la app junto con la decisión."
              error={error || undefined}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
                    setError('')
                  }}
                />
              )}
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="quiet" onClick={() => ask('rejected')}>
                Rechazar
              </Button>
              <Button onClick={() => ask('approved')}>Aprobar como {SERVICE_ROLE_LABELS[application.serviceRole].toLowerCase()}</Button>
            </div>
          </>
        ) : (
          <p className="rounded-kp bg-paper px-4 py-3 text-body text-muted">
            La decisión la toma alguien con el permiso <span className="font-semibold text-ink">Decidir solicitudes</span>, como
            Coordinación de verificación.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        tone={confirming === 'approved' ? 'primary' : 'danger'}
        title={confirming === 'approved' ? `Aprobar a ${application.name}` : `Rechazar a ${application.name}`}
        confirmLabel={confirming === 'approved' ? 'Aprobar' : 'Rechazar'}
        loading={action.isPending}
        onClose={() => setConfirming(null)}
        onConfirm={decide}
      >
        {confirming === 'approved'
          ? 'Aparece en la app como verificado, con los idiomas y servicios que revisaste.'
          : 'Le llega tu nota en la app. Puede volver a enviar su solicitud cuando corrija lo que se le pide.'}
      </ConfirmDialog>
    </Panel>
  )
}
