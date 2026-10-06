import { ArrowLeft, Check, Undo2, UserRoundCheck, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, Dialog, ErrorState, Field, PageHeader, Panel, Select, Skeleton, Tag, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useRejectionReasons, useVerificationAction, useVerificationRequest } from '@/data/hooks/use-verification'
import {
  CURRENCY_LABELS,
  DOCUMENT_LABELS,
  HOURS_DAYS,
  isDecidable,
  ORGANIZATION_KIND_LABELS,
  REQUEST_STATUS_LABELS,
  type Currency,
  type DayHours,
  type RequestDetail,
} from '@/data/models'
import { useSession } from '@/features/auth/use-auth'
import { Notice } from '@/features/verification/components/ReviewControls'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/cn'
import { nowLocalDateTime } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { REQUEST_STATUS_TONES } from './status'

/** Una fecha del API (`2026-10-05T14:30:00Z`) con la hora de Nicaragua, como el resto del portal. */
const when = (iso: string) => formatDateTime(nowLocalDateTime(new Date(iso)))

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="break-words text-ink">{children || '—'}</dd>
    </div>
  )
}

function hoursText(row: DayHours | undefined): string {
  if (!row) return 'Sin horario'
  return row.closed ? 'Cerrado' : `${row.opens} a ${row.closes}`
}

function priceText(price: number, currency: string): string {
  const symbol = CURRENCY_LABELS[currency as Currency]?.split(' ')[0] ?? currency
  return `${price} ${symbol}`
}

function Organization({ request }: { request: RequestDetail }) {
  const { business, institution, municipality } = request
  const type = business?.businessType.label ?? institution?.institutionType.label
  const phone = business ? [business.phone, business.alternatePhone].filter(Boolean).join(' · ') : (institution ?? municipality)?.phone
  const email = (institution ?? municipality)?.contactEmail

  return (
    <Panel title="La organización">
      <dl className="grid gap-x-6 gap-y-4 text-body sm:grid-cols-2">
        <Item label="Clase">{ORGANIZATION_KIND_LABELS[request.kind]}</Item>
        <Item label="Nombre">{request.organizationName}</Item>
        <Item label="Ciudad">{request.city.name}</Item>
        {type && <Item label={business ? 'A qué se dedica' : 'Tipo'}>{type}</Item>}
        {business && <Item label="RUC">{business.ruc}</Item>}
        <Item label="Teléfono">{phone}</Item>
        {email && (
          <Item label="Correo de contacto">
            <a href={`mailto:${email}`} className="font-semibold text-brand-strong hover:underline">
              {email}
            </a>
          </Item>
        )}
        {business && <Item label="Dirección">{business.address}</Item>}
        {business && (
          <Item label="Ubicación">
            <a
              href={`https://www.openstreetmap.org/?mlat=${business.latitude}&mlon=${business.longitude}#map=17/${business.latitude}/${business.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-strong hover:underline"
            >
              {business.latitude.toFixed(5)}, {business.longitude.toFixed(5)}
            </a>
          </Item>
        )}
      </dl>
    </Panel>
  )
}

function Business({ request }: { request: RequestDetail }) {
  const { business } = request
  if (!business) return null
  const photo = request.documents.find((document) => document.kind === 'signature_dish_photo')
  return (
    <>
      <Panel title="Horario">
        <dl className="grid gap-x-6 gap-y-3 text-body sm:grid-cols-2">
          {HOURS_DAYS.map(({ weekday, label }) => (
            <Item key={weekday} label={label}>
              {hoursText(business.hours.find((row) => row.weekday === weekday))}
            </Item>
          ))}
        </dl>
      </Panel>
      {business.signatureDish && (
        <Panel title="Platillo estrella">
          <div className="flex flex-wrap gap-5">
            {photo?.url && <img src={photo.url} alt={business.signatureDish.name} className="size-32 shrink-0 rounded-kp bg-placeholder object-cover" />}
            <dl className="grid min-w-0 flex-1 gap-3 text-body">
              <Item label="Nombre">{business.signatureDish.name}</Item>
              <Item label="Precio de referencia">{priceText(business.signatureDish.referencePrice, business.signatureDish.currency)}</Item>
              {business.signatureDish.description && <Item label="Descripción">{business.signatureDish.description}</Item>}
            </dl>
          </div>
        </Panel>
      )}
    </>
  )
}

function Documents({ request }: { request: RequestDetail }) {
  return (
    <Panel title="Archivos" description="Los enlaces de lectura vencen a los pocos minutos: vuelve a abrir la solicitud si caducan.">
      <ul className="flex flex-col divide-y divide-divider">
        {request.documents.map((document) => (
          <li key={document.kind} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="text-body font-medium text-ink">{DOCUMENT_LABELS[document.kind]}</span>
            {document.url ? (
              <a href={document.url} target="_blank" rel="noreferrer" className="text-small font-semibold text-brand-strong hover:underline">
                Abrir el archivo
              </a>
            ) : (
              <span className="text-small text-muted">Sin enlace: el almacenamiento no está configurado</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function History({ request }: { request: RequestDetail }) {
  if (request.history.length === 0) return null
  return (
    <Panel title="Intentos anteriores" description="La misma organización ya se postuló antes: cada vez que se rechaza, corregir abre otra solicitud.">
      <ul className="flex flex-col divide-y divide-divider">
        {request.history.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <p className="flex flex-wrap items-center gap-2">
              <Tag tone={REQUEST_STATUS_TONES[item.status]}>{REQUEST_STATUS_LABELS[item.status]}</Tag>
              <span className="text-small text-muted">Enviada el {when(item.submittedAt)}</span>
            </p>
            {item.reason && <p className="mt-1.5 text-body font-semibold text-ink">{item.reason.label}</p>}
            {item.note && <p className="text-body text-ink">{item.note}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

type Deciding = 'approve' | 'reject' | null

/** Aprobar o rechazar: quien se postuló recibe un correo con la decisión y, si la rechazan, con el motivo. */
function DecisionDialog({ request, deciding, onClose }: { request: RequestDetail; deciding: Deciding; onClose: () => void }) {
  const action = useVerificationAction(request.id)
  const reasons = useRejectionReasons(deciding === 'reject')
  const toast = useToast()
  const [form, setForm] = useState({ key: deciding, reason: '', note: '', errors: {} as Record<string, string> })
  if (form.key !== deciding) setForm({ key: deciding, reason: '', note: '', errors: {} })

  const approving = deciding === 'approve'
  const chosen = reasons.data?.find((item) => item.code === form.reason)

  const fail = (error: Error) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setForm((current) => ({ ...current, errors: error.fieldErrors }))
    else toast({ title: errorMessage(error), tone: 'error' })
  }

  const submit = () => {
    if (!deciding) return
    if (!approving) {
      if (!form.reason) {
        setForm((current) => ({ ...current, errors: { reason: 'Elige por qué se rechaza' } }))
        return
      }
      if (chosen?.requiresText && !form.note.trim()) {
        setForm((current) => ({ ...current, errors: { note: 'Con ese motivo hay que explicarle a la persona qué pasó' } }))
        return
      }
    }
    action.mutate(approving ? { kind: 'approve', note: form.note } : { kind: 'reject', input: { reason: form.reason, note: form.note } }, {
      onSuccess: () => {
        toast({ title: approving ? `${request.organizationName} ya es parte de K'Plan` : 'Rechazaste la solicitud', description: 'Le mandamos un correo a quien se postuló.' })
        onClose()
      },
      onError: fail,
    })
  }

  return (
    <Dialog
      open={deciding !== null}
      onClose={onClose}
      size="sm"
      title={approving ? `Aprobar: ${request.organizationName}` : `Rechazar: ${request.organizationName}`}
      description={
        approving
          ? 'La organización se hace visible para el turista. Quien se postuló entra al portal completo.'
          : 'Quien se postuló recibe el motivo y puede corregir y volver a enviar la solicitud.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={action.isPending}>
            Cancelar
          </Button>
          <Button variant={approving ? 'primary' : 'danger'} icon={approving ? <Check size={16} /> : <X size={16} />} onClick={submit} loading={action.isPending}>
            {approving ? 'Aprobar' : 'Rechazar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {!approving && (
          <Field label="Motivo" error={form.errors.reason}>
            {(control) => (
              <Select
                {...control}
                value={form.reason}
                disabled={!reasons.data}
                data-autofocus
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value, errors: {} }))}
              >
                <option value="">{reasons.data ? 'Elige un motivo' : 'Cargando…'}</option>
                {reasons.data?.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label={approving ? 'Nota' : 'Qué debe corregir'}
          optional={approving || !chosen?.requiresText}
          hint="La lee quien se postuló, en el correo y en el portal."
          error={form.errors.note}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              maxLength={1000}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value, errors: {} }))}
            />
          )}
        </Field>
      </div>
    </Dialog>
  )
}

function DecisionPanel({ request }: { request: RequestDetail }) {
  const { user, can } = useSession()
  const action = useVerificationAction(request.id)
  const toast = useToast()
  const [deciding, setDeciding] = useState<Deciding>(null)
  const canAct = can('organizations.review', 'organizations.manage')
  const canManage = can('organizations.manage')
  const holder = request.takenBy
  const mine = holder?.id === user.id

  const run = (kind: 'take' | 'release') =>
    action.mutate(
      { kind },
      {
        onSuccess: () => toast({ title: kind === 'take' ? 'La tomaste: queda en revisión a tu nombre' : 'La devolviste a la cola' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  if (!isDecidable(request)) {
    const resolution = request.resolution
    return (
      <Panel title="Decisión">
        {resolution?.approved ? (
          <Notice tone="confirmed" title="Aprobada">
            {resolution.note || 'Sin nota.'}
          </Notice>
        ) : (
          <Notice tone="danger" title={resolution?.reason ? `Rechazada: ${resolution.reason.label.toLowerCase()}` : 'Rechazada'}>
            {resolution?.note || 'Sin nota.'}
          </Notice>
        )}
        {resolution && <p className="mt-3 text-small text-muted">{when(resolution.resolvedAt)}{holder ? ` · ${mine ? 'Tú' : holder.name}` : ''}</p>}
      </Panel>
    )
  }

  return (
    <Panel title="Decisión" description="Se atiende por orden de llegada. Quien se postuló recibe un correo con lo que decidas.">
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          {holder ? (
            mine ? (
              'La tienes en revisión.'
            ) : (
              <>
                La tiene en revisión <strong className="font-semibold">{holder.name}</strong>.
              </>
            )
          ) : (
            'Nadie la tiene todavía.'
          )}
        </p>
        {!canAct ? (
          <p className="text-small text-muted">Puedes verla, pero revisarla necesita el permiso de revisar organizaciones.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!holder && (
              <Button icon={<UserRoundCheck size={16} />} onClick={() => run('take')} loading={action.isPending}>
                Tomarla
              </Button>
            )}
            {(!holder || mine || canManage) && (
              <>
                <Button variant={holder ? 'primary' : 'secondary'} icon={<Check size={16} />} onClick={() => setDeciding('approve')}>
                  Aprobar
                </Button>
                <Button variant="secondary" icon={<X size={16} />} onClick={() => setDeciding('reject')}>
                  Rechazar
                </Button>
              </>
            )}
            {holder && (mine || canManage) && (
              <Button variant="ghost" icon={<Undo2 size={16} />} onClick={() => run('release')} loading={action.isPending}>
                Devolver a la cola
              </Button>
            )}
          </div>
        )}
      </div>
      <DecisionDialog request={request} deciding={deciding} onClose={() => setDeciding(null)} />
    </Panel>
  )
}

/** Una solicitud: lo que mandó la organización y lo que el equipo decide. */
export function AdmissionPage() {
  const { applicationId = '' } = useParams()
  const request = useVerificationRequest(applicationId)
  useDocumentTitle(request.data?.organizationName ?? 'Solicitud')
  if (request.isError) return <ErrorState error={request.error} onRetry={() => void request.refetch()} />
  if (!request.data) return <Skeleton className="h-96" />
  const data = request.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.organizationName}
        description={`${ORGANIZATION_KIND_LABELS[data.kind]} · ${data.city.name}`}
        actions={
          <>
            <Tag tone={REQUEST_STATUS_TONES[data.status]}>{REQUEST_STATUS_LABELS[data.status]}</Tag>
            <span className="text-small text-muted">Enviada el {when(data.submittedAt)}</span>
            <ButtonLink to={paths.admissions} variant="ghost" icon={<ArrowLeft size={16} />}>
              Solicitudes
            </ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Quién se postuló">
            {data.applicant ? (
              <dl className="grid gap-x-6 gap-y-3 text-body sm:grid-cols-2">
                <Item label="Nombre">{data.applicant.name}</Item>
                <Item label="Correo">
                  <a href={`mailto:${data.applicant.email}`} className="font-semibold text-brand-strong hover:underline">
                    {data.applicant.email}
                  </a>
                </Item>
              </dl>
            ) : (
              <p className="text-body text-muted">La organización ya no tiene una cuenta vigente.</p>
            )}
          </Panel>
          <Organization request={data} />
          <Business request={data} />
          <Documents request={data} />
          <History request={data} />
        </div>
        <div className="lg:sticky lg:top-24">
          <DecisionPanel request={data} />
        </div>
      </div>
    </div>
  )
}
