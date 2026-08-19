/**
 * Safely extract a human-readable error message from any value.
 * Guarantees that '[object Object]' is never rendered to the user.
 */
export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err === null || err === undefined) {
    return fallback;
  }

  // If it's already a string
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === 'null' || trimmed === 'undefined') {
      return fallback;
    }
    return trimmed;
  }

  // If it's an Error instance or object
  if (typeof err === 'object') {
    const obj = err as Record<string, any>;

    // 1. Direct string message property
    if (typeof obj.message === 'string' && obj.message.trim() && obj.message !== '[object Object]') {
      return obj.message.trim();
    }

    // 2. Direct string error property
    if (typeof obj.error === 'string' && obj.error.trim() && obj.error !== '[object Object]') {
      return obj.error.trim();
    }

    // 3. Nested data object
    if (obj.data && typeof obj.data === 'object') {
      if (typeof obj.data.message === 'string' && obj.data.message.trim() && obj.data.message !== '[object Object]') {
        return obj.data.message.trim();
      }
      if (typeof obj.data.error === 'string' && obj.data.error.trim() && obj.data.error !== '[object Object]') {
        return obj.data.error.trim();
      }
    }

    // 4. Nested response object (e.g. from Axios or custom wrapper)
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, any>;
      if (typeof resp.data?.message === 'string' && resp.data.message.trim()) {
        return resp.data.message.trim();
      }
      if (typeof resp.data?.error === 'string' && resp.data.error.trim()) {
        return resp.data.error.trim();
      }
      if (typeof resp.statusText === 'string' && resp.statusText.trim()) {
        return resp.statusText.trim();
      }
    }

    // 5. Status text
    if (typeof obj.statusText === 'string' && obj.statusText.trim()) {
      return obj.statusText.trim();
    }
  }

  return fallback;
}
