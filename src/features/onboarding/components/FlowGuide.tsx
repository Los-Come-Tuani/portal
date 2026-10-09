import type { OrganizationKind } from '@/data/models'
import { cn } from '@/lib/cn'

const NEEDS: Record<OrganizationKind | 'none', string[]> = {
  none: ['Un correo al que tengas acceso: ahí llega el código y los avisos.'],
  business: [
    'El RUC, la dirección y el teléfono del comercio.',
    'El horario de cada día de la semana.',
    'Una foto de tu platillo estrella (JPG, PNG o WebP, hasta 5 MB).',
    'Un correo al que tengas acceso: ahí llega el código y los avisos.',
  ],
  institution: [
    'El documento que acredita la existencia legal de la institución (PDF, JPG o PNG, hasta 10 MB).',
    'El correo y el teléfono de contacto de la institución.',
    'Un correo tuyo al que tengas acceso: ahí llega el código y los avisos.',
  ],
  municipality: [
    'El documento que acredita que representas a la alcaldía (PDF, JPG o PNG, hasta 10 MB).',
    'El correo y el teléfono de contacto de la alcaldía.',
    'Un correo tuyo al que tengas acceso: ahí llega el código y los avisos.',
  ],
}

const NEXT_STEPS = [
  'Entras al portal con tu correo y ves en qué va tu solicitud.',
  "El equipo de K'Plan la revisa y te avisa por correo.",
  'Si algo no cuadra, te dice qué corregir y la mandas de nuevo.',
  'Al aprobarte, tu organización queda visible para el turista.',
]

/** Qué hace falta para postularse y qué pasa después de enviar. */
export function FlowGuide({ kind, titled = true }: { kind: OrganizationKind | null; titled?: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-label={titled ? undefined : 'Lo que se necesita'}>
        {titled && <h2 className="text-body font-semibold text-ink">Lo que vas a necesitar</h2>}
        <ul className={cn('flex flex-col gap-2.5', titled && 'mt-3')}>
          {NEEDS[kind ?? 'none'].map((text) => (
            <li key={text} className="flex gap-2.5 text-small text-muted">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-body font-semibold text-ink">Qué pasa después</h2>
        <ol className="mt-3 flex flex-col gap-2 text-small text-muted">
          {NEXT_STEPS.map((text, index) => (
            <li key={text}>
              <span className="font-medium text-ink">{index + 1}.</span> {text}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
