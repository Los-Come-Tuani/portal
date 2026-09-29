import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  SkeletonRows,
  Table,
  Tabs,
  Tag,
  Td,
  Textarea,
  Th,
  Tr,
  useToast,
  type TagTone,
} from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useDecidePlaceRequest, usePlaceRequests } from '@/data/hooks/use-place-requests'
import { PLACE_REQUEST_STATUS_LABELS, type PlaceRequest, type PlaceRequestStatus } from '@/data/models'
import { formatDateTime, plural } from '@/lib/format'

const TONES: Record<PlaceRequestStatus, TagTone> = { pending: 'planned', approved: 'confirmed', rejected: 'danger' }

type Deciding = { request: PlaceRequest; decision: 'approved' | 'rejected' }

/** Organizaciones aprobadas que piden administrar otro lugar. */
export function PlaceRequestsView() {
  const requests = usePlaceRequests()
  const [tab, setTab] = useState<'pending' | 'decided'>('pending')
  const [deciding, setDeciding] = useState<Deciding | null>(null)

  const all = requests.data ?? []
  const pending = all.filter((item) => item.status === 'pending')
  const shown = tab === 'pending' ? pending : all.filter((item) => item.status !== 'pending')

  return (
    <div className="flex flex-col gap-6">
      {requests.isSuccess && (
        <p className="max-w-[84ch] text-lead text-muted">
          {pending.length === 0 ? (
            'No hay pedidos de lugares por decidir.'
          ) : (
            <>
              <strong className="font-semibold text-ink">{plural(pending.length, 'pedido', 'pedidos')}</strong> de lugares por decidir. Un lugar
              nuevo queda como borrador de la organización hasta que lo apruebes; uno que ya está en la app se le asigna al aprobarlo.
            </>
          )}
        </p>
      )}

      <Tabs
        label="Estado de los pedidos"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'pending', label: 'Por decidir', count: pending.length },
          { value: 'decided', label: 'Decididos', count: all.length - pending.length },
        ]}
      />

      {requests.isPending ? (
        <SkeletonRows rows={3} />
      ) : requests.isError ? (
        <ErrorState error={requests.error} onRetry={() => void requests.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<MapPin size={20} />} title={tab === 'pending' ? 'No hay pedidos por decidir' : 'Todavía no se ha decidido ninguno'}>
          Las organizaciones aprobadas piden otro lugar desde "Mis lugares" en su portal.
        </EmptyState>
      ) : (
        <Table id={`pedidos-lugares-${tab}`} caption="Pedidos de lugares">
          <thead>
            <tr>
              <Th>Organización</Th>
              <Th>Lugar</Th>
              <Th>Nota</Th>
              <Th>Pedido</Th>
              <Th resizable={false}>{tab === 'pending' ? <span className="sr-only">Decidir</span> : 'Decisión'}</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((request) => (
              <Tr key={request.id}>
                <Td>
                  <Link to={paths.organization(request.organizationId)} className="font-semibold text-ink hover:underline">
                    {request.organizationName}
                  </Link>
                  <p className="text-caption text-muted">Lo pidió {request.requestedByName}</p>
                </Td>
                <Td>
                  <Link to={paths.place(request.stopId)} className="font-semibold text-ink hover:underline">
                    {request.stopName}
                  </Link>
                  <p className="text-caption text-muted">{request.kind === 'new' ? 'Nuevo · en borrador' : 'Ya está en la app'}</p>
                </Td>
                <Td className="max-w-80 text-small whitespace-normal text-ink">{request.note || <span className="text-muted">Sin nota</span>}</Td>
                <Td className="whitespace-nowrap text-muted tabular-nums">{formatDateTime(request.requestedAt)}</Td>
                <Td align="right">
                  {request.status === 'pending' ? (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="quiet" onClick={() => setDeciding({ request, decision: 'rejected' })}>
                        Rechazar
                      </Button>
                      <Button size="sm" onClick={() => setDeciding({ request, decision: 'approved' })}>
                        Aprobar
                      </Button>
                    </div>
                  ) : (
                    <div className="text-left">
                      <Tag tone={TONES[request.status]}>{PLACE_REQUEST_STATUS_LABELS[request.status]}</Tag>
                      <p className="mt-1 text-caption text-muted">
                        {request.decidedByName} · {request.decidedAt && formatDateTime(request.decidedAt)}
                      </p>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <DecideDialog deciding={deciding} onClose={() => setDeciding(null)} />
    </div>
  )
}

function DecideDialog({ deciding, onClose }: { deciding: Deciding | null; onClose: () => void }) {
  const decide = useDecidePlaceRequest()
  const toast = useToast()
  const [state, setState] = useState({ key: deciding?.request.id, note: '', error: '' })
  if (state.key !== deciding?.request.id) setState({ key: deciding?.request.id, note: '', error: '' })

  const approving = deciding?.decision === 'approved'
  const request = deciding?.request

  const submit = () => {
    if (!deciding || !request) return
    if (!approving && state.note.trim().length < 10) {
      setState((current) => ({ ...current, error: 'Explica por qué no se aprueba: la organización lo lee en su portal' }))
      return
    }
    decide.mutate(
      { id: request.id, decision: deciding.decision, note: state.note.trim() },
      {
        onSuccess: () => {
          toast({ title: approving ? `${request.stopName} ya es de ${request.organizationName}` : 'Pedido rechazado' })
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={deciding !== null}
      onClose={onClose}
      size="sm"
      title={request ? `${approving ? 'Aprobar' : 'Rechazar'}: ${request.stopName}` : ''}
      description={
        request
          ? approving
            ? request.kind === 'new'
              ? `Se publica en la app como lugar de ${request.organizationName}.`
              : `${request.organizationName} empieza a administrarlo: edita su ficha, da cupones y ve sus llegadas.`
            : request.kind === 'new'
              ? 'Se borra el borrador del lugar.'
              : 'El lugar sigue sin dueño.'
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={decide.isPending}>
            Cancelar
          </Button>
          <Button variant={approving ? 'primary' : 'danger'} onClick={submit} loading={decide.isPending}>
            {approving ? 'Aprobar' : 'Rechazar'}
          </Button>
        </>
      }
    >
      <Field
        label={approving ? 'Nota' : 'Por qué no se aprueba'}
        optional={approving}
        hint="La organización la lee en su portal."
        error={state.error || undefined}
      >
        {(control) => (
          <Textarea
            {...control}
            data-autofocus
            rows={3}
            value={state.note}
            onChange={(event) => setState((current) => ({ ...current, note: event.target.value, error: '' }))}
          />
        )}
      </Field>
    </Dialog>
  )
}
