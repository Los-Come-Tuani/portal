import { Check, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Panel, Tag, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useProviderAction } from '@/data/hooks/use-providers'
import { CREDENTIAL_STATUS_LABELS, isReviewable, type CredentialStatus, type ProviderRequestDetail, type RequestCredential } from '@/data/models'
import { DocumentViewer } from '@/features/verification/components/DocumentViewer'
import { formatDate, lowerFirst } from '@/lib/format'

const STATUS_TONES: Record<CredentialStatus, TagTone> = {
  uploaded: 'outline',
  in_review: 'planned',
  approved: 'confirmed',
  rejected: 'danger',
  expired: 'danger',
  replaced: 'outline',
}

/** El veredicto de quien revisó, o en qué está si nadie lo revisó. */
function Verdict({ document }: { document: RequestCredential }) {
  if (!document.review) return <Tag tone={STATUS_TONES[document.status]}>{CREDENTIAL_STATUS_LABELS[document.status]}</Tag>
  if (document.review.accepted) {
    return <Tag tone="confirmed">{document.status === 'approved' ? CREDENTIAL_STATUS_LABELS.approved : 'Aceptado'}</Tag>
  }
  return <Tag tone="danger">Rechazado</Tag>
}

function Row({
  request,
  document,
  canReview,
  onReject,
}: {
  request: ProviderRequestDetail
  document: RequestCredential
  canReview: boolean
  onReject: (document: RequestCredential) => void
}) {
  const action = useProviderAction(request.id)
  const toast = useToast()
  const [open, setOpen] = useState(document.inThisRequest && !document.review)
  const reviewable = canReview && isReviewable(request, document)

  const accept = () =>
    action.mutate(
      { kind: 'review', input: { documentId: document.id, accepted: true, note: '' } },
      {
        onSuccess: () => {
          toast({ title: `Aceptaste: ${lowerFirst(document.type.label)}` })
          setOpen(false)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  // Mientras el expediente está abierto, el veredicto se puede cambiar: se ofrece el contrario.
  const verdict = document.review?.accepted

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-body font-semibold text-ink">{document.type.label}</span>
            <Verdict document={document} />
            {!document.inThisRequest && (
              <span className="text-caption text-muted">{request.procedure === 'renewal' ? 'El que está en vigor' : 'Aceptado en una solicitud anterior'}</span>
            )}
            {!document.required && <span className="text-caption text-muted">Ya no se le pide</span>}
          </p>
          <p className="mt-0.5 text-small text-muted tabular-nums">
            N.º {document.number} · emitido el {formatDate(document.issuedOn)}
            {document.expiresOn ? ` · vence el ${formatDate(document.expiresOn)}` : ' · no vence'}
          </p>
          {document.review && !document.review.accepted && (
            <p className="mt-1.5 text-body text-danger">
              {document.review.reason?.label}
              {document.review.note ? `: ${document.review.note}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewable && verdict !== false && (
            <Button size="sm" variant="secondary" icon={<X size={15} />} onClick={() => onReject(document)} disabled={action.isPending}>
              Rechazar
            </Button>
          )}
          {reviewable && verdict !== true && (
            <Button size="sm" variant={verdict === undefined ? 'primary' : 'secondary'} icon={<Check size={15} />} onClick={accept} loading={action.isPending}>
              Aceptar
            </Button>
          )}
          {document.file.url && (
            <Button
              size="sm"
              variant="ghost"
              icon={open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Ocultar' : 'Ver'}
            </Button>
          )}
        </div>
      </div>
      {open && document.file.url && (
        <DocumentViewer pages={[{ label: 'Archivo', url: document.file.url }]} fileName={document.file.key.split('/').at(-1) ?? ''} title={document.type.label} />
      )}
    </li>
  )
}

/** Los documentos del expediente, para contrastarlos con lo que la persona declaró (RF-B-02). */
export function DocumentList({ request, canReview, onReject }: { request: ProviderRequestDetail; canReview: boolean; onReject: (document: RequestCredential) => void }) {
  return (
    <Panel
      title="Documentos"
      description={
        request.documents.some((item) => !item.file.url)
          ? 'Sin enlace: el almacenamiento de archivos no está configurado.'
          : 'Los enlaces de lectura vencen a los pocos minutos: vuelve a abrir la solicitud si caducan.'
      }
    >
      {request.documents.length === 0 ? (
        <p className="text-body text-muted">No subió documentos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {request.documents.map((document) => (
            <Row key={document.id} request={request} document={document} canReview={canReview} onReject={onReject} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
