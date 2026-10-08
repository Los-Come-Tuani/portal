import { lazy, Suspense, type ReactNode } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Field, Input, Select, Skeleton, Textarea } from '@/components/ui'
import { STOP_CATEGORIES, type StopInput } from '@/data/models'
import { PhotoListField } from './PhotoListField'
import { DurationField, HoursField } from './ScheduleFields'

const MapPicker = lazy(() => import('./MapPicker'))

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-5 border-t border-divider pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-lead font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 max-w-[64ch] text-small text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Los campos que la app ya lee de una parada (stops.json). */
export function StopForm({ form }: { form: UseFormReturn<StopInput> }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form
  const description = useWatch({ control, name: 'description' }) ?? ''
  const tip = useWatch({ control, name: 'tip' }) ?? ''
  const opensAt = useWatch({ control, name: 'opensAt' })
  const closesAt = useWatch({ control, name: 'closesAt' })

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Lo esencial">
        <Field label="Nombre del lugar" error={errors.name?.message}>
          {(field) => <Input {...field} {...register('name')} />}
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <Field label="Categoría" error={errors.category?.message} hint="La app filtra y reparte medallas por categoría.">
            {(field) => (
              <Select {...field} {...register('category')}>
                {STOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dirección" error={errors.address?.message}>
            {(field) => <Input {...field} {...register('address')} />}
          </Field>
        </div>
        <Field
          label="Descripción"
          error={errors.description?.message}
          hint={`${description.length} de 600 letras. Cuenta qué va a vivir el turista.`}
        >
          {(field) => <Textarea {...field} rows={5} maxLength={600} {...register('description')} />}
        </Field>
        <Field
          label="Recomendación para el visitante"
          optional
          error={errors.tip?.message}
          hint={`${tip.length} de 140. En la app sale como "Recomendaciones".`}
        >
          {(field) => <Input {...field} maxLength={140} {...register('tip')} />}
        </Field>
      </FormSection>

      <FormSection title="Horario y visita">
        <HoursField
          opensAt={opensAt}
          closesAt={closesAt}
          errors={{ opensAt: errors.opensAt?.message, closesAt: errors.closesAt?.message }}
          onChange={(hours) => {
            setValue('opensAt', hours.opensAt, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
            setValue('closesAt', hours.closesAt, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
          }}
        />
        <Controller
          control={control}
          name="duration"
          render={({ field, fieldState }) => (
            <DurationField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
      </FormSection>

      <FormSection title="Fotos">
        <Controller
          control={control}
          name="images"
          render={({ field, fieldState }) => (
            <PhotoListField kind="place-photo" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
      </FormSection>

      <FormSection
        title="Ubicación"
        description="El itinerario de la app calcula los traslados con este punto: si está corrido, las horas de llegada salen mal."
      >
        <Controller
          control={control}
          name="coordinates"
          render={({ field }) => (
            <>
              <Suspense fallback={<Skeleton className="h-72" />}>
                <MapPicker value={field.value} onChange={field.onChange} />
              </Suspense>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud" error={errors.coordinates?.latitude?.message}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      step="0.00001"
                      value={field.value.latitude}
                      onChange={(event) => field.onChange({ ...field.value, latitude: Number(event.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Longitud" error={errors.coordinates?.longitude?.message}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      step="0.00001"
                      value={field.value.longitude}
                      onChange={(event) => field.onChange({ ...field.value, longitude: Number(event.target.value) })}
                    />
                  )}
                </Field>
              </div>
            </>
          )}
        />
      </FormSection>
    </div>
  )
}
