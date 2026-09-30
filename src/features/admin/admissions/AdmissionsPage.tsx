import { Building2, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import {
  Avatar,
  ButtonLink,
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
import { useAdmissionReviewers, useAdmissions } from '@/data/hooks/use-admissions'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import { ORGANIZATION_TYPE_LABELS, type OrganizationApplication } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { ReviewSegments } from '@/features/verification/components/ReviewSegments'
import { STAGE_LIMIT_MINUTES, waitingMinutes } from '@/features/verification/status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { toLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatWaiting, plural } from '@/lib/format'
import { ADMISSION_TABS, admissionSegments, admissionTab, type AdmissionTab } from './lib/queue'
import { PlaceRequestsView } from './PlaceRequestsView'

type Scope = 'todas' | 'mias'

const TAB_HELP: Record<AdmissionTab, string> = {
  documents: 'Revisa cada documento contra su lista. Con todos aceptados, pasa la solicitud a decisión.',
  decision: 'Los documentos están en orden: falta aprobar o rechazar. Al aprobar, su lugar se publica en la app.',
  changes_requested: 'Se les pidió una corrección. Vuelven a documentos cuando la mandan de nuevo desde el portal.',
  approved: 'Organizaciones que entraron a K\'Plan por esta vía.',
  rejected: 'No pasaron la revisión: su cuenta quedó suspendida.',
}

function placeSummary(application: OrganizationApplication): string {
  const parts = []
  if (application.newStopId) parts.push('1 lugar nuevo')
  if (application.claimedStopIds.length > 0) parts.push(`${plural(application.claimedStopIds.length, 'lugar', 'lugares')} de la app`)
  return parts.join(' y ') || 'Sin lugares'
}

/** Negocios y alcaldías que se postularon desde el portal. */
export function AdmissionsPage() {
  useDocumentTitle('Solicitudes de organizaciones')
  const navigate = useNavigate()
  const { user } = useSession()
  const applications = useAdmissions()
  const reviewers = useAdmissionReviewers()
  const { today, minutes } = useNow()
  const now = toLocalDateTime(today, minutes)
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const view = params.get('vista') === 'lugares' ? 'lugares' : 'organizaciones'
  const pendingPlaces = usePlaceRequests({ status: 'pending' }).data?.length ?? 0

  const all = applications.data ?? []
  const countOf = (tab: AdmissionTab) => all.filter((item) => admissionTab(item) === tab).length
  const fallback: AdmissionTab = countOf('documents') > 0 || countOf('decision') === 0 ? 'documents' : 'decision'
  const tab = (ADMISSION_TABS.find((item) => item.value === params.get('etapa'))?.value ?? fallback) as AdmissionTab
  const scope: Scope = params.get('de') === 'mi' ? 'mias' : 'todas'
  const decided = tab === 'approved' || tab === 'rejected'

  const update = (next: { tab?: AdmissionTab; scope?: Scope }) => {
    const value = new URLSearchParams(params)
    value.set('etapa', next.tab ?? tab)
    if ((next.scope ?? scope) === 'mias') value.set('de', 'mi')
    else value.delete('de')
    setParams(value, { replace: true })
  }

  const shown = all
    .filter((item) => admissionTab(item) === tab)
    .filter((item) => scope === 'todas' || item.assigneeId === user.id)
    .filter((item) => !search || `${item.name} ${item.city} ${item.representative.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (decided ? b.stageSince.localeCompare(a.stageSince) : a.stageSince.localeCompare(b.stageSince)))
  const inReview = all.filter((item) => item.status === 'in_review')
  const open = inReview.length + countOf('changes_requested')
  const oldest = inReview.reduce((max, item) => Math.max(max, waitingMinutes(item.stageSince, now)), 0)
  const reviewerName = (id: string | null) => reviewers.data?.find((reviewer) => reviewer.id === id)?.name ?? null

  const header = (
    <>
      <PageHeader
        title="Solicitudes"
        description="Organizaciones nuevas que se postularon o que el equipo dio de alta, y organizaciones aprobadas que piden otro lugar."
        actions={
          view === 'organizaciones' && (
            <ButtonLink to={paths.assistedApplication} variant="primary" icon={<Plus size={16} />}>
              Alta asistida
            </ButtonLink>
          )
        }
      />
      <SegmentedControl
        label="Tipo de solicitud"
        value={view}
        onChange={(value) => setParams(value === 'lugares' ? { vista: 'lugares' } : {}, { replace: true })}
        options={[
          { value: 'organizaciones', label: `Organizaciones nuevas · ${open}` },
          { value: 'lugares', label: `Lugares pedidos · ${pendingPlaces}` },
        ]}
        className="self-start"
      />
    </>
  )

  if (view === 'lugares') {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <PlaceRequestsView />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      {applications.isSuccess && (
        <p className="max-w-[72ch] text-lead text-muted">
          {inReview.length === 0 ? (
            'No hay solicitudes en revisión.'
          ) : (
            <>
              Hay <strong className="font-semibold text-ink">{plural(inReview.length, 'solicitud', 'solicitudes')}</strong> en revisión:{' '}
              <strong className="font-semibold text-ink tabular-nums">{countOf('documents')}</strong> en documentos y{' '}
              <strong className="font-semibold text-ink tabular-nums">{countOf('decision')}</strong> esperando decisión. La que más espera
              lleva <strong className={cn('font-semibold', oldest > STAGE_LIMIT_MINUTES ? 'text-danger' : 'text-ink')}>{formatWaiting(oldest)}</strong>{' '}
              en su etapa.
              {countOf('changes_requested') > 0 && (
                <>
                  {' '}
                  <strong className="font-semibold text-ink tabular-nums">{countOf('changes_requested')}</strong>{' '}
                  {countOf('changes_requested') === 1 ? 'espera que corrijan lo que se les pidió.' : 'esperan que corrijan lo que se les pidió.'}
                </>
              )}
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Tabs label="Etapa" value={tab} onChange={(value) => update({ tab: value })} items={ADMISSION_TABS.map((item) => ({ ...item, count: countOf(item.value) }))} />
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
              aria-label="Buscar organización"
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
        <EmptyState icon={<Building2 size={20} />} title={scope === 'mias' ? 'No tienes solicitudes en esta etapa' : 'No hay solicitudes en esta etapa'}>
          {scope === 'mias'
            ? 'Mira las de todo el equipo con "Todas" y toma una sin responsable.'
            : 'Cuando un negocio o una alcaldía se postule desde el portal, aparece aquí.'}
        </EmptyState>
      ) : (
        <Table id={`solicitudes-${tab}`} caption={`Solicitudes: ${ADMISSION_TABS.find((item) => item.value === tab)?.label}`}>
          <thead>
            <tr>
              <Th>Organización</Th>
              <Th>Ciudad</Th>
              <Th>Lugares</Th>
              {!decided && tab !== 'changes_requested' && <Th className="w-44">Revisión</Th>}
              <Th>{decided ? 'Decidida' : tab === 'changes_requested' ? 'Esperando corrección' : 'En la etapa'}</Th>
              <Th>Responsable</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((application) => {
              const waiting = waitingMinutes(application.stageSince, now)
              const late = !decided && tab !== 'changes_requested' && waiting > STAGE_LIMIT_MINUTES
              const segments = admissionSegments(application)
              const assignee = reviewerName(application.assigneeId)
              return (
                <Tr key={application.id} interactive onClick={() => navigate(paths.admission(application.id))}>
                  <Td>
                    <Link
                      to={paths.admission(application.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold text-ink hover:underline"
                    >
                      {application.name}
                    </Link>
                    <p className="text-caption text-muted">
                      {ORGANIZATION_TYPE_LABELS[application.type]} · {application.kind}
                      {application.assisted && ' · alta asistida'}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap">{application.city}</Td>
                  <Td className="text-small whitespace-nowrap text-muted">{placeSummary(application)}</Td>
                  {!decided && tab !== 'changes_requested' && (
                    <Td>
                      <ReviewSegments segments={segments} className="w-36" />
                      <p className="mt-1.5 text-caption text-muted tabular-nums">
                        {segments.filter((segment) => segment.state === 'done').length} de {segments.length} documentos
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
                        <span className="text-small whitespace-nowrap text-ink">{application.assigneeId === user.id ? 'Tú' : assignee}</span>
                      </span>
                    ) : (
                      <Tag tone="outline">Sin responsable</Tag>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
