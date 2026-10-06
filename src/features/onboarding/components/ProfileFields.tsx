import { lazy, Suspense } from 'react'
import { Field, Input, Select, Skeleton } from '@/components/ui'
import { useBusinessTypes, useCities, useInstitutionTypes } from '@/data/hooks/use-applications'
import type { CatalogCity, CatalogOption, OrganizationData } from '@/data/models'
import type { FieldErrors } from '@/data/schemas/application.schema'

const MapPicker = lazy(() => import('@/features/places/components/MapPicker'))

export interface ProfileFieldsProps {
  data: OrganizationData
  errors: FieldErrors
  update: (patch: Partial<OrganizationData>) => void
}

function CityField({ data, errors, update, cities }: ProfileFieldsProps & { cities: CatalogCity[] | undefined }) {
  return (
    <Field label="Ciudad" error={errors.cityId}>
      {(control) => (
        <Select
          {...control}
          value={data.cityId}
          disabled={!cities}
          // El punto del mapa era de la ciudad anterior: se vuelve a marcar.
          onChange={(event) => update(data.kind === 'business' ? { cityId: event.target.value, latitude: null, longitude: null } : { cityId: event.target.value })}
        >
          <option value="">{cities ? 'Elige la ciudad' : 'Cargando…'}</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}

function OptionField({
  label,
  error,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string
  error: string | undefined
  value: string
  options: CatalogOption[] | undefined
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} error={error}>
      {(control) => (
        <Select {...control} value={value} disabled={!options} onChange={(event) => onChange(event.target.value)}>
          <option value="">{options ? placeholder : 'Cargando…'}</option>
          {options?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}

/** Quién es y cómo se la contacta; en un comercio, también dónde queda. */
export function ProfileFields(props: ProfileFieldsProps) {
  const { data, errors, update } = props
  const cities = useCities()
  const businessTypes = useBusinessTypes()
  const institutionTypes = useInstitutionTypes()
  const city = cities.data?.find((item) => item.id === data.cityId)

  const nameLabel =
    data.kind === 'business' ? 'Nombre del comercio' : data.kind === 'institution' ? 'Nombre de la institución' : 'Nombre oficial de la alcaldía'

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <CityField {...props} cities={cities.data} />
        {data.kind === 'business' && (
          <OptionField
            label="A qué se dedica"
            error={errors.businessTypeId}
            value={data.businessTypeId}
            options={businessTypes.data}
            placeholder="Elige el tipo de comercio"
            onChange={(businessTypeId) => update({ businessTypeId })}
          />
        )}
        {data.kind === 'institution' && (
          <OptionField
            label="Tipo de institución"
            error={errors.institutionTypeId}
            value={data.institutionTypeId}
            options={institutionTypes.data}
            placeholder="Elige el tipo de institución"
            onChange={(institutionTypeId) => update({ institutionTypeId })}
          />
        )}
      </div>

      <Field label={nameLabel} hint={data.kind === 'business' ? 'El que ve el turista en la app.' : undefined} error={errors.name}>
        {(control) => (
          <Input
            {...control}
            value={data.name}
            placeholder={data.kind === 'business' ? 'Ej.: Café La Calzada' : data.kind === 'institution' ? 'Ej.: Teatro Municipal' : 'Ej.: Alcaldía de León'}
            onChange={(event) => update({ name: event.target.value })}
          />
        )}
      </Field>

      {data.kind === 'business' && (
        <Field label="RUC" hint="Como aparece en tu constancia de RUC." error={errors.ruc}>
          {(control) => (
            <Input {...control} value={data.ruc} autoComplete="off" placeholder="Ej.: J0310000123456" onChange={(event) => update({ ruc: event.target.value })} />
          )}
        </Field>
      )}

      {data.kind !== 'business' && (
        <Field label="Correo de contacto" hint="El de la organización: se usa para avisarle de su solicitud." error={errors.contactEmail}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" value={data.contactEmail} onChange={(event) => update({ contactEmail: event.target.value })} />
          )}
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono" error={errors.phone}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              autoComplete="tel"
              value={data.phone}
              placeholder="Ej.: +505 8888 8888"
              onChange={(event) => update({ phone: event.target.value })}
            />
          )}
        </Field>
        {data.kind === 'business' && (
          <Field label="Otro teléfono" optional error={errors.alternatePhone}>
            {(control) => (
              <Input {...control} type="tel" value={data.alternatePhone} onChange={(event) => update({ alternatePhone: event.target.value })} />
            )}
          </Field>
        )}
      </div>

      {data.kind === 'business' && (
        <>
          <Field label="Dirección" hint="Con una referencia, como se da en Nicaragua." error={errors.address}>
            {(control) => (
              <Input
                {...control}
                value={data.address}
                placeholder="Ej.: de la Catedral 2 cuadras al lago"
                onChange={(event) => update({ address: event.target.value })}
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-small font-medium text-ink">Dónde queda</span>
            <p className="text-caption text-muted">
              {city ? `Haz clic en el mapa o arrastra el punto hasta tu local en ${city.name}.` : 'Elige la ciudad y marca el punto de tu local en el mapa.'}
            </p>
            {city && (
              <Suspense fallback={<Skeleton className="h-72" />}>
                <MapPicker
                  key={city.id}
                  value={
                    data.latitude !== null && data.longitude !== null
                      ? { latitude: data.latitude, longitude: data.longitude }
                      : { latitude: city.latitude, longitude: city.longitude }
                  }
                  onChange={(point) => update({ latitude: point.latitude, longitude: point.longitude })}
                />
              </Suspense>
            )}
            {errors.latitude && <p className="text-caption font-medium text-danger">{errors.latitude}</p>}
            {!errors.latitude && errors.longitude && <p className="text-caption font-medium text-danger">{errors.longitude}</p>}
          </div>
        </>
      )}
    </div>
  )
}
