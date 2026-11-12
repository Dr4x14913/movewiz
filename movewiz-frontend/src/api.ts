// Empty base (default) keeps requests relative to the current origin;
// in prod, nginx proxies /api/ to the backend.
// In local dev, VITE_BACKEND_BASE_URL can point at the backend directly (e.g. http://localhost:3033).
const BASE = import.meta.env.VITE_BACKEND_BASE_URL ?? '';

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, options);
}
