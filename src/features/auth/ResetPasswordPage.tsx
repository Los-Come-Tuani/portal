import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, Field, Input, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useForgotPassword, useResetPassword } from '@/data/hooks/use-security'
import { forgotPasswordSchema, resetPasswordSchema } from '@/data/schemas/auth.schema'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AuthLayout } from './AuthLayout'

/** Lo que la API tarda en dejar pedir otro código (60 s). */
const RESEND_SECONDS = 60

type Step = 'request' | 'reset'

const LINK_BUTTON =
  'min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink disabled:no-underline disabled:opacity-60'

/**
 * Recuperar la contraseña en dos pasos: se pide el código al correo y, con él, se escribe la
 * contraseña nueva. La API responde igual exista o no la cuenta.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Recuperar contraseña')
  const location = useLocation()
  const startingEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState(startingEmail)

  return (
    <AuthLayout>
      {step === 'request' ? (
        <RequestStep
          email={email}
          onSent={(sentTo) => {
            setEmail(sentTo)
            setStep('reset')
          }}
        />
      ) : (
        <ResetStep email={email} onChangeEmail={() => setStep('request')} />
      )}
    </AuthLayout>
  )
}

function RequestStep({ email, onSent }: { email: string; onSent: (email: string) => void }) {
  const navigate = useNavigate()
  const forgot = useForgotPassword()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email } })

  const submit = handleSubmit((values) => {
    setError(null)
    forgot.mutate(values.email.trim(), {
      onSuccess: () => onSent(values.email.trim()),
      onError: (caught) => setError(errorMessageWithWait(caught)),
    })
  })

  return (
    <>
      <h1 className="text-headline font-bold tracking-tight">Recupera tu contraseña</h1>
      <p className="mt-2 text-body text-muted">Escribe el correo de tu cuenta y te enviamos un código de 6 dígitos.</p>

      <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
        <Field label="Correo" error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" placeholder="tu@negocio.com" {...register('email')} />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-small font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={forgot.isPending} className="mt-2 w-full">
          Enviar código
        </Button>
        <button type="button" onClick={() => navigate(paths.login)} className={LINK_BUTTON}>
          Volver a entrar
        </button>
      </form>
    </>
  )
}

interface ResetValues {
  email: string
  code: string
  password: string
  confirmation: string
}

function ResetStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const reset = useResetPassword()
  const forgot = useForgotPassword()
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, code: '', password: '', confirmation: '' },
  })

  useEffect(() => setFocus('code'), [setFocus])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const submit = handleSubmit((values) => {
    setError(null)
    reset.mutate(
      { email: values.email, code: values.code, password: values.password },
      {
        onSuccess: () => {
          toast({ title: 'Contraseña actualizada', description: 'Entra con la contraseña nueva.' })
          navigate(paths.login, { replace: true })
        },
        onError: (caught) => {
          if (caught instanceof ApiError) {
            const { code, password } = caught.fieldErrors
            if (code) setFieldError('code', { message: code })
            if (password) setFieldError('password', { message: password })
            if (code || password) return
          }
          setError(errorMessageWithWait(caught))
        },
      },
    )
  })

  const resend = () => {
    setError(null)
    forgot.mutate(email, {
      onSuccess: () => {
        setCooldown(RESEND_SECONDS)
        toast({ title: 'Revisa tu correo', description: 'Si pasó un minuto desde el último, te enviamos otro código.' })
      },
      onError: (caught) => setError(errorMessageWithWait(caught)),
    })
  }

  return (
    <>
      <h1 className="text-headline font-bold tracking-tight">Escribe el código</h1>
      <p className="mt-2 text-body text-muted">
        Si <span className="font-semibold text-ink">{email}</span> tiene una cuenta en el portal, le enviamos un código de 6
        dígitos. Vence en 15 minutos.
      </p>

      <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
        <input type="hidden" {...register('email')} />
        <Field label="Código del correo" error={errors.code?.message}>
          {(control) => (
            <Input {...control} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" {...register('code')} />
          )}
        </Field>
        <Field
          label="Contraseña nueva"
          hint="Al menos 8 caracteres, una mayúscula y un número."
          error={errors.password?.message}
        >
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Repite la contraseña" error={errors.confirmation?.message}>
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('confirmation')} />}
        </Field>
        {error && (
          <p role="alert" className="text-small font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={reset.isPending} className="mt-2 w-full">
          Cambiar contraseña
        </Button>
        <div className="flex flex-wrap items-center gap-x-6">
          <button type="button" onClick={resend} disabled={cooldown > 0 || forgot.isPending} className={LINK_BUTTON}>
            {cooldown > 0 ? `Reenviar código (${cooldown} s)` : 'Reenviar código'}
          </button>
          <button type="button" onClick={onChangeEmail} className={LINK_BUTTON}>
            Usar otro correo
          </button>
        </div>
        {/* El demo no manda correos: este es el código que sirve. */}
        {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
      </form>
    </>
  )
}
