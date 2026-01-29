import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiCheck, FiX, FiAlertCircle, FiCheckCircle, FiLoader, FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import api from '../../config/api';
import './MailLists.css';

function MailLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/contact-lists');
      if (response.data.success) {
        setLists(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching mail lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleListCreated = () => {
    setShowCreateModal(false);
    fetchLists();
  };

  const handleViewList = (list) => {
    setSelectedList(list);
    setShowDetailModal(true);
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this mail list?')) return;
    
    try {
      await api.delete(`/contact-lists/${listId}`);
      fetchLists();
    } catch (err) {
      console.error('Error deleting list:', err);
      alert('Failed to delete list');
    }
  };

  const getListStatus = (list) => {
    const totalContacts = list.contacts?.length || list.contactCount || 0;
    const validContacts = list.validCount || 0;
    const invalidContacts = list.invalidCount || 0;
    const pendingContacts = totalContacts - validContacts - invalidContacts;

    if (totalContacts === 0) {
      return { status: 'empty', label: 'Empty', color: 'gray' };
    }
    if (pendingContacts > 0 && !list.validated) {
      return { status: 'pending', label: 'Needs Validation', color: 'yellow' };
    }
    if (invalidContacts > 0) {
      return { status: 'warning', label: 'Has Invalid Emails', color: 'orange' };
    }
    if (validContacts === totalContacts && list.validated) {
      return { status: 'ready', label: 'Good to Go ✓', color: 'green' };
    }
    return { status: 'validated', label: 'Validated', color: 'blue' };
  };

  if (loading) {
    return (
      <div className="mail-lists-container">
        <div className="mail-lists-loading">
          <FiLoader className="spinner" /> Loading mail lists...
        </div>
      </div>
    );
  }

  return (
    <div className="mail-lists-container">
      {/* Header */}
      <div className="mail-lists-header">
        <div className="header-left">
          <h1>Mail Lists</h1>
          <p>Manage your email lists with validation & verification</p>
        </div>
        <div className="header-right">
          <button 
            className="btn-create-list"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> Create Mail List
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="lists-stats">
        <div className="stat-card">
          <span className="stat-value">{lists.length}</span>
          <span className="stat-label">Total Lists</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {lists.reduce((sum, l) => sum + (l.contacts?.length || l.contactCount || 0), 0).toLocaleString()}
          </span>
          <span className="stat-label">Total Contacts</span>
        </div>
        <div className="stat-card good">
          <span className="stat-value">
            {lists.filter(l => getListStatus(l).status === 'ready').length}
          </span>
          <span className="stat-label">Ready to Use</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">
            {lists.filter(l => getListStatus(l).status === 'pending').length}
          </span>
          <span className="stat-label">Needs Validation</span>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="lists-grid">
        {lists.length === 0 ? (
          <div className="no-lists">
            <FiAlertCircle size={48} />
            <h3>No Mail Lists Yet</h3>
            <p>Create your first mail list to start sending campaigns using the button above</p>
          </div>
        ) : (
          lists.map(list => {
            const status = getListStatus(list);
            const totalContacts = list.contacts?.length || list.contactCount || 0;
            
            return (
              <div key={list._id} className="list-card">
                <div className="list-card-header">
                  <h3>{list.name}</h3>
                  <span className={`list-status ${status.color}`}>{status.label}</span>
                </div>
                
                {list.description && (
                  <p className="list-description">{list.description}</p>
                )}
                
                <div className="list-stats">
                  <div className="list-stat">
                    <span className="stat-number">{totalContacts.toLocaleString()}</span>
                    <span className="stat-text">Total Emails</span>
                  </div>
                  <div className="list-stat valid">
                    <span className="stat-number">{(list.validCount || 0).toLocaleString()}</span>
                    <span className="stat-text">Valid</span>
                  </div>
                  <div className="list-stat invalid">
                    <span className="stat-number">{(list.invalidCount || 0).toLocaleString()}</span>
                    <span className="stat-text">Invalid</span>
                  </div>
                </div>

                {list.validated && (
                  <div className="validation-bar">
                    <div 
                      className="validation-progress valid" 
                      style={{ width: `${totalContacts > 0 ? (list.validCount / totalContacts) * 100 : 0}%` }}
                    ></div>
                    <div 
                      className="validation-progress invalid" 
                      style={{ width: `${totalContacts > 0 ? (list.invalidCount / totalContacts) * 100 : 0}%` }}
                    ></div>
                  </div>
                )}

                <div className="list-card-actions">
                  <button className="btn-view" onClick={() => handleViewList(list)}>
                    View & Manage
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteList(list._id)}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMailListModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleListCreated}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedList && (
        <MailListDetailModal
          list={selectedList}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedList(null);
          }}
          onUpdate={fetchLists}
        />
      )}
    </div>
  );
}

// Create Mail List Modal
function CreateMailListModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const emails = [];

      lines.forEach(line => {
        const parts = line.split(',');
        parts.forEach(part => {
          const email = part.trim().toLowerCase();
          if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emails.push(email);
          }
        });
      });

      // Remove duplicates
      const uniqueEmails = [...new Set(emails)];
      setEmailsText(prev => {
        const existing = prev.split('\n').filter(e => e.trim());
        const combined = [...new Set([...existing, ...uniqueEmails])];
        return combined.join('\n');
      });
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('List name is required');
      return;
    }

    const emails = emailsText
      .split(/[\n,]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const uniqueEmails = [...new Set(emails)];

    if (uniqueEmails.length === 0) {
      setError('Please add at least one valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/contact-lists', {
        name: formData.name,
        description: formData.description,
        contacts: uniqueEmails.map(email => ({ email }))
      });

      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err.response?.data?.message || 'Failed to create mail list');
    } finally {
      setLoading(false);
    }
  };

  const emailCount = emailsText
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-list-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Mail List</h2>
          <button className="btn-close" onClick={onClose}><FiX /></button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-list-form">
          <div className="form-group">
            <label>List Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., LinkedIn Indian Founders"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this mail list"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              Email Addresses 
              {emailCount > 0 && <span className="email-count">({emailCount} emails)</span>}
            </label>
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="Paste email addresses here (one per line or comma-separated)&#10;&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"
              rows={10}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Or Upload CSV/TXT File</label>
            <div className="file-upload-area">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={loading}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <FiUpload /> Choose File or Drag & Drop
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || emailCount === 0}>
              {loading ? 'Creating...' : `Create List (${emailCount} emails)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mail List Detail Modal with Validation
function MailListDetailModal({ list, onClose, onUpdate }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [filter, setFilter] = useState('all'); // all, valid, invalid, pending
  const [removingInvalid, setRemovingInvalid] = useState(false);

  const fetchListDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/contact-lists/${list._id}`);
      if (response.data.success) {
        setContacts(response.data.data.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching list details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list._id]);

  const validateEmails = async () => {
    setValidating(true);
    setValidationProgress(0);

    try {
      const response = await api.post(`/contact-lists/${list._id}/validate`);
      
      if (response.data.success) {
        // Simulate progress for UX
        const interval = setInterval(() => {
          setValidationProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            return prev + 10;
          });
        }, 200);

        setTimeout(() => {
          clearInterval(interval);
          setValidationProgress(100);
          fetchListDetails();
          onUpdate();
          setValidating(false);
        }, 2500);
      }
    } catch (err) {
      console.error('Error validating emails:', err);
      alert('Failed to validate emails: ' + (err.response?.data?.message || err.message));
      setValidating(false);
    }
  };

  const removeInvalidEmails = async () => {
    if (!window.confirm('Remove all invalid emails from this list?')) return;

    setRemovingInvalid(true);
    try {
      const response = await api.post(`/contact-lists/${list._id}/remove-invalid`);
      if (response.data.success) {
        fetchListDetails();
        onUpdate();
      }
    } catch (err) {
      console.error('Error removing invalid emails:', err);
      alert('Failed to remove invalid emails');
    } finally {
      setRemovingInvalid(false);
    }
  };

  const removeContact = async (contactId) => {
    try {
      await api.delete(`/contact-lists/${list._id}/contacts/${contactId}`);
      fetchListDetails();
      onUpdate();
    } catch (err) {
      console.error('Error removing contact:', err);
    }
  };

  const exportList = () => {
    const filteredContacts = getFilteredContacts();
    const csvContent = filteredContacts.map(c => c.email).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name}-${filter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredContacts = () => {
    switch (filter) {
      case 'valid':
        return contacts.filter(c => c.status === 'valid');
      case 'invalid':
        return contacts.filter(c => c.status === 'invalid');
      case 'pending':
        return contacts.filter(c => !c.status || c.status === 'pending');
      default:
        return contacts;
    }
  };

  const stats = {
    total: contacts.length,
    valid: contacts.filter(c => c.status === 'valid').length,
    invalid: contacts.filter(c => c.status === 'invalid').length,
    pending: contacts.filter(c => !c.status || c.status === 'pending').length
  };

  const filteredContacts = getFilteredContacts();
  const isReadyToUse = stats.invalid === 0 && stats.pending === 0 && stats.total > 0;

  const getValidationReasonText = (reason) => {
    const reasons = {
      'invalid_format': 'Invalid email format',
      'disposable': 'Disposable email',
      'role_based': 'Role-based email (info@, support@, etc.)',
      'no_mx': 'Domain has no mail server',
      'dns_error': 'Domain DNS error',
      'catch_all': 'Catch-all domain (risky)',
      'spam_trap': 'Potential spam trap',
      'bounced': 'Previously bounced',
      'syntax_error': 'Syntax error',
      'duplicate': 'Duplicate email'
    };
    return reasons[reason] || reason || 'Unknown issue';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="list-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{list.name}</h2>
            {list.description && <p className="list-desc">{list.description}</p>}
          </div>
          <button className="btn-close" onClick={onClose}><FiX /></button>
        </div>

        {/* Status Banner */}
        <div className={`status-banner ${isReadyToUse ? 'ready' : stats.invalid > 0 ? 'warning' : 'info'}`}>
          {isReadyToUse ? (
            <>
              <FiCheckCircle /> <strong>Good to Go!</strong> This list is validated and ready to use in campaigns.
            </>
          ) : stats.invalid > 0 ? (
            <>
              <FiAlertCircle /> <strong>Has Invalid Emails</strong> - Remove invalid emails before using in campaigns.
            </>
          ) : (
            <>
              <FiAlertCircle /> <strong>Validation Required</strong> - Validate emails to ensure deliverability.
            </>
          )}
        </div>

        {/* Stats */}
        <div className="detail-stats">
          <div 
            className={`stat-item ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div 
            className={`stat-item valid ${filter === 'valid' ? 'active' : ''}`}
            onClick={() => setFilter('valid')}
          >
            <FiCheckCircle />
            <span className="stat-num">{stats.valid}</span>
            <span className="stat-label">Valid</span>
          </div>
          <div 
            className={`stat-item invalid ${filter === 'invalid' ? 'active' : ''}`}
            onClick={() => setFilter('invalid')}
          >
            <FiX />
            <span className="stat-num">{stats.invalid}</span>
            <span className="stat-label">Invalid</span>
          </div>
          <div 
            className={`stat-item pending ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <FiLoader />
            <span className="stat-num">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          <button 
            className="btn-validate"
            onClick={validateEmails}
            disabled={validating || stats.pending === 0}
          >
            {validating ? (
              <>
                <FiLoader className="spinner" /> Validating ({validationProgress}%)
              </>
            ) : (
              <>
                <FiRefreshCw /> Validate Emails
              </>
            )}
          </button>
          
          {stats.invalid > 0 && (
            <button 
              className="btn-remove-invalid"
              onClick={removeInvalidEmails}
              disabled={removingInvalid}
            >
              {removingInvalid ? (
                <><FiLoader className="spinner" /> Removing...</>
              ) : (
                <><FiTrash2 /> Remove All Invalid ({stats.invalid})</>
              )}
            </button>
          )}

          <button className="btn-export" onClick={exportList}>
            <FiDownload /> Export {filter !== 'all' ? filter : 'All'}
          </button>
        </div>

        {/* Validation Progress */}
        {validating && (
          <div className="validation-progress-bar">
            <div className="progress-fill" style={{ width: `${validationProgress}%` }}></div>
          </div>
        )}

        {/* Contacts List */}
        <div className="contacts-list">
          {loading ? (
            <div className="loading-contacts">
              <FiLoader className="spinner" /> Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="no-contacts">
              No {filter !== 'all' ? filter : ''} contacts found.
            </div>
          ) : (
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.slice(0, 100).map((contact, index) => (
                  <tr key={contact._id || index} className={contact.status || 'pending'}>
                    <td className="email-cell">{contact.email}</td>
                    <td>
                      <span className={`status-badge ${contact.status || 'pending'}`}>
                        {contact.status === 'valid' && <FiCheck />}
                        {contact.status === 'invalid' && <FiX />}
                        {(!contact.status || contact.status === 'pending') && <FiLoader />}
                        {contact.status || 'Pending'}
                      </span>
                    </td>
                    <td className="reason-cell">
                      {contact.status === 'invalid' && contact.validationReason && (
                        <span className="reason-text">{getValidationReasonText(contact.validationReason)}</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-remove-contact"
                        onClick={() => removeContact(contact._id)}
                        title="Remove contact"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredContacts.length > 100 && (
            <div className="contacts-truncated">
              Showing first 100 of {filteredContacts.length} contacts
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          {isReadyToUse && (
            <button className="btn-primary">
              <FiCheck /> Use in Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MailLists;
