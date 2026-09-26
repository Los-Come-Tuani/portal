import { cn } from '@/lib/cn'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const SIZES = {
  xs: 'size-6 text-caption',
  sm: 'size-7 text-caption',
  md: 'size-9 text-small',
  lg: 'size-14 text-lead',
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-canvas',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
