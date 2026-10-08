/**
 * Las listas cerradas del alta, como las siembra el API (`api_catalogs`, `api_territory`): las diez
 * Ciudades Creativas, los tipos de comercio y de institución, y los motivos para rechazar.
 */

export interface MockCity {
  id: string
  code: string
  name: string
  latitude: number
  longitude: number
  /** Ya se incorporó a la plataforma: tiene lugares en la app. */
  active: boolean
}

/** Las que activa el contenido de ejemplo del API (`seedcontent`): las que tienen lugares en la demo. */
const ACTIVE_CODES = new Set(['esteli', 'leon', 'masaya', 'granada', 'matagalpa'])

export const CITIES: MockCity[] = [
  ['esteli', 'Estelí', 13.0917, -86.3547],
  ['leon', 'León', 12.4379, -86.878],
  ['nagarote', 'Nagarote', 12.2595, -86.5667],
  ['managua', 'Managua', 12.1364, -86.2514],
  ['masaya', 'Masaya', 11.9744, -86.0942],
  ['granada', 'Granada', 11.9299, -85.956],
  ['san_juan_de_oriente', 'San Juan de Oriente', 11.9, -86.0667],
  ['juigalpa', 'Juigalpa', 12.1, -85.3667],
  ['matagalpa', 'Matagalpa', 12.9167, -85.9167],
  ['bluefields', 'Bluefields', 12.0136, -83.7634],
].map(([code, name, latitude, longitude]) => ({
  id: `city-${code}`,
  code: String(code),
  name: String(name),
  latitude: Number(latitude),
  longitude: Number(longitude),
  active: ACTIVE_CODES.has(String(code)),
}))

export interface MockOption {
  id: string
  code: string
  label: string
}

const options = (prefix: string, rows: [string, string][]): MockOption[] =>
  rows.map(([code, label]) => ({ id: `${prefix}-${code}`, code, label }))

export const BUSINESS_TYPES = options('business-type', [
  ['restaurante', 'Restaurante'],
  ['cafeteria', 'Cafetería'],
  ['panaderia', 'Panadería'],
  ['artesania', 'Artesanía'],
  ['otro', 'Otro'],
])

export const INSTITUTION_TYPES = options('institution-type', [
  ['casa_cultura', 'Casa de cultura'],
  ['fundacion', 'Fundación'],
  ['ticketera', 'Ticketera'],
  ['teatro', 'Teatro'],
])

/** Por qué rechaza el equipo una solicitud (`rechazo_verificacion`). */
export const REJECTION_REASONS: { code: string; label: string; requiresText: boolean }[] = [
  { code: 'documento_ilegible', label: 'El documento no se lee', requiresText: false },
  { code: 'documento_vencido', label: 'El documento está vencido', requiresText: false },
  { code: 'datos_no_coinciden', label: 'Los datos no coinciden con el documento', requiresText: false },
  { code: 'ruc_invalido', label: 'El RUC no es válido', requiresText: false },
  { code: 'ubicacion_incorrecta', label: 'La ubicación no es correcta', requiresText: false },
  { code: 'representacion_no_acreditada', label: 'No se acredita la representación', requiresText: false },
  { code: 'registro_duplicado', label: 'Ya existe un registro igual', requiresText: false },
  { code: 'otro', label: 'Otro motivo', requiresText: true },
]

export const cityByName = (name: string): MockCity | undefined =>
  CITIES.find((city) => city.name.localeCompare(name, 'es', { sensitivity: 'base' }) === 0)
