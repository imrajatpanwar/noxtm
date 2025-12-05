import React, { useState, useEffect } from 'react';
import './ImportModals.css';

function TradeShowImport({ onClose, onImportComplete }) {
  const [step, setStep] = useState(1); // 1: Select Trade Show, 2: Select Exhibitors
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [tradeShows, setTradeShows] = useState([]);
  const [selectedTradeShow, setSelectedTradeShow] = useState(null);
  const [exhibitors, setExhibitors] = useState([]);
  const [selectedExhibitors, setSelectedExhibitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTradeShows();
  }, []);

  const fetchTradeShows = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/contact-lists/import/trade-shows', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTradeShows(result.data || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trade shows:', err);
      setError('Failed to load trade shows');
      setLoading(false);
    }
  };

  const fetchExhibitors = async (tradeShowId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-lists/import/trade-shows/${tradeShowId}/exhibitors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setExhibitors(result.data.exhibitors || []);
        setSelectedTradeShow(result.data.tradeShow);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching exhibitors:', err);
      setError('Failed to load exhibitors');
      setLoading(false);
    }
  };

  const handleTradeShowSelect = (tradeShow) => {
    fetchExhibitors(tradeShow._id);
    setListName(`${tradeShow.shortName} Contacts`);
    setDescription(`Contacts from ${tradeShow.fullName}`);
    setStep(2);
  };

  const handleExhibitorToggle = (exhibitorId) => {
    setSelectedExhibitors(prev =>
      prev.includes(exhibitorId)
        ? prev.filter(id => id !== exhibitorId)
        : [...prev, exhibitorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExhibitors.length === exhibitors.length) {
      setSelectedExhibitors([]);
    } else {
      setSelectedExhibitors(exhibitors.map(exhibitor => exhibitor._id));
    }
  };

  const handleImport = async () => {
    if (!listName) {
      setError('Please provide a list name');
      return;
    }

    if (selectedExhibitors.length === 0) {
      setError('Please select at least one exhibitor');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/contact-lists/import/trade-shows/${selectedTradeShow.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listName,
          description,
          exhibitorIds: selectedExhibitors
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to import from trade show');
      }

      const result = await response.json();
      alert(`Successfully imported ${result.data.contactCount} contacts from ${result.data.tradeShow}`);
      onImportComplete(result.data.listId);
    } catch (err) {
      console.error('Trade show import error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from Trade Show</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Step Indicator */}
          <div className="import-steps">
            <div className={step >= 1 ? 'import-step active' : 'import-step'}>
              <span className="step-num">1</span> Select Trade Show
            </div>
            <div className="step-divider"></div>
            <div className={step >= 2 ? 'import-step active' : 'import-step'}>
              <span className="step-num">2</span> Select Exhibitors
            </div>
          </div>

          {/* Step 1: Select Trade Show */}
          {step === 1 && (
            <>
              {loading ? (
                <div className="loading-state">Loading trade shows...</div>
              ) : tradeShows.length === 0 ? (
                <div className="empty-state">
                  <p>No trade shows found</p>
                  <small>Create a trade show first to import exhibitor contacts</small>
                </div>
              ) : (
                <div className="tradeshows-list">
                  {tradeShows.map(show => (
                    <div
                      key={show._id}
                      className="tradeshow-card"
                      onClick={() => handleTradeShowSelect(show)}
                    >
                      <div className="tradeshow-info">
                        <h3>{show.fullName}</h3>
                        <div className="tradeshow-meta">
                          <span>📅 {formatDate(show.showDate)}</span>
                          <span>📍 {show.location}</span>
                          {show.exhibitorCount > 0 && (
                            <span>🏢 {show.exhibitorCount} exhibitors</span>
                          )}
                        </div>
                      </div>
                      <div className="tradeshow-action">→</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Select Exhibitors */}
          {step === 2 && (
            <>
              <div className="selected-tradeshow">
                <button className="btn-back" onClick={() => setStep(1)}>
                  ← Back to Trade Shows
                </button>
                <div className="tradeshow-details">
                  <strong>{selectedTradeShow?.name}</strong>
                  <span>{formatDate(selectedTradeShow?.date)} • {selectedTradeShow?.location}</span>
                </div>
              </div>

              <div className="form-group">
                <label>List Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., CES 2025 Leads"
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

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="exhibitors-selection">
                <div className="selection-header">
                  <button className="btn-select-all" onClick={handleSelectAll}>
                    {selectedExhibitors.length === exhibitors.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="selection-count">
                    {selectedExhibitors.length} of {exhibitors.length} selected
                  </span>
                </div>

                {loading ? (
                  <div className="loading-state">Loading exhibitors...</div>
                ) : exhibitors.length === 0 ? (
                  <div className="empty-state">No exhibitors found for this trade show</div>
                ) : (
                  <div className="exhibitors-list">
                    {exhibitors.map(exhibitor => (
                      <div
                        key={exhibitor._id}
                        className={selectedExhibitors.includes(exhibitor._id) ? 'exhibitor-item selected' : 'exhibitor-item'}
                        onClick={() => handleExhibitorToggle(exhibitor._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExhibitors.includes(exhibitor._id)}
                          onChange={() => handleExhibitorToggle(exhibitor._id)}
                        />
                        <div className="exhibitor-info">
                          <div className="exhibitor-name">{exhibitor.companyName}</div>
                          <div className="exhibitor-details">
                            {exhibitor.boothNo && <span>Booth {exhibitor.boothNo}</span>}
                            {exhibitor.location && <span>{exhibitor.location}</span>}
                            <span className="contact-badge">
                              {exhibitor.contactCount} contact{exhibitor.contactCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {step === 2 && (
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={loading || !listName || selectedExhibitors.length === 0}
            >
              {loading ? 'Importing...' : `Import ${selectedExhibitors.length} Exhibitor${selectedExhibitors.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TradeShowImport;
