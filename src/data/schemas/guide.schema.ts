import { z } from 'zod'

const note = z.string().trim().max(500)

export const documentReviewSchema = z
  .object({
    status: z.enum(['accepted', 'rejected']),
    checks: z.array(z.string()),
    note,
  })
  .refine((value) => value.status !== 'rejected' || value.note.length >= 10, {
    error: 'Explica qué tiene que corregir: el guía lo lee en la app',
    path: ['note'],
  })

export const backgroundCheckSchema = z
  .object({
    status: z.enum(['clear', 'flagged']),
    note,
  })
  .refine((value) => value.status !== 'flagged' || value.note.length >= 10, {
    error: 'Anota qué encontraste',
    path: ['note'],
  })

export const decisionSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    note,
  })
  .refine((value) => value.decision !== 'rejected' || value.note.length >= 10, {
    error: 'Explica por qué se rechaza',
    path: ['note'],
  })

export const changesRequestSchema = z.object({
  note: z.string().trim().min(10, { error: 'Explica qué tiene que corregir' }).max(500),
})

export const assignSchema = z.object({
  assigneeId: z.string().nullable(),
})
