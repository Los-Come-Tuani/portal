interface ImportMetaEnv {
  /** URL base de la API, sin "/" al final. Obligatoria salvo en modo demo. */
  readonly VITE_API_URL?: string
  /** `true` activa el modo demo (backend simulado en el navegador). */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
