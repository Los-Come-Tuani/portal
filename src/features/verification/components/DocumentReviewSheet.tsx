import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Checkbox, Dialog, Field, IconButton, Tag, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import {
  DOCUMENT_STATUS_LABELS,
  type DocumentReviewInput,
  type DocumentTypeInfo,
  type ReviewDocument,
  type Reviewer,
} from '@/data/models'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/format'
import { DOCUMENT_STATUS_TONES } from '../status'
import { DocumentViewer } from './DocumentViewer'

export type Fact = { label: string; value: string; strong?: boolean; danger?: boolean }

interface DocumentReviewSheetProps {
  documents: readonly ReviewDocument[]
  infoOf: (type: string) => DocumentTypeInfo
  documentId: string | null
  /** Se puede aceptar o rechazar: etapa de documentos, en revisión y con permiso. */
  canReview: boolean
  reviewers: readonly Reviewer[]
  /** "El guía lo lee tal cual en la app." */
  readerHint: string
  /** Guarda la revisión y devuelve los documentos como quedaron. */
  onReview: (documentId: string, input: DocumentReviewInput) => Promise<readonly ReviewDocument[]>
  reviewing: boolean
  onSelect: (documentId: string | null) => void
  /** Lo que declararon en la solicitud y el documento tiene que respaldar. */
  declaredOf?: (type: string) => Fact[]
  /** Los opcionales no dicen "obligatorio". */
  isRequired?: (type: string) => boolean
}

export function DocumentReviewSheet({
  documents,
  infoOf,
  documentId,
  canReview,
  reviewers,
  readerHint,
  onReview,
  reviewing,
  onSelect,
  declaredOf,
  isRequired = () => true,
}: DocumentReviewSheetProps) {
  const document = documents.find((item) => item.id === documentId) ?? null
  const toast = useToast()
  const { today } = useNow()
  const [form, setForm] = useState({ id: documentId, checks: new Set(document?.checks), note: document?.note ?? '', error: '' })
  if (form.id !== documentId) {
    setForm({ id: documentId, checks: new Set(document?.checks), note: document?.note ?? '', error: '' })
  }

  const index = documents.findIndex((item) => item.id === documentId)
  const neighbour = (step: 1 | -1) => documents[index + step]?.id ?? null
  const info = document ? infoOf(document.type) : null
  const missing = info ? info.checks.filter((check) => !form.checks.has(check.id)).length : 0
  const expired = !!document?.expiresOn && document.expiresOn < today

  const toggle = (checkId: string, checked: boolean) =>
    setForm((current) => {
      const checks = new Set(current.checks)
      if (checked) checks.add(checkId)
      else checks.delete(checkId)
      return { ...current, checks }
    })

  const submit = async (status: 'accepted' | 'rejected') => {
    if (!document || !info) return
    if (status === 'rejected' && form.note.trim().length < 10) {
      setForm((current) => ({ ...current, error: `Explica qué tiene que corregir: ${readerHint.toLowerCase()}` }))
      return
    }
    try {
      const updated = await onReview(document.id, { status, checks: [...form.checks], note: form.note.trim() })
      toast({ title: `${info.label}: ${status === 'accepted' ? 'aceptado' : 'rechazado'}` })
      const next =
        updated.find((item, position) => position > index && item.status === 'pending') ??
        updated.find((item) => item.status === 'pending')
      onSelect(next?.id ?? null)
    } catch (error) {
      toast({ title: errorMessage(error), tone: 'error' })
    }
  }

  const reviewerName = (id: string | null) => reviewers.find((reviewer) => reviewer.id === id)?.name ?? "Equipo K'Plan"
  const facts: Fact[] = []
  if (document?.number) facts.push({ label: 'Número', value: document.number, strong: true })
  if (document?.issuedOn) facts.push({ label: 'Emitido', value: formatDate(document.issuedOn) })
  if (document?.expiresOn) {
    facts.push({ label: 'Vence', value: `${formatDate(document.expiresOn)}${expired ? ' (vencido)' : ''}`, danger: expired })
  }

  return (
    <Dialog
      open={document !== null}
      onClose={() => onSelect(null)}
      variant="sheet"
      size="lg"
      title={info?.label ?? ''}
      description={
        document && info
          ? `Subido el ${formatDateTime(document.uploadedAt)} · ${isRequired(document.type) ? `Obligatorio para: ${info.requiredFor.toLowerCase()}` : `Opcional · ${info.requiredFor.toLowerCase()}`}`
          : undefined
      }
      footer={
        document && (
          <>
            <div className="mr-auto flex items-center gap-1">
              <IconButton label="Documento anterior" size="sm" icon={<ChevronLeft size={18} />} disabled={!neighbour(-1)} onClick={() => onSelect(neighbour(-1))} />
              <span className="text-caption text-muted tabular-nums">
                {index + 1} de {documents.length}
              </span>
              <IconButton label="Documento siguiente" size="sm" icon={<ChevronRight size={18} />} disabled={!neighbour(1)} onClick={() => onSelect(neighbour(1))} />
            </div>
            {canReview ? (
              <>
                {missing > 0 && info && (
                  <span className="text-caption text-muted tabular-nums">
                    Falta marcar {missing} de {info.checks.length}
                  </span>
                )}
                <Button variant="quiet" onClick={() => void submit('rejected')} disabled={reviewing}>
                  Rechazar
                </Button>
                <Button onClick={() => void submit('accepted')} disabled={missing > 0} loading={reviewing}>
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

          {(facts.length > 0 || document.detail) && (
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-body">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-small text-muted">{fact.label}</dt>
                  <dd className={cn('tabular-nums', fact.danger ? 'font-semibold text-danger' : 'text-ink', fact.strong && 'font-semibold')}>
                    {fact.value}
                  </dd>
                </div>
              ))}
              {document.detail && (
                <div className="col-span-3">
                  <dt className="text-small text-muted">Idiomas y nivel</dt>
                  <dd className="text-ink">{document.detail}</dd>
                </div>
              )}
            </dl>
          )}

          {declaredOf && declaredOf(document.type).length > 0 && (
            <section className="rounded-kp border border-divider bg-canvas/60 px-4 py-3">
              <h3 className="text-small font-semibold text-ink">Lo que declaró en la solicitud</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-body sm:grid-cols-2">
                {declaredOf(document.type).map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-small text-muted">{fact.label}</dt>
                    <dd className={cn('text-ink', fact.strong && 'font-semibold tabular-nums')}>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

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
            <Field label="Qué tiene que corregir" optional hint={`Sólo si lo rechazas. ${readerHint}`} error={form.error || undefined}>
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
