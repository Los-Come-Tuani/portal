import type { ISODate } from './common'
import type { SessionUser } from './user'

/** El segundo factor (TOTP) de quien está dentro. */
export interface TwoFactorStatus {
  enabled: boolean
  /** Se empezó a activar pero falta confirmar con un código de la app. */
  pending: boolean
  confirmedAt: ISODate | null
  /** Códigos de recuperación que todavía sirven. */
  recoveryCodes: number
}

/** Lo que entrega empezar a activar el 2FA. */
export interface TwoFactorSetup {
  /** La clave para escribirla a mano en la app de autenticación. */
  secret: string
  /** `otpauth://...`: es lo que lleva el QR. */
  uri: string
}

export interface ResetPasswordInput {
  email: string
  /** Seis dígitos, llegan por correo. */
  code: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  password: string
}

export interface DisableTwoFactorInput {
  code: string
  password: string
}

/** El resultado de enviar correo y contraseña. */
export type LoginResult =
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'two-factor'; expiresIn: number }
