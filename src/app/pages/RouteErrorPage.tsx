import { CircleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Button, EmptyState } from '@/components/ui'
import { ERROR_MESSAGES } from '@/data/api/errors'

export function RouteErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        icon={<CircleAlert size={22} />}
        title={ERROR_MESSAGES.generic}
        action={<Button onClick={() => window.location.reload()}>Recargar la página</Button>}
      >
        Si vuelve a pasar, cuéntale al equipo de K'Plan qué estabas haciendo.
      </EmptyState>
    </div>
  )
}
