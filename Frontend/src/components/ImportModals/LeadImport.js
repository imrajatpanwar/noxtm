import React, { useState, useEffect } from 'react';
import './ImportModals.css';

function LeadImport({ onClose, onImportComplete }) {
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/leads', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setLeads(result.leads || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads');
      setLoading(false);
    }
  };

  const handleLeadToggle = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    const filteredLeads = getFilteredLeads();
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead._id));
    }
  };

  const getFilteredLeads = () => {
    if (filterStatus === 'all') {
      return leads;
    }
    return leads.filter(lead => lead.status === filterStatus);
  };

  const handleImport = async () => {
    if (!listName) {
      setError('Please provide a list name');
      return;
    }

    if (selectedLeads.length === 0) {
      setError('Please select at least one lead');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/contact-lists/import/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listName,
          description,
          leadIds: selectedLeads
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to import leads');
      }

      const result = await response.json();
      alert(`Successfully imported ${result.data.contactCount} contacts from leads`);
      onImportComplete(result.data.listId);
    } catch (err) {
      console.error('Lead import error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = getFilteredLeads();

  return (
    <div className="noxtm-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from Leads Metrics</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>List Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Active Leads Q4"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of this contact list"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="filter-section">
            <label>Filter by Status:</label>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Leads</option>
              <option value="Cold Lead">Cold Lead</option>
              <option value="Warm Lead">Warm Lead</option>
              <option value="Qualified (SQL)">Qualified (SQL)</option>
              <option value="Active">Active</option>
              <option value="Dead Lead">Dead Lead</option>
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="leads-selection">
            <div className="selection-header">
              <button className="btn-select-all" onClick={handleSelectAll}>
                {selectedLeads.length === filteredLeads.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selection-count">
                {selectedLeads.length} of {filteredLeads.length} selected
              </span>
            </div>

            {loading ? (
              <div className="loading-state">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="empty-state">No leads found</div>
            ) : (
              <div className="leads-list">
                {filteredLeads.map(lead => (
                  <div
                    key={lead._id}
                    className={selectedLeads.includes(lead._id) ? 'lead-item selected' : 'lead-item'}
                    onClick={() => handleLeadToggle(lead._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead._id)}
                      onChange={() => handleLeadToggle(lead._id)}
                    />
                    <div className="lead-info">
                      <div className="lead-name">{lead.clientName}</div>
                      <div className="lead-details">
                        {lead.companyName} • {lead.email}
                      </div>
                      <span className={`lead-status status-${lead.status.replace(/\s+/g, '-').toLowerCase()}`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={loading || !listName || selectedLeads.length === 0}
          >
            {loading ? 'Importing...' : `Import ${selectedLeads.length} Lead${selectedLeads.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeadImport;
