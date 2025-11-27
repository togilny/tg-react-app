import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function NoteItem({ note, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(note.id, editTitle.trim(), editContent.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isEditing) {
    return (
      <div className="note-item editing">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="note-title-input"
          autoFocus
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="note-content-input"
          rows="6"
          placeholder="Markdown supported: **bold**, *italic*, # heading, - lists, etc."
        />
        <div className="note-actions">
          <button onClick={handleSave} className="btn-save">
            Save
          </button>
          <button onClick={handleCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-item">
      <div className="note-header">
        <h3 className="note-title">{note.title}</h3>
        <span className="note-date">{formatDate(note.updatedAt)}</span>
      </div>
      <div className="note-content markdown-content">
        {note.content ? (
          <ReactMarkdown>{note.content}</ReactMarkdown>
        ) : (
          <p className="empty-note">No content</p>
        )}
      </div>
      <div className="note-actions">
        <button onClick={() => setIsEditing(true)} className="btn-edit">
          Edit
        </button>
        <button onClick={() => onDelete(note.id)} className="btn-delete">
          Delete
        </button>
      </div>
    </div>
  );
}

