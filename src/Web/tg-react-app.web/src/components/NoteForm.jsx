import { useState } from 'react';

export default function NoteForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({ title: title.trim(), content: content.trim() });
    setTitle('');
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="note-form">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="note-title-input"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note here... (Markdown supported: **bold**, *italic*, # heading, - lists, etc.)"
        className="note-content-input"
        rows="4"
      />
      <button type="submit" disabled={!title.trim()}>
        Add Note
      </button>
    </form>
  );
}

