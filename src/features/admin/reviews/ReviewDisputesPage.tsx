import { MessageSquareWarning, Star } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, Pager, SkeletonRows, Tabs, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useDisputes, useResolveDispute } from '@/data/hooks/use-moderation'
import { DISPUTE_STATUS_LABELS, REVIEW_DIRECTION_LABELS, type DisputeStatus, type ReviewDispute } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime } from '@/lib/format'

type Section = 'pending' | 'upheld' | 'rejected' | 'all'

const TONES: Record<DisputeStatus, TagTone> = { pending: 'planned', upheld: 'neutral', rejected: 'confirmed' }

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={14} className={index < rating ? 'text-star' : 'text-divider'} fill="currentColor" strokeWidth={0} aria-hidden="true" />
      ))}
    </span>
  )
}

/**
 * Las reseñas que el reseñado impugnó (F7, `review-dispute/`): el equipo con `content.moderate` le da
 * la razón (la reseña se oculta y deja de contar en el promedio) o la mantiene.
 */
export function ReviewDisputesPage() {
  useDocumentTitle('Reseñas impugnadas')
  const [section, setSection] = useState<Section>('pending')
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<{ dispute: ReviewDispute; upheld: boolean } | null>(null)
  const [note, setNote] = useState('')
  const disputes = useDisputes({ status: section === 'all' ? undefined : section, page, pageSize: 20 })
  const resolve = useResolveDispute()
  const toast = useToast()

  const close = () => {
    setDeciding(null)
    setNote('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reseñas impugnadas"
        description="Las reseñas que el guía o el turista calificado pidió revisar. Si le das la razón, la reseña se oculta y deja de contar en su promedio; si no, se queda como está."
      />
      <Tabs
        label="Impugnaciones"
        value={section}
        onChange={(value) => {
          setSection(value)
          setPage(1)
        }}
        items={[
          { value: 'pending', label: 'Por decidir', count: section === 'pending' ? disputes.data?.elements : undefined },
          { value: 'upheld', label: 'Ocultadas' },
          { value: 'rejected', label: 'Se mantienen' },
          { value: 'all', label: 'Todas' },
        ]}
      />

      {disputes.isPending ? (
        <SkeletonRows rows={4} />
      ) : disputes.isError ? (
        <ErrorState error={disputes.error} onRetry={() => void disputes.refetch()} />
      ) : disputes.data.results.length === 0 ? (
        <EmptyState icon={<MessageSquareWarning size={20} />} title={section === 'pending' ? 'No hay reseñas por decidir' : 'No hay impugnaciones aquí'}>
          {section === 'pending' && 'Cuando alguien impugne una reseña desde la app, aparece aquí por orden de llegada.'}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {disputes.data.results.map((dispute) => (
              <li key={dispute.id} className="rounded-panel border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-small text-muted">
                      {REVIEW_DIRECTION_LABELS[dispute.review.direction]} · {formatDateTime(dispute.review.createdAt)}
                    </p>
                    <p className="mt-1 text-body font-semibold text-ink">
                      {dispute.author} sobre {dispute.subject}
                    </p>
                  </div>
                  <Tag tone={TONES[dispute.status]}>{DISPUTE_STATUS_LABELS[dispute.status]}</Tag>
                </div>
                <blockquote className="mt-3 rounded-kp bg-paper px-4 py-3">
                  <Stars rating={dispute.review.rating} />
                  <p className="mt-1.5 text-body text-ink">{dispute.review.comment || <span className="text-muted">Sin comentario, solo la calificación.</span>}</p>
                </blockquote>
                <div className="mt-3 text-small">
                  <p className="text-muted">
                    La impugnó <span className="font-medium text-ink">{dispute.raisedBy}</span> el {formatDateTime(dispute.createdAt)}:
                  </p>
                  <p className="mt-1 text-ink">{dispute.reason}</p>
                </div>
                {dispute.status !== 'pending' && (
                  <p className="mt-3 text-small text-muted">
                    Resuelta {dispute.resolvedAt ? `el ${formatDateTime(dispute.resolvedAt)}` : ''}
                    {dispute.note ? `: ${dispute.note}` : '.'}
                  </p>
                )}
                {dispute.status === 'pending' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => setDeciding({ dispute, upheld: false })}>
                      Mantener la reseña
                    </Button>
                    <Button variant="danger" onClick={() => setDeciding({ dispute, upheld: true })}>
                      Ocultar la reseña
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pager page={disputes.data} onChange={setPage} noun={{ one: 'impugnación', many: 'impugnaciones' }} />
        </>
      )}

      <ConfirmDialog
        open={deciding !== null}
        title={deciding?.upheld ? '¿Ocultar la reseña?' : '¿Mantener la reseña?'}
        confirmLabel={deciding?.upheld ? 'Ocultar reseña' : 'Mantenerla'}
        tone={deciding?.upheld ? 'danger' : 'primary'}
        loading={resolve.isPending}
        onClose={close}
        onConfirm={() =>
          deciding &&
          resolve.mutate(
            { id: deciding.dispute.id, upheld: deciding.upheld, note },
            {
              onSuccess: () => {
                toast({ title: deciding.upheld ? 'Reseña oculta' : 'La reseña se mantiene' })
                close()
              },
              onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
            },
          )
        }
      >
        <div className="flex flex-col gap-4">
          <p>
            {deciding?.upheld
              ? `Le das la razón a ${deciding.dispute.raisedBy}: la reseña deja de verse y de contar en el promedio.`
              : `La reseña de ${deciding?.dispute.author ?? ''} sigue visible y cuenta en el promedio.`}
          </p>
          <Field label="Nota" optional hint="Para el historial del equipo.">
            {(control) => <Textarea {...control} rows={3} maxLength={1000} value={note} onChange={(change) => setNote(change.target.value)} />}
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  )
}
