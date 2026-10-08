import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { renameFieldErrors } from '../api/errors'
import { http } from '../api/http-client'
import type { NewStopInput, OrganizationKind, Page, PlaceProfile, PlaceProfileInput, Post, PostInput, Stop, StopFilters, StopInput } from '../models'
import {
  apiPillarSchema,
  apiPlacePageSchema,
  apiPlaceSchema,
  apiPostPageSchema,
  apiPostSchema,
  apiProfileSchema,
  apiStopPageSchema,
  apiStopSchema,
  newPlaceBody,
  PLACE_FORM_FIELDS,
  placeBody,
  POST_FORM_FIELDS,
  postBody,
  profileBody,
  toPost,
  toProfile,
  toStop,
  toStopPage,
} from '../schemas/place-api.schema'
import { allPages } from './pages'

/** El lugar que responde el API; un error por campo sale con el nombre del formulario. */
async function place(request: Promise<unknown>): Promise<Stop> {
  try {
    return toStop(apiPlaceSchema.parse(await request))
  } catch (error) {
    throw renameFieldErrors(error, PLACE_FORM_FIELDS)
  }
}

async function post(request: Promise<unknown>): Promise<Post> {
  try {
    return toPost(apiPostSchema.parse(await request))
  } catch (error) {
    throw renameFieldErrors(error, POST_FORM_FIELDS)
  }
}

async function placePage(filters: StopFilters, page: number, pageSize: number): Promise<Page<Stop>> {
  const data = await http.get<unknown>(endpoints.place.list, {
    query: {
      city_id: filters.cityId,
      owner_kind: filters.ownerKind,
      owner_id: filters.ownerId,
      active: filters.active,
      search: filters.search?.trim(),
      page,
      page_size: pageSize,
    },
  })
  return toStopPage(apiPlacePageSchema.parse(data))
}

/**
 * Los lugares del portal (docs/territorio.md del repo del API). El API decide qué ve cada quien:
 * el equipo con `places.view`, todos; una organización verificada, los suyos.
 */
export const placesRepository = {
  page: ({ page = 1, pageSize = 20, ...filters }: StopFilters & { page?: number; pageSize?: number }) => placePage(filters, page, pageSize),

  /** Todos los que dejan ver los filtros, juntando las páginas. */
  list: (filters: StopFilters = {}) => allPages((page, pageSize) => placePage(filters, page, pageSize)),

  get: (stopId: string) => place(http.get<unknown>(endpoints.place.detail(stopId))),

  /** El equipo crea en la ciudad que elige; la alcaldía, en la suya. */
  create: (input: NewStopInput) => place(http.post<unknown>(endpoints.place.list, { body: newPlaceBody(input) })),

  update: (stopId: string, input: StopInput) => place(http.patch<unknown>(endpoints.place.detail(stopId), { body: placeBody(input) })),

  /** La insignia la cambia solo el equipo con `places.manage`. */
  setBadge: (stopId: string, hasBadge: boolean) => place(http.patch<unknown>(endpoints.place.detail(stopId), { body: { has_badge: hasBadge } })),

  /** Lo devuelve a la app después de retirarlo. */
  restore: (stopId: string) => place(http.patch<unknown>(endpoints.place.detail(stopId), { body: { active: true } })),

  /** Lo saca de la app sin borrarlo. Uno que está en circuitos publicados responde 409. */
  retire: (stopId: string) => http.delete(endpoints.place.detail(stopId)),

  /** Le da dueño, o lo devuelve al equipo con `null`. */
  setOwner: (stopId: string, owner: { kind: OrganizationKind; id: string } | null) =>
    place(http.put<unknown>(endpoints.place.owner(stopId), { body: owner ?? {} })),

  /** Los lugares activos de una ciudad, como los ve la app: de aquí salen las paradas de un circuito. */
  cityStops: (cityCode: string) =>
    allPages(async (page, pageSize) =>
      toStopPage(apiStopPageSchema.parse(await http.get<unknown>(endpoints.stops.list, { query: { city: cityCode, page, page_size: pageSize } }))),
    ),

  /** Un lugar activo como lo ve la app. */
  publicStop: async (stopId: string) => toStop(apiStopSchema.parse(await http.get<unknown>(endpoints.stops.detail(stopId)))),

  /** Los pilares culturales del API: la categoría de cada lugar. */
  pillars: async () => z.array(apiPillarSchema).parse(await http.get<unknown>(endpoints.catalog.pillars)),

  /** Solo en la demo: los lugares sin dueño de una ciudad para un pedido de lugar. */
  available: async (city: string) =>
    z.array(apiStopSchema).parse(await http.get<unknown>(endpoints.placeRequests.availableStops, { query: { city } })).map(toStop),

  async getProfile(stopId: string): Promise<PlaceProfile> {
    return toProfile(stopId, apiProfileSchema.parse(await http.get<unknown>(endpoints.place.profile(stopId))))
  },
  async updateProfile(stopId: string, input: PlaceProfileInput): Promise<PlaceProfile> {
    return toProfile(stopId, apiProfileSchema.parse(await http.put<unknown>(endpoints.place.profile(stopId), { body: profileBody(input) })))
  },

  listPosts: (stopId: string) =>
    allPages(async (page, pageSize) => {
      const data = apiPostPageSchema.parse(await http.get<unknown>(endpoints.post.list, { query: { place_id: stopId, page, page_size: pageSize } }))
      return { results: data.results.map(toPost), current: data.current, pages: data.pages, elements: data.elements, hasNext: data.next, hasPrevious: data.previous }
    }),
  createPost: (input: PostInput) => post(http.post<unknown>(endpoints.post.list, { body: postBody(input, 'create') })),
  updatePost: (postId: string, input: PostInput) => post(http.patch<unknown>(endpoints.post.detail(postId), { body: postBody(input, 'update') })),
  deletePost: (postId: string) => http.delete(endpoints.post.detail(postId)),
}
