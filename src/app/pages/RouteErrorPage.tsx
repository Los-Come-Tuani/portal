import { CircleAlert, RefreshCw } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Button, ButtonLink, EmptyState } from '@/components/ui'
import { ERROR_MESSAGES } from '@/data/api/errors'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { paths } from '../router/paths'
import { NotFoundPage } from './NotFoundPage'
import { routeErrorKind } from './route-error'

const reload = () => window.location.reload()

/** Puede salir fuera del marco del portal (en la entrada o la postulación): ocupa la pantalla entera. */
export function RouteErrorPage() {
  const error = useRouteError()
  const kind = routeErrorKind(error)
  if (import.meta.env.DEV) console.error(error)

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      {kind === 'not-found' ? <NotFoundPage /> : kind === 'stale' ? <NewVersion /> : <Unexpected />}
    </div>
  )
}

function NewVersion() {
  useDocumentTitle('Hay una versión nueva')
  return (
    <EmptyState
      icon={<RefreshCw size={22} />}
      title="Hay una versión nueva del portal"
      action={<Button onClick={reload}>Recargar</Button>}
      className="w-full max-w-lg"
    >
      Se publicó una actualización mientras tenías la página abierta. Recarga para seguir con la versión nueva.
    </EmptyState>
  )
}

function Unexpected() {
  useDocumentTitle('Algo salió mal')
  return (
    <EmptyState
      icon={<CircleAlert size={22} />}
      title={ERROR_MESSAGES.generic}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reload}>Recargar la página</Button>
          <ButtonLink to={paths.home}>Ir al inicio</ButtonLink>
        </div>
      }
      className="w-full max-w-lg"
    >
      Si vuelve a pasar, cuéntale al equipo de K'Plan qué estabas haciendo.
    </EmptyState>
  )
}
