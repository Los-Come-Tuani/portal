import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useMemo } from 'react'
import { Controller, useForm, useWatch, type Path } from 'react-hook-form'
import { Button, Dialog, Field, Input, Select, Skeleton, Switch, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCities } from '@/data/hooks/use-applications'
import { useEventCategories, useSaveEvent } from '@/data/hooks/use-events'
import { useCityStops } from '@/data/hooks/use-places'
import type { CatalogCity, CulturalEvent, EventCategory, EventInput } from '@/data/models'
import { eventInputSchema } from '@/data/schemas/event.schema'
import { PhotoListField } from '@/features/places/components/PhotoListField'
import { useNow } from '@/hooks/use-now'
import { addDays } from '@/lib/dates'
import { clockToInput } from '@/lib/time'

const MapPicker = lazy(() => import('@/features/places/components/MapPicker'))

interface EventDrawerProps {
  open: boolean
  event: CulturalEvent | null
  /** La ciudad de un evento nuevo: la de la organización, si se sabe. */
  defaultCityId: string
  /** El equipo con `content.moderate`: programa especiales de K'Plan y destaca. */
  moderator: boolean
  onClose: () => void
}

export function EventDrawer({ open, event, defaultCityId, moderator, onClose }: EventDrawerProps) {
  const title = event ? 'Corregir evento' : moderator ? "Nuevo evento especial de K'Plan" : 'Programar un evento'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      size="lg"
      title={title}
      description="Sale en la agenda de la app según sus fechas: nadie lo publica ni lo despublica."
    >
      <EventForm key={event?.id ?? `new-${defaultCityId}`} event={event} defaultCityId={defaultCityId} moderator={moderator} onDone={onClose} />
    </Dialog>
  )
}

function toInput(event: CulturalEvent): EventInput {
  return {
    cityId: event.cityId,
    category: event.category.code,
    name: event.name,
    description: event.description,
    venue: event.venue,
    address: event.address,
    location: { ...event.location },
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: clockToInput(event.startTime),
    endTime: clockToInput(event.endTime),
    entryPrice: event.entryPrice,
    pointId: event.pointId,
    images: [...event.images],
    featured: event.featured,
  }
}

const FORM_FIELDS: readonly Path<EventInput>[] = [
  'cityId',
  'category',
  'name',
  'description',
  'venue',
  'address',
  'location',
  'startDate',
  'endDate',
  'startTime',
  'endTime',
  'entryPrice',
  'pointId',
  'images',
  'featured',
]

interface EventFormProps {
  event: CulturalEvent | null
  defaultCityId: string
  moderator: boolean
  onDone: () => void
}

/** El formulario se arma cuando ya llegaron las ciudades y las clases de evento. */
function EventForm(props: EventFormProps) {
  const cities = useCities()
  const categories = useEventCategories()
  if (cities.isError) return <p className="text-body text-danger">{errorMessage(cities.error)}</p>
  if (categories.isError) return <p className="text-body text-danger">{errorMessage(categories.error)}</p>
  if (!cities.data || !categories.data) return <Skeleton className="h-[32rem]" />
  return <EventFields {...props} cities={cities.data} categories={categories.data} />
}

function EventFields({
  event,
  defaultCityId,
  moderator,
  onDone,
  cities,
  categories,
}: EventFormProps & { cities: CatalogCity[]; categories: EventCategory[] }) {
  const save = useSaveEvent()
  const toast = useToast()
  const { today } = useNow()
  const schema = useMemo(() => eventInputSchema({ today, originalStart: event?.startDate ?? null }), [today, event])
  const activeCities = useMemo(() => cities.filter((city) => city.active || city.id === event?.cityId), [cities, event])
  const fallbackCity = activeCities.find((city) => city.id === defaultCityId) ?? activeCities[0]

  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? toInput(event)
      : {
          cityId: fallbackCity?.id ?? '',
          category: categories[0]?.code ?? '',
          name: '',
          description: '',
          venue: '',
          address: '',
          location: { latitude: fallbackCity?.latitude ?? 12.4343, longitude: fallbackCity?.longitude ?? -86.878 },
          startDate: addDays(today, 7),
          endDate: addDays(today, 7),
          startTime: '18:00',
          endTime: '21:00',
          entryPrice: 0,
          pointId: null,
          images: [],
          featured: false,
        },
  })
  const cityId = useWatch({ control, name: 'cityId' })
  const pointId = useWatch({ control, name: 'pointId' })
  const entryPrice = useWatch({ control, name: 'entryPrice' })
  const startTime = useWatch({ control, name: 'startTime' })
  const endTime = useWatch({ control, name: 'endTime' })
  const city = activeCities.find((item) => item.id === cityId)
  const stops = useCityStops(city?.code)

  const chooseCity = (value: string) => {
    const next = activeCities.find((item) => item.id === value)
    setValue('cityId', value, { shouldDirty: true })
    setValue('pointId', null, { shouldDirty: true })
    if (next) setValue('location', { latitude: next.latitude, longitude: next.longitude }, { shouldDirty: true })
  }

  const choosePlace = (value: string) => {
    const place = stops.data?.find((stop) => stop.id === value)
    setValue('pointId', place?.id ?? null, { shouldDirty: true })
    if (place) {
      setValue('venue', place.name, { shouldDirty: true, shouldValidate: true })
      setValue('address', place.address, { shouldDirty: true })
      setValue('location', place.coordinates, { shouldDirty: true })
    }
  }

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: event?.id, input, moderator },
      {
        onSuccess: (saved) => {
          toast({
            title: event ? 'Evento corregido' : `Programaste ${saved.name}`,
            description: saved.status === 'ongoing' ? 'Ya está en la agenda de la app.' : 'Sale en la agenda de la app como próximo.',
          })
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            for (const [field, message] of Object.entries(error.fieldErrors)) {
              if ((FORM_FIELDS as readonly string[]).includes(field)) setError(field as Path<EventInput>, { message })
            }
          }
          toast({ title: error instanceof ApiError ? (Object.values(error.fieldErrors)[0] ?? errorMessage(error)) : errorMessage(error), tone: 'error' })
        },
      },
    ),
  )

  const overnight = startTime && endTime && endTime < startTime

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Nombre del evento" error={errors.name?.message}>
        {(field) => <Input {...field} placeholder="Noche de marimba en el parque" {...register('name')} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Clase de evento" error={errors.category?.message}>
          {(field) => (
            <Select {...field} {...register('category')}>
              {categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {event ? (
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium text-ink">Ciudad donde ocurre</p>
            <p className="rounded-kp bg-paper px-4 py-2.5 text-body text-ink">{city?.name ?? 'Sin ciudad'}</p>
            <p className="text-small text-muted">La ciudad no se cambia: si se muda, cancélalo y programa otro.</p>
          </div>
        ) : (
          <Field label="Ciudad donde ocurre" error={errors.cityId?.message} hint="Puede ser otra que la tuya: una función que viaja a otra ciudad.">
            {(field) => (
              <Select {...field} value={cityId} onChange={(change) => chooseCity(change.target.value)}>
                {activeCities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Empieza el" error={errors.startDate?.message}>
          {(field) => <Input {...field} type="date" min={event ? undefined : today} {...register('startDate')} />}
        </Field>
        <Field label="Termina el" error={errors.endDate?.message} hint="El mismo día si dura uno solo.">
          {(field) => <Input {...field} type="date" min={today} {...register('endDate')} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Abre a las" error={errors.startTime?.message} hint="El horario de cada día.">
          {(field) => <Input {...field} type="time" {...register('startTime')} />}
        </Field>
        <Field label="Cierra a las" error={errors.endTime?.message} hint={overnight ? 'Termina de madrugada, al día siguiente.' : undefined}>
          {(field) => <Input {...field} type="time" {...register('endTime')} />}
        </Field>
      </div>

      <Field
        label="En un lugar del mapa"
        optional
        error={errors.pointId?.message}
        hint="Si ocurre en un lugar de K'Plan, la app lo enlaza con su ficha."
      >
        {(field) => (
          <Select {...field} value={pointId ?? ''} disabled={stops.isPending && !!city} onChange={(change) => choosePlace(change.target.value)}>
            <option value="">En otro sitio</option>
            {(stops.data ?? []).map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dónde" error={errors.venue?.message}>
          {(field) => <Input {...field} placeholder="Teatro Municipal" {...register('venue')} />}
        </Field>
        <Field label="Dirección" optional error={errors.address?.message}>
          {(field) => <Input {...field} {...register('address')} />}
        </Field>
      </div>
      {!pointId && (
        <Controller
          control={control}
          name="location"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Suspense fallback={<Skeleton className="h-72" />}>
                <MapPicker key={cityId} value={field.value} onChange={field.onChange} />
              </Suspense>
              {fieldState.error && <p className="text-caption font-medium text-danger">{fieldState.error.message ?? 'Marca el punto en el mapa'}</p>}
            </div>
          )}
        />
      )}

      <Field
        label="Entrada"
        error={errors.entryPrice?.message}
        hint={entryPrice === 0 ? 'En la app sale como "Entrada libre".' : 'Precio por persona, en córdobas.'}
      >
        {(field) => <Input {...field} type="number" min={0} step={1} leading="C$" className="w-48" {...register('entryPrice', { valueAsNumber: true })} />}
      </Field>
      <Field label="Descripción" optional error={errors.description?.message}>
        {(field) => <Textarea {...field} rows={5} {...register('description')} />}
      </Field>
      <Controller
        control={control}
        name="images"
        render={({ field, fieldState }) => <PhotoListField kind="event-photo" value={field.value} onChange={field.onChange} error={fieldState.error?.message} max={8} />}
      />
      {moderator && (
        <Controller
          control={control}
          name="featured"
          render={({ field }) => (
            <Switch label="Destacar en el inicio de la app" checked={field.value} onChange={(checked) => field.onChange(checked)} />
          )}
        />
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {event ? 'Guardar cambios' : 'Programar evento'}
        </Button>
      </div>
    </form>
  )
}
