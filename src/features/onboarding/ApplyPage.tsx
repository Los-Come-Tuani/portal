import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { Logo } from '@/components/brand/Logo'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApplicationFlow } from './components/ApplicationFlow'

/** Postularse para entrar a K'Plan: un comercio, una institución cultural o una alcaldía, sin cuenta todavía. */
export function ApplyPage() {
  useDocumentTitle('Postúlate')
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 pt-6 pb-16 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to={paths.login} aria-label="K'Plan, volver a la entrada">
            <Logo className="h-9 text-ink" />
          </Link>
          <p className="text-small text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link to={paths.login} className="font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink">
              Entra
            </Link>
          </p>
        </header>
        <main className="pt-10">
          <ApplicationFlow mode="apply" />
        </main>
      </div>
    </div>
  )
}
