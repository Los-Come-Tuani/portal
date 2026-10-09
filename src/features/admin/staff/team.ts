import type { Account } from '@/data/models'

/**
 * Por qué una cuenta del directorio no puede recibir un rol del equipo, o `null` si puede. Las mismas
 * reglas que el API (docs/roles.md): entra una cuenta activa que no es de una organización ni de un
 * guía o traductor, porque el papel del equipo dejaría de mostrarle sus pantallas.
 */
export function whyNotTeam(account: Account): string | null {
  if (account.staffRole || account.role === 'admin') return null
  if (account.status !== 'active') return 'Solo una cuenta activa entra al equipo.'
  if (account.organization || account.role === 'negocio' || account.role === 'alcaldia') {
    return 'Es la cuenta de una organización: invita a la persona al equipo con otro correo.'
  }
  if (account.provider || account.role === 'guia') return 'Es la cuenta de un guía o traductor: invita a la persona al equipo con otro correo.'
  return null
}
