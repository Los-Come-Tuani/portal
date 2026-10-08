import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, EmptyState, Field, Input, SegmentedControl, Select, SkeletonRows, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useCreatePlaceRequest } from '@/data/hooks/use-place-requests'
import { useAvailablePlaces } from '@/data/hooks/use-places'
import { coverUrl, STOP_CATEGORIES, type StopCategory } from '@/data/models'
import { placeRequestInputSchema } from '@/data/schemas/place-request.schema'
import { cn } from '@/lib/cn'

type Kind = 'claim' | 'new'

interface Draft {
  kind: Kind
  stopId: string
  name: string
  category: StopCategory
  address: string
  note: string
}

const EMPTY: Draft = { kind: 'claim', stopId: '', name: '', category: 'Gastronomía', address: '', note: '' }

/** Una organización aprobada pide administrar otro lugar; el equipo lo aprueba. Solo existe en la demo. */
export function AddPlaceDialog({ open, city, onClose }: { open: boolean; city: string; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Agregar un lugar"
      description="El equipo de K'Plan revisa tu pedido. Si es un lugar nuevo, puedes ir armando su ficha mientras tanto."
    >
      <AddPlaceForm key={String(open)} city={city} onDone={onClose} />
    </Dialog>
  )
}

function AddPlaceForm({ city, onDone }: { city: string; onDone: () => void }) {
  const create = useCreatePlaceRequest()
  const available = useAvailablePlaces(city)
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
  }

  const input =
    draft.kind === 'claim'
      ? { kind: 'claim' as const, stopId: draft.stopId, note: draft.note }
      : { kind: 'new' as const, newPlace: { name: draft.name, category: draft.category, address: draft.address }, note: draft.note }

  const submit = () => {
    const result = placeRequestInputSchema.safeParse(input)
    if (!result.success) {
      const found: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path.at(-1) === undefined ? '' : String(issue.path.at(-1))
        if (!(key in found)) found[key] = issue.message
      }
      setErrors(found)
      return
    }
    create.mutate(result.data, {
      onSuccess: (request) => {
        toast({
          title: 'Mandaste tu pedido',
          description: request.kind === 'new' ? 'Arma su ficha en Mis lugares: con una foto y su ubicación en el mapa, el equipo lo puede aprobar.' : 'Te avisamos cuando el equipo lo revise.',
        })
        onDone()
      },
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setErrors(error.fieldErrors)
        else toast({ title: errorMessage(error), tone: 'error' })
      },
    })
  }

  const places = (available.data ?? []).filter(
    (stop) => !search || `${stop.name} ${stop.address}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <SegmentedControl
        label="Tipo de lugar"
        value={draft.kind}
        onChange={(kind) => update({ kind })}
        options={[
          { value: 'claim', label: 'Ya está en la app' },
          { value: 'new', label: 'Es nuevo' },
        ]}
        className="self-start"
      />

      {draft.kind === 'claim' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium text-ink">Lugares de {city} que no administra nadie</legend>
          <Input
            type="search"
            aria-label="Buscar lugar"
            placeholder="Buscar por nombre o dirección"
            leading={<Search size={16} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {available.isPending ? (
            <SkeletonRows rows={3} />
          ) : places.length === 0 ? (
            <EmptyState icon={<MapPin size={20} />} title="No hay lugares sin dueño con ese nombre" className="rounded-kp border border-divider py-8">
              Si tu lugar no está, elige "Es nuevo".
            </EmptyState>
          ) : (
            <div role="radiogroup" className="flex max-h-64 flex-col divide-y divide-divider overflow-y-auto rounded-kp border border-divider">
              {places.map((stop) => (
                <label
                  key={stop.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors duration-150',
                    draft.stopId === stop.id ? 'bg-canvas' : 'hover:bg-canvas',
                  )}
                >
                  <input
                    type="radio"
                    name="lugar"
                    checked={draft.stopId === stop.id}
                    onChange={() => update({ stopId: stop.id })}
                    className="size-4 shrink-0 cursor-pointer accent-ink"
                  />
                  <img src={coverUrl(stop.images)} alt="" loading="lazy" className="size-10 shrink-0 rounded-sm bg-placeholder object-cover" />
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
          {errors.stopId && <p className="text-caption font-medium text-danger">{errors.stopId}</p>}
        </fieldset>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del lugar" error={errors.name}>
            {(control) => <Input {...control} value={draft.name} placeholder="Ej.: Sendero del cafetal" onChange={(event) => update({ name: event.target.value })} />}
          </Field>
          <Field label="Categoría en la app" error={errors.category}>
            {(control) => (
              <Select {...control} value={draft.category} onChange={(event) => update({ category: event.target.value as StopCategory })}>
                {STOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dirección" className="sm:col-span-2" error={errors.address}>
            {(control) => (
              <Input {...control} value={draft.address} placeholder="Ej.: de la entrada de la finca 200 m al norte" onChange={(event) => update({ address: event.target.value })} />
            )}
          </Field>
        </div>
      )}

      <Field
        label={draft.kind === 'claim' ? 'Por qué lo administras' : 'Algo que el equipo deba saber'}
        optional={draft.kind === 'new'}
        hint={
          draft.kind === 'claim'
            ? 'Ej.: es nuestro local desde 2019; la matrícula está a nombre de la empresa.'
            : 'Se crea como borrador: para aprobarlo necesita al menos una foto y su ubicación en el mapa. Si no se aprueba, el borrador se borra.'
        }
        error={errors.note}
      >
        {(control) => <Textarea {...control} rows={3} value={draft.note} onChange={(event) => update({ note: event.target.value })} />}
      </Field>

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending}>
          Mandar pedido
        </Button>
      </div>
    </form>
  )
}
