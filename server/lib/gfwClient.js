// Global Fishing Watch API client with simple in-memory caching.
// All routes that need GFW data import from here.

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org';

// Cache: { [cacheKey]: { data, ts } }
const _cache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Authenticated fetch to the GFW API.
 * Results are cached in-memory for CACHE_TTL_MS to avoid hitting rate limits.
 *
 * @param {string} path  - e.g. '/v3/events?...'
 * @param {RequestInit} options - optional fetch options (method, body, etc.)
 */
export async function gfwFetch(path, options = {}) {
  const token = process.env.GFW_API_TOKEN;
  if (!token) throw new Error('GFW_API_TOKEN is not set in server/.env');

  // Use path + serialised body as cache key
  const cacheKey = path + (options.body || '');
  const cached = _cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`${GFW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GFW API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  _cache[cacheKey] = { data, ts: Date.now() };
  return data;
}

// Returns "YYYY-MM-DD" for N days ago
export function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export const today = () => new Date().toISOString().split('T')[0];
