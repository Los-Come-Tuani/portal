import { ArrowLeft, Check, MessageSquareWarning, Undo2, UserRoundCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, ErrorState, PageHeader, Panel, Skeleton, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useProviderAction, useProviderRequest } from '@/data/hooks/use-providers'
import {
  isOpenRequest,
  PROCEDURE_LABELS,
  PROVIDER_STAGE_LABELS,
  REQUEST_STATUS_LABELS,
  servicesLabel,
  type ProviderRequestDetail,
  type RequestCredential,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { Notice } from '@/features/verification/components/Notice'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDateTime, lowerFirst } from '@/lib/format'
import { REQUEST_STATUS_TONES } from '../admissions/status'
import { ApplicantContact, ApplicantProfile } from './components/ApplicantPanels'
import { DocumentList } from './components/DocumentList'
import { DecisionDialog, RejectDocumentDialog, RequestChangesDialog, type Deciding } from './components/ReviewDialogs'

/** Una fecha del API con la hora de Nicaragua, como el resto del portal. */
const when = (iso: string) => formatDateTime(nowLocalDateTime(new Date(iso)))

function Resolution({ request }: { request: ProviderRequestDetail }) {
  const { resolution } = request
  if (!resolution) return null
  if (resolution.approved) {
    return (
      <Notice tone="confirmed" title={`${request.procedure === 'renewal' ? 'Renovación aprobada' : 'Aprobado'} el ${when(resolution.resolvedAt)}`}>
        {resolution.note || (request.procedure === 'renewal' ? 'Los documentos nuevos están en vigor.' : 'Aparece en la app para el turista.')}
      </Notice>
    )
  }
  return (
    <Notice tone="danger" title={`${resolution.reason?.label ?? 'Rechazada'} · ${when(resolution.resolvedAt)}`}>
      {resolution.note || 'Sin nota. La persona recibió el motivo por correo.'}
    </Notice>
  )
}

function History({ request }: { request: ProviderRequestDetail }) {
  if (request.history.length === 0) return null
  return (
    <Panel title="Solicitudes anteriores" description="Cada vez que se rechaza, corregir o renovar abre otra solicitud.">
      <ul className="flex flex-col divide-y divide-divider">
        {request.history.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <p className="flex flex-wrap items-center gap-2">
              <Tag tone={REQUEST_STATUS_TONES[item.status]}>{REQUEST_STATUS_LABELS[item.status]}</Tag>
              <span className="text-small text-muted">
                {PROCEDURE_LABELS[item.procedure]} · enviada el {when(item.submittedAt)}
              </span>
            </p>
            {item.reason && <p className="mt-1.5 text-body font-semibold text-ink">{item.reason.label}</p>}
            {item.note && <p className="text-body text-ink">{item.note}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Quién la tiene, y lo que puede hacer cada quien según sus permisos. */
function ReviewPanel({ request, onRequestChanges, onDecide }: { request: ProviderRequestDetail; onRequestChanges: () => void; onDecide: (value: Deciding) => void }) {
  const { user, can } = useSession()
  const action = useProviderAction(request.id)
  const toast = useToast()
  const canReview = can('guides.review', 'guides.decide')
  const canDecide = can('guides.decide')
  const holder = request.takenBy
  const mine = holder?.id === user.id
  const renewal = request.procedure === 'renewal'

  const run = (kind: 'take' | 'release') =>
    action.mutate(
      { kind },
      {
        onSuccess: () => toast({ title: kind === 'take' ? 'La tomaste: queda en revisión a tu nombre' : 'La devolviste a la cola' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  if (!isOpenRequest(request)) {
    return (
      <Panel title="Decisión">
        <Resolution request={request} />
        {holder && <p className="mt-3 text-small text-muted">{mine ? 'La resolviste tú.' : `La resolvió ${holder.name}.`}</p>}
      </Panel>
    )
  }

  const { counts } = request
  return (
    <Panel title="Revisión" description="Se atiende por orden de llegada. La persona recibe un correo con lo que se decida.">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          {holder ? (mine ? 'La tienes en revisión.' : <>La tiene en revisión <strong className="font-semibold">{holder.name}</strong>.</>) : 'Nadie la tiene todavía.'}
        </p>
        <p className="text-small text-muted tabular-nums">
          {PROVIDER_STAGE_LABELS[request.stage ?? 'documents']}: {counts.accepted} aceptados, {counts.rejected} rechazados y {counts.pending} sin revisar de{' '}
          {counts.total}.
        </p>

        {!canReview ? (
          <p className="text-small text-muted">Puedes verla, pero revisarla necesita el permiso de revisar solicitudes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!holder && (
              <Button icon={<UserRoundCheck size={16} />} onClick={() => run('take')} loading={action.isPending}>
                Tomarla
              </Button>
            )}
            {!renewal && (!holder || mine) && (
              <Button variant="secondary" icon={<MessageSquareWarning size={16} />} disabled={counts.rejected === 0} onClick={onRequestChanges}>
                Pedir correcciones
              </Button>
            )}
            {holder && (mine || canDecide) && (
              <Button variant="ghost" icon={<Undo2 size={16} />} onClick={() => run('release')} loading={action.isPending}>
                Devolver a la cola
              </Button>
            )}
          </div>
        )}

        {renewal ? (
          <p className="text-small text-muted">Una renovación se resuelve sola cuando su último documento queda revisado: lo aceptado entra en vigor.</p>
        ) : canDecide ? (
          <div className="flex flex-col gap-2 border-t border-divider pt-4">
            <p className="text-small text-muted">
              {request.stage === 'decision' ? 'Todo lo que se pide está aceptado: falta tu decisión.' : 'Para aprobar, cada documento que se pide tiene que estar aceptado.'}
            </p>
            <Button icon={<Check size={16} />} disabled={request.stage !== 'decision'} onClick={() => onDecide('approve')}>
              Aprobar
            </Button>
            <Button variant="secondary" icon={<X size={16} />} onClick={() => onDecide('reject')}>
              Rechazar
            </Button>
          </div>
        ) : (
          <p className="border-t border-divider pt-4 text-small text-muted">
            La decisión final la toma alguien con el permiso <span className="font-semibold text-ink">Decidir solicitudes</span>.
          </p>
        )}
      </div>
    </Panel>
  )
}

function RequestView({ request }: { request: ProviderRequestDetail }) {
  const { user, can } = useSession()
  const [rejecting, setRejecting] = useState<RequestCredential | null>(null)
  const [requestingChanges, setRequestingChanges] = useState(false)
  const [deciding, setDeciding] = useState<Deciding>(null)
  // Revisar sin tomar antes la toma; lo que tiene otra persona no se revisa.
  const canReviewDocuments = can('guides.review', 'guides.decide') && (!request.takenBy || request.takenBy.id === user.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={request.applicant.name}
        description={`${servicesLabel(request.services)} · ${request.city?.name ?? 'Todo el país'}`}
        actions={
          <>
            <Tag tone={REQUEST_STATUS_TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Tag>
            <Tag tone="outline">{PROCEDURE_LABELS[request.procedure]}</Tag>
            <span className="text-small text-muted">Enviada el {when(request.submittedAt)}</span>
            <ButtonLink to={paths.guides} variant="ghost" icon={<ArrowLeft size={16} />}>
              Guías y traductores
            </ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {request.missing.length > 0 && (
            <Notice tone="danger" title="Falta documentación">
              No tiene un documento utilizable de: {request.missing.map((item) => lowerFirst(item.label)).join(', ')}.
            </Notice>
          )}
          <DocumentList request={request} canReview={canReviewDocuments} onReject={setRejecting} />
          <History request={request} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
          <ReviewPanel request={request} onRequestChanges={() => setRequestingChanges(true)} onDecide={setDeciding} />
          <ApplicantProfile request={request} />
          <ApplicantContact request={request} />
        </div>
      </div>

      <RejectDocumentDialog request={request} document={rejecting} onClose={() => setRejecting(null)} />
      <RequestChangesDialog request={request} open={requestingChanges} onClose={() => setRequestingChanges(false)} />
      <DecisionDialog request={request} deciding={deciding} onClose={() => setDeciding(null)} />
    </div>
  )
}

/** Una solicitud de guía o traductor: sus documentos, su perfil y lo que decide el equipo. */
export function GuideApplicationPage() {
  const { applicationId = '' } = useParams()
  const request = useProviderRequest(applicationId)
  useDocumentTitle(request.data?.applicant.name ?? 'Solicitud')
  if (request.isError) return <ErrorState error={request.error} onRetry={() => void request.refetch()} />
  if (!request.data) return <Skeleton className="h-96" />
  return <RequestView request={request.data} />
}
