import { useState, useEffect } from 'react';
import { fetchMyProfile, updateMyProfile } from '../services/authApi';

export default function UserProfileManager() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setFormData({
        username: data.username || '',
        displayName: data.displayName || '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password if provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const updates = {
        username: formData.username !== profile.username ? formData.username : undefined,
        displayName: formData.displayName !== profile.displayName ? formData.displayName : undefined,
        password: formData.password || undefined
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        return;
      }

      await updateMyProfile(updates);
      
      // If username changed, update auth context
      if (updates.username) {
        // Re-login with new username (or old password if password wasn't changed)
        // For simplicity, we'll just update localStorage
        localStorage.setItem('username', updates.username);
      }

      setShowForm(false);
      setFormData({ ...formData, password: '', confirmPassword: '' });
      await loadProfile();
      alert('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = () => {
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      username: profile.username || '',
      displayName: profile.displayName || '',
      password: '',
      confirmPassword: ''
    });
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
        await loginApi(profile.username, passwordData.currentPassword);
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

  if (isLoading) return <p>Loading profile...</p>;

  if (!profile) {
    return (
      <div className="empty-state">
        <p>Unable to load profile. Please try again.</p>
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
            <label>Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
              required
            />
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Your display name"
            />
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
        <>
          <div className="specialists-grid">
            <div className="specialist-admin-card">
              <div className="specialist-admin-info">
                <h4>{profile.displayName || profile.username}</h4>
                <p className="specialist-description">
                  <strong>Username:</strong> {profile.username}
                </p>
                {profile.displayName && (
                  <p className="specialist-description">
                    <strong>Display Name:</strong> {profile.displayName}
                  </p>
                )}
                <p className="specialist-description">
                  <strong>Role:</strong> {profile.isAdmin ? 'Admin' : profile.isSpecialist ? 'Specialist' : 'User'}
                </p>
              </div>
              <div className="specialist-admin-actions">
                <button onClick={handleEdit} className="btn-edit">
                  Edit
                </button>
              </div>
            </div>
          </div>

          {!showPasswordForm && (
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
        </>
      )}
    </div>
  );
}

