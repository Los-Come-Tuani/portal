import { z } from 'zod'
import { addDays, nowLocalDateTime, todayISO, toLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { fail, paginate, parseBody, requireUser, route } from '../http'
import {
  findDispute,
  REPORT_REASONS,
  sanctionActive,
  sanctionNotice,
  wireDispute,
  wireNotification,
  wireReport,
  wireSanction,
  type MockSanction,
} from '../services/moderation'

const sanctionBody = z.object({
  user_id: z.string().min(1),
  kind: z.enum(['warning', 'suspension', 'expulsion']),
  reason: z.string().trim().min(5).max(1000),
  days: z.number().int().min(1).max(365).nullish(),
  report_id: z.string().nullish(),
})

/** La moderación del equipo y la bandeja de avisos, con las mismas rutas y reglas que el API. */
export const moderationRoutes = [
  route('GET', endpoints.notification.list, (context) => {
    const { db, query } = context
    const user = requireUser(context)
    const unread = query.get('unread') === 'true'
    const shown = db.notifications
      .filter((item) => item.userId === user.id && (!unread || !item.read))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(wireNotification)
    return paginate(shown, query)
  }),
  route('POST', endpoints.notification.read(':id'), (context) => {
    const user = requireUser(context)
    const notification = context.db.notifications.find((item) => item.id === context.params.id && item.userId === user.id)
    if (!notification) throw fail.notFound('No encontramos ese aviso.')
    notification.read = true
    return wireNotification(notification)
  }),
  route('POST', endpoints.notification.readAll, (context) => {
    const user = requireUser(context)
    for (const item of context.db.notifications) if (item.userId === user.id) item.read = true
    return undefined
  }),

  route(
    'GET',
    endpoints.reviewDispute.list,
    ({ db, query }) => {
      const status = query.get('status')
      const shown = db.reviewDisputes
        .filter((dispute) => !status || dispute.status === status)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(wireDispute)
      return paginate(shown, query)
    },
    { permissions: ['content.moderate'] },
  ),
  route(
    'POST',
    endpoints.reviewDispute.resolve(':id'),
    ({ db, params, body }) => {
      const dispute = findDispute(db, params.id)
      if (!dispute) throw fail.notFound('No encontramos esa impugnación.')
      if (dispute.status !== 'pending') throw fail.conflict('Esa impugnación ya se resolvió.')
      const input = parseBody(z.object({ upheld: z.boolean(), note: z.string().max(1000).default('') }), body)
      dispute.status = input.upheld ? 'upheld' : 'rejected'
      dispute.hidden = input.upheld
      dispute.note = input.note.trim()
      dispute.resolvedAt = nowLocalDateTime()
      return wireDispute(dispute)
    },
    { permissions: ['content.moderate'] },
  ),

  route('GET', endpoints.report.reasons, () => REPORT_REASONS),
  route(
    'GET',
    endpoints.report.list,
    ({ db, query }) => {
      const status = query.get('status')
      const kind = query.get('target_kind')
      const shown = db.reports
        .filter((report) => !status || report.status === status)
        .filter((report) => !kind || report.targetKind === kind)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(wireReport)
      return paginate(shown, query)
    },
    { permissions: ['content.moderate', 'users.manage'] },
  ),
  route(
    'POST',
    endpoints.report.resolve(':id'),
    ({ db, params, body }) => {
      const report = db.reports.find((item) => item.id === params.id)
      if (!report) throw fail.notFound('No encontramos ese reporte.')
      if (report.status !== 'pending') throw fail.conflict('Ese reporte ya se resolvió.')
      const input = parseBody(z.object({ status: z.enum(['handled', 'dismissed']), note: z.string().max(1000).default('') }), body)
      report.status = input.status
      report.resolutionNote = input.note.trim()
      report.resolvedAt = nowLocalDateTime()
      return wireReport(report)
    },
    { permissions: ['content.moderate', 'users.manage'] },
  ),

  route(
    'GET',
    endpoints.sanction.list,
    ({ db, query }) => {
      const now = nowLocalDateTime()
      const userId = query.get('user_id')
      const active = query.get('active')
      const shown = db.sanctions
        .filter((sanction) => !userId || sanction.userId === userId)
        .filter((sanction) => active === null || sanctionActive(sanction, now) === (active === 'true'))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        .map((sanction) => wireSanction(sanction, now))
      return paginate(shown, query)
    },
    { permissions: ['users.view', 'users.manage'] },
  ),
  route(
    'POST',
    endpoints.sanction.list,
    (context) => {
      const { db, body } = context
      const actor = requireUser(context)
      const input = parseBody(sanctionBody, body)
      const user = db.users.find((item) => item.id === input.user_id)
      if (!user) throw fail.invalid('Revisa los campos marcados', { user_id: 'Esa cuenta no existe.' })
      if (user.id === actor.id) throw fail.invalid('Revisa los campos marcados', { user_id: 'Nadie se sanciona a sí mismo.' })
      const now = nowLocalDateTime()
      const days = input.kind === 'suspension' ? (input.days ?? null) : null
      const sanction: MockSanction = {
        id: `sancion-${db.sanctions.length + 1}-${Date.now().toString(36)}`,
        userId: user.id,
        userName: user.name,
        kind: input.kind,
        reason: input.reason,
        startsAt: now,
        endsAt: days ? toLocalDateTime(addDays(todayISO(), days), Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16))) : null,
        createdBy: actor.name,
        reportId: input.report_id ?? null,
        liftedAt: null,
      }
      db.sanctions.push(sanction)
      db.notifications.push(sanctionNotice(sanction))
      // Suspender o expulsar deja la cuenta sin acceso; la demo no distingue la expulsión.
      if (input.kind !== 'warning') user.status = 'suspended'
      return wireSanction(sanction, now)
    },
    { permissions: ['users.manage'] },
  ),
  route(
    'POST',
    endpoints.sanction.lift(':id'),
    ({ db, params }) => {
      const now = nowLocalDateTime()
      const sanction = db.sanctions.find((item) => item.id === params.id)
      if (!sanction) throw fail.notFound('No encontramos esa sanción.')
      if (!sanctionActive(sanction, now)) throw fail.conflict('Esa sanción ya no está vigente.')
      sanction.liftedAt = now
      const still = db.sanctions.some((item) => item.userId === sanction.userId && item.id !== sanction.id && sanctionActive(item, now))
      const user = db.users.find((item) => item.id === sanction.userId)
      if (user && !still && user.status === 'suspended') user.status = 'active'
      return wireSanction(sanction, now)
    },
    { permissions: ['users.manage'] },
  ),
]
