import {
  ADMISSION_STAGE_LABELS,
  ADMISSION_STAGES,
  admissionRequirements,
  ORGANIZATION_DOCUMENT_INFO,
  type AdmissionStage,
  type OrganizationApplication,
} from '@/data/models'
import type { Segment } from '@/features/verification/components/ReviewSegments'
import type { StageStep } from '@/features/verification/components/StageTrack'
import { stepState } from '@/features/verification/status'

export type AdmissionTab = AdmissionStage | 'changes_requested' | 'approved' | 'rejected'

export const ADMISSION_TABS: { value: AdmissionTab; label: string }[] = [
  { value: 'documents', label: 'Documentos' },
  { value: 'decision', label: 'Decisión' },
  { value: 'changes_requested', label: 'Corrección pedida' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

export function admissionTab(application: OrganizationApplication): AdmissionTab {
  return application.status === 'in_review' ? application.stage : application.status
}

/** Un tramo por documento que pide (o que subió aunque sea opcional). */
export function admissionSegments(application: OrganizationApplication): Segment[] {
  const byType = new Map(application.documents.map((document) => [document.type, document]))
  return admissionRequirements(application.type)
    .filter((item) => item.required || byType.has(item.type))
    .map(({ type }) => {
      const document = byType.get(type)
      const label = ORGANIZATION_DOCUMENT_INFO[type].label
      if (!document) return { key: type, label: `${label}: no lo subió`, state: 'missing' }
      if (document.status === 'accepted') return { key: type, label: `${label}: aceptado`, state: 'done' }
      if (document.status === 'rejected') return { key: type, label: `${label}: rechazado`, state: 'problem' }
      return { key: type, label: `${label}: por revisar`, state: 'pending' }
    })
}

export function admissionSteps(application: OrganizationApplication): StageStep[] {
  const current = ADMISSION_STAGES.indexOf(application.stage)
  const segments = admissionSegments(application)
  const accepted = segments.filter((segment) => segment.state === 'done').length
  return ADMISSION_STAGES.map((stage, index) => {
    const state = stepState(index, current, application.status)
    const detail =
      stage === 'documents'
        ? `${accepted} de ${segments.length} aceptados`
        : application.status === 'approved'
          ? 'Aprobada'
          : application.status === 'rejected'
            ? 'Rechazada'
            : state === 'current'
              ? 'Falta aprobar o rechazar'
              : 'Al final'
    return { key: stage, label: ADMISSION_STAGE_LABELS[stage], detail, state }
  })
}
