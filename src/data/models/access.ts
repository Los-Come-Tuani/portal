import type { ISODate } from './common'

/**
 * Lo que puede hacer alguien del equipo de K'Plan. Los negocios y las
 * alcaldías no tienen permisos: su rol ya dice qué ven.
 */
export const PERMISSIONS = [
  'agenda.view',
  'organizations.review',
  'organizations.manage',
  'guides.review',
  'guides.decide',
  'places.manage',
  'content.moderate',
  'users.manage',
  'staff.manage',
  'billing.manage',
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
      { id: 'places.manage', label: 'Editar lugares', description: 'Edita la ficha de cualquier parada de la app.' },
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
      { id: 'billing.manage', label: 'Cobros y tarifas', description: 'Ve los cobros y cambia las tarifas de K\'Plan.' },
    ],
  },
]

export const PERMISSION_INFO: Record<Permission, PermissionInfo> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) => group.permissions).map((info) => [info.id, info]),
) as Record<Permission, PermissionInfo>

/** Un rol del equipo interno: un nombre y los permisos que da. */
export interface StaffRole {
  id: string
  name: string
  description: string
  permissions: Permission[]
  /** El rol de super admin: tiene todo y no se edita ni se borra. */
  system: boolean
  createdAt: ISODate
}

export type StaffRoleInput = Pick<StaffRole, 'name' | 'description' | 'permissions'>
