import { useState, useEffect } from 'react';
import { fetchMyServices, createMyService, updateMyService, deleteMyService } from '../services/serviceApi';

export default function SpecialistServiceManager() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hair',
    durationMinutes: 30,
    price: 0,
    description: ''
  });

  const categories = ['Hair', 'Nails', 'Makeup'];

  useEffect(() => {
    loadServices();
    
    // Listen for custom event to open add service form
    const handleOpenAddService = () => {
      setShowForm(true);
      setEditingService(null);
      resetForm();
    };
    
    window.addEventListener('openAddServiceForm', handleOpenAddService);
    
    return () => {
      window.removeEventListener('openAddServiceForm', handleOpenAddService);
    };
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMyServices();
      setServices(data);
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
      if (editingService) {
        await updateMyService(editingService.id, formData);
      } else {
        await createMyService(formData);
      }
      
      setShowForm(false);
      setEditingService(null);
      resetForm();
      await loadServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      durationMinutes: service.durationMinutes,
      price: service.price,
      description: service.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await deleteMyService(id);
      await loadServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Hair',
      durationMinutes: 30,
      price: 0,
      description: ''
    });
  };

  if (isLoading) {
    return <div className="loading-screen">Loading your services...</div>;
  }

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>My Services</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-save" style={{ fontSize: '1rem', padding: '0.5rem 1rem', fontWeight: '600' }}>
            + Add Service
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form">
          <h3>{editingService ? 'Edit Service' : 'Create New Service'}</h3>
          
          <div className="admin-form-group">
            <label>Service Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Women's Haircut"
            />
          </div>

          <div className="admin-form-group">
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

          <div className="admin-form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
              required
              min="1"
            />
          </div>

          <div className="admin-form-group">
            <label>Price (£) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              min="0"
            />
          </div>

          <div className="admin-form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional service description"
              rows="3"
            />
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn-save">
              {editingService ? 'Update Service' : 'Create Service'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="admin-list">
          {services.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any services yet.</p>
              <p>Click "Add Service" to create your first service.</p>
            </div>
          ) : (
            services.map(service => (
              <div key={service.id} id={`service-${service.id}`} className="admin-list-item">
                <div className="admin-list-item-header">
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{service.name}</h4>
                    <p style={{ color: '#a1a1aa', margin: '0.25rem 0', fontSize: '0.95rem' }}>
                      {service.category} • {service.durationMinutes} min • £{service.price.toFixed(2)}
                    </p>
                    {service.description && (
                      <p style={{ color: '#71717a', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="admin-list-item-actions">
                    <button onClick={() => handleEdit(service)} className="btn-edit" style={{ fontSize: '0.9rem', padding: '0.4rem 0.75rem', fontWeight: '500' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="btn-delete" style={{ fontSize: '0.9rem', padding: '0.4rem 0.75rem', fontWeight: '500' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

