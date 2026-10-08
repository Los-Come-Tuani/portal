import type { TagTone } from '@/components/ui'
import {
  ACCOUNT_STATUS_LABELS,
  PROVIDER_STATUS_LABELS,
  SERVICE_ROLE_LABELS,
  USER_STATUS_LABELS,
  type Account,
  type AccountStatus,
  type UserStatus,
} from '@/data/models'

export const USER_STATUS_TONES: Record<UserStatus, TagTone> = {
  active: 'confirmed',
  suspended: 'danger',
  invited: 'planned',
}

export const ACCOUNT_STATUS_TONES: Record<Account['status'], TagTone> = {
  active: 'confirmed',
  invited: 'planned',
  pending: 'planned',
  suspended: 'danger',
  closing: 'neutral',
  expelled: 'danger',
}

export function accountStatusLabel(status: Account['status']): string {
  return status === 'invited' ? USER_STATUS_LABELS.invited : ACCOUNT_STATUS_LABELS[status as AccountStatus]
}

/** "Guía y traductor", "Negocio", "Equipo K'Plan"… */
export function accountKind(account: Account): string {
  switch (account.role) {
    case 'admin':
      return account.superuser ? 'Superusuario' : "Equipo K'Plan"
    case 'negocio':
      return 'Negocio'
    case 'alcaldia':
      return account.organization?.kind === 'institution' ? 'Institución cultural' : 'Alcaldía'
    case 'guia': {
      const service = account.serviceRole ? SERVICE_ROLE_LABELS[account.serviceRole] : 'Guía o traductor'
      return account.provider && account.provider.status !== 'active' ? `${service} · ${PROVIDER_STATUS_LABELS[account.provider.status].toLowerCase()}` : service
    }
    case 'turista':
      return 'Turista'
    case null:
      return 'Sin rol'
  }
}

export function usesApp(account: Account): boolean {
  return account.role === 'turista' || account.role === 'guia'
}

/** Qué pasa si se suspende, según quién es. */
export function suspendEffect(account: Account): string {
  switch (account.role) {
    case 'turista':
      return 'No podrá entrar a la app. Sus insignias y cupones se guardan por si la reactivas.'
    case 'guia':
      return 'No podrá entrar a la app y deja de aparecer para los turistas.'
    case 'negocio':
    case 'alcaldia':
      return 'No podrá entrar al portal. Su organización y sus lugares siguen igual.'
    case 'admin':
      return 'Pierde el acceso al portal de inmediato.'
    case null:
      return 'No podrá entrar a K\'Plan hasta que la reactives.'
  }
}
