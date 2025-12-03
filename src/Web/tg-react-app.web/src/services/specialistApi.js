const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const getToken = () => localStorage.getItem('authToken');

const toJson = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

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
    throw new Error(message);
  }

  return toJson(response);
};

export const fetchSpecialists = (category = null) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/specialists${query}`);
};

export const fetchSpecialistById = (id) => request(`/api/specialists/${id}`);

export const fetchMyProfile = () => request('/api/specialists/my-profile');

export const createSpecialist = (payload) =>
  request('/api/specialists', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateSpecialist = (id, payload) =>
  request(`/api/specialists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteSpecialist = (id) =>
  request(`/api/specialists/${id}`, {
    method: 'DELETE'
  });

