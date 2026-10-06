import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Button, Dialog, Field, Input, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useInviteStaff } from '@/data/hooks/use-users'
import type { StaffInviteInput, StaffRole } from '@/data/models'
import { staffInviteSchema } from '@/data/schemas/access.schema'
import { RolePicker } from './RolePicker'

export function InviteSheet({ open, roles, onClose }: { open: boolean; roles: readonly StaffRole[]; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Invitar a alguien del equipo"
      description="Le llega un correo para crear su contraseña. Entra con el rol que elijas."
    >
      <InviteForm key={String(open)} roles={roles} onDone={onClose} />
    </Dialog>
  )
}

function InviteForm({ roles, onDone }: { roles: readonly StaffRole[]; onDone: () => void }) {
  const invite = useInviteStaff()
  const toast = useToast()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StaffInviteInput>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: { name: '', email: '', staffRoleId: '' },
  })

  const submit = handleSubmit((input) =>
    invite.mutate(input, {
      onSuccess: ({ member, sent }) => {
        toast(
          sent
            ? { title: 'Invitación enviada', description: `${member.name} recibió el correo en ${member.email}.` }
            : { title: 'Ya tenía una invitación', description: `Le cambiamos el rol; que use el código del último correo que le llegó.` },
        )
        onDone()
      },
      onError: (error) => {
        if (error instanceof ApiError && error.fieldErrors.email) setError('email', { message: error.fieldErrors.email })
        else toast({ title: errorMessage(error), tone: 'error' })
      },
    }),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Nombre" error={errors.name?.message}>
        {(control) => <Input {...control} data-autofocus autoComplete="off" {...register('name')} />}
      </Field>
      <Field label="Correo" hint="Con este correo entra al portal." error={errors.email?.message}>
        {(control) => <Input {...control} type="email" autoComplete="off" placeholder="nombre@kplan.com" {...register('email')} />}
      </Field>
      <Controller
        control={control}
        name="staffRoleId"
        render={({ field, fieldState }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-medium text-ink">Rol</legend>
            <RolePicker roles={roles} value={field.value} onChange={field.onChange} name="rol-invitado" invalid={!!fieldState.error} />
            {fieldState.error && <p className="text-caption font-medium text-danger">{fieldState.error.message}</p>}
          </fieldset>
        )}
      />
      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={invite.isPending}>
          Enviar invitación
        </Button>
      </div>
    </form>
  )
}
