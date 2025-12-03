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

export const fetchClients = () => request('/api/clients');

export const fetchClientById = (id) => request(`/api/clients/${id}`);

export const createClient = (payload) =>
  request('/api/clients', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateClient = (id, payload) =>
  request(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteClient = (id) =>
  request(`/api/clients/${id}`, {
    method: 'DELETE'
  });

export const fetchClientPrices = (clientId) => 
  request(`/api/clients/${clientId}/prices`);

export const setClientServicePrice = (clientId, serviceId, customPrice) =>
  request(`/api/clients/${clientId}/prices`, {
    method: 'POST',
    body: JSON.stringify({ clientId, serviceId, customPrice })
  });

export const deleteClientServicePrice = (clientId, serviceId) =>
  request(`/api/clients/${clientId}/prices/${serviceId}`, {
    method: 'DELETE'
  });

