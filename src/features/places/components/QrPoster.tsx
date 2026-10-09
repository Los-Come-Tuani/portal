import { Download, Medal, Printer } from 'lucide-react'
import { useRef } from 'react'
import { Logo } from '@/components/brand/Logo'
import { QrCode } from '@/components/brand/QrCode'
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { ApiError } from '@/data/api/errors'
import { usePlaceQr } from '@/data/hooks/use-places'
import type { Stop } from '@/data/models'
import { plural } from '@/lib/format'

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

interface QrPosterProps {
  stop: Stop
  /** El equipo con `places.manage` activa la insignia desde la cabecera del lugar. */
  managesPlaces: boolean
}

/** El QR de la insignia sale del API (`place/{id}/qr/`): sólo lo tiene un lugar que da insignia. */
export function QrPoster({ stop, managesPlaces }: QrPosterProps) {
  const qrRef = useRef<SVGSVGElement>(null)
  const qr = usePlaceQr(stop.id, stop.hasBadge)
  const missing = !stop.hasBadge || (qr.error instanceof ApiError && qr.error.status === 404)

  if (missing) {
    return (
      <EmptyState icon={<Medal size={20} />} title="Este lugar todavía no da insignia">
        {managesPlaces
          ? 'Enciende "Da insignia" arriba y aquí aparece su código QR para imprimirlo en el local.'
          : "La insignia de un lugar la activa el equipo de K'Plan. Cuando esté activa, aquí aparece su código QR para imprimirlo."}
      </EmptyState>
    )
  }
  if (qr.isError) return <ErrorState error={qr.error} onRetry={() => void qr.refetch()} />
  if (!qr.data) return <Skeleton className="h-[30rem] max-w-[26rem]" />

  const { payload, value } = qr.data

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="print-area w-full rounded-lg border border-divider bg-surface px-8 pt-8 pb-7 text-center shadow-raise">
        <Logo className="mx-auto h-11 text-ink" />
        <p className="mt-6 text-heading leading-tight font-bold text-ink">{stop.name}</p>
        <QrCode ref={qrRef} value={payload} title={`Código QR de ${stop.name}`} className="mx-auto mt-6 w-60 text-ink" />
        <p className="mt-6 text-title font-semibold text-ink">Escanéame con K'Plan</p>
        <p className="mt-1 text-body text-muted">y gana {value === 1 ? `una insignia de ${stop.category}` : `${value} insignias de ${stop.category}`}</p>
        <p className="mt-6 border-t border-divider pt-3 font-mono text-caption break-all text-hint">{payload}</p>
      </div>

      <div className="flex max-w-[52ch] flex-col gap-4">
        <h3 className="text-lead font-semibold text-ink">El código QR de tu insignia</h3>
        <p className="text-body text-muted">
          Imprímelo y ponlo donde el turista lo vea al llegar. Al escanearlo con la app estando a menos de 50 metros del lugar, gana{' '}
          {plural(value, 'insignia', 'insignias')}. Cada turista la gana una vez cada 24 horas en este lugar.
        </p>
        <p className="text-small text-muted">
          El código es único de este lugar. Si el equipo apaga la insignia, el QR impreso deja de dar insignias.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Printer size={16} />} onClick={() => window.print()}>
            Imprimir cartel
          </Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => qrRef.current && downloadSvg(qrRef.current, `qr-${stop.id}.svg`)}>
            Descargar QR
          </Button>
        </div>
      </div>
    </div>
  )
}
