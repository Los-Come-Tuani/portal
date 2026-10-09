import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field, Input, Panel, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useChangePassword } from '@/data/hooks/use-security'
import { changePasswordSchema } from '@/data/schemas/auth.schema'
import { useAuth } from '@/features/auth/use-auth'

interface PasswordValues {
  currentPassword: string
  password: string
  confirmation: string
}

export function PasswordPanel() {
  const change = useChangePassword()
  const { endSession } = useAuth()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmation: '' },
  })

  const submit = handleSubmit(({ currentPassword, password }) => {
    setError(null)
    change.mutate(
      { currentPassword, password },
      {
        onSuccess: () => {
          // La API cierra todas las sesiones al cambiar la contraseña: aquí también se sale.
          toast({ title: 'Contraseña actualizada', description: 'Por seguridad cerramos tus sesiones. Vuelve a entrar.' })
          endSession()
        },
        onError: (caught) => {
          if (caught instanceof ApiError && (caught.fieldErrors.currentPassword || caught.fieldErrors.password)) {
            if (caught.fieldErrors.currentPassword) setFieldError('currentPassword', { message: caught.fieldErrors.currentPassword })
            if (caught.fieldErrors.password) setFieldError('password', { message: caught.fieldErrors.password })
            return
          }
          setError(errorMessageWithWait(caught))
        },
      },
    )
  })

  return (
    <Panel
      title="Contraseña"
      description="Al cambiarla cerramos tus sesiones en todos los dispositivos, y tendrás que volver a entrar."
    >
      <form className="flex max-w-md flex-col gap-4" onSubmit={submit} noValidate>
        <Field label="Contraseña actual" error={errors.currentPassword?.message}>
          {(control) => <Input {...control} type="password" autoComplete="current-password" {...register('currentPassword')} />}
        </Field>
        <Field label="Contraseña nueva" hint="Al menos 8 caracteres, una mayúscula y un número." error={errors.password?.message}>
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Repite la contraseña nueva" error={errors.confirmation?.message}>
          {(control) => <Input {...control} type="password" autoComplete="new-password" {...register('confirmation')} />}
        </Field>
        {env.useMocks && <p className="text-small text-muted">Modo demo: cualquier contraseña actual sirve.</p>}
        {error && (
          <p role="alert" className="text-small font-medium text-danger">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" loading={change.isPending}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Panel>
  )
}
