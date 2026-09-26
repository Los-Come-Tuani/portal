import { ArrowLeft, ArrowRight, ChevronDown, MessageSquareWarning, UserCheck, UserMinus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import {
  Avatar,
  Button,
  Dialog,
  ErrorState,
  Field,
  Menu,
  MenuItem,
  Skeleton,
  Tag,
  Textarea,
  useToast,
} from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useGuideAction, useGuideApplication, useReviewers } from '@/data/hooks/use-guides'
import {
  advanceBlocker,
  APPLICATION_STATUS_LABELS,
  SERVICE_ROLE_LABELS,
  STAGE_LABELS,
  type GuideApplication,
  type Reviewer,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { toLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, plural } from '@/lib/format'
import { ApplicantContact, ApplicantProfile } from './components/ApplicantPanels'
import { ApplicationHistory } from './components/ApplicationHistory'
import { BackgroundPanel } from './components/BackgroundPanel'
import { DecisionPanel } from './components/DecisionPanel'
import { DocumentReviewSheet } from './components/DocumentReviewSheet'
import { DocumentsPanel } from './components/DocumentsPanel'
import { StageTrack } from './components/StageTrack'
import { waitingMinutes } from './lib/queue'
import { APPLICATION_STATUS_TONES } from './status'

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
  const blocker = application.stage === 'decision' ? null : advanceBlocker(application)
  const lastEvent = (kind: GuideApplication['history'][number]['kind']) => application.history.findLast((event) => event.kind === kind)

  const advance = () =>
    action.mutate(
      { kind: 'advance' },
      {
        onSuccess: (updated) => toast({ title: `Pasó a ${STAGE_LABELS[updated.stage].toLowerCase()}` }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

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
        <AssigneeMenu application={application} reviewers={reviewers} />
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
        application={application}
        waitingMinutes={waitingMinutes(application, toLocalDateTime(today, minutes))}
        blocker={inReview && canReview ? blocker : null}
        actions={
          inReview &&
          canReview &&
          application.stage !== 'decision' && (
            <>
              <Button variant="secondary" icon={<MessageSquareWarning size={16} />} onClick={() => setRequesting(true)}>
                Pedir corrección
              </Button>
              <Button
                icon={<ArrowRight size={16} />}
                disabled={blocker !== null}
                loading={action.isPending && action.variables?.kind === 'advance'}
                onClick={advance}
              >
                {application.stage === 'documents' ? 'Pasar a antecedentes' : 'Pasar a decisión'}
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {application.stage === 'decision' && inReview && <DecisionPanel application={application} canDecide={can('guides.decide')} />}
          <DocumentsPanel
            application={application}
            canReview={canReview && inReview && application.stage === 'documents'}
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
          <ApplicationHistory history={application.history} />
        </div>
      </div>

      <DocumentReviewSheet
        application={application}
        documentId={documentId}
        canReview={canReview && inReview && application.stage === 'documents'}
        reviewers={reviewers}
        onSelect={setDocumentId}
      />
      <RequestChangesDialog open={requesting} application={application} onClose={() => setRequesting(false)} />
    </div>
  )
}

const NOTICE_TONES = {
  neutral: { box: 'border-ink/15 bg-surface', title: 'text-ink' },
  confirmed: { box: 'border-confirmed/30 bg-confirmed/5', title: 'text-confirmed' },
  danger: { box: 'border-danger/25 bg-danger/5', title: 'text-danger' },
}

function Notice({ tone, title, children }: { tone: keyof typeof NOTICE_TONES; title: string; children?: ReactNode }) {
  return (
    <div role="status" className={cn('rounded-kp border px-5 py-4', NOTICE_TONES[tone].box)}>
      <p className={cn('text-body font-semibold', NOTICE_TONES[tone].title)}>{title}</p>
      {children && <p className="mt-1 max-w-[76ch] text-body text-ink">{children}</p>}
    </div>
  )
}

function AssigneeMenu({ application, reviewers }: { application: GuideApplication; reviewers: readonly Reviewer[] }) {
  const { user } = useSession()
  const action = useGuideAction(application.id)
  const toast = useToast()
  const assignee = reviewers.find((reviewer) => reviewer.id === application.assigneeId)
  const closed = application.status === 'approved' || application.status === 'rejected'

  const assign = (assigneeId: string | null) =>
    action.mutate(
      { kind: 'assign', assigneeId },
      {
        onSuccess: () =>
          toast({
            title:
              assigneeId === null
                ? 'La solicitud quedó sin responsable'
                : assigneeId === user.id
                  ? 'Tomaste la solicitud'
                  : `Asignada a ${reviewers.find((reviewer) => reviewer.id === assigneeId)?.name}`,
          }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  if (closed) {
    return assignee ? (
      <span className="inline-flex items-center gap-2 text-small text-muted">
        <Avatar name={assignee.name} size="sm" />
        Llevó el caso: <span className="font-medium text-ink">{assignee.name}</span>
      </span>
    ) : null
  }

  if (!assignee) {
    return (
      <Button variant="secondary" icon={<UserCheck size={16} />} loading={action.isPending && action.variables?.kind === 'assign'} onClick={() => assign(user.id)}>
        Tomar solicitud
      </Button>
    )
  }

  return (
    <Menu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="inline-flex h-10 items-center gap-2 rounded-kp px-2.5 text-small text-muted transition-colors duration-150 hover:bg-ink/6"
        >
          <Avatar name={assignee.name} size="sm" />
          <span>
            Responsable: <span className="font-semibold text-ink">{assignee.id === user.id ? 'tú' : assignee.name}</span>
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-2.5 pt-1.5 pb-1 text-caption text-muted">Asignar a</p>
          {reviewers
            .filter((reviewer) => reviewer.id !== assignee.id)
            .map((reviewer) => (
              <MenuItem
                key={reviewer.id}
                icon={<Avatar name={reviewer.name} size="xs" />}
                onSelect={() => {
                  close()
                  assign(reviewer.id)
                }}
              >
                {reviewer.id === user.id ? 'Tomarla yo' : reviewer.name}
                {reviewer.canDecide && <span className="ml-auto text-caption text-muted">decide</span>}
              </MenuItem>
            ))}
          <MenuItem
            icon={<UserMinus size={16} />}
            onSelect={() => {
              close()
              assign(null)
            }}
          >
            Dejar sin responsable
          </MenuItem>
        </>
      )}
    </Menu>
  )
}

function RequestChangesDialog({ open, application, onClose }: { open: boolean; application: GuideApplication; onClose: () => void }) {
  const action = useGuideAction(application.id)
  const toast = useToast()
  const suggested = application.documents
    .filter((document) => document.status === 'rejected' && document.note)
    .map((document) => document.note)
    .join(' ')
  const [state, setState] = useState({ open, note: suggested, error: '' })
  if (state.open !== open) setState({ open, note: suggested, error: '' })

  const submit = () => {
    if (state.note.trim().length < 10) {
      setState((current) => ({ ...current, error: 'Explica qué tiene que corregir' }))
      return
    }
    action.mutate(
      { kind: 'request-changes', note: state.note.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Corrección pedida', description: `${application.name} lo verá en la app.` })
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pedir una corrección"
      description="La solicitud se pausa hasta que suba lo que falta desde la app."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={action.isPending}>
            Pedir corrección
          </Button>
        </>
      }
    >
      <Field label="Qué tiene que corregir" hint="Lo lee tal cual en la app: sé concreto." error={state.error || undefined}>
        {(control) => (
          <Textarea
            {...control}
            data-autofocus
            rows={4}
            value={state.note}
            onChange={(event) => setState((current) => ({ ...current, note: event.target.value, error: '' }))}
          />
        )}
      </Field>
    </Dialog>
  )
}
