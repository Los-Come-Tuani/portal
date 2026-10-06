import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Dialog, Field, Input, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useDisableTwoFactor } from '@/data/hooks/use-security'
import type { DisableTwoFactorInput } from '@/data/models'
import { disableTwoFactorSchema } from '@/data/schemas/auth.schema'

interface DisableTwoFactorDialogProps {
  open: boolean
  onClose: () => void
  /** El segundo factor quedó desactivado: el padre actualiza a la persona de la sesión. */
  onDisabled: () => void
}

export function DisableTwoFactorDialog({ open, onClose, onDisabled }: DisableTwoFactorDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Desactivar la verificación en dos pasos"
      description="Tu cuenta quedará protegida solo por la contraseña. Confirma con un código y tu contraseña."
    >
      <DisableForm key={String(open)} onClose={onClose} onDisabled={onDisabled} />
    </Dialog>
  )
}

function DisableForm({ onClose, onDisabled }: Pick<DisableTwoFactorDialogProps, 'onClose' | 'onDisabled'>) {
  const disable = useDisableTwoFactor()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<DisableTwoFactorInput>({ resolver: zodResolver(disableTwoFactorSchema), defaultValues: { code: '', password: '' } })

  const submit = handleSubmit((input) => {
    setError(null)
    disable.mutate(input, {
      onSuccess: () => {
        toast({ title: 'Verificación en dos pasos desactivada' })
        onDisabled()
        onClose()
      },
      onError: (caught) => {
        if (caught instanceof ApiError && (caught.fieldErrors.code || caught.fieldErrors.password)) {
          if (caught.fieldErrors.code) setFieldError('code', { message: caught.fieldErrors.code })
          if (caught.fieldErrors.password) setFieldError('password', { message: caught.fieldErrors.password })
          return
        }
        setError(errorMessageWithWait(caught))
      },
    })
  })

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Código" hint="De tu app de autenticación, o un código de recuperación." error={errors.code?.message}>
        {(control) => (
          <Input {...control} data-autofocus autoComplete="one-time-code" spellCheck={false} placeholder="123456" {...register('code')} />
        )}
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        {(control) => <Input {...control} type="password" autoComplete="current-password" {...register('password')} />}
      </Field>
      {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456 y cualquier contraseña sirve.</p>}
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onClose} disabled={disable.isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={disable.isPending}>
          Desactivar
        </Button>
      </div>
    </form>
  )
}
