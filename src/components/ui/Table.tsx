import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Table({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-body">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

export function Th({ className, align = 'left', ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-divider bg-surface px-4 py-2.5 text-caption font-semibold tracking-label whitespace-nowrap text-muted uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, align = 'left', ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'border-b border-divider px-4 py-3 align-middle',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

export function Tr({ className, interactive, ...props }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn('transition-colors duration-150', interactive && 'cursor-pointer hover:bg-canvas', className)}
      {...props}
    />
  )
}
