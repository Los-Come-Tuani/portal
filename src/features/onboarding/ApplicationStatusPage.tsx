import { ArrowRight, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, ErrorState, PageHeader, Panel, Skeleton, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useMyApplication, useReplaceDocument, useResubmit } from '@/data/hooks/use-admissions'
import { useAvailablePlaces, usePlaces } from '@/data/hooks/use-places'
import {
  ADMISSION_STAGE_LABELS,
  ADMISSION_STAGES,
  admissionRequirements,
  DOCUMENT_STATUS_LABELS,
  documentPages,
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_TYPE_LABELS,
  resubmitBlocker,
  type ApplicationDocumentInput,
  type OrganizationApplication,
  type OrganizationDocumentType,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { completeness } from '@/features/places/lib/completeness'
import { Notice } from '@/features/verification/components/ReviewControls'
import { ReviewHistory } from '@/features/verification/components/ReviewHistory'
import { StageTrack, type StageStep } from '@/features/verification/components/StageTrack'
import { DOCUMENT_STATUS_TONES, stepState, waitingMinutes } from '@/features/verification/status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { toLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatPercent } from '@/lib/format'
import { DocumentUpload } from './components/DocumentUpload'

const DESCRIPTIONS: Record<string, string> = {
  documents: "El equipo de K'Plan está revisando tus documentos uno por uno.",
  decision: 'Tus documentos están en orden: falta la decisión final.',
  changes_requested: 'Te pidieron una corrección. Sube lo que falta y manda la solicitud de nuevo.',
  approved: "Ya estás en K'Plan: tu lugar aparece en la app.",
  rejected: 'Tu solicitud no fue aprobada.',
}

function applicantSteps(application: OrganizationApplication): StageStep[] {
  const current = ADMISSION_STAGES.indexOf(application.stage)
  const accepted = application.documents.filter((document) => document.status === 'accepted').length
  return ADMISSION_STAGES.map((stage, index) => {
    const state = stepState(index, current, application.status)
    const detail =
      stage === 'documents'
        ? `${accepted} de ${application.documents.length} aceptados`
        : application.status === 'approved'
          ? 'Aprobada'
          : application.status === 'rejected'
            ? 'No aprobada'
            : state === 'current'
              ? 'El equipo decide'
              : 'Al final'
    return { key: stage, label: ADMISSION_STAGE_LABELS[stage], detail, state }
  })
}

/** Donde un negocio o una alcaldía ve en qué va su solicitud y corrige lo que le piden. */
export function ApplicationStatusPage() {
  useDocumentTitle('Tu solicitud')
  const application = useMyApplication()
  if (application.isError) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />
  if (!application.data) return <Skeleton className="h-96" />
  return <StatusView application={application.data} />
}

function StatusView({ application }: { application: OrganizationApplication }) {
  const { organizationId } = useSession()
  const resubmit = useResubmit(application.id)
  const toast = useToast()
  const { today, minutes } = useNow()
  const open = application.status === 'changes_requested' || (application.status === 'in_review' && application.stage === 'documents')
  const blocker = resubmitBlocker(application)
  const correction = application.history.findLast((event) => event.kind === 'changes_requested')
  const total = application.documents.length
  const accepted = application.documents.filter((document) => document.status === 'accepted').length
  const rejected = application.documents.filter((document) => document.status === 'rejected')
  const rejectedNames = rejected.map((document) => ORGANIZATION_DOCUMENT_INFO[document.type].label.toLowerCase()).join(', ')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tu solicitud"
        description={DESCRIPTIONS[application.status === 'in_review' ? application.stage : application.status]}
      />

      {(application.status === 'in_review' || application.status === 'changes_requested') && (
        <p className="max-w-[84ch] text-lead text-muted">
          Van <strong className="font-semibold text-ink tabular-nums">{accepted} de {total}</strong> documentos aceptados
          {rejected.length > 0 ? (
            <>
              ; tienes que subir de nuevo: <strong className="font-semibold text-ink">{rejectedNames}</strong>.
            </>
          ) : total - accepted > 0 ? (
            <>
              ; <strong className="font-semibold text-ink tabular-nums">{total - accepted}</strong> en revisión.
            </>
          ) : (
            ': falta la decisión final.'
          )}
        </p>
      )}

      {application.status === 'changes_requested' && correction && rejected.length === 0 && (
        <Notice tone="neutral" title="El equipo de K'Plan te pidió una corrección">
          {correction.text.replace(/^Pidió una corrección: /, '')}
        </Notice>
      )}
      {application.status === 'rejected' && (
        <Notice tone="danger" title="Tu solicitud no fue aprobada">
          {application.decisionNote}
        </Notice>
      )}

      <StageTrack
        steps={applicantSteps(application)}
        waitingMinutes={waitingMinutes(application.stageSince, toLocalDateTime(today, minutes))}
        waitingLabel="Esperando tu corrección"
        blocker={application.status === 'changes_requested' ? blocker : null}
        actions={
          application.status === 'changes_requested' && (
            <Button
              icon={<Send size={16} />}
              disabled={blocker !== null}
              loading={resubmit.isPending}
              onClick={() =>
                resubmit.mutate(undefined, {
                  onSuccess: () => toast({ title: 'Mandaste la solicitud de nuevo', description: 'El equipo revisa lo que subiste.' }),
                  onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
                })
              }
            >
              Mandar de nuevo
            </Button>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Tus documentos"
            description={open ? 'Si te piden corregir uno, súbelo de nuevo aquí mismo.' : 'Lo que mandaste y cómo quedó cada uno.'}
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-divider">
              {admissionRequirements(application.type)
                .filter((item) => item.required || open || application.documents.some((document) => document.type === item.type))
                .map((item) => (
                  <ApplicantDocumentRow key={item.type} application={application} type={item.type} required={item.required} open={open} />
                ))}
            </ul>
          </Panel>
          <ReviewHistory
            history={application.history.map((event) => (event.actorId === null ? { ...event, actorName: 'Tú' } : event))}
            applicantChannel="desde el portal"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <YourPlaces application={application} organizationId={organizationId} />
          <Panel title="Lo que mandaste">
            <dl className="grid gap-3 text-body">
              <div>
                <dt className="text-small text-muted">{ORGANIZATION_TYPE_LABELS[application.type]}</dt>
                <dd className="font-semibold text-ink">{application.name}</dd>
                {application.legalName && <dd className="text-small text-muted">{application.legalName} · RUC {application.ruc}</dd>}
              </div>
              <div>
                <dt className="text-small text-muted">Dirección</dt>
                <dd className="text-ink">
                  {application.address}, {application.city}
                </dd>
              </div>
              <div>
                <dt className="text-small text-muted">La representa</dt>
                <dd className="text-ink">
                  {application.representative.name} · {application.representative.role}
                </dd>
              </div>
              <div>
                <dt className="text-small text-muted">Enviada</dt>
                <dd className="text-ink tabular-nums">{formatDateTime(application.submittedAt)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function ApplicantDocumentRow({
  application,
  type,
  required,
  open,
}: {
  application: OrganizationApplication
  type: OrganizationDocumentType
  required: boolean
  open: boolean
}) {
  const replace = useReplaceDocument(application.id)
  const toast = useToast()
  const document = application.documents.find((item) => item.type === type)
  const info = ORGANIZATION_DOCUMENT_INFO[type]
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<ApplicationDocumentInput | undefined>(undefined)
  const needsUpload = open && (!document || document.status === 'rejected')
  const showUpload = editing || (needsUpload && document?.status === 'rejected')

  const change = (next: ApplicationDocumentInput | null) => {
    setValue(next ?? undefined)
    if (!next || documentPages(type).some((label) => !next.pages.some((page) => page.label === label))) return
    replace.mutate(next, {
      onSuccess: () => {
        toast({ title: `Subiste ${info.label.toLowerCase()}` })
        setEditing(false)
        setValue(undefined)
      },
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    })
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-body font-semibold text-ink">
            {info.label}
            {!required && <span className="text-caption font-normal text-hint">Opcional</span>}
          </p>
          <p className="text-small text-muted">
            {document ? `${document.fileName} · subido el ${formatDate(document.uploadedAt.slice(0, 10))}` : info.issuer}
          </p>
          {document?.status === 'rejected' && document.note && (
            <p className="mt-1.5 text-body text-danger">
              <span className="font-semibold">Qué corregir:</span> {document.note}
            </p>
          )}
        </div>
        {document ? (
          <Tag tone={DOCUMENT_STATUS_TONES[document.status]}>
            {document.status === 'pending' ? 'En revisión' : DOCUMENT_STATUS_LABELS[document.status]}
          </Tag>
        ) : (
          open && (
            <Button size="sm" variant="secondary" onClick={() => setEditing((current) => !current)}>
              {editing ? 'Cancelar' : 'Subir'}
            </Button>
          )
        )}
      </div>
      {showUpload && (
        <div className="mt-3">
          <DocumentUpload type={type} required={required} value={value} onChange={change} variant="inline" />
          {replace.isPending && <p className="mt-2 text-caption text-muted">Guardando…</p>}
        </div>
      )}
    </li>
  )
}

function YourPlaces({ application, organizationId }: { application: OrganizationApplication; organizationId: string | undefined }) {
  const own = usePlaces({ organizationId }, !!organizationId)
  const available = useAvailablePlaces(application.claimedStopIds.length > 0 ? application.city : '')
  const draft = own.data?.find((stop) => stop.id === application.newStopId)
  const claimed = (available.data ?? []).filter((stop) => application.claimedStopIds.includes(stop.id))
  const approved = application.status === 'approved'

  if (!draft && application.claimedStopIds.length === 0) return null

  return (
    <Panel title={application.claimedStopIds.length + (draft ? 1 : 0) > 1 ? 'Tus lugares' : 'Tu lugar'}>
      <div className="flex flex-col gap-4">
        {draft && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                {draft.name}
                {!approved && <Tag tone="outline">Borrador</Tag>}
              </p>
              <p className="text-small text-muted">
                {approved ? 'Publicado en la app.' : 'Nadie lo ve todavía: se publica cuando te aprueben. Ve completando su ficha.'}
              </p>
            </div>
            <div>
              <div className="flex justify-between text-caption text-muted">
                <span>Ficha</span>
                <span className="font-semibold text-ink tabular-nums">{formatPercent(completeness(draft))}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                <div className={cn('h-full rounded-full', approved ? 'bg-confirmed' : 'bg-planned')} style={{ width: `${completeness(draft) * 100}%` }} />
              </div>
            </div>
            <ButtonLink to={paths.place(draft.id)} icon={<ArrowRight size={16} />} size="sm" className="self-start">
              Completar la ficha
            </ButtonLink>
          </div>
        )}
        {application.claimedStopIds.length > 0 && (
          <div className={draft ? 'border-t border-divider pt-4' : undefined}>
            <p className="text-small text-muted">{approved ? 'Ya los administras:' : 'Dijiste que administras; se te asignan al aprobarte:'}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-body text-ink">
              {(claimed.length > 0 ? claimed.map((stop) => stop.name) : application.claimedStopIds).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            {approved && (
              <Link to={paths.places} className="mt-2 inline-block text-small font-semibold text-brand-strong hover:underline">
                Ir a tus lugares →
              </Link>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
