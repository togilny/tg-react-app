import { useCallback, useEffect, useState } from 'react';
import {
  createNote as createNoteRequest,
  deleteNote as deleteNoteRequest,
  fetchNotes,
  updateNote
} from '../services/noteApi.js';

export default function useNotes() {
  const [notes, setNotes] = useState([]);
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
      const data = await fetchNotes();
      setNotes(data);
    });
    setLoading(false);
  }, [execute]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createNote = useCallback(
    async (payload) => {
      await execute(async () => {
        const created = await createNoteRequest(payload);
        setNotes((current) => [created, ...current]);
      });
    },
    [execute]
  );

  const deleteNote = useCallback(
    async (id) => {
      await execute(async () => {
        await deleteNoteRequest(id);
        setNotes((current) => current.filter((note) => note.id !== id));
      });
    },
    [execute]
  );

  const updateNoteContent = useCallback(
    async (id, title, content) => {
      await execute(async () => {
        const updated = await updateNote(id, { title, content });
        setNotes((current) =>
          current.map((note) => (note.id === id ? updated : note))
        );
      });
    },
    [execute]
  );

  return {
    notes,
    isLoading,
    error,
    createNote,
    deleteNote,
    updateNote: updateNoteContent
  };
}

