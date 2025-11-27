import { useState } from 'react';

export default function RegisterForm({ onRegister, onSwitchToLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!username.trim() || !password || !confirmPassword) {
      setValidationError('All fields are required');
      return;
    }

    if (username.trim().length < 3) {
      setValidationError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await onRegister(username.trim(), password);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Create an Account</h2>
      <form onSubmit={handleSubmit}>
        {(error || validationError) && (
          <div className="error-message" role="alert">
            {validationError || error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username (min 3 characters)"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (min 6 characters)"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            disabled={isLoading}
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Register'}
        </button>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="link-button">
            Login here
          </button>
        </p>
      </form>
    </div>
  );
}

