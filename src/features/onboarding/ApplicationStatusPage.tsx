import { ArrowRight, Check, Pencil } from 'lucide-react'
import { useEffect } from 'react'
import { paths } from '@/app/router/paths'
import { ButtonLink, ErrorState, PageHeader, Panel, Skeleton, Tag } from '@/components/ui'
import { useMyApplication } from '@/data/hooks/use-applications'
import { canCorrect, ORGANIZATION_KIND_LABELS, REQUEST_STATUS_LABELS, type MyApplication, type RequestStatus } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { Notice } from '@/features/verification/components/ReviewControls'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { ApplicationSummary } from './components/ApplicationSummary'

const DESCRIPTIONS: Record<RequestStatus, string> = {
  submitted: "Recibimos tu solicitud. El equipo de K'Plan la toma por orden de llegada y te avisa por correo.",
  in_review: "El equipo de K'Plan está revisando tu solicitud.",
  approved: "Ya estás en K'Plan: tu organización es visible para el turista.",
  rejected: 'El equipo no aprobó tu solicitud. Corrígela y vuelve a enviarla.',
}

/** Una fecha del API (`2026-10-05T14:30:00Z`) con la hora de Nicaragua, como el resto del portal. */
const when = (iso: string) => formatDateTime(nowLocalDateTime(new Date(iso)))

type StepState = 'done' | 'current' | 'upcoming' | 'failed'

function trackOf(status: RequestStatus): { label: string; detail: string; state: StepState }[] {
  const decided = status === 'approved' || status === 'rejected'
  return [
    { label: 'Enviada', detail: 'La recibimos', state: 'done' },
    {
      label: 'En revisión',
      detail: status === 'submitted' ? 'Esperando a que la tomen' : status === 'in_review' ? 'La están revisando' : 'Revisada',
      state: decided ? 'done' : status === 'in_review' ? 'current' : 'upcoming',
    },
    {
      label: 'Decisión',
      detail: status === 'approved' ? 'Aprobada' : status === 'rejected' ? 'No aprobada' : 'Al final',
      state: status === 'approved' ? 'done' : status === 'rejected' ? 'failed' : 'upcoming',
    },
  ]
}

function Track({ status }: { status: RequestStatus }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="En qué va tu solicitud">
      {trackOf(status).map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={cn(
            'flex items-start gap-3 rounded-kp border bg-surface p-4',
            step.state === 'current' ? 'border-ink' : step.state === 'failed' ? 'border-danger/50' : 'border-divider',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-small font-semibold tabular-nums',
              step.state === 'done' && 'bg-confirmed text-white',
              step.state === 'current' && 'bg-ink text-canvas',
              step.state === 'failed' && 'bg-danger text-white',
              step.state === 'upcoming' && 'border border-outline text-muted',
            )}
          >
            {step.state === 'done' ? <Check size={14} strokeWidth={2.5} /> : index + 1}
          </span>
          <span>
            <span className={cn('block text-body font-semibold', step.state === 'upcoming' ? 'text-muted' : 'text-ink')}>{step.label}</span>
            <span className="block text-small text-muted">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Donde quien se postuló ve en qué va su solicitud, y la corrige si el equipo la rechazó. */
export function ApplicationStatusPage() {
  useDocumentTitle('Tu solicitud')
  const application = useMyApplication()
  if (application.isError) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />
  if (!application.data) return <Skeleton className="h-96" />
  return <StatusView application={application.data} />
}

function StatusView({ application }: { application: MyApplication }) {
  const { organization } = useSession()
  const { refreshUser } = useAuth()
  const approved = application.status === 'approved'

  // El equipo aprobó mientras tenía la página abierta: la sesión todavía dice "en revisión", y de ella
  // depende el menú. Se vuelve a pedir para que el portal le abra lo que ya puede usar.
  useEffect(() => {
    if (approved && organization?.status === 'pending') void refreshUser().catch(() => undefined)
  }, [approved, organization?.status, refreshUser])

  const resolution = application.resolution

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tu solicitud"
        description={DESCRIPTIONS[application.status]}
        actions={
          <>
            <Tag tone={approved ? 'confirmed' : application.status === 'rejected' ? 'danger' : 'planned'}>{REQUEST_STATUS_LABELS[application.status]}</Tag>
            <span className="text-small text-muted">Enviada el {when(application.submittedAt)}</span>
          </>
        }
      />

      <Track status={application.status} />

      {application.status === 'rejected' && resolution && (
        <Notice tone="danger" title={resolution.reason ? `No la aprobamos: ${resolution.reason.label.toLowerCase()}` : 'No la aprobamos'}>
          {resolution.note || 'Revisa tus datos y vuelve a enviarla.'}
        </Notice>
      )}
      {approved && <Notice tone="confirmed" title="Tu solicitud fue aprobada" />}

      <div className="flex flex-wrap items-center gap-3">
        {canCorrect(application) && (
          <ButtonLink to={paths.correctApplication} variant="primary" icon={<Pencil size={16} />}>
            Corregir y volver a enviar
          </ButtonLink>
        )}
        {approved && (
          <ButtonLink to={paths.home} variant="primary" icon={<ArrowRight size={16} />}>
            Ir al inicio
          </ButtonLink>
        )}
      </div>

      <Panel title="Lo que mandaste" description={`${ORGANIZATION_KIND_LABELS[application.kind]}: ${application.organizationName}`}>
        <ApplicationSummary data={application.submitted} />
      </Panel>
    </div>
  )
}
