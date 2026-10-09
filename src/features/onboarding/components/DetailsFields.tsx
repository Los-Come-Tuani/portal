import { Field, Input, Select, Textarea } from '@/components/ui'
import { CURRENCIES, CURRENCY_LABELS, type Currency } from '@/data/models'
import { FileSlot } from './FileSlot'
import { HoursFields } from './HoursFields'
import type { ProfileFieldsProps } from './ProfileFields'

/** Un comercio dice cuándo abre y con qué platillo quiere que lo conozcan; las demás suben su documento. */
export function DetailsFields({ data, errors, update }: ProfileFieldsProps) {
  if (data.kind !== 'business') {
    return (
      <FileSlot
        kind="legal-document"
        label={data.kind === 'institution' ? 'Documento que acredita la institución' : 'Documento que acredita tu representación'}
        value={data.document}
        onChange={(document) => update({ document })}
        error={errors.document}
      />
    )
  }

  const dish = data.signatureDish
  const setDish = (patch: Partial<typeof dish>) => update({ signatureDish: { ...dish, ...patch } })

  return (
    <div className="flex flex-col gap-8">
      <HoursFields hours={data.hours} errors={errors} onChange={(hours) => update({ hours })} />

      <section className="flex flex-col gap-5 border-t border-divider pt-8">
        <div>
          <h3 className="text-lead font-semibold text-ink">Tu platillo estrella</h3>
          <p className="mt-0.5 max-w-[64ch] text-small text-muted">El que mejor te representa. El turista lo ve junto a tu comercio.</p>
        </div>
        <Field label="Nombre del platillo" error={errors['signatureDish.name']}>
          {(control) => <Input {...control} value={dish.name} placeholder="Ej.: Vigorón" onChange={(event) => setDish({ name: event.target.value })} />}
        </Field>
        <Field label="Descripción" optional hint={`${dish.description.trim().length} de 1000 caracteres.`} error={errors['signatureDish.description']}>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={1000}
              value={dish.description}
              placeholder="Qué lleva y cómo se sirve."
              onChange={(event) => setDish({ description: event.target.value })}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Precio de referencia" error={errors['signatureDish.referencePrice']}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={dish.referencePrice}
                placeholder="Ej.: 120"
                onChange={(event) => setDish({ referencePrice: event.target.value })}
              />
            )}
          </Field>
          <Field label="Moneda" error={errors['signatureDish.currency']}>
            {(control) => (
              <Select {...control} value={dish.currency} onChange={(event) => setDish({ currency: event.target.value as Currency })}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {CURRENCY_LABELS[currency]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <FileSlot
          kind="signature-dish-photo"
          label="Foto del platillo"
          value={dish.photo}
          onChange={(photo) => setDish({ photo })}
          error={errors['signatureDish.photo']}
        />
      </section>
    </div>
  )
}
