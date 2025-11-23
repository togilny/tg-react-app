import TodoItem from './TodoItem.jsx';

export default function TodoList({ todos, onToggle, onDelete }) {
  return (
    <div className="todo-grid">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  );
}

