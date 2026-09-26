import { Compass } from 'lucide-react'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { paths } from '../router/paths'

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada')
  return (
    <EmptyState
      icon={<Compass size={22} />}
      title="Esta página no existe"
      action={
        <ButtonLink to={paths.home} variant="primary">
          Volver a la agenda
        </ButtonLink>
      }
      className="py-24"
    >
      Puede que el enlace esté mal escrito o que esa sección no sea parte de tu cuenta.
    </EmptyState>
  )
}
