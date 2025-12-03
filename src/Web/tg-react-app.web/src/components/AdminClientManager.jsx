import { useState, useEffect } from 'react';
import { fetchClients, createClient, updateClient, deleteClient, fetchClientPrices, setClientServicePrice, deleteClientServicePrice } from '../services/clientApi';
import { fetchServices, createService } from '../services/serviceApi';

export default function AdminClientManager() {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPrices, setClientPrices] = useState([]);
  
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [priceFormData, setPriceFormData] = useState({
    serviceId: '',
    serviceName: '',
    customPrice: 0,
    useCustomService: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [clientsData, servicesData] = await Promise.all([
        fetchClients(),
        fetchServices()
      ]);
      setClients(clientsData);
      setServices(servicesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientPrices = async (clientId) => {
    try {
      const prices = await fetchClientPrices(clientId);
      setClientPrices(prices);
    } catch (err) {
      console.error('Error loading client prices:', err);
    }
  };

  const handleSubmitClient = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientFormData);
      } else {
        await createClient(clientFormData);
      }
      
      setShowClientForm(false);
      setEditingClient(null);
      setClientFormData({ name: '', email: '', phone: '', notes: '' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      notes: client.notes || ''
    });
    setShowClientForm(true);
    setSelectedClient(null);
  };

  const handleDeleteClient = async (id) => {
    if (!confirm('Are you sure you want to delete this client? All their custom prices will also be deleted.')) return;

    try {
      await deleteClient(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setShowClientForm(false);
    loadClientPrices(client.id);
    setPriceFormData({ serviceId: '', serviceName: '', customPrice: 0, useCustomService: false });
  };

  const handleSetPrice = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    if (priceFormData.useCustomService && !priceFormData.serviceName.trim()) {
      setError('Please enter a service name');
      return;
    }
    
    if (!priceFormData.useCustomService && !priceFormData.serviceId) {
      setError('Please select a service');
      return;
    }

    try {
      // If using custom service, create it first
      if (priceFormData.useCustomService) {
        const newService = await createService({
          name: priceFormData.serviceName,
          category: 'Custom',
          durationMinutes: 60,
          price: priceFormData.customPrice,
          description: `Custom service for ${selectedClient.name}`
        });
        await setClientServicePrice(selectedClient.id, newService.id, priceFormData.customPrice);
      } else {
        await setClientServicePrice(selectedClient.id, priceFormData.serviceId, priceFormData.customPrice);
      }
      
      await loadClientPrices(selectedClient.id);
      await loadData(); // Reload to get new services
      setPriceFormData({ serviceId: '', serviceName: '', customPrice: 0, useCustomService: false });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePrice = async (serviceId) => {
    if (!selectedClient) return;
    if (!confirm('Remove custom price for this service?')) return;

    try {
      await deleteClientServicePrice(selectedClient.id, serviceId);
      await loadClientPrices(selectedClient.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const getServiceById = (serviceId) => {
    return services.find(s => s.id === serviceId);
  };

  const getClientCustomPrice = (serviceId) => {
    if (!selectedClient) return null;
    return clientPrices.find(p => p.serviceId === serviceId);
  };

  const handleCancel = () => {
    setShowClientForm(false);
    setEditingClient(null);
    setClientFormData({ name: '', email: '', phone: '', notes: '' });
  };

  if (isLoading) return <p>Loading clients...</p>;

  return (
    <div className="admin-client-manager">
      <div className="admin-header">
        <h2>👥 Client Management</h2>
        {!showClientForm && !selectedClient && (
          <button onClick={() => setShowClientForm(true)} className="btn-primary">
            + Add Client
          </button>
        )}
        {selectedClient && (
          <button onClick={() => setSelectedClient(null)} className="btn-cancel">
            ← Back to Clients
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      {showClientForm && (
        <form onSubmit={handleSubmitClient} className="service-form card">
          <h3>{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
          
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={clientFormData.name}
              onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
              placeholder="Client name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={clientFormData.email}
              onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
              placeholder="client@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={clientFormData.phone}
              onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
              placeholder="+44 7700 900000"
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={clientFormData.notes}
              onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
              placeholder="Any special notes about this client..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingClient ? 'Update' : 'Create'} Client
            </button>
          </div>
        </form>
      )}

      {!showClientForm && !selectedClient && (
        <div className="clients-grid">
          {clients.map((client) => (
            <div key={client.id} className="client-card">
              <h4>{client.name}</h4>
              <p className="client-email">✉️ {client.email}</p>
              {client.phone && <p className="client-phone">📱 {client.phone}</p>}
              {client.notes && <p className="client-notes">{client.notes}</p>}
              <div className="client-actions">
                <button onClick={() => handleSelectClient(client)} className="btn-primary">
                  Set Prices
                </button>
                <button onClick={() => handleEditClient(client)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDeleteClient(client.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedClient && (
        <div className="client-pricing">
          <div className="card">
            <h3>Custom Pricing for {selectedClient.name}</h3>
            <p className="subtitle">Set special prices for individual services</p>

            <form onSubmit={handleSetPrice} className="price-form">
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={`toggle-btn ${!priceFormData.useCustomService ? 'active' : ''}`}
                  onClick={() => setPriceFormData({ ...priceFormData, useCustomService: false, serviceName: '' })}
                >
                  Select Existing Service
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${priceFormData.useCustomService ? 'active' : ''}`}
                  onClick={() => setPriceFormData({ ...priceFormData, useCustomService: true, serviceId: '' })}
                >
                  Create Custom Service
                </button>
              </div>

              <div className="form-row">
                {priceFormData.useCustomService ? (
                  <div className="form-group" style={{flex: 2}}>
                    <label>Service Name *</label>
                    <input
                      type="text"
                      value={priceFormData.serviceName}
                      onChange={(e) => setPriceFormData({ ...priceFormData, serviceName: e.target.value })}
                      placeholder="e.g., VIP Hair Treatment"
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{flex: 2}}>
                    <label>Service *</label>
                    <select
                      value={priceFormData.serviceId}
                      onChange={(e) => setPriceFormData({ ...priceFormData, serviceId: e.target.value })}
                      required
                    >
                      <option value="">Select a service...</option>
                      {services.filter(s => s.category !== 'Custom').map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} (Default: £{service.price})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Price (£) *</label>
                  <input
                    type="number"
                    value={priceFormData.customPrice}
                    onChange={(e) => setPriceFormData({ ...priceFormData, customPrice: parseFloat(e.target.value) })}
                    min="0"
                    step="5"
                    required
                  />
                </div>
                <div className="form-group" style={{display: 'flex', alignItems: 'flex-end'}}>
                  <button type="submit" className="btn-primary">
                    {priceFormData.useCustomService ? 'Create & Set Price' : 'Set Price'}
                  </button>
                </div>
              </div>
            </form>

            <div className="client-prices-list">
              <h4>Current Custom Prices</h4>
              {clientPrices.length === 0 ? (
                <p className="empty-state">No custom prices set yet.</p>
              ) : (
                <div className="prices-grid">
                  {clientPrices.map((price) => {
                    const service = getServiceById(price.serviceId);
                    return (
                      <div key={price.id} className="price-item">
                        <div>
                          <strong>{service?.name}</strong>
                          <p>Custom: £{price.customPrice} <span className="default-price">(Default: £{service?.price})</span></p>
                        </div>
                        <button onClick={() => handleDeletePrice(price.serviceId)} className="btn-delete-small">
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {clients.length === 0 && !showClientForm && (
        <div className="empty-state">
          <p>No clients yet. Add your first client!</p>
        </div>
      )}
    </div>
  );
}

