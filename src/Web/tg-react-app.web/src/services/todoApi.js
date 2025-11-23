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

export const fetchTodos = () => request('/api/todos');

export const createTodo = (payload) =>
  request('/api/todos', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateTodo = (id, payload) =>
  request(`/api/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteTodo = (id) =>
  request(`/api/todos/${id}`, {
    method: 'DELETE'
  });

