import type { ISODate } from './common'

/**
 * Lo que puede hacer alguien del equipo de K'Plan. Los negocios y las
 * alcaldías no tienen permisos: su rol ya dice qué ven.
 *
 * Son los mismos identificadores que entrega el API (`GET /auth/staff-permission/`).
 */
export const PERMISSIONS = [
  'agenda.view',
  'organizations.view',
  'organizations.review',
  'organizations.manage',
  'guides.view',
  'guides.review',
  'guides.decide',
  'places.view',
  'places.manage',
  'circuits.view',
  'circuits.manage',
  'content.moderate',
  'users.view',
  'users.manage',
  'staff.manage',
  'billing.view',
  'billing.manage',
  'demos.view',
  'demos.manage',
  'releases.view',
  'releases.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export interface PermissionInfo {
  id: Permission
  label: string
  description: string
}

/** Los permisos agrupados por módulo, en el orden en que se muestran. */
export const PERMISSION_GROUPS: { label: string; permissions: PermissionInfo[] }[] = [
  {
    label: 'Agenda',
    permissions: [
      {
        id: 'agenda.view',
        label: 'Ver la agenda',
        description: "La semana de llegadas de todos los lugares de K'Plan.",
      },
    ],
  },
  {
    label: 'Organizaciones',
    permissions: [
      {
        id: 'organizations.view',
        label: 'Ver organizaciones',
        description: 'Ve las organizaciones y sus solicitudes sin poder cambiarlas.',
      },
      {
        id: 'organizations.review',
        label: 'Admitir organizaciones',
        description: 'Aprueba o rechaza los negocios y alcaldías nuevos.',
      },
      {
        id: 'organizations.manage',
        label: 'Administrar organizaciones',
        description: 'Crea, edita, suspende y reactiva organizaciones.',
      },
    ],
  },
  {
    label: 'Guías y traductores',
    permissions: [
      {
        id: 'guides.view',
        label: 'Ver solicitudes',
        description: 'Ve las solicitudes de guías y traductores sin poder revisarlas.',
      },
      {
        id: 'guides.review',
        label: 'Revisar solicitudes',
        description: 'Revisa documentos y antecedentes, y pide correcciones.',
      },
      {
        id: 'guides.decide',
        label: 'Decidir solicitudes',
        description: 'Da la decisión final: aprueba o rechaza al guía o traductor.',
      },
    ],
  },
  {
    label: 'Contenido',
    permissions: [
      {
        id: 'places.view',
        label: 'Ver lugares',
        description: 'Ve la ficha de cualquier parada de la app sin poder editarla.',
      },
      { id: 'places.manage', label: 'Editar lugares', description: 'Edita la ficha de cualquier parada de la app.' },
      {
        id: 'circuits.view',
        label: 'Ver circuitos',
        description: 'Ve los circuitos de la app sin poder editarlos.',
      },
      {
        id: 'circuits.manage',
        label: 'Circuitos',
        description: "Crea y edita los circuitos de la app, incluidos los especiales de K'Plan y sus insignias extra.",
      },
      {
        id: 'content.moderate',
        label: 'Moderar contenido',
        description: 'Cupones, eventos y campañas de insignias de todas las organizaciones.',
      },
    ],
  },
  {
    label: 'Usuarios',
    permissions: [
      {
        id: 'users.view',
        label: 'Ver usuarios',
        description: 'Ve a todos los usuarios sin poder suspenderlos ni cambiarlos.',
      },
      {
        id: 'users.manage',
        label: 'Administrar usuarios',
        description: 'Ve a todos los usuarios, suspende y reactiva cuentas.',
      },
      {
        id: 'staff.manage',
        label: 'Administrar el equipo',
        description: 'Invita a personas del equipo, les asigna un rol y edita los roles.',
      },
    ],
  },
  {
    label: 'Finanzas',
    permissions: [
      {
        id: 'billing.view',
        label: 'Ver cobros y tarifas',
        description: "Ve los cobros y las tarifas de K'Plan sin poder cambiarlos.",
      },
      { id: 'billing.manage', label: 'Cobros y tarifas', description: "Ve los cobros y cambia las tarifas de K'Plan." },
    ],
  },
  {
    label: 'Sitio web',
    permissions: [
      {
        id: 'demos.view',
        label: 'Ver solicitudes de demo',
        description: 'Ve quién pidió una demostración desde la landing, sin poder atenderla.',
      },
      {
        id: 'demos.manage',
        label: 'Atender solicitudes de demo',
        description: 'Marca las solicitudes de demo como entregadas o pendientes, anota el seguimiento y recibe el aviso de cada una nueva.',
      },
      {
        id: 'releases.view',
        label: 'Ver versiones de la app',
        description: 'Ve las versiones de la app, sus links y cuál se entrega a quien pide una demo.',
      },
      {
        id: 'releases.manage',
        label: 'Publicar versiones de la app',
        description: 'Registra cada versión (Android, macOS, Windows) con el link de Drive de su instalador, la publica y la retira.',
      },
    ],
  },
]

export const PERMISSION_INFO: Record<Permission, PermissionInfo> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) => group.permissions).map((info) => [info.id, info]),
) as Record<Permission, PermissionInfo>

/**
 * Quién da, además, el permiso de solo ver: quien puede revisar o administrar un módulo
 * también lo ve, sin marcar las dos casillas. El API ya entrega la sesión expandida; esto
 * sirve para mostrarlo en el editor de roles y para la demostración.
 */
export const IMPLIED_BY: Partial<Record<Permission, readonly Permission[]>> = {
  'billing.view': ['billing.manage'],
  'circuits.view': ['circuits.manage'],
  'demos.view': ['demos.manage'],
  'guides.view': ['guides.review', 'guides.decide'],
  'organizations.view': ['organizations.review', 'organizations.manage'],
  'places.view': ['places.manage'],
  'releases.view': ['releases.manage'],
  'users.view': ['users.manage'],
}

/** ¿Algún permiso marcado ya incluye este (el de solo ver de su módulo)? */
export function isImplied(permission: Permission, selected: readonly Permission[]): boolean {
  return (IMPLIED_BY[permission] ?? []).some((stronger) => selected.includes(stronger))
}

/** Los permisos concedidos más los de solo ver que se desprenden de ellos. */
export function expandPermissions(granted: readonly Permission[]): Permission[] {
  return PERMISSIONS.filter((permission) => granted.includes(permission) || isImplied(permission, granted))
}

/** Un rol del equipo interno: un nombre y los permisos que da. */
export interface StaffRole {
  id: string
  name: string
  description: string
  permissions: Permission[]
  /** El rol de super admin: tiene todo y no se edita ni se borra. */
  system: boolean
  /** Quien lo tenga tiene que activar la verificación en dos pasos. */
  requiresTwoFactor: boolean
  /** Cuántas personas del equipo lo tienen. */
  members: number
  createdAt: ISODate
}

export type StaffRoleInput = Pick<StaffRole, 'name' | 'description' | 'permissions' | 'requiresTwoFactor'>

/** Una persona del equipo de K'Plan, con su rol del equipo (`null` en un superusuario sin rol). */
export interface StaffMember {
  id: string
  name: string
  email: string
  role: { id: string; name: string } | null
  status: 'active' | 'suspended' | 'invited'
  createdAt: ISODate
}
