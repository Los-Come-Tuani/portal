import { Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button, Checkbox, EmptyState, Field, IconButton, Input } from '@/components/ui'
import { AMENITIES, LANGUAGES, type PlaceProfileInput } from '@/data/models'
import { cn } from '@/lib/cn'
import { newOfferingId } from '../forms'
import { FormSection } from './StopForm'

type ProfileForm = UseFormReturn<PlaceProfileInput>

/** Productos o servicios con precio: platos, tours, entradas. */
export function OfferingsForm({ form }: { form: ProfileForm }) {
  const { control, register, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'offerings' })
  const add = () => append({ id: newOfferingId(), name: '', description: '', price: null })

  return (
    <FormSection
      title="Qué ofrecemos"
      description="Lo que el turista puede pedir o comprar, con su precio. Ayuda a decidir antes de agregarte al itinerario."
    >
      {fields.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={20} />}
          title="Todavía no hay productos ni servicios"
          action={
            <Button variant="secondary" icon={<Plus size={16} />} onClick={add}>
              Agregar el primero
            </Button>
          }
          className="rounded-kp border border-dashed border-outline py-8"
        >
          Un plato típico, un recorrido, una entrada: con precio en córdobas o "a consultar".
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {fields.map((item, index) => {
              const errors = formState.errors.offerings?.[index]
              return (
                <li
                  key={item.id}
                  className="grid gap-3 rounded-kp border border-divider bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_9rem_auto] sm:items-start"
                >
                  <Field label="Nombre" error={errors?.name?.message}>
                    {(field) => <Input {...field} placeholder="Indio viejo" {...register(`offerings.${index}.name`)} />}
                  </Field>
                  <Field label="Detalle" optional error={errors?.description?.message}>
                    {(field) => (
                      <Input {...field} placeholder="Con tortilla y cuajada" {...register(`offerings.${index}.description`)} />
                    )}
                  </Field>
                  <Field label="Precio" error={errors?.price?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        leading="C$"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="A consultar"
                        {...register(`offerings.${index}.price`, {
                          setValueAs: (value: string | number | null) =>
                            value === '' || value === null ? null : Number(value),
                        })}
                      />
                    )}
                  </Field>
                  <IconButton
                    label={`Quitar ${item.name || 'este producto'}`}
                    icon={<Trash2 size={16} />}
                    onClick={() => remove(index)}
                    className="text-danger hover:bg-danger/8 sm:mt-6"
                  />
                </li>
              )
            })}
          </ul>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={add} className="self-start">
            Agregar otro
          </Button>
        </>
      )}
    </FormSection>
  )
}

/** Servicios del lugar, idiomas y contacto. */
export function ServicesContactForm({ form }: { form: ProfileForm }) {
  const { control, register, formState } = form
  const contactErrors = formState.errors.contact

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Servicios del lugar" description="Lo que resuelve dudas antes de llegar.">
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              {AMENITIES.map((amenity) => (
                <Checkbox
                  key={amenity.id}
                  label={amenity.label}
                  checked={field.value.includes(amenity.id)}
                  onChange={(event) =>
                    field.onChange(
                      event.target.checked
                        ? [...field.value, amenity.id]
                        : field.value.filter((item: string) => item !== amenity.id),
                    )
                  }
                />
              ))}
            </div>
          )}
        />
      </FormSection>

      <FormSection title="Idiomas en que atienden">
        <Controller
          control={control}
          name="languages"
          render={({ field, fieldState }) => (
            <div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Idiomas">
                {LANGUAGES.map((language) => {
                  const selected = field.value.includes(language)
                  return (
                    <button
                      key={language}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        field.onChange(selected ? field.value.filter((item) => item !== language) : [...field.value, language])
                      }
                      className={cn(
                        'h-9 rounded-full border px-4 text-small font-medium transition-colors duration-150',
                        selected ? 'border-ink bg-ink text-canvas' : 'border-outline bg-field text-ink hover:border-ink/40',
                      )}
                    >
                      {language}
                    </button>
                  )
                })}
              </div>
              {fieldState.error && <p className="mt-2 text-caption font-medium text-danger">{fieldState.error.message}</p>}
            </div>
          )}
        />
      </FormSection>

      <FormSection title="Contacto y redes" description="Todo es opcional. Lo que dejes vacío no aparece en la app.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Teléfono" error={contactErrors?.phone?.message}>
            {(field) => <Input {...field} type="tel" placeholder="+505 8888 8888" {...register('contact.phone')} />}
          </Field>
          <Field label="WhatsApp" error={contactErrors?.whatsapp?.message}>
            {(field) => <Input {...field} type="tel" placeholder="+505 8888 8888" {...register('contact.whatsapp')} />}
          </Field>
          <Field label="Correo" error={contactErrors?.email?.message}>
            {(field) => <Input {...field} type="email" {...register('contact.email')} />}
          </Field>
          <Field label="Sitio web" error={contactErrors?.website?.message}>
            {(field) => <Input {...field} type="url" placeholder="https://" {...register('contact.website')} />}
          </Field>
          <Field label="Instagram" error={contactErrors?.instagram?.message}>
            {(field) => <Input {...field} placeholder="@tulugar" {...register('contact.instagram')} />}
          </Field>
          <Field label="Facebook" error={contactErrors?.facebook?.message}>
            {(field) => <Input {...field} placeholder="Nombre de tu página" {...register('contact.facebook')} />}
          </Field>
        </div>
      </FormSection>
    </div>
  )
}
