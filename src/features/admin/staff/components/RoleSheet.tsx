import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/data/api/errors'
import { useDeleteStaffRole, useSaveStaffRole } from '@/data/hooks/use-users'
import { PERMISSION_GROUPS, type StaffRole, type StaffRoleInput } from '@/data/models'
import { staffRoleInputSchema } from '@/data/schemas/access.schema'
import { plural } from '@/lib/format'

interface RoleSheetProps {
  open: boolean
  /** `null` para crear uno nuevo. */
  role: StaffRole | null
  members: number
  onClose: () => void
}

export function RoleSheet({ open, role, members, onClose }: RoleSheetProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={role ? `Editar: ${role.name}` : 'Nuevo rol'}
      description={
        role
          ? `${plural(members, 'persona tiene', 'personas tienen')} este rol. Los cambios les aplican cuando recarguen el portal.`
          : 'Arma el rol con los permisos justos para el trabajo de esa persona.'
      }
    >
      <RoleForm key={role?.id ?? 'nuevo'} role={role} members={members} onDone={onClose} />
    </Dialog>
  )
}

function RoleForm({ role, members, onDone }: { role: StaffRole | null; members: number; onDone: () => void }) {
  const save = useSaveStaffRole()
  const remove = useDeleteStaffRole()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StaffRoleInput>({
    resolver: zodResolver(staffRoleInputSchema),
    defaultValues: role
      ? { name: role.name, description: role.description, permissions: [...role.permissions] }
      : { name: '', description: '', permissions: [] },
  })

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: role?.id, input },
      {
        onSuccess: (saved) => {
          toast({ title: role ? `Guardaste ${saved.name}` : `Creaste el rol ${saved.name}` })
          onDone()
        },
        onError: (error) => {
          if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
            for (const [field, message] of Object.entries(error.fieldErrors)) {
              setError(field as keyof StaffRoleInput, { message })
            }
          } else toast({ title: errorMessage(error), tone: 'error' })
        },
      },
    ),
  )

  const confirmDelete = () => {
    if (!role) return
    remove.mutate(role.id, {
      onSuccess: () => {
        toast({ title: `Borraste el rol ${role.name}` })
        setDeleting(false)
        onDone()
      },
      onError: (error) => {
        setDeleting(false)
        toast({ title: errorMessage(error), tone: 'error' })
      },
    })
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Nombre" error={errors.name?.message}>
        {(control) => <Input {...control} data-autofocus placeholder="Ej.: Atención a guías" {...register('name')} />}
      </Field>
      <Field label="Qué hace" hint="Una línea: se ve al invitar a alguien y al cambiarle el rol." error={errors.description?.message}>
        {(control) => <Input {...control} {...register('description')} />}
      </Field>

      <Controller
        control={control}
        name="permissions"
        render={({ field, fieldState }) => (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-small font-medium text-ink">Permisos</legend>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="rounded-kp border border-divider bg-surface">
                <p className="border-b border-divider px-4 py-2.5 text-small font-semibold text-ink">{group.label}</p>
                <div className="flex flex-col gap-3 px-4 py-3">
                  {group.permissions.map((permission) => (
                    <Checkbox
                      key={permission.id}
                      label={permission.label}
                      description={permission.description}
                      checked={field.value.includes(permission.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, permission.id]
                            : field.value.filter((item) => item !== permission.id),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {fieldState.error && <p className="text-caption font-medium text-danger">{fieldState.error.message}</p>}
          </fieldset>
        )}
      />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-5">
        {role && (
          <Button
            variant="quiet"
            icon={<Trash2 size={16} />}
            className="mr-auto"
            disabled={members > 0}
            title={members > 0 ? 'Cambia de rol a quienes lo tienen para poder borrarlo' : undefined}
            onClick={() => setDeleting(true)}
          >
            Borrar rol
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {role ? 'Guardar' : 'Crear rol'}
        </Button>
      </div>

      <ConfirmDialog
        open={deleting}
        title={`Borrar ${role?.name ?? ''}`}
        confirmLabel="Borrar"
        loading={remove.isPending}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
      >
        Nadie tiene este rol. Se borra para siempre.
      </ConfirmDialog>
    </form>
  )
}
