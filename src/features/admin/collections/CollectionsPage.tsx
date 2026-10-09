import { useSearchParams } from 'react-router'
import { PageHeader, Tabs } from '@/components/ui'
import { PaymentsPanel } from '@/features/admin/finance/PaymentsPanel'
import { StatementsPanel } from '@/features/admin/finance/StatementsPanel'
import { useDocumentTitle } from '@/hooks/use-document-title'

type Section = 'reservas' | 'comercios'

/** Lo que entra a K'Plan: los pagos de las reservas y los estados de cuenta mensuales de los comercios. */
export function CollectionsPage() {
  useDocumentTitle('Cobros')
  const [params, setParams] = useSearchParams()
  const section: Section = params.get('vista') === 'comercios' ? 'comercios' : 'reservas'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobros"
        description="Los pagos de las reservas, que el equipo confirma a mano mientras no haya pasarela, y lo que cada comercio paga al mes por la insignia de su lugar y los cupones que valida."
      />
      <Tabs
        label="Cobros"
        value={section}
        onChange={(value) => setParams(value === 'comercios' ? { vista: 'comercios' } : {}, { replace: true })}
        items={[
          { value: 'reservas', label: 'Pagos de reservas' },
          { value: 'comercios', label: 'Estados de cuenta' },
        ]}
      />
      {section === 'reservas' ? <PaymentsPanel /> : <StatementsPanel />}
    </div>
  )
}
