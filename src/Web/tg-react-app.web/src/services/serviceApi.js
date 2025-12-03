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

export const fetchServices = (category = null) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/services${query}`);
};

export const fetchServiceById = (id) => request(`/api/services/${id}`);

export const createService = (payload) =>
  request('/api/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateService = (id, payload) =>
  request(`/api/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteService = (id) =>
  request(`/api/services/${id}`, {
    method: 'DELETE'
  });

// Specialist-specific service management
export const fetchMyServices = () => request('/api/services/my-services');

export const fetchServicesBySpecialist = (specialistId, category = null) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/services/by-specialist/${specialistId}${query}`);
};

export const createMyService = (payload) =>
  request('/api/services/my-services', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateMyService = (id, payload) =>
  request(`/api/services/my-services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteMyService = (id) =>
  request(`/api/services/my-services/${id}`, {
    method: 'DELETE'
  });

