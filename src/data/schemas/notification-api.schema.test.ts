import { describe, expect, it } from 'vitest'
import { apiNotificationPageSchema, toNotificationPage } from './notification-api.schema'

describe('la bandeja de avisos', () => {
  it('pasa cada aviso con a qué apunta y si se leyó; el total de la página sirve de contador', () => {
    const page = toNotificationPage(
      apiNotificationPageSchema.parse({
        next: false,
        previous: false,
        elements: 3,
        pages: 1,
        current: 1,
        results: [
          { id: 'n1', kind: 'pago', title: 'Retiro pagado', body: 'C$ 1 800', data: { withdrawal_id: 'w1' }, read: false, created_at: '2026-10-07T15:00:00Z' },
          { id: 'n2', kind: 'cuenta', title: 'Recibiste una advertencia', body: 'Motivo', data: {}, read: true, created_at: '2026-10-06T15:00:00Z' },
          { id: 'n3', kind: 'nueva_clase', title: 'Algo nuevo', body: '', data: {}, read: false, created_at: '2026-10-05T15:00:00Z' },
        ],
      }),
    )
    expect(page.elements).toBe(3)
    expect(page.results[0]).toEqual({ id: 'n1', kind: 'pago', title: 'Retiro pagado', body: 'C$ 1 800', data: { withdrawal_id: 'w1' }, read: false, createdAt: '2026-10-07T09:00:00.000' })
    expect(page.results[2].kind).toBe('nueva_clase')
  })
})
