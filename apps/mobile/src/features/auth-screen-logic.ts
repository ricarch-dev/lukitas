import { ApiError } from '../api/client.ts';

export type AuthMode = 'sign-in' | 'create-account';
export type AuthAction = 'login' | 'register';

export function getAuthAction(mode: AuthMode): AuthAction {
  return mode === 'sign-in' ? 'login' : 'register';
}

export function getOtherAuthMode(mode: AuthMode): AuthMode {
  return mode === 'sign-in' ? 'create-account' : 'sign-in';
}

export function getAuthErrorMessage(error: unknown, mode: AuthMode): string {
  if (error instanceof ApiError) {
    if (mode === 'create-account' && (error.status === 409 || error.code === 'CONFLICT'))
      return 'Ya existe una cuenta con este correo. Inicia sesión o utiliza otro correo.';
    if (mode === 'sign-in' && (error.status === 401 || error.code === 'UNAUTHORIZED'))
      return 'El correo o la contraseña no coinciden. Verifica tus datos e inténtalo de nuevo.';
    if (error.status >= 500)
      return 'No pudimos completar la solicitud en este momento. Inténtalo más tarde.';
  }

  if (error instanceof Error) {
    if (error.message === 'A valid email is required')
      return 'Ingresa un correo electrónico válido.';
    if (error.message === 'Password must contain at least 8 characters')
      return 'La contraseña debe tener al menos 8 caracteres.';
    if (error.message === 'Password is required') return 'Ingresa tu contraseña.';
    if (/network|fetch failed|failed to fetch/i.test(error.message))
      return 'No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.';
  }

  return 'No pudimos completar la solicitud. Inténtalo de nuevo.';
}
