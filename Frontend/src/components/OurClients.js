import React, { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiPlus, FiMail, FiPhone, FiMapPin, FiCalendar, FiDollarSign, FiMoreHorizontal } from 'react-icons/fi';
import { toast } from 'sonner';
// import api from '../config/api'; // Will be used when API endpoints are ready
import './OurClients.css';

function OurClients() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    status: 'Active',
    notes: ''
  });

  const statusOptions = ['All', 'Active', 'Inactive', 'On Hold'];
  const industryOptions = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Other'];

  // Fetch clients from backend
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API endpoint when available
      // const response = await api.get('/clients');
      // setClients(response.data.clients);
      
      // Mock data for now
      setClients([
        {
          id: 1,
          name: 'John Smith',
          email: 'john@techcorp.com',
          phone: '+1-555-0101',
          company: 'Tech Corp',
          industry: 'Technology',
          status: 'Active',
          joinDate: '2023-05-15',
          totalValue: '$50,000',
          notes: 'Key client with ongoing projects'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah@finance.com',
          phone: '+1-555-0102',
          company: 'Finance Solutions',
          industry: 'Finance',
          status: 'Active',
          joinDate: '2023-08-20',
          totalValue: '$75,000',
          notes: 'High value client'
        }
      ]);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (newClient.name && newClient.email) {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API endpoint
        // const response = await api.post('/clients', newClient);
        // setClients([response.data.client, ...clients]);
        
        const clientData = {
          ...newClient,
          id: Date.now(),
          joinDate: new Date().toISOString().split('T')[0],
          totalValue: '$0'
        };
        setClients([clientData, ...clients]);
        setNewClient({ name: '', email: '', phone: '', company: '', industry: '', status: 'Active', notes: '' });
        setShowAddForm(false);
        toast.success('Client added successfully!');
      } catch (error) {
        console.error('Error adding client:', error);
        toast.error('Failed to add client');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedClient(null);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API endpoint
        // await api.delete(`/clients/${clientId}`);
        setClients(clients.filter(client => client.id !== clientId));
        toast.success('Client deleted successfully!');
        handleCloseSidePanel();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast.error('Failed to delete client');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'Active').length,
    inactive: clients.filter(c => c.status === 'Inactive').length,
    onHold: clients.filter(c => c.status === 'On Hold').length
  };

  return (
    <div className="our-clients-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1>Our Clients</h1>
            <p>Manage and track your client relationships and business activities.</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Clients</div>
            <div className="stat-icon" style={{ backgroundColor: '#3B82F6' }}>
              <FiUser />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Active</div>
            <div className="stat-icon" style={{ backgroundColor: '#10B981' }}>
              <FiUser />
            </div>
          </div>
          <div className="stat-value">{stats.active}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">On Hold</div>
            <div className="stat-icon" style={{ backgroundColor: '#F59E0B' }}>
              <FiUser />
            </div>
          </div>
          <div className="stat-value">{stats.onHold}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Inactive</div>
            <div className="stat-icon" style={{ backgroundColor: '#EF4444' }}>
              <FiUser />
            </div>
          </div>
          <div className="stat-value">{stats.inactive}</div>
        </div>
      </div>

      {/* Table Header with Search and Filters */}
      <div className="table-header">
        <div className="table-header-left">
          <h3>All Clients ({filteredClients.length})</h3>
        </div>
        <div className="table-header-right">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button className="add-client-btn" onClick={() => setShowAddForm(!showAddForm)}>
            <FiPlus /> Add Client
          </button>
        </div>
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <div className="add-form-container">
          <form onSubmit={handleAddClient} className="add-client-form">
            <h3>Add New Client</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Full Name *"
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={newClient.email}
                onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
              />
              <input
                type="text"
                placeholder="Company"
                value={newClient.company}
                onChange={(e) => setNewClient({...newClient, company: e.target.value})}
              />
              <select
                value={newClient.industry}
                onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
              >
                <option value="">Select Industry</option>
                {industryOptions.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <select
                value={newClient.status}
                onChange={(e) => setNewClient({...newClient, status: e.target.value})}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <textarea
              placeholder="Notes"
              value={newClient.notes}
              onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
              rows="3"
            />
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients Table */}
      <div className="clients-table-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client Details</th>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Join Date</th>
                <th>Total Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} onClick={() => handleClientClick(client)}>
                  <td>
                    <div className="client-details-cell">
                      <div className="client-avatar">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="client-info">
                        <div className="client-name">{client.name}</div>
                        <div className="client-email">{client.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{client.company}</td>
                  <td>{client.industry}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ 
                        backgroundColor: client.status === 'Active' ? '#10B981' : 
                                       client.status === 'On Hold' ? '#F59E0B' : '#EF4444'
                      }}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td>{new Date(client.joinDate).toLocaleDateString()}</td>
                  <td className="total-value">{client.totalValue}</td>
                  <td>
                    <button 
                      className="actions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClientClick(client);
                      }}
                    >
                      <FiMoreHorizontal />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-clients-found">
            <FiUser className="no-clients-icon" />
            <h3>No clients found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Client Details Side Panel */}
      {showSidePanel && selectedClient && (
        <ClientDetailsSidePanel
          client={selectedClient}
          onClose={handleCloseSidePanel}
          isVisible={showSidePanel}
          onDelete={handleDeleteClient}
        />
      )}
    </div>
  );
}

// Client Details Side Panel Component
function ClientDetailsSidePanel({ client, onClose, isVisible, onDelete }) {
  if (!client) return null;

  return (
    <>
      <div className={`side-panel-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}></div>
      <div className={`side-panel ${isVisible ? 'visible' : ''}`}>
        <div className="side-panel-content">
          {/* Header */}
          <div className="panel-header">
            <div className="client-header-info">
              <div className="client-avatar-large">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2>{client.name}</h2>
                <p className="client-company">{client.company}</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          {/* Status and Industry */}
          <div className="role-status-section">
            <div className="role-status-item">
              <label className="field-label">Status</label>
              <span 
                className="status-badge-large"
                style={{ 
                  backgroundColor: client.status === 'Active' ? '#10B981' : 
                                 client.status === 'On Hold' ? '#F59E0B' : '#EF4444'
                }}
              >
                {client.status}
              </span>
            </div>
            <div className="role-status-item">
              <label className="field-label">Industry</label>
              <span className="industry-badge">{client.industry}</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="details-section">
            <h4>Contact Information</h4>
            <div className="contact-grid">
              <div className="contact-item">
                <FiMail className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Email</div>
                  <div className="contact-value">{client.email}</div>
                </div>
              </div>
              <div className="contact-item">
                <FiPhone className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Phone</div>
                  <div className="contact-value">{client.phone || 'N/A'}</div>
                </div>
              </div>
              <div className="contact-item">
                <FiMapPin className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Company</div>
                  <div className="contact-value">{client.company || 'N/A'}</div>
                </div>
              </div>
              <div className="contact-item">
                <FiCalendar className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Join Date</div>
                  <div className="contact-value">{new Date(client.joinDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="contact-item">
                <FiDollarSign className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Total Value</div>
                  <div className="contact-value">{client.totalValue}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="details-section">
              <h4>Notes</h4>
              <p className="notes-text">{client.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="panel-actions">
            <button 
              className="delete-btn"
              onClick={() => onDelete(client.id)}
            >
              Delete Client
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default OurClients;
