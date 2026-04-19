// @ts-nocheck
// Lightweight authenticated fetch hook for Clerk-protected API calls.
import { useAuth } from '@clerk/clerk-react';

export function useAuthFetch() {
  const { getToken } = useAuth();
  return async (url, options = {}) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  };
}
