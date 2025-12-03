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
import UserProfileManager from './components/UserProfileManager.jsx';
import { fetchSpecialists } from './services/specialistApi.js';
import { fetchBookings, createBooking, cancelBooking } from './services/bookingApi.js';

function GlowBookApp() {
  const { user, logout } = useAuth();
  const [specialists, setSpecialists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
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
    if (user && !user.isSpecialist && currentView === 'client-bookings') {
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

  return (
    <div className="app-shell glowbook-app">
      <header>
        <div className="header-content">
          <div className="logo-section">
            <img src="/GB-Logo-White.png" alt="GlowBook" className="app-logo" />
            <p className="subtitle">Book your Look</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowProfileModal(true)} 
              className="btn-profile"
              title="My Profile"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                <path d="M12 14C7.58172 14 4 16.6863 4 20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20C20 16.6863 16.4183 14 12 14Z" fill="currentColor"/>
              </svg>
            </button>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="view-tabs">
        {!user.isSpecialist || user.isAdmin ? (
          <button
            className={`tab ${currentView === 'specialists' ? 'active' : ''}`}
            onClick={() => setCurrentView('specialists')}
          >
            Browse Specialists
          </button>
        ) : null}
        <button
          className={`tab ${currentView === 'mybookings' ? 'active' : ''}`}
          onClick={() => setCurrentView('mybookings')}
        >
          My Bookings {bookings.filter(b => b.status === 'Confirmed').length > 0 && `(${bookings.filter(b => b.status === 'Confirmed').length})`}
        </button>
        {user.isSpecialist && (
          <>
            <button
              className={`tab ${currentView === 'my-services' ? 'active' : ''}`}
              onClick={() => setCurrentView('my-services')}
            >
              🛠️ My Services
            </button>
            <button
              className={`tab ${currentView === 'client-bookings' ? 'active' : ''}`}
              onClick={() => setCurrentView('client-bookings')}
            >
              📅 Client Bookings
            </button>
          </>
        )}
        {user.isAdmin && (
          <>
            {!user.isSpecialist && (
              <button
                className={`tab ${currentView === 'admin-specialists' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-specialists')}
              >
                💼 Specialists
              </button>
            )}
            <button
              className={`tab ${currentView === 'admin-services' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin-services')}
            >
              🛠️ Services
            </button>
            <button
              className={`tab ${currentView === 'admin-clients' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin-clients')}
            >
              👥 Clients
            </button>
          </>
        )}
      </nav>

      <main className="content">
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}

        {currentView === 'specialists' ? (
          <section className="card">
            <div className="category-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-btn ${selectedCategory === category || (category === 'All' && !selectedCategory) ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <SpecialistList
              specialists={specialists}
              onBook={handleBookSpecialist}
              isLoading={isLoading}
            />
          </section>
        ) : currentView === 'mybookings' ? (
          <section className="card">
            <h2>My Bookings</h2>
            <BookingList
              bookings={bookings}
              specialists={specialists}
              onCancel={handleCancelBooking}
            />
          </section>
        ) : currentView === 'my-services' ? (
          <section className="card">
            <SpecialistServiceManager />
          </section>
        ) : currentView === 'client-bookings' ? (
          <section className="card">
            <h2>Client Bookings</h2>
            <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>Bookings made with you</p>
            <BookingList
              bookings={bookings}
              specialists={specialists}
              onCancel={handleCancelBooking}
            />
          </section>
        ) : currentView === 'admin-specialists' ? (
          <section className="card">
            {user.isSpecialist ? (
              // If user is a specialist (even if admin), show only their profile
              <SpecialistProfileManager />
            ) : (
              // Only pure admins (not specialists) see all specialists
              <AdminSpecialistManager />
            )}
          </section>
        ) : currentView === 'admin-services' ? (
          <section className="card">
            <AdminServiceManager />
          </section>
        ) : currentView === 'admin-clients' ? (
          <section className="card">
            <AdminClientManager />
          </section>
        ) : null}
      </main>

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
    </div>
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

  return user ? <GlowBookApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
