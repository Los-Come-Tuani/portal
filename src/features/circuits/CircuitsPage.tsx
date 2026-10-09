import { Medal, Plus, Route, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { ButtonLink, EmptyState, ErrorState, Input, PageHeader, Select, SkeletonRows, Table, Tabs, Tag, Td, Th, Tr } from '@/components/ui'
import { useCircuitList } from '@/data/hooks/use-circuits'
import { coverUrl, isUnpublished, seasonState, type Circuit, type CircuitKind } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatDayMonth, plural } from '@/lib/format'
import { CircuitKindTag } from './components/CircuitKindTag'
import { useCircuitAccess } from './lib/access'
import { bookingLabel, circuitStatus } from './lib/labels'

type Filter = 'todos' | CircuitKind
type Presence = 'en-uso' | 'publicados' | 'borradores' | 'retirados'

const EMPTY_TEXT: Record<Filter, string> = {
  todos: 'No hay circuitos con esos filtros',
  kplan: "Todavía no hay especiales de K'Plan con esos filtros",
  creative: 'No hay circuitos creativos con esos filtros',
  private: 'No hay circuitos privados con esos filtros',
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** El catálogo de circuitos de la app, con los especiales de K'Plan primero. La alcaldía ve los de su ciudad. */
export function CircuitsPage() {
  const navigate = useNavigate()
  const { today } = useNow()
  const { municipality, canCreate } = useCircuitAccess()
  const [filter, setFilter] = useState<Filter>('todos')
  const [cityId, setCityId] = useState('')
  const [search, setSearch] = useState('')
  const [presence, setPresence] = useState<Presence>('en-uso')
  const circuits = useCircuitList(presence === 'retirados' ? { status: 'retired' } : {})

  const all = circuits.data ?? []
  const ownCity = municipality ? (all[0]?.city ?? municipality.city) : ''
  useDocumentTitle(municipality && ownCity ? `Circuitos de ${ownCity}` : 'Circuitos')
  const cities = [...new Map(all.map((item) => [item.cityId, item.city])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  const inPresence = all.filter((item) => (presence === 'publicados' ? item.status === 'published' : presence === 'borradores' ? isUnpublished(item) : true))
  const count = (kind: CircuitKind) => inPresence.filter((item) => item.kind === kind).length
  const kindOrder: Record<CircuitKind, number> = { kplan: 0, creative: 1, private: 2 }
  const term = fold(search.trim())
  const shown = inPresence
    .filter((item) => filter === 'todos' || item.kind === filter)
    .filter((item) => !cityId || item.cityId === cityId)
    .filter((item) => !term || fold(`${item.title} ${item.shortTitle} ${item.city}`).includes(term))
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.shortTitle.localeCompare(b.shortTitle, 'es'))

  const live = presence === 'retirados' ? [] : all.filter((item) => item.status === 'published')
  const liveCount = (kind: CircuitKind) => live.filter((item) => item.kind === kind).length
  const drafts = presence === 'retirados' ? 0 : all.filter(isUnpublished).length
  const nextSeason = live
    .filter((item) => seasonState(item, today) === 'upcoming')
    .sort((a, b) => (a.availableFrom ?? '').localeCompare(b.availableFrom ?? ''))[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={municipality && ownCity ? `Circuitos de ${ownCity}` : 'Circuitos'}
        description={
          municipality
            ? 'Los recorridos de tu ciudad en la app. Los creativos los organiza tu alcaldía: créalos, corrígelos y sácalos de la app cuando haga falta. Los del equipo de K\'Plan los ves sin editarlos.'
            : "Los recorridos que el turista agenda en la app: los privados, los creativos de las alcaldías y los especiales de K'Plan, que dan insignias extra al completarlos."
        }
        actions={
          canCreate && (
            <ButtonLink to={paths.newCircuit} variant="primary" icon={<Plus size={16} />}>
              Nuevo circuito
            </ButtonLink>
          )
        }
      />

      {circuits.isSuccess && live.length > 0 && (
        <p className="max-w-[72ch] text-lead text-muted">
          La app tiene <strong className="font-semibold text-ink">{plural(live.length, 'circuito', 'circuitos')}</strong>
          {municipality ? ` de ${ownCity}` : ''}:{' '}
          <strong className="font-semibold text-ink">{plural(liveCount('kplan'), "especial de K'Plan", "especiales de K'Plan")}</strong>,{' '}
          {liveCount('creative')} {liveCount('creative') === 1 ? 'creativo' : 'creativos'} de alcaldías y {liveCount('private')}{' '}
          {liveCount('private') === 1 ? 'privado' : 'privados'}.
          {drafts > 0 && (
            <>
              {' '}
              <strong className="font-semibold text-ink">{plural(drafts, 'borrador', 'borradores')}</strong> sin publicar.
            </>
          )}
          {nextSeason?.availableFrom && (
            <>
              {' '}
              {nextSeason.shortTitle} empieza su temporada el <strong className="font-semibold text-ink">{formatDayMonth(nextSeason.availableFrom)}</strong>.
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Tipo de circuito"
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'todos', label: 'Todos', count: inPresence.length },
            { value: 'kplan', label: "Especiales de K'Plan", count: count('kplan') },
            { value: 'creative', label: 'Creativos', count: count('creative') },
            { value: 'private', label: 'Privados', count: count('private') },
          ]}
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {!municipality && (
            <Select aria-label="Ciudad" value={cityId} onChange={(event) => setCityId(event.target.value)} className="w-48">
              <option value="">Todas las ciudades</option>
              {cities.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          )}
          <Select aria-label="Estado" value={presence} onChange={(event) => setPresence(event.target.value as Presence)} className="w-52">
            <option value="en-uso">Publicados y borradores</option>
            <option value="publicados">Publicados</option>
            <option value="borradores">Borradores</option>
            <option value="retirados">Retirados</option>
          </Select>
          <Input
            type="search"
            aria-label="Buscar circuito"
            placeholder="Buscar"
            leading={<Search size={16} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
        </div>
      </div>

      {circuits.isPending ? (
        <SkeletonRows rows={6} />
      ) : circuits.isError ? (
        <ErrorState error={circuits.error} onRetry={() => void circuits.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Route size={20} />}
          title={presence === 'retirados' ? 'No hay circuitos retirados' : EMPTY_TEXT[filter]}
          action={
            filter === 'kplan' &&
            canCreate &&
            !municipality && (
              <ButtonLink to={paths.newCircuit} icon={<Plus size={16} />}>
                Crear un especial
              </ButtonLink>
            )
          }
        >
          {filter === 'kplan' && presence !== 'retirados' && 'Un especial junta paradas de una ciudad y da insignias extra a quien lo completa.'}
        </EmptyState>
      ) : (
        <Table id="circuitos" caption="Circuitos">
          <thead>
            <tr>
              <Th>Circuito</Th>
              <Th>Tipo</Th>
              <Th>Recorrido</Th>
              <Th>Insignias</Th>
              <Th>Cómo se hace</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((circuit) => (
              <CircuitRow key={circuit.id} circuit={circuit} today={today} onOpen={() => navigate(paths.circuit(circuit.id))} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

function CircuitRow({ circuit, today, onOpen }: { circuit: Circuit; today: string; onOpen: () => void }) {
  const status = circuitStatus(circuit, today)
  const cover = coverUrl(circuit.images)
  return (
    <Tr interactive onClick={onOpen} className={circuit.status !== 'published' ? 'bg-canvas/50' : undefined}>
      <Td>
        <div className="flex items-center gap-3">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="size-10 shrink-0 rounded-sm bg-placeholder object-cover" />
          ) : (
            <span className="size-10 shrink-0 rounded-sm bg-paper" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <Link
              to={paths.circuit(circuit.id)}
              onClick={(event) => event.stopPropagation()}
              className="block truncate font-semibold text-ink hover:underline"
            >
              {circuit.shortTitle}
            </Link>
            <p className="truncate text-caption text-muted">{circuit.subtitle}</p>
          </div>
        </div>
      </Td>
      <Td>
        <CircuitKindTag kind={circuit.kind} />
        {circuit.kind === 'creative' && circuit.organizer && <p className="mt-1 text-caption text-muted">{circuit.organizer.name}</p>}
      </Td>
      <Td className="whitespace-nowrap">
        <p className="text-small text-ink tabular-nums">
          {circuit.city} · {plural(circuit.stopIds.length, 'parada', 'paradas')}
        </p>
        <p className="text-caption text-muted tabular-nums">
          {circuit.duration} · {circuit.travelMode === 'walking' ? 'a pie' : 'en vehículo'}
        </p>
      </Td>
      <Td className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-small text-ink tabular-nums">
          <Medal size={14} className="text-badge-deep" aria-hidden="true" />
          {circuit.badges}
          {circuit.bonusBadges > 0 && <span className="font-semibold text-brand-strong">+ {circuit.bonusBadges} extra</span>}
        </span>
      </Td>
      <Td className="text-small whitespace-nowrap text-ink tabular-nums">{bookingLabel(circuit)}</Td>
      <Td className="whitespace-nowrap">
        <Tag tone={status.tone}>{status.label}</Tag>
        {status.detail && <p className="mt-1 text-caption text-muted">{status.detail}</p>}
      </Td>
    </Tr>
  )
}
