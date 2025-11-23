import { useState } from 'react';

const initialForm = {
  title: '',
  description: ''
};

export default function TodoForm({ onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null
      });
      setForm(initialForm);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title
        <input
          name="title"
          placeholder="Sync backlog with design team"
          value={form.title}
          onChange={handleChange}
          disabled={isSubmitting}
          required
          maxLength={100}
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          placeholder="Optional context that helps future-you."
          value={form.description}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={500}
        />
      </label>

      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add task'}
      </button>
    </form>
  );
}

