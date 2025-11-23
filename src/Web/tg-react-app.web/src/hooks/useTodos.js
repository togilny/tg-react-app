import { useCallback, useEffect, useState } from 'react';
import {
  createTodo as createTodoRequest,
  deleteTodo as deleteTodoRequest,
  fetchTodos,
  updateTodo
} from '../services/todoApi.js';

export default function useTodos() {
  const [todos, setTodos] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async (fn) => {
    try {
      setError(null);
      return await fn();
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
      console.error(err);
      throw err;
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await execute(async () => {
      const data = await fetchTodos();
      setTodos(data);
    });
    setLoading(false);
  }, [execute]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTodo = useCallback(
    async (payload) => {
      await execute(async () => {
        const created = await createTodoRequest(payload);
        setTodos((current) => [created, ...current]);
      });
    },
    [execute]
  );

  const deleteTodo = useCallback(
    async (id) => {
      await execute(async () => {
        await deleteTodoRequest(id);
        setTodos((current) => current.filter((todo) => todo.id !== id));
      });
    },
    [execute]
  );

  const toggleTodo = useCallback(
    async (id) => {
      const target = todos.find((todo) => todo.id === id);
      if (!target) {
        return;
      }

      await execute(async () => {
        const updated = await updateTodo(id, {
          title: target.title,
          description: target.description,
          isComplete: !target.isComplete
        });

        setTodos((current) =>
          current.map((todo) => (todo.id === id ? updated : todo))
        );
      });
    },
    [execute, todos]
  );

  return {
    todos,
    isLoading,
    error,
    createTodo,
    deleteTodo,
    toggleTodo
  };
}

