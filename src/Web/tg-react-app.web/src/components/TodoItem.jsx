export default function TodoItem({ todo, onToggle, onDelete }) {
  const created = new Date(todo.createdAt).toLocaleString();
  const completedLabel = todo.isComplete ? 'Completed' : 'Pending';

  return (
    <article className={`todo-item ${todo.isComplete ? 'complete' : ''}`}>
      <div className="todo-title">
        <input
          type="checkbox"
          checked={todo.isComplete}
          onChange={() => onToggle(todo.id)}
          aria-label="Toggle completion"
        />
        <span>{todo.title}</span>
      </div>

      {todo.description && <p className="todo-description">{todo.description}</p>}

      <div className="todo-meta">
        Added on {created} · {completedLabel}
      </div>

      <div className="actions">
        <button
          className="outline"
          onClick={() => onToggle(todo.id)}
        >
          {todo.isComplete ? 'Mark as active' : 'Complete'}
        </button>
        <button className="danger" onClick={() => onDelete(todo.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

