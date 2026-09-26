/**
 * Generador pseudoaleatorio determinista (mulberry32): con la misma semilla
 * los datos de demo salen iguales en cada carga.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }

  return {
    next,
    /** Entero entre `min` y `max`, ambos incluidos. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability: number) => next() < probability,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    weighted: <T>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
      let roll = next() * total
      for (const [value, weight] of entries) {
        roll -= weight
        if (roll < 0) return value
      }
      return entries[entries.length - 1][0]
    },
  }
}

export type Random = ReturnType<typeof createRandom>

/** Convierte un texto en una semilla de 32 bits (FNV-1a). */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
