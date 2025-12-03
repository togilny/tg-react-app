import { useState, useEffect } from 'react';
import { fetchServices, createService, updateService, deleteService } from '../services/serviceApi';

export default function AdminServiceManager() {
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
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchServices();
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
        await updateService(editingService.id, formData);
      } else {
        await createService(formData);
      }
      
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', category: 'Hair', durationMinutes: 30, price: 0, description: '' });
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
      await deleteService(id);
      await loadServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({ name: '', category: 'Hair', durationMinutes: 30, price: 0, description: '' });
  };

  if (isLoading) return <p>Loading services...</p>;

  return (
    <div className="admin-service-manager">
      <div className="admin-header">
        <h2>🛠️ Service Management</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Service
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
          <h3>{editingService ? 'Edit Service' : 'Add New Service'}</h3>
          
          <div className="form-group">
            <label>Service Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Women's Haircut"
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
              <label>Duration (minutes) *</label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                required
              />
            </div>

            <div className="form-group">
              <label>Price (£) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="5"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the service..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingService ? 'Update' : 'Create'} Service
            </button>
          </div>
        </form>
      )}

      <div className="services-grid">
        {services.map((service) => (
          <div key={service.id} className="service-card">
            <div className="service-card-header">
              <h4>{service.name}</h4>
              <span className="service-badge">{service.category}</span>
            </div>
            <p className="service-description">{service.description || 'No description'}</p>
            <div className="service-details">
              <span className="service-duration">⏱️ {service.durationMinutes} min</span>
              <span className="service-price">£{service.price}</span>
            </div>
            <div className="service-actions">
              <button onClick={() => handleEdit(service)} className="btn-edit">
                Edit
              </button>
              <button onClick={() => handleDelete(service.id)} className="btn-delete">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No services yet. Create your first service!</p>
        </div>
      )}
    </div>
  );
}

