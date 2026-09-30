import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: es lo único que lee un lector de pantalla. */
  label: string
  icon: ReactNode
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
}

export function IconButton({ label, icon, size = 'md', tone = 'default', className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-kp transition-colors duration-150 [&>.lucide]:size-5 [&>.lucide]:stroke-2',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger' ? 'text-danger hover:bg-danger/8' : 'text-ink hover:bg-ink/6',
        size === 'sm' ? 'size-11' : 'size-12',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
