import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiPlus, FiUser, FiMail, FiPhone, FiMessageSquare,
  FiSend, FiChevronDown, FiChevronUp, FiDollarSign, FiFileText,
  FiMapPin, FiBriefcase, FiEdit3, FiTrash2, FiX, FiUsers
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import QuoteGenerator from './QuoteGenerator';
import './ClientManagement.css';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showQuoteGenerator, setShowQuoteGenerator] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const emptyClient = {
    companyName: '',
    clientName: '',
    email: '',
    phone: '',
    designation: '',
    location: ''
  };

  const [newClient, setNewClient] = useState({ ...emptyClient });

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients');
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/clients', newClient);
      setClients([response.data, ...clients]);
      setShowAddModal(false);
      setNewClient({ ...emptyClient });
      toast.success('Client added successfully');
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(error.response?.data?.message || 'Failed to add client');
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    if (!editClient) return;
    try {
      const response = await api.put(`/clients/${editClient._id}`, {
        companyName: editClient.companyName,
        clientName: editClient.clientName,
        email: editClient.email,
        phone: editClient.phone,
        designation: editClient.designation,
        location: editClient.location
      });
      setClients(clients.map(c => c._id === editClient._id ? response.data : c));
      setShowEditModal(false);
      setEditClient(null);
      toast.success('Client updated');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error(error.response?.data?.message || 'Failed to update client');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Delete this client? This cannot be undone.')) return;
    try {
      await api.delete(`/clients/${clientId}`);
      setClients(clients.filter(c => c._id !== clientId));
      if (expandedClient === clientId) setExpandedClient(null);
      toast.success('Client deleted');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleAddMessage = async (clientId) => {
    if (!newMessage.trim()) return;
    try {
      const response = await api.post(`/clients/${clientId}/messages`, { text: newMessage });
      setClients(clients.map(client => {
        if (client._id === clientId) {
          return { ...client, messages: [...(client.messages || []), response.data] };
        }
        return client;
      }));
      setNewMessage('');
      toast.success('Message added');
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Failed to add message');
    }
  };

  const handleQuoteGenerated = (clientId, quote) => {
    setClients(clients.map(client => {
      if (client._id === clientId) return { ...client, quote };
      return client;
    }));
    setShowQuoteGenerator(false);
    toast.success('Quote generated successfully');
  };

  const handleDownloadPDF = async (client) => {
    if (!client.quote?.invoiceId) {
      toast.error('No invoice available for download');
      return;
    }
    try {
      toast.info('Generating invoice PDF...');
      const response = await api.get(`/invoices/${client.quote.invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${client.quote.invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const toggleClientExpanded = (clientId) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
    setShowQuoteGenerator(false);
    setActiveTab('details');
  };

  const filteredClients = clients.filter(client =>
    (client.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = clients.length;
  const recentClients = clients.filter(c => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return (now - d) < 30 * 24 * 60 * 60 * 1000;
  }).length;
  const withQuotes = clients.filter(c => c.quote).length;

  return (
    <div className="cm-container">
      {/* Header */}
      <div className="cm-header">
        <div className="cm-title-section">
          <h1 className="cm-title">Client Management</h1>
          <p className="cm-subtitle">Manage your clients, track interactions and generate quotes</p>
        </div>
        <button className="cm-add-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Add Client
        </button>
      </div>

      {/* Stats Row */}
      <div className="cm-stats-row">
        <div className="cm-stat-card">
          <div className="cm-stat-icon" style={{ background: '#eff6ff' }}>
            <FiUsers style={{ color: '#3b82f6' }} />
          </div>
          <div className="cm-stat-info">
            <span className="cm-stat-number">{totalClients}</span>
            <span className="cm-stat-label">Total Clients</span>
          </div>
        </div>
        <div className="cm-stat-card">
          <div className="cm-stat-icon" style={{ background: '#f0fdf4' }}>
            <FiPlus style={{ color: '#22c55e' }} />
          </div>
          <div className="cm-stat-info">
            <span className="cm-stat-number">{recentClients}</span>
            <span className="cm-stat-label">This Month</span>
          </div>
        </div>
        <div className="cm-stat-card">
          <div className="cm-stat-icon" style={{ background: '#faf5ff' }}>
            <FiFileText style={{ color: '#a855f7' }} />
          </div>
          <div className="cm-stat-info">
            <span className="cm-stat-number">{withQuotes}</span>
            <span className="cm-stat-label">With Quotes</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="cm-toolbar">
        <div className="cm-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="cm-result-count">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Clients List */}
      <div className="cm-clients-list">
        {loading ? (
          <div className="cm-loading">
            <div className="cm-spinner" />
            <p>Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="cm-no-data">
            <FiUser size={44} />
            <h3>No Clients Found</h3>
            <p>{searchTerm ? 'Try adjusting your search' : 'Add your first client to get started'}</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client._id} className={`cm-client-card ${expandedClient === client._id ? 'cm-card-expanded' : ''}`}>
              {/* Client Row */}
              <div className="cm-client-row" onClick={() => toggleClientExpanded(client._id)}>
                <div className="cm-client-avatar">
                  {(client.companyName || '?')[0].toUpperCase()}
                </div>
                <div className="cm-client-info">
                  <div className="cm-client-primary">
                    <h3>{client.companyName}</h3>
                    <span className="cm-client-name-tag">{client.clientName}</span>
                  </div>
                  <div className="cm-client-meta">
                    <span><FiMail size={13} /> {client.email}</span>
                    <span><FiPhone size={13} /> {client.phone}</span>
                    {client.location && <span><FiMapPin size={13} /> {client.location}</span>}
                  </div>
                </div>
                <div className="cm-client-right">
                  {client.quote?.invoiceGenerated && (
                    <span className="cm-badge cm-badge-green">Invoice</span>
                  )}
                  {client.quote && !client.quote.invoiceGenerated && (
                    <span className="cm-badge cm-badge-amber">Quote</span>
                  )}
                  <div className="cm-row-actions">
                    <button className="cm-icon-btn" title="Edit" onClick={(e) => {
                      e.stopPropagation();
                      setEditClient({ ...client });
                      setShowEditModal(true);
                    }}><FiEdit3 /></button>
                    <button className="cm-icon-btn cm-icon-btn-danger" title="Delete" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClient(client._id);
                    }}><FiTrash2 /></button>
                  </div>
                  <span className="cm-chevron">
                    {expandedClient === client._id ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </div>
              </div>

              {/* Expanded Panel */}
              {expandedClient === client._id && (
                <div className="cm-expanded">
                  {/* Tabs */}
                  <div className="cm-tabs">
                    <button className={`cm-tab ${activeTab === 'details' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('details')}>
                      <FiUser size={14} /> Details
                    </button>
                    <button className={`cm-tab ${activeTab === 'messages' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('messages')}>
                      <FiMessageSquare size={14} /> Messages
                      {(client.messages || []).length > 0 && (
                        <span className="cm-tab-count">{client.messages.length}</span>
                      )}
                    </button>
                    <button className={`cm-tab ${activeTab === 'quote' ? 'cm-tab-active' : ''}`} onClick={() => setActiveTab('quote')}>
                      <FiDollarSign size={14} /> Quote
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="cm-tab-content">
                    {activeTab === 'details' && (
                      <div className="cm-details-grid">
                        <div className="cm-detail-item">
                          <FiBriefcase className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Company</span>
                            <span className="cm-detail-value">{client.companyName}</span>
                          </div>
                        </div>
                        <div className="cm-detail-item">
                          <FiUser className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Contact Person</span>
                            <span className="cm-detail-value">{client.clientName}</span>
                          </div>
                        </div>
                        <div className="cm-detail-item">
                          <FiMail className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Email</span>
                            <span className="cm-detail-value">{client.email}</span>
                          </div>
                        </div>
                        <div className="cm-detail-item">
                          <FiPhone className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Phone</span>
                            <span className="cm-detail-value">{client.phone}</span>
                          </div>
                        </div>
                        <div className="cm-detail-item">
                          <FiBriefcase className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Designation</span>
                            <span className="cm-detail-value">{client.designation || '—'}</span>
                          </div>
                        </div>
                        <div className="cm-detail-item">
                          <FiMapPin className="cm-detail-icon" />
                          <div>
                            <span className="cm-detail-label">Location</span>
                            <span className="cm-detail-value">{client.location || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'messages' && (
                      <div className="cm-messages-panel">
                        <div className="cm-messages-list">
                          {(!client.messages || client.messages.length === 0) ? (
                            <p className="cm-no-messages">No messages yet. Start the conversation below.</p>
                          ) : (
                            client.messages.map((message, idx) => (
                              <div key={idx} className="cm-message">
                                <div className="cm-message-avatar">
                                  {(message.author || 'A')[0].toUpperCase()}
                                </div>
                                <div className="cm-message-body">
                                  <div className="cm-message-header">
                                    <span className="cm-message-author">{message.author || 'Admin'}</span>
                                    <span className="cm-message-time">{message.timestamp}</span>
                                  </div>
                                  <p className="cm-message-text">{message.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="cm-message-input">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMessage(client._id)}
                          />
                          <button onClick={() => handleAddMessage(client._id)} disabled={!newMessage.trim()}>
                            <FiSend />
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'quote' && (
                      <div className="cm-quote-panel">
                        {!client.quote && !showQuoteGenerator && (
                          <div className="cm-quote-empty">
                            <FiFileText size={32} className="cm-quote-empty-icon" />
                            <p>No quote generated yet</p>
                            <button className="cm-btn-primary" onClick={() => setShowQuoteGenerator(true)}>
                              <FiFileText /> Generate Quote
                            </button>
                          </div>
                        )}

                        {showQuoteGenerator && !client.quote && (
                          <QuoteGenerator
                            client={client}
                            onQuoteGenerated={(quote) => handleQuoteGenerated(client._id, quote)}
                            onCancel={() => setShowQuoteGenerator(false)}
                          />
                        )}

                        {client.quote && (
                          <div className="cm-quote-summary">
                            <div className="cm-quote-items">
                              <div className="cm-quote-items-header">
                                <span>Item</span>
                                <span>Amount</span>
                              </div>
                              {(client.quote.items || []).map((item, idx) => (
                                <div key={idx} className="cm-quote-item">
                                  <span>{item.name}</span>
                                  <span>${(item.price || 0).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div className="cm-quote-footer">
                              <div className="cm-quote-total">
                                <span>Total</span>
                                <span>${(client.quote.total || 0).toLocaleString()}</span>
                              </div>
                              <div className="cm-quote-meta">
                                <span className={`cm-badge cm-badge-${client.quote.status === 'approved' ? 'green' : client.quote.status === 'rejected' ? 'red' : 'amber'}`}>
                                  {client.quote.status}
                                </span>
                                {client.quote.invoiceGenerated && (
                                  <button className="cm-btn-secondary" onClick={() => handleDownloadPDF(client)}>
                                    <FiFileText /> Download PDF
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="noxtm-overlay" onClick={() => setShowAddModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Add New Client</h2>
              <button className="cm-modal-close" onClick={() => setShowAddModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleAddClient} className="cm-modal-form">
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Company Name <span className="cm-required">*</span></label>
                  <input type="text" required placeholder="e.g. Acme Corp" value={newClient.companyName}
                    onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Client Name <span className="cm-required">*</span></label>
                  <input type="text" required placeholder="e.g. John Smith" value={newClient.clientName}
                    onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })} />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Email <span className="cm-required">*</span></label>
                  <input type="email" required placeholder="john@acme.com" value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Phone <span className="cm-required">*</span></label>
                  <input type="tel" required placeholder="+1-555-0123" value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Designation</label>
                  <input type="text" placeholder="e.g. CEO, CTO" value={newClient.designation}
                    onChange={(e) => setNewClient({ ...newClient, designation: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Location</label>
                  <input type="text" placeholder="e.g. New York, USA" value={newClient.location}
                    onChange={(e) => setNewClient({ ...newClient, location: e.target.value })} />
                </div>
              </div>
              <div className="cm-modal-actions">
                <button type="button" className="cm-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="cm-btn-submit">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && editClient && (
        <div className="noxtm-overlay" onClick={() => setShowEditModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Edit Client</h2>
              <button className="cm-modal-close" onClick={() => setShowEditModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleEditClient} className="cm-modal-form">
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Company Name <span className="cm-required">*</span></label>
                  <input type="text" required value={editClient.companyName}
                    onChange={(e) => setEditClient({ ...editClient, companyName: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Client Name <span className="cm-required">*</span></label>
                  <input type="text" required value={editClient.clientName}
                    onChange={(e) => setEditClient({ ...editClient, clientName: e.target.value })} />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Email <span className="cm-required">*</span></label>
                  <input type="email" required value={editClient.email}
                    onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Phone <span className="cm-required">*</span></label>
                  <input type="tel" required value={editClient.phone}
                    onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} />
                </div>
              </div>
              <div className="cm-form-row">
                <div className="cm-form-group">
                  <label>Designation</label>
                  <input type="text" value={editClient.designation || ''}
                    onChange={(e) => setEditClient({ ...editClient, designation: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label>Location</label>
                  <input type="text" value={editClient.location || ''}
                    onChange={(e) => setEditClient({ ...editClient, location: e.target.value })} />
                </div>
              </div>
              <div className="cm-modal-actions">
                <button type="button" className="cm-btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="cm-btn-submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
