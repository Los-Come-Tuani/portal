import { Building2, Landmark, MapPin, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Checkbox, EmptyState, Field, Input, Select, SkeletonRows, Switch, Textarea } from '@/components/ui'
import { usePricing } from '@/data/hooks/use-billing'
import { useAvailablePlaces } from '@/data/hooks/use-places'
import { formatMoney } from '@/lib/format'
import {
  admissionRequirements,
  CITIES,
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_TYPE_LABELS,
  STOP_CATEGORIES,
  type OrganizationType,
  type StopCategory,
} from '@/data/models'
import { cn } from '@/lib/cn'
import type { ApplicationDraft, FieldErrors, StepKey, WizardMode } from '../lib/draft'
import { DocumentUpload } from './DocumentUpload'

export interface StepProps {
  draft: ApplicationDraft
  errors: FieldErrors
  update: (patch: Partial<ApplicationDraft>) => void
  mode: WizardMode
}

const TYPE_OPTIONS: { value: OrganizationType; title: string; detail: string; icon: ReactNode }[] = [
  { value: 'negocio', title: 'Un negocio', detail: 'Restaurante, museo, finca, taller, tour operador, hospedaje…', icon: <Building2 size={20} /> },
  { value: 'alcaldia', title: 'Una alcaldía', detail: 'El equipo de turismo de un municipio, para sus lugares públicos y eventos.', icon: <Landmark size={20} /> },
]

export function StepOrganization({ draft, errors, update, mode }: StepProps) {
  const negocio = draft.type === 'negocio'
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink">{mode === 'assisted' ? 'Se postula como' : 'Te postulas como'}</legend>
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {TYPE_OPTIONS.map((option) => {
            const selected = draft.type === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-kp border bg-surface p-4 transition-colors duration-150',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                  selected ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-divider hover:border-ink/40',
                )}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={option.value}
                  checked={selected}
                  onChange={() => update({ type: option.value, claimedStopIds: [], newPlace: null, documents: [] })}
                  className="sr-only"
                />
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', selected ? 'bg-ink text-canvas' : 'bg-paper text-ink')} aria-hidden="true">
                  {option.icon}
                </span>
                <span>
                  <span className="block text-body font-semibold text-ink">{option.title}</span>
                  <span className="block text-small text-muted">{option.detail}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <Field label={negocio ? 'Nombre del negocio' : 'Nombre de la alcaldía'} hint={negocio ? 'El que ve el turista en la app.' : undefined} error={errors.name}>
        {(control) => (
          <Input {...control} value={draft.name} placeholder={negocio ? 'Ej.: Café La Calzada' : 'Ej.: Alcaldía de Granada'} onChange={(event) => update({ name: event.target.value })} />
        )}
      </Field>

      {negocio && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Razón social" hint="Como aparece en el RUC." error={errors.legalName}>
            {(control) => <Input {...control} value={draft.legalName} onChange={(event) => update({ legalName: event.target.value })} />}
          </Field>
          <Field label="RUC" error={errors.ruc}>
            {(control) => (
              <Input {...control} value={draft.ruc} placeholder="Ej.: J0310000123456" autoComplete="off" onChange={(event) => update({ ruc: event.target.value })} />
            )}
          </Field>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {negocio && (
          <Field label="A qué se dedica" error={errors.kind}>
            {(control) => (
              <Input {...control} value={draft.kind} placeholder="Ej.: cafetería, tour operador, museo…" onChange={(event) => update({ kind: event.target.value })} />
            )}
          </Field>
        )}
        <Field label="Ciudad" error={errors.city}>
          {(control) => (
            <Select {...control} value={draft.city} onChange={(event) => update({ city: event.target.value, claimedStopIds: [] })}>
              <option value="">Elige la ciudad</option>
              {CITIES.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Dirección" hint="Con una referencia, como se da en Nicaragua." error={errors.address}>
        {(control) => (
          <Input {...control} value={draft.address} placeholder="Ej.: de la Catedral 2 cuadras al lago" onChange={(event) => update({ address: event.target.value })} />
        )}
      </Field>

      <Field
        label={negocio ? 'Qué ofrecen a los turistas' : 'Qué quieren hacer en K\'Plan'}
        hint={`${draft.description.trim().length} de 500 caracteres.`}
        error={errors.description}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={500}
            value={draft.description}
            placeholder={negocio ? 'Qué hacen, qué puede vivir el turista y para cuántas personas.' : 'Qué lugares y eventos quieren mantener en la app.'}
            onChange={(event) => update({ description: event.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

export function StepPlace({ draft, errors, update, mode }: StepProps) {
  const places = useAvailablePlaces(draft.city)
  const negocio = draft.type === 'negocio'
  const own = mode === 'assisted' ? 'su' : 'tu'
  const toggle = (stopId: string, checked: boolean) =>
    update({ claimedStopIds: checked ? [...draft.claimedStopIds, stopId] : draft.claimedStopIds.filter((id) => id !== stopId) })

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-medium text-ink">
          {negocio ? `Lugares de ${draft.city} que ya están en la app` : `Lugares públicos de ${draft.city} en la app`}
        </legend>
        <p className="-mt-1 mb-1 text-small text-muted">
          {negocio
            ? `Si ${own} lugar ya aparece, márcalo. Si no, agrégalo abajo como nuevo.`
            : 'Marca los que administra la alcaldía. El equipo de K\'Plan los confirma antes de asignártelos.'}
        </p>
        {places.isPending ? (
          <SkeletonRows rows={3} />
        ) : (places.data ?? []).length === 0 ? (
          <EmptyState icon={<MapPin size={20} />} title="No hay lugares sin dueño en esta ciudad" className="rounded-kp border border-divider bg-surface py-8">
            {negocio ? 'Agrégalo como lugar nuevo.' : 'Puedes seguir sin marcar ninguno.'}
          </EmptyState>
        ) : (
          <div className="flex max-h-80 flex-col divide-y divide-divider overflow-y-auto rounded-kp border border-divider bg-surface">
            {places.data?.map((stop) => (
              <label key={stop.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-canvas">
                <input
                  type="checkbox"
                  checked={draft.claimedStopIds.includes(stop.id)}
                  onChange={(event) => toggle(stop.id, event.target.checked)}
                  className="size-4 shrink-0 cursor-pointer accent-ink"
                />
                <img src={stop.images[0]} alt="" loading="lazy" className="size-10 shrink-0 rounded-sm bg-placeholder object-cover" />
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-ink">{stop.name}</span>
                  <span className="block truncate text-small text-muted">
                    {stop.category} · {stop.address}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.claimedStopIds && <p className="text-caption font-medium text-danger">{errors.claimedStopIds}</p>}
      </fieldset>

      {negocio && (
        <div className="flex flex-col gap-4 rounded-kp border border-divider bg-surface p-4">
          <Switch
            checked={draft.newPlace !== null}
            onChange={(checked) =>
              update({ newPlace: checked ? { name: draft.name, category: 'Gastronomía', address: draft.address } : null })
            }
            label={mode === 'assisted' ? 'Su lugar todavía no está en la app' : 'Mi lugar todavía no está en la app'}
            description={
              mode === 'assisted'
                ? 'Se crea como borrador: su ficha se completa desde el portal y se publica cuando se apruebe.'
                : 'Lo creamos como borrador: completas su ficha desde el portal y se publica cuando te aprueben.'
            }
          />
          {draft.newPlace && (
            <div className="grid gap-4 border-t border-divider pt-4 sm:grid-cols-2">
              <Field label="Nombre del lugar" error={errors['newPlace.name']}>
                {(control) => (
                  <Input
                    {...control}
                    value={draft.newPlace?.name ?? ''}
                    onChange={(event) => draft.newPlace && update({ newPlace: { ...draft.newPlace, name: event.target.value } })}
                  />
                )}
              </Field>
              <Field label="Categoría en la app" error={errors['newPlace.category']}>
                {(control) => (
                  <Select
                    {...control}
                    value={draft.newPlace?.category ?? ''}
                    onChange={(event) => draft.newPlace && update({ newPlace: { ...draft.newPlace, category: event.target.value as StopCategory } })}
                  >
                    {STOP_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Dirección del lugar" className="sm:col-span-2" error={errors['newPlace.address']}>
                {(control) => (
                  <Input
                    {...control}
                    value={draft.newPlace?.address ?? ''}
                    onChange={(event) => draft.newPlace && update({ newPlace: { ...draft.newPlace, address: event.target.value } })}
                  />
                )}
              </Field>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function StepRepresentative({ draft, errors, update, mode }: StepProps) {
  const setRepresentative = (patch: Partial<ApplicationDraft['representative']>) =>
    update({ representative: { ...draft.representative, ...patch } })
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre y apellido" error={errors['representative.name']}>
          {(control) => (
            <Input {...control} autoComplete="name" value={draft.representative.name} onChange={(event) => setRepresentative({ name: event.target.value })} />
          )}
        </Field>
        <Field label="Cargo" error={errors['representative.role']}>
          {(control) => (
            <Input
              {...control}
              value={draft.representative.role}
              placeholder={draft.type === 'negocio' ? 'Ej.: propietaria, gerente…' : 'Ej.: director de turismo…'}
              onChange={(event) => setRepresentative({ role: event.target.value })}
            />
          )}
        </Field>
        <Field label="Cédula" error={errors['representative.cedula']}>
          {(control) => (
            <Input
              {...control}
              autoComplete="off"
              value={draft.representative.cedula}
              placeholder="Ej.: 001-120390-0012K"
              onChange={(event) => setRepresentative({ cedula: event.target.value })}
            />
          )}
        </Field>
        <Field label="Teléfono" error={errors['representative.phone']}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              autoComplete="tel"
              value={draft.representative.phone}
              placeholder="Ej.: +505 8888 8888"
              onChange={(event) => setRepresentative({ phone: event.target.value })}
            />
          )}
        </Field>
      </div>
      <Field
        label="Correo"
        hint={mode === 'assisted' ? 'Aquí le llega la invitación para crear su contraseña.' : 'Con este correo entras al portal y te avisamos de tu solicitud.'}
        error={errors['representative.email']}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            value={draft.representative.email}
            onChange={(event) => setRepresentative({ email: event.target.value })}
          />
        )}
      </Field>
      {mode === 'public' && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contraseña" hint="Mínimo 8 caracteres." error={errors.password}>
            {(control) => (
              <Input {...control} type="password" autoComplete="new-password" value={draft.password} onChange={(event) => update({ password: event.target.value })} />
            )}
          </Field>
          <Field label="Repite la contraseña" error={errors.passwordConfirm}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                value={draft.passwordConfirm}
                onChange={(event) => update({ passwordConfirm: event.target.value })}
              />
            )}
          </Field>
        </div>
      )}
    </div>
  )
}

export function StepDocuments({ draft, errors, update }: StepProps) {
  const requirements = admissionRequirements(draft.type)
  const setDocument = (type: (typeof requirements)[number]['type'], value: ApplicationDraft['documents'][number] | null) =>
    update({ documents: [...draft.documents.filter((item) => item.type !== type), ...(value ? [value] : [])] })
  const optional = requirements.filter((item) => !item.required)

  return (
    <div className="flex flex-col gap-4">
      {requirements
        .filter((item) => item.required)
        .map((item) => (
          <DocumentUpload
            key={item.type}
            type={item.type}
            required
            value={draft.documents.find((document) => document.type === item.type)}
            onChange={(value) => setDocument(item.type, value)}
            error={errors[`documents.${item.type}`]}
          />
        ))}
      {optional.length > 0 && (
        <>
          <h2 className="mt-3 text-body font-semibold text-ink">Si aplican a tu negocio</h2>
          <p className="-mt-3 text-small text-muted">No son obligatorios. Si los subes, el equipo los revisa igual que los demás.</p>
          {optional.map((item) => (
            <DocumentUpload
              key={item.type}
              type={item.type}
              required={false}
              value={draft.documents.find((document) => document.type === item.type)}
              onChange={(value) => setDocument(item.type, value)}
              error={errors[`documents.${item.type}`]}
            />
          ))}
        </>
      )}
    </div>
  )
}

function Summary({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-kp border border-divider bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2.5">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={onEdit}>
          Editar
        </Button>
      </header>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-3 text-body sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function Item({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="text-ink">{value || '—'}</dd>
    </div>
  )
}

export function StepReview({
  draft,
  errors,
  update,
  goTo,
  placeNames,
  mode,
}: StepProps & { goTo: (step: StepKey) => void; placeNames: string[] }) {
  const negocio = draft.type === 'negocio'
  const assisted = mode === 'assisted'
  const pricing = usePricing(assisted)
  return (
    <div className="flex flex-col gap-4">
      <Summary title={assisted ? 'La organización' : 'Tu organización'} onEdit={() => goTo('organization')}>
        <Item label="Tipo" value={ORGANIZATION_TYPE_LABELS[draft.type]} />
        <Item label="Nombre" value={draft.name} />
        {negocio && <Item label="Razón social" value={draft.legalName} />}
        {negocio && <Item label="RUC" value={draft.ruc.toUpperCase()} />}
        <Item label="Ciudad" value={draft.city} />
        <Item label="Dirección" value={draft.address} />
        <Item label="Qué ofrecen" value={draft.description} wide />
      </Summary>
      <Summary title={assisted ? 'Su lugar' : 'Tu lugar'} onEdit={() => goTo('place')}>
        <Item label="Ya en la app" value={placeNames.length > 0 ? placeNames.join(', ') : 'Ninguno'} wide />
        {draft.newPlace && <Item label="Lugar nuevo" value={`${draft.newPlace.name} · ${draft.newPlace.category}`} wide />}
      </Summary>
      <Summary title="Quién la representa" onEdit={() => goTo('representative')}>
        <Item label="Nombre" value={`${draft.representative.name} · ${draft.representative.role}`} />
        <Item label="Cédula" value={draft.representative.cedula} />
        <Item label="Correo" value={draft.representative.email} />
        <Item label="Teléfono" value={draft.representative.phone} />
      </Summary>
      <Summary title="Documentos" onEdit={() => goTo('documents')}>
        {draft.documents.map((document) => (
          <Item
            key={document.type}
            label={ORGANIZATION_DOCUMENT_INFO[document.type].label}
            value={`${document.fileName}${document.pages.length > 1 ? ` · ${document.pages.map((page) => page.label.toLowerCase()).join(' y ')}` : ''}`}
          />
        ))}
      </Summary>
      {assisted && (
        <div className="rounded-kp border border-divider bg-surface p-4">
          <Switch
            checked={draft.charge}
            onChange={(charge) => update({ charge })}
            label={`Cobrar el alta asistida${pricing.data ? ` (${formatMoney(pricing.data.assistedOnboardingFee)})` : ''}`}
            description="Se agrega a su estado de cuenta cuando se apruebe la solicitud. Apágalo si es una cortesía o parte de un convenio."
          />
        </div>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        <Checkbox
          checked={draft.accepted}
          onChange={(event) => update({ accepted: event.target.checked })}
          label={
            assisted
              ? 'La organización me entregó estos datos y documentos, y autorizó el alta'
              : 'Declaro que la información y los documentos son verdaderos'
          }
          description={
            assisted
              ? 'Queda en el historial de la solicitud con tu nombre.'
              : "Si algo no coincide, el equipo de K'Plan puede rechazar la solicitud o suspender la cuenta."
          }
        />
        {errors.accepted && <p className="text-caption font-medium text-danger">{errors.accepted}</p>}
      </div>
    </div>
  )
}