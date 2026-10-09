import { Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Avatar, Button, EmptyState, ErrorState, PageHeader, SegmentedControl, SkeletonRows, Table, Tabs, Tag, Td, Th, Tr } from '@/components/ui'
import { useVerificationQueue } from '@/data/hooks/use-verification'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import {
  ORGANIZATION_KIND_LABELS,
  ORGANIZATION_KINDS,
  QUEUE_TABS,
  REQUEST_STATUS_LABELS,
  type OrganizationKind,
  type QueueStatus,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { STAGE_LIMIT_MINUTES } from '@/features/verification/status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatWaiting, plural } from '@/lib/format'
import { PlaceRequestsView } from './PlaceRequestsView'
import { REQUEST_STATUS_TONES, waitedMinutes } from './status'

type Tab = Extract<QueueStatus, 'open' | 'approved' | 'rejected' | 'all'>

const TAB_HELP: Record<Tab, string> = {
  open: 'Se atienden por orden de llegada. Toma una para revisarla; si no puedes seguir, devuélvela a la cola.',
  approved: "Organizaciones que ya entraron a K'Plan: son visibles para el turista.",
  rejected: 'Quien se postuló recibió el motivo por correo y puede corregir y volver a enviar.',
  all: 'Todas las solicitudes, las más recientes primero.',
}

const KIND_OPTIONS: { value: OrganizationKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...ORGANIZATION_KINDS.map((value) => ({ value, label: ORGANIZATION_KIND_LABELS[value] })),
]

const PAGE_SIZE = 20

/** Comercios, instituciones culturales y alcaldías que se postularon, en una sola bandeja. */
export function AdmissionsPage() {
  useDocumentTitle('Solicitudes de organizaciones')
  const navigate = useNavigate()
  const { user } = useSession()
  useNow() // la espera de lo abierto se vuelve a calcular cada minuto
  const [params, setParams] = useSearchParams()
  const view = params.get('vista') === 'lugares' ? 'lugares' : 'organizaciones'
  const pendingPlaces = usePlaceRequests({ status: 'pending' }).data?.length ?? 0

  const tab = (QUEUE_TABS.find((item) => item.value === params.get('estado'))?.value ?? 'open') as Tab
  const kind = ORGANIZATION_KINDS.find((item) => item === params.get('clase'))
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const queue = useVerificationQueue({ status: tab, kind, page, pageSize: PAGE_SIZE })
  const open = useVerificationQueue({ status: 'open', page: 1, pageSize: 1 })

  const update = (next: { tab?: Tab; kind?: OrganizationKind | 'all'; page?: number }) => {
    const value = new URLSearchParams(params)
    if (next.tab !== undefined) {
      if (next.tab === 'open') value.delete('estado')
      else value.set('estado', next.tab)
    }
    if (next.kind !== undefined) {
      if (next.kind === 'all') value.delete('clase')
      else value.set('clase', next.kind)
    }
    // Cambiar el filtro vuelve a la primera página.
    if (next.page && next.page > 1) value.set('pagina', String(next.page))
    else value.delete('pagina')
    setParams(value, { replace: true })
  }

  const header = (
    <>
      <PageHeader
        title="Solicitudes"
        description="Organizaciones nuevas que se postularon y organizaciones aprobadas que piden otro lugar."
      />
      <SegmentedControl
        label="Tipo de solicitud"
        value={view}
        onChange={(value) => setParams(value === 'lugares' ? { vista: 'lugares' } : {}, { replace: true })}
        options={[
          { value: 'organizaciones', label: `Organizaciones nuevas · ${open.data?.elements ?? 0}` },
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

  const rows = queue.data?.results ?? []
  const decided = tab === 'approved' || tab === 'rejected'
  const oldest = tab === 'open' && page === 1 && rows[0] ? waitedMinutes(rows[0].submittedAt) : 0

  return (
    <div className="flex flex-col gap-6">
      {header}

      {open.isSuccess && (
        <p className="max-w-[72ch] text-lead text-muted">
          {open.data.elements === 0 ? (
            'No hay solicitudes abiertas.'
          ) : (
            <>
              Hay <strong className="font-semibold text-ink">{plural(open.data.elements, 'solicitud abierta', 'solicitudes abiertas')}</strong>.
              {oldest > 0 && (
                <>
                  {' '}
                  La que más espera lleva{' '}
                  <strong className={cn('font-semibold', oldest > STAGE_LIMIT_MINUTES ? 'text-danger' : 'text-ink')}>{formatWaiting(oldest)}</strong>.
                </>
              )}
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Tabs
          label="Estado"
          value={tab}
          onChange={(value) => update({ tab: value as Tab })}
          items={QUEUE_TABS.map((item) => ({ ...item, count: item.value === 'open' ? open.data?.elements : undefined }))}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[68ch] text-small text-muted">{TAB_HELP[tab]}</p>
          <SegmentedControl
            label="Clase de organización"
            size="sm"
            value={kind ?? 'all'}
            onChange={(value) => update({ kind: value })}
            options={KIND_OPTIONS}
          />
        </div>
      </div>

      {queue.isPending ? (
        <SkeletonRows rows={5} />
      ) : queue.isError ? (
        <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title={tab === 'open' && !kind ? 'No hay solicitudes abiertas' : 'No hay solicitudes aquí'}
          action={
            kind ? (
              <Button variant="secondary" onClick={() => update({ kind: 'all' })}>
                Ver todas las clases
              </Button>
            ) : tab !== 'all' ? (
              <Button variant="secondary" onClick={() => update({ tab: 'all' })}>
                Ver todas las solicitudes
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setParams({ vista: 'lugares' }, { replace: true })}>
                Ver lugares pedidos
              </Button>
            )
          }
        >
          {tab === 'open'
            ? 'Cuando un comercio, una institución o una alcaldía se postule desde el portal, aparece en esta bandeja.'
            : 'Cambia el estado o la clase para ver otras.'}
        </EmptyState>
      ) : (
        <>
          <Table id="solicitudes" caption={`Solicitudes: ${QUEUE_TABS.find((item) => item.value === tab)?.label}`}>
            <thead>
              <tr>
                <Th>Organización</Th>
                <Th>Ciudad</Th>
                <Th>Estado</Th>
                <Th>{decided ? 'Decidida' : 'Esperando'}</Th>
                <Th>Responsable</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((request) => {
                const waiting = waitedMinutes(request.submittedAt)
                const late = !request.resolvedAt && waiting > STAGE_LIMIT_MINUTES
                return (
                  <Tr key={request.id} interactive onClick={() => navigate(paths.admission(request.id))}>
                    <Td>
                      <Link
                        to={paths.admission(request.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="font-semibold text-ink hover:underline"
                      >
                        {request.organizationName}
                      </Link>
                      <p className="text-caption text-muted">{ORGANIZATION_KIND_LABELS[request.kind]}</p>
                    </Td>
                    <Td className="whitespace-nowrap">{request.city.name}</Td>
                    <Td>
                      <Tag tone={REQUEST_STATUS_TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Tag>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {request.resolvedAt ? (
                        <span className="text-muted">{formatDate(nowLocalDateTime(new Date(request.resolvedAt)).slice(0, 10))}</span>
                      ) : (
                        <>
                          <p className={cn('text-small font-semibold tabular-nums', late ? 'text-danger' : 'text-ink')}>{formatWaiting(waiting)}</p>
                          <p className="text-caption text-muted">desde {formatDateTime(nowLocalDateTime(new Date(request.submittedAt)))}</p>
                        </>
                      )}
                    </Td>
                    <Td>
                      {request.takenBy ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={request.takenBy.name} size="sm" />
                          <span className="text-small whitespace-nowrap text-ink">{request.takenBy.id === user.id ? 'Tú' : request.takenBy.name}</span>
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

          {queue.data && queue.data.pages > 1 && (
            <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-muted tabular-nums">
                Página {queue.data.current} de {queue.data.pages} · {plural(queue.data.elements, 'solicitud', 'solicitudes')}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={<ChevronLeft size={16} />} disabled={!queue.data.hasPrevious} onClick={() => update({ page: page - 1 })}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" icon={<ChevronRight size={16} />} disabled={!queue.data.hasNext} onClick={() => update({ page: page + 1 })}>
                  Siguiente
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
