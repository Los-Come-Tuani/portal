/** Lo que ofrece un guía de la app; igual que `role` en mobile/assets/mock/guides.json. */
export type GuideServiceRole = 'guide' | 'translator' | 'both'

export const SERVICE_ROLE_LABELS: Record<GuideServiceRole, string> = {
  guide: 'Guía',
  translator: 'Traductor',
  both: 'Guía y traductor',
}
