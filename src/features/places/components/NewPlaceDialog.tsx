import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, Dialog, Field, Input, Select, Skeleton, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCities } from '@/data/hooks/use-applications'
import { useCreatePlace } from '@/data/hooks/use-places'
import { STOP_CATEGORIES, type CatalogCity, type LatLng, type StopCategory } from '@/data/models'
import { newStopInputSchema } from '@/data/schemas/stop.schema'

const MapPicker = lazy(() => import('./MapPicker'))

interface NewPlaceDialogProps {
  open: boolean
  onClose: () => void
  /** La ciudad de la alcaldía; `null` para el equipo, que la elige. */
  ownCity: CatalogCity | null
}

/** Un lugar nuevo con lo mínimo para ponerlo en el mapa; la ficha se completa en su editor. */
export function NewPlaceDialog({ open, onClose, ownCity }: NewPlaceDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Nuevo lugar"
      description="Sale en la app al crearlo. Después completas su ficha: fotos, horario, descripción y lo que ofrece."
    >
      <NewPlaceForm key={String(open)} ownCity={ownCity} onDone={onClose} />
    </Dialog>
  )
}

function NewPlaceForm({ ownCity, onDone }: { ownCity: CatalogCity | null; onDone: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreatePlace()
  const cities = useCities()
  const active = (cities.data ?? []).filter((city) => city.active)
  const [cityId, setCityId] = useState(ownCity?.id ?? '')
  const city = ownCity ?? active.find((item) => item.id === cityId) ?? null
  const [name, setName] = useState('')
  const [category, setCategory] = useState<StopCategory>('Historia')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState<LatLng | null>(ownCity ? { latitude: ownCity.latitude, longitude: ownCity.longitude } : null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const chooseCity = (id: string) => {
    setCityId(id)
    const next = active.find((item) => item.id === id)
    if (next) setCoordinates({ latitude: next.latitude, longitude: next.longitude })
    setErrors({})
  }

  const submit = () => {
    if (!ownCity && !cityId) {
      setErrors({ cityId: 'Elige la ciudad del lugar' })
      return
    }
    const result = newStopInputSchema.safeParse({
      cityId: ownCity ? null : cityId,
      name,
      category,
      address,
      coordinates: coordinates ?? { latitude: Number.NaN, longitude: Number.NaN },
    })
    if (!result.success) {
      const found: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (!(key in found)) found[key] = issue.message
      }
      setErrors(found)
      return
    }
    create.mutate(result.data, {
      onSuccess: (stop) => {
        toast({ title: `Creaste ${stop.name}`, description: 'Completa su ficha para que se vea bien en la app.' })
        onDone()
        navigate(paths.place(stop.id))
      },
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
          setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([field, message]) => [field.split('.')[0], message])))
        } else {
          toast({ title: errorMessage(error), tone: 'error' })
        }
      },
    })
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del lugar" error={errors.name}>
          {(control) => <Input {...control} value={name} maxLength={80} placeholder="Ej.: Mirador del Cerro Negro" onChange={(event) => setName(event.target.value)} />}
        </Field>
        <Field label="Categoría en la app" error={errors.category}>
          {(control) => (
            <Select {...control} value={category} onChange={(event) => setCategory(event.target.value as StopCategory)}>
              {STOP_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {ownCity ? (
          <p className="text-small text-muted sm:col-span-2">
            Se crea en <strong className="font-semibold text-ink">{ownCity.name}</strong> y queda a nombre de tu alcaldía.
          </p>
        ) : (
          <Field label="Ciudad" error={errors.cityId}>
            {(control) => (
              <Select {...control} value={cityId} onChange={(event) => chooseCity(event.target.value)}>
                <option value="">Elige la ciudad</option>
                {active.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Dirección" className={ownCity ? 'sm:col-span-2' : undefined} error={errors.address}>
          {(control) => <Input {...control} value={address} maxLength={140} placeholder="Ej.: del parque central 2 c. al norte" onChange={(event) => setAddress(event.target.value)} />}
        </Field>
      </div>

      {coordinates && city ? (
        <div className="flex flex-col gap-1.5">
          <Suspense fallback={<Skeleton className="h-72" />}>
            <MapPicker value={coordinates} onChange={setCoordinates} />
          </Suspense>
          <p className={errors.coordinates ? 'text-caption font-medium text-danger' : 'text-caption text-muted'}>
            {errors.coordinates ?? `Haz clic en el mapa o arrastra el punto hasta el lugar. Empieza en el centro de ${city.name}.`}
          </p>
        </div>
      ) : (
        <p className="rounded-kp border border-dashed border-outline px-4 py-6 text-center text-small text-muted">Elige la ciudad para ubicar el lugar en el mapa.</p>
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending}>
          Crear lugar
        </Button>
      </div>
    </form>
  )
}
