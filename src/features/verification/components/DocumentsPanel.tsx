import { ArrowRight, FileText, IdCard } from 'lucide-react'
import { Button, Panel, Tag } from '@/components/ui'
import { DOCUMENT_STATUS_LABELS, type DocumentTypeInfo, type ReviewDocument } from '@/data/models'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { DOCUMENT_STATUS_TONES } from '../status'

export interface DocumentRequirement {
  type: string
  info: DocumentTypeInfo
  /** Los opcionales sólo aparecen si los subieron. */
  required: boolean
}

interface DocumentsPanelProps {
  requirements: DocumentRequirement[]
  documents: readonly ReviewDocument[]
  canReview: boolean
  onOpen: (documentId: string) => void
}

export function DocumentsPanel({ requirements, documents, canReview, onOpen }: DocumentsPanelProps) {
  const { today } = useNow()
  const byType = new Map(documents.map((document) => [document.type, document]))
  const shown = requirements.filter((requirement) => requirement.required || byType.has(requirement.type))
  const accepted = documents.filter((document) => document.status === 'accepted').length
  const firstPending = documents.find((document) => document.status === 'pending')

  return (
    <Panel
      title="Documentos"
      description={`${accepted} de ${shown.length} aceptados. Cada uno se acepta sólo con todo lo de su lista revisado.`}
      actions={
        canReview &&
        firstPending && (
          <Button size="sm" variant="secondary" icon={<ArrowRight size={15} />} onClick={() => onOpen(firstPending.id)}>
            Revisar pendientes
          </Button>
        )
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-divider">
        {shown.map(({ type, info, required }) => {
          const document = byType.get(type)
          const Icon = info.format === 'card' ? IdCard : FileText
          if (!document) {
            return (
              <li key={type} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-kp border border-dashed border-danger/50 text-danger">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{info.label}</span>
                  <span className="block text-small text-danger">No lo subió · obligatorio para {info.requiredFor.toLowerCase()}</span>
                </span>
              </li>
            )
          }
          const expired = !!document.expiresOn && document.expiresOn < today
          const actionable = canReview && document.status === 'pending'
          return (
            <li key={type}>
              <button
                type="button"
                onClick={() => onOpen(document.id)}
                className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-canvas"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-kp bg-paper text-ink">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-body font-semibold text-ink">
                    {info.label}
                    {!required && <span className="text-caption font-normal text-hint">Opcional</span>}
                  </span>
                  <span className="block truncate text-small text-muted">
                    {document.fileName}
                    {document.expiresOn && (
                      <>
                        {' · '}
                        <span className={cn(expired && 'font-semibold text-danger')}>
                          {expired ? 'venció' : 'vence'} el {formatDate(document.expiresOn)}
                        </span>
                      </>
                    )}
                  </span>
                  {document.status === 'rejected' && document.note && (
                    <span className="mt-1 block text-small text-danger">{document.note}</span>
                  )}
                </span>
                <Tag tone={DOCUMENT_STATUS_TONES[document.status]}>{DOCUMENT_STATUS_LABELS[document.status]}</Tag>
                <span
                  className={cn(
                    'hidden w-16 shrink-0 text-right text-small font-semibold sm:block',
                    actionable ? 'text-brand-strong' : 'text-muted group-hover:text-ink',
                  )}
                >
                  {actionable ? 'Revisar' : 'Ver'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
