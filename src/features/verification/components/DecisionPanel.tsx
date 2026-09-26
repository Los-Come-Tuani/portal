import { useState, type ReactNode } from 'react'
import { Button, ConfirmDialog, Field, Panel, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import type { DecisionInput } from '@/data/models'

interface DecisionPanelProps {
  /** A quién se aprueba o rechaza: "Kenneth Robleto", "Café La Calzada". */
  subject: string
  description: string
  /** Lo que se revisó, en una mirada. */
  summary: ReactNode
  canDecide: boolean
  /** Qué ve quien no puede decidir. */
  noPermission: ReactNode
  approveLabel: string
  /** Qué pasa al confirmar cada decisión. */
  approveEffect: string
  rejectEffect: string
  noteHint: string
  approvedToast: string
  onDecide: (input: DecisionInput) => Promise<unknown>
  deciding: boolean
}

export function DecisionPanel({
  subject,
  description,
  summary,
  canDecide,
  noPermission,
  approveLabel,
  approveEffect,
  rejectEffect,
  noteHint,
  approvedToast,
  onDecide,
  deciding,
}: DecisionPanelProps) {
  const toast = useToast()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<DecisionInput['decision'] | null>(null)

  const ask = (decision: DecisionInput['decision']) => {
    if (decision === 'rejected' && note.trim().length < 10) {
      setError('Explica por qué se rechaza')
      return
    }
    setConfirming(decision)
  }

  const decide = async () => {
    if (!confirming) return
    try {
      await onDecide({ decision: confirming, note: note.trim() })
      toast({ title: confirming === 'approved' ? approvedToast : 'Solicitud rechazada' })
      setConfirming(null)
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    }
  }

  return (
    <Panel title="Decisión" description={description}>
      <div className="flex flex-col gap-5">
        {summary}
        {canDecide ? (
          <>
            <Field label="Nota" optional hint={noteHint} error={error || undefined}>
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
              <Button onClick={() => ask('approved')}>{approveLabel}</Button>
            </div>
          </>
        ) : (
          <p className="rounded-kp bg-paper px-4 py-3 text-body text-muted">{noPermission}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        tone={confirming === 'approved' ? 'primary' : 'danger'}
        title={confirming === 'approved' ? `Aprobar a ${subject}` : `Rechazar a ${subject}`}
        confirmLabel={confirming === 'approved' ? 'Aprobar' : 'Rechazar'}
        loading={deciding}
        onClose={() => setConfirming(null)}
        onConfirm={() => void decide()}
      >
        {confirming === 'approved' ? approveEffect : rejectEffect}
      </ConfirmDialog>
    </Panel>
  )
}
