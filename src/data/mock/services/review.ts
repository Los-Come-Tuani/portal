import { nowLocalDateTime } from '@/lib/dates'
import type { ReviewEvent } from '../../models'

interface Reviewable {
  id: string
  history: ReviewEvent[]
  assigneeId: string | null
}

/** `null`: lo hizo quien se postuló. */
type Actor = { id: string | null; name: string }

export function logReview(application: Reviewable, actor: Actor, kind: ReviewEvent['kind'], text: string): void {
  application.history.push({
    id: `${application.id}-event-${application.history.length + 1}`,
    at: nowLocalDateTime(),
    kind,
    actorId: actor.id,
    actorName: actor.name,
    text,
  })
}

/** Quien trabaja una solicitud sin responsable la toma. */
export function claimReview(application: Reviewable, actor: { id: string; name: string }): void {
  if (application.assigneeId) return
  application.assigneeId = actor.id
  logReview(application, actor, 'assigned', `${actor.name} tomó la solicitud`)
}
