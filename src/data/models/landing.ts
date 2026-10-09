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

export type DemoStatus = 'new' | 'contacted' | 'scheduled' | 'done' | 'dismissed'

export const DEMO_STATUSES: readonly DemoStatus[] = ['new', 'contacted', 'scheduled', 'done', 'dismissed']

export const DEMO_STATUS_LABELS: Record<DemoStatus, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  scheduled: 'Demo agendada',
  done: 'Demo realizada',
  dismissed: 'Descartada',
}

/** Alguien que vio la landing pide que le muestren K'Plan. No tiene cuenta: el equipo lo contacta. */
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

/** Qué instalador lleva cada plataforma: el tipo va dentro de la firma de la subida. */
export const INSTALLERS: Record<ReleasePlatform, { label: string; extension: string; contentType: string; format: string }> = {
  android: { label: 'Android', extension: '.apk', contentType: 'application/vnd.android.package-archive', format: 'APK' },
  macos: { label: 'macOS', extension: '.dmg', contentType: 'application/x-apple-diskimage', format: 'DMG' },
  windows: { label: 'Windows', extension: '.exe', contentType: 'application/vnd.microsoft.portable-executable', format: 'EXE' },
}

export const INSTALLER_MAX_BYTES = 500 * 1024 * 1024

export type ReleaseStatus = 'draft' | 'published' | 'withdrawn'

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  withdrawn: 'Retirada',
}

/** `1.2.0`, `1.2.0-beta.1` o `1.2.0+14`, como lo pide el API. */
export const VERSION_PATTERN = /^\d+(\.\d+){1,3}([-+][0-9A-Za-z.-]+)?$/

/** Un instalador de la app. La vigente de cada plataforma es la publicada más reciente. */
export interface AppRelease {
  id: string
  platform: ReleasePlatform
  version: string
  notes: string
  status: ReleaseStatus
  /** La que hoy se descarga desde la landing para su plataforma. */
  current: boolean
  fileName: string
  size: number
  downloads: number
  createdAt: LocalDateTime
  createdBy: string
  publishedAt: LocalDateTime | null
  withdrawnAt: LocalDateTime | null
}

export interface AppReleaseInput {
  platform: ReleasePlatform
  version: string
  notes: string
  file: File
}
