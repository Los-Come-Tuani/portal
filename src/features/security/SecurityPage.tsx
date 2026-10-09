import { PageHeader } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { PasswordPanel } from './components/PasswordPanel'
import { SessionsPanel } from './components/SessionsPanel'
import { TwoFactorPanel } from './components/TwoFactorPanel'

/** La seguridad de la cuenta de quien está dentro: segundo factor, contraseña y sesiones. */
export function SecurityPage() {
  useDocumentTitle('Seguridad')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Seguridad"
        description="Protege tu cuenta con un segundo paso al entrar y cuida tus sesiones abiertas."
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <TwoFactorPanel />
        <PasswordPanel />
        <SessionsPanel />
      </div>
    </div>
  )
}
