export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
).replace(/\/$/, '');

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const TOKEN_KEY = 'vikha.token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — the session simply won't persist */
  }
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }

  /** First message for a given field, for inline form errors. */
  fieldError(field) {
    return this.details.find((d) => d.field === field)?.message;
  }
}

/**
 * Thin fetch wrapper. Always returns `data` on success and throws ApiError
 * (with per-field details) on failure, so callers never inspect envelopes.
 */
export async function apiFetch(path, { method = 'GET', body, token, auth = true, signal, cache } = {}) {
  const authToken = token ?? (auth ? getToken() : null);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      ...(cache ? { cache } : {}),
      headers: {
        ...(body instanceof FormData ? {} : body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(
      'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
      0
    );
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || payload?.success === false) {
    throw new ApiError(
      payload?.error?.message || `Request failed (${res.status})`,
      res.status,
      payload?.error?.details
    );
  }

  return { data: payload?.data, meta: payload?.meta };
}

/* ----------------------------- endpoints ----------------------------- */

export const api = {
  // auth
  register: (body) => apiFetch('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body, auth: false }),
  me: (token) => apiFetch('/auth/me', { token }),
  updateMe: (body) => apiFetch('/auth/me', { method: 'PATCH', body }),
  changePassword: (body) => apiFetch('/auth/change-password', { method: 'POST', body }),

  // seekers
  listSeekers: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
    ).toString();
    return apiFetch(`/seekers${qs ? `?${qs}` : ''}`, { auth: false });
  },
  mapSeekers: ({ live } = {}) =>
    apiFetch(`/seekers/map${live ? '?live=true' : ''}`, { auth: false }),
  districts: () => apiFetch('/seekers/districts', { auth: false }),
  getSeeker: (slug) => apiFetch(`/seekers/${encodeURIComponent(slug)}`, { auth: false }),
  createSeeker: (body) => apiFetch('/seekers', { method: 'POST', body }),
  updateSeeker: (id, body) => apiFetch(`/seekers/${id}`, { method: 'PATCH', body }),
  myProfile: () => apiFetch('/seekers/me/profile'),
  updateMyLocation: (body) => apiFetch('/seekers/me/location', { method: 'PATCH', body }),
  stopSharingLocation: () => apiFetch('/seekers/me/location', { method: 'DELETE' }),

  // donations
  donate: (body) => apiFetch('/donations', { method: 'POST', body, auth: true }),
  receipt: (receiptNo) => apiFetch(`/donations/receipt/${receiptNo}`, { auth: false }),
  myDonations: (params = {}) =>
    apiFetch(`/donations/mine?${new URLSearchParams(params)}`),
  receivedDonations: (params = {}) =>
    apiFetch(`/donations/received?${new URLSearchParams(params)}`),

  // stats + ai
  overview: () => apiFetch('/stats/overview', { auth: false, cache: 'no-store' }),
  leaderboard: () => apiFetch('/stats/leaderboard', { auth: false }),
  dua: (body) => apiFetch('/ai/dua', { method: 'POST', body, auth: false }),

  // uploads
  uploadStatus: () => apiFetch('/uploads/status', { auth: false }),
  uploadImage: (file, kind = 'avatar') => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('kind', kind);
    return apiFetch('/uploads/image', { method: 'POST', body: fd });
  },

  // admin
  adminSeekers: (params = {}) =>
    apiFetch(`/admin/seekers?${new URLSearchParams(params)}`),
  reviewSeeker: (id, body) =>
    apiFetch(`/admin/seekers/${id}/review`, { method: 'PATCH', body }),
  adminDonations: (params = {}) =>
    apiFetch(`/admin/donations?${new URLSearchParams(params)}`),
  reviewDonation: (id, body) =>
    apiFetch(`/admin/donations/${id}/review`, { method: 'PATCH', body }),
};

/** Server-side fetch used by the seeker profile page for SEO. */
export async function fetchSeekerServerSide(slug) {
  try {
    const res = await fetch(`${API_URL}/seekers/${encodeURIComponent(slug)}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}
