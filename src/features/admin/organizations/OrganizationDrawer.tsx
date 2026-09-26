import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Checkbox, Dialog, Field, Input, Select, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useSaveOrganization } from '@/data/hooks/use-organizations'
import { usePlaces } from '@/data/hooks/use-places'
import {
  CITIES,
  ORGANIZATION_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
  ORGANIZATION_TYPES,
  type Organization,
  type OrganizationInput,
} from '@/data/models'
import { organizationInputSchema } from '@/data/schemas/admin.schema'

interface OrganizationDrawerProps {
  open: boolean
  organization: Organization | null
  /** Para saber qué lugares ya tienen dueño. */
  organizations: readonly Organization[]
  onClose: () => void
  onSaved?: (organization: Organization) => void
}

export function OrganizationDrawer({ open, organization, organizations, onClose, onSaved }: OrganizationDrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title={organization ? 'Editar organización' : 'Nueva organización'}>
      <OrganizationForm
        key={organization?.id ?? 'new'}
        organization={organization}
        organizations={organizations}
        onDone={(saved) => {
          onClose()
          if (saved) onSaved?.(saved)
        }}
      />
    </Dialog>
  )
}

function OrganizationForm({
  organization,
  organizations,
  onDone,
}: {
  organization: Organization | null
  organizations: readonly Organization[]
  onDone: (saved?: Organization) => void
}) {
  const save = useSaveOrganization()
  const places = usePlaces({})
  const toast = useToast()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationInputSchema),
    defaultValues: organization
      ? {
          type: organization.type,
          name: organization.name,
          kind: organization.kind,
          city: organization.city,
          stopIds: [...organization.stopIds],
          status: organization.status,
          contactName: organization.contactName,
          contactEmail: organization.contactEmail,
          contactPhone: organization.contactPhone,
        }
      : {
          type: 'negocio',
          name: '',
          kind: '',
          city: 'Granada',
          stopIds: [],
          status: 'active',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
        },
  })
  const city = useWatch({ control, name: 'city' })
  const ownerOf = (stopId: string) =>
    organizations.find((item) => item.id !== organization?.id && item.stopIds.includes(stopId))?.name

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: organization?.id, input },
      {
        onSuccess: (saved) => {
          toast({ title: organization ? 'Organización actualizada' : 'Organización creada' })
          onDone(saved)
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    ),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo" error={errors.type?.message}>
          {(field) => (
            <Select {...field} {...register('type')}>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ORGANIZATION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Estado" error={errors.status?.message}>
          {(field) => (
            <Select {...field} {...register('status')}>
              {(['pending', 'active', 'suspended'] as const).map((status) => (
                <option key={status} value={status}>
                  {ORGANIZATION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Nombre" error={errors.name?.message}>
        {(field) => <Input {...field} {...register('name')} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="A qué se dedica" error={errors.kind?.message}>
          {(field) => <Input {...field} placeholder="Restaurante, museo, tabacalera…" {...register('kind')} />}
        </Field>
        <Field label="Ciudad" error={errors.city?.message}>
          {(field) => (
            <Select {...field} {...register('city')}>
              {CITIES.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Controller
        control={control}
        name="stopIds"
        render={({ field, fieldState }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-medium text-ink">Lugares que administra en {city}</legend>
            <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto rounded-kp border border-divider bg-surface p-3">
              {(places.data ?? [])
                .filter((stop) => stop.city === city)
                .map((stop) => {
                  const owner = ownerOf(stop.id)
                  return (
                    <Checkbox
                      key={stop.id}
                      label={stop.name}
                      description={owner ? `Ya es de ${owner}` : stop.category}
                      disabled={!!owner}
                      checked={field.value.includes(stop.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked ? [...field.value, stop.id] : field.value.filter((id) => id !== stop.id),
                        )
                      }
                    />
                  )
                })}
            </div>
            {fieldState.error && <p className="text-caption font-medium text-danger">{fieldState.error.message}</p>}
            {errors.stopIds && !fieldState.error && (
              <p className="text-caption font-medium text-danger">{errors.stopIds.message}</p>
            )}
          </fieldset>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contacto" error={errors.contactName?.message}>
          {(field) => <Input {...field} {...register('contactName')} />}
        </Field>
        <Field label="Teléfono" error={errors.contactPhone?.message}>
          {(field) => <Input {...field} type="tel" {...register('contactPhone')} />}
        </Field>
      </div>
      <Field label="Correo" error={errors.contactEmail?.message} hint="Con este correo entra al portal.">
        {(field) => <Input {...field} type="email" {...register('contactEmail')} />}
      </Field>

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={() => onDone()}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {organization ? 'Guardar' : 'Crear organización'}
        </Button>
      </div>
    </form>
  )
}
