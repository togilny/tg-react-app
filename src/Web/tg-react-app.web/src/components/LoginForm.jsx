import { useState } from 'react';
import { Box, Button, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useThemeMode } from '../contexts/ThemeModeContext.jsx';

export default function LoginForm({ onLogin, onSwitchToRegister, error }) {
  const { mode, toggleMode } = useThemeMode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    try {
      await onLogin(username.trim(), password);
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
      position: 'relative',
      maxWidth: 450,
      mx: 'auto',
    }}>
      <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
        <IconButton
          aria-label={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={toggleMode}
          size="small"
          sx={{ position: 'absolute', top: 16, right: 16, border: 1, borderColor: 'divider' }}
        >
          {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 700, textAlign: 'center' }}>
        LookBook
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        {error && (
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
            {error}
          </Box>
        )}
        
        <Box sx={{ mb: 2 }}>
          <TextField
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={isLoading}
            required
            fullWidth
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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

        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || !username.trim() || !password}
          fullWidth
          size="large"
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Don't have an account?{' '}
          <Button 
            variant="text" 
            onClick={onSwitchToRegister}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Register here
          </Button>
        </Typography>
      </Box>
    </Box>
  );
}

