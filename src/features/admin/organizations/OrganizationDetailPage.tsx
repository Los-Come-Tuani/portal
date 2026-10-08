import { ArrowLeft, ArrowRight, Mail, Pencil, Phone, Plus, User, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, ConfirmDialog, ErrorState, IconButton, Panel, Skeleton, Tag, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useBadgeCampaigns } from '@/data/hooks/use-badges'
import { useStatements } from '@/data/hooks/use-billing'
import { useCoupons } from '@/data/hooks/use-coupons'
import { useEvents } from '@/data/hooks/use-events'
import { useOrganization, useRemoveStop, useSaveOrganization } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import { useVerificationQueue } from '@/data/hooks/use-verification'
import {
  coverUrl,
  ORGANIZATION_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  type Organization,
  type OrganizationStatus,
  type Stop,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate, formatMoney, formatMonth, plural } from '@/lib/format'
import { AssignPlacesDialog } from './AssignPlacesDialog'
import { toOrganizationInput } from './input'
import { OrganizationDrawer } from './OrganizationDrawer'
import { ORGANIZATION_STATUS_TONES } from './status'

const STATUS_ACTIONS: Record<OrganizationStatus, { to: OrganizationStatus; label: string; tone: 'primary' | 'danger' }[]> = {
  pending: [
    { to: 'active', label: 'Aprobar', tone: 'primary' },
    { to: 'suspended', label: 'Rechazar', tone: 'danger' },
  ],
  active: [{ to: 'suspended', label: 'Suspender', tone: 'danger' }],
  suspended: [{ to: 'active', label: 'Reactivar', tone: 'primary' }],
}

const CONFIRM_TEXT: Record<OrganizationStatus, string> = {
  active: 'Podrá entrar al portal y su contenido aparece en la app.',
  suspended: 'No podrá entrar al portal. Sus lugares siguen en la app, pero sus cupones y campañas dejan de mostrarse.',
  pending: '',
}

export function OrganizationDetailPage() {
  const { organizationId = '' } = useParams()
  const organization = useOrganization(organizationId)
  const places = usePlaces(
    { ownerKind: organization.data?.type === 'negocio' ? 'business' : 'municipality', ownerId: organizationId },
    !!organization.data,
  )
  const coupons = useCoupons(organizationId)
  const events = useEvents({ organizerId: organizationId })
  const campaigns = useBadgeCampaigns(organizationId)
  const statements = useStatements(organizationId)
  const save = useSaveOrganization()
  const remove = useRemoveStop()
  const toast = useToast()
  const canManage = useSession().can('organizations.manage')
  // La solicitud abierta de esta organización, si la tiene: lleva a revisarla.
  const openRequests = useVerificationQueue({ status: 'open', pageSize: 100 })
  const admission = openRequests.data?.results.find((item) => item.organizationId === organizationId)
  const [editing, setEditing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState<Stop | null>(null)
  const [changing, setChanging] = useState<{ to: OrganizationStatus; label: string } | null>(null)
  useDocumentTitle(organization.data?.name ?? 'Organización')

  if (organization.isError) return <ErrorState error={organization.error} onRetry={() => void organization.refetch()} />
  if (!organization.data) return <Skeleton className="h-96" />

  const org = organization.data
  const due = (statements.data ?? []).filter((statement) => statement.status === 'due' && statement.total > 0)
  const open = statements.data?.find((statement) => statement.status === 'open')

  const changeStatus = (current: Organization, to: OrganizationStatus) => {
    save.mutate(
      { id: current.id, input: toOrganizationInput(current, { status: to }) },
      {
        onSuccess: () => {
          setChanging(null)
          toast({ title: `${current.name}: ${ORGANIZATION_STATUS_LABELS[to].toLowerCase()}` })
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={paths.organizations}
        className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Organizaciones
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold tracking-tight text-ink">{org.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted">
            <Tag tone={ORGANIZATION_STATUS_TONES[org.status]}>{ORGANIZATION_STATUS_LABELS[org.status]}</Tag>
            <span>
              {ORGANIZATION_TYPE_LABELS[org.type]} · {org.kind} · {org.city}
            </span>
            <span aria-hidden="true">·</span>
            <span>Desde el {formatDate(org.joinedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
          {admission && org.status === 'pending' && (
            <ButtonLink to={paths.admission(admission.id)} variant="primary" icon={<ArrowRight size={16} />}>
              Revisar solicitud
            </ButtonLink>
          )}
          {(admission && org.status === 'pending' ? [] : canManage || org.status === 'pending' ? STATUS_ACTIONS[org.status] : []).map((action) => (
            <Button key={action.to} variant={action.tone} onClick={() => setChanging(action)}>
              {action.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Panel
            title="Lugares"
            description="Las paradas de la app que administra. También puede pedir otros desde su portal."
            actions={
              canManage &&
              org.status === 'active' && (
                <Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => setAssigning(true)}>
                  Asignar lugar
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {places.isPending ? (
              <Skeleton className="m-5 h-20" />
            ) : (places.data ?? []).length === 0 ? (
              <p className="p-5 text-body text-muted">
                {org.status === 'pending' ? 'Se le asignan al aprobar su solicitud.' : 'Todavía no administra ningún lugar.'}
              </p>
            ) : (
              <ul className="divide-y divide-divider">
                {places.data?.map((stop) => (
                  <li key={stop.id} className="flex items-center gap-2 pr-3 hover:bg-canvas">
                    <Link to={paths.place(stop.id)} className="group flex min-w-0 flex-1 items-center gap-4 py-3 pl-5">
                      {coverUrl(stop.images) ? (
                        <img src={coverUrl(stop.images)} alt="" loading="lazy" className="size-12 rounded-sm bg-placeholder object-cover" />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-sm bg-paper text-caption text-muted">Sin foto</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                          {stop.name}
                          {!stop.active && <Tag tone="outline">Fuera de la app</Tag>}
                        </span>
                        <span className="block text-small text-muted">
                          {stop.category}
                          {stop.hasBadge && ' · da insignia'}
                        </span>
                      </span>
                      <ArrowRight size={16} className="text-muted group-hover:text-ink" aria-hidden="true" />
                    </Link>
                    {canManage && stop.active && (
                      <IconButton size="sm" tone="danger" label={`Quitarle ${stop.name}`} icon={<X size={16} />} onClick={() => setRemoving(stop)} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Actividad">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-small text-muted">Cupones</dt>
                <dd className="text-lead font-semibold text-ink">{plural(coupons.data?.length ?? 0, 'cupón', 'cupones')}</dd>
              </div>
              <div>
                <dt className="text-small text-muted">Eventos</dt>
                <dd className="text-lead font-semibold text-ink">{plural(events.data?.length ?? 0, 'evento', 'eventos')}</dd>
              </div>
              <div>
                <dt className="text-small text-muted">Campañas de insignias</dt>
                <dd className="text-lead font-semibold text-ink">
                  {plural(campaigns.data?.filter((item) => item.status !== 'cancelled').length ?? 0, 'campaña', 'campañas')}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Contacto">
            <ul className="flex flex-col gap-3 text-body">
              <li className="flex items-center gap-2.5 text-ink">
                <User size={16} className="text-muted" aria-hidden="true" />
                {org.contactName}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-muted" aria-hidden="true" />
                <a href={`mailto:${org.contactEmail}`} className="text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
                  {org.contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-ink">
                <Phone size={16} className="text-muted" aria-hidden="true" />
                {org.contactPhone}
              </li>
            </ul>
          </Panel>

          <Panel title="Cobros">
            {statements.isPending ? (
              <Skeleton className="h-16" />
            ) : (
              <div className="flex flex-col gap-3 text-body">
                <p className="flex items-baseline justify-between gap-4">
                  <span className="text-muted">Mes en curso</span>
                  <span className="font-semibold text-ink tabular-nums">{formatMoney(open?.total ?? 0)}</span>
                </p>
                {due.length === 0 ? (
                  <p className="text-small text-confirmed">Al día con sus pagos.</p>
                ) : (
                  due.map((statement) => (
                    <p key={statement.id} className="flex items-baseline justify-between gap-4 text-danger">
                      <span>Por pagar: {formatMonth(statement.period)}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(statement.total)}</span>
                    </p>
                  ))
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <OrganizationDrawer open={editing} organization={org} onClose={() => setEditing(false)} />
      <AssignPlacesDialog open={assigning} organization={org} onClose={() => setAssigning(false)} />
      <ConfirmDialog
        open={removing !== null}
        title={`Quitarle ${removing?.name ?? ''} a ${org.name}`}
        confirmLabel="Quitar"
        loading={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(
            removing.id,
            {
              onSuccess: () => {
                toast({ title: `${removing.name} quedó sin dueño` })
                setRemoving(null)
              },
              onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
            },
          )
        }
      >
        El lugar sigue en la app, pero {org.name} deja de editarlo y de ver sus llegadas. Sus cupones y campañas en ese lugar dejan de mostrarse.
      </ConfirmDialog>
      <ConfirmDialog
        open={changing !== null}
        tone={changing?.to === 'active' ? 'primary' : 'danger'}
        title={changing ? `${changing.label} ${org.name}` : ''}
        confirmLabel={changing?.label ?? ''}
        loading={save.isPending}
        onClose={() => setChanging(null)}
        onConfirm={() => changing && changeStatus(org, changing.to)}
      >
        {changing && CONFIRM_TEXT[changing.to]}
      </ConfirmDialog>
    </div>
  )
}
