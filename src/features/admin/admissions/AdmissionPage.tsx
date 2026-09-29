import { ArrowLeft, ArrowRight, Mail, MessageSquareWarning, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ErrorState, Panel, Skeleton, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useAdmission, useAdmissionAction, useAdmissionReviewers } from '@/data/hooks/use-admissions'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import {
  admissionBlocker,
  admissionRequirements,
  APPLICATION_STATUS_LABELS,
  ADMISSION_STAGE_LABELS,
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_TYPE_LABELS,
  readinessGaps,
  type OrganizationApplication,
  type OrganizationDocumentType,
  type Reviewer,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { DecisionPanel } from '@/features/verification/components/DecisionPanel'
import { DocumentReviewSheet } from '@/features/verification/components/DocumentReviewSheet'
import { DocumentsPanel } from '@/features/verification/components/DocumentsPanel'
import { AssigneeMenu, Notice, RequestChangesDialog } from '@/features/verification/components/ReviewControls'
import { ReviewHistory } from '@/features/verification/components/ReviewHistory'
import { StageTrack } from '@/features/verification/components/StageTrack'
import { APPLICATION_STATUS_TONES, waitingMinutes } from '@/features/verification/status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { toLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { admissionSteps } from './lib/queue'

export function AdmissionPage() {
  const { applicationId = '' } = useParams()
  const application = useAdmission(applicationId)
  const reviewers = useAdmissionReviewers()
  useDocumentTitle(application.data?.name ?? 'Solicitud')

  if (application.isError) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />
  if (!application.data) return <Skeleton className="h-96" />
  return <AdmissionView application={application.data} reviewers={reviewers.data ?? []} />
}

function AdmissionView({ application, reviewers }: { application: OrganizationApplication; reviewers: readonly Reviewer[] }) {
  const action = useAdmissionAction(application.id)
  const toast = useToast()
  const { can, user } = useSession()
  const { today, minutes } = useNow()
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const organizations = useOrganizations()
  const stopIds = [...application.claimedStopIds, ...(application.newStopId ? [application.newStopId] : [])]
  const places = usePlaces({ ids: stopIds }, stopIds.length > 0)

  const inReview = application.status === 'in_review'
  const filledByMe = application.assisted?.byId === user.id
  const canReview = can('organizations.review', 'organizations.manage') && !filledByMe
  const reviewingDocuments = canReview && inReview && application.stage === 'documents'
  const blocker = application.stage === 'decision' ? null : admissionBlocker(application)
  const pending = (kind: string) => action.isPending && action.variables?.kind === kind
  const lastEvent = (kind: OrganizationApplication['history'][number]['kind']) => application.history.findLast((event) => event.kind === kind)
  const who = application.type === 'negocio' ? 'El negocio' : 'La alcaldía'
  const readerHint = `${who} lo lee tal cual en el portal.`
  const ownerOf = (stopId: string) =>
    organizations.data?.find((item) => item.id !== application.organizationId && item.stopIds.includes(stopId))
  const conflicts = application.claimedStopIds.filter((stopId) => ownerOf(stopId))
  const accepted = application.documents.filter((document) => document.status === 'accepted').length
  const placeGaps = application.newPlaceReadiness ? readinessGaps(application.newPlaceReadiness) : []
  const requirements = admissionRequirements(application.type)

  const advance = () =>
    action.mutate(
      { kind: 'advance' },
      {
        onSuccess: () => toast({ title: 'Pasó a decisión' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <Link to={paths.admissions} className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        Solicitudes
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-headline font-bold tracking-tight text-ink">{application.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-small text-muted">
            <Tag tone="ink">{ORGANIZATION_TYPE_LABELS[application.type]}</Tag>
            {application.assisted && (
              <Tag tone="outline">
                Alta asistida por {application.assisted.byName}
                {application.assisted.fee > 0 ? ` · ${formatMoney(application.assisted.fee)}` : ' · sin costo'}
              </Tag>
            )}
            <Tag tone={APPLICATION_STATUS_TONES[application.status]}>
              {inReview ? `${APPLICATION_STATUS_LABELS.in_review} · ${ADMISSION_STAGE_LABELS[application.stage]}` : APPLICATION_STATUS_LABELS[application.status]}
            </Tag>
            <span>
              {application.kind} · {application.city} ·{' '}
              {application.assisted ? `${filledByMe ? 'la llenaste' : 'se llenó'} el` : 'envió su solicitud el'}{' '}
              {formatDate(application.submittedAt.slice(0, 10))}
            </span>
          </div>
        </div>
        <AssigneeMenu
          assigneeId={application.assigneeId}
          reviewers={reviewers.filter((reviewer) => reviewer.id !== application.assisted?.byId)}
          closed={!inReview && application.status !== 'changes_requested'}
          onAssign={(assigneeId) => action.mutateAsync({ kind: 'assign', assigneeId })}
          assigning={pending('assign')}
        />
      </header>

      {filledByMe && inReview && (
        <Notice tone="neutral" title="La llenaste tú">
          Para que pase por la misma revisión que cualquier otra, sus documentos los revisa y la decide otra persona del equipo.
        </Notice>
      )}
      {application.status === 'changes_requested' && (
        <Notice tone="neutral" title={`Esperando a que ${who.toLowerCase()} corrija desde el portal`}>
          {lastEvent('changes_requested')?.text.replace(/^Pidió una corrección: /, '')}
        </Notice>
      )}
      {application.status === 'approved' && application.decidedAt && (
        <Notice tone="confirmed" title={`Aprobada el ${formatDateTime(application.decidedAt)}`}>
          {application.decisionNote || `Aprobada por ${lastEvent('approved')?.actorName ?? "el equipo de K'Plan"}. Su lugar está publicado en la app.`}
        </Notice>
      )}
      {application.status === 'rejected' && application.decidedAt && (
        <Notice tone="danger" title={`Rechazada el ${formatDateTime(application.decidedAt)} por ${lastEvent('rejected')?.actorName ?? "el equipo de K'Plan"}`}>
          {application.decisionNote}
        </Notice>
      )}

      <StageTrack
        steps={admissionSteps(application)}
        waitingMinutes={waitingMinutes(application.stageSince, toLocalDateTime(today, minutes))}
        waitingLabel={`Esperando ${application.type === 'negocio' ? 'al negocio' : 'a la alcaldía'}`}
        blocker={inReview && canReview ? blocker : null}
        actions={
          reviewingDocuments && (
            <>
              <Button variant="secondary" icon={<MessageSquareWarning size={16} />} onClick={() => setRequesting(true)}>
                Pedir corrección
              </Button>
              <Button icon={<ArrowRight size={16} />} disabled={blocker !== null} loading={pending('advance')} onClick={advance}>
                Pasar a decisión
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {application.stage === 'decision' && inReview && (
            <DecisionPanel
              subject={application.name}
              description="Lo que se revisó, en una mirada. Al aprobar, entra al portal completo y su lugar se publica en la app."
              summary={
                <ul className="flex flex-col gap-2 text-body text-ink">
                  <li>
                    <span className="font-semibold tabular-nums">
                      {accepted} de {application.documents.length}
                    </span>{' '}
                    documentos aceptados.
                  </li>
                  {application.newStopId &&
                    (placeGaps.length > 0 ? (
                      <li className="text-danger">
                        A su lugar nuevo le falta {placeGaps.join(' y ')}: lo agrega {who.toLowerCase()} desde la ficha en su portal.
                      </li>
                    ) : (
                      <li>Se publica su lugar nuevo.</li>
                    ))}
                  {application.assisted && application.assisted.fee > 0 && (
                    <li>
                      Se le cobra el alta asistida: <span className="font-semibold tabular-nums">{formatMoney(application.assisted.fee)}</span> en su
                      estado de cuenta de este mes.
                    </li>
                  )}
                  {application.claimedStopIds.length > 0 && (
                    <li>
                      Se le asignan <span className="font-semibold tabular-nums">{application.claimedStopIds.length}</span> lugares que ya están en la app.
                    </li>
                  )}
                  {conflicts.length > 0 && (
                    <li className="text-danger">
                      {conflicts.length === 1 ? 'Un lugar ya lo administra' : `${conflicts.length} lugares ya los administra`} otra organización: resuélvelo
                      antes de aprobar.
                    </li>
                  )}
                </ul>
              }
              canDecide={canReview}
              noPermission={filledByMe ? 'La llenaste tú: la decide otra persona del equipo.' : 'Tu rol no puede decidir solicitudes de organizaciones.'}
              approveLabel="Aprobar y publicar"
              approveEffect="Entra al portal completo, su lugar se publica en la app y los lugares que dijo administrar se le asignan."
              rejectEffect="Su cuenta queda suspendida y no entra al portal. Al intentar entrar, lee tu nota."
              noteHint="Obligatoria si la rechazas. La lee al entrar al portal."
              approvedToast={`${application.name} ya está en K'Plan`}
              approveBlocker={
                conflicts.length > 0
                  ? 'Resuelve los lugares con dueño antes de aprobar.'
                  : placeGaps.length > 0
                    ? `Se aprueba cuando su lugar tenga ${placeGaps.join(' y ')}.`
                    : null
              }
              onDecide={(input) => action.mutateAsync({ kind: 'decide', input })}
              deciding={pending('decide')}
            />
          )}
          <DocumentsPanel
            requirements={requirements.map((item) => ({
              type: item.type,
              info: ORGANIZATION_DOCUMENT_INFO[item.type],
              required: item.required,
            }))}
            documents={application.documents}
            canReview={reviewingDocuments}
            onOpen={setDocumentId}
          />
          <Panel title={stopIds.length > 1 ? 'Sus lugares' : 'Su lugar'} description="Lo que va a aparecer en la app a su nombre." bodyClassName="p-0">
            {stopIds.length === 0 ? (
              <p className="p-5 text-body text-muted">No dijo administrar ningún lugar todavía.</p>
            ) : (
              <ul className="divide-y divide-divider">
                {stopIds.map((stopId) => {
                  const stop = places.data?.find((item) => item.id === stopId)
                  const owner = ownerOf(stopId)
                  const isNew = stopId === application.newStopId
                  return (
                    <li key={stopId}>
                      <Link to={paths.place(stopId)} className="group flex items-center gap-4 px-5 py-3 hover:bg-canvas">
                        {stop?.images[0] ? (
                          <img src={stop.images[0]} alt="" loading="lazy" className="size-12 rounded-sm bg-placeholder object-cover" />
                        ) : (
                          <span className="flex size-12 items-center justify-center rounded-sm bg-paper text-caption text-muted">Sin foto</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                            {stop?.name ?? stopId}
                            {isNew && <Tag tone="outline">{stop?.draft ? 'Borrador' : 'Nuevo'}</Tag>}
                          </span>
                          <span className={owner ? 'block text-small text-danger' : 'block text-small text-muted'}>
                            {owner ? `Ya lo administra ${owner.name}` : isNew ? `${stop?.category ?? ''} · ${application.assisted ? 'se creó con el alta asistida' : 'lo creó al postularse'}` : `${stop?.category ?? ''} · ya está en la app`}
                          </span>
                        </span>
                        <ArrowRight size={16} className="text-muted group-hover:text-ink" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Lo que declaró">
            <dl className="grid gap-3 text-body">
              {application.legalName && (
                <div>
                  <dt className="text-small text-muted">Razón social</dt>
                  <dd className="text-ink">{application.legalName}</dd>
                </div>
              )}
              {application.ruc && (
                <div>
                  <dt className="text-small text-muted">RUC</dt>
                  <dd className="font-semibold text-ink tabular-nums">{application.ruc}</dd>
                </div>
              )}
              <div>
                <dt className="text-small text-muted">Dirección</dt>
                <dd className="text-ink">
                  {application.address}, {application.city}
                </dd>
              </div>
              <div>
                <dt className="text-small text-muted">Qué ofrece</dt>
                <dd className="text-ink">{application.description}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Quién la representa">
            <div className="flex flex-col gap-3 text-body">
              <p>
                <span className="block font-semibold text-ink">{application.representative.name}</span>
                <span className="block text-small text-muted">
                  {application.representative.role} · cédula <span className="tabular-nums">{application.representative.cedula}</span>
                </span>
              </p>
              <a href={`mailto:${application.representative.email}`} className="flex items-center gap-2.5 text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
                <Mail size={16} className="text-muted" aria-hidden="true" />
                {application.representative.email}
              </a>
              <p className="flex items-center gap-2.5 text-ink tabular-nums">
                <Phone size={16} className="text-muted" aria-hidden="true" />
                {application.representative.phone}
              </p>
            </div>
          </Panel>
          <ReviewHistory history={application.history} applicantChannel="desde el portal" />
        </div>
      </div>

      <DocumentReviewSheet
        documents={application.documents}
        infoOf={(type) => ORGANIZATION_DOCUMENT_INFO[type as OrganizationDocumentType]}
        documentId={documentId}
        canReview={reviewingDocuments}
        reviewers={reviewers}
        readerHint={readerHint}
        onReview={async (id, input) => (await action.mutateAsync({ kind: 'document', documentId: id, input })).documents}
        reviewing={pending('document')}
        onSelect={setDocumentId}
        isRequired={(type) => requirements.find((item) => item.type === type)?.required ?? true}
        declaredOf={(type) => {
          const representative = application.representative
          if (type === 'cedula-representante') {
            return [
              { label: 'Nombre', value: representative.name },
              { label: 'Cédula', value: representative.cedula, strong: true },
            ]
          }
          if (type === 'carta-designacion') {
            return [
              { label: 'Alcaldía', value: application.name },
              { label: 'Persona designada', value: `${representative.name} · ${representative.role}` },
            ]
          }
          return [
            { label: 'Razón social', value: application.legalName ?? application.name },
            ...(application.ruc ? [{ label: 'RUC', value: application.ruc, strong: true }] : []),
            ...(type === 'matricula-municipal' ? [{ label: 'Dirección', value: `${application.address}, ${application.city}` }] : []),
            ...(type === 'ruc' ? [{ label: 'A qué se dedica', value: application.kind }] : []),
          ]
        }}
      />
      <RequestChangesDialog
        open={requesting}
        suggested={application.documents
          .filter((document) => document.status === 'rejected' && document.note)
          .map((document) => document.note)
          .join(' ')}
        readerHint={readerHint}
        description="La solicitud se pausa hasta que suba lo que falta y la mande de nuevo desde el portal."
        onSubmit={(note) => action.mutateAsync({ kind: 'request-changes', note })}
        submitting={pending('request-changes')}
        onClose={() => setRequesting(false)}
        successToast={`${application.name} lo verá al entrar al portal.`}
      />
    </div>
  )
}
