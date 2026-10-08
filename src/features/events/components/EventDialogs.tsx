import { useState } from 'react'
import { ConfirmDialog, Field, Input, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCancelEvent, useCloneEvent, useHideEvent } from '@/data/hooks/use-events'
import type { CulturalEvent } from '@/data/models'
import { cloneDatesSchema } from '@/data/schemas/event.schema'
import { useNow } from '@/hooks/use-now'
import { addDays, diffDays } from '@/lib/dates'

interface EventDialogProps {
  event: CulturalEvent | null
  onClose: () => void
}

/** Cancelarlo lo deja en la app, señalado, con el motivo que se escriba. */
export function CancelEventDialog({ event, onClose }: EventDialogProps) {
  const cancel = useCancelEvent()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const close = () => {
    setReason('')
    onClose()
  }
  return (
    <ConfirmDialog
      open={event !== null}
      title={`¿Cancelar ${event?.name ?? 'el evento'}?`}
      confirmLabel="Cancelar evento"
      loading={cancel.isPending}
      onClose={close}
      onConfirm={() =>
        event &&
        cancel.mutate(
          { id: event.id, reason },
          {
            onSuccess: () => {
              toast({ title: 'Evento cancelado', description: 'Sigue en la agenda de la app, señalado como cancelado.' })
              close()
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          },
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p>Sigue en la agenda de la app, señalado como cancelado, para que nadie llegue al lugar. Ya no se puede corregir.</p>
        <Field label="Motivo" optional hint="Lo ve el turista: «Se pospone por lluvia», «El artista no pudo venir».">
          {(control) => <Textarea {...control} rows={3} maxLength={500} value={reason} onChange={(change) => setReason(change.target.value)} />}
        </Field>
      </div>
    </ConfirmDialog>
  )
}

/** Clonar copia todo lo demás con fechas nuevas: para lo que se repite cada semana o cada año. */
export function CloneEventDialog({ event, onClose }: EventDialogProps) {
  const clone = useCloneEvent()
  const toast = useToast()
  const { today } = useNow()
  const [dates, setDates] = useState<{ startDate: string; endDate: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const length = event ? Math.max(0, diffDays(event.startDate, event.endDate)) : 0
  const suggested = event ? (event.startDate >= today ? addDays(event.startDate, 7) : addDays(today, 7)) : today
  const value = dates ?? { startDate: suggested, endDate: addDays(suggested, length) }

  const close = () => {
    setDates(null)
    setErrors({})
    onClose()
  }

  const submit = () => {
    if (!event) return
    const parsed = cloneDatesSchema(today).safeParse(value)
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    clone.mutate(
      { id: event.id, ...parsed.data },
      {
        onSuccess: (copy) => {
          toast({ title: `Programaste otra vez ${copy.name}` })
          close()
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
      open={event !== null}
      title={`Programar otra vez ${event?.name ?? ''}`}
      confirmLabel="Programar copia"
      tone="primary"
      loading={clone.isPending}
      onClose={close}
      onConfirm={submit}
    >
      <div className="flex flex-col gap-4">
        <p>Se copia todo (lugar, horario, precio, fotos) con las fechas nuevas. Después puedes corregir la copia.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empieza el" error={errors.startDate}>
            {(control) => (
              <Input
                {...control}
                type="date"
                min={today}
                value={value.startDate}
                onChange={(change) => setDates({ startDate: change.target.value, endDate: change.target.value ? addDays(change.target.value, length) : value.endDate })}
              />
            )}
          </Field>
          <Field label="Termina el" error={errors.endDate}>
            {(control) => (
              <Input {...control} type="date" min={value.startDate || today} value={value.endDate} onChange={(change) => setDates({ ...value, endDate: change.target.value })} />
            )}
          </Field>
        </div>
      </div>
    </ConfirmDialog>
  )
}

/** El equipo lo saca de la app con un motivo; quien lo programó lo sigue viendo aquí. */
export function HideEventDialog({ event, onClose }: EventDialogProps) {
  const hide = useHideEvent()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const close = () => {
    setReason('')
    onClose()
  }
  return (
    <ConfirmDialog
      open={event !== null}
      title={`¿Ocultar ${event?.name ?? 'el evento'}?`}
      confirmLabel="Ocultar de la app"
      loading={hide.isPending}
      confirmDisabled={reason.trim().length < 3}
      onClose={close}
      onConfirm={() =>
        event &&
        hide.mutate(
          { id: event.id, reason },
          {
            onSuccess: () => {
              toast({ title: 'Evento oculto', description: 'Ya no sale en la app. Puedes mostrarlo de nuevo cuando quieras.' })
              close()
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          },
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p>Sale de la agenda de la app. Quien lo programó lo sigue viendo en su portal, con el motivo.</p>
        <Field label="Motivo" hint="Al menos 3 letras.">
          {(control) => <Textarea {...control} rows={3} maxLength={500} value={reason} onChange={(change) => setReason(change.target.value)} />}
        </Field>
      </div>
    </ConfirmDialog>
  )
}
