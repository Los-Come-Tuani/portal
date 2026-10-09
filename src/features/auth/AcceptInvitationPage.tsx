import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/router/paths'
import { Button, Field, Input, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useAcceptInvitation } from '@/data/hooks/use-security'
import { resetPasswordSchema } from '@/data/schemas/auth.schema'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AuthLayout } from './AuthLayout'

interface InvitationValues {
  email: string
  code: string
  password: string
  confirmation: string
}

/**
 * Quien recibió la invitación al equipo escribe el código del correo y elige su contraseña. El
 * API responde igual si el correo no tiene invitación o si el código es malo.
 */
export function AcceptInvitationPage() {
  useDocumentTitle('Activar tu cuenta')
  const navigate = useNavigate()
  const toast = useToast()
  const accept = useAcceptInvitation()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    setFocus,
    formState: { errors },
  } = useForm<InvitationValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: params.get('correo') ?? '', code: '', password: '', confirmation: '' },
  })

  // Con el correo ya escrito (llega en el enlace), lo que falta es el código.
  useEffect(() => setFocus(params.get('correo') ? 'code' : 'email'), [params, setFocus])

  const submit = handleSubmit((values) => {
    setError(null)
    accept.mutate(
      { email: values.email.trim(), code: values.code, password: values.password },
      {
        onSuccess: () => {
          toast({ title: 'Cuenta activada', description: 'Entra con tu correo y la contraseña que elegiste.' })
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

  return (
    <AuthLayout>
      <h1 className="text-headline font-bold tracking-tight">Activa tu cuenta</h1>
      <p className="mt-2 text-body text-muted">
        Te invitaron al equipo de K'Plan. Escribe el código de 6 dígitos que te llegó al correo y elige tu contraseña.
      </p>

      <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={submit}>
        <Field label="Correo" error={errors.email?.message}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" placeholder="tu@correo.com" {...register('email')} />
          )}
        </Field>
        <Field label="Código del correo" error={errors.code?.message}>
          {(control) => (
            <Input {...control} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" {...register('code')} />
          )}
        </Field>
        <Field label="Contraseña" hint="Al menos 8 caracteres, una mayúscula y un número." error={errors.password?.message}>
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
        {/* El demo no manda correos: este es el código que sirve. */}
        {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
        <Button type="submit" size="lg" loading={accept.isPending} className="mt-2 w-full">
          Activar mi cuenta
        </Button>
        <button
          type="button"
          onClick={() => navigate(paths.login)}
          className="min-h-11 self-start text-small font-semibold text-ink underline decoration-outline underline-offset-4 hover:decoration-ink"
        >
          Volver a entrar
        </button>
      </form>
    </AuthLayout>
  )
}
