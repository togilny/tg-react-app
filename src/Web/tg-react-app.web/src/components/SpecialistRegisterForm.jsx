import { useState } from 'react';
import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

export default function SpecialistRegisterForm({ onRegister, onSwitchToLogin, onSwitchToRegular, error }) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specialistCode, setSpecialistCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <Box sx={{ 
      bgcolor: 'background.paper', 
      borderRadius: 2, 
      p: { xs: 3, sm: 4 }, 
      boxShadow: 3,
      border: 1,
      borderColor: 'divider',
      maxWidth: 450,
      mx: 'auto',
    }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
        Register as a Specialist
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        {(error || validationError) && (
          <Box 
            role="alert"
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'error.dark',
              color: 'error.contrastText',
              borderRadius: 1,
              border: 1,
              borderColor: 'error.main',
            }}
          >
            {validationError || error}
          </Box>
        )}
        
        <Box sx={{ mb: 2 }}>
          <TextField
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username (min 3 characters)"
            disabled={isLoading}
            required
            fullWidth
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            id="firstName"
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            disabled={isLoading}
            required
            fullWidth
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            id="lastName"
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            disabled={isLoading}
            required
            fullWidth
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            id="specialistCode"
            label="Specialist Registration Code"
            type="text"
            value={specialistCode}
            onChange={(e) => setSpecialistCode(e.target.value)}
            placeholder="Enter your specialist code"
            disabled={isLoading}
            required
            fullWidth
            helperText="Required to register as a specialist and offer services."
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (min 6 characters)"
            disabled={isLoading}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            id="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            disabled={isLoading}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Button 
          type="submit" 
          variant="contained" 
          disabled={isLoading} 
          fullWidth
          size="large"
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Creating account...' : 'Register as Specialist'}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 1 }}>
          Looking to register as a regular user?{' '}
          <Button 
            variant="text" 
            onClick={onSwitchToRegular}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Register here
          </Button>
        </Typography>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Already have an account?{' '}
          <Button 
            variant="text" 
            onClick={onSwitchToLogin}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Login here
          </Button>
        </Typography>
      </Box>
    </Box>
  );
}

