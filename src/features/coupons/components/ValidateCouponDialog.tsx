import { CircleCheck, Medal } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, Dialog, Field, Input, Tag } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessage } from '@/data/api/errors'
import { usePricing } from '@/data/hooks/use-billing'
import { useLookupRedemption, useRedemptions, useValidateRedemption } from '@/data/hooks/use-coupons'
import type { RedemptionLookup } from '@/data/repositories/coupons.repository'
import { useSession } from '@/features/auth/use-auth'
import { formatDateTime, formatMoney, plural } from '@/lib/format'
import { formatRedemptionCode, isCompleteCode } from '../lib/code'

interface ValidateCouponDialogProps {
  open: boolean
  initialCode: string
  onClose: () => void
}

type Step = { name: 'enter' } | { name: 'confirm'; found: RedemptionLookup } | { name: 'done'; found: RedemptionLookup }

/** Se monta de nuevo cada vez que se abre (ver ValidateCouponProvider), así arranca limpio. */
export function ValidateCouponDialog({ open, initialCode, onClose }: ValidateCouponDialogProps) {
  const { organizationId, role } = useSession()
  const [code, setCode] = useState(() => formatRedemptionCode(initialCode))
  const [step, setStep] = useState<Step>({ name: 'enter' })
  const lookup = useLookupRedemption()
  const validate = useValidateRedemption()
  const pricing = usePricing()
  const pending = useRedemptions({ organizationId, status: 'pending' }, open && env.useMocks && role === 'negocio')

  const search = (event?: FormEvent) => {
    event?.preventDefault()
    if (!isCompleteCode(code)) return
    lookup.mutate(code, { onSuccess: (found) => setStep({ name: 'confirm', found }) })
  }

  const confirm = (found: RedemptionLookup) => {
    validate.mutate(found.redemption.code, { onSuccess: (result) => setStep({ name: 'done', found: result }) })
  }

  const restart = () => {
    setCode('')
    setStep({ name: 'enter' })
    lookup.reset()
    validate.reset()
  }

  const fee = pricing.data?.couponFee

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Validar cupón"
      description="Escribe el código que el turista te muestra en la app."
      size="sm"
      footer={
        step.name === 'enter' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="validate-coupon" loading={lookup.isPending} disabled={!isCompleteCode(code)}>
              Buscar código
            </Button>
          </>
        ) : step.name === 'confirm' ? (
          <>
            <Button variant="ghost" onClick={restart}>
              Otro código
            </Button>
            <Button loading={validate.isPending} onClick={() => confirm(step.found)}>
              Validar canje
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={restart}>
              Validar otro
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </>
        )
      }
    >
      {step.name === 'enter' && (
        <form id="validate-coupon" onSubmit={search} className="flex flex-col gap-4">
          <Field label="Código del cupón" error={lookup.error ? errorMessage(lookup.error) : undefined}>
            {(control) => (
              <Input
                {...control}
                data-autofocus
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder="KP-XXXX-XXXX"
                value={code}
                onChange={(event) => {
                  setCode(formatRedemptionCode(event.target.value))
                  lookup.reset()
                }}
                className="font-mono text-lead tracking-[0.12em] uppercase"
              />
            )}
          </Field>

          {pending.data && pending.data.length > 0 && (
            <div className="rounded-kp border border-dashed border-outline p-3">
              <p className="text-caption font-semibold text-muted">Códigos por validar (modo demo)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pending.data.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCode(item.code)}
                    className="rounded-sm bg-paper px-2 py-1 font-mono text-caption font-semibold text-ink transition-colors hover:bg-paper-deep"
                  >
                    {item.code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {step.name === 'confirm' && (
        <RedemptionSummary found={step.found}>
          {validate.error ? (
            <p role="alert" className="mt-4 text-small font-medium text-danger">
              {errorMessage(validate.error)}
            </p>
          ) : (
            fee !== undefined &&
            step.found.coupon.organizationId && (
              <p className="mt-4 text-small text-muted">
                Al validarlo, K'Plan suma {formatMoney(fee)} por este canje a tu estado de cuenta.
              </p>
            )
          )}
        </RedemptionSummary>
      )}

      {step.name === 'done' && (
        <div className="flex flex-col items-center py-2 text-center" role="status">
          <span className="flex size-14 items-center justify-center rounded-full bg-confirmed/10 text-confirmed">
            <CircleCheck size={28} aria-hidden="true" />
          </span>
          <p className="mt-4 text-title font-semibold">Canje validado</p>
          <p className="mt-1 max-w-[34ch] text-body text-muted">
            Dale a {step.found.redemption.touristName}: <strong className="text-ink">{step.found.coupon.title}</strong>.
          </p>
        </div>
      )}
    </Dialog>
  )
}

function RedemptionSummary({ found, children }: { found: RedemptionLookup; children?: ReactNode }) {
  const { coupon, redemption } = found
  return (
    <div>
      <div className="flex gap-4">
        <img
          src={coupon.image}
          alt=""
          className="size-20 shrink-0 rounded-kp bg-placeholder object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <Tag tone="outline">{coupon.discountLabel}</Tag>
          <p className="mt-1.5 text-lead font-semibold text-ink">{coupon.title}</p>
          <p className="mt-0.5 text-small text-muted">{coupon.description}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
        <dt className="text-muted">Código</dt>
        <dd className="font-mono font-semibold text-ink">{redemption.code}</dd>
        <dt className="text-muted">Turista</dt>
        <dd className="text-ink">{redemption.touristName}</dd>
        <dt className="text-muted">Lo canjeó</dt>
        <dd className="text-ink">{formatDateTime(redemption.claimedAt)}</dd>
        <dt className="text-muted">Pagó</dt>
        <dd className="flex items-center gap-1.5 text-ink">
          <Medal size={14} className="text-badge-deep" aria-hidden="true" />
          {plural(coupon.cost, 'insignia', 'insignias')}
        </dd>
      </dl>
      {children}
    </div>
  )
}
