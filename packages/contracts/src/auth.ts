export interface AuthUserDto { readonly id: string; readonly email: string; readonly onboardingComplete: boolean; }
export interface AuthResponseDto { readonly user: AuthUserDto; readonly accessToken: string; readonly refreshToken: string; }
export interface RegisterRequest { readonly email: string; readonly password: string; }
export interface LoginRequest { readonly email: string; readonly password: string; }
