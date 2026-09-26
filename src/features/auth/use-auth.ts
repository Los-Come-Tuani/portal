import { useContext } from 'react'
import { isPortalRole, type Organization, type Permission, type PortalRole, type SessionUser } from '@/data/models'
import { AuthContext, type AuthContextValue } from './auth-context'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth necesita <AuthProvider>')
  return context
}

export interface Session {
  user: SessionUser
  organization: Organization | null
  role: PortalRole
  /** El equipo de K'Plan; lo que puede hacer depende de `can`. */
  isAdmin: boolean
  /** La organización del usuario; `undefined` para el admin (ve todas). */
  organizationId: string | undefined
  /** ¿Tiene al menos uno de estos permisos? Siempre `false` fuera del equipo. */
  can: (...anyOf: Permission[]) => boolean
}

/** La sesión dentro de las rutas protegidas, donde siempre hay usuario. */
export function useSession(): Session {
  const { user, organization } = useAuth()
  if (!user) throw new Error('useSession sólo funciona dentro de una ruta protegida')
  if (!isPortalRole(user.role)) throw new Error('Esta cuenta no entra al portal')
  return {
    user,
    organization,
    role: user.role,
    isAdmin: user.role === 'admin',
    organizationId: user.organizationId ?? undefined,
    can: (...anyOf) => anyOf.some((permission) => user.permissions.includes(permission)),
  }
}
