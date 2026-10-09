import { useState } from 'react'
import { ConfirmDialog, Field, Input, SegmentedControl, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCreateSanction } from '@/data/hooks/use-moderation'
import { SANCTION_KIND_LABELS, type SanctionKind } from '@/data/models'

interface SanctionDialogProps {
  /** A quién se sanciona; `null` cierra el diálogo. */
  user: { id: string; name: string } | null
  /** El reporte que lo motivó, si viene de la bandeja. */
  reportId?: string | null
  onClose: () => void
  onDone?: () => void
}

const KINDS = (Object.keys(SANCTION_KIND_LABELS) as SanctionKind[]).map((value) => ({ value, label: SANCTION_KIND_LABELS[value] }))

const EFFECTS: Record<SanctionKind, string> = {
  warning: 'Le llega un aviso con el motivo; la cuenta sigue activa.',
  suspension: 'La cuenta queda suspendida y se cierran sus sesiones. Con días, termina sola; sin días, hasta que la levantes.',
  expulsion: 'La cuenta queda expulsada y se cierran sus sesiones hasta que alguien levante la sanción.',
}

/** Sancionar a una persona (`POST sanction/`, `users.manage`): advertencia, suspensión o expulsión. */
export function SanctionDialog({ user, reportId = null, onClose, onDone }: SanctionDialogProps) {
  const create = useCreateSanction()
  const toast = useToast()
  const [kind, setKind] = useState<SanctionKind>('warning')
  const [days, setDays] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const close = () => {
    setKind('warning')
    setDays('')
    setReason('')
    setErrors({})
    onClose()
  }

  const submit = () => {
    if (!user) return
    const found: Record<string, string> = {}
    const count = days.trim() === '' ? null : Number(days)
    if (reason.trim().length < 5) found.reason = 'Escribe el motivo (al menos 5 letras): la persona lo lee en su aviso.'
    if (kind === 'suspension' && count !== null && (!Number.isInteger(count) || count < 1 || count > 365)) found.days = 'Entre 1 y 365 días, o vacío para que dure hasta que la levantes.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    create.mutate(
      { userId: user.id, kind, reason, days: kind === 'suspension' ? count : null, reportId },
      {
        onSuccess: () => {
          toast({ title: `${SANCTION_KIND_LABELS[kind]} para ${user.name}`, description: 'Le llegó un aviso con el motivo.' })
          close()
          onDone?.()
        },
        onError: (error) => {
          if (error instanceof ApiError) setErrors(error.fieldErrors)
          toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    )
  }

  return (
    <ConfirmDialog
      open={user !== null}
      title={`Sancionar a ${user?.name ?? ''}`}
      confirmLabel={`Aplicar ${SANCTION_KIND_LABELS[kind].toLowerCase()}`}
      tone={kind === 'warning' ? 'primary' : 'danger'}
      loading={create.isPending}
      onClose={close}
      onConfirm={submit}
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl label="Clase de sanción" value={kind} options={KINDS} onChange={setKind} size="sm" />
        <p>{EFFECTS[kind]}</p>
        {kind === 'suspension' && (
          <Field label="Días" optional error={errors.days} hint="Vacío: hasta que la levantes.">
            {(control) => <Input {...control} type="number" min={1} max={365} className="w-32" value={days} onChange={(change) => setDays(change.target.value)} />}
          </Field>
        )}
        <Field label="Motivo" error={errors.reason}>
          {(control) => <Textarea {...control} rows={3} maxLength={1000} value={reason} onChange={(change) => setReason(change.target.value)} />}
        </Field>
      </div>
    </ConfirmDialog>
  )
}
