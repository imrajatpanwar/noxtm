import React, { useState, useEffect } from 'react';
import './Findr.css';

function Findr() {
  const [tradeShows, setTradeShows] = useState([]);
  const [selectedTradeShow, setSelectedTradeShow] = useState('');
  const [extractionType, setExtractionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTradeShows, setLoadingTradeShows] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTradeShows();
  }, []);

  const fetchTradeShows = async () => {
    setLoadingTradeShows(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = '/api/trade-shows';
      console.log('Fetching trade shows from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trade shows API response:', data);
        console.log('Trade shows count:', data.tradeShows?.length || 0);
        
        if (data.tradeShows && data.tradeShows.length > 0) {
          console.log('First trade show:', data.tradeShows[0]);
        }
        
        setTradeShows(data.tradeShows || []);
      } else {
        console.error('Failed to fetch trade shows:', response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        
        if (response.status === 401) {
          alert('Please login again. Your session may have expired.');
        }
      }
    } catch (error) {
      console.error('Error fetching trade shows:', error);
      alert('Failed to load trade shows. Please check your connection.');
    } finally {
      setLoadingTradeShows(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedTradeShow || !extractionType) {
      alert('Please select both a trade show and extraction type');
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/findr/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedTradeShowId: selectedTradeShow,
          extractionType: extractionType
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Settings saved! Now use the Chrome extension to add exhibitor data.');
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="findr-container">
      <div className="findr-header">
        <h1 className="findr-title">findr</h1>
        <p className="findr-subtitle">Configure extraction settings for the Chrome extension</p>
      </div>

      <div className="findr-content">
        <div className="findr-card">
          {successMessage && (
            <div className="success-banner">
              <span className="success-icon">✓</span>
              {successMessage}
            </div>
          )}

          <div className="findr-info-box">
            <h3 className="info-title">📱 How to Use findr</h3>
            <ol className="info-steps">
              <li>Select a trade show from the dropdown below</li>
              <li>Choose the type of data you want to extract</li>
              <li>Click "Save Settings"</li>
              <li>Use the <strong>findr Chrome Extension</strong> to add exhibitor data</li>
            </ol>
            <p className="info-note">
              💡 The Chrome extension will automatically use these settings to save data to your account.
            </p>
          </div>

          <div className="findr-divider"></div>

          <div className="findr-field">
            <label className="findr-label">Choose Trade Show</label>
            <select
              value={selectedTradeShow}
              onChange={(e) => setSelectedTradeShow(e.target.value)}
              className="findr-select"
              disabled={loadingTradeShows}
            >
              <option value="">
                {loadingTradeShows ? 'Loading trade shows...' : 
                 tradeShows.length === 0 ? 'No trade shows available - Create one first' : 
                 'Select a trade show...'}
              </option>
              {tradeShows.map((show) => (
                <option key={show._id} value={show._id}>
                  {show.showName || show.shortName || 'Unnamed Show'} {show.showLocation ? `- ${show.showLocation}` : ''}
                </option>
              ))}
            </select>
            {tradeShows.length === 0 && !loadingTradeShows && (
              <p className="helper-text">
                No trade shows found. Please create a trade show from the Trade Shows menu first.
              </p>
            )}
          </div>

          <div className="findr-field">
            <label className="findr-label">Extract Data of?</label>
            <div className="findr-radio-group">
              <label className="findr-radio-label">
                <input
                  type="radio"
                  name="extractionType"
                  value="exhibitors"
                  checked={extractionType === 'exhibitors'}
                  onChange={(e) => setExtractionType(e.target.value)}
                  className="findr-radio"
                />
                <span>
                  <strong>Exhibitor's Data</strong> <span className="badge-active">Active</span>
                </span>
              </label>
              <label className="findr-radio-label findr-radio-disabled">
                <input
                  type="radio"
                  name="extractionType"
                  value="companies"
                  checked={extractionType === 'companies'}
                  onChange={(e) => setExtractionType(e.target.value)}
                  className="findr-radio"
                  disabled
                />
                <span>
                  <strong>Exhibitors Company Data</strong> <span className="badge-coming-soon">Coming Soon</span>
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={loading || !selectedTradeShow || !extractionType}
            className="findr-extract-btn"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Findr;
