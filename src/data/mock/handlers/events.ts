import { formatDayMonth } from '@/lib/format'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import type { EventItem } from '../../models'
import { eventInputSchema, eventModerationSchema } from '../../schemas/event.schema'
import type { MockContext } from '../http'
import { fail, parseBody, requireUser, route } from '../http'
import { assertCanManage, findOwnStop, isAdmin, scopeOrganization } from '../services/access'

function findEvent(context: MockContext): EventItem {
  const event = context.db.events.find((item) => item.id === context.params.id)
  if (!event) throw fail.notFound('No encontramos ese evento')
  return event
}

function fromInput(context: MockContext, existing?: EventItem): Omit<EventItem, 'id'> {
  const user = requireUser(context)
  const input = parseBody(eventInputSchema, context.body)
  const organizerId = isAdmin(user) ? input.organizerId : user.organizationId
  if (input.stopId) findOwnStop(context.db, user, input.stopId)
  return {
    ...input,
    organizerId,
    dateLabel: formatDayMonth(input.date),
    image: input.images[0],
    featured: isAdmin(user) ? (input.featured ?? false) : (existing?.featured ?? false),
  }
}

export const eventRoutes = [
  route('GET', endpoints.events.list, (context) => {
    const user = requireUser(context)
    const requested = context.query.get('organizerId')
    const from = context.query.get('from')
    const to = context.query.get('to')
    const onlyKplan = requested === 'kplan'
    const organizerId = onlyKplan ? null : scopeOrganization(user, requested)
    return context.db.events
      .filter((event) => (onlyKplan ? event.organizerId === null : !organizerId || event.organizerId === organizerId))
      .filter((event) => !from || event.date >= from)
      .filter((event) => !to || event.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
  }),
  route('GET', endpoints.events.detail(':id'), (context) => {
    const user = requireUser(context)
    const event = findEvent(context)
    if (!isAdmin(user) && event.organizerId !== user.organizationId) throw fail.notFound('No encontramos ese evento')
    return event
  }),
  route('POST', endpoints.events.list, (context) => {
    const data = fromInput(context)
    const event: EventItem = {
      ...data,
      id: uniqueSlug(data.title, (id) => context.db.events.some((item) => item.id === id)),
    }
    context.db.events.push(event)
    return event
  }),
  route('PUT', endpoints.events.detail(':id'), (context) => {
    const user = requireUser(context)
    const event = findEvent(context)
    assertCanManage(user, event.organizerId)
    Object.assign(event, fromInput(context, event))
    return event
  }),
  route('DELETE', endpoints.events.detail(':id'), (context) => {
    const user = requireUser(context)
    const event = findEvent(context)
    assertCanManage(user, event.organizerId)
    context.db.events = context.db.events.filter((item) => item.id !== event.id)
    return undefined
  }),
  route(
    'PATCH',
    endpoints.events.moderation(':id'),
    (context) => {
      const event = findEvent(context)
      Object.assign(event, parseBody(eventModerationSchema, context.body))
      return event
    },
    { permissions: ['content.moderate'] },
  ),
]
