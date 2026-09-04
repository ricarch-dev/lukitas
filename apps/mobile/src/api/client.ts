export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}
export interface ApiClientOptions {
  readonly baseUrl?: string;
  readonly getTokens?: () => SessionTokens | null;
  readonly setTokens?: (tokens: SessionTokens | null) => Promise<void> | void;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  constructor(private readonly options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:3000/v1';
  }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const tokens = this.options.getTokens?.();
    if (tokens) headers.set('authorization', `Bearer ${tokens.accessToken}`);
    let response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && tokens?.refreshToken) {
      const refreshed = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (refreshed.ok) {
        const next = (await refreshed.json()) as SessionTokens;
        await this.options.setTokens?.(next);
        headers.set('authorization', `Bearer ${next.accessToken}`);
        response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
      }
    }
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ code: 'HTTP_ERROR', message: response.statusText }));
      throw new ApiError(
        error.code ?? 'HTTP_ERROR',
        error.message ?? 'Request failed',
        response.status,
      );
    }
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  }
  get<T>(path: string) {
    return this.request<T>(path);
  }
  post<T>(path: string, body: unknown, idempotencyKey?: string) {
    return this.request<T>(path, {
      method: 'POST',
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
      body: JSON.stringify(body),
    });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  categories(includeArchived = false) {
    return this.get<Array<{ id: string; name: string; archived: boolean }>>(
      `/categories?includeArchived=${includeArchived}`,
    );
  }
  budgets(month?: string) {
    return this.get<Array<unknown>>(
      `/budgets${month ? `?month=${encodeURIComponent(month)}` : ''}`,
    );
  }
  recurringRules() {
    return this.get<Array<unknown>>('/recurring-rules');
  }
  report(query: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.get<unknown>(`/reports?${params}`);
  }
}
