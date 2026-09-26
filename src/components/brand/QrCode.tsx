import { useMemo, type Ref } from 'react'
import { qrPath } from '@/lib/qr'
import { cn } from '@/lib/cn'

interface QrCodeProps {
  value: string
  className?: string
  title?: string
  ref?: Ref<SVGSVGElement>
}

/** QR vectorial en currentColor: toma el color de la tinta del tema. */
export function QrCode({ value, className, title, ref }: QrCodeProps) {
  const { size, d } = useMemo(() => qrPath(value), [value])
  const quiet = 2
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? `Código QR: ${value}`}
      className={cn('block', className)}
    >
      <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} className="fill-white" />
      <path d={d} fill="currentColor" />
    </svg>
  )
}
