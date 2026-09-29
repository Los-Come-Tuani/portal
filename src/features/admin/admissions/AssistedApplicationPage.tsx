import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { PageHeader } from '@/components/ui'
import { ApplicationWizard } from '@/features/onboarding/components/ApplicationWizard'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** El equipo llena la postulación por un negocio o una alcaldía. */
export function AssistedApplicationPage() {
  useDocumentTitle('Alta asistida')
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link to={paths.admissions} className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-muted hover:text-ink">
          <ArrowLeft size={15} aria-hidden="true" />
          Solicitudes
        </Link>
        <PageHeader
          title="Alta asistida"
          description="Llena la solicitud por un negocio o una alcaldía con lo que te entregó. Pasa por la misma revisión que cualquier otra, y le llega una invitación para entrar al portal."
        />
      </div>
      <ApplicationWizard mode="assisted" />
    </div>
  )
}
