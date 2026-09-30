import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action text-on-action hover:bg-action-hover',
  secondary: 'border border-field-outline bg-surface text-ink hover:border-ink hover:bg-canvas',
  danger: 'bg-danger text-white hover:bg-danger/90',
  ghost: 'text-ink hover:bg-ink/6',
  quiet: 'text-danger hover:bg-danger/8',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 py-2 text-small',
  md: 'min-h-12 px-4 py-2.5 text-body',
  lg: 'min-h-13 px-6 py-3 text-lead',
}

/** Acción accesible: radio de producto y capitalización del texto original. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex min-w-11 max-w-full shrink-0 items-center justify-center gap-2 rounded-kp text-center leading-snug font-semibold select-none [&>.lucide]:size-5 [&>.lucide]:shrink-0 [&>.lucide]:stroke-2',
    'transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  )
}

/** Borde funcional de contraste y foco separado del control. */
export const fieldClasses = cn(
  'w-full min-w-0 rounded-kp border border-field-outline bg-field px-3.5 text-lead text-ink sm:text-body',
  'transition-[border-color,box-shadow] duration-150 hover:border-ink/40',
  'focus:border-action focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-5',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger',
  'disabled:cursor-not-allowed disabled:opacity-60',
)
