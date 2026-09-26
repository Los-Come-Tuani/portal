import type { PortalRole } from '@/data/models'

/** Cuentas del modo demo: cualquier contraseña sirve, el correo decide el rol. */
export const DEMO_ACCOUNTS: { email: string; role: PortalRole; label: string; detail: string }[] = [
  { email: 'cocina@kplan.demo', role: 'negocio', label: 'Cocina de Doña Tere', detail: 'Restaurante en Granada' },
  { email: 'finca@kplan.demo', role: 'negocio', label: 'Finca El Mirador', detail: 'Finca cafetalera, 4 lugares' },
  { email: 'tabacalera@kplan.demo', role: 'negocio', label: 'Tabacalera artesanal', detail: 'Estelí, campaña activa' },
  { email: 'leon@kplan.demo', role: 'alcaldia', label: 'Alcaldía de León', detail: '5 lugares públicos' },
  { email: 'masaya@kplan.demo', role: 'alcaldia', label: 'Alcaldía de Masaya', detail: '4 lugares públicos' },
  { email: 'admin@kplan.demo', role: 'admin', label: 'Sofía Lacayo', detail: 'Super admin: todo el portal' },
  { email: 'coordinacion@kplan.demo', role: 'admin', label: 'Raquel Úbeda', detail: 'Revisa y decide guías y traductores' },
  { email: 'verificacion@kplan.demo', role: 'admin', label: 'Daniela Jarquín', detail: 'Sólo revisa guías y traductores' },
  { email: 'admision@kplan.demo', role: 'admin', label: 'Iván Solórzano', detail: 'Admite organizaciones nuevas' },
]
