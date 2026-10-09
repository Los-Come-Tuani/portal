import { Building2, Inbox, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, EmptyState, ErrorState, Input, PageHeader, SkeletonRows, Table, Tabs, Tag, Td, Th, Tr } from '@/components/ui'
import { useOrganizations } from '@/data/hooks/use-organizations'
import {
  ORGANIZATION_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type OrganizationStatus,
} from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'
import { ORGANIZATION_STATUS_TONES } from './status'

type Filter = 'todas' | OrganizationStatus

export function OrganizationsPage() {
  useDocumentTitle('Organizaciones')
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const [filter, setFilter] = useState<Filter>('todas')
  const [search, setSearch] = useState('')

  const all = organizations.data ?? []
  const count = (status: OrganizationStatus) => all.filter((item) => item.status === status).length
  const shown = all
    .filter((item) => filter === 'todas' || item.status === filter)
    .filter((item) => !search || `${item.name} ${item.city} ${item.kind}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || a.name.localeCompare(b.name, 'es'))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizaciones"
        description="Los comercios, instituciones y alcaldías que usan el portal. Todas entran con una solicitud que el equipo revisa."
        actions={
          <ButtonLink to={paths.admissions} icon={<Inbox size={16} />}>
            Solicitudes
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Estado"
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'todas', label: 'Todas', count: all.length },
            { value: 'pending', label: 'En revisión', count: count('pending') },
            { value: 'active', label: 'Activas', count: count('active') },
            { value: 'suspended', label: 'Suspendidas', count: count('suspended') },
          ]}
          className="flex-1"
        />
        <Input
          type="search"
          aria-label="Buscar organización"
          placeholder="Buscar"
          leading={<Search size={16} />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64"
        />
      </div>

      {organizations.isPending ? (
        <SkeletonRows rows={6} />
      ) : organizations.isError ? (
        <ErrorState error={organizations.error} onRetry={() => void organizations.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title={all.length === 0 ? 'Todavía no hay organizaciones' : 'No hay organizaciones con este filtro'}
          action={
            all.length > 0 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter('todas')
                  setSearch('')
                }}
              >
                Quitar los filtros
              </Button>
            ) : (
              <ButtonLink to={paths.admissions} icon={<Inbox size={16} />}>
                Ver solicitudes
              </ButtonLink>
            )
          }
        >
          {all.length === 0 && 'Cada organización entra con una solicitud: al aprobarla, aparece aquí.'}
        </EmptyState>
      ) : (
        <Table id="organizaciones" caption="Organizaciones">
          <thead>
            <tr>
              <Th>Organización</Th>
              <Th>Tipo</Th>
              <Th>Ciudad</Th>
              <Th align="right">Lugares</Th>
              <Th>Estado</Th>
              <Th>Desde</Th>
              <Th>Contacto</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((organization) => (
              <Tr
                key={organization.id}
                interactive
                onClick={() => navigate(paths.organization(organization.id))}
              >
                <Td>
                  <Link
                    to={paths.organization(organization.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="font-semibold text-ink hover:underline"
                  >
                    {organization.name}
                  </Link>
                  <p className="text-caption text-muted">{organization.kind}</p>
                </Td>
                <Td>{ORGANIZATION_TYPE_LABELS[organization.type]}</Td>
                <Td>{organization.city}</Td>
                <Td align="right">{organization.stopIds.length}</Td>
                <Td>
                  <Tag tone={ORGANIZATION_STATUS_TONES[organization.status]}>
                    {ORGANIZATION_STATUS_LABELS[organization.status]}
                  </Tag>
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(organization.joinedAt)}</Td>
                <Td>
                  <p className="text-small text-ink">{organization.contactName}</p>
                  <p className="text-caption text-muted">{organization.contactEmail}</p>
                </Td>
              </Tr>
            ))}
          </tbody>
          </Table>
      )}
    </div>
  )
}
