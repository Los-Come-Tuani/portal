import { ArrowLeft } from 'lucide-react'
import { Navigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { ButtonLink, ErrorState, PageHeader, Skeleton } from '@/components/ui'
import { useMyApplication } from '@/data/hooks/use-applications'
import { canCorrect } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApplicationFlow } from './components/ApplicationFlow'

/** Quien se postuló corrige lo que el equipo rechazó, con lo que ya mandó llenado. */
export function CorrectApplicationPage() {
  useDocumentTitle('Corrige tu solicitud')
  const application = useMyApplication()
  if (application.isError) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />
  if (!application.data) return <Skeleton className="h-96" />
  // Solo se corrige lo rechazado: en cualquier otro estado no hay nada que cambiar.
  if (!canCorrect(application.data)) return <Navigate to={paths.application} replace />
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Corrige tu solicitud"
        description="Cambia lo que haga falta y vuelve a mandarla: el equipo la revisa de nuevo."
        actions={
          <ButtonLink to={paths.application} variant="ghost" icon={<ArrowLeft size={16} />}>
            Volver a tu solicitud
          </ButtonLink>
        }
      />
      {/* La clave reinicia el formulario si llega otra solicitud (p. ej. tras mandarla de nuevo). */}
      <ApplicationFlow key={application.data.id} mode="correct" initial={application.data.submitted} />
    </div>
  )
}
