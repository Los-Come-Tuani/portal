import { Button } from './Button'

interface PagerProps {
  page: { current: number; pages: number; elements: number; hasNext: boolean; hasPrevious: boolean }
  onChange: (page: number) => void
  /** Cómo se llaman los elementos: `{ one: 'pago', many: 'pagos' }`. */
  noun: { one: string; many: string }
}

/** Anterior y siguiente para una lista paginada del API; no se muestra si cabe en una página. */
export function Pager({ page, onChange, noun }: PagerProps) {
  if (page.pages <= 1) return null
  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-4 text-small text-muted">
      <span>
        Página {page.current} de {page.pages} · {page.elements} {page.elements === 1 ? noun.one : noun.many}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={!page.hasPrevious} onClick={() => onChange(page.current - 1)}>
          Anterior
        </Button>
        <Button size="sm" variant="secondary" disabled={!page.hasNext} onClick={() => onChange(page.current + 1)}>
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
