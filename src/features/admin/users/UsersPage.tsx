import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import {
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  SkeletonRows,
  Table,
  Tabs,
  Tag,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { useProviderQueue } from '@/data/hooks/use-providers'
import { useAccounts } from '@/data/hooks/use-users'
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUSES,
  PROVIDER_STATUS_LABELS,
  type Account,
  type AccountRole,
  type AccountStatus,
  type ProviderRequestSummary,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, plural } from '@/lib/format'
import { UserSheet } from './UserSheet'
import { ACCOUNT_STATUS_TONES, accountKind, accountStatusLabel, usesApp } from './status'

type Filter = 'todos' | AccountRole

const TABS: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'turista', label: 'Turistas' },
  { value: 'guia', label: 'Guías' },
  { value: 'traductor', label: 'Traductores' },
  { value: 'negocio', label: 'Negocios' },
  { value: 'alcaldia', label: 'Alcaldías' },
  { value: 'institucion', label: 'Instituciones' },
  { value: 'admin', label: "Equipo K'Plan" },
]

const PAGE_SIZE = 25
const SEARCH_DELAY_MS = 300

function Detail({ account }: { account: Account }) {
  if (account.role === 'admin') {
    return <span className="text-small text-ink">{account.staffRole?.name ?? (account.superuser ? 'Todos los permisos' : 'Sin rol')}</span>
  }
  if (account.organization) {
    return (
      <span className="text-small text-ink">
        {account.organization.name}
        {!account.organization.verified && <span className="text-muted"> · en revisión</span>}
      </span>
    )
  }
  if (account.provider) {
    return (
      <Tag tone={account.provider.status === 'active' ? 'confirmed' : account.provider.status === 'suspended' ? 'danger' : 'planned'}>
        {account.provider.status === 'active' ? 'Verificado' : PROVIDER_STATUS_LABELS[account.provider.status]}
      </Tag>
    )
  }
  return <span className="text-small text-muted">{account.city ?? '—'}</span>
}

/** Todas las cuentas de K'Plan, con los filtros y la paginación del API. */
export function UsersPage() {
  useDocumentTitle('Usuarios')
  const { can } = useSession()
  const [params, setParams] = useSearchParams()
  const filter = (TABS.find((item) => item.value === params.get('tipo'))?.value ?? 'todos') as Filter
  const status = ACCOUNT_STATUSES.find((item) => item === params.get('estado'))
  const search = params.get('buscar') ?? ''
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const [draft, setDraft] = useState(search)
  const [open, setOpen] = useState<Account | null>(null)

  const accounts = useAccounts({ role: filter === 'todos' ? undefined : filter, status, search, page, pageSize: PAGE_SIZE })
  // El expediente de un guía, para llevar a su solicitud: solo cuando se abre uno.
  const applications = useProviderQueue({ status: 'all', pageSize: 100 }, can('guides.view') && open?.role === 'guia')

  const update = useCallback(
    (next: { tipo?: Filter; estado?: AccountStatus | 'todas'; buscar?: string; pagina?: number }) =>
      setParams(
        (current) => {
          const value = new URLSearchParams(current)
          const set = (key: string, raw: string | undefined, empty: string) => {
            if (raw === undefined) return
            if (raw === empty) value.delete(key)
            else value.set(key, raw)
          }
          set('tipo', next.tipo, 'todos')
          set('estado', next.estado, 'todas')
          set('buscar', next.buscar?.trim(), '')
          // Cambiar un filtro vuelve a la primera página.
          if (next.pagina && next.pagina > 1) value.set('pagina', String(next.pagina))
          else value.delete('pagina')
          return value
        },
        { replace: true },
      ),
    [setParams],
  )

  // La búsqueda va al API cuando se deja de escribir.
  useEffect(() => {
    if (draft.trim() === search) return
    const timer = setTimeout(() => update({ buscar: draft }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, search, update])

  const applicationOf = (account: Account): ProviderRequestSummary | undefined =>
    applications.data?.results.filter((item) => item.applicant.id === account.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  const rows = accounts.data?.results ?? []
  const filtered = filter !== 'todos' || !!status || !!search

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Todas las cuentas de K'Plan: quienes usan la app (turistas, guías y traductores) y quienes entran al portal."
      />

      {accounts.isSuccess && (
        <p className="max-w-[84ch] text-lead text-muted">
          {filtered ? 'Con estos filtros hay ' : "K'Plan tiene "}
          <strong className="font-semibold text-ink">{plural(accounts.data.elements, 'cuenta', 'cuentas')}</strong>.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Tabs label="Tipo de usuario" value={filter} onChange={(value) => update({ tipo: value })} items={TABS} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            aria-label="Estado de la cuenta"
            value={status ?? 'todas'}
            onChange={(event) => update({ estado: event.target.value as AccountStatus | 'todas' })}
            className="w-52"
          >
            <option value="todas">Todos los estados</option>
            {ACCOUNT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === 'pending' ? 'Sin activar o invitación' : ACCOUNT_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo"
            leading={<Search size={16} />}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-72"
          />
        </div>
      </div>

      {accounts.isPending ? (
        <SkeletonRows rows={8} />
      ) : accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title={filtered ? 'Nadie coincide con estos filtros' : 'Todavía no hay cuentas'}
          action={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft('')
                  update({ tipo: 'todos', estado: 'todas', buscar: '' })
                }}
              >
                Quitar los filtros
              </Button>
            ) : (
              <ButtonLink to={paths.home}>Ir al inicio</ButtonLink>
            )
          }
        >
          {filtered && 'Prueba con otro nombre, otro tipo de usuario o todos los estados.'}
        </EmptyState>
      ) : (
        <>
          <Table id="usuarios" caption="Usuarios">
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Tipo</Th>
                <Th>Detalle</Th>
                <Th>Estado</Th>
                <Th>Cuenta creada</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <Tr key={account.id} interactive onClick={() => setOpen(account)}>
                  <Td>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpen(account)
                      }}
                      className="flex items-center gap-3 text-left"
                    >
                      <Avatar name={account.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink hover:underline">{account.name}</span>
                        <span className="block truncate text-caption text-muted">{account.email}</span>
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <p className="text-small whitespace-nowrap text-ink">{accountKind(account)}</p>
                    <p className="text-caption text-muted">{account.role === null ? '—' : usesApp(account) ? 'Usa la app' : 'Entra al portal'}</p>
                  </Td>
                  <Td>
                    <Detail account={account} />
                  </Td>
                  <Td>
                    <Tag tone={ACCOUNT_STATUS_TONES[account.status]}>{accountStatusLabel(account.status)}</Tag>
                  </Td>
                  <Td className="whitespace-nowrap text-muted tabular-nums">{formatDate(account.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          {accounts.data.pages > 1 && (
            <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-muted tabular-nums">
                Página {accounts.data.current} de {accounts.data.pages} · {plural(accounts.data.elements, 'cuenta', 'cuentas')}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={<ChevronLeft size={16} />} disabled={!accounts.data.hasPrevious} onClick={() => update({ pagina: page - 1 })}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" icon={<ChevronRight size={16} />} disabled={!accounts.data.hasNext} onClick={() => update({ pagina: page + 1 })}>
                  Siguiente
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <UserSheet account={open} application={open?.role === 'guia' ? applicationOf(open) : undefined} onClose={() => setOpen(null)} onChange={setOpen} />
    </div>
  )
}
