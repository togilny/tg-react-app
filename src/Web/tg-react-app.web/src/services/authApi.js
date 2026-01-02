const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const toJson = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const getToken = () => localStorage.getItem('authToken');

const request = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await toJson(response);
    const message = payload?.message ?? `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return toJson(response);
};

export const login = (username, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const register = (username, password, displayName = null, specialistCode = null) =>
  request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName, specialistCode })
  });

export const fetchMyProfile = () => request('/api/users/me');

export const updateMyProfile = (updates) =>
  request('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });

