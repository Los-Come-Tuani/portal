import type { Circuit } from '@/data/models'
import { useSession } from '@/features/auth/use-auth'

/**
 * Quién crea y quién edita (docs/territorio.md): el equipo con `circuits.manage`, cualquiera; una
 * alcaldía verificada crea creativos de su ciudad y edita los que organiza. Los del equipo en su
 * ciudad los ve sin editarlos. Uno retirado ya no se edita.
 */
export function useCircuitAccess() {
  const { role, organization, can } = useSession()
  const manages = can('circuits.manage')
  const municipality = role === 'alcaldia' && organization?.status === 'active' ? organization : null
  return {
    manages,
    municipality,
    canCreate: manages || !!municipality,
    canEdit: (circuit: Pick<Circuit, 'status' | 'organizer'>) =>
      circuit.status !== 'retired' && (manages || (!!municipality && circuit.organizer?.id === municipality.id)),
  }
}
