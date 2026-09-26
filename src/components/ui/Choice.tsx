import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  ref?: Ref<HTMLInputElement>
  label: ReactNode
  description?: ReactNode
}

export function Checkbox({ label, description, className, ref, ...props }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-body', className)}>
      <input ref={ref} type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-ink" {...props} />
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
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-ink' : 'bg-outline',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow-raise transition-transform duration-200 ease-out-expo',
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
}

/** Grupo de opciones excluyentes (Día · Semana · Mes, ×2 · ×3 · ×5). */
export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const move = (direction: 1 | -1) => {
    const index = options.findIndex((option) => option.value === value)
    const next = options[(index + direction + options.length) % options.length]
    onChange(next.value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-kp border border-outline bg-field p-0.5', className)}
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
              'rounded-[8px] font-medium whitespace-nowrap transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-caption' : 'h-8 px-3.5 text-small',
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
