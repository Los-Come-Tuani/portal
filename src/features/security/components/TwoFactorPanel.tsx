import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button, ErrorState, Panel, SkeletonRows, Tag } from '@/components/ui'
import { useTwoFactorStatus } from '@/data/hooks/use-security'
import type { TwoFactorStatus } from '@/data/models'
import { useAuth, useSession } from '@/features/auth/use-auth'
import { formatDate, plural } from '@/lib/format'
import { DisableTwoFactorDialog } from './DisableTwoFactorDialog'
import { RegenerateCodesDialog } from './RegenerateCodesDialog'
import { SetupTwoFactorDialog } from './SetupTwoFactorDialog'

type Dialogs = 'setup' | 'regenerate' | 'disable' | null

export function TwoFactorPanel() {
  const status = useTwoFactorStatus()
  const { refreshUser } = useAuth()
  const { user } = useSession()
  const [dialog, setDialog] = useState<Dialogs>(null)
  const close = () => setDialog(null)
  // Que el 2FA cambie no es crítico para la pantalla: si falla refrescar a la persona, el estado se ve igual.
  const syncUser = () => void refreshUser().catch(() => undefined)

  return (
    <Panel
      title="Verificación en dos pasos"
      description="Además de tu contraseña, te pedimos un código de 6 dígitos de tu app de autenticación cada vez que entras."
      actions={
        status.data?.enabled ? (
          <Tag tone="confirmed" icon={<ShieldCheck size={13} aria-hidden="true" />}>
            Activa
          </Tag>
        ) : status.data ? (
          <Tag tone="neutral">Desactivada</Tag>
        ) : undefined
      }
    >
      {status.isPending && <SkeletonRows rows={2} />}
      {status.isError && <ErrorState error={status.error} onRetry={() => void status.refetch()} className="py-8" />}
      {status.data && (
        <TwoFactorState
          status={status.data}
          required={user.twoFactor.required}
          onSetup={() => setDialog('setup')}
          onRegenerate={() => setDialog('regenerate')}
          onDisable={() => setDialog('disable')}
        />
      )}

      <SetupTwoFactorDialog open={dialog === 'setup'} onClose={close} onActivated={syncUser} />
      <RegenerateCodesDialog open={dialog === 'regenerate'} onClose={close} />
      <DisableTwoFactorDialog open={dialog === 'disable'} onClose={close} onDisabled={syncUser} />
    </Panel>
  )
}

function TwoFactorState({
  status,
  required,
  onSetup,
  onRegenerate,
  onDisable,
}: {
  status: TwoFactorStatus
  required: boolean
  onSetup: () => void
  onRegenerate: () => void
  onDisable: () => void
}) {
  if (!status.enabled) {
    return (
      <div className="flex flex-col gap-4">
        {required && (
          <p role="alert" className="flex items-start gap-2 rounded-kp bg-danger/8 px-3 py-2.5 text-small font-medium text-danger">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Tu rol exige la verificación en dos pasos. Actívala para seguir usando el portal.
          </p>
        )}
        <p className="text-body text-muted">
          {status.pending
            ? 'Empezaste a activarla pero no confirmaste el código. Puedes empezar de nuevo.'
            : 'Con ella, aunque alguien sepa tu contraseña no puede entrar sin tu celular.'}
        </p>
        <div>
          <Button onClick={onSetup}>{status.pending ? 'Empezar de nuevo' : 'Activar'}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-muted">
        {status.confirmedAt ? `Activa desde el ${formatDate(status.confirmedAt)}. ` : 'Está activa. '}
        Te quedan {plural(status.recoveryCodes, 'código de recuperación', 'códigos de recuperación')} sin usar.
      </p>
      {status.recoveryCodes <= 2 && (
        <p role="status" className="rounded-kp bg-planned/10 px-3 py-2.5 text-small font-medium text-planned">
          Te quedan pocos códigos de recuperación. Genera nuevos antes de quedarte sin ellos.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRegenerate}>
          Generar códigos nuevos
        </Button>
        {!required && (
          <Button variant="quiet" onClick={onDisable}>
            Desactivar
          </Button>
        )}
      </div>
    </div>
  )
}
