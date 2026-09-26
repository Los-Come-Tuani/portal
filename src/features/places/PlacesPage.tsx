import { ArrowRight, MapPin, Medal, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { EmptyState, ErrorState, Input, PageHeader, Select, SkeletonRows, Tag } from '@/components/ui'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import { CITIES } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatPercent } from '@/lib/format'
import { completeness, placeIssues } from './lib/completeness'

export function PlacesPage() {
  const { isAdmin, role, organization, organizationId } = useSession()
  useDocumentTitle(isAdmin || role === 'alcaldia' ? 'Lugares' : 'Mis lugares')
  const places = usePlaces(isAdmin ? {} : { organizationId })
  const organizations = useOrganizations({}, isAdmin)
  const [city, setCity] = useState('')
  const [search, setSearch] = useState('')

  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of organizations.data ?? []) item.stopIds.forEach((stopId) => map.set(stopId, item.name))
    return map
  }, [organizations.data])

  if (!isAdmin && places.data?.length === 1) return <Navigate to={paths.place(places.data[0].id)} replace />

  const filtered = (places.data ?? []).filter(
    (stop) =>
      (!city || stop.city === city) &&
      (!search || `${stop.name} ${stop.address}`.toLowerCase().includes(search.trim().toLowerCase())),
  )

  const title = isAdmin ? 'Lugares' : role === 'alcaldia' ? `Lugares de ${organization?.city ?? 'tu ciudad'}` : 'Mis lugares'
  const description = isAdmin
    ? 'Todas las paradas del catálogo de la app y a quién pertenecen.'
    : role === 'alcaldia'
      ? 'Los lugares públicos de tu ciudad que aparecen en la app. Mantén su ficha y su horario al día.'
      : 'Cada lugar es una parada en la app: su ficha es lo que ve el turista.'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />

      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <Input
            type="search"
            aria-label="Buscar lugar"
            placeholder="Buscar por nombre o dirección"
            leading={<Search size={16} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-80"
          />
          <Select aria-label="Ciudad" value={city} onChange={(event) => setCity(event.target.value)} className="w-48">
            <option value="">Todas las ciudades</option>
            {CITIES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {places.isPending ? (
        <SkeletonRows rows={5} />
      ) : places.isError ? (
        <ErrorState error={places.error} onRetry={() => void places.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<MapPin size={20} />} title="No hay lugares con ese filtro">
          {isAdmin ? 'Prueba con otra ciudad o con otro nombre.' : 'Escríbenos para agregar tu lugar a la app.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-divider rounded-kp border border-divider bg-surface">
          {filtered.map((stop) => {
            const score = completeness(stop)
            const issues = placeIssues(stop)
            return (
              <li key={stop.id}>
                <Link
                  to={paths.place(stop.id)}
                  className="group grid items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-canvas sm:grid-cols-[4.5rem_minmax(0,1fr)_10rem_auto]"
                >
                  <img src={stop.images[0]} alt="" loading="lazy" className="hidden size-[4.5rem] rounded-sm bg-placeholder object-cover sm:block" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">{stop.name}</p>
                      {stop.hasBadge && (
                        <Tag tone="badge" icon={<Medal size={12} aria-hidden="true" />}>
                          Insignia
                        </Tag>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-small text-muted">
                      {stop.category} · {stop.city}
                      {isAdmin && ` · ${owners.get(stop.id) ?? "Catálogo de K'Plan"}`}
                    </p>
                    {issues[0] && <p className="mt-1 truncate text-caption text-muted">{issues[0].message}</p>}
                  </div>
                  <div>
                    <div className="flex justify-between text-caption text-muted">
                      <span>Ficha</span>
                      <span className="font-semibold text-ink tabular-nums">{formatPercent(score)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                      <div className="h-full rounded-full bg-confirmed" style={{ width: `${score * 100}%` }} />
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
      )}
    </div>
  )
}
