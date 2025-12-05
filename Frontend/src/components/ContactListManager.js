import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContactListManager.css';
import CSVImport from './ImportModals/CSVImport';
import LeadImport from './ImportModals/LeadImport';
import TradeShowImport from './ImportModals/TradeShowImport';

function ContactListManager() {
  const navigate = useNavigate();
  const [contactLists, setContactLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImportModal, setShowImportModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => {
    fetchContactLists();
  }, []);

  const fetchContactLists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/contact-lists', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact lists');
      }

      const result = await response.json();
      setContactLists(result.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching contact lists:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleViewList = async (listId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-lists/${listId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch list details');
      }

      const result = await response.json();
      setSelectedList(result.data);
    } catch (err) {
      console.error('Error fetching list details:', err);
      alert('Failed to load list details');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this contact list?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete list');
      }

      fetchContactLists();
      if (selectedList && selectedList._id === listId) {
        setSelectedList(null);
      }
      alert('Contact list deleted successfully');
    } catch (err) {
      console.error('Error deleting list:', err);
      alert('Failed to delete contact list');
    }
  };

  const handleDeleteContact = async (listId, email) => {
    if (!window.confirm('Are you sure you want to remove this contact from the list?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-lists/${listId}/contacts/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove contact');
      }

      // Refresh the list details
      handleViewList(listId);
      fetchContactLists();
      alert('Contact removed successfully');
    } catch (err) {
      console.error('Error removing contact:', err);
      alert('Failed to remove contact');
    }
  };

  const handleExportCSV = () => {
    if (!selectedList || !selectedList.contacts.length) {
      alert('No contacts to export');
      return;
    }

    // Create CSV content
    const headers = ['Email', 'Name', 'Company', 'Phone', 'Designation', 'Location'];
    const rows = selectedList.contacts.map(contact => [
      contact.email,
      contact.name || '',
      contact.companyName || '',
      contact.phone || '',
      contact.designation || '',
      contact.location || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedList.name.replace(/\s+/g, '_')}_contacts.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportComplete = (listId) => {
    setShowImportModal(null);
    fetchContactLists();
    if (listId) {
      handleViewList(listId);
    }
  };

  const getFilteredLists = () => {
    let filtered = contactLists;

    // Filter by source
    if (filterSource !== 'all') {
      filtered = filtered.filter(list => list.source.type === filterSource);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(list =>
        list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (list.description && list.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSourceBadge = (sourceType) => {
    const badges = {
      csv: { label: 'CSV', color: '#3B82F6' },
      leads: { label: 'Leads', color: '#10B981' },
      tradeshow: { label: 'Trade Show', color: '#F59E0B' },
      custom: { label: 'Custom', color: '#6B7280' },
      manual: { label: 'Manual', color: '#8B5CF6' }
    };

    const badge = badges[sourceType] || badges.custom;
    return (
      <span className="source-badge" style={{ backgroundColor: badge.color }}>
        {badge.label}
      </span>
    );
  };

  const filteredLists = getFilteredLists();

  if (loading) {
    return (
      <div className="contact-list-manager">
        <div className="loading-state">Loading contact lists...</div>
      </div>
    );
  }

  return (
    <div className="contact-list-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Contact Lists</h1>
            <p>Manage your contact lists and recipients</p>
          </div>
          <button className="btn-back" onClick={() => navigate('/campaigns')}>
            ← Back to Campaigns
          </button>
        </div>
      </div>

      <div className="manager-layout">
        {/* Sidebar - Lists */}
        <div className="lists-sidebar">
          <div className="sidebar-header">
            <h2>All Lists ({contactLists.length})</h2>

            <div className="import-buttons">
              <button
                className="btn-import-small"
                onClick={() => setShowImportModal('csv')}
                title="Import CSV"
              >
                📁 CSV
              </button>
              <button
                className="btn-import-small"
                onClick={() => setShowImportModal('leads')}
                title="Import Leads"
              >
                👥 Leads
              </button>
              <button
                className="btn-import-small"
                onClick={() => setShowImportModal('tradeshow')}
                title="Import Trade Show"
              >
                🎪 Shows
              </button>
            </div>
          </div>

          <div className="search-filter">
            <input
              type="text"
              className="search-input"
              placeholder="Search lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="filter-select"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="csv">CSV</option>
              <option value="leads">Leads</option>
              <option value="tradeshow">Trade Shows</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="lists-container">
            {filteredLists.length === 0 ? (
              <div className="empty-state-sidebar">
                <p>No contact lists found</p>
                <button
                  className="btn-create"
                  onClick={() => setShowImportModal('csv')}
                >
                  Create Your First List
                </button>
              </div>
            ) : (
              filteredLists.map(list => (
                <div
                  key={list._id}
                  className={selectedList && selectedList._id === list._id ? 'list-item active' : 'list-item'}
                  onClick={() => handleViewList(list._id)}
                >
                  <div className="list-item-header">
                    <h3>{list.name}</h3>
                    {getSourceBadge(list.source.type)}
                  </div>
                  <p className="list-description">
                    {list.description || 'No description'}
                  </p>
                  <div className="list-meta">
                    <span className="contact-count-badge">
                      {list.contactCount} contacts
                    </span>
                    <span className="list-date">
                      {formatDate(list.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - List Details */}
        <div className="list-details">
          {!selectedList ? (
            <div className="empty-selection">
              <div className="empty-icon">📋</div>
              <h3>Select a contact list</h3>
              <p>Choose a list from the sidebar to view and manage contacts</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div className="details-title">
                  <h2>{selectedList.name}</h2>
                  {getSourceBadge(selectedList.source.type)}
                </div>
                <div className="details-actions">
                  <button
                    className="btn-export"
                    onClick={handleExportCSV}
                  >
                    📥 Export CSV
                  </button>
                  <button
                    className="btn-delete-list"
                    onClick={() => handleDeleteList(selectedList._id)}
                  >
                    🗑️ Delete List
                  </button>
                </div>
              </div>

              <div className="details-info">
                {selectedList.description && (
                  <p className="list-full-description">{selectedList.description}</p>
                )}
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Total Contacts:</span>
                    <span className="info-value">{selectedList.contactCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">{formatDate(selectedList.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Source:</span>
                    <span className="info-value">{selectedList.source.details || selectedList.source.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Used in Campaigns:</span>
                    <span className="info-value">{selectedList.usedInCampaigns || 0}</span>
                  </div>
                </div>
              </div>

              <div className="contacts-section">
                <h3>Contacts ({selectedList.contacts.length})</h3>

                {selectedList.contacts.length === 0 ? (
                  <div className="empty-contacts">
                    <p>No contacts in this list</p>
                  </div>
                ) : (
                  <div className="contacts-table-container">
                    <table className="contacts-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Phone</th>
                          <th>Designation</th>
                          <th>Added</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedList.contacts.map((contact, index) => (
                          <tr key={index}>
                            <td className="contact-email">{contact.email}</td>
                            <td>{contact.name || '-'}</td>
                            <td>{contact.companyName || '-'}</td>
                            <td>{contact.phone || '-'}</td>
                            <td>{contact.designation || '-'}</td>
                            <td>{formatDate(contact.addedAt)}</td>
                            <td>
                              <button
                                className="btn-remove-contact"
                                onClick={() => handleDeleteContact(selectedList._id, contact.email)}
                                title="Remove contact"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Import Modals */}
      {showImportModal === 'csv' && (
        <CSVImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
      {showImportModal === 'leads' && (
        <LeadImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
      {showImportModal === 'tradeshow' && (
        <TradeShowImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}

export default ContactListManager;
