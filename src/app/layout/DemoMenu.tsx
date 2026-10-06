import { useQueryClient } from '@tanstack/react-query'
import { Check, FlaskConical, RotateCcw, X } from 'lucide-react'
import { Menu, MenuItem, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessage } from '@/data/api/errors'
import { demoRepository } from '@/data/repositories/visits.repository'
import { useAuth } from '@/features/auth/use-auth'

/** Sólo en modo demo: recuerda que los datos son de prueba y permite reiniciarlos. */
export function DemoMenu() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user, organization, refreshUser } = useAuth()
  if (!env.useMocks) return null

  // Quien se postuló y espera la decisión puede hacer de equipo de K'Plan y ver cómo se resuelve.
  const waiting = !!user && user.role !== 'admin' && organization?.status === 'pending'

  const reset = async () => {
    await demoRepository.reset()
    await queryClient.invalidateQueries()
    toast({ title: 'Datos de demo restablecidos', description: 'Volviste a los datos de prueba originales.' })
  }

  const decide = async (decision: 'approved' | 'rejected') => {
    try {
      await demoRepository.decideApplication(decision)
      await queryClient.invalidateQueries()
      await refreshUser()
      toast({ title: decision === 'approved' ? 'El equipo aprobó tu solicitud' : 'El equipo rechazó tu solicitud' })
    } catch (error) {
      toast({ title: errorMessage(error), tone: 'error' })
    }
  }

  return (
    <Menu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-kp border border-dashed border-outline px-2.5 text-caption font-semibold text-muted transition-colors duration-150 hover:border-ink/40 hover:text-ink"
        >
          <FlaskConical size={14} aria-hidden="true" />
          Modo demo
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="max-w-64 px-2.5 pt-1.5 pb-2 text-caption text-muted">
            Todavía no hay API: los datos son de prueba y los cambios se guardan en este navegador.
          </p>
          {waiting && (
            <>
              <MenuItem
                icon={<Check size={16} />}
                onSelect={() => {
                  close()
                  void decide('approved')
                }}
              >
                Aprobar mi solicitud (como el equipo)
              </MenuItem>
              <MenuItem
                icon={<X size={16} />}
                onSelect={() => {
                  close()
                  void decide('rejected')
                }}
              >
                Rechazar mi solicitud (como el equipo)
              </MenuItem>
            </>
          )}
          <MenuItem
            icon={<RotateCcw size={16} />}
            onSelect={() => {
              close()
              void reset()
            }}
          >
            Restablecer datos de demo
          </MenuItem>
        </>
      )}
    </Menu>
  )
}
