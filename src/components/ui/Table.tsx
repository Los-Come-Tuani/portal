import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const MIN_WIDTH = 72
const MAX_WIDTH = 900
const STEP = 16

interface TableContextValue {
  startResize: (event: PointerEvent<HTMLElement>) => void
  nudge: (event: KeyboardEvent<HTMLElement>) => void
  reset: () => void
  widthOf: (element: HTMLElement) => number | undefined
}

const TableContext = createContext<TableContextValue | null>(null)

const storageKey = (id: string) => `kplan.portal.table.${id}`

function readWidths(id: string | undefined): number[] | null {
  if (!id) return null
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(id)) ?? 'null') as unknown
    return Array.isArray(stored) && stored.every((value) => typeof value === 'number') ? stored : null
  } catch {
    return null
  }
}

function writeWidths(id: string | undefined, widths: number[] | null) {
  if (!id) return
  try {
    if (widths) localStorage.setItem(storageKey(id), JSON.stringify(widths.map(Math.round)))
    else localStorage.removeItem(storageKey(id))
  } catch {
    // Sin espacio: el ancho se olvida al recargar.
  }
}

const cellIndexOf = (element: HTMLElement) => (element.closest('th') as HTMLTableCellElement | null)?.cellIndex ?? -1

interface TableProps {
  children: ReactNode
  caption?: string
  /** Para recordar los anchos de columna en este navegador. Una tabla con otras columnas necesita otro id. */
  id?: string
  className?: string
  /** `none`: la tabla crece con su contenido, sin desplazarse por dentro. */
  maxHeight?: 'screen' | 'none'
  resizable?: boolean
}

/**
 * Tabla dentro de su marco: en pantallas grandes se desplaza por dentro hasta el
 * borde de la ventana con el encabezado fijo, y cada columna se ensancha
 * arrastrando su borde (o con las flechas).
 */
export function Table({ children, caption, id, className, maxHeight = 'screen', resizable = true }: TableProps) {
  const tableRef = useRef<HTMLTableElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const [stored, setStored] = useState(() => ({ id, widths: readWidths(id) }))
  if (stored.id !== id) setStored({ id, widths: readWidths(id) })
  const [columns, setColumns] = useState(0)
  const [top, setTop] = useState(0)
  const [more, setMore] = useState(false)

  const widths = stored.widths?.length === columns ? stored.widths : null
  const widthsRef = useRef(widths)

  useLayoutEffect(() => {
    setColumns(tableRef.current?.tHead?.rows[0]?.cells.length ?? 0)
  }, [children])

  useEffect(() => {
    widthsRef.current = widths
  }, [widths])

  useEffect(() => {
    const region = regionRef.current
    if (!region) return
    const measure = () => {
      setTop(Math.round(region.getBoundingClientRect().top + window.scrollY))
      setMore(region.scrollLeft + region.clientWidth < region.scrollWidth - 4)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    observer.observe(region)
    region.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      region.removeEventListener('scroll', measure)
    }
  }, [])

  const measure = () => [...(tableRef.current?.tHead?.rows[0]?.cells ?? [])].map((cell) => cell.getBoundingClientRect().width)

  const setColumn = (index: number, width: number, base: number[]) => {
    const next = [...base]
    next[index] = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
    setStored({ id, widths: next })
    return next
  }

  const context: TableContextValue = {
    startResize: (event) => {
      const index = cellIndexOf(event.currentTarget)
      if (index < 0 || !event.isPrimary || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const handle = event.currentTarget
      const base = widthsRef.current ?? measure()
      const startX = event.clientX
      const startWidth = base[index]
      let latest = base
      const onMove = (move: globalThis.PointerEvent) => {
        latest = setColumn(index, startWidth + move.clientX - startX, base)
      }
      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('lostpointercapture', onEnd)
        document.body.style.removeProperty('cursor')
        document.body.style.removeProperty('user-select')
        writeWidths(id, latest)
      }
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('lostpointercapture', onEnd)
    },
    nudge: (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        context.reset()
        return
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const index = cellIndexOf(event.currentTarget)
      const base = widthsRef.current ?? measure()
      writeWidths(id, setColumn(index, base[index] + (event.key === 'ArrowRight' ? STEP : -STEP), base))
    },
    reset: () => {
      setStored({ id, widths: null })
      writeWidths(id, null)
    },
    widthOf: (element) => {
      const index = cellIndexOf(element)
      return index >= 0 ? widthsRef.current?.[index] : undefined
    },
  }

  const total = widths?.reduce((sum, width) => sum + width, 0) ?? 0

  return (
    <div className={cn('relative rounded-kp border border-divider bg-surface', className)}>
      <div
        ref={regionRef}
        role="region"
        aria-label={caption}
        tabIndex={0}
        style={{ '--table-top': `${top}px` } as CSSProperties}
        className={cn(
          'overflow-auto rounded-kp focus-visible:outline-offset-0',
          maxHeight === 'screen' && 'lg:max-h-[max(22rem,calc(100dvh-var(--table-top)-2.5rem))]',
        )}
      >
        <TableContext.Provider value={resizable ? context : null}>
          <table
            ref={tableRef}
            style={widths ? { tableLayout: 'fixed', width: `max(100%, ${total}px)` } : undefined}
            className="w-full border-separate border-spacing-0 text-left text-body"
          >
            {caption && <caption className="sr-only">{caption}</caption>}
            {widths && (
              <colgroup>
                {widths.map((width, index) => (
                  <col key={index} style={index === widths.length - 1 ? undefined : { width }} />
                ))}
              </colgroup>
            )}
            {children}
          </table>
        </TableContext.Provider>
      </div>
      {more && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-px right-px w-12 rounded-r-kp bg-linear-to-l from-surface to-transparent"
        />
      )}
    </div>
  )
}

export function Th({
  className,
  align = 'left',
  children,
  resizable = true,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center'; resizable?: boolean }) {
  const table = useContext(TableContext)
  const labelId = useId()
  const [width, setWidth] = useState<number>()
  const withHandle = table && resizable
  const name = typeof children === 'string' ? children.toLowerCase() : 'la columna'
  return (
    <th
      scope="col"
      aria-labelledby={withHandle ? labelId : undefined}
      className={cn(
        'sticky top-0 z-10 overflow-hidden border-b border-divider bg-surface px-4 py-2.5 text-caption font-semibold tracking-label text-ellipsis whitespace-nowrap text-muted uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {withHandle ? <span id={labelId}>{children}</span> : children}
      {withHandle && (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Ancho de ${name}`}
          aria-valuenow={width === undefined ? undefined : Math.round(width)}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          title="Arrastra o usa las flechas para cambiar el ancho · doble clic o Enter restablece la tabla"
          onPointerDown={table.startResize}
          onKeyDown={(event) => {
            table.nudge(event)
            setWidth(table.widthOf(event.currentTarget))
          }}
          onFocus={(event) => setWidth(table.widthOf(event.currentTarget) ?? event.currentTarget.parentElement?.getBoundingClientRect().width)}
          onDoubleClick={table.reset}
          onClick={(event) => event.stopPropagation()}
          className="group/handle absolute top-0 right-0 flex h-full w-3 cursor-col-resize touch-none justify-end focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="my-2 mr-1 w-0.5 rounded-full bg-divider transition-colors duration-150 group-hover/handle:bg-ink/40 group-focus-visible/handle:bg-ink"
          />
        </span>
      )}
    </th>
  )
}

export function Td({ className, align = 'left', ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'overflow-hidden border-b border-divider px-4 py-3 align-middle text-ellipsis',
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
      className={cn('transition-colors duration-150 last:[&>td]:border-b-0', interactive && 'cursor-pointer hover:bg-canvas', className)}
      {...props}
    />
  )
}
