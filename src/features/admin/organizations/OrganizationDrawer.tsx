import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button, Dialog, Field, Input, Select, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useSaveOrganization } from '@/data/hooks/use-organizations'
import { CITIES, ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPES, type Organization, type OrganizationInput } from '@/data/models'
import { organizationInputSchema } from '@/data/schemas/admin.schema'

interface OrganizationDrawerProps {
  open: boolean
  organization: Organization
  onClose: () => void
}

/**
 * Los datos de una organización que ya existe. Entra con una solicitud; su
 * estado se cambia con Aprobar o Suspender, y sus lugares desde el detalle.
 */
export function OrganizationDrawer({ open, organization, onClose }: OrganizationDrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title="Editar organización" description="Datos y contacto. Sus lugares se asignan desde el detalle.">
      <OrganizationForm key={`${organization.id}-${String(open)}`} organization={organization} onDone={onClose} />
    </Dialog>
  )
}

function OrganizationForm({ organization, onDone }: { organization: Organization; onDone: () => void }) {
  const save = useSaveOrganization()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationInputSchema),
    defaultValues: {
      type: organization.type,
      name: organization.name,
      kind: organization.kind,
      city: organization.city,
      stopIds: [...organization.stopIds],
      status: organization.status,
      contactName: organization.contactName,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
    },
  })

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: organization.id, input: { ...input, stopIds: organization.stopIds, status: organization.status } },
      {
        onSuccess: () => {
          toast({ title: 'Organización actualizada' })
          onDone()
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
      <Field label="Nombre" error={errors.name?.message}>
        {(field) => <Input {...field} {...register('name')} />}
      </Field>
      <Field label="A qué se dedica" error={errors.kind?.message}>
        {(field) => <Input {...field} placeholder="Ej.: restaurante, museo, tabacalera…" {...register('kind')} />}
      </Field>

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
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
