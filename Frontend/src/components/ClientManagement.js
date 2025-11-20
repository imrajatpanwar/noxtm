import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiPlus, FiUser, FiMail, FiPhone, FiMessageSquare, 
  FiSend, FiChevronDown, FiChevronUp, FiDollarSign, FiFileText 
} from 'react-icons/fi';
import { toast } from 'sonner';
import QuoteGenerator from './QuoteGenerator';
import './ClientManagement.css';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showQuoteGenerator, setShowQuoteGenerator] = useState(false);
  
  const [newClient, setNewClient] = useState({
    companyName: '',
    clientName: '',
    email: '',
    phone: '',
    designation: '',
    location: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClient)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add client');
      }
      
      const data = await response.json();
      setClients([...clients, data]);
      setShowAddModal(false);
      setNewClient({
        companyName: '',
        clientName: '',
        email: '',
        phone: '',
        designation: '',
        location: ''
      });
      toast.success('Client added successfully');
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    }
  };

  const handleAddMessage = async (clientId) => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to add message');
      }

      const message = await response.json();

      const updatedClients = clients.map(client => {
        if (client._id === clientId || client.id === clientId) {
          return {
            ...client,
            messages: [...client.messages, message]
          };
        }
        return client;
      });

      setClients(updatedClients);
      setNewMessage('');
      toast.success('Message added');
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Failed to add message');
    }
  };

  const handleQuoteGenerated = (clientId, quote) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return { ...client, quote };
      }
      return client;
    });
    setClients(updatedClients);
    setShowQuoteGenerator(false);
    toast.success('Quote generated successfully');
  };

  const handleDownloadPDF = async (client) => {
    try {
      if (!client.quote || !client.quote.invoiceId) {
        toast.error('No invoice available for download');
        return;
      }

      toast.info('Generating invoice PDF...');
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${client.quote.invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${client.quote.invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const toggleClientExpanded = (clientId) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
    setShowQuoteGenerator(false);
  };

  const filteredClients = clients.filter(client =>
    client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="cm-container">
      <div className="cm-header">
        <div className="cm-title-section">
          <h1 className="cm-title">Client Management</h1>
          <p className="cm-subtitle">Manage your clients and track interactions</p>
        </div>
        <button className="cm-add-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="cm-search-section">
        <div className="cm-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="cm-clients-list">
        {filteredClients.length === 0 ? (
          <div className="cm-no-data">
            <FiUser size={48} />
            <h3>No Clients Found</h3>
            <p>Add your first client to get started</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="cm-client-card">
              {/* Client Header */}
              <div 
                className="cm-client-header"
                onClick={() => toggleClientExpanded(client.id)}
              >
                <div className="cm-client-info">
                  <div className="cm-client-main">
                    <h3>{client.companyName}</h3>
                    <span className="cm-client-name">{client.clientName}</span>
                  </div>
                  <div className="cm-client-contact">
                    <span><FiMail /> {client.email}</span>
                    <span><FiPhone /> {client.phone}</span>
                  </div>
                </div>
                <div className="cm-client-actions">
                  {client.quote?.invoiceGenerated && (
                    <span className="cm-invoice-badge">Invoice Generated</span>
                  )}
                  {expandedClient === client.id ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedClient === client.id && (
                <div className="cm-client-details">
                  {/* Full Details Section */}
                  <div className="cm-details-grid">
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Company Name</span>
                      <span className="cm-detail-value">{client.companyName}</span>
                    </div>
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Client Name</span>
                      <span className="cm-detail-value">{client.clientName}</span>
                    </div>
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Email</span>
                      <span className="cm-detail-value">{client.email}</span>
                    </div>
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Phone</span>
                      <span className="cm-detail-value">{client.phone}</span>
                    </div>
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Designation</span>
                      <span className="cm-detail-value">{client.designation}</span>
                    </div>
                    <div className="cm-detail-item">
                      <span className="cm-detail-label">Location</span>
                      <span className="cm-detail-value">{client.location}</span>
                    </div>
                  </div>

                  {/* Activity Thread */}
                  <div className="cm-activity-section">
                    <h4><FiMessageSquare /> Activity Thread</h4>
                    <div className="cm-messages">
                      {client.messages.length === 0 ? (
                        <p className="cm-no-messages">No messages yet</p>
                      ) : (
                        client.messages.map(message => (
                          <div key={message.id} className="cm-message">
                            <div className="cm-message-header">
                              <span className="cm-message-author">{message.author}</span>
                              <span className="cm-message-time">{message.timestamp}</span>
                            </div>
                            <p className="cm-message-text">{message.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Add Message */}
                    <div className="cm-add-message">
                      <input
                        type="text"
                        placeholder="Add a note or message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddMessage(client.id)}
                      />
                      <button onClick={() => handleAddMessage(client.id)}>
                        <FiSend />
                      </button>
                    </div>
                  </div>

                  {/* Payment/Quote Section */}
                  <div className="cm-quote-section">
                    <h4><FiDollarSign /> Payment/Quote</h4>
                    
                    {!client.quote && !showQuoteGenerator && (
                      <button 
                        className="cm-generate-quote-btn"
                        onClick={() => setShowQuoteGenerator(true)}
                      >
                        <FiFileText /> Generate Quote
                      </button>
                    )}

                    {showQuoteGenerator && !client.quote && (
                      <QuoteGenerator 
                        client={client}
                        onQuoteGenerated={(quote) => handleQuoteGenerated(client.id, quote)}
                        onCancel={() => setShowQuoteGenerator(false)}
                      />
                    )}

                    {client.quote && (
                      <div className="cm-quote-summary">
                        <div className="cm-quote-items">
                          {client.quote.items.map((item, idx) => (
                            <div key={idx} className="cm-quote-item">
                              <span>{item.name}</span>
                              <span>${item.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="cm-quote-total">
                          <strong>Total:</strong>
                          <strong>${client.quote.total.toLocaleString()}</strong>
                        </div>
                        <div className="cm-quote-status">
                          Status: <span className={`cm-status-badge ${client.quote.status}`}>
                            {client.quote.status}
                          </span>
                        </div>
                        
                        {client.quote.invoiceGenerated && (
                          <button 
                            className="cm-download-pdf-btn"
                            onClick={() => handleDownloadPDF(client)}
                          >
                            <FiFileText /> Download PDF
                          </button>
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
        <div className="cm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Add New Client</h2>
              <button className="cm-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddClient} className="cm-modal-form">
              <div className="cm-form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  required
                  value={newClient.companyName}
                  onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                />
              </div>
              <div className="cm-form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  required
                  value={newClient.clientName}
                  onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                />
              </div>
              <div className="cm-form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
              </div>
              <div className="cm-form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  required
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
              <div className="cm-form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={newClient.designation}
                  onChange={(e) => setNewClient({ ...newClient, designation: e.target.value })}
                />
              </div>
              <div className="cm-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newClient.location}
                  onChange={(e) => setNewClient({ ...newClient, location: e.target.value })}
                />
              </div>
              <div className="cm-modal-actions">
                <button type="button" className="cm-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="cm-btn-submit">
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
