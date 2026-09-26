import { useState } from 'react'
import { Button, Dialog, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useUpdateUser } from '@/data/hooks/use-users'
import type { StaffRole, User } from '@/data/models'
import { RolePicker } from './RolePicker'

export function ChangeRoleDialog({ user, roles, onClose }: { user: User | null; roles: readonly StaffRole[]; onClose: () => void }) {
  const update = useUpdateUser()
  const toast = useToast()
  const [picked, setPicked] = useState({ userId: user?.id, roleId: user?.staffRoleId ?? '' })
  if (picked.userId !== user?.id) setPicked({ userId: user?.id, roleId: user?.staffRoleId ?? '' })

  const save = () => {
    if (!user) return
    update.mutate(
      { id: user.id, input: { staffRoleId: picked.roleId } },
      {
        onSuccess: () => {
          toast({ title: `${user.name} ahora es ${roles.find((role) => role.id === picked.roleId)?.name}` })
          onClose()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      size="lg"
      title={`Cambiar el rol de ${user?.name ?? ''}`}
      description="El portal le cambia la próxima vez que entre o recargue la página."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button onClick={save} loading={update.isPending} disabled={picked.roleId === user?.staffRoleId}>
            Cambiar rol
          </Button>
        </>
      }
    >
      <RolePicker roles={roles} value={picked.roleId} onChange={(roleId) => setPicked((current) => ({ ...current, roleId }))} name="rol" />
    </Dialog>
  )
}
