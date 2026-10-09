import { UserMinus } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, Dialog, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useRemoveFromStaff, useSetStaffRole } from '@/data/hooks/use-users'
import type { StaffMember, StaffRole } from '@/data/models'
import { RolePicker } from './RolePicker'

/** A quién se le da o se le cambia el rol: alguien del equipo o una cuenta que todavía no lo es. */
export interface RoleTarget {
  id: string
  name: string
  role: { id: string; name: string } | null
}

interface ChangeRoleDialogProps {
  person: RoleTarget | null
  roles: readonly StaffRole[]
  onClose: () => void
  onChanged?: (member: StaffMember) => void
  onRemoved?: () => void
}

export function ChangeRoleDialog({ person, roles, onClose, onChanged, onRemoved }: ChangeRoleDialogProps) {
  const setRole = useSetStaffRole()
  const remove = useRemoveFromStaff()
  const toast = useToast()
  const [removing, setRemoving] = useState(false)
  const current = person?.role?.id ?? ''
  const [picked, setPicked] = useState({ userId: person?.id, roleId: current })
  if (picked.userId !== person?.id) setPicked({ userId: person?.id, roleId: current })
  const joining = person !== null && person.role === null

  const save = () => {
    if (!person) return
    const roleName = roles.find((role) => role.id === picked.roleId)?.name
    setRole.mutate(
      { userId: person.id, roleId: picked.roleId },
      {
        onSuccess: (member) => {
          toast({ title: joining ? `${person.name} entró al equipo como ${roleName}` : `${person.name} ahora es ${roleName}` })
          onChanged?.(member)
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  const confirmRemove = () => {
    if (!person) return
    remove.mutate(person.id, {
      onSuccess: () => {
        toast({ title: `${person.name} ya no es del equipo` })
        setRemoving(false)
        onRemoved?.()
        onClose()
      },
      onError: (error) => {
        setRemoving(false)
        toast({ title: errorMessage(error), tone: 'error' })
      },
    })
  }

  return (
    <Dialog
      open={person !== null}
      onClose={onClose}
      size="lg"
      title={joining ? `Darle un rol del equipo a ${person.name}` : `Cambiar el rol de ${person?.name ?? ''}`}
      description={
        joining
          ? 'Entra al portal con los permisos de este rol. Si usa la app como turista, la sigue usando.'
          : 'El portal le cambia la próxima vez que entre o recargue la página.'
      }
      footer={
        <>
          {!joining && (
            <Button variant="quiet" icon={<UserMinus size={16} />} className="mr-auto" onClick={() => setRemoving(true)} disabled={setRole.isPending}>
              Sacar del equipo
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={setRole.isPending}>
            Cancelar
          </Button>
          <Button onClick={save} loading={setRole.isPending} disabled={!picked.roleId || picked.roleId === current}>
            {joining ? 'Darle el rol' : 'Cambiar rol'}
          </Button>
        </>
      }
    >
      <RolePicker roles={roles} value={picked.roleId} onChange={(roleId) => setPicked((value) => ({ ...value, roleId }))} name="rol" />
      <ConfirmDialog
        open={removing}
        title={`Sacar a ${person?.name ?? ''} del equipo`}
        confirmLabel="Sacar del equipo"
        loading={remove.isPending}
        onClose={() => setRemoving(false)}
        onConfirm={confirmRemove}
      >
        Pierde su rol y los permisos del portal. Su cuenta sigue: si usaba la app, la sigue usando. Para que vuelva, dale otro rol.
      </ConfirmDialog>
    </Dialog>
  )
}
