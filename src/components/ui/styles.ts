import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand uppercase tracking-label hover:bg-brand-strong',
  secondary: 'border-[1.5px] border-ink text-ink uppercase tracking-label hover:bg-ink/6',
  danger: 'bg-danger text-white uppercase tracking-label hover:bg-danger/90',
  ghost: 'text-ink hover:bg-ink/6',
  quiet: 'text-danger hover:bg-danger/8',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-small',
  lg: 'h-12 px-6 text-body',
}

/** Botones como en la app: esquinas de 10 px, mayúsculas con tracking en las acciones. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-kp font-semibold select-none',
    'transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  )
}

/** Campos como en la app: relleno claro, borde arena, foco en tinta. */
export const fieldClasses = cn(
  'w-full rounded-kp border border-outline bg-field px-3 text-body text-ink',
  'transition-[border-color,box-shadow] duration-150 hover:border-ink/40',
  'focus:border-ink focus:shadow-[0_0_0_1px_var(--color-ink)] focus-visible:outline-none',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_1px_var(--color-danger)]',
  'disabled:cursor-not-allowed disabled:opacity-60',
)
