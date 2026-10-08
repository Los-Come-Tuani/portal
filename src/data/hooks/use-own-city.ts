import { useQuery } from '@tanstack/react-query'
import type { CatalogCity, Organization } from '../models'
import { placesRepository } from '../repositories/places.repository'
import { useCities } from './use-applications'

/**
 * La ciudad de la organización de quien entró. La sesión del API no la trae (solo id, clase y
 * nombre): se toma de sus lugares. En la demo la organización ya la tiene.
 */
export function useOwnCity(organization: Organization | null) {
  const cities = useCities()
  const known = organization?.city || null
  const found = useQuery({
    queryKey: ['own-city', organization?.id ?? ''],
    queryFn: async (): Promise<string | null> => (await placesRepository.page({ page: 1, pageSize: 1 })).results[0]?.cityId ?? null,
    enabled: !!organization && organization.status === 'active' && !known,
    staleTime: 5 * 60_000,
  })
  const city: CatalogCity | null =
    cities.data?.find((item) => (known ? item.name.localeCompare(known, 'es', { sensitivity: 'base' }) === 0 : item.id === found.data)) ?? null
  return { city, isPending: cities.isPending || (!known && !!organization && found.isPending && found.fetchStatus !== 'idle') }
}
