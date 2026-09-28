import type { AuthResponseDto, LoginRequest, RegisterRequest } from '@lukitas/contracts';
import { isValidRegistrationPassword, normalizeAuthEmail } from '@lukitas/domain';
import type { ApiClient, SessionTokens } from '../api/client.ts';

type AuthAction = 'login' | 'register';
type AuthRequest = LoginRequest | RegisterRequest;
type AuthSession = Pick<ApiClient, 'post'> & { setTokens: (tokens: SessionTokens) => Promise<void> | void };

export async function submitAuth(
  action: AuthAction,
  credentials: AuthRequest,
  session: AuthSession,
): Promise<void> {
  const email = normalizeAuthEmail(credentials.email);
  if (!email) throw new Error('A valid email is required');
  if (action === 'register' && !isValidRegistrationPassword(credentials.password))
    throw new Error('Password must contain at least 8 characters');
  if (!credentials.password) throw new Error('Password is required');

  const result: AuthResponseDto = await session.post<AuthResponseDto>(
    action === 'register' ? '/auth/register' : '/auth/login',
    { email, password: credentials.password },
  );
  if (!result || typeof result.accessToken !== 'string' || !result.accessToken ||
      typeof result.refreshToken !== 'string' || !result.refreshToken)
    throw new Error('Invalid authentication response');
  await session.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
}
