import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex min-w-0 flex-wrap items-start justify-between gap-x-8 gap-y-4 border-b border-divider pb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-headline font-bold tracking-tight text-ink break-words">{title}</h1>
        {description && <p className="mt-2 max-w-[68ch] text-body text-muted">{description}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
