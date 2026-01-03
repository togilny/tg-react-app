import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import SpecialistRegisterForm from './components/SpecialistRegisterForm.jsx';
import SpecialistList from './components/SpecialistList.jsx';
import BookingModal from './components/BookingModal.jsx';
import BookingList from './components/BookingList.jsx';
import AdminServiceManager from './components/AdminServiceManager.jsx';
import AdminClientManager from './components/AdminClientManager.jsx';
import AdminSpecialistManager from './components/AdminSpecialistManager.jsx';
import SpecialistServiceManager from './components/SpecialistServiceManager.jsx';
import SpecialistProfileManager from './components/SpecialistProfileManager.jsx';
import SpecialistCalendar from './components/SpecialistCalendar.jsx';
import UserProfileManager from './components/UserProfileManager.jsx';
import { fetchSpecialists } from './services/specialistApi.js';
import { fetchBookings, createBooking, cancelBooking } from './services/bookingApi.js';
import { 
  AppBar, 
  Toolbar, 
  Container, 
  Box, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  useMediaQuery,
  useTheme,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import BuildIcon from '@mui/icons-material/Build';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupIcon from '@mui/icons-material/Group';
import { useThemeMode } from './contexts/ThemeModeContext.jsx';

function LookBookApp() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [specialists, setSpecialists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const isSettingsOpen = Boolean(settingsAnchorEl);
  
  // Set default view based on user type
  const [currentView, setCurrentView] = useState(() => {
    // Initialize based on user if available, otherwise default
    if (user?.isSpecialist && !user?.isAdmin) {
      return 'my-services';
    }
    return 'specialists';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Update view when user changes - redirect specialists away from admin views
  useEffect(() => {
    if (user?.isSpecialist) {
      // If specialist tries to access admin-specialists, redirect to my-services
      if (currentView === 'admin-specialists') {
        setCurrentView('my-services');
      }
    }
    // Redirect non-specialists from specialist views to specialists
    if (user && !user.isSpecialist && (currentView === 'my-appointments' || currentView === 'my-services')) {
      setCurrentView('specialists');
    }
  }, [user?.isSpecialist, user?.isAdmin, currentView]);

  const categories = ['All', 'Hair', 'Nails', 'Makeup'];

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const category = selectedCategory && selectedCategory !== 'All' ? selectedCategory : null;
      const [specialistsData, bookingsData] = await Promise.all([
        fetchSpecialists(category),
        fetchBookings().catch(() => []) // Don't fail if bookings fail
      ]);
      
      setSpecialists(specialistsData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSpecialist = (specialist) => {
    setSelectedSpecialist(specialist);
    setShowBookingModal(true);
  };

  const handleCreateBooking = async (bookingData) => {
    await createBooking(bookingData);
    await loadData();
    setCurrentView('mybookings');
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await cancelBooking(bookingId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmedBookingsCount = bookings.filter(b => b.status === 'Confirmed').length;

  const navItems = [
    ...(!user.isSpecialist || user.isAdmin ? [{
      id: 'specialists',
      label: 'Specialists',
      icon: <SearchIcon />,
    }] : []),
    {
      id: 'mybookings',
      label: 'Bookings',
      icon: <BookmarksIcon />,
      badge: confirmedBookingsCount > 0 ? confirmedBookingsCount : null,
    },
    ...(user.isSpecialist ? [
      {
        id: 'my-services',
        label: 'Services',
        icon: <BuildIcon />,
      },
      {
        id: 'my-appointments',
        label: 'Appointments',
        icon: <CalendarMonthIcon />,
      },
    ] : []),
    ...(user.isAdmin ? [
      ...(!user.isSpecialist ? [{
        id: 'admin-specialists',
        label: 'Specialists',
        icon: <SupervisorAccountIcon />,
      }] : []),
      {
        id: 'admin-clients',
        label: 'Clients',
        icon: <GroupIcon />,
      },
    ] : []),
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
            LookBook
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
            {user?.username}
          </Typography>

          <IconButton
            aria-label="Settings"
            onClick={(e) => setSettingsAnchorEl(e.currentTarget)}
            size="small"
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={settingsAnchorEl}
            open={isSettingsOpen}
            onClose={() => setSettingsAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem
              onClick={() => {
                setSettingsAnchorEl(null);
                setShowProfileModal(true);
              }}
            >
              My profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                toggleMode();
                setSettingsAnchorEl(null);
              }}
            >
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </MenuItem>
          </Menu>

          <Button 
            variant="outlined" 
            onClick={logout} 
            sx={{ borderColor: 'divider', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Sign out
          </Button>
        </Toolbar>

        {/* Desktop Navigation - Tab Style */}
        {!isMobile && (
          <Box 
            className="view-tabs"
            sx={{ 
              borderTop: 1, 
              borderColor: 'divider', 
              px: 2, 
              bgcolor: 'background.paper',
              display: 'flex',
              gap: 0.5,
              overflowX: 'auto'
            }}
          >
            {navItems.map((item) => (
              <Box
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`tab ${currentView === item.id ? 'active' : ''}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.5,
                  px: 2,
                  cursor: 'pointer',
                  borderBottom: 2,
                  borderColor: currentView === item.id ? 'primary.main' : 'transparent',
                  color: currentView === item.id ? 'primary.main' : 'text.secondary',
                  bgcolor: currentView === item.id ? 'action.selected' : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: currentView === item.id ? 'primary.main' : 'text.primary',
                  },
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                <Box className="tab-icon" sx={{ display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                <Box className="tab-text">
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="primary">
                      {item.label}
                    </Badge>
                  ) : (
                    item.label
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </AppBar>

      {/* Mobile Drawer Navigation */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, pb: 2, fontWeight: 700 }}>
            Menu
          </Typography>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={currentView === item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <ListItemIcon>
                    {item.badge ? (
                      <Badge badgeContent={item.badge} color="primary">
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ px: 2, pt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              fullWidth
            >
              Sign out
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ flex: 1, py: { xs: 2, md: 3 } }}>
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
              borderColor: 'error.main'
            }}
          >
            {error}
          </Box>
        )}

        {currentView === 'specialists' ? (
          <Box>
            <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
                  color={selectedCategory === category || (category === 'All' && !selectedCategory) ? 'primary' : 'default'}
                  variant={selectedCategory === category || (category === 'All' && !selectedCategory) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>

            <SpecialistList
              specialists={specialists}
              onBook={handleBookSpecialist}
              isLoading={isLoading}
            />
          </Box>
        ) : currentView === 'mybookings' ? (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              My Bookings
            </Typography>
            <BookingList
              bookings={bookings}
              specialists={specialists}
              onCancel={handleCancelBooking}
            />
          </Box>
        ) : currentView === 'my-services' ? (
          <SpecialistServiceManager />
        ) : currentView === 'my-appointments' ? (
          <SpecialistCalendar />
        ) : currentView === 'admin-specialists' ? (
          <Box>
            {user.isSpecialist ? (
              <SpecialistProfileManager />
            ) : (
              <AdminSpecialistManager />
            )}
            {user.isSpecialist && (
              <Box sx={{ mt: 3 }}>
                <SpecialistServiceManager />
              </Box>
            )}
          </Box>
        ) : currentView === 'admin-clients' ? (
          <AdminClientManager />
        ) : null}
      </Container>

      {showBookingModal && selectedSpecialist && (
        <BookingModal
          specialist={selectedSpecialist}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSpecialist(null);
          }}
          onSubmit={handleCreateBooking}
        />
      )}

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>My Profile</h2>
              <button onClick={() => setShowProfileModal(false)} className="modal-close">&times;</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {user.isSpecialist ? (
                <SpecialistProfileManager />
              ) : (
                <UserProfileManager />
              )}
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}

function AuthScreen() {
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'specialist-register'
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

  const handleRegister = async (username, password, displayName = null, specialistCode = null) => {
    try {
      setError('');
      await register(username, password, displayName, specialistCode);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        {authView === 'login' ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => {
              setAuthView('register');
              setError('');
            }}
            error={error}
          />
        ) : authView === 'register' ? (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => {
              setAuthView('login');
              setError('');
            }}
            onSwitchToSpecialist={() => {
              setAuthView('specialist-register');
              setError('');
            }}
            error={error}
          />
        ) : (
          <SpecialistRegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => {
              setAuthView('login');
              setError('');
            }}
            onSwitchToRegular={() => {
              setAuthView('register');
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

  return user ? <LookBookApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
