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

export const fetchBookings = () => request('/api/bookings');

export const fetchBookedSlots = (specialistId, date) => {
  const dateStr = date.toISOString().split('T')[0];
  return request(`/api/bookings/specialist/${specialistId}/date/${dateStr}`);
};

export const createBooking = (payload) =>
  request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const cancelBooking = (id) =>
  request(`/api/bookings/${id}`, {
    method: 'DELETE'
  });

