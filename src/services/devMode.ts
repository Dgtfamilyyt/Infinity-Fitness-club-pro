/**
 * Development / Demo Mode Guard
 * 
 * In production (import.meta.env.DEV === false), demo mode is completely disabled.
 * Demo seed fallback is only permitted during local development (import.meta.env.DEV === true)
 * when explicitly requested via `?demo=true` or `localStorage.INFINITY_DEV_DEMO=true`.
 */
export const isDevDemoEnabled = (): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);

    if (params.get('demo') === 'true') {
      return true;
    }

    if (window.localStorage.getItem('INFINITY_DEV_DEMO') === 'true') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};
