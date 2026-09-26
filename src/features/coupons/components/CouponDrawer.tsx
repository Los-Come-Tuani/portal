import { zodResolver } from '@hookform/resolvers/zod'
import { Medal } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Checkbox, Dialog, Field, Input, Select, Switch, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { usePricing } from '@/data/hooks/use-billing'
import { useSaveCoupon } from '@/data/hooks/use-coupons'
import type { Coupon, CouponInput, Stop } from '@/data/models'
import { couponInputSchema } from '@/data/schemas/coupon.schema'
import { addDays, todayISO } from '@/lib/dates'
import { formatMoney } from '@/lib/format'

const LABEL_SUGGESTIONS = ['10% de descuento', '15% de descuento', 'Gratis', 'Regalo', '2×1']

interface CouponDrawerProps {
  open: boolean
  coupon: Coupon | null
  /** Dueño de un cupón nuevo; `null` = K'Plan. */
  organizationId: string | null
  places: readonly Stop[]
  onClose: () => void
}

export function CouponDrawer({ open, coupon, organizationId, places, onClose }: CouponDrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={coupon ? 'Editar cupón' : 'Nuevo cupón'}
      description="El turista lo paga con insignias en la app y te muestra un código al llegar."
    >
      <CouponForm
        key={coupon?.id ?? 'new'}
        coupon={coupon}
        organizationId={coupon ? coupon.organizationId : organizationId}
        places={places}
        onDone={onClose}
      />
    </Dialog>
  )
}

function CouponForm({
  coupon,
  organizationId,
  places,
  onDone,
}: {
  coupon: Coupon | null
  organizationId: string | null
  places: readonly Stop[]
  onDone: () => void
}) {
  const save = useSaveCoupon()
  const pricing = usePricing()
  const toast = useToast()
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponInputSchema),
    defaultValues: coupon
      ? { ...coupon }
      : {
          title: '',
          description: '',
          discountLabel: '',
          cost: 3,
          image: '',
          organizationId,
          stopId: places.length === 1 ? places[0].id : null,
          status: 'active',
          validUntil: addDays(todayISO(), 90),
          maxRedemptions: null,
          terms: '',
        },
  })
  const image = useWatch({ control, name: 'image' })
  const validUntil = useWatch({ control, name: 'validUntil' })
  const maxRedemptions = useWatch({ control, name: 'maxRedemptions' })

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: coupon?.id, input },
      {
        onSuccess: () => {
          toast({ title: coupon ? 'Cupón actualizado' : 'Cupón creado', description: 'Ya aparece en la app.' })
          onDone()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    ),
  )

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Field label="Qué recibe el turista" error={errors.title?.message}>
        {(field) => <Input {...field} placeholder="Fresco de cacao con tu almuerzo" {...register('title')} />}
      </Field>
      <Field label="Descripción" error={errors.description?.message}>
        {(field) => <Textarea {...field} rows={3} {...register('description')} />}
      </Field>
      <Field label="Etiqueta del beneficio" error={errors.discountLabel?.message} hint="Va sobre la tarjeta del cupón en la app.">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Input {...field} placeholder="10% de descuento" {...register('discountLabel')} />
            <div className="flex flex-wrap gap-1.5">
              {LABEL_SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setValue('discountLabel', label, { shouldDirty: true, shouldValidate: true })}
                  className="rounded-sm bg-paper px-2 py-1 text-caption text-ink hover:bg-paper-deep"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Cuesta"
          error={errors.cost?.message}
          hint="El turista gana 1 insignia por cada lugar que visita con QR."
        >
          {(field) => (
            <Input
              {...field}
              type="number"
              min={1}
              max={20}
              leading={<Medal size={15} className="text-badge-deep" />}
              trailing="insignias"
              {...register('cost', { valueAsNumber: true })}
            />
          )}
        </Field>
        {places.length > 1 && (
          <Field label="Dónde se canjea" error={errors.stopId?.message}>
            {(field) => (
              <Select
                {...field}
                {...register('stopId', { setValueAs: (value: string | null) => (value ? value : null) })}
              >
                <option value="">En cualquiera de mis lugares</option>
                {places.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      <Field label="Foto" error={errors.image?.message} hint="Dirección web de la imagen (https://…).">
        {(field) => <Input {...field} type="url" placeholder="https://" {...register('image')} />}
      </Field>
      {image && !errors.image && <img src={image} alt="" className="aspect-[4/3] w-56 rounded-kp bg-placeholder object-cover" />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Field label="Vence" error={errors.validUntil?.message}>
            {(field) => (
              <Input
                {...field}
                type="date"
                disabled={validUntil === null}
                value={validUntil ?? ''}
                onChange={(event) => setValue('validUntil', event.target.value, { shouldDirty: true })}
              />
            )}
          </Field>
          <Checkbox
            label="Sin fecha de vencimiento"
            checked={validUntil === null}
            onChange={(event) =>
              setValue('validUntil', event.target.checked ? null : addDays(todayISO(), 90), { shouldDirty: true })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Canjes máximos" error={errors.maxRedemptions?.message}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={1}
                disabled={maxRedemptions === null}
                value={maxRedemptions ?? ''}
                onChange={(event) =>
                  setValue('maxRedemptions', event.target.value ? Number(event.target.value) : null, { shouldDirty: true })
                }
              />
            )}
          </Field>
          <Checkbox
            label="Sin límite"
            checked={maxRedemptions === null}
            onChange={(event) => setValue('maxRedemptions', event.target.checked ? null : 100, { shouldDirty: true })}
          />
        </div>
      </div>

      <Field label="Condiciones" optional error={errors.terms?.message}>
        {(field) => <Input {...field} placeholder="Uno por persona y por visita." {...register('terms')} />}
      </Field>

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Switch
            label="Activo"
            description="Pausado, deja de verse en la app; los códigos que ya se canjearon siguen valiendo."
            checked={field.value === 'active'}
            onChange={(checked) => field.onChange(checked ? 'active' : 'paused')}
          />
        )}
      />

      {organizationId && pricing.data && (
        <p className="rounded-kp bg-paper p-3.5 text-small text-ink">
          K'Plan cobra <strong>{formatMoney(pricing.data.couponFee)}</strong> por cada canje que valides. Si nadie lo usa,
          no pagas nada.
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-5">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {coupon ? 'Guardar' : 'Crear cupón'}
        </Button>
      </div>
    </form>
  )
}
