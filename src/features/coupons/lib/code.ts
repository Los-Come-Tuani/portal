/** Mientras se escribe: mayúsculas, sin símbolos, con la forma `KP-XXXX-XXXX`. */
export function formatRedemptionCode(raw: string): string {
  let chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (chars.length > 0 && !chars.startsWith('KP')) chars = `KP${chars.replace(/^K?P?/, '')}`
  chars = chars.slice(0, 10)
  const parts = [chars.slice(0, 2), chars.slice(2, 6), chars.slice(6, 10)].filter(Boolean)
  return parts.join('-')
}

export function isCompleteCode(code: string): boolean {
  return /^KP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)
}
