import { useState, useEffect } from 'react';
import { fetchSpecialists, createSpecialist, updateSpecialist, deleteSpecialist } from '../services/specialistApi';
import { fetchServicesBySpecialist, updateService, deleteService } from '../services/serviceApi';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSpecialistManager() {
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState([]);
  const [specialistServices, setSpecialistServices] = useState({}); // Map specialistId -> services[]
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hair',
    description: '',
    imageUrl: '',
    pricePerHour: 50,
    rating: 5
  });

  const categories = ['Hair', 'Nails', 'Makeup'];

  useEffect(() => {
    loadSpecialists();
  }, []);

  const loadSpecialists = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchSpecialists();
      setSpecialists(data);
      
      // Load services for each specialist
      const servicesMap = {};
      for (const specialist of data) {
        try {
          const services = await fetchServicesBySpecialist(specialist.id);
          servicesMap[specialist.id] = services.filter(s => s.specialistId === specialist.id);
        } catch (err) {
          servicesMap[specialist.id] = [];
        }
      }
      setSpecialistServices(servicesMap);
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
      if (editingSpecialist) {
        await updateSpecialist(editingSpecialist.id, formData);
      } else {
        await createSpecialist(formData);
      }
      
      setShowForm(false);
      setEditingSpecialist(null);
      setFormData({ name: '', category: 'Hair', description: '', imageUrl: '', pricePerHour: 50, rating: 5 });
      await loadSpecialists();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (specialist) => {
    setEditingSpecialist(specialist);
    setFormData({
      name: specialist.name,
      category: specialist.category,
      description: specialist.description || '',
      imageUrl: specialist.imageUrl || '',
      pricePerHour: specialist.pricePerHour,
      rating: specialist.rating
    });
    setLogoPreview(specialist.imageUrl || null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this specialist? This will also cancel all their bookings.')) return;

    try {
      await deleteSpecialist(id);
      await loadSpecialists();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSpecialist(null);
    setFormData({ name: '', category: 'Hair', description: '', imageUrl: '', pricePerHour: 50, rating: 5 });
    setLogoPreview(null);
  };

  const handleDeleteService = async (serviceId, specialistId) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await deleteService(serviceId);
      // Reload services for this specialist
      const services = await fetchServicesBySpecialist(specialistId);
      setSpecialistServices(prev => ({ ...prev, [specialistId]: services.filter(s => s.specialistId === specialistId) }));
    } catch (err) {
      setError(err.message);
    }
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

  if (isLoading) return <p>Loading specialists...</p>;

  return (
    <div className="admin-specialist-manager">
      <div className="admin-header">
        <h2>💼 Specialist Management</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Specialist
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="service-form card">
          <h3>{editingSpecialist ? 'Edit Specialist' : 'Add New Specialist'}</h3>
          
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
              {editingSpecialist ? 'Update' : 'Create'} Specialist
            </button>
          </div>
        </form>
      )}

      <div className="specialists-grid">
        {specialists.map((specialist) => {
          const services = specialistServices[specialist.id] || [];
          return (
            <div key={specialist.id} className="specialist-admin-card">
              <div className="specialist-admin-icon">
                {specialist.imageUrl && !imageErrors[specialist.id] ? (
                  <img 
                    src={specialist.imageUrl} 
                    alt={`${specialist.name} logo`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '0.5rem'
                    }}
                    onError={() => setImageErrors(prev => ({ ...prev, [specialist.id]: true }))}
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
                <button onClick={() => handleEdit(specialist)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDelete(specialist.id)} className="btn-delete">
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
                    Services Offered:
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {services.map((service) => (
                      <div key={service.id} style={{
                        padding: '0.5rem',
                        background: '#27272a',
                        borderRadius: '0.375rem',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: '#e4e4e7' }}>{service.name}</strong>
                            <span style={{ color: '#a1a1aa', marginLeft: '0.5rem' }}>
                              {service.category} • {service.durationMinutes} min • £{service.price.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => {
                                // Navigate to service edit - for now, show alert to use service management below
                                alert('Please use the Service Management section below to edit services.');
                              }}
                              className="btn-edit"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service.id, specialist.id)}
                              className="btn-delete"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Delete
                            </button>
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
          );
        })}
      </div>

      {specialists.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No specialists yet. Add your first team member!</p>
        </div>
      )}
    </div>
  );
}

