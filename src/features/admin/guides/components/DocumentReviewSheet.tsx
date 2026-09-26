import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Checkbox, Dialog, Field, IconButton, Tag, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useGuideAction } from '@/data/hooks/use-guides'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_INFO,
  type GuideApplication,
  type Reviewer,
} from '@/data/models'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/format'
import { DOCUMENT_STATUS_TONES } from '../status'
import { DocumentViewer } from './DocumentViewer'

interface DocumentReviewSheetProps {
  application: GuideApplication
  documentId: string | null
  /** Se puede aceptar o rechazar: etapa de documentos, en revisión y con permiso. */
  canReview: boolean
  reviewers: readonly Reviewer[]
  onSelect: (documentId: string | null) => void
}

export function DocumentReviewSheet({ application, documentId, canReview, reviewers, onSelect }: DocumentReviewSheetProps) {
  const document = application.documents.find((item) => item.id === documentId) ?? null
  const action = useGuideAction(application.id)
  const toast = useToast()
  const { today } = useNow()
  const [form, setForm] = useState({ id: documentId, checks: new Set(document?.checks), note: document?.note ?? '', error: '' })
  if (form.id !== documentId) {
    setForm({ id: documentId, checks: new Set(document?.checks), note: document?.note ?? '', error: '' })
  }

  const index = application.documents.findIndex((item) => item.id === documentId)
  const neighbour = (step: 1 | -1) => application.documents[index + step]?.id ?? null
  const info = document ? DOCUMENT_TYPE_INFO[document.type] : null
  const allChecked = !!info && info.checks.every((check) => form.checks.has(check.id))
  const expired = !!document?.expiresOn && document.expiresOn < today

  const toggle = (checkId: string, checked: boolean) =>
    setForm((current) => {
      const checks = new Set(current.checks)
      if (checked) checks.add(checkId)
      else checks.delete(checkId)
      return { ...current, checks }
    })

  const submit = (status: 'accepted' | 'rejected') => {
    if (!document) return
    if (status === 'rejected' && form.note.trim().length < 10) {
      setForm((current) => ({ ...current, error: 'Explica qué tiene que corregir: el guía lo lee en la app' }))
      return
    }
    action.mutate(
      { kind: 'document', documentId: document.id, input: { status, checks: [...form.checks], note: form.note.trim() } },
      {
        onSuccess: (updated) => {
          toast({ title: `${info?.label}: ${status === 'accepted' ? 'aceptado' : 'rechazado'}` })
          const next = updated.documents.find((item, position) => position > index && item.status === 'pending')
            ?? updated.documents.find((item) => item.status === 'pending')
          onSelect(next?.id ?? null)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  const reviewerName = (id: string | null) => reviewers.find((reviewer) => reviewer.id === id)?.name ?? "Equipo K'Plan"

  return (
    <Dialog
      open={document !== null}
      onClose={() => onSelect(null)}
      variant="sheet"
      size="lg"
      title={info?.label ?? ''}
      description={document ? `Subido el ${formatDateTime(document.uploadedAt)} · Obligatorio para: ${info?.requiredFor.toLowerCase()}` : undefined}
      footer={
        document && (
          <>
            <div className="mr-auto flex items-center gap-1">
              <IconButton label="Documento anterior" size="sm" icon={<ChevronLeft size={18} />} disabled={!neighbour(-1)} onClick={() => onSelect(neighbour(-1))} />
              <span className="text-caption text-muted tabular-nums">
                {index + 1} de {application.documents.length}
              </span>
              <IconButton label="Documento siguiente" size="sm" icon={<ChevronRight size={18} />} disabled={!neighbour(1)} onClick={() => onSelect(neighbour(1))} />
            </div>
            {canReview ? (
              <>
                {!allChecked && info && (
                  <span className="text-caption text-muted tabular-nums">
                    Falta marcar {info.checks.filter((check) => !form.checks.has(check.id)).length} de {info.checks.length}
                  </span>
                )}
                <Button variant="quiet" onClick={() => submit('rejected')} disabled={action.isPending}>
                  Rechazar
                </Button>
                <Button
                  onClick={() => submit('accepted')}
                  disabled={!allChecked}
                  loading={action.isPending && action.variables?.kind === 'document'}
                  title={allChecked ? undefined : 'Marca todo lo que revisaste'}
                >
                  Aceptar documento
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => onSelect(null)}>
                Cerrar
              </Button>
            )}
          </>
        )
      }
    >
      {document && info && (
        <div className="flex flex-col gap-5">
          <DocumentViewer key={document.id} pages={document.pages} fileName={document.fileName} title={info.label} />

          <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-body">
            <div>
              <dt className="text-small text-muted">Número</dt>
              <dd className="font-semibold text-ink tabular-nums">{document.number}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Emitido</dt>
              <dd className="text-ink tabular-nums">{formatDate(document.issuedOn)}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Vence</dt>
              <dd className={cn('tabular-nums', expired ? 'font-semibold text-danger' : 'text-ink')}>
                {document.expiresOn ? `${formatDate(document.expiresOn)}${expired ? ' (vencido)' : ''}` : 'Sin vencimiento'}
              </dd>
            </div>
            {document.detail && (
              <div className="col-span-3">
                <dt className="text-small text-muted">Idiomas y nivel</dt>
                <dd className="text-ink">{document.detail}</dd>
              </div>
            )}
          </dl>

          <section className="flex flex-col gap-3 border-t border-divider pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-body font-semibold text-ink">Lo que se revisa</h3>
              <Tag tone={DOCUMENT_STATUS_TONES[document.status]}>{DOCUMENT_STATUS_LABELS[document.status]}</Tag>
            </div>
            {canReview ? (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="sr-only">Lo que revisaste de este documento</legend>
                {info.checks.map((check) => (
                  <Checkbox
                    key={check.id}
                    label={check.label}
                    checked={form.checks.has(check.id)}
                    onChange={(event) => toggle(check.id, event.target.checked)}
                  />
                ))}
              </fieldset>
            ) : (
              <ul className="flex flex-col gap-2">
                {info.checks.map((check) => {
                  const ok = document.checks.includes(check.id)
                  return (
                    <li key={check.id} className={cn('flex items-start gap-2.5 text-body', ok ? 'text-ink' : 'text-muted')}>
                      {ok ? (
                        <Check size={16} className="mt-0.5 shrink-0 text-confirmed" aria-label="Revisado" />
                      ) : (
                        <X size={16} className="mt-0.5 shrink-0 text-muted" aria-label="Sin marcar" />
                      )}
                      {check.label}
                    </li>
                  )
                })}
              </ul>
            )}
            {document.reviewedAt && (
              <p className="text-caption text-muted">
                {document.status === 'accepted' ? 'Aceptado' : 'Rechazado'} por {reviewerName(document.reviewedBy)} el{' '}
                {formatDateTime(document.reviewedAt)}
              </p>
            )}
          </section>

          {canReview ? (
            <Field
              label="Qué tiene que corregir"
              optional
              hint="Sólo si lo rechazas. El guía lo lee tal cual en la app."
              error={form.error || undefined}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={form.note}
                  placeholder="Ej.: la foto está cortada, sube el reverso de la cédula."
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value, error: '' }))}
                />
              )}
            </Field>
          ) : (
            document.note && (
              <div className="rounded-kp border border-danger/25 bg-danger/5 px-4 py-3">
                <p className="text-small font-semibold text-danger">Lo que se le pidió corregir</p>
                <p className="mt-1 text-body text-ink">{document.note}</p>
              </div>
            )
          )}
        </div>
      )}
    </Dialog>
  )
}
