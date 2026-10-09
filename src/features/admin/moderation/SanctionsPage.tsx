import { Gavel } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorState, PageHeader, Pager, SegmentedControl, SkeletonRows } from '@/components/ui'
import { useSanctions } from '@/data/hooks/use-moderation'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { SanctionList } from './SanctionList'

type Filter = 'active' | 'all'

const FILTERS = [
  { value: 'active', label: 'Vigentes' },
  { value: 'all', label: 'Todas' },
] as const

/**
 * Las sanciones del equipo (`sanction/`, F8): las ve `users.view`; levantarlas pide `users.manage`.
 * Se sanciona desde el detalle de una persona en "Todos los usuarios" o desde un reporte.
 */
export function SanctionsPage() {
  useDocumentTitle('Sanciones')
  const [filter, setFilter] = useState<Filter>('active')
  const [page, setPage] = useState(1)
  const sanctions = useSanctions({ active: filter === 'active' ? true : undefined, page, pageSize: 20 })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sanciones"
        description="Advertencias, suspensiones y expulsiones. Para sancionar a alguien, ábrelo en Todos los usuarios o hazlo desde su reporte."
      />
      <SegmentedControl
        label="Filtrar sanciones"
        value={filter}
        options={FILTERS}
        onChange={(value) => {
          setFilter(value)
          setPage(1)
        }}
        size="sm"
        className="self-start"
      />
      {sanctions.isPending ? (
        <SkeletonRows rows={4} />
      ) : sanctions.isError ? (
        <ErrorState error={sanctions.error} onRetry={() => void sanctions.refetch()} />
      ) : sanctions.data.results.length === 0 ? (
        <EmptyState icon={<Gavel size={20} />} title={filter === 'active' ? 'No hay sanciones vigentes' : 'Todavía no hay sanciones'} />
      ) : (
        <>
          <SanctionList sanctions={sanctions.data.results} showUser />
          <Pager page={sanctions.data} onChange={setPage} noun={{ one: 'sanción', many: 'sanciones' }} />
        </>
      )}
    </div>
  )
}
