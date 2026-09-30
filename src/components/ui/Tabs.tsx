import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  items: readonly TabItem<T>[]
  label: string
  className?: string
}

/** Pestañas con flechas del teclado; el contenido lo pinta quien las usa. */
export function Tabs<T extends string>({ value, onChange, items, label, className }: TabsProps<T>) {
  const id = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = (index: number) => {
    const next = items[(index + items.length) % items.length]
    onChange(next.value)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn('flex min-w-0 max-w-full gap-1 overflow-x-auto border-b border-divider', className)}
    >
      {items.map((item, index) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            id={`${id}-${item.value}`}
            data-value={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') focusTab(index + 1)
              if (event.key === 'ArrowLeft') focusTab(index - 1)
            }}
            className={cn(
              'relative -mb-px flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-body font-medium whitespace-nowrap transition-colors duration-150 focus-visible:-outline-offset-4',
              selected ? 'border-action text-action' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-sm px-1.5 text-caption tabular-nums',
                  selected ? 'bg-action text-on-action' : 'bg-paper text-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
