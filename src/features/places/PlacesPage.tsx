import { ArrowRight, ChevronLeft, ChevronRight, ImageOff, MapPin, Medal, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, EmptyState, ErrorState, Input, PageHeader, Panel, Select, SkeletonRows, Tag, type TagTone } from '@/components/ui'
import { env } from '@/config/env'
import { useCities } from '@/data/hooks/use-applications'
import { useOwnCity } from '@/data/hooks/use-own-city'
import { usePlaceRequests } from '@/data/hooks/use-place-requests'
import { usePlacePage } from '@/data/hooks/use-places'
import { coverUrl, PLACE_REQUEST_STATUS_LABELS, type PlaceRequestStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/cn'
import { formatDateTime, formatPercent, plural } from '@/lib/format'
import { AddPlaceDialog } from './components/AddPlaceDialog'
import { NewPlaceDialog } from './components/NewPlaceDialog'
import { completeness, placeIssues } from './lib/completeness'

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

type Presence = 'todos' | 'activos' | 'retirados'

export function PlacesPage() {
  const { isAdmin, role, organization, can } = useSession()
  useDocumentTitle(isAdmin || role === 'alcaldia' ? 'Lugares' : 'Mis lugares')
  const [params, setParams] = useSearchParams()
  const cityId = params.get('ciudad') ?? ''
  const search = params.get('buscar') ?? ''
  const presence = (['activos', 'retirados'] as const).find((item) => item === params.get('estado')) ?? 'todos'
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const [draft, setDraft] = useState(search)
  const [creating, setCreating] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const places = usePlacePage({
    cityId: cityId || undefined,
    search: search || undefined,
    active: presence === 'todos' ? undefined : presence === 'activos',
    page,
    pageSize: PAGE_SIZE,
  })
  const cities = useCities()
  const ownCity = useOwnCity(role === 'alcaldia' ? organization : null)
  // El equipo crea en cualquier ciudad; la alcaldía, en la suya. Un comercio tiene un solo lugar.
  const canCreate = can('places.manage') || (role === 'alcaldia' && organization?.status === 'active')
  // Los pedidos de lugar no existen en el API: solo en la demo.
  const canRequest = env.useMocks && role === 'negocio' && organization?.status === 'active'
  const requests = usePlaceRequests({}, canRequest)

  const update = useCallback(
    (next: { ciudad?: string; buscar?: string; estado?: Presence; pagina?: number }) =>
      setParams(
        (current) => {
          const value = new URLSearchParams(current)
          const set = (key: string, raw: string | undefined, empty: string) => {
            if (raw === undefined) return
            if (raw === empty) value.delete(key)
            else value.set(key, raw)
          }
          set('ciudad', next.ciudad, '')
          set('buscar', next.buscar?.trim(), '')
          set('estado', next.estado, 'todos')
          if (next.pagina && next.pagina > 1) value.set('pagina', String(next.pagina))
          else value.delete('pagina')
          return value
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => {
    if (draft.trim() === search) return
    const timer = setTimeout(() => update({ buscar: draft }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, search, update])

  const rows = places.data?.results ?? []
  const filtered = !!cityId || !!search || presence !== 'todos'
  const title = isAdmin ? 'Lugares' : role === 'alcaldia' ? `Lugares de ${ownCity.city?.name ?? 'tu alcaldía'}` : rows.length === 1 ? 'Mi lugar' : 'Mis lugares'
  const description = isAdmin
    ? 'Todos los lugares del mapa de la app y a quién pertenecen. Lo que no tiene dueño lo administra el equipo.'
    : role === 'alcaldia'
      ? 'Los lugares públicos de tu alcaldía que aparecen en la app. Mantén su ficha y su horario al día.'
      : 'Tu lugar es una parada en la app: su ficha es lo que ve el turista.'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Nuevo lugar
            </Button>
          ) : (
            canRequest && (
              <Button icon={<Plus size={16} />} onClick={() => setRequesting(true)}>
                Agregar un lugar
              </Button>
            )
          )
        }
      />

      {(isAdmin || role === 'alcaldia') && (
        <div className="flex flex-wrap gap-3">
          <Input
            type="search"
            aria-label="Buscar lugar"
            placeholder="Buscar por nombre"
            leading={<Search size={16} />}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-80"
          />
          {isAdmin && (
            <Select aria-label="Ciudad" value={cityId} onChange={(event) => update({ ciudad: event.target.value })} className="w-48">
              <option value="">Todas las ciudades</option>
              {(cities.data ?? [])
                .filter((city) => city.active)
                .map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
            </Select>
          )}
          <Select aria-label="En la app" value={presence} onChange={(event) => update({ estado: event.target.value as Presence })} className="w-48">
            <option value="todos">En la app y retirados</option>
            <option value="activos">En la app</option>
            <option value="retirados">Retirados</option>
          </Select>
        </div>
      )}

      {places.isPending ? (
        <SkeletonRows rows={5} />
      ) : places.isError ? (
        <ErrorState error={places.error} onRetry={() => void places.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<MapPin size={20} />}
          title={filtered ? 'No hay lugares con ese filtro' : 'Todavía no hay lugares aquí'}
          action={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft('')
                  update({ ciudad: '', buscar: '', estado: 'todos' })
                }}
              >
                Quitar los filtros
              </Button>
            ) : canCreate ? (
              <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                Nuevo lugar
              </Button>
            ) : canRequest ? (
              <Button icon={<Plus size={16} />} onClick={() => setRequesting(true)}>
                Agregar un lugar
              </Button>
            ) : organization?.status === 'pending' ? (
              <ButtonLink to={paths.application}>Ver mi solicitud</ButtonLink>
            ) : (
              <ButtonLink to={paths.home}>Volver a la agenda</ButtonLink>
            )
          }
        >
          {filtered
            ? 'Prueba con otra ciudad o con otro nombre.'
            : canCreate
              ? 'Crea el primero con "Nuevo lugar".'
              : canRequest
                ? 'Pídelo con "Agregar un lugar": uno que ya está en la app o uno nuevo.'
                : 'Se te asigna cuando el equipo aprueba tu solicitud.'}
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-divider overflow-hidden rounded-panel border border-divider bg-surface">
            {rows.map((stop) => {
              const score = completeness(stop)
              const issues = placeIssues(stop)
              const cover = coverUrl(stop.images)
              return (
                <li key={stop.id}>
                  <Link
                    to={paths.place(stop.id)}
                    className="group grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-4 px-4 py-5 transition-colors duration-150 hover:bg-canvas sm:grid-cols-[4.5rem_minmax(0,1fr)_10rem_auto]"
                  >
                    {cover ? (
                      <img src={cover} alt="" loading="lazy" className="size-14 rounded-kp bg-placeholder object-cover sm:size-[4.5rem]" />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-kp bg-paper text-muted sm:size-[4.5rem]">
                        <ImageOff size={18} aria-label="Sin foto" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body font-semibold text-ink">{stop.name}</p>
                        {!stop.active && <Tag tone="outline">Retirado</Tag>}
                        {stop.hasBadge && (
                          <Tag tone="badge" icon={<Medal size={12} aria-hidden="true" />}>
                            Insignia
                          </Tag>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-small text-muted">
                        {stop.category} · {stop.city}
                        {isAdmin && ` · ${stop.owner?.name ?? "Equipo de K'Plan"}`}
                      </p>
                      {issues[0] && <p className="mt-1 truncate text-caption text-muted">{issues[0].message}</p>}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <div className="flex justify-between text-caption text-muted">
                        <span>Ficha</span>
                        <span className="font-semibold text-ink tabular-nums">{formatPercent(score)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                        <div className={cn('h-full rounded-full', stop.active ? 'bg-confirmed' : 'bg-planned')} style={{ width: `${score * 100}%` }} />
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      aria-hidden="true"
                      className="hidden text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink sm:block"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>

          {places.data.pages > 1 && (
            <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-muted tabular-nums">
                Página {places.data.current} de {places.data.pages} · {plural(places.data.elements, 'lugar', 'lugares')}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={<ChevronLeft size={16} />} disabled={!places.data.hasPrevious} onClick={() => update({ pagina: page - 1 })}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" icon={<ChevronRight size={16} />} disabled={!places.data.hasNext} onClick={() => update({ pagina: page + 1 })}>
                  Siguiente
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      {canRequest && (requests.data ?? []).length > 0 && (
        <Panel title="Tus pedidos" description="Lugares que pediste administrar. El equipo de K'Plan los revisa." bodyClassName="p-0">
          <ul className="divide-y divide-divider">
            {requests.data?.map((request) => (
              <li key={request.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">{request.stopName}</p>
                  <p className="text-small text-muted">
                    {request.kind === 'new' ? 'Lugar nuevo' : 'Ya estaba en la app'} · pedido el {formatDateTime(request.requestedAt)}
                  </p>
                  {request.status === 'rejected' && request.decisionNote && (
                    <p className="mt-1 text-body text-danger">
                      <span className="font-semibold">No se aprobó:</span> {request.decisionNote}
                    </p>
                  )}
                </div>
                <Tag tone={REQUEST_TONES[request.status]}>{PLACE_REQUEST_STATUS_LABELS[request.status]}</Tag>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {canCreate && <NewPlaceDialog open={creating} ownCity={can('places.manage') ? null : ownCity.city} onClose={() => setCreating(false)} />}
      {canRequest && organization && <AddPlaceDialog open={requesting} city={organization.city} onClose={() => setRequesting(false)} />}
    </div>
  )
}

const REQUEST_TONES: Record<PlaceRequestStatus, TagTone> = { pending: 'planned', approved: 'confirmed', rejected: 'danger' }
