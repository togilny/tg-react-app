import { useState, useEffect } from 'react';
import { fetchMyProfile, updateSpecialist, deleteSpecialist } from '../services/specialistApi';
import { fetchMyProfile as fetchUserProfile, updateMyProfile } from '../services/authApi';
import { fetchMyServices } from '../services/serviceApi';
import AvailabilityManager from './AvailabilityManager';

export default function SpecialistProfileManager() {
  const [specialist, setSpecialist] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAvailability, setShowAvailability] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hair',
    description: '',
    imageUrl: '',
    pricePerHour: 50,
    rating: 5
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const categories = ['Hair', 'Nails', 'Makeup'];

  useEffect(() => {
    loadProfile();
    loadUserProfile();
    loadServices();
  }, []);
  
  const loadServices = async () => {
    try {
      const data = await fetchMyServices();
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
      setServices([]);
    }
  };

  const loadUserProfile = async () => {
    try {
      const data = await fetchUserProfile();
      setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMyProfile();
      setSpecialist(data);
      setFormData({
        name: data.name,
        category: data.category,
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        pricePerHour: data.pricePerHour,
        rating: data.rating
      });
      setLogoPreview(data.imageUrl || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await updateSpecialist(specialist.id, formData);
      setShowForm(false);
      await loadProfile();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = () => {
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your specialist profile? This will also cancel all your bookings.')) return;

    try {
      await deleteSpecialist(specialist.id);
      // After deletion, the user should be logged out or redirected
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      name: specialist.name,
      category: specialist.category,
      description: specialist.description || '',
      imageUrl: specialist.imageUrl || '',
      pricePerHour: specialist.pricePerHour,
      rating: specialist.rating
    });
    setLogoPreview(specialist.imageUrl || null);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordData.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!passwordData.newPassword) {
      setError('New password is required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      // Verify current password first by attempting login
      const { login: loginApi } = await import('../services/authApi');
      try {
        await loginApi(userProfile?.username || '', passwordData.currentPassword);
      } catch (err) {
        setError('Current password is incorrect');
        return;
      }

      // Update password
      await updateMyProfile({ password: passwordData.newPassword });
      
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelPassword = () => {
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Hair': '💇',
      'Nails': '💅',
      'Makeup': '💄'
    };
    return icons[category] || '✨';
  };

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  if (isLoading) return <p>Loading profile...</p>;

  if (!specialist) {
    return (
      <div className="empty-state">
        <p>No specialist profile found. Please contact an administrator.</p>
      </div>
    );
  }

  return (
    <div className="admin-specialist-manager">
      <div className="admin-header">
        <h2>👤 My Profile</h2>
        {!showForm && (
          <button onClick={handleEdit} className="btn-primary">
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="service-form card">
          <h3>Edit My Profile</h3>
          
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sarah Johnson"
              required
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price per Hour (£) *</label>
              <input
                type="number"
                value={formData.pricePerHour}
                onChange={(e) => setFormData({ ...formData, pricePerHour: parseFloat(e.target.value) })}
                min="0"
                step="5"
                required
              />
            </div>

            <div className="form-group">
              <label>Rating (1-5) *</label>
              <input
                type="number"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                min="1"
                max="5"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of expertise..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Company Logo (Optional)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Check file size (max 2MB)
                      if (file.size > 2 * 1024 * 1024) {
                        setError('Image size must be less than 2MB');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result;
                        setFormData({ ...formData, imageUrl: base64String });
                        setLogoPreview(base64String);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ 
                    width: '100%',
                    padding: '0.5rem',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '0.5rem',
                    color: '#e4e4e7'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '0.5rem', display: 'block' }}>
                  Or enter logo URL:
                </label>
                <input
                  type="url"
                  value={formData.imageUrl && !formData.imageUrl.startsWith('data:') ? formData.imageUrl : ''}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setLogoPreview(e.target.value || null);
                  }}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              {logoPreview && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Preview:</p>
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    style={{ 
                      maxWidth: '150px', 
                      maxHeight: '150px', 
                      borderRadius: '0.5rem',
                      border: '1px solid #3f3f46'
                    }}
                    onError={() => setLogoPreview(null)}
                  />
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
              Upload a logo from your computer or provide a URL. If provided, it will replace the category emoji.
            </p>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Profile
            </button>
          </div>
        </form>
      ) : (
        <div className="specialists-grid">
          <div className="specialist-admin-card">
            <div className="specialist-admin-icon">
              {specialist.imageUrl && !imageError ? (
                <img 
                  src={specialist.imageUrl} 
                  alt={`${specialist.name} logo`}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    borderRadius: '0.5rem'
                  }}
                  onError={() => setImageError(true)}
                />
              ) : (
                getCategoryIcon(specialist.category)
              )}
            </div>
            <div className="specialist-admin-info">
              <h4>{specialist.name}</h4>
              <span className="specialist-badge">{specialist.category}</span>
              <p className="specialist-description">{specialist.description || 'No description'}</p>
              <div className="specialist-details">
                <span>{getRatingStars(specialist.rating)}</span>
                <span className="specialist-price">£{specialist.pricePerHour}/hour</span>
              </div>
            </div>
            <div className="specialist-admin-actions">
              <button onClick={handleEdit} className="btn-edit">
                Edit
              </button>
              <button onClick={handleDelete} className="btn-delete">
                Delete
              </button>
            </div>
            
            {/* Services list below specialist card */}
            {services.length > 0 && (
              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid #3f3f46',
                width: '100%'
              }}>
                <h5 style={{ marginBottom: '0.75rem', color: '#e4e4e7', fontSize: '0.9rem' }}>
                  My Services:
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {services.map((service) => (
                    <div key={service.id} style={{
                      padding: '0.5rem',
                      background: '#27272a',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#e4e4e7' }}>{service.name}</strong>
                          <span style={{ color: '#a1a1aa', marginLeft: '0.5rem' }}>
                            {service.category} • {service.durationMinutes} min • £{service.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {service.description && (
                        <p style={{ color: '#71717a', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                          {service.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!showForm && !showPasswordForm && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#1f2937', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAvailability ? '1rem' : 0 }}>
            <h3 style={{ margin: 0 }}>📅 Availability Settings</h3>
            <button onClick={() => setShowAvailability(!showAvailability)} className="btn-primary">
              {showAvailability ? 'Hide' : 'Manage Availability'}
            </button>
          </div>
          {showAvailability && <AvailabilityManager />}
        </div>
      )}

      {!showForm && !showPasswordForm && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#1f2937', borderRadius: '0.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>🔒 Change Password</h3>
          <button onClick={() => setShowPasswordForm(true)} className="btn-primary">
            Change Password
          </button>
        </div>
      )}

      {showPasswordForm && (
        <form onSubmit={handlePasswordChange} className="service-form card" style={{ marginTop: '1.5rem' }}>
          <h3>Change Password</h3>
          
          <div className="form-group">
            <label>Current Password *</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Enter current password"
              required
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password (min 6 characters)"
              minLength="6"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              minLength="6"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancelPassword} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Change Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

