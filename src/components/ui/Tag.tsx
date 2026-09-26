import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TagTone = 'neutral' | 'planned' | 'confirmed' | 'badge' | 'danger' | 'brand' | 'ink' | 'outline'

const TONES: Record<TagTone, string> = {
  neutral: 'bg-paper text-muted',
  planned: 'bg-planned/10 text-planned',
  confirmed: 'bg-confirmed/10 text-confirmed',
  badge: 'bg-badge text-ink',
  danger: 'bg-danger/10 text-danger',
  brand: 'bg-brand/12 text-brand-strong',
  ink: 'bg-ink text-canvas',
  outline: 'border border-outline text-muted',
}

interface TagProps {
  tone?: TagTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Tag({ tone = 'neutral', icon, children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-caption font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
