import type { LocalDateTime } from './common'

// ── Solicitudes de demo (F9, docs/landing.md) ─────────────────────────────

export type DemoKind = 'business' | 'municipality' | 'institution' | 'tour_operator' | 'other'

export const DEMO_KIND_LABELS: Record<DemoKind, string> = {
  business: 'Comercio',
  municipality: 'Alcaldía',
  institution: 'Institución cultural',
  tour_operator: 'Operador turístico',
  other: 'Otro',
}

/** Entregada: recibió los links de la app, al enviarla o porque el equipo se los hizo llegar. */
export type DemoStatus = 'pending' | 'delivered'

export const DEMO_STATUSES: readonly DemoStatus[] = ['pending', 'delivered']

export const DEMO_STATUS_LABELS: Record<DemoStatus, string> = {
  pending: 'Pendiente',
  delivered: 'Entregada',
}

/**
 * Alguien que vio la landing pide que le muestren K'Plan. No tiene cuenta. Si al enviarla había
 * una versión publicada, recibió los links ahí mismo; si no, el equipo se los hace llegar.
 */
export interface DemoRequest {
  id: string
  name: string
  email: string
  phone: string
  organization: string
  kind: DemoKind
  city: string
  message: string
  status: DemoStatus
  deliveredAt: LocalDateTime | null
  /** Lo que anota el equipo al atenderla; quien la pidió no lo ve. */
  notes: string
  createdAt: LocalDateTime
  updatedAt: LocalDateTime | null
  /** Quién la movió por última vez. */
  updatedBy: string | null
}

export interface DemoRequestChange {
  status?: DemoStatus
  notes?: string
}

// ── Versiones de la app ───────────────────────────────────────────────────

export type ReleasePlatform = 'android' | 'macos' | 'windows'

export const RELEASE_PLATFORMS: readonly ReleasePlatform[] = ['android', 'macos', 'windows']

/** Qué instalador lleva cada plataforma. */
export const INSTALLERS: Record<ReleasePlatform, { label: string; format: string }> = {
  android: { label: 'Android', format: 'APK' },
  macos: { label: 'macOS', format: 'DMG' },
  windows: { label: 'Windows', format: 'EXE' },
}

export type ReleaseStatus = 'draft' | 'published' | 'withdrawn'

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  withdrawn: 'Retirada',
}

/** `1.2.0`, `1.2.0-beta.1` o `1.2.0+14`, como lo pide el API. */
export const VERSION_PATTERN = /^\d+(\.\d+){1,3}([-+][0-9A-Za-z.-]+)?$/

/** El link compartido (de Drive) donde está el instalador: el API sólo acepta `https`. */
export const LINK_PATTERN = /^https:\/\/\S+$/

/**
 * Una versión de la app con el link de su instalador. La vigente de cada plataforma es la
 * publicada más reciente, y su link es el que recibe quien pide una demo.
 */
export interface AppRelease {
  id: string
  platform: ReleasePlatform
  version: string
  notes: string
  link: string
  status: ReleaseStatus
  /** La que hoy se entrega con el formulario de la landing para su plataforma. */
  current: boolean
  /** Cuántas solicitudes de demo recibieron este link. */
  deliveries: number
  createdAt: LocalDateTime
  createdBy: string
  publishedAt: LocalDateTime | null
  withdrawnAt: LocalDateTime | null
}

export interface AppReleaseInput {
  platform: ReleasePlatform
  version: string
  notes: string
  link: string
}

/** Lo que se corrige: las notas y el link siempre; la versión, sólo en un borrador. */
export interface AppReleaseChange {
  version?: string
  notes?: string
  link?: string
}
