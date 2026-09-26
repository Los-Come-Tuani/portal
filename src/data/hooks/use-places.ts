import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlaceProfileInput, PostInput, StopInput } from '../models'
import { placesRepository, type StopFilters } from '../repositories/places.repository'
import { queryKeys } from './query-keys'

export function usePlaces(filters: StopFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.places.list(filters),
    queryFn: () => placesRepository.list(filters),
    enabled,
  })
}

/** Sin sesión: para quien se postula y dice cuál es su lugar. */
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

export function useUpdatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stopId, input }: { stopId: string; input: StopInput }) => placesRepository.update(stopId, input),
    onSuccess: (stop) => {
      queryClient.setQueryData(queryKeys.places.detail(stop.id), stop)
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
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
    mutationFn: ({ stopId, input }: { stopId: string; input: PlaceProfileInput }) =>
      placesRepository.updateProfile(stopId, input),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.places.profile(profile.stopId), profile),
  })
}

export function usePosts(stopId?: string) {
  return useQuery({
    queryKey: queryKeys.places.posts(stopId),
    queryFn: () => placesRepository.listPosts(stopId),
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
