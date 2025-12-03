import { useState } from 'react';

export default function SpecialistRegisterForm({ onRegister, onSwitchToLogin, onSwitchToRegular, error }) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialistCode, setSpecialistCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!username.trim() || !firstName.trim() || !lastName.trim() || !specialistCode.trim() || !password || !confirmPassword) {
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
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await onRegister(username.trim(), password, displayName, specialistCode.trim());
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Register as a Specialist</h2>
      <form onSubmit={handleSubmit}>
        {(error || validationError) && (
          <div className="error-message" role="alert">
            {validationError || error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="username">Username *</label>
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
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="specialistCode">Specialist Registration Code *</label>
          <input
            id="specialistCode"
            type="text"
            value={specialistCode}
            onChange={(e) => setSpecialistCode(e.target.value)}
            placeholder="Enter your specialist code"
            disabled={isLoading}
            required
          />
          <small style={{ color: '#a1a1aa', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
            Required to register as a specialist and offer services.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password *</label>
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
          <label htmlFor="confirmPassword">Confirm Password *</label>
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
          {isLoading ? 'Creating account...' : 'Register as Specialist'}
        </button>

        <p className="auth-switch" style={{ marginBottom: '0.5rem' }}>
          Looking to register as a regular user?{' '}
          <button type="button" onClick={onSwitchToRegular} className="link-button">
            Register here
          </button>
        </p>

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

