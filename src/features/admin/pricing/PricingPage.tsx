import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ErrorState, Field, Input, PageHeader, Panel, SaveBar, Skeleton, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useTariffs, useUpdateTariffs } from '@/data/hooks/use-billing'
import type { TariffInput } from '@/data/models'
import { tariffInputSchema } from '@/data/schemas/admin.schema'
import { TARIFF_CODES, tariffInputOf } from '@/data/schemas/finance-api.schema'
import { useSession } from '@/features/auth/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime } from '@/lib/format'

/**
 * Las tarifas de K'Plan (`pricing/`): la comisión de cada reserva, la insignia mensual del comercio
 * y lo que paga por cupón validado. Las ve `billing.view` y las cambia `billing.manage`; cambiarlas
 * no toca lo ya cerrado.
 */
export function PricingPage() {
  useDocumentTitle('Tarifas')
  const { can } = useSession()
  const manages = can('billing.manage')
  const tariffs = useTariffs()
  const update = useUpdateTariffs()
  const toast = useToast()
  const current = useMemo(() => (tariffs.data ? tariffInputOf(tariffs.data) : null), [tariffs.data])
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TariffInput>({ resolver: zodResolver(tariffInputSchema) })

  useEffect(() => {
    if (current) reset(current)
  }, [current, reset])

  const save = handleSubmit((input) => {
    if (!current) return
    update.mutate(
      { input, current },
      {
        onSuccess: () => toast({ title: 'Tarifas guardadas', description: 'Aplican a lo nuevo desde ahora.' }),
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )
  })

  if (tariffs.isError) return <ErrorState error={tariffs.error} onRetry={() => void tariffs.refetch()} />

  const updatedAt = tariffs.data?.map((item) => item.updatedAt).sort().at(-1)
  const label = (code: string, fallback: string) => tariffs.data?.find((item) => item.code === code)?.label ?? fallback

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tarifas"
        description="Lo que K'Plan se queda de cada reserva y lo que cobra a los comercios cada mes. Los cambios aplican a lo nuevo: las reservas cerradas y los estados de cuenta emitidos conservan su tarifa."
      />
      {!manages && <p className="text-small text-muted">Tu rol ve las tarifas; cambiarlas es de quien administra la facturación.</p>}

      {!tariffs.data ? (
        <Skeleton className="h-96" />
      ) : (
        <form className="flex max-w-3xl flex-col gap-6" onSubmit={save} noValidate>
          <fieldset disabled={!manages} className="flex min-w-0 flex-col gap-6">
            <Panel title={label(TARIFF_CODES.commission, 'Comisión por reserva')} description="El porcentaje de cada reserva cerrada; el resto entra al saldo del guía.">
              <Field label="Porcentaje" error={errors.commissionRate?.message} className="max-w-56">
                {(field) => <Input {...field} type="number" min={0} max={100} step="0.5" trailing="%" {...register('commissionRate', { valueAsNumber: true })} />}
              </Field>
            </Panel>
            <Panel title={label(TARIFF_CODES.badge, 'Insignia mensual')} description="Lo que paga un comercio al mes por la insignia de su lugar.">
              <Field label="Al mes" error={errors.badgeMonthly?.message} className="max-w-56">
                {(field) => <Input {...field} type="number" min={0} leading="C$" {...register('badgeMonthly', { valueAsNumber: true })} />}
              </Field>
            </Panel>
            <Panel title={label(TARIFF_CODES.coupon, 'Cupón validado')} description="Lo que paga un comercio por cada cupón que valida en el mostrador.">
              <Field label="Por cupón" error={errors.couponFee?.message} className="max-w-56">
                {(field) => <Input {...field} type="number" min={0} leading="C$" {...register('couponFee', { valueAsNumber: true })} />}
              </Field>
            </Panel>
          </fieldset>
          {updatedAt && <p className="text-small text-muted">Última actualización: {formatDateTime(updatedAt)}</p>}
        </form>
      )}

      {manages && (
        <SaveBar visible={isDirty} saving={update.isPending} onSave={() => void save()} onDiscard={() => current && reset(current)} message="Cambiaste tarifas sin guardar" />
      )}
    </div>
  )
}
