import { Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Avatar,
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
import { useGuideApplications } from '@/data/hooks/use-guides'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { useStaffRoles, useUsers } from '@/data/hooks/use-users'
import {
  APPLICATION_STATUS_LABELS,
  USER_STATUS_LABELS,
  type GuideApplication,
  type User,
  type UserRole,
  type UserStatus,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, formatDateTime, plural } from '@/lib/format'
import { APPLICATION_STATUS_TONES } from '../guides/status'
import { UserSheet } from './UserSheet'
import { USER_STATUS_TONES, userKind, usesApp } from './status'

type Filter = 'todos' | UserRole

const TABS: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'turista', label: 'Turistas' },
  { value: 'guia', label: 'Guías y traductores' },
  { value: 'negocio', label: 'Negocios' },
  { value: 'alcaldia', label: 'Alcaldías' },
  { value: 'admin', label: "Equipo K'Plan" },
]

export function UsersPage() {
  useDocumentTitle('Usuarios')
  const { can } = useSession()
  const users = useUsers()
  const organizations = useOrganizations()
  const roles = useStaffRoles()
  const applications = useGuideApplications({}, can('guides.review', 'guides.decide'))
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'todas' | UserStatus>('todas')
  const [openId, setOpenId] = useState<string | null>(null)

  const filter = (TABS.find((item) => item.value === params.get('tipo'))?.value ?? 'todos') as Filter
  const all = users.data ?? []
  const countOf = (role: UserRole) => all.filter((user) => user.role === role).length
  const suspended = all.filter((user) => user.status === 'suspended').length
  const shown = all
    .filter((user) => filter === 'todos' || user.role === filter)
    .filter((user) => status === 'todas' || user.status === status)
    .filter((user) => !search || `${user.name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()))

  const organizationOf = (user: User) => organizations.data?.find((item) => item.id === user.organizationId)
  const roleOf = (user: User) => roles.data?.find((item) => item.id === user.staffRoleId)
  const applicationOf = (user: User): GuideApplication | undefined =>
    applications.data?.filter((item) => item.userId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  const open = all.find((user) => user.id === openId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Todas las cuentas de K'Plan: quienes usan la app (turistas, guías y traductores) y quienes entran al portal."
      />

      {users.isSuccess && (
        <p className="max-w-[84ch] text-lead text-muted">
          K'Plan tiene <strong className="font-semibold text-ink">{plural(all.length, 'cuenta', 'cuentas')}</strong>:{' '}
          <strong className="font-semibold text-ink">{plural(countOf('turista'), 'turista', 'turistas')}</strong>,{' '}
          <strong className="font-semibold text-ink">{plural(countOf('guia'), 'guía o traductor', 'guías y traductores')}</strong>,{' '}
          <strong className="font-semibold text-ink">{plural(countOf('negocio') + countOf('alcaldia'), 'cuenta', 'cuentas')}</strong> de
          negocios y alcaldías y <strong className="font-semibold text-ink">{plural(countOf('admin'), 'persona', 'personas')}</strong> del
          equipo.
          {suspended > 0 && (
            <>
              {' '}
              <strong className="font-semibold text-danger">{plural(suspended, 'está suspendida', 'están suspendidas')}</strong>.
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Tabs
          label="Tipo de usuario"
          value={filter}
          onChange={(value) => setParams(value === 'todos' ? {} : { tipo: value }, { replace: true })}
          items={TABS.map((item) => ({ ...item, count: item.value === 'todos' ? all.length : countOf(item.value) }))}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            aria-label="Estado de la cuenta"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="w-52"
          >
            <option value="todas">Todos los estados</option>
            {(['active', 'suspended', 'invited'] as const).map((value) => (
              <option key={value} value={value}>
                {USER_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo"
            leading={<Search size={16} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-72"
          />
        </div>
      </div>

      {users.isPending ? (
        <SkeletonRows rows={8} />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="Nadie coincide con estos filtros">
          Prueba con otro nombre, otro tipo de usuario o todos los estados.
        </EmptyState>
      ) : (
        <div className="rounded-kp border border-divider bg-surface">
          <Table caption="Usuarios">
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Tipo</Th>
                <Th>Detalle</Th>
                <Th>Estado</Th>
                <Th>Último acceso</Th>
                <Th>Cuenta creada</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => {
                const application = user.role === 'guia' ? applicationOf(user) : undefined
                return (
                  <Tr key={user.id} interactive onClick={() => setOpenId(user.id)}>
                    <Td>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenId(user.id)
                        }}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar name={user.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink hover:underline">{user.name}</span>
                          <span className="block truncate text-caption text-muted">{user.email}</span>
                        </span>
                      </button>
                    </Td>
                    <Td>
                      <p className="text-small whitespace-nowrap text-ink">{userKind(user)}</p>
                      <p className="text-caption text-muted">{usesApp(user) ? 'Usa la app' : 'Entra al portal'}</p>
                    </Td>
                    <Td>
                      {user.role === 'admin' ? (
                        <span className="text-small text-ink">{roleOf(user)?.name ?? 'Sin rol'}</span>
                      ) : user.role === 'negocio' || user.role === 'alcaldia' ? (
                        <span className="text-small text-ink">{organizationOf(user)?.name ?? '—'}</span>
                      ) : application ? (
                        <Tag tone={APPLICATION_STATUS_TONES[application.status]}>
                          {application.status === 'approved' ? 'Verificado' : APPLICATION_STATUS_LABELS[application.status]}
                        </Tag>
                      ) : (
                        <span className="text-small text-muted">{user.city ?? '—'}</span>
                      )}
                    </Td>
                    <Td>
                      <Tag tone={USER_STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</Tag>
                    </Td>
                    <Td className="whitespace-nowrap text-muted tabular-nums">
                      {user.lastSeenAt ? formatDateTime(user.lastSeenAt) : 'Todavía no entra'}
                    </Td>
                    <Td className="whitespace-nowrap text-muted tabular-nums">{formatDate(user.createdAt)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      <UserSheet
        user={open}
        organization={open ? organizationOf(open) : undefined}
        staffRole={open ? roleOf(open) : undefined}
        application={open?.role === 'guia' ? applicationOf(open) : undefined}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}
