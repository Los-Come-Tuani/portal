import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { INSTALLERS, LINK_PATTERN, RELEASE_PLATFORMS, VERSION_PATTERN, type ReleasePlatform } from '../../models'
import { fail, MockHttpError, paginate, parseBody, requireUser, route } from '../http'
import { currentReleaseIds, wireDemoRequest, wireRelease, type MockRelease } from '../services/landing'

const platform = z.enum(RELEASE_PLATFORMS as [ReleasePlatform, ...ReleasePlatform[]])
const version = z.string().trim().max(32).regex(VERSION_PATTERN, 'Usa una versión como 1.2.0, 1.2.0-beta.1 o 1.2.0+14.')
const notes = z.string().max(4000)
const link = z.string().trim().max(500).regex(LINK_PATTERN, 'Pega el link compartido del instalador; tiene que empezar con https://.')

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function versionTaken(releases: readonly MockRelease[], release: Pick<MockRelease, 'platform' | 'version'>, but?: string) {
  const taken = releases.some((item) => item.platform === release.platform && item.version === release.version && item.id !== but)
  if (taken) {
    const message = `Ya existe la versión ${release.version} para ${INSTALLERS[release.platform].label}.`
    throw new MockHttpError(409, message, { version: message })
  }
}

function findRelease(releases: readonly MockRelease[], releaseId: string): MockRelease {
  const release = releases.find((item) => item.id === releaseId)
  if (!release) throw fail.notFound('No encontramos esa versión.')
  return release
}

/** Las solicitudes de demo y las versiones de la app, con las mismas rutas y reglas que el API. */
export const landingRoutes = [
  route(
    'GET',
    endpoints.demoRequest.list,
    ({ db, query }) => {
      const status = query.get('status')
      const search = fold(query.get('search')?.trim() ?? '')
      const shown = db.demoRequests
        .filter((request) => !status || request.status === status)
        .filter((request) => !search || [request.name, request.email, request.organization].some((value) => fold(value).includes(search)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(wireDemoRequest)
      return paginate(shown, query)
    },
    { permissions: ['demos.view', 'demos.manage'] },
  ),
  route(
    'PATCH',
    endpoints.demoRequest.detail(':id'),
    (context) => {
      const { db, params, body } = context
      const actor = requireUser(context)
      const request = db.demoRequests.find((item) => item.id === params.id)
      if (!request) throw fail.notFound('No encontramos esa solicitud de demo.')
      const input = parseBody(z.object({ status: z.enum(['pending', 'delivered']).optional(), notes: z.string().max(2000).optional() }), body)
      const changesStatus = input.status !== undefined && input.status !== request.status
      if (changesStatus || input.notes !== undefined) {
        if (changesStatus && input.status) {
          request.status = input.status
          request.deliveredAt = input.status === 'delivered' ? nowLocalDateTime() : null
        }
        if (input.notes !== undefined) request.notes = input.notes.trim()
        request.updatedAt = nowLocalDateTime()
        request.updatedBy = actor.name
      }
      return wireDemoRequest(request)
    },
    { permissions: ['demos.manage'] },
  ),

  route(
    'GET',
    endpoints.appRelease.list,
    ({ db, query }) => {
      const wanted = query.get('platform')
      const status = query.get('status')
      const current = currentReleaseIds(db)
      const shown = db.releases
        .filter((release) => !wanted || release.platform === wanted)
        .filter((release) => !status || release.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((release) => wireRelease(release, current))
      return paginate(shown, query)
    },
    { permissions: ['releases.view', 'releases.manage'] },
  ),
  route(
    'POST',
    endpoints.appRelease.list,
    (context) => {
      const { db, body } = context
      const actor = requireUser(context)
      const input = parseBody(z.object({ platform, version, notes: notes.default(''), link }), body)
      versionTaken(db.releases, input)
      const release: MockRelease = {
        id: `version-${crypto.randomUUID()}`,
        platform: input.platform,
        version: input.version,
        notes: input.notes.trim(),
        link: input.link,
        status: 'draft',
        deliveries: 0,
        createdAt: nowLocalDateTime(),
        createdBy: actor.name,
        publishedAt: null,
        withdrawnAt: null,
      }
      db.releases.push(release)
      return wireRelease(release, currentReleaseIds(db))
    },
    { permissions: ['releases.manage'] },
  ),
  route(
    'PATCH',
    endpoints.appRelease.detail(':id'),
    ({ db, params, body }) => {
      const release = findRelease(db.releases, params.id)
      const input = parseBody(z.object({ version: version.optional(), notes: notes.optional(), link: link.optional() }), body)
      if (input.version !== undefined && input.version !== release.version) {
        if (release.status !== 'draft') throw fail.conflict('La versión solo cambia mientras es un borrador.')
        versionTaken(db.releases, { platform: release.platform, version: input.version }, release.id)
        release.version = input.version
      }
      if (input.notes !== undefined) release.notes = input.notes.trim()
      if (input.link !== undefined) release.link = input.link
      return wireRelease(release, currentReleaseIds(db))
    },
    { permissions: ['releases.manage'] },
  ),
  route(
    'DELETE',
    endpoints.appRelease.detail(':id'),
    ({ db, params }) => {
      const release = findRelease(db.releases, params.id)
      if (release.status !== 'draft') throw fail.conflict('Solo se borra un borrador; una versión publicada se retira.')
      db.releases = db.releases.filter((item) => item.id !== release.id)
      return undefined
    },
    { permissions: ['releases.manage'] },
  ),
  route(
    'POST',
    endpoints.appRelease.publish(':id'),
    (context) => {
      const { db, params } = context
      const release = findRelease(db.releases, params.id)
      if (release.status === 'published') throw fail.conflict('Esa versión ya está publicada.')
      release.status = 'published'
      release.publishedAt = nowLocalDateTime()
      release.withdrawnAt = null
      return wireRelease(release, currentReleaseIds(db))
    },
    { permissions: ['releases.manage'] },
  ),
  route(
    'POST',
    endpoints.appRelease.withdraw(':id'),
    ({ db, params }) => {
      const release = findRelease(db.releases, params.id)
      if (release.status !== 'published') throw fail.conflict('Solo se retira una versión publicada.')
      release.status = 'withdrawn'
      release.withdrawnAt = nowLocalDateTime()
      return wireRelease(release, currentReleaseIds(db))
    },
    { permissions: ['releases.manage'] },
  ),
]
