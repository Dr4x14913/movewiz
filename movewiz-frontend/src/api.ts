const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, options);
}
