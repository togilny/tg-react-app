import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode = 'dark') {
  const isDark = mode === 'dark';
  const containedTextColor = isDark ? '#ffffff' : '#0f141c';
  const containedDisabledTextColor = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(15,20,28,0.95)';
  const containedDisabledBgColor = isDark ? 'rgba(78,161,255,0.22)' : 'rgba(78,161,255,0.28)';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#4ea1ff',
        contrastText: containedTextColor
      },
      secondary: {
        main: '#8aa5c7',
        contrastText: containedTextColor
      },
      success: {
        main: '#3fbf7f'
      },
      error: {
        main: '#e46a6a'
      },
      warning: {
        main: '#f5c451'
      },
      background: isDark
        ? { default: '#0f141c', paper: '#1b2331' }
        : { default: '#f8fafc', paper: '#ffffff' },
      text: isDark
        ? { primary: '#e7ecf8', secondary: '#9aa3b5' }
        : { primary: '#0f172a', secondary: '#475569' }
    },
    typography: {
      fontFamily: '"Space Grotesk", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      fontWeightRegular: 500,
      fontWeightMedium: 600,
      fontWeightBold: 700
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700
          },
          contained: {
            color: containedTextColor,
            '&.Mui-disabled': {
              opacity: 1,
              color: containedDisabledTextColor,
              backgroundColor: containedDisabledBgColor
            }
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(15, 30, 50, 0.25)',
              '&:hover': {
                backgroundColor: 'rgba(15, 30, 50, 0.35)'
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(15, 30, 50, 0.35)'
              }
            }
          }
        }
      }
    }
  });
}
