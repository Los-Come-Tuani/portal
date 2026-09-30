import { Medal, Plus, Route, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { ButtonLink, EmptyState, ErrorState, Input, PageHeader, Select, SkeletonRows, Table, Tabs, Tag, Td, Th, Tr } from '@/components/ui'
import { useCircuits } from '@/data/hooks/use-circuits'
import { bonusBadgesOf, circuitKind, CITIES, seasonState, type Circuit, type CircuitKind } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatDayMonth, plural } from '@/lib/format'
import { CircuitKindTag } from './components/CircuitKindTag'
import { bookingLabel, circuitStatus } from './lib/labels'

type Filter = 'todos' | CircuitKind

const EMPTY_TEXT: Record<Filter, string> = {
  todos: 'No hay circuitos con esos filtros',
  kplan: "Todavía no hay especiales de K'Plan con esos filtros",
  creative: 'No hay circuitos creativos con esos filtros',
  private: 'No hay circuitos privados con esos filtros',
}

/** El catálogo de circuitos de la app, con los especiales de K'Plan primero. */
export function CircuitsPage() {
  useDocumentTitle('Circuitos')
  const navigate = useNavigate()
  const { today } = useNow()
  const circuits = useCircuits()
  const [filter, setFilter] = useState<Filter>('todos')
  const [city, setCity] = useState('')
  const [search, setSearch] = useState('')

  const all = circuits.data ?? []
  const count = (kind: CircuitKind) => all.filter((item) => circuitKind(item) === kind).length
  const kindOrder: Record<CircuitKind, number> = { kplan: 0, creative: 1, private: 2 }
  const shown = all
    .filter((item) => filter === 'todos' || circuitKind(item) === filter)
    .filter((item) => !city || item.city === city)
    .filter((item) => !search || `${item.title} ${item.shortTitle} ${item.city}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => kindOrder[circuitKind(a)] - kindOrder[circuitKind(b)] || a.shortTitle.localeCompare(b.shortTitle, 'es'))

  const live = all.filter((item) => !item.draft)
  const liveCount = (kind: CircuitKind) => live.filter((item) => circuitKind(item) === kind).length
  const drafts = all.length - live.length
  const nextSeason = live
    .filter((item) => seasonState(item, today) === 'upcoming')
    .sort((a, b) => (a.availableFrom ?? '').localeCompare(b.availableFrom ?? ''))[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Circuitos"
        description="Los recorridos que el turista agenda en la app: los privados, los creativos de las alcaldías y los especiales de K'Plan, que dan insignias extra al completarlos."
        actions={
          <ButtonLink to={paths.newCircuit} variant="primary" icon={<Plus size={16} />}>
            Nuevo circuito
          </ButtonLink>
        }
      />

      {circuits.isSuccess && all.length > 0 && (
        <p className="max-w-[72ch] text-lead text-muted">
          La app tiene <strong className="font-semibold text-ink">{plural(live.length, 'circuito', 'circuitos')}</strong>:{' '}
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
            { value: 'todos', label: 'Todos', count: all.length },
            { value: 'kplan', label: "Especiales de K'Plan", count: count('kplan') },
            { value: 'creative', label: 'Creativos', count: count('creative') },
            { value: 'private', label: 'Privados', count: count('private') },
          ]}
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <Select aria-label="Ciudad" value={city} onChange={(event) => setCity(event.target.value)} className="w-52">
            <option value="">Todas las ciudades</option>
            {CITIES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
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
          title={EMPTY_TEXT[filter]}
          action={
            filter === 'kplan' && (
              <ButtonLink to={paths.newCircuit} icon={<Plus size={16} />}>
                Crear un especial
              </ButtonLink>
            )
          }
        >
          {filter === 'kplan' && 'Un especial junta paradas de una ciudad y da insignias extra a quien lo completa.'}
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
  const kind = circuitKind(circuit)
  const bonus = bonusBadgesOf(circuit)
  const status = circuitStatus(circuit, today)
  return (
    <Tr interactive onClick={onOpen} className={circuit.draft ? 'bg-canvas/50' : undefined}>
      <Td>
        <div className="flex items-center gap-3">
          {circuit.images[0] ? (
            <img src={circuit.images[0]} alt="" loading="lazy" className="size-10 shrink-0 rounded-sm bg-placeholder object-cover" />
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
        <CircuitKindTag kind={kind} />
        {kind === 'creative' && circuit.organizer && <p className="mt-1 text-caption text-muted">{circuit.organizer}</p>}
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
          {bonus > 0 && <span className="font-semibold text-brand-strong">+ {bonus} extra</span>}
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
