import {
  BACKGROUND_CHECK_INFO,
  CHECK_STATUS_LABELS,
  checkProgress,
  DOCUMENT_TYPE_INFO,
  documentProgress,
  requiredChecks,
  requiredDocuments,
  STAGE_LABELS,
  VERIFICATION_STAGES,
  type GuideApplication,
  type VerificationStage,
} from '@/data/models'
import type { Segment } from '@/features/verification/components/ReviewSegments'
import type { StageStep } from '@/features/verification/components/StageTrack'
import { stepState } from '@/features/verification/status'

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

/** Documentos, antecedentes y decisión, con lo que lleva cada uno. */
export function guideSteps(application: GuideApplication): StageStep[] {
  const current = VERIFICATION_STAGES.indexOf(application.stage)
  return VERIFICATION_STAGES.map((stage, index) => {
    const state = stepState(index, current, application.status)
    let detail: string
    if (stage === 'documents') {
      const progress = documentProgress(application)
      const missing = progress.missing.length > 0 ? ` · faltan ${progress.missing.length}` : ''
      detail = state === 'upcoming' ? 'Sin empezar' : `${progress.accepted} de ${progress.required} aceptados${missing}`
    } else if (stage === 'background') {
      const progress = checkProgress(application)
      const flagged = progress.flagged > 0 ? ` · ${progress.flagged} con observaciones` : ''
      detail = state === 'upcoming' ? 'Después de los documentos' : `${progress.clear + progress.flagged} de ${progress.required} verificadas${flagged}`
    } else {
      detail =
        application.status === 'approved'
          ? 'Aprobado'
          : application.status === 'rejected'
            ? 'Rechazado'
            : state === 'current'
              ? 'Falta aprobar o rechazar'
              : 'Al final'
    }
    return { key: stage, label: STAGE_LABELS[stage], detail, state }
  })
}
