import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, ButtonLink, Field, Input, Tag } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessageWithWait } from '@/data/api/errors'
import { ROLE_LABELS, type LoginInput } from '@/data/models'
import { loginSchema } from '@/data/schemas/admin.schema'
import { twoFactorLoginSchema } from '@/data/schemas/auth.schema'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AuthLayout } from './AuthLayout'
import { DEMO_ACCOUNTS } from './demo-accounts'
import { forgetRejectedGoogleAccount } from './google-identity'
import { GoogleSignInButton } from './GoogleSignInButton'
import { useAuth } from './use-auth'

type Step = 'credentials' | 'two-factor'

export function LoginPage() {
  useDocumentTitle('Entrar')
  const [step, setStep] = useState<Step>('credentials')

  return (
    <AuthLayout>
      {step === 'credentials' ? (
        <CredentialsStep onTwoFactor={() => setStep('two-factor')} />
      ) : (
        <TwoFactorStep onBack={() => setStep('credentials')} />
      )}
    </AuthLayout>
  )
}

function CredentialsStep({ onTwoFactor }: { onTwoFactor: () => void }) {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  // cambia tras un intento rechazado: el botón de Google se vuelve a dibujar desde cero
  const [googleAttempt, setGoogleAttempt] = useState(0)
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      if ((await login(values)) === 'two-factor') onTwoFactor()
    } catch (caught) {
      setError(errorMessageWithWait(caught))
    }
  })

  const enterAs = (email: string) => {
    setValue('email', email)
    setValue('password', 'demo')
    void submit()
  }

  const continueWithGoogle = useCallback(
    async (credential: string) => {
      setError(null)
      setGoogleSubmitting(true)
      try {
        if ((await loginWithGoogle(credential)) === 'two-factor') onTwoFactor()
      } catch (caught) {
        setError(errorMessageWithWait(caught))
        await forgetRejectedGoogleAccount(credential)
        setGoogleAttempt((attempt) => attempt + 1)
      } finally {
        setGoogleSubmitting(false)
      }
    },
    [loginWithGoogle, onTwoFactor],
  )

  return (
    <>
      <h1 className="text-headline font-bold tracking-tight">Entra a tu portal</h1>
      <p className="mt-2 text-body text-muted">Para negocios, alcaldías y el equipo de K'Plan.</p>

      <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
        <Field label="Correo" error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" placeholder="tu@negocio.com" {...register('email')} />
          )}
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          {(control) => <Input {...control} type="password" autoComplete="current-password" {...register('password')} />}
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
          onClick={() => navigate(paths.resetPassword, { state: { email: getValues('email').trim() } })}
          className="min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <button
          type="button"
          onClick={() => navigate(`${paths.invitation}?correo=${encodeURIComponent(getValues('email').trim())}`)}
          className="min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink"
        >
          ¿Te invitaron al equipo? Activa tu cuenta
        </button>
      </form>

      {!env.useMocks && env.googleClientId && (
        <div className="mt-7">
          <div className="mb-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-divider" />
            <span className="text-caption font-medium text-muted">o continúa con</span>
            <span className="h-px flex-1 bg-divider" />
          </div>
          <GoogleSignInButton
            key={googleAttempt}
            disabled={isSubmitting || googleSubmitting}
            onCredential={continueWithGoogle}
          />
          <p className="mt-2 text-caption text-muted">Solo enlaza una cuenta del portal que ya esté activada.</p>
        </div>
      )}

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
    </>
  )
}

/** La cuenta tiene verificación en dos pasos: falta el código de la app o uno de recuperación. */
function TwoFactorStep({ onBack }: { onBack: () => void }) {
  const { verifyTwoFactor } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({ resolver: zodResolver(twoFactorLoginSchema), defaultValues: { code: '' } })

  useEffect(() => setFocus('code'), [setFocus])

  const submit = handleSubmit(async ({ code }) => {
    setError(null)
    try {
      await verifyTwoFactor(code)
    } catch (caught) {
      setError(errorMessageWithWait(caught))
    }
  })

  return (
    <>
      <h1 className="text-headline font-bold tracking-tight">Verifica que eres tú</h1>
      <p className="mt-2 text-body text-muted">
        Escribe el código de 6 dígitos de tu app de autenticación. Si perdiste el celular, usa uno de tus códigos de
        recuperación.
      </p>

      <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
        <Field label="Código" error={errors.code?.message}>
          {(control) => (
            <Input {...control} autoComplete="one-time-code" spellCheck={false} placeholder="123456" {...register('code')} />
          )}
        </Field>
        {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
        {error && (
          <p role="alert" className="text-small font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          Verificar
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink"
        >
          Volver
        </button>
      </form>
    </>
  )
}
