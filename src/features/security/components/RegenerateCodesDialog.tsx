import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Dialog, Field, Input } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useRegenerateRecoveryCodes } from '@/data/hooks/use-security'
import { regenerateCodesSchema } from '@/data/schemas/auth.schema'
import { RecoveryCodes } from './RecoveryCodes'

export function RegenerateCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Generar códigos de recuperación nuevos"
      description="Los códigos que tienes ahora dejan de servir. Confirma con un código de tu app."
    >
      <RegenerateForm key={String(open)} onClose={onClose} />
    </Dialog>
  )
}

function RegenerateForm({ onClose }: { onClose: () => void }) {
  const regenerate = useRegenerateRecoveryCodes()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<{ code: string }>({ resolver: zodResolver(regenerateCodesSchema), defaultValues: { code: '' } })

  if (codes) {
    return (
      <div className="flex flex-col gap-5">
        <RecoveryCodes codes={codes} />
        <div className="flex justify-end border-t border-divider pt-5">
          <Button onClick={onClose}>Ya los guardé</Button>
        </div>
      </div>
    )
  }

  const submit = handleSubmit(({ code }) => {
    setError(null)
    regenerate.mutate(code, {
      onSuccess: setCodes,
      onError: (caught) => {
        if (caught instanceof ApiError && caught.fieldErrors.code) setFieldError('code', { message: caught.fieldErrors.code })
        else setError(errorMessageWithWait(caught))
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
      {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onClose} disabled={regenerate.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={regenerate.isPending}>
          Generar códigos
        </Button>
      </div>
    </form>
  )
}
