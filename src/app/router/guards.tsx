import { Navigate, Outlet, useLocation } from 'react-router'
import { Isologo } from '@/components/brand/Logo'
import type { UserRole } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
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

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { role } = useSession()
  if (!roles.includes(role)) return <Navigate to={paths.home} replace />
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
