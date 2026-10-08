import type { TagTone } from '@/components/ui'
import type { MonthlyStatement, MonthlyStatementStatus } from '@/data/models'
import { formatMonth } from '@/lib/format'

export const STATEMENT_TONES: Record<MonthlyStatementStatus, TagTone> = { pending: 'danger', paid: 'confirmed', void: 'neutral' }

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** El mes de un estado de cuenta: `2026-09-01` → "Septiembre 2026". */
export const statementMonth = (statement: Pick<MonthlyStatement, 'period'>) => capitalize(formatMonth(statement.period.slice(0, 7)))
