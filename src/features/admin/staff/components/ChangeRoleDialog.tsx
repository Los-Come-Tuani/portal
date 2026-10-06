import { useState } from 'react'
import { Button, Dialog, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useSetStaffRole } from '@/data/hooks/use-users'
import type { StaffMember, StaffRole } from '@/data/models'
import { RolePicker } from './RolePicker'

export function ChangeRoleDialog({ member, roles, onClose }: { member: StaffMember | null; roles: readonly StaffRole[]; onClose: () => void }) {
  const setRole = useSetStaffRole()
  const toast = useToast()
  const current = member?.role?.id ?? ''
  const [picked, setPicked] = useState({ userId: member?.id, roleId: current })
  if (picked.userId !== member?.id) setPicked({ userId: member?.id, roleId: current })

  const save = () => {
    if (!member) return
    setRole.mutate(
      { userId: member.id, roleId: picked.roleId },
      {
        onSuccess: () => {
          toast({ title: `${member.name} ahora es ${roles.find((role) => role.id === picked.roleId)?.name}` })
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={member !== null}
      onClose={onClose}
      size="lg"
      title={`Cambiar el rol de ${member?.name ?? ''}`}
      description="El portal le cambia la próxima vez que entre o recargue la página."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={setRole.isPending}>
            Cancelar
          </Button>
          <Button onClick={save} loading={setRole.isPending} disabled={picked.roleId === current}>
            Cambiar rol
          </Button>
        </>
      }
    >
      <RolePicker roles={roles} value={picked.roleId} onChange={(roleId) => setPicked((value) => ({ ...value, roleId }))} name="rol" />
    </Dialog>
  )
}
