import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/data/api/errors'
import { Button } from './Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Un estado vacío que enseña qué hacer, no sólo "no hay nada". */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center rounded-panel border border-dashed border-outline bg-surface px-6 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-kp bg-brand/10 text-brand-strong" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-4 text-lead font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-[46ch] text-body text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex min-w-0 flex-col items-center rounded-panel border border-dashed border-outline bg-surface px-6 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger" aria-hidden="true">
        <CircleAlert size={22} />
      </span>
      <h3 className="mt-4 text-lead font-semibold text-ink">{errorMessage(error)}</h3>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-kp bg-placeholder', className)} />
}

/** Filas de relleno mientras carga una lista o una tabla. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  )
}
