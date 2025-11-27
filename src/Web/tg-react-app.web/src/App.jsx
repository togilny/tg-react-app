import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import NoteForm from './components/NoteForm.jsx';
import NoteList from './components/NoteList.jsx';
import useNotes from './hooks/useNotes.js';

function NotesApp() {
  const { user, logout } = useAuth();
  const {
    notes,
    isLoading,
    error,
    createNote,
    deleteNote,
    updateNote
  } = useNotes();

  return (
    <div className="app-shell">
      <header>
        <div className="header-content">
          <div>
            <h1>Notie</h1>
          </div>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <h2>Create New Note</h2>
          <NoteForm onSubmit={createNote} />
        </section>

        <section className="card">
          <h2>Your Notes</h2>
          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}

          {isLoading ? (
            <p>Loading your notes...</p>
          ) : (
            <NoteList notes={notes} onDelete={deleteNote} onUpdate={updateNote} />
          )}
        </section>
      </main>
    </div>
  );
}

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleLogin = async (username, password) => {
    try {
      setError('');
      await login(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (username, password) => {
    try {
      setError('');
      await register(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        {isLogin ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => {
              setIsLogin(false);
              setError('');
            }}
            error={error}
          />
        ) : (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => {
              setIsLogin(true);
              setError('');
            }}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return user ? <NotesApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
