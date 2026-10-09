import { Mail, MessageSquareText, Phone, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Button, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Pager, Select, SkeletonRows, Tabs, Tag, Textarea, useToast, type TagTone } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useDemoRequests, useUpdateDemoRequest } from '@/data/hooks/use-landing'
import { DEMO_KIND_LABELS, DEMO_STATUS_LABELS, DEMO_STATUSES, type DemoRequest, type DemoStatus } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime } from '@/lib/format'

type Section = DemoStatus | 'all'

const TONES: Record<DemoStatus, TagTone> = { new: 'brand', contacted: 'planned', scheduled: 'planned', done: 'confirmed', dismissed: 'neutral' }

const SECTION_LABELS: Record<DemoStatus, string> = {
  new: 'Nuevas',
  contacted: 'Contactadas',
  scheduled: 'Agendadas',
  done: 'Realizadas',
  dismissed: 'Descartadas',
}

/**
 * La bandeja de solicitudes de demo (`demo-request/`, F9): quién pidió una demostración desde la
 * landing. `demos.view` la ve; `demos.manage` cambia el estado y anota el seguimiento.
 */
export function DemoRequestsPage() {
  useDocumentTitle('Solicitudes de demo')
  const { can } = useSession()
  const [section, setSection] = useState<Section>('new')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [page, setPage] = useState(1)
  const [attending, setAttending] = useState<DemoRequest | null>(null)
  const requests = useDemoRequests({ status: section === 'all' ? undefined : section, search: deferredSearch || undefined, page, pageSize: 20 })
  const canAttend = can('demos.manage')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Solicitudes de demo"
        description="Quién pidió una demostración desde la landing. Contáctalo, agenda la demo y anota cómo va para que el resto del equipo lo sepa."
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
        <EmptyState icon={<MessageSquareText size={20} />} title={deferredSearch ? 'Ninguna solicitud coincide' : section === 'new' ? 'No hay solicitudes nuevas' : 'No hay solicitudes aquí'}>
          {!deferredSearch && section === 'new' && 'Cuando alguien pida una demo desde la landing, aparece aquí y te llega un aviso.'}
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
                {request.updatedAt && (
                  <p className="mt-2 text-caption text-muted">
                    Última actualización el {formatDateTime(request.updatedAt)}
                    {request.updatedBy && ` por ${request.updatedBy}`}
                  </p>
                )}
                {canAttend && (
                  <div className="mt-4 flex justify-end">
                    <Button variant={request.status === 'new' ? 'primary' : 'secondary'} onClick={() => setAttending(request)}>
                      {request.status === 'new' ? 'Atender' : 'Actualizar'}
                    </Button>
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
    <Dialog open={request !== null} onClose={onClose} title="Atender la solicitud" description={request ? `${request.name}, ${request.organization}` : undefined}>
      {request && <AttendForm key={request.id} request={request} onDone={onClose} />}
    </Dialog>
  )
}

function AttendForm({ request, onDone }: { request: DemoRequest; onDone: () => void }) {
  const [status, setStatus] = useState<DemoStatus>(request.status === 'new' ? 'contacted' : request.status)
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
      <Field label="Estado">
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
      <Field label="Seguimiento" optional hint="Para el equipo: cuándo la contactaste, la fecha de la demo, qué le interesó.">
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
