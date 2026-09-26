import {
  BACKGROUND_CHECK_INFO,
  CHECK_STATUS_LABELS,
  DOCUMENT_TYPE_INFO,
  requiredChecks,
  requiredDocuments,
  type GuideApplication,
  type VerificationStage,
} from '@/data/models'
import { minutesBetween, type LocalDateTime } from '@/lib/dates'

/** Las pestañas de la cola: las tres etapas y los estados que salen de ellas. */
export type QueueTab = VerificationStage | 'changes_requested' | 'approved' | 'rejected'

export const QUEUE_TABS: { value: QueueTab; label: string }[] = [
  { value: 'documents', label: 'Documentos' },
  { value: 'background', label: 'Antecedentes' },
  { value: 'decision', label: 'Decisión' },
  { value: 'changes_requested', label: 'Corrección pedida' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
]

export function queueTab(application: GuideApplication): QueueTab {
  return application.status === 'in_review' ? application.stage : application.status
}

/** Más de esto en una etapa ya es un retraso para quien espera. */
export const STAGE_LIMIT_MINUTES = 3 * 1440

export function waitingMinutes(application: GuideApplication, now: LocalDateTime): number {
  return Math.max(0, minutesBetween(application.stageSince, now))
}

export type Segment = { key: string; label: string; state: 'done' | 'pending' | 'problem' | 'missing' }

/** Un tramo por documento (o por verificación): así se ve de un vistazo qué falta. */
export function reviewSegments(application: GuideApplication): Segment[] {
  if (application.stage === 'documents') {
    const byType = new Map(application.documents.map((document) => [document.type, document]))
    return requiredDocuments(application).map((type) => {
      const document = byType.get(type)
      const label = DOCUMENT_TYPE_INFO[type].label
      if (!document) return { key: type, label: `${label}: no lo subió`, state: 'missing' }
      if (document.status === 'accepted') return { key: type, label: `${label}: aceptado`, state: 'done' }
      if (document.status === 'rejected') return { key: type, label: `${label}: rechazado`, state: 'problem' }
      return { key: type, label: `${label}: por revisar`, state: 'pending' }
    })
  }
  const byType = new Map(application.background.map((check) => [check.type, check]))
  return requiredChecks(application).map((type) => {
    const status = byType.get(type)?.status ?? 'pending'
    return {
      key: type,
      label: `${BACKGROUND_CHECK_INFO[type].label}: ${CHECK_STATUS_LABELS[status].toLowerCase()}`,
      state: status === 'clear' ? 'done' : status === 'flagged' ? 'problem' : 'pending',
    }
  })
}
