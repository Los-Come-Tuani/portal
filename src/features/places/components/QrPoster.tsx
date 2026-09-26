import { Download, Printer } from 'lucide-react'
import { useRef } from 'react'
import { Logo } from '@/components/brand/Logo'
import { QrCode } from '@/components/brand/QrCode'
import { Button } from '@/components/ui'
import type { Stop } from '@/data/models'
import { stopQrPayload } from '@/lib/qr'

/** El SVG descargado no ve las variables CSS del portal: se le escriben los colores ya resueltos. */
function downloadSvg(svg: SVGSVGElement, fileName: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const ink = getComputedStyle(svg).color
  clone.querySelector('path')?.setAttribute('fill', ink)
  clone.querySelector('rect')?.setAttribute('fill', getComputedStyle(svg.querySelector('rect')!).fill)
  clone.removeAttribute('class')
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function QrPoster({ stop }: { stop: Stop }) {
  const qrRef = useRef<SVGSVGElement>(null)
  const payload = stopQrPayload(stop.id)

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="print-area w-full rounded-lg border border-divider bg-surface px-8 pt-8 pb-7 text-center shadow-raise">
        <Logo className="mx-auto h-11 text-ink" />
        <p className="mt-6 text-heading leading-tight font-bold text-ink">{stop.name}</p>
        <QrCode ref={qrRef} value={payload} title={`Código QR de ${stop.name}`} className="mx-auto mt-6 w-60 text-ink" />
        <p className="mt-6 text-title font-semibold text-ink">Escanéame con K'Plan</p>
        <p className="mt-1 text-body text-muted">
          {stop.hasBadge ? `y gana una insignia de ${stop.category}` : 'y confirma tu visita'}
        </p>
        <p className="mt-6 border-t border-divider pt-3 font-mono text-caption text-hint">{payload}</p>
      </div>

      <div className="flex max-w-[52ch] flex-col gap-4">
        <h3 className="text-lead font-semibold text-ink">Tu código QR</h3>
        <p className="text-body text-muted">
          Imprímelo y ponlo donde el turista lo vea al llegar. Al escanearlo desde la ficha de tu lugar, la app confirma su
          visita{stop.hasBadge ? ' y le da la insignia' : ''}. Cada escaneo cuenta en tu agenda como una llegada real.
        </p>
        <p className="text-small text-muted">
          El código es fijo y sólo funciona en tu lugar: la app lo compara con el de la ficha antes de aceptarlo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Printer size={16} />} onClick={() => window.print()}>
            Imprimir cartel
          </Button>
          <Button
            variant="secondary"
            icon={<Download size={16} />}
            onClick={() => qrRef.current && downloadSvg(qrRef.current, `qr-${stop.id}.svg`)}
          >
            Descargar QR
          </Button>
        </div>
      </div>
    </div>
  )
}
