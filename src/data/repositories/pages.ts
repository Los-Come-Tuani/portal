import type { Page } from '../models'

/** La página más grande que entrega el API. */
export const MAX_PAGE_SIZE = 100

/** Para las listas que se necesitan completas (los lugares de una ciudad, el catálogo de circuitos). */
export async function allPages<T>(fetchPage: (page: number, pageSize: number) => Promise<Page<T>>): Promise<T[]> {
  const first = await fetchPage(1, MAX_PAGE_SIZE)
  const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, index) => fetchPage(index + 2, MAX_PAGE_SIZE)))
  return [first, ...rest].flatMap((page) => page.results)
}
