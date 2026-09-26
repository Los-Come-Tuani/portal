import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { PlaceProfile, PlaceProfileInput, Post, PostInput, Stop, StopInput } from '../models'

export interface StopFilters {
  organizationId?: string
  ids?: string[]
  city?: string
}

/** Un "lugar" del portal es una parada de la app, más su perfil y novedades. */
export const placesRepository = {
  list: (filters: StopFilters = {}) => http.get<Stop[]>(endpoints.stops.list, { query: { ...filters } }),
  get: (stopId: string) => http.get<Stop>(endpoints.stops.detail(stopId)),
  update: (stopId: string, input: StopInput) => http.put<Stop>(endpoints.stops.detail(stopId), { body: input }),

  getProfile: (stopId: string) => http.get<PlaceProfile>(endpoints.stops.profile(stopId)),
  updateProfile: (stopId: string, input: PlaceProfileInput) =>
    http.put<PlaceProfile>(endpoints.stops.profile(stopId), { body: input }),

  listPosts: (stopId?: string) => http.get<Post[]>(endpoints.posts.list, { query: { stopId } }),
  createPost: (input: PostInput) => http.post<Post>(endpoints.posts.list, { body: input }),
  updatePost: (postId: string, input: PostInput) => http.put<Post>(endpoints.posts.detail(postId), { body: input }),
  deletePost: (postId: string) => http.delete(endpoints.posts.detail(postId)),
}
