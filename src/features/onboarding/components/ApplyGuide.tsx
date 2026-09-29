import { admissionRequirements, ORGANIZATION_DOCUMENT_INFO, type OrganizationType } from '@/data/models'
import { cn } from '@/lib/cn'

const NEXT_STEPS = {
  public: [
    'Entras al portal con tu correo y ves en qué va tu solicitud.',
    'El equipo revisa cada documento. Si algo falta, te pide corregirlo.',
    'Al aprobarte, tu lugar aparece en la app y se activan cupones, eventos e insignias.',
  ],
  assisted: [
    'Le llega un correo para crear su contraseña y ver en qué va la solicitud.',
    'Alguien del equipo revisa cada documento, igual que en cualquier solicitud.',
    'Al aprobarla, su lugar aparece en la app y, si lo marcaste, se cobra el alta.',
  ],
}

/** Qué documentos se necesitan y qué pasa después de enviar. */
export function ApplyGuide({ type, titled = true, assisted = false }: { type: OrganizationType; titled?: boolean; assisted?: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-label={titled ? undefined : 'Lo que se necesita'}>
        {titled && <h2 className="text-body font-semibold text-ink">{assisted ? 'Lo que se necesita' : 'Lo que vas a necesitar'}</h2>}
        <ul className={cn('flex flex-col gap-2.5', titled && 'mt-3')}>
          {admissionRequirements(type).map((item) => {
            const info = ORGANIZATION_DOCUMENT_INFO[item.type]
            return (
              <li key={item.type} className="flex gap-2.5 text-small">
                <span aria-hidden="true" className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', item.required ? 'bg-ink' : 'border border-ink/40')} />
                <span>
                  <span className="font-medium text-ink">{info.label}</span>
                  <span className="block text-muted">{item.required ? info.issuer : `Opcional · ${info.requiredFor.toLowerCase()}`}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-body font-semibold text-ink">Qué pasa después</h2>
        <ol className="mt-3 flex flex-col gap-2 text-small text-muted">
          {NEXT_STEPS[assisted ? 'assisted' : 'public'].map((text, index) => (
            <li key={text}>
              <span className="font-medium text-ink">{index + 1}.</span> {text}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
