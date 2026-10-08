import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NewStopInput, OrganizationKind, PlaceProfileInput, PostInput, Stop, StopFilters, StopInput } from '../models'
import { placesRepository } from '../repositories/places.repository'
import { queryKeys } from './query-keys'

/** Todos los lugares que ve quien entró (con los filtros del API), sin paginar. */
export function usePlaces(filters: StopFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.places.list(filters),
    queryFn: () => placesRepository.list(filters),
    enabled,
  })
}

/** Una página de lugares, para la lista del portal. */
export function usePlacePage(filters: StopFilters & { page: number; pageSize: number }) {
  return useQuery({
    queryKey: queryKeys.places.page(filters),
    queryFn: () => placesRepository.page(filters),
    placeholderData: keepPreviousData,
  })
}

/** Los lugares activos de una ciudad, como los ve la app: las paradas que puede tener un circuito. */
export function useCityStops(cityCode: string | undefined) {
  return useQuery({
    queryKey: queryKeys.places.city(cityCode ?? ''),
    queryFn: () => placesRepository.cityStops(cityCode ?? ''),
    enabled: !!cityCode,
    staleTime: 60_000,
  })
}

/** Solo en la demo: para quien pide administrar otro lugar. */
export function useAvailablePlaces(city: string) {
  return useQuery({
    queryKey: ['places', 'available', city],
    queryFn: () => placesRepository.available(city),
    enabled: !!city,
    staleTime: 5 * 60_000,
  })
}

export function usePlace(stopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.places.detail(stopId ?? ''),
    queryFn: () => placesRepository.get(stopId ?? ''),
    enabled: !!stopId,
  })
}

/** El QR de la insignia de un lugar; sólo lo tiene uno que da insignia. */
export function usePlaceQr(stopId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.places.qr(stopId),
    queryFn: () => placesRepository.qr(stopId),
    enabled: !!stopId && enabled,
    retry: false,
  })
}

/** El lugar como quedó, en su detalle y en las listas. */
function useStoreStop() {
  const queryClient = useQueryClient()
  return (stop: Stop) => {
    queryClient.setQueryData(queryKeys.places.detail(stop.id), stop)
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all, predicate: (query) => query.queryKey[1] !== 'detail' })
  }
}

export function useCreatePlace() {
  const store = useStoreStop()
  return useMutation({ mutationFn: (input: NewStopInput) => placesRepository.create(input), onSuccess: store })
}

export function useUpdatePlace() {
  const store = useStoreStop()
  return useMutation({
    mutationFn: ({ stopId, input }: { stopId: string; input: StopInput }) => placesRepository.update(stopId, input),
    onSuccess: store,
  })
}

export function useSetPlaceBadge() {
  const store = useStoreStop()
  return useMutation({
    mutationFn: ({ stopId, hasBadge }: { stopId: string; hasBadge: boolean }) => placesRepository.setBadge(stopId, hasBadge),
    onSuccess: store,
  })
}

export function useRestorePlace() {
  const store = useStoreStop()
  return useMutation({ mutationFn: (stopId: string) => placesRepository.restore(stopId), onSuccess: store })
}

export function useRetirePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stopId: string) => placesRepository.retire(stopId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.places.all }),
  })
}

/** Darle dueño a un lugar (o devolverlo al equipo) cambia también las organizaciones. */
export function useSetPlaceOwner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stopId, owner }: { stopId: string; owner: { kind: OrganizationKind; id: string } | null }) =>
      placesRepository.setOwner(stopId, owner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
    },
  })
}

export function usePlaceProfile(stopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.places.profile(stopId ?? ''),
    queryFn: () => placesRepository.getProfile(stopId ?? ''),
    enabled: !!stopId,
  })
}

export function useUpdatePlaceProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stopId, input }: { stopId: string; input: PlaceProfileInput }) => placesRepository.updateProfile(stopId, input),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.places.profile(profile.stopId), profile),
  })
}

export function usePosts(stopId: string) {
  return useQuery({
    queryKey: queryKeys.places.posts(stopId),
    queryFn: () => placesRepository.listPosts(stopId),
    enabled: !!stopId,
  })
}

export function useSavePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PostInput }) =>
      id ? placesRepository.updatePost(id, input) : placesRepository.createPost(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['places', 'posts'] }),
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => placesRepository.deletePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['places', 'posts'] }),
  })
}
