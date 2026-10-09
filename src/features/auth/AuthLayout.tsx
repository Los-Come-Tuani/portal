import type { ReactNode } from 'react'
import loginArt from '@/assets/brand/login-illustration.svg'
import { Logo } from '@/components/brand/Logo'

/** La pantalla partida de entrar y de recuperar la contraseña: formulario a la izquierda, arte a la derecha. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <section className="flex min-w-0 flex-col px-6 pt-8 sm:px-12 lg:bg-surface">
        <Logo className="h-10 self-start text-ink" />

        <div className="my-auto w-full max-w-sm py-10 sm:py-12">{children}</div>

        <img src={loginArt} alt="" className="-mx-6 mt-auto w-[calc(100%+3rem)] max-w-none sm:-mx-12 sm:w-[calc(100%+6rem)] lg:hidden" />
      </section>

      <aside className="relative hidden flex-col overflow-hidden bg-canvas lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="max-w-2xl px-10 pt-16 xl:px-16 xl:pt-24">
          <p className="text-display font-bold tracking-tight text-ink">
            Los turistas ya armaron su día. Tú sabes a qué hora llegan.
          </p>
          <p className="mt-6 max-w-[46ch] text-lead text-muted">
            Tu lugar en la app, tus cupones, tus eventos y los grupos que vienen en camino, en un solo portal.
          </p>
        </div>
        <img src={loginArt} alt="" className="mt-auto w-full" />
      </aside>
    </div>
  )
}
