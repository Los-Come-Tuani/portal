import { ExternalLink, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton, SegmentedControl } from '@/components/ui'
import type { DocumentPage } from '@/data/models'
import { cn } from '@/lib/cn'

/** `null`: el documento entero cabe en el visor. */
const ZOOMS = [null, 1.5, 2.5] as const

/** Abre el archivo en otra pestaña. Los navegadores no abren `data:` directo: se pasa por un blob. */
async function openOriginal(url: string) {
  if (!url.startsWith('data:')) {
    window.open(url, '_blank', 'noopener')
    return
  }
  const blob = await (await fetch(url)).blob()
  window.open(URL.createObjectURL(blob), '_blank', 'noopener')
}

/**
 * El archivo que subió el guía, con sus caras o páginas. Se abre ajustado a
 * una altura fija para que la lista de revisión quede a la vista.
 */
export function DocumentViewer({ pages, fileName, title }: { pages: DocumentPage[]; fileName: string; title: string }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [zoom, setZoom] = useState(0)
  const page = pages[Math.min(pageIndex, pages.length - 1)]
  const scale = ZOOMS[zoom]
  const demo = !!page?.url.startsWith('data:')
  const maxed = zoom === ZOOMS.length - 1

  if (!page) {
    return <p className="rounded-kp bg-paper px-4 py-10 text-center text-body text-muted">No se pudo cargar el archivo.</p>
  }

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {pages.length > 1 ? (
          <SegmentedControl
            label="Cara del documento"
            size="sm"
            value={pageIndex}
            onChange={(value) => setPageIndex(value)}
            options={pages.map((item, index) => ({ value: index, label: item.label }))}
          />
        ) : (
          <span className="text-small text-muted">{page.label}</span>
        )}
        <div className="flex items-center gap-1">
          <IconButton size="sm" label="Alejar" icon={<ZoomOut size={16} />} disabled={zoom === 0} onClick={() => setZoom((value) => value - 1)} />
          <span className="w-14 text-center text-caption text-muted tabular-nums">{scale ? `${scale * 100} %` : 'Ajustado'}</span>
          <IconButton size="sm" label="Acercar" icon={<ZoomIn size={16} />} disabled={maxed} onClick={() => setZoom((value) => value + 1)} />
          <Button size="sm" variant="ghost" icon={<ExternalLink size={15} />} onClick={() => void openOriginal(page.url)}>
            Abrir original
          </Button>
        </div>
      </div>
      <div className="h-[34vh] min-h-52 overflow-auto rounded-kp border border-divider bg-paper p-3">
        <button
          type="button"
          onClick={() => setZoom((value) => (maxed ? 0 : value + 1))}
          aria-label={maxed ? 'Ver el documento completo' : 'Acercar el documento'}
          className={cn('mx-auto', scale ? 'block' : 'flex h-full items-center justify-center', maxed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
          style={scale ? { width: `${scale * 100}%` } : undefined}
        >
          <img
            src={page.url}
            alt={`${title}, ${page.label.toLowerCase()}`}
            className={cn('block rounded-sm shadow-raise', scale ? 'w-full' : 'max-h-full w-auto max-w-full')}
          />
        </button>
      </div>
      <figcaption className="text-caption text-muted">
        {fileName}
        {demo && ' · Escaneo de muestra generado para la demo'}
      </figcaption>
    </figure>
  )
}
