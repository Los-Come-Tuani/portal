/** Id en kebab-case ASCII, como exige la app: `"Gritería 2026"` → `"griteria-2026"`. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** El primer id libre a partir de `base`: `base`, `base-2`, `base-3`… */
export function uniqueSlug(base: string, isTaken: (id: string) => boolean): string {
  const root = slugify(base) || 'item'
  if (!isTaken(root)) return root
  let suffix = 2
  while (isTaken(`${root}-${suffix}`)) suffix++
  return `${root}-${suffix}`
}
