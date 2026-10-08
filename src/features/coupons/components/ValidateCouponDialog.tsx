import { CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Dialog, Field, Input } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useConsumeCoupon, useFindCoupon } from '@/data/hooks/use-coupons'
import type { CouponCode } from '@/data/models'
import { formatDate, formatDateTime } from '@/lib/format'
import { formatCouponCode, isCompleteCode } from '../lib/code'

interface ValidateCouponDialogProps {
  open: boolean
  initialCode: string
  onClose: () => void
}

type Step =
  | { name: 'enter' }
  | { name: 'confirm'; found: CouponCode }
  | { name: 'unusable'; found: CouponCode }
  | { name: 'missing' }
  | { name: 'done'; coupon: CouponCode }

/**
 * La validación en el mostrador: primero se busca el código entre los cupones del comercio (sin
 * gastarlo) y, si todavía vale, al confirmar `coupon-redemption/validate/` lo consume. Se monta de
 * nuevo cada vez que se abre (ver ValidateCouponProvider), así arranca limpio.
 */
export function ValidateCouponDialog({ open, initialCode, onClose }: ValidateCouponDialogProps) {
  const [code, setCode] = useState(() => formatCouponCode(initialCode))
  const [step, setStep] = useState<Step>({ name: 'enter' })
  const find = useFindCoupon()
  const consume = useConsumeCoupon()

  const search = (event?: FormEvent) => {
    event?.preventDefault()
    if (!isCompleteCode(code)) return
    find.mutate(code, {
      onSuccess: (found) => setStep(!found ? { name: 'missing' } : found.status === 'valid' ? { name: 'confirm', found } : { name: 'unusable', found }),
    })
  }

  const validate = () => consume.mutate(code, { onSuccess: (coupon) => setStep({ name: 'done', coupon }) })

  const restart = () => {
    setCode('')
    setStep({ name: 'enter' })
    find.reset()
    consume.reset()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Validar cupón"
      description="Escribe el código que el turista te muestra o te dicta."
      size="sm"
      footer={
        step.name === 'enter' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="validate-coupon" loading={find.isPending} disabled={!isCompleteCode(code)}>
              Buscar código
            </Button>
          </>
        ) : step.name === 'done' ? (
          <>
            <Button variant="ghost" onClick={restart}>
              Validar otro
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </>
        ) : step.name === 'confirm' ? (
          <>
            <Button variant="ghost" onClick={restart}>
              Otro código
            </Button>
            <Button loading={consume.isPending} onClick={validate}>
              Validar y entregar
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={restart}>Otro código</Button>
          </>
        )
      }
    >
      {step.name === 'enter' && (
        <form id="validate-coupon" onSubmit={search} className="flex flex-col gap-4">
          <Field label="Código del cupón" error={find.error ? errorMessage(find.error) : undefined} hint="Ocho letras y números; no importan los espacios ni los guiones.">
            {(control) => (
              <Input
                {...control}
                data-autofocus
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(event) => {
                  setCode(formatCouponCode(event.target.value))
                  find.reset()
                }}
                className="font-mono text-lead tracking-[0.12em] uppercase"
              />
            )}
          </Field>
        </form>
      )}

      {step.name === 'confirm' && (
        <div>
          <p className="text-lead font-semibold text-ink">{step.found.title}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
            <dt className="text-muted">Código</dt>
            <dd className="font-mono font-semibold text-ink">{formatCouponCode(step.found.code)}</dd>
            <dt className="text-muted">Turista</dt>
            <dd className="text-ink">{step.found.touristName}</dd>
            <dt className="text-muted">Lo canjeó</dt>
            <dd className="text-ink">{formatDateTime(step.found.redeemedAt)}</dd>
            <dt className="text-muted">Vale hasta</dt>
            <dd className="text-ink">{formatDate(step.found.expiresAt.slice(0, 10))}</dd>
          </dl>
          {consume.error ? (
            <p role="alert" className="mt-4 text-small font-medium text-danger">
              {errorMessage(consume.error)}
            </p>
          ) : (
            <p className="mt-4 text-small text-muted">Al validarlo queda usado y se suma a tu estado de cuenta del mes.</p>
          )}
        </div>
      )}

      {step.name === 'unusable' && (
        <div className="flex flex-col gap-3 text-body text-muted" role="alert">
          <p className="text-lead font-semibold text-ink">{step.found.title}</p>
          {step.found.status === 'consumed' ? (
            <p>
              <span className="font-mono font-semibold text-ink">{formatCouponCode(step.found.code)}</span> ya se usó
              {step.found.consumedAt ? ` el ${formatDateTime(step.found.consumedAt)}` : ''}. No se puede entregar otra vez.
            </p>
          ) : (
            <p>
              <span className="font-mono font-semibold text-ink">{formatCouponCode(step.found.code)}</span> venció el{' '}
              {formatDate(step.found.expiresAt.slice(0, 10))}. Ya no se puede entregar.
            </p>
          )}
        </div>
      )}

      {step.name === 'missing' && (
        <p className="text-body text-muted" role="alert">
          <span className="font-mono font-semibold text-ink">{code}</span> no es un cupón de tu comercio. Revisa que el turista te haya dado bien el
          código.
        </p>
      )}

      {step.name === 'done' && (
        <div className="flex flex-col items-center py-2 text-center" role="status">
          <span className="flex size-14 items-center justify-center rounded-full bg-confirmed/10 text-confirmed">
            <CircleCheck size={28} aria-hidden="true" />
          </span>
          <p className="mt-4 text-title font-semibold">Cupón validado</p>
          <p className="mt-1 max-w-[34ch] text-body text-muted">
            Dale a {step.coupon.touristName}: <strong className="text-ink">{step.coupon.title}</strong>.
          </p>
        </div>
      )}
    </Dialog>
  )
}
