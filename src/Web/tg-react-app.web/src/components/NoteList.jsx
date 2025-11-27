import NoteItem from './NoteItem';

export default function NoteList({ notes, onDelete, onUpdate }) {
  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <p>No notes yet. Create your first note above!</p>
      </div>
    );
  }

  return (
    <div className="note-list">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

