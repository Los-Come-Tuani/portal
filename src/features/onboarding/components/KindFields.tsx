import { Landmark, Store, Theater } from 'lucide-react'
import type { ReactNode } from 'react'
import { ORGANIZATION_KIND_LABELS, type OrganizationKind } from '@/data/models'
import { cn } from '@/lib/cn'

const OPTIONS: { kind: OrganizationKind; detail: string; icon: ReactNode }[] = [
  { kind: 'business', detail: 'Restaurante, café, taller, finca, hospedaje, tour operador…', icon: <Store size={20} /> },
  { kind: 'institution', detail: 'Teatro, casa de cultura, fundación, ticketera…', icon: <Theater size={20} /> },
  { kind: 'municipality', detail: 'El gobierno local de una ciudad, para sus lugares públicos y eventos.', icon: <Landmark size={20} /> },
]

/** Qué clase de organización se postula: cada una entra por un camino distinto. */
export function KindFields({ value, error, onChange }: { value: OrganizationKind | null; error?: string; onChange: (kind: OrganizationKind) => void }) {
  return (
    <fieldset aria-describedby={error ? 'kind-error' : undefined}>
      <legend className="sr-only">Te postulas como</legend>
      <div role="radiogroup" className="grid gap-3">
        {OPTIONS.map((option) => {
          const selected = value === option.kind
          return (
            <label
              key={option.kind}
              className={cn(
                'flex cursor-pointer gap-3 rounded-kp border bg-surface p-4 transition-colors duration-150',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                selected ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-divider hover:border-ink/40',
              )}
            >
              <input type="radio" name="kind" value={option.kind} checked={selected} onChange={() => onChange(option.kind)} className="sr-only" />
              <span
                className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', selected ? 'bg-ink text-canvas' : 'bg-paper text-ink')}
                aria-hidden="true"
              >
                {option.icon}
              </span>
              <span>
                <span className="block text-body font-semibold text-ink">{ORGANIZATION_KIND_LABELS[option.kind]}</span>
                <span className="block text-small text-muted">{option.detail}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id="kind-error" className="mt-2 text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
