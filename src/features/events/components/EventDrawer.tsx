import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Dialog, Field, Input, Select, Skeleton, Switch, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useSaveEvent } from '@/data/hooks/use-events'
import { CITIES, cityLocation, coverUrl, EVENT_CATEGORIES, type EventInput, type EventItem, type Stop } from '@/data/models'
import { eventInputSchema } from '@/data/schemas/event.schema'
import { ImageListField } from '@/features/places/components/ImageListField'
import { addDays, todayISO } from '@/lib/dates'
import { clockToInput, inputToClock } from '@/lib/time'

const MapPicker = lazy(() => import('@/features/places/components/MapPicker'))

interface EventDrawerProps {
  open: boolean
  event: EventItem | null
  places: readonly Stop[]
  /** Ciudad por defecto de un evento nuevo. */
  city: string
  isAdmin: boolean
  onClose: () => void
}

export function EventDrawer({ open, event, places, city, isAdmin, onClose }: EventDrawerProps) {
  const title = event ? 'Editar evento' : isAdmin ? "Nuevo evento de K'Plan" : 'Nuevo evento'
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" size="lg" title={title} description="Aparece en la app junto a los eventos de su ciudad.">
      <EventForm key={event?.id ?? 'new'} event={event} places={places} city={city} isAdmin={isAdmin} onDone={onClose} />
    </Dialog>
  )
}

function toInput(event: EventItem): EventInput {
  return {
    title: event.title,
    category: event.category,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    address: event.address,
    description: event.description,
    images: [...event.images],
    price: event.price,
    coordinates: { ...event.coordinates },
    organizerId: event.organizerId,
    stopId: event.stopId,
    status: event.status,
    featured: event.featured,
  }
}

function EventForm({
  event,
  places,
  city,
  isAdmin,
  onDone,
}: {
  event: EventItem | null
  places: readonly Stop[]
  city: string
  isAdmin: boolean
  onDone: () => void
}) {
  const save = useSaveEvent()
  const toast = useToast()
  const firstPlace = places[0]
  const defaultCity = CITIES.find((item) => item.name === city) ?? CITIES[0]
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventInputSchema),
    defaultValues: event
      ? toInput(event)
      : {
          title: '',
          category: EVENT_CATEGORIES[0],
          date: addDays(todayISO(), 7),
          startTime: '10:00 a.m.',
          endTime: '12:00 p.m.',
          location: cityLocation(firstPlace?.city ?? defaultCity.name),
          address: firstPlace?.address ?? '',
          description: '',
          images: firstPlace && coverUrl(firstPlace.images) ? [coverUrl(firstPlace.images) as string] : [],
          price: 0,
          coordinates: firstPlace?.coordinates ?? { latitude: 11.9304, longitude: -85.9564 },
          organizerId: null,
          stopId: firstPlace?.id ?? null,
          status: 'published',
          featured: false,
        },
  })
  const stopId = useWatch({ control, name: 'stopId' })
  const location = useWatch({ control, name: 'location' })
  const startTime = useWatch({ control, name: 'startTime' })
  const endTime = useWatch({ control, name: 'endTime' })
  const price = useWatch({ control, name: 'price' })

  const choosePlace = (value: string) => {
    const place = places.find((stop) => stop.id === value)
    setValue('stopId', place?.id ?? null, { shouldDirty: true })
    if (place) {
      setValue('address', place.address, { shouldDirty: true })
      setValue('coordinates', place.coordinates, { shouldDirty: true })
      setValue('location', cityLocation(place.city), { shouldDirty: true })
    }
  }

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: event?.id, input: { ...input, organizerId: event ? event.organizerId : input.organizerId } },
      {
        onSuccess: () => {
          toast({ title: event ? 'Evento actualizado' : 'Evento publicado' })
          onDone()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    ),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Nombre del evento" error={errors.title?.message}>
        {(field) => <Input {...field} placeholder="Taller de muralismo para jóvenes" {...register('title')} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Categoría" error={errors.category?.message}>
          {(field) => (
            <Select {...field} {...register('category')}>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Fecha" error={errors.date?.message}>
          {(field) => <Input {...field} type="date" min={todayISO()} {...register('date')} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Empieza" optional error={errors.startTime?.message}>
          {(field) => (
            <Input
              {...field}
              type="time"
              value={clockToInput(startTime)}
              onChange={(change) => setValue('startTime', inputToClock(change.target.value), { shouldDirty: true })}
            />
          )}
        </Field>
        <Field label="Termina" optional error={errors.endTime?.message}>
          {(field) => (
            <Input
              {...field}
              type="time"
              value={clockToInput(endTime)}
              onChange={(change) => setValue('endTime', inputToClock(change.target.value), { shouldDirty: true })}
            />
          )}
        </Field>
      </div>

      {places.length > 0 && (
        <Field label="Dónde" hint="En uno de tus lugares, o en otra dirección de la ciudad.">
          {(field) => (
            <Select {...field} value={stopId ?? ''} onChange={(change) => choosePlace(change.target.value)}>
              {places.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
              <option value="">Otra dirección</option>
            </Select>
          )}
        </Field>
      )}

      {!stopId && (
        <>
          <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
            <Field label="Ciudad" error={errors.location?.message}>
              {(field) => (
                <Select
                  {...field}
                  value={location?.split(',')[0] ?? ''}
                  onChange={(change) => setValue('location', cityLocation(change.target.value), { shouldDirty: true })}
                >
                  {CITIES.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              {(field) => <Input {...field} {...register('address')} />}
            </Field>
          </div>
          <Controller
            control={control}
            name="coordinates"
            render={({ field }) => (
              <Suspense fallback={<Skeleton className="h-72" />}>
                <MapPicker value={field.value} onChange={field.onChange} />
              </Suspense>
            )}
          />
        </>
      )}

      <Field
        label="Entrada"
        error={errors.price?.message}
        hint={price === 0 ? 'En la app sale como "Entrada libre".' : 'Precio por persona en córdobas.'}
      >
        {(field) => <Input {...field} type="number" min={0} leading="C$" className="w-48" {...register('price', { valueAsNumber: true })} />}
      </Field>
      <Field label="Descripción" error={errors.description?.message}>
        {(field) => <Textarea {...field} rows={5} {...register('description')} />}
      </Field>
      <Controller
        control={control}
        name="images"
        render={({ field, fieldState }) => (
          <ImageListField value={field.value} onChange={field.onChange} error={fieldState.error?.message} max={6} />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Switch
            label="Publicado"
            description="Apagado, el evento no se ve en la app."
            checked={field.value === 'published'}
            onChange={(checked) => field.onChange(checked ? 'published' : 'hidden')}
          />
        )}
      />
      {isAdmin && (
        <Controller
          control={control}
          name="featured"
          render={({ field }) => (
            <Switch
              label="Destacar en el inicio de la app"
              checked={!!field.value}
              onChange={(checked) => field.onChange(checked)}
            />
          )}
        />
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {event ? 'Guardar' : 'Publicar evento'}
        </Button>
      </div>
    </form>
  )
}
