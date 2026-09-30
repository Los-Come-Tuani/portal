import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { Menu, MenuItem, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { demoRepository } from '@/data/repositories/visits.repository'

/** Sólo en modo demo: recuerda que los datos son de prueba y permite reiniciarlos. */
export function DemoMenu() {
  const queryClient = useQueryClient()
  const toast = useToast()
  if (!env.useMocks) return null

  const reset = async () => {
    await demoRepository.reset()
    await queryClient.invalidateQueries()
    toast({ title: 'Datos de demo restablecidos', description: 'Volviste a los datos de prueba originales.' })
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
