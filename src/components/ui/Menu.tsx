import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface MenuProps {
  /** Recibe las props del botón que abre el menú. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-controls': string; 'aria-haspopup': 'menu' }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
  className?: string
}

export function Menu({ trigger, children, align = 'end', side = 'bottom', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger({ onClick: () => setOpen((value) => !value), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'menu' })}
      {open && (
        <div
          id={id}
          role="menu"
          className={cn(
            'absolute z-40 min-w-56 animate-rise rounded-kp border border-divider bg-surface p-1.5 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
            side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onSelect,
  tone = 'default',
}: {
  icon?: ReactNode
  children: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-body transition-colors duration-150 focus-visible:outline-offset-0',
        tone === 'danger' ? 'text-danger hover:bg-danger/8' : 'text-ink hover:bg-canvas',
      )}
    >
      {icon && <span className="text-muted" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}
