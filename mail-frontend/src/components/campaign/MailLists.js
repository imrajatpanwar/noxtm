import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiCheck, FiX, FiAlertCircle, FiCheckCircle, FiLoader, FiUpload, FiDownload, FiRefreshCw, FiGlobe, FiFileText, FiUsers, FiSend, FiSearch, FiChevronRight, FiMapPin, FiCalendar, FiMail } from 'react-icons/fi';
import api from '../../config/api';
import './MailLists.css';

// Source type display config
const SOURCE_CONFIG = {
  tradeshow: { label: 'Trade Show', icon: FiGlobe, color: '#7c3aed' },
  csv: { label: 'CSV Import', icon: FiFileText, color: '#2563eb' },
  leads: { label: 'Leads', icon: FiUsers, color: '#059669' },
  manual: { label: 'Manual', icon: FiMail, color: '#6b7280' },
  custom: { label: 'Custom', icon: FiFileText, color: '#d97706' }
};

function MailLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pipelineData, setPipelineData] = useState({});
  const [installedModules, setInstalledModules] = useState([]);
  const [tradeShowMap, setTradeShowMap] = useState({});

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/contact-lists');
      if (response.data.success) {
        const fetchedLists = response.data.data || [];
        setLists(fetchedLists);
        // Fetch pipeline data for lists that have been used in campaigns or have source
        fetchedLists.forEach(list => {
          fetchPipelineData(list._id);
        });
      }
    } catch (err) {
      console.error('Error fetching mail lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstalledModules = useCallback(async () => {
    try {
      const response = await api.get('/modules/installed');
      if (response.data.success) {
        const moduleIds = (response.data.modules || []).map(m => m.moduleId);
        setInstalledModules(moduleIds);
      }
    } catch (err) {
      console.error('Error fetching installed modules:', err);
    }
  }, []);

  const fetchTradeShowMap = useCallback(async () => {
    try {
      const response = await api.get('/contact-lists/import/trade-shows');
      if (response.data.success) {
        const map = {};
        (response.data.data || []).forEach(ts => {
          map[ts._id] = ts.shortName || ts.name || ts.fullName;
        });
        setTradeShowMap(map);
      }
    } catch (err) {
      // silently fail
    }
  }, []);

  const fetchPipelineData = async (listId) => {
    try {
      const response = await api.get(`/contact-lists/${listId}/pipeline`);
      if (response.data.success) {
        setPipelineData(prev => ({ ...prev, [listId]: response.data.data }));
      }
    } catch (err) {
      // silently fail for pipeline data
    }
  };

  useEffect(() => {
    fetchLists();
    fetchInstalledModules();
    fetchTradeShowMap();
  }, [fetchLists, fetchInstalledModules, fetchTradeShowMap]);

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

  const getSourceBadge = (list) => {
    const sourceType = list.source?.type || 'manual';
    return SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.manual;
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
            const sourceBadge = getSourceBadge(list);
            const SourceIcon = sourceBadge.icon;
            const pipeline = pipelineData[list._id];

            // Fix display for lists created with "undefined" in name/description
            const tsId = list.source?.tradeShowId;
            const tsShortName = tsId ? tradeShowMap[tsId] : null;
            const tsName = tsShortName || list.source?.tradeShowName;
            let displayName = list.name || 'Untitled List';
            if (displayName.includes('undefined') && tsName) {
              displayName = `${tsName} Contacts`;
            }
            let displayDesc = list.description || '';
            if (displayDesc.includes('undefined') && tsName) {
              displayDesc = `Imported from trade show: ${tsName}`;
            }
            
            return (
              <div key={list._id} className="list-card">
                <div className="list-card-header">
                  <div className="list-card-title-row">
                    <h3>{displayName}</h3>
                    <span className="source-badge" style={{ background: `${sourceBadge.color}15`, color: sourceBadge.color }}>
                      <SourceIcon size={12} /> {sourceBadge.label}
                    </span>
                  </div>
                  <span className={`list-status ${status.color}`}>{status.label}</span>
                </div>
                
                {displayDesc && !displayDesc.includes('undefined') && (
                  <p className="list-description">{displayDesc}</p>
                )}

                {list.source?.type === 'tradeshow' && (tsName || list.source?.tradeShowName) && (
                  <div className="list-source-info">
                    <FiGlobe size={12} /> {tsName || list.source.tradeShowName}
                  </div>
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

                {/* Pipeline Tracker */}
                {pipeline && (
                  <div className="pipeline-tracker">
                    <div className="pipeline-stages">
                      <div className={`pipeline-stage ${pipeline.fetched > 0 ? 'completed' : ''}`}>
                        <div className="pipeline-dot"></div>
                        <span className="pipeline-label">Fetched</span>
                        <span className="pipeline-count">{pipeline.fetched}</span>
                      </div>
                      <div className="pipeline-connector"></div>
                      <div className={`pipeline-stage ${pipeline.validated ? 'completed' : ''}`}>
                        <div className="pipeline-dot"></div>
                        <span className="pipeline-label">Validated</span>
                        <span className="pipeline-count">{pipeline.validCount}</span>
                      </div>
                      <div className="pipeline-connector"></div>
                      <div className={`pipeline-stage ${pipeline.campaignsUsed > 0 ? 'completed' : ''}`}>
                        <div className="pipeline-dot"></div>
                        <span className="pipeline-label">Campaigns</span>
                        <span className="pipeline-count">{pipeline.campaignsUsed}</span>
                      </div>
                      <div className="pipeline-connector"></div>
                      <div className={`pipeline-stage ${pipeline.totalSent > 0 ? 'completed' : ''}`}>
                        <div className="pipeline-dot"></div>
                        <span className="pipeline-label">Sent</span>
                        <span className="pipeline-count">{pipeline.totalSent}</span>
                      </div>
                    </div>
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
          installedModules={installedModules}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedList && (
        <MailListDetailModal
          list={selectedList}
          tradeShowMap={tradeShowMap}
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

// Create Mail List Modal — with Tabs: Manual/CSV | Trade Show Import | Leads Import
function CreateMailListModal({ onClose, onSuccess, installedModules = [] }) {
  // Check if ExhibitOS module is installed in the workspace
  const hasExhibitOS = installedModules.includes('ExhibitOS');
  
  const [activeTab, setActiveTab] = useState(hasExhibitOS ? 'tradeshow' : 'manual');
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Trade Show Import state
  const [tradeShows, setTradeShows] = useState([]);
  const [tradeShowsLoading, setTradeShowsLoading] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [exhibitors, setExhibitors] = useState([]);
  const [exhibitorsLoading, setExhibitorsLoading] = useState(false);
  const [selectedExhibitors, setSelectedExhibitors] = useState(new Set());
  const [tradeShowSearch, setTradeShowSearch] = useState('');
  const [showStep, setShowStep] = useState('select'); // 'select' | 'exhibitors'

  // Fetch trade shows when tab is activated
  useEffect(() => {
    if (activeTab === 'tradeshow') {
      fetchTradeShows();
    }
  }, [activeTab]);

  const fetchTradeShows = async () => {
    setTradeShowsLoading(true);
    try {
      const response = await api.get('/contact-lists/import/trade-shows');
      if (response.data.success) {
        setTradeShows(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching trade shows:', err);
      setError('Failed to load trade shows');
    } finally {
      setTradeShowsLoading(false);
    }
  };

  const handleSelectShow = async (show) => {
    setSelectedShow(show);
    setShowStep('exhibitors');
    setExhibitorsLoading(true);
    setSelectedExhibitors(new Set());
    try {
      const response = await api.get(`/contact-lists/import/trade-shows/${show._id}/exhibitors`);
      if (response.data.success) {
        const exList = response.data.data?.exhibitors || response.data.data || [];
        setExhibitors(exList);
        // Auto-select all exhibitors that have contacts with emails
        const withEmails = new Set();
        exList.forEach(ex => {
          if (ex.contactCount > 0 || (ex.contacts && ex.contacts.some(c => c.email))) {
            withEmails.add(ex._id);
          }
        });
        setSelectedExhibitors(withEmails);
      }
    } catch (err) {
      console.error('Error fetching exhibitors:', err);
      setError('Failed to load exhibitors');
    } finally {
      setExhibitorsLoading(false);
    }
  };

  const toggleExhibitor = (exhibitorId) => {
    setSelectedExhibitors(prev => {
      const next = new Set(prev);
      if (next.has(exhibitorId)) {
        next.delete(exhibitorId);
      } else {
        next.add(exhibitorId);
      }
      return next;
    });
  };

  const toggleAllExhibitors = () => {
    if (selectedExhibitors.size === exhibitors.length) {
      setSelectedExhibitors(new Set());
    } else {
      setSelectedExhibitors(new Set(exhibitors.map(e => e._id)));
    }
  };

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

      const uniqueEmails = [...new Set(emails)];
      setEmailsText(prev => {
        const existing = prev.split('\n').filter(e => e.trim());
        const combined = [...new Set([...existing, ...uniqueEmails])];
        return combined.join('\n');
      });
    };
    reader.readAsText(file);
  };

  const handleManualSubmit = async (e) => {
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

  const handleTradeShowImport = async () => {
    if (!selectedShow || selectedExhibitors.size === 0) {
      setError('Select at least one exhibitor to import');
      return;
    }

    const showName = selectedShow.shortName || selectedShow.name || selectedShow.fullName || 'Trade Show';
    const listName = formData.name.trim() || `${showName} Contacts`;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/contact-lists/import/trade-shows/${selectedShow._id}`, {
        listName: listName,
        description: formData.description || `Imported from trade show: ${showName}`,
        exhibitorIds: Array.from(selectedExhibitors)
      });

      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error importing trade show contacts:', err);
      setError(err.response?.data?.message || 'Failed to import contacts');
    } finally {
      setLoading(false);
    }
  };

  const emailCount = emailsText
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length;

  const filteredShows = tradeShows.filter(s =>
    s.name?.toLowerCase().includes(tradeShowSearch.toLowerCase()) ||
    s.shortName?.toLowerCase().includes(tradeShowSearch.toLowerCase()) ||
    s.location?.toLowerCase().includes(tradeShowSearch.toLowerCase()) ||
    s.industry?.toLowerCase().includes(tradeShowSearch.toLowerCase())
  );

  const selectedEmailCount = exhibitors
    .filter(e => selectedExhibitors.has(e._id))
    .reduce((sum, e) => sum + (e.contactCount || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-list-modal tabbed-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Mail List</h2>
          <button className="btn-close" onClick={onClose}><FiX /></button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          {hasExhibitOS && (
            <button 
              className={`modal-tab ${activeTab === 'tradeshow' ? 'active' : ''}`}
              onClick={() => { setActiveTab('tradeshow'); setError(null); }}
            >
              <FiGlobe /> Import from Trade Show
            </button>
          )}
          <button 
            className={`modal-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => { setActiveTab('manual'); setError(null); }}
          >
            <FiFileText /> Manual / CSV
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        {/* Manual / CSV Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="create-list-form">
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
        )}

        {/* Trade Show Import Tab */}
        {activeTab === 'tradeshow' && (
          <div className="tradeshow-import-tab">
            {showStep === 'select' && (
              <>
                <div className="ts-name-input">
                  <div className="form-group">
                    <label>List Name (optional — defaults to trade show name)</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Leave blank to auto-name from trade show"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="ts-search-bar">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search trade shows by name, city, or country..."
                    value={tradeShowSearch}
                    onChange={(e) => setTradeShowSearch(e.target.value)}
                  />
                </div>

                {tradeShowsLoading ? (
                  <div className="ts-loading">
                    <FiLoader className="spinner" /> Loading trade shows...
                  </div>
                ) : filteredShows.length === 0 ? (
                  <div className="ts-empty">
                    <FiAlertCircle /> No trade shows found
                  </div>
                ) : (
                  <div className="ts-shows-list">
                    {filteredShows.map(show => (
                      <div 
                        key={show._id} 
                        className="ts-show-card"
                        onClick={() => handleSelectShow(show)}
                      >
                        <div className="ts-show-info">
                          <h4>{show.shortName || show.name || show.fullName || 'Trade Show'}</h4>
                          <div className="ts-show-meta">
                            {show.location && <span><FiMapPin size={12} /> {show.location}</span>}
                            {show.dateFrom && <span><FiCalendar size={12} /> {new Date(show.dateFrom).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="ts-show-stats">
                          <div className="ts-show-stat">
                            <span className="ts-stat-num">{show.exhibitorCount || 0}</span>
                            <span className="ts-stat-label">Exhibitors</span>
                          </div>
                          <div className="ts-show-stat">
                            <span className="ts-stat-num">{show.emailCount || 0}</span>
                            <span className="ts-stat-label">Emails</span>
                          </div>
                          <FiChevronRight className="ts-arrow" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {showStep === 'exhibitors' && selectedShow && (
              <>
                <div className="ts-exhibitor-header">
                  <button className="btn-back" onClick={() => { setShowStep('select'); setSelectedShow(null); }}>
                    ← Back to Trade Shows
                  </button>
                  <div className="ts-selected-show">
                    <h4>{selectedShow.shortName || selectedShow.name}</h4>
                    <span className="ts-selected-count">
                      {selectedExhibitors.size} exhibitors selected · ~{selectedEmailCount} emails
                    </span>
                  </div>
                </div>

                {exhibitorsLoading ? (
                  <div className="ts-loading">
                    <FiLoader className="spinner" /> Loading exhibitors...
                  </div>
                ) : (
                  <>
                    <div className="ts-exhibitor-controls">
                      <label className="ts-select-all">
                        <input
                          type="checkbox"
                          checked={selectedExhibitors.size === exhibitors.length && exhibitors.length > 0}
                          onChange={toggleAllExhibitors}
                        />
                        Select All ({exhibitors.length})
                      </label>
                    </div>

                    <div className="ts-exhibitors-list">
                      {exhibitors.map(exhibitor => (
                        <label key={exhibitor._id} className={`ts-exhibitor-item ${selectedExhibitors.has(exhibitor._id) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedExhibitors.has(exhibitor._id)}
                            onChange={() => toggleExhibitor(exhibitor._id)}
                          />
                          <div className="ts-exhibitor-info">
                            <span className="ts-exhibitor-name">{exhibitor.companyName || exhibitor.name}</span>
                            <span className="ts-exhibitor-contacts">
                              <FiMail size={11} /> {exhibitor.contactCount || 0} contacts with email
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => { setShowStep('select'); setSelectedShow(null); }}>
                        Back
                      </button>
                      <button 
                        className="btn-primary"
                        onClick={handleTradeShowImport}
                        disabled={loading || selectedExhibitors.size === 0}
                      >
                        {loading ? 'Importing...' : `Import ${selectedEmailCount} Contacts`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Mail List Detail Modal with Validation — Redesigned
function MailListDetailModal({ list, onClose, onUpdate, tradeShowMap = {} }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [filter, setFilter] = useState('all'); // all, valid, invalid, pending
  const [removingInvalid, setRemovingInvalid] = useState(false);
  const [pipeline, setPipeline] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [addingToCampaign, setAddingToCampaign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    fetchPipelineInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list._id]);

  const fetchPipelineInfo = async () => {
    try {
      const response = await api.get(`/contact-lists/${list._id}/pipeline`);
      if (response.data.success) {
        setPipeline(response.data.data);
      }
    } catch (err) {
      // silent
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      if (response.data.success) {
        const drafts = (response.data.data || []).filter(c => c.status === 'draft');
        setCampaigns(drafts);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleUseInCampaign = async (campaignId) => {
    setAddingToCampaign(true);
    try {
      const response = await api.post(`/campaigns/${campaignId}/recipients`, {
        contactListIds: [list._id]
      });
      if (response.data.success) {
        alert(`Added contacts to campaign successfully!`);
        setShowCampaignPicker(false);
        fetchPipelineInfo();
        onUpdate();
      }
    } catch (err) {
      console.error('Error adding to campaign:', err);
      alert(err.response?.data?.message || 'Failed to add contacts to campaign');
    } finally {
      setAddingToCampaign(false);
    }
  };

  const validateEmails = async () => {
    setValidating(true);
    setValidationProgress(0);

    try {
      const response = await api.post(`/contact-lists/${list._id}/validate`);
      
      if (response.data.success) {
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
    a.download = `${list.name || 'mail-list'}-${filter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredContacts = () => {
    let result = contacts;
    switch (filter) {
      case 'valid':
        result = contacts.filter(c => c.status === 'valid');
        break;
      case 'invalid':
        result = contacts.filter(c => c.status === 'invalid');
        break;
      case 'pending':
        result = contacts.filter(c => !c.status || c.status === 'pending');
        break;
      default:
        break;
    }
    if (searchTerm) {
      result = result.filter(c => c.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  };

  const stats = {
    total: contacts.length,
    valid: contacts.filter(c => c.status === 'valid').length,
    invalid: contacts.filter(c => c.status === 'invalid').length,
    pending: contacts.filter(c => !c.status || c.status === 'pending').length
  };

  const filteredContacts = getFilteredContacts();
  const isReadyToUse = stats.invalid === 0 && stats.pending === 0 && stats.total > 0;
  const validPercent = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

  const getValidationReasonText = (reason) => {
    const reasons = {
      'invalid_format': 'Invalid email format',
      'disposable': 'Disposable email',
      'role_based': 'Role-based email',
      'no_mx': 'No mail server',
      'dns_error': 'DNS error',
      'catch_all': 'Catch-all domain',
      'spam_trap': 'Spam trap',
      'bounced': 'Previously bounced',
      'syntax_error': 'Syntax error',
      'duplicate': 'Duplicate'
    };
    return reasons[reason] || reason || '';
  };

  const sourceType = list.source?.type || 'manual';
  const sourceConfig = SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.manual;
  const SourceIcon = sourceConfig.icon;
  const tradeShowName = (() => {
    const tsId = list.source?.tradeShowId;
    const shortName = tsId ? tradeShowMap[tsId] : null;
    return shortName || list.source?.tradeShowName || (list.source?.details?.match(/Imported from (.+?) -/)?.[1]) || '';
  })();

  // Fix display for lists created with "undefined" in name/description
  let detailName = list.name || 'Untitled Mail List';
  if (detailName.includes('undefined') && tradeShowName) {
    detailName = `${tradeShowName} Contacts`;
  }
  let detailDesc = list.description || '';
  if (detailDesc.includes('undefined') && tradeShowName) {
    detailDesc = `Imported from trade show: ${tradeShowName}`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal-redesign" onClick={e => e.stopPropagation()}>
        
        {/* Dark Header */}
        <div className="dm-header">
          <div className="dm-header-bg"></div>
          <div className="dm-header-content">
            <div className="dm-header-top">
              {/* Info on left side */}
              <div className="dm-header-info">
                <div className="dm-title-row">
                  <h2>{detailName}</h2>
                  <span className="dm-source-badge" style={{ background: sourceConfig.color }}>
                    <SourceIcon size={11} /> {sourceConfig.label}
                  </span>
                </div>
                {detailDesc && !detailDesc.includes('undefined') && (
                  <p className="dm-description">{detailDesc}</p>
                )}
                {sourceType === 'tradeshow' && tradeShowName && (
                  <div className="dm-source-tag">
                    <FiGlobe size={12} /> {tradeShowName}
                  </div>
                )}
              </div>
              
              {/* Stats on right side */}
              <div className="dm-header-stats">
                <div 
                  className={`dm-stat-card ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  <span className="dm-stat-value">{stats.total}</span>
                  <span className="dm-stat-label">Total</span>
                </div>
                <div 
                  className={`dm-stat-card valid ${filter === 'valid' ? 'active' : ''}`}
                  onClick={() => setFilter('valid')}
                >
                  <FiCheckCircle size={14} />
                  <span className="dm-stat-value">{stats.valid}</span>
                  <span className="dm-stat-label">Valid</span>
                </div>
                <div 
                  className={`dm-stat-card invalid ${filter === 'invalid' ? 'active' : ''}`}
                  onClick={() => setFilter('invalid')}
                >
                  <FiX size={14} />
                  <span className="dm-stat-value">{stats.invalid}</span>
                  <span className="dm-stat-label">Invalid</span>
                </div>
                <div 
                  className={`dm-stat-card pending ${filter === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilter('pending')}
                >
                  <FiLoader size={14} />
                  <span className="dm-stat-value">{stats.pending}</span>
                  <span className="dm-stat-label">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Progress Ring */}
        {stats.total > 0 && (stats.valid > 0 || stats.invalid > 0) && (
          <div className="dm-progress-section">
            <div className="dm-progress-ring-wrapper">
              <svg className="dm-progress-ring" viewBox="0 0 80 80">
                <circle className="dm-ring-bg" cx="40" cy="40" r="34" />
                <circle 
                  className="dm-ring-fill" 
                  cx="40" cy="40" r="34" 
                  strokeDasharray={`${validPercent * 2.136} ${213.6 - validPercent * 2.136}`}
                  strokeDashoffset="53.4"
                />
              </svg>
              <div className="dm-ring-text">
                <span className="dm-ring-percent">{validPercent}%</span>
                <span className="dm-ring-label">Valid</span>
              </div>
            </div>
            <div className="dm-progress-details">
              <div className="dm-progress-bar-container">
                <div className="dm-progress-bar">
                  <div className="dm-bar-valid" style={{ width: `${stats.total > 0 ? (stats.valid / stats.total) * 100 : 0}%` }}></div>
                  <div className="dm-bar-invalid" style={{ width: `${stats.total > 0 ? (stats.invalid / stats.total) * 100 : 0}%` }}></div>
                  <div className="dm-bar-pending" style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="dm-progress-legend">
                <span className="dm-legend-item"><span className="dm-legend-dot valid"></span> Valid ({stats.valid})</span>
                <span className="dm-legend-item"><span className="dm-legend-dot invalid"></span> Invalid ({stats.invalid})</span>
                <span className="dm-legend-item"><span className="dm-legend-dot pending"></span> Pending ({stats.pending})</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <div className={`dm-status-banner ${isReadyToUse ? 'ready' : stats.invalid > 0 ? 'warning' : 'info'}`}>
          <div className="dm-status-icon">
            {isReadyToUse ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
          </div>
          <div className="dm-status-text">
            {isReadyToUse ? (
              <><strong>Ready for Campaigns</strong> <span>All emails are validated and ready to send.</span></>
            ) : stats.invalid > 0 ? (
              <><strong>Invalid Emails Detected</strong> <span>Remove invalid emails before using in campaigns.</span></>
            ) : (
              <><strong>Validation Required</strong> <span>Validate emails to ensure deliverability.</span></>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="dm-toolbar">
          <div className="dm-toolbar-left">
            <button 
              className="dm-btn dm-btn-primary"
              onClick={validateEmails}
              disabled={validating || stats.pending === 0}
            >
              {validating ? (
                <><FiLoader className="spinner" /> Validating {validationProgress}%</>
              ) : (
                <><FiRefreshCw size={14} /> Validate Emails</>
              )}
            </button>
            
            {stats.invalid > 0 && (
              <button 
                className="dm-btn dm-btn-danger"
                onClick={removeInvalidEmails}
                disabled={removingInvalid}
              >
                {removingInvalid ? (
                  <><FiLoader className="spinner" /> Removing...</>
                ) : (
                  <><FiTrash2 size={14} /> Remove Invalid ({stats.invalid})</>
                )}
              </button>
            )}
          </div>
          <div className="dm-toolbar-right">
            <div className="dm-search-input">
              <FiSearch size={14} />
              <input 
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="dm-btn dm-btn-secondary" onClick={exportList}>
              <FiDownload size={14} /> Export
            </button>
          </div>
        </div>

        {/* Validation Progress Bar */}
        {validating && (
          <div className="dm-validation-bar">
            <div className="dm-validation-fill" style={{ width: `${validationProgress}%` }}></div>
          </div>
        )}

        {/* Contacts Table */}
        <div className="dm-contacts-section">
          {loading ? (
            <div className="dm-loading">
              <FiLoader className="spinner" size={24} />
              <span>Loading contacts...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="dm-empty">
              <FiMail size={32} />
              <span>No {filter !== 'all' ? filter : ''} contacts found{searchTerm ? ` matching "${searchTerm}"` : ''}.</span>
            </div>
          ) : (
            <div className="dm-table-wrapper">
              <table className="dm-table">
                <thead>
                  <tr>
                    <th className="dm-th-email">Email Address</th>
                    <th className="dm-th-status">Status</th>
                    <th className="dm-th-reason">Reason</th>
                    <th className="dm-th-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.slice(0, 100).map((contact, index) => (
                    <tr key={contact._id || index} className={`dm-row dm-row-${contact.status || 'pending'}`}>
                      <td className="dm-cell-email">
                        <FiMail size={13} className="dm-email-icon" />
                        {contact.email}
                      </td>
                      <td>
                        <span className={`dm-badge dm-badge-${contact.status || 'pending'}`}>
                          {contact.status === 'valid' && <FiCheck size={12} />}
                          {contact.status === 'invalid' && <FiX size={12} />}
                          {(!contact.status || contact.status === 'pending') && <FiLoader size={12} />}
                          {contact.status === 'valid' ? 'Valid' : contact.status === 'invalid' ? 'Invalid' : 'Pending'}
                        </span>
                      </td>
                      <td className="dm-cell-reason">
                        {contact.status === 'invalid' && contact.validationReason && (
                          <span className="dm-reason">{getValidationReasonText(contact.validationReason)}</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="dm-btn-icon"
                          onClick={() => removeContact(contact._id)}
                          title="Remove contact"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredContacts.length > 100 && (
            <div className="dm-truncated">
              Showing first 100 of {filteredContacts.length} contacts
            </div>
          )}
        </div>

        {/* Pipeline Info */}
        {pipeline && pipeline.campaignsUsed > 0 && (
          <div className="dm-pipeline-section">
            <div className="dm-pipeline-header">
              <FiSend size={14} />
              <span>Used in {pipeline.campaignsUsed} campaign{pipeline.campaignsUsed > 1 ? 's' : ''}</span>
            </div>
            <div className="dm-pipeline-metrics">
              <div className="dm-metric sent"><span className="dm-metric-num">{pipeline.totalSent}</span><span className="dm-metric-label">Sent</span></div>
              {pipeline.totalOpened > 0 && <div className="dm-metric opened"><span className="dm-metric-num">{pipeline.totalOpened}</span><span className="dm-metric-label">Opened</span></div>}
              {pipeline.totalClicked > 0 && <div className="dm-metric clicked"><span className="dm-metric-num">{pipeline.totalClicked}</span><span className="dm-metric-label">Clicked</span></div>}
              {pipeline.totalBounced > 0 && <div className="dm-metric bounced"><span className="dm-metric-num">{pipeline.totalBounced}</span><span className="dm-metric-label">Bounced</span></div>}
              {pipeline.totalFailed > 0 && <div className="dm-metric failed"><span className="dm-metric-num">{pipeline.totalFailed}</span><span className="dm-metric-label">Failed</span></div>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="dm-footer">
          <div className="dm-footer-left">
            {list.source?.importedAt && (
              <span className="dm-footer-meta">
                <FiCalendar size={12} /> Imported {new Date(list.source.importedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="dm-footer-right">
            <button className="dm-btn dm-btn-ghost" onClick={onClose}>Close</button>
            {isReadyToUse && (
              <>
                {!showCampaignPicker ? (
                  <button 
                    className="dm-btn dm-btn-campaign"
                    onClick={() => {
                      fetchCampaigns();
                      setShowCampaignPicker(true);
                    }}
                  >
                    <FiSend size={14} /> Use in Campaign
                  </button>
                ) : (
                  <div className="dm-campaign-picker">
                    {campaigns.length === 0 ? (
                      <span className="dm-no-campaigns">No draft campaigns found</span>
                    ) : (
                      <select 
                        onChange={(e) => {
                          if (e.target.value) handleUseInCampaign(e.target.value);
                        }}
                        disabled={addingToCampaign}
                        defaultValue=""
                      >
                        <option value="" disabled>Select campaign...</option>
                        {campaigns.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <button className="dm-btn dm-btn-ghost dm-btn-sm" onClick={() => setShowCampaignPicker(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MailLists;
