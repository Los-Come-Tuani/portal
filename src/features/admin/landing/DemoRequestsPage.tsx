import { CheckCheck, Mail, MessageSquareText, Phone, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Pager, Select, SkeletonRows, Tabs, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useDemoRequests, useUpdateDemoRequest } from '@/data/hooks/use-landing'
import { DEMO_KIND_LABELS, DEMO_STATUS_LABELS, DEMO_STATUSES, type DemoRequest, type DemoStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime } from '@/lib/format'

type Section = DemoStatus | 'all'

const TONES: Record<DemoStatus, TagTone> = { pending: 'brand', delivered: 'confirmed' }

const SECTION_LABELS: Record<DemoStatus, string> = {
  pending: 'Pendientes',
  delivered: 'Entregadas',
}

/**
 * La bandeja de solicitudes de demo (`demo-request/`, F9): quién pidió una demostración desde la
 * landing. Si al enviarla había una versión publicada, recibió los links ahí mismo y llega
 * entregada; si no, queda pendiente hasta que el equipo se los haga llegar. `demos.view` la ve;
 * `demos.manage` la marca y anota el seguimiento.
 */
export function DemoRequestsPage() {
  useDocumentTitle('Solicitudes de demo')
  const { can } = useSession()
  const [section, setSection] = useState<Section>('pending')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [page, setPage] = useState(1)
  const [attending, setAttending] = useState<DemoRequest | null>(null)
  const requests = useDemoRequests({ status: section === 'all' ? undefined : section, search: deferredSearch || undefined, page, pageSize: 20 })
  const deliver = useUpdateDemoRequest()
  const toast = useToast()
  const canAttend = can('demos.manage')

  const markDelivered = (request: DemoRequest) =>
    deliver.mutate(
      { id: request.id, change: { status: 'delivered' } },
      {
        onSuccess: () => toast({ title: `${request.name} quedó como entregada` }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Solicitudes de demo"
        description="Quién pidió una demo desde la landing. Si había una versión publicada, recibió los links al enviarla. Las pendientes esperan que les hagas llegar el link (por correo o WhatsApp) y las marques como entregadas."
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label="Solicitudes de demo"
          value={section}
          onChange={(value) => {
            setSection(value)
            setPage(1)
          }}
          items={[
            ...DEMO_STATUSES.map((status) => ({
              value: status,
              label: SECTION_LABELS[status],
              count: section === status ? requests.data?.elements : undefined,
            })),
            { value: 'all' as const, label: 'Todas' },
          ]}
          className="flex-1"
        />
        <Input
          aria-label="Buscar por nombre, organización o correo"
          placeholder="Nombre, organización o correo"
          leading={<Search size={15} aria-hidden="true" />}
          value={search}
          onChange={(change) => {
            setSearch(change.target.value)
            setPage(1)
          }}
          className="w-72"
        />
      </div>

      {requests.isPending ? (
        <SkeletonRows rows={4} />
      ) : requests.isError ? (
        <ErrorState error={requests.error} onRetry={() => void requests.refetch()} />
      ) : requests.data.results.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText size={20} />}
          title={deferredSearch ? 'Ninguna solicitud coincide' : section === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes aquí'}
          action={
            deferredSearch ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
              >
                Borrar la búsqueda
              </Button>
            ) : section !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSection('all')
                  setPage(1)
                }}
              >
                Ver todas
              </Button>
            ) : can('releases.view') ? (
              <ButtonLink to={paths.releases}>Ver las versiones de la app</ButtonLink>
            ) : (
              <ButtonLink to={paths.home}>Ir al inicio</ButtonLink>
            )
          }
        >
          {!deferredSearch && section === 'pending' && 'Si alguien pide una demo cuando no hay versión publicada, aparece aquí y te llega un aviso.'}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {requests.data.results.map((request) => (
              <li key={request.id} className="rounded-panel border border-divider bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">{request.organization}</p>
                      <Tag tone="outline">{DEMO_KIND_LABELS[request.kind]}</Tag>
                    </div>
                    <p className="mt-1 text-small text-muted">
                      {request.name}
                      {request.city && ` · ${request.city}`} · la pidió el {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  <Tag tone={TONES[request.status]}>{DEMO_STATUS_LABELS[request.status]}</Tag>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small">
                  <a href={`mailto:${request.email}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-strong hover:underline">
                    <Mail size={14} aria-hidden="true" />
                    {request.email}
                  </a>
                  {request.phone && (
                    <a href={`tel:${request.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-strong hover:underline">
                      <Phone size={14} aria-hidden="true" />
                      {request.phone}
                    </a>
                  )}
                </div>
                {request.message && <p className="mt-3 text-body text-ink">{request.message}</p>}
                {request.notes && (
                  <p className="mt-3 rounded-kp bg-canvas px-3 py-2 text-small text-ink">
                    <span className="font-semibold">Seguimiento: </span>
                    {request.notes}
                  </p>
                )}
                <p className="mt-2 text-caption text-muted">
                  {request.deliveredAt
                    ? `Recibió los links el ${formatDateTime(request.deliveredAt)}`
                    : 'Todavía no recibe los links: no había una versión publicada cuando la envió.'}
                  {request.updatedAt && ` · actualizada el ${formatDateTime(request.updatedAt)}${request.updatedBy ? ` por ${request.updatedBy}` : ''}`}
                </p>
                {canAttend && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => setAttending(request)}>
                      {request.status === 'pending' ? 'Anotar' : 'Actualizar'}
                    </Button>
                    {request.status === 'pending' && (
                      <Button icon={<CheckCheck size={16} />} loading={deliver.isPending && deliver.variables?.id === request.id} onClick={() => markDelivered(request)}>
                        Marcar entregada
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pager page={requests.data} onChange={setPage} noun={{ one: 'solicitud', many: 'solicitudes' }} />
        </>
      )}

      <AttendDialog request={attending} onClose={() => setAttending(null)} />
    </div>
  )
}

function AttendDialog({ request, onClose }: { request: DemoRequest | null; onClose: () => void }) {
  return (
    <Dialog open={request !== null} onClose={onClose} title="Seguimiento de la solicitud" description={request ? `${request.name}, ${request.organization}` : undefined}>
      {request && <AttendForm key={request.id} request={request} onDone={onClose} />}
    </Dialog>
  )
}

function AttendForm({ request, onDone }: { request: DemoRequest; onDone: () => void }) {
  const [status, setStatus] = useState<DemoStatus>(request.status)
  const [notes, setNotes] = useState(request.notes)
  const update = useUpdateDemoRequest()
  const toast = useToast()
  const unchanged = status === request.status && notes.trim() === request.notes

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        update.mutate(
          { id: request.id, change: { status, notes } },
          {
            onSuccess: () => {
              toast({ title: 'Solicitud actualizada' })
              onDone()
            },
            onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
          },
        )
      }}
    >
      <Field label="Estado" hint="Entregada: ya tiene el link de la app, porque lo recibió al enviarla o porque se lo hiciste llegar.">
        {(control) => (
          <Select {...control} value={status} onChange={(change) => setStatus(change.target.value as DemoStatus)}>
            {DEMO_STATUSES.map((value) => (
              <option key={value} value={value}>
                {DEMO_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Seguimiento" optional hint="Para el equipo: por dónde le mandaste el link, qué plataforma pidió, qué le interesó.">
        {(control) => <Textarea {...control} rows={4} maxLength={2000} value={notes} onChange={(change) => setNotes(change.target.value)} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={update.isPending} disabled={unchanged}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
