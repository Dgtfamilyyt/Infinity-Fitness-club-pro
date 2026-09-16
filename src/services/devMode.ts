/**
 * Development / Demo Mode Guard
 * 
 * In production, operational data (members, staff, payments, attendance) must NEVER
 * silently fallback to demo seed records (e.g. Arun Patel, fake payments, fake attendance).
 * 
 * Demo seed fallback is only permitted when explicitly enabled via `?demo=true` in the URL
 * or `window.localStorage.getItem('INFINITY_DEV_DEMO') === 'true'`.
 */
export const isDevDemoEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') return true;
    if (window.localStorage.getItem('INFINITY_DEV_DEMO') === 'true') return true;
  } catch {
    return false;
  }
  return false;
};
