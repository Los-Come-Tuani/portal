import { CloudOff, ShieldQuestion } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Isologo } from '@/components/brand/Logo'
import { Button, ButtonLink, EmptyState } from '@/components/ui'
import { asSentence, errorMessageWithWait } from '@/data/api/errors'
import type { Permission, PortalRole } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { landingPath } from '../layout/navigation'
import { paths } from './paths'

export function SessionLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Cargando tu sesión">
      <Isologo className="h-14 animate-pulse text-ink" />
    </div>
  )
}

/** Había una sesión pero el API no la confirmó: se explica y se deja reintentar sin perderla. */
function SessionUnavailable() {
  const { sessionError, retrySession } = useAuth()
  const location = useLocation()
  useDocumentTitle('No pudimos cargar tu sesión')
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={<CloudOff size={22} />}
        title="No pudimos cargar tu sesión"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={retrySession}>Reintentar</Button>
            <ButtonLink to={paths.login} state={{ from: location.pathname }}>
              Ir a la entrada
            </ButtonLink>
          </div>
        }
        className="w-full max-w-lg"
      >
        {asSentence(errorMessageWithWait(sessionError))} Si tu sesión sigue abierta, entras sin volver a escribir tu contraseña.
      </EmptyState>
    </div>
  )
}

export function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionLoader />
  if (status === 'unavailable') return <SessionUnavailable />
  if (status === 'anonymous') return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  // Un rol que exige el segundo factor solo puede usar la seguridad de la cuenta hasta activarlo:
  // el API responde 403 a todo lo demás.
  if (user?.twoFactor.required && !user.twoFactor.enabled && location.pathname !== paths.security) {
    return <Navigate to={paths.security} replace />
  }
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
    <EmptyState
      icon={<ShieldQuestion size={20} />}
      title="Tu rol todavía no tiene módulos"
      action={<ButtonLink to={paths.security}>Ir a Seguridad</ButtonLink>}
      className="py-24"
    >
      Pídele a alguien con el permiso "Administrar el equipo" que te asigne un rol con permisos. Mientras tanto, puedes revisar la seguridad de tu cuenta.
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

/** Sin poder confirmar la sesión (`unavailable`) la entrada se muestra igual: desde ahí se vuelve a entrar. */
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
