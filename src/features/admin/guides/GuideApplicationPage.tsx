import { ArrowLeft, ArrowRight, MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ErrorState, Skeleton, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useGuideAction, useGuideApplication, useReviewers } from '@/data/hooks/use-guides'
import {
  advanceBlocker,
  APPLICATION_STATUS_LABELS,
  BACKGROUND_CHECK_INFO,
  checkProgress,
  DOCUMENT_TYPE_INFO,
  documentProgress,
  DOCUMENT_TYPES,
  requiredDocuments,
  SERVICE_ROLE_LABELS,
  STAGE_LABELS,
  type DocumentType,
  type GuideApplication,
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
import { formatDate, formatDateTime, plural } from '@/lib/format'
import { ApplicantContact, ApplicantProfile } from './components/ApplicantPanels'
import { BackgroundPanel } from './components/BackgroundPanel'
import { guideSteps } from './lib/queue'

const READER_HINT = 'El guía lo lee tal cual en la app.'

export function GuideApplicationPage() {
  const { applicationId = '' } = useParams()
  const application = useGuideApplication(applicationId)
  const reviewers = useReviewers()
  useDocumentTitle(application.data?.name ?? 'Solicitud')

  if (application.isError) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />
  if (!application.data) return <Skeleton className="h-96" />
  return <ApplicationView application={application.data} reviewers={reviewers.data ?? []} />
}

function ApplicationView({ application, reviewers }: { application: GuideApplication; reviewers: readonly Reviewer[] }) {
  const { can } = useSession()
  const action = useGuideAction(application.id)
  const toast = useToast()
  const { today, minutes } = useNow()
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  const inReview = application.status === 'in_review'
  const canReview = can('guides.review')
  const reviewingDocuments = canReview && inReview && application.stage === 'documents'
  const blocker = application.stage === 'decision' ? null : advanceBlocker(application)
  const pending = (kind: string) => action.isPending && action.variables?.kind === kind
  const lastEvent = (kind: GuideApplication['history'][number]['kind']) => application.history.findLast((event) => event.kind === kind)
  const required = new Set(requiredDocuments(application))

  const advance = () =>
    action.mutate(
      { kind: 'advance' },
      {
        onSuccess: (updated) => toast({ title: `Pasó a ${STAGE_LABELS[updated.stage].toLowerCase()}` }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  const documents = documentProgress(application)
  const checks = checkProgress(application)
  const flagged = application.background.filter((check) => check.status === 'flagged')

  return (
    <div className="flex flex-col gap-6">
      <Link to={paths.guides} className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        Guías y traductores
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <img src={application.photoUrl} alt="" className="size-16 shrink-0 rounded-full bg-placeholder object-cover" />
          <div className="min-w-0">
            <h1 className="text-headline font-bold tracking-tight text-ink">{application.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-small text-muted">
              <Tag tone="ink">{SERVICE_ROLE_LABELS[application.serviceRole]}</Tag>
              <Tag tone={APPLICATION_STATUS_TONES[application.status]}>
                {inReview ? `${APPLICATION_STATUS_LABELS.in_review} · ${STAGE_LABELS[application.stage]}` : APPLICATION_STATUS_LABELS[application.status]}
              </Tag>
              <span>
                {application.city} · {plural(application.yearsExperience, 'año', 'años')} de experiencia · envió su solicitud el{' '}
                {formatDate(application.submittedAt.slice(0, 10))}
              </span>
            </div>
          </div>
        </div>
        <AssigneeMenu
          assigneeId={application.assigneeId}
          reviewers={reviewers}
          closed={application.status === 'approved' || application.status === 'rejected'}
          onAssign={(assigneeId) => action.mutateAsync({ kind: 'assign', assigneeId })}
          assigning={pending('assign')}
        />
      </header>

      {application.status === 'changes_requested' && (
        <Notice tone="neutral" title={`Esperando a que ${application.name.split(' ')[0]} corrija desde la app`}>
          {lastEvent('changes_requested')?.text.replace(/^Pidió una corrección: /, '')}
        </Notice>
      )}
      {application.status === 'approved' && application.decidedAt && (
        <Notice tone="confirmed" title={`Verificado el ${formatDateTime(application.decidedAt)}`}>
          {application.decisionNote || `Aprobado por ${lastEvent('approved')?.actorName ?? "el equipo de K'Plan"}. Aparece en la app como verificado.`}
        </Notice>
      )}
      {application.status === 'rejected' && application.decidedAt && (
        <Notice tone="danger" title={`Rechazado el ${formatDateTime(application.decidedAt)} por ${lastEvent('rejected')?.actorName ?? "el equipo de K'Plan"}`}>
          {application.decisionNote}
        </Notice>
      )}

      <StageTrack
        steps={guideSteps(application)}
        waitingMinutes={waitingMinutes(application.stageSince, toLocalDateTime(today, minutes))}
        waitingLabel="Esperando al guía"
        blocker={inReview && canReview ? blocker : null}
        actions={
          inReview &&
          canReview &&
          application.stage !== 'decision' && (
            <>
              <Button variant="secondary" icon={<MessageSquareWarning size={16} />} onClick={() => setRequesting(true)}>
                Pedir corrección
              </Button>
              <Button icon={<ArrowRight size={16} />} disabled={blocker !== null} loading={pending('advance')} onClick={advance}>
                {application.stage === 'documents' ? 'Pasar a antecedentes' : 'Pasar a decisión'}
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
              description="Lo que se revisó, en una mirada. Al aprobar, aparece en la app como verificado."
              summary={
                <>
                  <ul className="flex flex-col gap-2 text-body text-ink">
                    <li>
                      <span className="font-semibold tabular-nums">
                        {documents.accepted} de {documents.required}
                      </span>{' '}
                      documentos aceptados.
                    </li>
                    <li>
                      <span className="font-semibold tabular-nums">{plural(checks.clear, 'verificación', 'verificaciones')}</span> sin
                      problemas
                      {checks.flagged > 0 && (
                        <>
                          {' y '}
                          <span className="font-semibold text-danger tabular-nums">{checks.flagged} con observaciones</span>
                        </>
                      )}
                      .
                    </li>
                  </ul>
                  {flagged.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {flagged.map((check) => (
                        <li key={check.type} className="rounded-kp border border-danger/25 bg-danger/5 px-4 py-3">
                          <p className="text-small font-semibold text-danger">{BACKGROUND_CHECK_INFO[check.type].label}</p>
                          <p className="mt-0.5 text-body text-ink">{check.note}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              }
              canDecide={can('guides.decide')}
              noPermission={
                <>
                  La decisión la toma alguien con el permiso <span className="font-semibold text-ink">Decidir solicitudes</span>, como
                  Coordinación de verificación.
                </>
              }
              approveLabel={`Aprobar como ${SERVICE_ROLE_LABELS[application.serviceRole].toLowerCase()}`}
              approveEffect="Aparece en la app como verificado, con los idiomas y servicios que revisaste."
              rejectEffect="Le llega tu nota en la app. Puede volver a enviar su solicitud cuando corrija lo que se le pide."
              noteHint="Obligatoria si lo rechazas. Llega a la app junto con la decisión."
              approvedToast={`${application.name} ya está verificado`}
              onDecide={(input) => action.mutateAsync({ kind: 'decide', input })}
              deciding={pending('decide')}
            />
          )}
          <DocumentsPanel
            requirements={DOCUMENT_TYPES.filter((type) => required.has(type)).map((type) => ({
              type,
              info: DOCUMENT_TYPE_INFO[type],
              required: true,
            }))}
            documents={application.documents}
            canReview={reviewingDocuments}
            onOpen={setDocumentId}
          />
          <BackgroundPanel
            application={application}
            canReview={canReview && inReview && application.stage === 'background'}
            reviewers={reviewers}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ApplicantProfile application={application} />
          <ApplicantContact application={application} />
          <ReviewHistory history={application.history} applicantChannel="desde la app" />
        </div>
      </div>

      <DocumentReviewSheet
        documents={application.documents}
        infoOf={(type) => DOCUMENT_TYPE_INFO[type as DocumentType]}
        documentId={documentId}
        canReview={reviewingDocuments}
        reviewers={reviewers}
        readerHint={READER_HINT}
        onReview={async (id, input) => (await action.mutateAsync({ kind: 'document', documentId: id, input })).documents}
        reviewing={pending('document')}
        onSelect={setDocumentId}
        declaredOf={(type) => [
          { label: 'Nombre', value: application.name },
          ...(type === 'certificado-idioma' ? [{ label: 'Dice que habla', value: application.languages.join(', ') }] : []),
          ...(type === 'carne-intur' ? [{ label: 'Especialidades', value: application.specialties.join(', ') }] : []),
        ]}
      />
      <RequestChangesDialog
        open={requesting}
        suggested={application.documents
          .filter((document) => document.status === 'rejected' && document.note)
          .map((document) => document.note)
          .join(' ')}
        readerHint={READER_HINT}
        description="La solicitud se pausa hasta que suba lo que falta desde la app."
        onSubmit={(note) => action.mutateAsync({ kind: 'request-changes', note })}
        submitting={pending('request-changes')}
        onClose={() => setRequesting(false)}
        successToast={`${application.name} lo verá en la app.`}
      />
    </div>
  )
}
