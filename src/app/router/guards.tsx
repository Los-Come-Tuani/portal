import { ShieldQuestion } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Isologo } from '@/components/brand/Logo'
import { EmptyState } from '@/components/ui'
import type { Permission, PortalRole } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { landingPath } from '../layout/navigation'
import { paths } from './paths'

export function SessionLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Cargando tu sesión">
      <Isologo className="h-14 animate-pulse text-ink" />
    </div>
  )
}

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionLoader />
  if (status === 'anonymous') return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: PortalRole[] }) {
  const { role } = useSession()
  if (!roles.includes(role)) return <Navigate to={paths.home} replace />
  return <Outlet />
}

/** Mientras una organización está en revisión, sólo ve su solicitud y el borrador de su lugar. */
export function RequireActiveOrganization() {
  const { organization } = useSession()
  if (organization?.status === 'pending') return <Navigate to={paths.application} replace />
  return <Outlet />
}

/** La agenda es el inicio; quien del equipo no la ve entra a su primer módulo. */
export function RequireAgenda() {
  const session = useSession()
  if (session.organization?.status === 'pending') return <Navigate to={paths.application} replace />
  if (!session.isAdmin || session.can('agenda.view')) return <Outlet />
  const landing = landingPath(session)
  if (landing) return <Navigate to={landing} replace />
  return (
    <EmptyState icon={<ShieldQuestion size={20} />} title="Tu rol todavía no tiene módulos" className="py-24">
      Pídele a alguien con el permiso "Administrar el equipo" que te asigne un rol con permisos.
    </EmptyState>
  )
}

/**
 * Para el equipo de K'Plan, exige al menos uno de los permisos. Negocios y
 * alcaldías pasan: a ellos los filtra su rol.
 */
export function RequirePermission({ anyOf }: { anyOf: Permission[] }) {
  const { isAdmin, can } = useSession()
  if (isAdmin && !can(...anyOf)) return <Navigate to={paths.home} replace />
  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionLoader />
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? paths.home} replace />
  }
  return <Outlet />
}
