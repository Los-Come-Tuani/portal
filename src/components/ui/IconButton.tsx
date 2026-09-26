import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: es lo único que lee un lector de pantalla. */
  label: string
  icon: ReactNode
  size?: 'sm' | 'md'
}

export function IconButton({ label, icon, size = 'md', className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-kp text-ink transition-colors duration-150',
        'hover:bg-ink/6 disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
