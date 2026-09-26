import type { TagTone } from '@/components/ui'
import { SERVICE_ROLE_LABELS, type User, type UserStatus } from '@/data/models'

export const USER_STATUS_TONES: Record<UserStatus, TagTone> = {
  active: 'confirmed',
  suspended: 'danger',
  invited: 'planned',
}

/** "Guía y traductor", "Negocio", "Equipo K'Plan"… */
export function userKind(user: User): string {
  if (user.role === 'guia') return user.serviceRole ? SERVICE_ROLE_LABELS[user.serviceRole] : 'Guía o traductor'
  return { admin: "Equipo K'Plan", negocio: 'Negocio', alcaldia: 'Alcaldía', turista: 'Turista' }[user.role]
}

export function usesApp(user: User): boolean {
  return user.role === 'turista' || user.role === 'guia'
}

/** Qué pasa si se suspende, según quién es. */
export const SUSPEND_EFFECT: Record<User['role'], string> = {
  turista: 'No podrá entrar a la app. Sus insignias y cupones se guardan por si la reactivas.',
  guia: 'No podrá entrar a la app y deja de aparecer para los turistas.',
  negocio: 'No podrá entrar al portal. Su organización y sus lugares siguen igual.',
  alcaldia: 'No podrá entrar al portal. Su organización y sus lugares siguen igual.',
  admin: 'Pierde el acceso al portal de inmediato.',
}
