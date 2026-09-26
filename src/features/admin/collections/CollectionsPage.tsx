import { Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/router/paths'
import { EmptyState, ErrorState, PageHeader, Panel, SkeletonRows, Table, Tag, Td, Th, Tr } from '@/components/ui'
import { useStatements } from '@/data/hooks/use-billing'
import { useOrganizations } from '@/data/hooks/use-organizations'
import { CHARGE_KIND_LABELS, type ChargeKind } from '@/data/models'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { monthKey, todayISO } from '@/lib/dates'
import { formatDateTime, formatMoney, formatMonth, plural } from '@/lib/format'

const KINDS: ChargeKind[] = ['coupon_fee', 'badge_activation', 'badge_campaign']

export function CollectionsPage() {
  useDocumentTitle('Cobros')
  const statements = useStatements()
  const organizations = useOrganizations()
  const month = formatMonth(monthKey(todayISO()))

  const rows = useMemo(() => {
    return (organizations.data ?? [])
      .map((organization) => {
        const own = (statements.data ?? []).filter((statement) => statement.organizationId === organization.id)
        const open = own.find((statement) => statement.status === 'open')
        const due = own.filter((statement) => statement.status === 'due' && statement.total > 0)
        const lastPaid = own
          .filter((statement) => statement.paidAt)
          .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))[0]
        return {
          organization,
          open: open?.total ?? 0,
          due: due.reduce((sum, statement) => sum + statement.total, 0),
          duePeriods: due.map((statement) => formatMonth(statement.period)),
          lastPaid: lastPaid?.paidAt ?? null,
        }
      })
      .filter((row) => row.open > 0 || row.due > 0 || row.lastPaid)
      .sort((a, b) => b.due - a.due || b.open - a.open)
  }, [organizations.data, statements.data])

  const totals = useMemo(() => {
    const byKind = new Map<ChargeKind, number>()
    for (const statement of statements.data ?? []) {
      if (statement.status !== 'open') continue
      for (const line of statement.lines) byKind.set(line.kind, (byKind.get(line.kind) ?? 0) + line.amount)
    }
    return {
      byKind,
      open: [...byKind.values()].reduce((sum, value) => sum + value, 0),
      due: rows.reduce((sum, row) => sum + row.due, 0),
      debtors: rows.filter((row) => row.due > 0).length,
    }
  }, [statements.data, rows])

  const loading = statements.isPending || organizations.isPending

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cobros" description="Lo que cada organización le paga a K'Plan por cupones validados e insignias." />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : statements.isError ? (
        <ErrorState error={statements.error} onRetry={() => void statements.refetch()} />
      ) : (
        <>
          <p className="max-w-[80ch] text-lead text-muted">
            Por cobrar: <strong className="font-semibold text-ink">{formatMoney(totals.due)}</strong> de{' '}
            {plural(totals.debtors, 'organización', 'organizaciones')}. En {month}, hasta hoy, se generaron{' '}
            <strong className="font-semibold text-ink">{formatMoney(totals.open)}</strong>.
          </p>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {rows.length === 0 ? (
              <EmptyState icon={<Wallet size={20} />} title="Todavía no hay cobros" />
            ) : (
              <div className="rounded-kp border border-divider bg-surface">
                <Table caption="Cobros por organización">
                  <thead>
                    <tr>
                      <Th>Organización</Th>
                      <Th align="right">Mes en curso</Th>
                      <Th align="right">Por pagar</Th>
                      <Th>Último pago</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <Tr key={row.organization.id}>
                        <Td>
                          <Link to={paths.organization(row.organization.id)} className="font-semibold text-ink hover:underline">
                            {row.organization.name}
                          </Link>
                          <p className="text-caption text-muted">{row.organization.kind}</p>
                        </Td>
                        <Td align="right">{formatMoney(row.open)}</Td>
                        <Td align="right">
                          {row.due > 0 ? (
                            <span className="flex flex-col items-end gap-0.5">
                              <span className="font-semibold text-danger">{formatMoney(row.due)}</span>
                              <span className="text-caption text-muted">{row.duePeriods.join(', ')}</span>
                            </span>
                          ) : (
                            <Tag tone="confirmed">Al día</Tag>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-muted">{row.lastPaid ? formatDateTime(row.lastPaid) : '—'}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            <Panel title={`Este mes, por concepto`}>
              <ul className="flex flex-col gap-3 text-body">
                {KINDS.map((kind) => (
                  <li key={kind} className="flex items-baseline justify-between gap-4">
                    <span className="text-muted">{CHARGE_KIND_LABELS[kind]}</span>
                    <span className="font-semibold text-ink tabular-nums">{formatMoney(totals.byKind.get(kind) ?? 0)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-4 border-t border-divider pt-3">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="text-title font-bold text-ink tabular-nums">{formatMoney(totals.open)}</span>
                </li>
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
