import React, { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { BiSearch, BiExport } from 'react-icons/bi';
import { FiFilter } from 'react-icons/fi';
import { BsCalendar4 } from 'react-icons/bs';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './Findr.css';
import { API_BASE_URL } from '../../config/apiConfig';

function Findr() {
  const [activeView, setActiveView] = useState('settings'); // 'settings', 'data', or 'user-report'
  
  // Settings state
  const [tradeShows, setTradeShows] = useState([]);
  const [selectedTradeShow, setSelectedTradeShow] = useState('');
  const [extractionType, setExtractionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTradeShows, setLoadingTradeShows] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [useCase, setUseCase] = useState(''); // 'leads' or 'tradeshow'
  const [fullDetails, setFullDetails] = useState(''); // 'yes' or 'no'

  // User Report state
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState('today');

  // Data view state
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // Fetch trade shows for settings
  useEffect(() => {
    if (activeView === 'settings') {
      fetchTradeShows();
      fetchCurrentSettings();
    }
  }, [activeView]);

  // Fetch data when switching to data view
  useEffect(() => {
    if (activeView === 'data') {
      fetchScrapedData();
    } else if (activeView === 'user-report') {
      fetchUserReports();
    }
  }, [activeView]);

  // Fetch user reports when date filter changes
  useEffect(() => {
    if (activeView === 'user-report') {
      fetchUserReports();
    }
  }, [reportDateFilter]);

  const fetchCurrentSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/findr/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSelectedTradeShow(data.settings.selectedTradeShowId || '');
          setExtractionType(data.settings.extractionType || '');
          setUseCase(data.settings.useCase || '');
          setFullDetails(data.settings.fullDetails || '');
        }
      }
    } catch (error) {
      console.error('Error fetching current settings:', error);
    }
  };

  const fetchTradeShows = async () => {
    setLoadingTradeShows(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = '/api/trade-shows';
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTradeShows(data.tradeShows || []);
      } else {
        console.error('Failed to fetch trade shows:', response.status);
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

  // Auto-save function
  const autoSaveSettings = async (settings) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/findr/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
    } catch (error) {
      console.error('Error auto-saving settings:', error);
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
          extractionType: extractionType,
          useCase,
          fullDetails
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Settings updated successfully! Now use the Chrome extension to add exhibitor data.');
        
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

  // User Report functions
  const fetchUserReports = async () => {
    setLoadingReports(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/findr/user-reports?filter=${reportDateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserReports(data.reports || []);
      } else {
        console.error('Error fetching user reports');
        setUserReports([]);
      }
    } catch (error) {
      console.error('Error fetching user reports:', error);
      setUserReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Data view functions
  const fetchScrapedData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/scraped-data`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch scraped data (Status: ${res.status})`);
      }
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setData(json.data || []);
      } catch (parseError) {
        console.error('API Response:', text);
        throw new Error(`Failed to parse JSON response`);
      }
    } catch (err) {
      console.error('findrData Error:', err);
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const filterData = useCallback(() => {
    let filtered = data;

    if (searchTerm.trim()) {
      filtered = filtered.filter(entry => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (entry.name && entry.name.toLowerCase().includes(searchLower)) ||
          (entry.email && entry.email.toLowerCase().includes(searchLower)) ||
          (entry.phone && entry.phone.toLowerCase().includes(searchLower)) ||
          (entry.role && entry.role.toLowerCase().includes(searchLower)) ||
          (entry.location && entry.location.toLowerCase().includes(searchLower))
        );
      });
    }

    if (isDateFilterActive) {
      filtered = filtered.filter(entry => {
        if (!entry.timestamp) return false;
        const entryDate = new Date(entry.timestamp);
        const startDate = new Date(dateRange[0].startDate);
        const endDate = new Date(dateRange[0].endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchTerm, dateRange, isDateFilterActive]);

  useEffect(() => {
    filterData();
  }, [filterData]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredData.map(entry => entry._id || entry.profileUrl));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleExport = () => {
    console.log('Export clicked');
  };

  const handleFilters = () => {
    console.log('Filters clicked');
  };

  const handleClickOutside = useCallback((e) => {
    if (showCalendar && !e.target.closest('.date-selector')) {
      setShowCalendar(false);
    }
  }, [showCalendar]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Pagination
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const paginatedData = filteredData.slice(startIdx, endIdx);

  // Render Settings View
  const renderSettingsView = () => (
    <div className="findr-container">
      <div className="findr-content">
        <div className="findr-card">
          {successMessage && (
            <div className="success-banner">
              <span className="success-icon">✓</span>
              {successMessage}
            </div>
          )}

          <div className="findr-field">
            <label className="findr-label">Use case of findr ?</label>
            <select
              value={useCase}
              onChange={(e) => {
                const value = e.target.value;
                setUseCase(value);
                // Auto-save
                autoSaveSettings({
                  selectedTradeShowId: selectedTradeShow,
                  extractionType,
                  useCase: value,
                  fullDetails
                });
              }}
              className="findr-select"
            >
              <option value="">Choose Option</option>
              <option value="leads">Leads Directory</option>
              <option value="tradeshow">Trade Show Data</option>
            </select>
          </div>

          {useCase === 'leads' && (
            <div className="findr-field">
              <label className="findr-label">Full Details of Company ?</label>
              <select
                value={fullDetails}
                onChange={(e) => {
                  const value = e.target.value;
                  setFullDetails(value);
                  // Auto-save
                  autoSaveSettings({
                    selectedTradeShowId: selectedTradeShow,
                    extractionType,
                    useCase,
                    fullDetails: value
                  });
                }}
                className="findr-select"
              >
                <option value="">Choose Option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          )}

          {useCase === 'tradeshow' && (
            <>
              <div className="findr-field">
                <label className="findr-label">Choose Trade Show</label>
                <select
                  value={selectedTradeShow}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedTradeShow(value);
                    // Auto-save
                    autoSaveSettings({
                      selectedTradeShowId: value,
                      extractionType,
                      useCase,
                      fullDetails
                    });
                  }}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        setExtractionType(value);
                        // Auto-save
                        autoSaveSettings({
                          selectedTradeShowId: selectedTradeShow,
                          extractionType: value,
                          useCase,
                          fullDetails
                        });
                      }}
                      className="findr-radio"
                    />
                    <span>
                      <strong>Exhibitor's Data</strong> <span className="badge-active">Active</span>
                    </span>
                  </label>
                  <label className="findr-radio-label">
                    <input
                      type="radio"
                      name="extractionType"
                      value="companies"
                      checked={extractionType === 'companies'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExtractionType(value);
                        // Auto-save
                        autoSaveSettings({
                          selectedTradeShowId: selectedTradeShow,
                          extractionType: value,
                          useCase,
                          fullDetails
                        });
                      }}
                      className="findr-radio"
                    />
                    <span>
                      <strong>Exhibitors Company Data</strong> <span className="badge-active">Active</span>
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Render Data View
  const renderDataView = () => (
    <div className="findr-data-page">
      <div className="header-flex">
        <div className="header-left">
          <h2 className="header-title">findr Data</h2>
        </div>
        <div className="header-right">
          <div className="search-box">
            <BiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="filter-btn" onClick={handleFilters}>
            <FiFilter /> Filters
          </button>
        </div>
      </div>

      <Container className="findr-data-container">
        <div className="data-controls">
          <div className="info-section">
            <div className="total-count" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '16px', color: '#222', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {totalCount > 0
                  ? `${startIdx + 1}-${endIdx} of ${new Intl.NumberFormat('en-IN').format(totalCount)}`
                  : '0'}
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '18px', color: '#333', padding: 0 }}
                  aria-label="Previous page"
                >
                  <GrFormPrevious />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '18px', color: '#333', padding: 0 }}
                  aria-label="Next page"
                >
                  <GrFormNext />
                </button>
              </span>
              {(isDateFilterActive || searchTerm.trim()) && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                  (filtered from {new Intl.NumberFormat('en-IN').format(data.length)} total)
                </span>
              )}
            </div>
          </div>
          <div className="right-controls">
            <div className="date-selector">
              <div 
                className="date-display" 
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <BsCalendar4 />
                <span>
                  {isDateFilterActive 
                    ? `${format(dateRange[0].startDate, 'dd MMM yyyy')} - ${format(dateRange[0].endDate, 'dd MMM yyyy')}`
                    : 'Choose Date Range...'
                  }
                </span>
              </div>
              {showCalendar && (
                <div className="calendar-popup">
                  <DateRange
                    onChange={item => {
                      setDateRange([item.selection]);
                      setIsDateFilterActive(true);
                    }}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                    months={1}
                    className="date-range"
                  />
                </div>
              )}
            </div>
            {(isDateFilterActive || searchTerm.trim()) && (
              <button 
                className="clear-filter-btn" 
                onClick={() => {
                  setIsDateFilterActive(false);
                  setSearchTerm('');
                  setDateRange([{
                    startDate: new Date(),
                    endDate: new Date(),
                    key: 'selection'
                  }]);
                }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: '#f8f9fa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                Clear Filters
              </button>
            )}
            <button className="export-btn" onClick={handleExport}>
              <BiExport /> Export and share
            </button>
          </div>
        </div>

        {totalCount > 0 && (
          <div style={{ margin: '8px 0 0 0', textAlign: 'left', fontSize: '14px', color: '#555' }}>
            Page {currentPage} of {totalPages}
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}
        {loadingData && (
          <div className="text-center my-4">
            <Spinner animation="border" role="status" />
          </div>
        )}
        {!loadingData && !error && filteredData.length === 0 && data.length === 0 && (
          <Alert variant="info">No scraped profiles found yet.</Alert>
        )}
        {!loadingData && !error && filteredData.length === 0 && data.length > 0 && searchTerm.trim() && !isDateFilterActive && (
          <Alert variant="info">No results found for "{searchTerm}". Try a different search term.</Alert>
        )}
        {!loadingData && !error && filteredData.length === 0 && data.length > 0 && isDateFilterActive && !searchTerm.trim() && (
          <Alert variant="info">No data found for the selected date range.</Alert>
        )}
        {!loadingData && !error && filteredData.length === 0 && data.length > 0 && isDateFilterActive && searchTerm.trim() && (
          <Alert variant="info">No results found for "{searchTerm}" in the selected date range.</Alert>
        )}
        {!loadingData && !error && paginatedData.length > 0 && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="select">
                    <input 
                      type="checkbox" 
                      checked={paginatedData.length > 0 && paginatedData.every(entry => selectedRows.includes(entry._id || entry.profileUrl))}
                      onChange={handleSelectAll}
                      className="custom-checkbox"
                    />
                  </th>
                  <th className="name">Name</th>
                  <th className="email">E-mail</th>
                  <th className="phone">Phone</th>
                  <th className="role">Role</th>
                  <th className="location">Location</th>
                  <th className="date">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((entry) => (
                  <tr 
                    key={entry._id || entry.profileUrl}
                    className={selectedRows.includes(entry._id || entry.profileUrl) ? 'selected-row' : ''}
                  >
                    <td className="select">
                      <input 
                        type="checkbox"
                        checked={selectedRows.includes(entry._id || entry.profileUrl)}
                        onChange={() => handleRowSelect(entry._id || entry.profileUrl)}
                        className="custom-checkbox"
                      />
                    </td>
                    <td className="name">{entry.name || '-'}</td>
                    <td className="email">{entry.email || '-'}</td>
                    <td className="phone">{entry.phone || '-'}</td>
                    <td className="role">{entry.role || '-'}</td>
                    <td className="location">{entry.location || '-'}</td>
                    <td className="date">{entry.timestamp ? (() => {
                      const date = new Date(entry.timestamp);
                      const day = date.getDate().toString().padStart(2, '0');
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );

  const renderUserReportView = () => {
    const getDateRangeText = () => {
      switch(reportDateFilter) {
        case 'today': return 'Today';
        case 'yesterday': return 'Yesterday';
        case 'this-month': return 'This Month';
        case 'last-month': return 'Last Month';
        default: return 'All Time';
      }
    };

    return (
      <div className="findr-user-report-view">
        <div className="report-header">
          <h2 className="report-title">User Activity Report</h2>
          <div className="report-filters">
            <select 
              value={reportDateFilter} 
              onChange={(e) => setReportDateFilter(e.target.value)}
              className="report-date-filter"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="report-period">
          <BsCalendar4 /> Showing data for: <strong>{getDateRangeText()}</strong>
        </div>

        {loadingReports ? (
          <div className="report-loading">
            <Spinner animation="border" />
            <p>Loading user reports...</p>
          </div>
        ) : userReports.length === 0 ? (
          <div className="report-empty">
            <p>No user activity found for the selected period.</p>
          </div>
        ) : (
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Exhibitor's Data</th>
                  <th>Company Data</th>
                  <th>Total</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {userReports.map((report, index) => (
                  <tr key={index}>
                    <td className="user-name">{report.userName}</td>
                    <td className="user-email">{report.userEmail}</td>
                    <td className="stat-count exhibitors-count">{report.exhibitorsDataCount}</td>
                    <td className="stat-count company-count">{report.companyDataCount}</td>
                    <td className="stat-total"><strong>{report.totalCount}</strong></td>
                    <td className="last-activity">
                      {report.lastActivity ? new Date(report.lastActivity).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="findr-wrapper">
      <div className="findr-main-header">
        <h1 className="findr-main-title">findr</h1>
        <p className="findr-main-subtitle">Collector of data and Leads - Extract and manage your business intelligence</p>
      </div>
      
      <div className="findr-tabs">
        <button 
          className={`findr-tab ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          Settings
        </button>
        <button 
          className={`findr-tab ${activeView === 'data' ? 'active' : ''}`}
          onClick={() => setActiveView('data')}
        >
          Data
        </button>
        <button 
          className={`findr-tab ${activeView === 'user-report' ? 'active' : ''}`}
          onClick={() => setActiveView('user-report')}
        >
          User Report
        </button>
      </div>
      
      {activeView === 'settings' && renderSettingsView()}
      {activeView === 'data' && renderDataView()}
      {activeView === 'user-report' && renderUserReportView()}
    </div>
  );
}

export default Findr;
