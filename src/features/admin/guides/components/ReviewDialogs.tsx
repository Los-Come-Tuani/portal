import { Check, MessageSquareWarning, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, Field, Select, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useProviderAction, useProviderReasons } from '@/data/hooks/use-providers'
import type { ProviderRequestDetail, RejectionReason, RequestCredential } from '@/data/models'
import { lowerFirst } from '@/lib/format'

const READER_HINT = 'La lee el guía o traductor, en el correo y en la app.'

interface Form {
  key: string | null
  reason: string
  note: string
  errors: Record<string, string>
}

const empty = (key: string | null): Form => ({ key, reason: '', note: '', errors: {} })

/** El motivo y la nota de un rechazo; con «otro» hay que explicar. */
function useRejectionForm(key: string | null, reasons: RejectionReason[] | undefined) {
  const toast = useToast()
  const [form, setForm] = useState<Form>(empty(key))
  if (form.key !== key) setForm(empty(key))
  const chosen = reasons?.find((item) => item.code === form.reason)

  const check = (): boolean => {
    if (!form.reason) {
      setForm((current) => ({ ...current, errors: { reason: 'Elige por qué se rechaza' } }))
      return false
    }
    if (chosen?.requiresText && !form.note.trim()) {
      setForm((current) => ({ ...current, errors: { note: 'Con ese motivo hay que explicarle a la persona qué pasó' } }))
      return false
    }
    return true
  }

  const fail = (error: Error) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setForm((current) => ({ ...current, errors: error.fieldErrors }))
    else toast({ title: errorMessage(error), tone: 'error' })
  }

  return { form, setForm, chosen, check, fail }
}

function ReasonFields({
  reasons,
  form,
  setForm,
  required,
  noteLabel,
}: {
  reasons: RejectionReason[] | undefined
  form: Form
  setForm: (update: (current: Form) => Form) => void
  required: boolean
  noteLabel: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Motivo" error={form.errors.reason}>
        {(control) => (
          <Select
            {...control}
            value={form.reason}
            disabled={!reasons}
            data-autofocus
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value, errors: {} }))}
          >
            <option value="">{reasons ? 'Elige un motivo' : 'Cargando…'}</option>
            {reasons?.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={noteLabel} optional={!required} hint={READER_HINT} error={form.errors.note}>
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={1000}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value, errors: {} }))}
          />
        )}
      </Field>
    </div>
  )
}

/** Rechazar un documento: el motivo le llega a la persona para que lo corrija sin adivinar. */
export function RejectDocumentDialog({ request, document, onClose }: { request: ProviderRequestDetail; document: RequestCredential | null; onClose: () => void }) {
  const action = useProviderAction(request.id)
  const reasons = useProviderReasons(document !== null)
  const toast = useToast()
  const { form, setForm, chosen, check, fail } = useRejectionForm(document?.id ?? null, reasons.data?.document)

  const submit = () => {
    if (!document || !check()) return
    action.mutate(
      { kind: 'review', input: { documentId: document.id, accepted: false, reason: form.reason, note: form.note } },
      {
        onSuccess: () => {
          toast({ title: `Rechazaste: ${lowerFirst(document.type.label)}` })
          onClose()
        },
        onError: fail,
      },
    )
  }

  return (
    <Dialog
      open={document !== null}
      onClose={onClose}
      size="sm"
      title={`Rechazar: ${document?.type.label ?? ''}`}
      description="Cuando termines de revisar, pide las correcciones: la persona sube otro documento desde la app."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<X size={16} />} onClick={submit} loading={action.isPending}>
            Rechazar documento
          </Button>
        </>
      }
    >
      <ReasonFields reasons={reasons.data?.document} form={form} setForm={setForm} required={!!chosen?.requiresText} noteLabel="Qué debe corregir" />
    </Dialog>
  )
}

/** Cerrar el expediente para que la persona corrija lo rechazado. */
export function RequestChangesDialog({ request, open, onClose }: { request: ProviderRequestDetail; open: boolean; onClose: () => void }) {
  const action = useProviderAction(request.id)
  const toast = useToast()
  const [note, setNote] = useState('')
  const rejected = request.documents.filter((item) => item.review && !item.review.accepted)

  const submit = () =>
    action.mutate(
      { kind: 'request-changes', note },
      {
        onSuccess: () => {
          toast({ title: 'Pediste las correcciones', description: `${request.applicant.name} recibe un correo con lo que tiene que corregir.` })
          setNote('')
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Pedir correcciones"
      description="La solicitud se cierra y la persona sube desde la app lo que rechazaste. Lo que aceptaste no se vuelve a revisar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.isPending}>
            Cancelar
          </Button>
          <Button icon={<MessageSquareWarning size={16} />} onClick={submit} loading={action.isPending}>
            Pedir correcciones
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-small font-semibold text-ink">Le llega, con su motivo:</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-body text-ink">
            {rejected.map((item) => (
              <li key={item.id}>
                {item.type.label}: {lowerFirst(item.review?.reason?.label ?? '')}
                {item.review?.note ? `. ${item.review.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
        <Field label="Nota para todo" optional hint={READER_HINT}>
          {(control) => <Textarea {...control} rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />}
        </Field>
      </div>
    </Dialog>
  )
}

export type Deciding = 'approve' | 'reject' | null

/** La decisión final: aprobar hace visible a la persona y le da su rol; rechazar le dice por qué. */
export function DecisionDialog({ request, deciding, onClose }: { request: ProviderRequestDetail; deciding: Deciding; onClose: () => void }) {
  const action = useProviderAction(request.id)
  const reasons = useProviderReasons(deciding === 'reject')
  const toast = useToast()
  const { form, setForm, chosen, check, fail } = useRejectionForm(deciding, reasons.data?.decision)
  const approving = deciding === 'approve'

  const submit = () => {
    if (!deciding) return
    if (!approving && !check()) return
    action.mutate(approving ? { kind: 'approve', note: form.note } : { kind: 'reject', input: { reason: form.reason, note: form.note } }, {
      onSuccess: () => {
        toast({
          title: approving ? `${request.applicant.name} ya aparece en la app` : 'Rechazaste la solicitud',
          description: 'Le mandamos un correo con la decisión.',
        })
        onClose()
      },
      onError: fail,
    })
  }

  return (
    <Dialog
      open={deciding !== null}
      onClose={onClose}
      size="sm"
      title={approving ? `Aprobar: ${request.applicant.name}` : `Rechazar: ${request.applicant.name}`}
      description={
        approving
          ? 'Su perfil queda activo, el turista lo encuentra en la app y la cuenta recibe su rol de guía o traductor.'
          : 'Recibe el motivo y puede corregir y volver a enviar la solicitud desde la app.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.isPending}>
            Cancelar
          </Button>
          <Button variant={approving ? 'primary' : 'danger'} icon={approving ? <Check size={16} /> : <X size={16} />} onClick={submit} loading={action.isPending}>
            {approving ? 'Aprobar' : 'Rechazar'}
          </Button>
        </>
      }
    >
      {approving ? (
        <Field label="Nota" optional hint={READER_HINT}>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={1000}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
          )}
        </Field>
      ) : (
        <ReasonFields reasons={reasons.data?.decision} form={form} setForm={setForm} required={!!chosen?.requiresText} noteLabel="Qué pasó" />
      )}
    </Dialog>
  )
}
