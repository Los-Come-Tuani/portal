import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
}

/** Para un grupo de opciones (SegmentedControl): se nombra con `labelId`, no con `htmlFor`. */
export interface FieldGroupProps {
  labelId: string
  describedBy: string | undefined
  invalid: boolean
}

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: (control: FieldControlProps, group: FieldGroupProps) => ReactNode
  /** El control es un grupo (radiogroup), no un input: la etiqueta no lleva `htmlFor`. */
  group?: boolean
}

/** Etiqueta, ayuda y error conectados al control por id. */
export function Field({ label, hint, error, optional, className, children, group = false }: FieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const labelContent = (
    <>
      <span>{label}</span>
      {optional && <span className="text-caption font-normal text-hint">Opcional</span>}
    </>
  )
  const labelClass = 'flex items-baseline justify-between gap-2 text-small font-medium text-ink'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {group ? (
        <span id={labelId} className={labelClass}>
          {labelContent}
        </span>
      ) : (
        <label id={labelId} htmlFor={id} className={labelClass}>
          {labelContent}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy }, { labelId, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
