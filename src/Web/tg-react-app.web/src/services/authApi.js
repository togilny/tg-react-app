const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const toJson = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await toJson(response);
    const message = payload?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return toJson(response);
};

export const login = (username, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const register = (username, password) =>
  request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

