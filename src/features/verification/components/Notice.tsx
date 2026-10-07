import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const NOTICE_TONES = {
  neutral: { box: 'border-ink/15 bg-surface', title: 'text-ink' },
  confirmed: { box: 'border-confirmed/30 bg-confirmed/5', title: 'text-confirmed' },
  danger: { box: 'border-danger/25 bg-danger/5', title: 'text-danger' },
}

/** Un aviso sobre el estado de la solicitud: esperando corrección, aprobada o rechazada. */
export function Notice({ tone, title, children }: { tone: keyof typeof NOTICE_TONES; title: string; children?: ReactNode }) {
  return (
    <div role="status" className={cn('rounded-kp border px-5 py-4', NOTICE_TONES[tone].box)}>
      <p className={cn('text-body font-semibold', NOTICE_TONES[tone].title)}>{title}</p>
      {children && <div className="mt-1 max-w-[76ch] text-body text-ink">{children}</div>}
    </div>
  )
}
