/** The only file that calls fetch(). Everything else goes through the *Api modules. */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api').replace(/\/$/, '');
const TOKEN_KEY = 'studydesk.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.', 0);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    // A 401 while holding a token means the session is over. (Login failures have no token yet.)
    if (res.status === 401 && token) { tokenStore.clear(); onUnauthorized?.(); }
    throw new ApiError(json?.error?.code ?? 'UNKNOWN_ERROR', json?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form),
  delete: <T>(path: string) => request<T>('DELETE', path),
  async stream(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    let res: Response;
    const token = tokenStore.get();
    try {
      res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.', 0);
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      if (res.status === 401 && token) { tokenStore.clear(); onUnauthorized?.(); }
      throw new ApiError(json?.error?.code ?? 'UNKNOWN_ERROR', json?.error?.message ?? `Request failed (${res.status})`, res.status);
    }
    if (!res.body) throw new ApiError('EMPTY_STREAM', 'The answer service returned an empty response.', res.status);
    return res;
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
