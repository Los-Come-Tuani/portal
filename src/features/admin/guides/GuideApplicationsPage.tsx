import { BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Avatar, Button, ButtonLink, EmptyState, ErrorState, PageHeader, SegmentedControl, SkeletonRows, Table, Tabs, Tag, Td, Th, Tr } from '@/components/ui'
import { useProviderQueue } from '@/data/hooks/use-providers'
import {
  PROCEDURE_LABELS,
  PROVIDER_STAGE_LABELS,
  QUEUE_TABS,
  REQUEST_STATUS_LABELS,
  SERVICE_CODES,
  servicesLabel,
  type ProviderProcedure,
  type ProviderRequestSummary,
  type QueueStatus,
  type ServiceCode,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { STAGE_LIMIT_MINUTES } from '@/features/verification/status'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDate, formatDateTime, formatWaiting, plural } from '@/lib/format'
import { REQUEST_STATUS_TONES, waitedMinutes } from '../admissions/status'

type Tab = Extract<QueueStatus, 'open' | 'approved' | 'rejected' | 'all'>

const TAB_HELP: Record<Tab, string> = {
  open: 'Se atienden por orden de llegada. Quien revisa acepta o rechaza cada documento; con todo aceptado, quien decide aprueba o rechaza.',
  approved: 'Guías y traductores que el turista ya encuentra en la app, y renovaciones aprobadas.',
  rejected: 'Recibieron el motivo por correo y pueden corregir y volver a enviar desde la app.',
  all: 'Todas las solicitudes, las más recientes primero.',
}

const SERVICE_OPTIONS: { value: ServiceCode | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  ...SERVICE_CODES.map((value) => ({ value, label: value === 'guia' ? 'Guías' : 'Traductores' })),
]

const PROCEDURE_OPTIONS: { value: ProviderProcedure | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'application', label: 'Postulaciones' },
  { value: 'renewal', label: 'Renovaciones' },
]

const PAGE_SIZE = 20

/** En qué va lo abierto: cuántos documentos se revisaron, o que ya falta decidir. */
function Progress({ request }: { request: ProviderRequestSummary }) {
  if (!request.stage) return <Tag tone={REQUEST_STATUS_TONES[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Tag>
  const { counts } = request
  return (
    <div className="flex flex-col gap-1">
      <Tag tone={request.stage === 'decision' ? 'confirmed' : 'planned'}>{PROVIDER_STAGE_LABELS[request.stage]}</Tag>
      <p className="text-caption text-muted tabular-nums">
        {request.stage === 'decision'
          ? 'Todo aceptado'
          : `${counts.accepted + counts.rejected} de ${counts.total} revisados${counts.rejected > 0 ? ` · ${counts.rejected} rechazado${counts.rejected > 1 ? 's' : ''}` : ''}`}
      </p>
    </div>
  )
}

/** Los guías y traductores que se postularon desde la app, y las renovaciones de documentos. */
export function GuideApplicationsPage() {
  useDocumentTitle('Guías y traductores')
  const navigate = useNavigate()
  const { user, can } = useSession()
  useNow() // la espera de lo abierto se vuelve a calcular cada minuto
  const [params, setParams] = useSearchParams()

  const tab = (QUEUE_TABS.find((item) => item.value === params.get('estado'))?.value ?? 'open') as Tab
  const service = SERVICE_CODES.find((item) => item === params.get('servicio'))
  const procedure = (['application', 'renewal'] as const).find((item) => item === params.get('tramite'))
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const queue = useProviderQueue({ status: tab, service, procedure, page, pageSize: PAGE_SIZE })
  const open = useProviderQueue({ status: 'open', page: 1, pageSize: 1 })

  const update = (next: { tab?: Tab; service?: ServiceCode | 'all'; procedure?: ProviderProcedure | 'all'; page?: number }) => {
    const value = new URLSearchParams(params)
    const set = (key: string, raw: string | undefined, empty: string) => {
      if (raw === undefined) return
      if (raw === empty) value.delete(key)
      else value.set(key, raw)
    }
    set('estado', next.tab, 'open')
    set('servicio', next.service, 'all')
    set('tramite', next.procedure, 'all')
    // Cambiar un filtro vuelve a la primera página.
    if (next.page && next.page > 1) value.set('pagina', String(next.page))
    else value.delete('pagina')
    setParams(value, { replace: true })
  }

  const rows = queue.data?.results ?? []
  const decided = tab === 'approved' || tab === 'rejected'
  const oldest = tab === 'open' && page === 1 && rows[0] ? waitedMinutes(rows[0].submittedAt) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Guías y traductores"
        description="Se postulan y renuevan sus documentos desde la app. Nadie aparece para el turista hasta que se revisan sus documentos y alguien con permiso para decidir lo aprueba."
      />

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
          <p className="max-w-[60ch] text-small text-muted">{TAB_HELP[tab]}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl label="Qué ofrece" size="sm" value={service ?? 'all'} onChange={(value) => update({ service: value })} options={SERVICE_OPTIONS} />
            <SegmentedControl label="Trámite" size="sm" value={procedure ?? 'all'} onChange={(value) => update({ procedure: value })} options={PROCEDURE_OPTIONS} />
          </div>
        </div>
      </div>

      {queue.isPending ? (
        <SkeletonRows rows={5} />
      ) : queue.isError ? (
        <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck size={20} />}
          title={tab === 'open' && !service && !procedure ? 'No hay solicitudes abiertas' : 'No hay solicitudes aquí'}
          action={
            service || procedure ? (
              <Button variant="secondary" onClick={() => update({ service: 'all', procedure: 'all' })}>
                Quitar los filtros
              </Button>
            ) : tab !== 'all' ? (
              <Button variant="secondary" onClick={() => update({ tab: 'all' })}>
                Ver todas las solicitudes
              </Button>
            ) : can('users.view') ? (
              <ButtonLink to={paths.users}>Ir a Todos los usuarios</ButtonLink>
            ) : (
              <ButtonLink to={paths.home}>Ir al inicio</ButtonLink>
            )
          }
        >
          {tab === 'open'
            ? 'Cuando un guía o traductor se postule o renueve un documento desde la app, aparece en esta bandeja.'
            : 'Cambia el estado o los filtros para ver otras.'}
        </EmptyState>
      ) : (
        <>
          <Table id="guias" caption={`Solicitudes de guías y traductores: ${QUEUE_TABS.find((item) => item.value === tab)?.label}`}>
            <thead>
              <tr>
                <Th>Solicitante</Th>
                <Th>Ofrece</Th>
                <Th>Ciudad</Th>
                <Th>{tab === 'open' ? 'Paso' : 'Estado'}</Th>
                <Th>{decided ? 'Decidida' : 'Esperando'}</Th>
                <Th>Responsable</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((request) => {
                const waiting = waitedMinutes(request.submittedAt)
                const late = !request.resolvedAt && waiting > STAGE_LIMIT_MINUTES
                return (
                  <Tr key={request.id} interactive onClick={() => navigate(paths.guideApplication(request.id))}>
                    <Td>
                      <Link
                        to={paths.guideApplication(request.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="font-semibold text-ink hover:underline"
                      >
                        {request.applicant.name}
                      </Link>
                      <p className="truncate text-caption text-muted">{request.applicant.email}</p>
                    </Td>
                    <Td>
                      <p className="text-small text-ink">{servicesLabel(request.services)}</p>
                      {request.procedure === 'renewal' && <p className="text-caption text-muted">{PROCEDURE_LABELS.renewal}</p>}
                    </Td>
                    <Td className="whitespace-nowrap">{request.city?.name ?? 'Todo el país'}</Td>
                    <Td>
                      <Progress request={request} />
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
