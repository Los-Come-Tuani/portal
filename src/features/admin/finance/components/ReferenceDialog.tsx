import { useState, type ReactNode } from 'react'
import { ConfirmDialog, Field, Input, Textarea } from '@/components/ui'

interface ReferenceDialogProps {
  open: boolean
  title: string
  confirmLabel: string
  children: ReactNode
  loading: boolean
  /** `reference`: el número de la operación, opcional. `note`: un motivo obligatorio. */
  field: 'reference' | 'note'
  tone?: 'primary' | 'danger'
  onConfirm: (value: string) => void
  onClose: () => void
}

/** Confirmar un movimiento de dinero: con el número de la transferencia o con el motivo de no pagarlo. */
export function ReferenceDialog({ open, title, confirmLabel, children, loading, field, tone = 'primary', onConfirm, onClose }: ReferenceDialogProps) {
  const [value, setValue] = useState('')
  const close = () => {
    setValue('')
    onClose()
  }
  return (
    <ConfirmDialog
      open={open}
      title={title}
      confirmLabel={confirmLabel}
      tone={tone}
      loading={loading}
      confirmDisabled={field === 'note' && value.trim().length === 0}
      onClose={close}
      onConfirm={() => onConfirm(value)}
    >
      <div className="flex flex-col gap-4">
        {children}
        {field === 'reference' ? (
          <Field label="Número de la operación" optional hint="El de la transferencia o el depósito, para encontrarlo después.">
            {(control) => <Input {...control} maxLength={120} autoComplete="off" value={value} onChange={(change) => setValue(change.target.value)} />}
          </Field>
        ) : (
          <Field label="Motivo" hint="Lo lee la persona en su aviso.">
            {(control) => <Textarea {...control} rows={3} maxLength={500} value={value} onChange={(change) => setValue(change.target.value)} />}
          </Field>
        )}
      </div>
    </ConfirmDialog>
  )
}
