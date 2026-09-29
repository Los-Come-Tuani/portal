import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApplicationWizard } from './components/ApplicationWizard'

/** Postularse para entrar a K'Plan: negocios y alcaldías, sin cuenta todavía. */
export function ApplyPage() {
  useDocumentTitle('Postúlate')
  return <ApplicationWizard mode="public" />
}
