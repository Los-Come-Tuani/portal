import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  ref?: Ref<HTMLInputElement>
  label: ReactNode
  description?: ReactNode
}

export function Checkbox({ label, description, className, ref, ...props }: CheckboxProps) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body', className)}>
      <input ref={ref} type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink" {...props} />
      <span className="flex flex-col">
        <span className="text-ink">{label}</span>
        {description && <span className="text-caption text-muted">{description}</span>}
      </span>
    </label>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: ReactNode
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'opacity-50')}>
      <span className="flex flex-col">
        <span className="text-body font-medium text-ink">{label}</span>
        {description && <span className="text-caption text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-11 w-11 shrink-0 items-center rounded-kp before:absolute before:inset-x-0 before:top-2.5 before:h-6 before:rounded-full before:transition-colors before:duration-200',
          checked ? 'before:bg-ink' : 'before:bg-field-outline',
        )}
      >
        <span
          className={cn(
            'relative inline-block size-5 rounded-full bg-white shadow-raise transition-transform duration-200 ease-out-expo',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

interface SegmentedControlProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: ReactNode; description?: string }[]
  label: string
  size?: 'sm' | 'md'
  className?: string
  /** Dentro de un Field con `group`: lo nombra la etiqueta visible y se anuncian su ayuda y su error. */
  labelledBy?: string
  describedBy?: string
  invalid?: boolean
}

/** Grupo de opciones excluyentes (Día · Semana · Mes, ×2 · ×3 · ×5). */
export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
  labelledBy,
  describedBy,
  invalid,
}: SegmentedControlProps<T>) {
  const move = (direction: 1 | -1) => {
    const index = options.findIndex((option) => option.value === value)
    const next = options[(index + direction + options.length) % options.length]
    onChange(next.value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn('inline-flex min-w-0 max-w-full flex-wrap gap-0.5 rounded-kp border bg-surface p-1', invalid ? 'border-danger/60' : 'border-outline', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          move(1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-w-11 max-w-full grow shrink-0 rounded-sm font-medium transition-colors duration-150 focus-visible:-outline-offset-2',
              size === 'sm' ? 'min-h-11 px-3 py-2 text-small' : 'min-h-11 px-4 py-2 text-body',
              selected ? 'bg-ink text-canvas' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
