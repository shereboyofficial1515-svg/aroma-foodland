// Aroma FoodLand — API client.
// Every network call to the backend goes through `api.request()` so error
// handling, credentials, and auth-refresh retry logic live in ONE place.

const API_BASE = window.AROMA_CONFIG?.apiBaseUrl || 'http://localhost:5000/api/v1';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshPromise = null;

async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// `body` may be a plain object (sent as JSON) or a FormData instance
// (sent as-is, for image uploads).
async function request(path, { method = 'GET', body, headers = {}, retry = true } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: isFormData ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  // Access token expired mid-session — try one silent refresh, then retry
  // the original request once before surfacing an auth error to the caller.
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, headers, retry: false });
  }

  let json = null;
  try { json = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const message = json?.error?.message || 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status, json?.error?.code);
  }

  return json;
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
};

window.AromaApi = api;
window.ApiError = ApiError;
