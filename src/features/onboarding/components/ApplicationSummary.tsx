import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui'
import { useBusinessTypes, useCities, useInstitutionTypes } from '@/data/hooks/use-applications'
import {
  CURRENCY_LABELS,
  HOURS_DAYS,
  ORGANIZATION_KIND_LABELS,
  type DayHours,
  type OrganizationData,
  type StoredFile,
} from '@/data/models'
import { cn } from '@/lib/cn'
import type { StepKey } from '../lib/flow'

function Section({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <section className="rounded-kp border border-divider bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2.5">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {onEdit && (
          <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={onEdit}>
            Editar
          </Button>
        )}
      </header>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-3 text-body sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function Item({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="break-words text-ink">{value || '—'}</dd>
    </div>
  )
}

/** El archivo con su enlace de lectura (vence en minutos); el nombre es el de la clave, que no dice nada. */
function FileItem({ label, file }: { label: string; file: StoredFile | null }) {
  return (
    <Item
      label={label}
      value={
        file &&
        (file.url ? (
          <a href={file.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-strong hover:underline">
            Ver el archivo
          </a>
        ) : (
          file.fileName
        ))
      }
    />
  )
}

function hoursText(row: DayHours): string {
  return row.closed ? 'Cerrado' : `${row.opens} a ${row.closes}`
}

/**
 * Lo que se manda en la solicitud, en limpio. Con `onEdit` cada sección lleva su botón para volver al
 * paso; sin él es la vista de solo lectura de lo que ya se mandó.
 */
export function ApplicationSummary({ data, onEdit }: { data: OrganizationData; onEdit?: (step: StepKey) => void }) {
  const cities = useCities()
  const businessTypes = useBusinessTypes()
  const institutionTypes = useInstitutionTypes()
  const city = cities.data?.find((item) => item.id === data.cityId)?.name
  const type =
    data.kind === 'business'
      ? businessTypes.data?.find((item) => item.id === data.businessTypeId)?.label
      : data.kind === 'institution'
        ? institutionTypes.data?.find((item) => item.id === data.institutionTypeId)?.label
        : undefined
  const edit = (step: StepKey) => (onEdit ? () => onEdit(step) : undefined)

  return (
    <div className="flex flex-col gap-4">
      <Section title="La organización" onEdit={edit('profile')}>
        <Item label="Clase" value={ORGANIZATION_KIND_LABELS[data.kind]} />
        <Item label="Nombre" value={data.name} />
        <Item label="Ciudad" value={city} />
        {type && <Item label={data.kind === 'business' ? 'A qué se dedica' : 'Tipo'} value={type} />}
        {data.kind === 'business' && <Item label="RUC" value={data.ruc.toUpperCase()} />}
        {data.kind !== 'business' && <Item label="Correo de contacto" value={data.contactEmail} />}
        <Item label="Teléfono" value={[data.phone, data.kind === 'business' ? data.alternatePhone : ''].filter(Boolean).join(' · ')} />
        {data.kind === 'business' && <Item label="Dirección" value={data.address} wide />}
        {data.kind === 'business' && (
          <Item
            label="Ubicación"
            value={data.latitude !== null && data.longitude !== null ? `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}` : 'Sin marcar'}
            wide
          />
        )}
      </Section>

      {data.kind === 'business' ? (
        <>
          <Section title="Horario" onEdit={edit('details')}>
            {HOURS_DAYS.map(({ weekday, label }) => {
              const row = data.hours.find((item) => item.weekday === weekday)
              return <Item key={weekday} label={label} value={row ? hoursText(row) : 'Sin horario'} />
            })}
          </Section>
          <Section title="Platillo estrella" onEdit={edit('details')}>
            <Item label="Nombre" value={data.signatureDish.name} />
            <Item
              label="Precio de referencia"
              value={data.signatureDish.referencePrice ? `${data.signatureDish.referencePrice} ${CURRENCY_LABELS[data.signatureDish.currency].split(' ')[0]}` : ''}
            />
            {data.signatureDish.description && <Item label="Descripción" value={data.signatureDish.description} wide />}
            <FileItem label="Foto" file={data.signatureDish.photo} />
          </Section>
        </>
      ) : (
        <Section title="Documento" onEdit={edit('details')}>
          <FileItem label={data.kind === 'institution' ? 'Existencia legal' : 'Representación'} file={data.document} />
        </Section>
      )}
    </div>
  )
}
