import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import loginArt from '@/assets/brand/login-illustration.svg'
import { Logo } from '@/components/brand/Logo'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, Field, Input, Tag, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessage } from '@/data/api/errors'
import { ROLE_LABELS, type LoginInput } from '@/data/models'
import { authRepository } from '@/data/repositories/auth.repository'
import { loginSchema } from '@/data/schemas/admin.schema'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DEMO_ACCOUNTS } from './demo-accounts'
import { useAuth } from './use-auth'

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { login } = useAuth()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await login(values)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  })

  const enterAs = (email: string) => {
    setValue('email', email)
    setValue('password', 'demo')
    void submit()
  }

  const forgotPassword = async () => {
    const email = getValues('email')
    if (!loginSchema.shape.email.safeParse(email).success) {
      setFieldError('email', { message: 'Escribe tu correo para enviarte el enlace' })
      return
    }
    await authRepository.forgotPassword(email).catch(() => undefined)
    toast({
      title: 'Revisa tu correo',
      description: 'Si tiene una cuenta en el portal, te enviamos un enlace para crear una contraseña nueva.',
    })
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <section className="flex min-w-0 flex-col px-6 pt-8 sm:px-12 lg:bg-surface">
        <Logo className="h-10 self-start text-ink" />

        <div className="my-auto w-full max-w-sm py-10 sm:py-12">
          <h1 className="text-headline font-bold tracking-tight">Entra a tu portal</h1>
          <p className="mt-2 text-body text-muted">Para negocios, alcaldías y el equipo de K'Plan.</p>

          <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
            <Field label="Correo" error={errors.email?.message}>
              {(control) => (
                <Input {...control} type="email" autoComplete="email" placeholder="tu@negocio.com" {...register('email')} />
              )}
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              {(control) => (
                <Input {...control} type="password" autoComplete="current-password" {...register('password')} />
              )}
            </Field>
            {error && (
              <p role="alert" className="text-small font-medium text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
              Entrar
            </Button>
            <button
              type="button"
              onClick={() => void forgotPassword()}
              className="min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-divider bg-canvas px-4 py-4">
            <p className="text-small text-muted">
              <span className="block font-semibold text-ink">¿Tu negocio o alcaldía todavía no está en K'Plan?</span>
              Postúlate con tus documentos y entra mientras lo revisamos.
            </p>
            <ButtonLink to={paths.apply} size="sm" variant="secondary" className="shrink-0">
              Postúlate
            </ButtonLink>
          </div>

          {env.useMocks && (
            <div className="mt-10 border-t border-divider pt-6">
              <h2 className="text-body font-semibold text-ink">Cuentas de prueba</h2>
              <p className="mt-0.5 text-small text-muted">Modo demo: entra con un clic, cualquier contraseña sirve.</p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => enterAs(account.email)}
                      className="group flex w-full items-center gap-3 rounded-kp border border-divider bg-surface px-3.5 py-2.5 text-left transition-colors duration-150 hover:border-ink/40 disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-small font-semibold text-ink">{account.label}</span>
                        <span className="block truncate text-caption text-muted">{account.detail}</span>
                      </span>
                      <Tag tone={account.role === 'admin' ? 'ink' : 'neutral'}>{ROLE_LABELS[account.role]}</Tag>
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                        className="text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

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
