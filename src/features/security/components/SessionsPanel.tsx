import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, Panel, useToast } from '@/components/ui'
import { errorMessageWithWait } from '@/data/api/errors'
import { useRevokeSessions } from '@/data/hooks/use-security'
import { useAuth } from '@/features/auth/use-auth'

export function SessionsPanel() {
  const revoke = useRevokeSessions()
  const { endSession } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)

  const closeEverywhere = () =>
    revoke.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Cerramos tus sesiones', description: 'Vuelve a entrar para seguir.' })
        endSession()
      },
      onError: (caught) => {
        setConfirming(false)
        toast({ title: errorMessageWithWait(caught), tone: 'error' })
      },
    })

  return (
    <Panel
      title="Sesiones abiertas"
      description="Si entraste desde una computadora ajena o crees que alguien más tiene acceso, cierra tu sesión en todos los dispositivos."
    >
      <Button variant="secondary" icon={<LogOut size={16} />} onClick={() => setConfirming(true)}>
        Cerrar sesión en todos los dispositivos
      </Button>
      <ConfirmDialog
        open={confirming}
        title="¿Cerrar sesión en todos los dispositivos?"
        confirmLabel="Cerrar todas las sesiones"
        loading={revoke.isPending}
        onConfirm={closeEverywhere}
        onClose={() => setConfirming(false)}
      >
        Tendrás que volver a entrar aquí y en cualquier otro lugar donde tengas el portal abierto.
      </ConfirmDialog>
    </Panel>
  )
}
