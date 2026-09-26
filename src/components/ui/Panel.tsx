import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  as?: 'section' | 'div' | 'aside'
}

/** Superficie blanca con borde arena, como las tarjetas de la app. */
export function Panel({ title, description, actions, children, className, bodyClassName, as: Tag = 'section' }: PanelProps) {
  return (
    <Tag className={cn('rounded-kp border border-divider bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-title font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Tag>
  )
}
