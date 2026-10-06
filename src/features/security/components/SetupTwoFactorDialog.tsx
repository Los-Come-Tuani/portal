import { zodResolver } from '@hookform/resolvers/zod'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { QrCode } from '@/components/brand/QrCode'
import { Button, Dialog, Field, Input, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { ApiError, errorMessageWithWait } from '@/data/api/errors'
import { useConfirmTwoFactor, useStartTwoFactor } from '@/data/hooks/use-security'
import type { TwoFactorSetup } from '@/data/models'
import { confirmTwoFactorSchema } from '@/data/schemas/auth.schema'
import { RecoveryCodes } from './RecoveryCodes'

interface SetupTwoFactorDialogProps {
  open: boolean
  onClose: () => void
  /** El segundo factor quedó activo: el padre actualiza a la persona de la sesión. */
  onActivated: () => void
}

export function SetupTwoFactorDialog({ open, onClose, onActivated }: SetupTwoFactorDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Activar la verificación en dos pasos">
      <SetupFlow key={String(open)} onClose={onClose} onActivated={onActivated} />
    </Dialog>
  )
}

type Phase = { name: 'intro' } | { name: 'scan'; setup: TwoFactorSetup } | { name: 'codes'; codes: string[] }

function SetupFlow({ onClose, onActivated }: Pick<SetupTwoFactorDialogProps, 'onClose' | 'onActivated'>) {
  const [phase, setPhase] = useState<Phase>({ name: 'intro' })
  const [error, setError] = useState<string | null>(null)
  const start = useStartTwoFactor()

  if (phase.name === 'codes') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-body font-semibold text-ink">Listo: la verificación en dos pasos está activa.</p>
        <RecoveryCodes codes={phase.codes} />
        <div className="flex justify-end border-t border-divider pt-5">
          <Button onClick={onClose}>Ya los guardé</Button>
        </div>
      </div>
    )
  }

  if (phase.name === 'scan') {
    return (
      <ScanStep
        setup={phase.setup}
        onCancel={onClose}
        onConfirmed={(codes) => {
          onActivated()
          setPhase({ name: 'codes', codes })
        }}
      />
    )
  }

  // Pedir la clave es una acción de la persona (un clic), no algo que pase solo al abrir:
  // cada petición reemplaza la clave pendiente anterior.
  const begin = () => {
    setError(null)
    start.mutate(undefined, {
      onSuccess: (setup) => setPhase({ name: 'scan', setup }),
      onError: (caught) => setError(errorMessageWithWait(caught)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-muted">
        Cada vez que entres, además de tu contraseña te vamos a pedir un código de 6 dígitos que cambia cada 30 segundos.
        Necesitas una app de autenticación en tu celular, como Google Authenticator, Microsoft Authenticator o Authy.
      </p>
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={begin} loading={start.isPending}>
          Empezar
        </Button>
      </div>
    </div>
  )
}

function ScanStep({
  setup,
  onConfirmed,
  onCancel,
}: {
  setup: TwoFactorSetup
  onConfirmed: (codes: string[]) => void
  onCancel: () => void
}) {
  const confirm = useConfirmTwoFactor()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<{ code: string }>({ resolver: zodResolver(confirmTwoFactorSchema), defaultValues: { code: '' } })

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret)
      toast({ title: 'Clave copiada' })
    } catch {
      toast({ title: 'No pudimos copiarla', description: 'Selecciónala y cópiala a mano.', tone: 'error' })
    }
  }

  const submit = handleSubmit(({ code }) => {
    setError(null)
    confirm.mutate(code, {
      onSuccess: onConfirmed,
      onError: (caught) => {
        if (caught instanceof ApiError && caught.fieldErrors.code) setFieldError('code', { message: caught.fieldErrors.code })
        else setError(errorMessageWithWait(caught))
      },
    })
  })

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-body text-muted">
        <li>Abre tu app de autenticación y agrega una cuenta nueva.</li>
        <li>Escanea el código QR o escribe la clave.</li>
        <li>Escribe aquí el código de 6 dígitos que te muestre.</li>
      </ol>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-kp border border-divider bg-white p-2 text-ink">
          <QrCode value={setup.uri} className="size-44" title="Código QR para tu app de autenticación" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-small text-muted">¿No puedes escanearlo? Escribe esta clave en tu app:</p>
          <p className="mt-1.5 font-mono text-small font-semibold tracking-wider break-all text-ink select-all">{setup.secret}</p>
          <Button variant="ghost" size="sm" icon={<Copy size={15} />} className="mt-1 -ml-2" onClick={() => void copySecret()}>
            Copiar clave
          </Button>
        </div>
      </div>

      <Field label="Código de 6 dígitos" error={errors.code?.message}>
        {(control) => (
          <Input {...control} data-autofocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" {...register('code')} />
        )}
      </Field>
      {env.useMocks && <p className="text-small text-muted">Modo demo: el código es 123456.</p>}
      {error && (
        <p role="alert" className="text-small font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={confirm.isPending}>
          Activar
        </Button>
      </div>
    </form>
  )
}
