import { zodResolver } from '@hookform/resolvers/zod'
import { Medal, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button, ErrorState, Field, IconButton, Input, PageHeader, Panel, SaveBar, Skeleton, useToast } from '@/components/ui'
import { env } from '@/config/env'
import { errorMessage } from '@/data/api/errors'
import { usePricing, useUpdatePricing } from '@/data/hooks/use-billing'
import type { PricingInput } from '@/data/models'
import { pricingInputSchema } from '@/data/schemas/admin.schema'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDateTime, formatMoney } from '@/lib/format'

export function PricingPage() {
  useDocumentTitle('Tarifas')
  const pricing = usePricing()
  const update = useUpdatePricing()
  const toast = useToast()
  const form = useForm<PricingInput>({ resolver: zodResolver(pricingInputSchema) })
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = form
  const packs = useFieldArray({ control, name: 'badgePacks' })
  const packValues = useWatch({ control, name: 'badgePacks' })

  useEffect(() => {
    if (pricing.data) {
      reset({
        couponFee: pricing.data.couponFee,
        badgeActivationMonthly: pricing.data.badgeActivationMonthly,
        badgePacks: pricing.data.badgePacks.map((pack) => ({ ...pack })),
        assistedOnboardingFee: pricing.data.assistedOnboardingFee,
      })
    }
  }, [pricing.data, reset])

  const save = handleSubmit((input) =>
    update.mutate(input, {
      onSuccess: () => toast({ title: 'Tarifas guardadas', description: 'Aplican a lo nuevo desde ahora.' }),
      onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
    }),
  )

  if (pricing.isError) return <ErrorState error={pricing.error} onRetry={() => void pricing.refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tarifas"
        description="Lo que K'Plan cobra a negocios y alcaldías. Los cambios aplican a lo nuevo: los canjes, activaciones y campañas ya registrados conservan su precio."
      />
      {env.useMocks && (
        <p className="max-w-[72ch] rounded-kp border border-dashed border-outline px-4 py-3 text-small text-muted">
          Modo demo: estos montos son de prueba, no son precios definidos por K'Plan.
        </p>
      )}

      {!pricing.data ? (
        <Skeleton className="h-96" />
      ) : (
        <form className="flex max-w-3xl flex-col gap-6" onSubmit={save} noValidate>
          <Panel title="Cupones" description="Tarifa fija por cada canje que un negocio valida en el portal.">
            <Field label="Por cupón canjeado" error={errors.couponFee?.message} className="max-w-56">
              {(field) => <Input {...field} type="number" min={0} leading="C$" {...register('couponFee', { valueAsNumber: true })} />}
            </Field>
          </Panel>

          <Panel title="Activar insignia" description="Cargo mensual por cada lugar que da insignia porque la organización la activó.">
            <Field label="Al mes, por lugar" error={errors.badgeActivationMonthly?.message} className="max-w-56">
              {(field) => (
                <Input {...field} type="number" min={0} leading="C$" {...register('badgeActivationMonthly', { valueAsNumber: true })} />
              )}
            </Field>
          </Panel>

          <Panel
            title="Paquetes de insignias extra"
            description="Lo que se compra para una campaña ×2, ×3 o ×5."
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={15} />}
                disabled={packs.fields.length >= 6}
                onClick={() => packs.append({ id: `pack-${Date.now().toString(36)}`, badges: 1000, price: 9000 })}
              >
                Agregar
              </Button>
            }
          >
            <ul className="flex flex-col gap-3">
              {packs.fields.map((pack, index) => {
                const value = packValues?.[index]
                const unit = value && value.badges > 0 ? value.price / value.badges : 0
                return (
                  <li key={pack.id} className="grid items-start gap-3 sm:grid-cols-[10rem_10rem_1fr_auto]">
                    <Field label="Insignias" error={errors.badgePacks?.[index]?.badges?.message}>
                      {(field) => (
                        <Input
                          {...field}
                          type="number"
                          min={10}
                          leading={<Medal size={15} className="text-badge-deep" />}
                          {...register(`badgePacks.${index}.badges`, { valueAsNumber: true })}
                        />
                      )}
                    </Field>
                    <Field label="Precio" error={errors.badgePacks?.[index]?.price?.message}>
                      {(field) => (
                        <Input {...field} type="number" min={0} leading="C$" {...register(`badgePacks.${index}.price`, { valueAsNumber: true })} />
                      )}
                    </Field>
                    <p className="text-small text-muted sm:pt-8 tabular-nums">{unit > 0 ? `${formatMoney(unit)} por insignia` : ''}</p>
                    <IconButton
                      label="Quitar paquete"
                      icon={<Trash2 size={16} />}
                      onClick={() => packs.remove(index)}
                      disabled={packs.fields.length === 1}
                      tone="danger"
                      className="sm:mt-6"
                    />
                  </li>
                )
              })}
            </ul>
            {errors.badgePacks?.message && <p className="mt-2 text-caption font-medium text-danger">{errors.badgePacks.message}</p>}
          </Panel>

          <Panel
            title="Alta asistida"
            description="Cuando el equipo llena la solicitud por una organización. Se cobra una sola vez, al aprobarla, y sólo si al hacer el alta se marcó cobrarla."
          >
            <Field label="Por alta asistida" error={errors.assistedOnboardingFee?.message} className="max-w-56">
              {(field) => (
                <Input {...field} type="number" min={0} leading="C$" {...register('assistedOnboardingFee', { valueAsNumber: true })} />
              )}
            </Field>
          </Panel>

          <p className="text-small text-muted">Última actualización: {formatDateTime(pricing.data.updatedAt)}</p>
        </form>
      )}

      <SaveBar
        visible={isDirty}
        saving={update.isPending}
        onSave={() => void save()}
        onDiscard={() => reset()}
        message="Cambiaste tarifas sin guardar"
      />
    </div>
  )
}
