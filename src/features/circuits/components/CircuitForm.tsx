import { Landmark, MapPin, Medal, Route, Sparkles } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { Button, Field, Input, SegmentedControl, Select, Skeleton, Textarea } from '@/components/ui'
import {
  CIRCUIT_CATEGORIES,
  CIRCUIT_DIFFICULTIES,
  CREATIVE_BONUS_BADGES,
  KPLAN_BADGE_CATEGORY,
  MAX_BONUS_BADGES,
  type CircuitCategory,
  type CircuitDifficulty,
  type CircuitInput,
  type CircuitKind,
  type Stop,
} from '@/data/models'
import { PhotoListField } from '@/features/places/components/PhotoListField'
import { FormSection } from '@/features/places/components/StopForm'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import type { CircuitErrors } from '../lib/form'
import { StartTimesField } from './StartTimesField'
import { StopsEditor } from './StopsEditor'

const CircuitMap = lazy(() => import('./CircuitMap'))

const KIND_OPTIONS: { value: CircuitKind; title: string; detail: string; icon: ReactNode }[] = [
  {
    value: 'kplan',
    title: "Especial de K'Plan",
    detail: 'Lo arma el equipo. Da insignias extra a quien lo completa.',
    icon: <Sparkles size={19} />,
  },
  {
    value: 'creative',
    title: 'Creativo',
    detail: `De una alcaldía. Se hace en grupo; da ${CREATIVE_BONUS_BADGES} insignias extra y la medalla de su ciudad.`,
    icon: <Landmark size={19} />,
  },
  { value: 'private', title: 'Privado', detail: 'Del catálogo. Cada grupo agenda el suyo.', icon: <Route size={19} /> },
]

interface CircuitFormProps {
  draft: CircuitInput
  errors: CircuitErrors
  update: (patch: Partial<CircuitInput>) => void
  /** Los lugares activos de la ciudad elegida: de aquí salen las paradas. */
  stops: readonly Stop[]
  /** El nombre de las paradas que ya no están en la app. */
  stopNames: Readonly<Record<string, string>>
  /** Las ciudades que el equipo puede elegir; la alcaldía no elige. */
  cities: readonly { id: string; name: string }[]
  cityName: string
  /** La alcaldía que lo organiza: la de quien entró, o la del circuito que ya existe. */
  organizerName: string | null
  /** Una alcaldía sólo hace creativos de su ciudad: no elige tipo ni ciudad. */
  municipalityMode: boolean
  /** Horas de salida con avisos de horario. */
  flaggedTimes: readonly string[]
}

function priceValue(text: string): number {
  const value = Number(text.replace(/[^\d]/g, ''))
  return Number.isFinite(value) ? value : 0
}

export function CircuitForm({ draft, errors, update, stops, stopNames, cities, cityName, organizerName, municipalityMode, flaggedTimes }: CircuitFormProps) {
  const kplan = draft.kind === 'kplan'
  const group = draft.kind === 'creative' || (kplan && draft.bookingMode === 'group')
  const cityStops = draft.stopIds
    .map((id) => stops.find((stop) => stop.id === id))
    .filter((stop): stop is Stop => !!stop && stop.cityId === draft.cityId)
  const seasonal = draft.availableFrom !== null || draft.availableUntil !== null
  const city = cityName || 'la ciudad'

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Qué circuito es">
        {municipalityMode ? (
          <p className="flex items-start gap-3 rounded-kp bg-paper px-4 py-3 text-small text-muted">
            <Landmark size={18} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
            <span>
              <span className="font-semibold text-ink">Circuito creativo de {city}</span>, organizado por {organizerName ?? 'tu alcaldía'}. Se hace en grupo y da{' '}
              {CREATIVE_BONUS_BADGES} insignias extra y la medalla de la ciudad.
            </span>
          </p>
        ) : (
        <fieldset>
          <legend className="sr-only">Tipo de circuito</legend>
          <div role="radiogroup" className="grid gap-2">
            {KIND_OPTIONS.map((option) => {
              const selected = draft.kind === option.value
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-kp border bg-surface px-4 py-3 transition-colors duration-150',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                    selected ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-divider hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="tipo-circuito"
                    value={option.value}
                    checked={selected}
                    onChange={() =>
                      update({
                        kind: option.value,
                        ...(option.value !== 'kplan' ? { availableFrom: null, availableUntil: null } : {}),
                      })
                    }
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      selected ? (option.value === 'kplan' ? 'bg-action text-on-action' : 'bg-ink text-canvas') : 'bg-paper text-ink',
                    )}
                    aria-hidden="true"
                  >
                    {option.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-ink">{option.title}</span>
                    <span className="block text-small text-muted">{option.detail}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {(errors.kind || (!kplan && errors.bookingMode)) && <p className="mt-2 text-caption font-medium text-danger">{errors.kind ?? errors.bookingMode}</p>}
        </fieldset>
        )}

        {kplan && (
          <p className="rounded-kp bg-paper px-4 py-3 text-small text-muted">
            <span className="font-semibold text-ink">La app todavía no conoce los especiales.</span> Hay que actualizarla para que entregue las insignias
            extra, muestre los horarios de grupo de un especial y respete la temporada. Mientras tanto el turista lo ve todo el año como un circuito normal:
            déjalo en borrador hasta que empiece su temporada.
          </p>
        )}

        <div className={cn('grid gap-5', municipalityMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
          {!municipalityMode && (
            <Field label="Ciudad" error={errors.cityId} hint="Todas sus paradas son de esta ciudad.">
              {(control) => (
                <Select {...control} value={draft.cityId} onChange={(event) => update({ cityId: event.target.value })}>
                  <option value="">Elige la ciudad</option>
                  {cities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Categoría" error={errors.category}>
            {(control) => (
              <Select {...control} value={draft.category} onChange={(event) => update({ category: event.target.value as CircuitCategory })}>
                {CIRCUIT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dificultad" error={errors.difficulty}>
            {(control) => (
              <Select {...control} value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value as CircuitDifficulty })}>
                {CIRCUIT_DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {draft.kind === 'creative' && !municipalityMode && (
          <p className="text-small text-muted">
            Lo organiza {organizerName ?? `la alcaldía verificada de ${city}`}: sale en la app como organizadora. Sin una alcaldía verificada en la ciudad no se
            puede crear.
          </p>
        )}

        <Field label="Título" error={errors.title} hint="El que sale arriba en el detalle del circuito.">
          {(control) => (
            <Input {...control} value={draft.title} maxLength={80} placeholder="Ej.: Granada, entre historias y sabores" onChange={(event) => update({ title: event.target.value })} />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Título corto" error={errors.shortTitle} hint={`${draft.shortTitle.length} de 28. Sale en las tarjetas.`}>
            {(control) => (
              <Input {...control} value={draft.shortTitle} maxLength={28} placeholder="Ej.: Granada Histórica" onChange={(event) => update({ shortTitle: event.target.value })} />
            )}
          </Field>
          <Field label="Subtítulo" error={errors.subtitle}>
            {(control) => (
              <Input {...control} value={draft.subtitle} maxLength={60} placeholder="Ej.: Paseo por la historia y la cultura" onChange={(event) => update({ subtitle: event.target.value })} />
            )}
          </Field>
        </div>
        <Field label="Descripción" error={errors.description} hint={`${draft.description.length} de 600 letras. Cuenta qué va a vivir el turista.`}>
          {(control) => <Textarea {...control} rows={4} maxLength={600} value={draft.description} onChange={(event) => update({ description: event.target.value })} />}
        </Field>
        <PhotoListField kind="circuit-photo" value={draft.images} onChange={(images) => update({ images })} error={errors.images} />
      </FormSection>

      <FormSection title="Paradas" description={`En el orden en que se recorren, todas de ${city}. La medalla marca las que dan insignia.`}>
        <StopsEditor
          cityId={draft.cityId}
          cityName={city}
          stops={stops}
          names={stopNames}
          value={draft.stopIds}
          legMinutes={draft.legMinutes}
          onChange={(stopIds, legMinutes) => update({ stopIds, legMinutes })}
          error={errors.stopIds}
        />
      </FormSection>

      <FormSection title="Cómo se hace">
        {kplan && (
          <Field group label="Modalidad" error={errors.bookingMode}>
            {(_, groupProps) => (
              <SegmentedControl
                label="Modalidad"
                labelledBy={groupProps.labelId}
                describedBy={groupProps.describedBy}
                invalid={groupProps.invalid}
                value={draft.bookingMode}
                onChange={(bookingMode) => update({ bookingMode })}
                options={[
                  { value: 'private', label: 'Privado: cada grupo agenda el suyo' },
                  { value: 'group', label: 'En grupo, con horarios y guía' },
                ]}
                className="self-start"
              />
            )}
          </Field>
        )}
        {!kplan && (
          <p className="text-small text-muted">
            {group
              ? 'Los creativos se hacen en grupo: el turista reserva un cupo en una salida que publica un guía aprobado.'
              : 'Cada grupo agenda el suyo: elige fecha, hora de salida y cuántas personas van.'}
          </p>
        )}
        <Field group label="Traslados" error={errors.travelMode} hint="Con vehículo, los tramos de menos de 1 km se siguen caminando.">
          {(_, groupProps) => (
            <SegmentedControl
              label="Traslados"
              labelledBy={groupProps.labelId}
              describedBy={groupProps.describedBy}
              invalid={groupProps.invalid}
              value={draft.travelMode}
              onChange={(travelMode) => update({ travelMode })}
              options={[
                { value: 'walking', label: 'A pie' },
                { value: 'vehicle', label: 'En vehículo' },
              ]}
              className="self-start"
            />
          )}
        </Field>
        <StartTimesField value={draft.startTimes} onChange={(startTimes) => update({ startTimes })} flagged={flaggedTimes} error={errors.startTimes} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Precio por adulto" error={errors.priceAdult} hint={draft.priceAdult === 0 ? 'Gratis.' : `La app le suma 20 % de servicio: ${formatMoney(draft.priceAdult * 1.2)}.`}>
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                leading={<span className="text-small text-muted">C$</span>}
                value={String(draft.priceAdult)}
                onChange={(event) => update({ priceAdult: priceValue(event.target.value) })}
              />
            )}
          </Field>
          <Field label="Precio por niño" error={errors.priceChild} hint="0 si no pagan.">
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                leading={<span className="text-small text-muted">C$</span>}
                value={String(draft.priceChild)}
                onChange={(event) => update({ priceChild: priceValue(event.target.value) })}
              />
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Recompensa" description="Lo que gana el turista al escanear el QR de todas las paradas.">
        {kplan ? (
          <>
            <Field
              group
              label={`Insignias extra de "${KPLAN_BADGE_CATEGORY}"`}
              error={errors.bonusBadges}
              hint="Además de las de sus paradas. Suben las medallas y se canjean por cupones."
            >
              {(_, groupProps) => (
                <SegmentedControl
                  label="Insignias extra"
                  labelledBy={groupProps.labelId}
                  describedBy={groupProps.describedBy}
                  invalid={groupProps.invalid}
                  value={draft.bonusBadges}
                  onChange={(bonusBadges) => update({ bonusBadges })}
                  options={Array.from({ length: MAX_BONUS_BADGES }, (_, index) => ({
                    value: index + 1,
                    label: <span className="tabular-nums">+{index + 1}</span>,
                  }))}
                  className="self-start"
                />
              )}
            </Field>
          </>
        ) : (
          <p className="flex items-start gap-2.5 text-body text-ink">
            <Medal size={18} className="mt-0.5 shrink-0 text-badge-deep" aria-hidden="true" />
            {draft.kind === 'creative'
              ? `Las insignias de sus paradas, ${CREATIVE_BONUS_BADGES} insignias extra de "Circuitos creativos" y la medalla de ${city}.`
              : 'Las insignias de sus paradas. Los privados no dan insignias extra.'}
          </p>
        )}
      </FormSection>

      {kplan && (
        <FormSection
          title="Temporada"
          description="Para una cosecha o unas fiestas patronales. Con la app actualizada, un especial de temporada sólo aparece entre estas fechas."
        >
          <SegmentedControl
            label="Temporada"
            value={seasonal ? 'season' : 'always'}
            onChange={(value) => update(value === 'always' ? { availableFrom: null, availableUntil: null } : { availableFrom: '', availableUntil: '' })}
            options={[
              { value: 'always', label: 'Todo el año' },
              { value: 'season', label: 'De temporada' },
            ]}
            className="self-start"
          />
          {seasonal && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Desde" error={errors.availableFrom}>
                {(control) => (
                  <Input {...control} type="date" value={draft.availableFrom ?? ''} onChange={(event) => update({ availableFrom: event.target.value })} />
                )}
              </Field>
              <Field label="Hasta" error={errors.availableUntil}>
                {(control) => (
                  <Input {...control} type="date" value={draft.availableUntil ?? ''} min={draft.availableFrom ?? undefined} onChange={(event) => update({ availableUntil: event.target.value })} />
                )}
              </Field>
            </div>
          )}
        </FormSection>
      )}

      <FormSection title="Para el turista" description="Dónde se encuentra el grupo y qué tiene que saber antes de salir.">
        <Field label="Punto de encuentro" error={errors.meetingPoint}>
          {(control) => (
            <Input {...control} value={draft.meetingPoint} maxLength={120} placeholder="Ej.: Parque Central de Granada, frente a la Catedral" onChange={(event) => update({ meetingPoint: event.target.value })} />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <CircuitMap stops={cityStops} location={draft.location} onLocationChange={(location) => update({ location })} />
          </Suspense>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <p className={cn('max-w-[60ch] text-caption', errors.location ? 'font-medium text-danger' : 'text-muted')}>
              {errors.location ?? 'Haz clic en el mapa o arrastra el punto terracota para marcar dónde se encuentra el grupo.'}
            </p>
            {cityStops[0] && (
              <Button size="sm" variant="ghost" icon={<MapPin size={15} />} onClick={() => update({ location: { ...cityStops[0].coordinates } })}>
                Usar la parada 1
              </Button>
            )}
          </div>
        </div>
        <Field label="Qué incluye" optional error={errors.includes}>
          {(control) => <Input {...control} value={draft.includes} maxLength={120} placeholder="Ej.: Entradas y degustaciones" onChange={(event) => update({ includes: event.target.value })} />}
        </Field>
        <Field label="Recomendaciones" optional error={errors.recommendations}>
          {(control) => (
            <Textarea {...control} rows={2} maxLength={200} value={draft.recommendations} placeholder="Ej.: Usa ropa cómoda y lleva agua" onChange={(event) => update({ recommendations: event.target.value })} />
          )}
        </Field>
        <Field label="Notas" optional error={errors.notes}>
          {(control) => <Textarea {...control} rows={2} maxLength={200} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} />}
        </Field>
      </FormSection>
    </div>
  )
}
