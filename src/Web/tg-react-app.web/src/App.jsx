import TodoForm from './components/TodoForm.jsx';
import TodoList from './components/TodoList.jsx';
import EmptyState from './components/EmptyState.jsx';
import useTodos from './hooks/useTodos.js';

export default function App() {
  const {
    todos,
    isLoading,
    error,
    createTodo,
    deleteTodo,
    toggleTodo
  } = useTodos();

  return (
    <div className="app-shell">
      <header>
        <h1>Delivery Planner</h1>
        <p className="subtitle">
          Minimal .NET + React sample. Capture the next action, toggle progress, and stay focused.
        </p>
      </header>

      <main className="content">
        <section className="card">
          <TodoForm onSubmit={createTodo} />
        </section>

        <section className="card">
          {error && (
            <div role="alert" style={{ marginBottom: '1rem', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <p>Loading your tasks...</p>
          ) : todos.length === 0 ? (
            <EmptyState />
          ) : (
            <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
          )}
        </section>
      </main>
    </div>
  );
}

