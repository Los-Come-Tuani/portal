import { BadgeCheck, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import {
  Avatar,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  SegmentedControl,
  SkeletonRows,
  Table,
  Tabs,
  Tag,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { useGuideApplications, useReviewers } from '@/data/hooks/use-guides'
import { SERVICE_ROLE_LABELS, type GuideApplication } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { toLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatWaiting, plural } from '@/lib/format'
import { ReviewSegments } from './components/ReviewSegments'
import { QUEUE_TABS, queueTab, reviewSegments, STAGE_LIMIT_MINUTES, waitingMinutes, type QueueTab } from './lib/queue'

type Scope = 'todas' | 'mias'

const TAB_HELP: Record<QueueTab, string> = {
  documents: 'Revisa cada documento contra su lista. Si todos quedan aceptados, pasa la solicitud a antecedentes.',
  background: 'Verifica con la Policía, INTUR y sus referencias. Con todo verificado, pasa a decisión.',
  decision: 'Documentos y antecedentes ya revisados: falta aprobar o rechazar.',
  changes_requested: 'Se le pidió una corrección. Vuelven a documentos cuando el guía sube lo que falta desde la app.',
  approved: 'Aparecen en la app como verificados.',
  rejected: 'No pasaron la verificación. Pueden volver a enviar su solicitud desde la app.',
}

export function GuideApplicationsPage() {
  useDocumentTitle('Guías y traductores')
  const navigate = useNavigate()
  const { user, can } = useSession()
  const applications = useGuideApplications()
  const reviewers = useReviewers()
  const { today, minutes } = useNow()
  const now = toLocalDateTime(today, minutes)
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const all = applications.data ?? []
  const countOf = (tab: QueueTab) => all.filter((item) => queueTab(item) === tab).length
  const fallbackTab: QueueTab = !can('guides.review')
    ? 'decision'
    : ((['documents', 'background', 'decision'] as const).find((tab) => countOf(tab) > 0) ?? 'documents')
  const tab = (QUEUE_TABS.find((item) => item.value === params.get('etapa'))?.value ?? fallbackTab) as QueueTab
  const scope: Scope = params.get('de') === 'mi' ? 'mias' : 'todas'

  const update = (next: { tab?: QueueTab; scope?: Scope }) => {
    const value = new URLSearchParams(params)
    value.set('etapa', next.tab ?? tab)
    if ((next.scope ?? scope) === 'mias') value.set('de', 'mi')
    else value.delete('de')
    setParams(value, { replace: true })
  }

  const decided = tab === 'approved' || tab === 'rejected'
  const shown = all
    .filter((item) => queueTab(item) === tab)
    .filter((item) => scope === 'todas' || item.assigneeId === user.id)
    .filter((item) => !search || `${item.name} ${item.email} ${item.city}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (decided ? b.stageSince.localeCompare(a.stageSince) : a.stageSince.localeCompare(b.stageSince)))

  const inReview = all.filter((item) => item.status === 'in_review')
  const oldest = inReview.reduce((max, item) => Math.max(max, waitingMinutes(item, now)), 0)
  const reviewerName = (id: string | null) => reviewers.data?.find((reviewer) => reviewer.id === id)?.name ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Guías y traductores"
        description="Envían sus documentos desde la app. Nadie aparece como verificado hasta pasar los documentos, los antecedentes y la decisión final."
      />

      {applications.isSuccess && (
        <p className="max-w-[84ch] text-lead text-muted">
          {inReview.length === 0 ? (
            'No hay solicitudes en revisión.'
          ) : (
            <>
              Hay <strong className="font-semibold text-ink">{plural(inReview.length, 'solicitud', 'solicitudes')}</strong> en
              revisión: <strong className="font-semibold text-ink tabular-nums">{countOf('documents')}</strong> en documentos,{' '}
              <strong className="font-semibold text-ink tabular-nums">{countOf('background')}</strong> en antecedentes y{' '}
              <strong className="font-semibold text-ink tabular-nums">{countOf('decision')}</strong> esperando decisión. La que más
              espera lleva <strong className={cn('font-semibold', oldest > STAGE_LIMIT_MINUTES ? 'text-danger' : 'text-ink')}>{formatWaiting(oldest)}</strong> en
              su etapa.
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Tabs
          label="Etapa"
          value={tab}
          onChange={(value) => update({ tab: value })}
          items={QUEUE_TABS.map((item) => ({ ...item, count: countOf(item.value) }))}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[68ch] text-small text-muted">{TAB_HELP[tab]}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Responsable"
              size="sm"
              value={scope}
              onChange={(value) => update({ scope: value })}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'mias', label: 'Asignadas a mí' },
              ]}
            />
            <Input
              type="search"
              aria-label="Buscar solicitante"
              placeholder="Buscar"
              leading={<Search size={16} />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-56"
            />
          </div>
        </div>
      </div>

      {applications.isPending ? (
        <SkeletonRows rows={5} />
      ) : applications.isError ? (
        <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<BadgeCheck size={20} />} title={scope === 'mias' ? 'No tienes solicitudes en esta etapa' : 'No hay solicitudes en esta etapa'}>
          {scope === 'mias' ? 'Mira las de todo el equipo con "Todas" y toma una sin responsable.' : 'Cuando un guía o traductor envíe sus documentos desde la app, aparece aquí.'}
        </EmptyState>
      ) : (
        <div className="rounded-kp border border-divider bg-surface">
          <Table caption={`Solicitudes: ${QUEUE_TABS.find((item) => item.value === tab)?.label}`}>
            <thead>
              <tr>
                <Th>Solicitante</Th>
                <Th>Ofrece</Th>
                <Th>Ciudad</Th>
                {!decided && tab !== 'changes_requested' && <Th className="w-44">Revisión</Th>}
                <Th>{decided ? 'Decidida' : tab === 'changes_requested' ? 'Esperando al guía' : 'En la etapa'}</Th>
                <Th>Responsable</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((application) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  tab={tab}
                  now={now}
                  assignee={reviewerName(application.assigneeId)}
                  isMine={application.assigneeId === user.id}
                  onOpen={() => navigate(paths.guideApplication(application.id))}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ApplicationRow({
  application,
  tab,
  now,
  assignee,
  isMine,
  onOpen,
}: {
  application: GuideApplication
  tab: QueueTab
  now: string
  assignee: string | null
  isMine: boolean
  onOpen: () => void
}) {
  const decided = tab === 'approved' || tab === 'rejected'
  const waiting = waitingMinutes(application, now)
  const late = !decided && tab !== 'changes_requested' && waiting > STAGE_LIMIT_MINUTES
  const segments = reviewSegments(application)
  const done = segments.filter((segment) => segment.state === 'done').length

  return (
    <Tr interactive onClick={onOpen}>
      <Td>
        <div className="flex items-center gap-3">
          <img src={application.photoUrl} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-placeholder object-cover" />
          <div className="min-w-0">
            <Link
              to={paths.guideApplication(application.id)}
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-ink hover:underline"
            >
              {application.name}
            </Link>
            <p className="truncate text-caption text-muted">{application.email}</p>
          </div>
        </div>
      </Td>
      <Td>
        <p className="text-small text-ink">{SERVICE_ROLE_LABELS[application.serviceRole]}</p>
        <p className="text-caption text-muted">{application.languages.join(', ')}</p>
      </Td>
      <Td className="whitespace-nowrap">{application.city}</Td>
      {!decided && tab !== 'changes_requested' && (
        <Td>
          <ReviewSegments segments={segments} className="w-36" />
          <p className="mt-1.5 text-caption text-muted tabular-nums">
            {tab === 'documents'
              ? `${done} de ${segments.length} documentos`
              : tab === 'background'
                ? `${done} de ${segments.length} verificaciones`
                : segments.some((segment) => segment.state === 'problem')
                  ? 'Con observaciones'
                  : 'Todo en orden'}
          </p>
        </Td>
      )}
      <Td className="whitespace-nowrap">
        {decided ? (
          <span className="text-muted">{formatDate(application.stageSince.slice(0, 10))}</span>
        ) : (
          <>
            <p className={cn('text-small font-semibold tabular-nums', late ? 'text-danger' : 'text-ink')}>{formatWaiting(waiting)}</p>
            <p className="text-caption text-muted">desde {formatDateTime(application.stageSince)}</p>
          </>
        )}
      </Td>
      <Td>
        {assignee ? (
          <span className="flex items-center gap-2">
            <Avatar name={assignee} size="sm" />
            <span className="text-small whitespace-nowrap text-ink">{isMine ? 'Tú' : assignee}</span>
          </span>
        ) : (
          <Tag tone="outline">Sin responsable</Tag>
        )}
      </Td>
    </Tr>
  )
}
