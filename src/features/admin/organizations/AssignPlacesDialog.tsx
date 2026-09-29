import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { Button, Checkbox, Dialog, EmptyState, Input, SkeletonRows, useToast } from '@/components/ui'
import { errorMessage } from '@/data/api/errors'
import { useAssignStops } from '@/data/hooks/use-organizations'
import { useAvailablePlaces } from '@/data/hooks/use-places'
import type { Organization } from '@/data/models'
import { plural } from '@/lib/format'

/** El equipo le asigna directo a una organización lugares que ya están en la app y no tienen dueño. */
export function AssignPlacesDialog({ open, organization, onClose }: { open: boolean; organization: Organization; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Asignar lugares a ${organization.name}`}
      description={`Lugares de ${organization.city} que ya están en la app, no administra nadie y nadie ha pedido. Empieza a editarlos y a ver sus llegadas de inmediato.`}
    >
      <AssignForm key={String(open)} organization={organization} onDone={onClose} />
    </Dialog>
  )
}

function AssignForm({ organization, onDone }: { organization: Organization; onDone: () => void }) {
  const available = useAvailablePlaces(organization.city)
  const save = useAssignStops()
  const toast = useToast()
  const [picked, setPicked] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const places = (available.data ?? []).filter(
    (stop) => !search || `${stop.name} ${stop.address}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const assign = () =>
    save.mutate(
      { id: organization.id, stopIds: picked },
      {
        onSuccess: () => {
          toast({ title: `Asignaste ${plural(picked.length, 'lugar', 'lugares')} a ${organization.name}` })
          onDone()
        },
        onError: (error) => toast({ title: errorMessage(error), tone: 'error' }),
      },
    )

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        aria-label="Buscar lugar"
        placeholder="Buscar por nombre o dirección"
        leading={<Search size={16} />}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {available.isPending ? (
        <SkeletonRows rows={4} />
      ) : places.length === 0 ? (
        <EmptyState icon={<MapPin size={20} />} title={`No hay lugares sin dueño en ${organization.city}`} className="rounded-kp border border-divider py-8">
          Si su lugar todavía no existe, la organización lo pide desde "Mis lugares" y lo apruebas en Solicitudes.
        </EmptyState>
      ) : (
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-kp border border-divider p-4">
          {places.map((stop) => (
            <Checkbox
              key={stop.id}
              label={stop.name}
              description={`${stop.category} · ${stop.address}`}
              checked={picked.includes(stop.id)}
              onChange={(event) => setPicked((current) => (event.target.checked ? [...current, stop.id] : current.filter((id) => id !== stop.id)))}
            />
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-divider pt-4">
        <Button variant="ghost" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button onClick={assign} disabled={picked.length === 0} loading={save.isPending}>
          {picked.length > 0 ? `Asignar ${plural(picked.length, 'lugar', 'lugares')}` : 'Asignar'}
        </Button>
      </div>
    </div>
  )
}
