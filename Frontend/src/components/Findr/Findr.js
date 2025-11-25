import React, { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { BiSearch, BiExport } from 'react-icons/bi';
import { FiFilter, FiPlay, FiPause, FiSquare, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { BsCalendar4 } from 'react-icons/bs';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './Findr.css';
import { API_BASE_URL } from '../../config/apiConfig';
import io from 'socket.io-client';

function Findr() {
  const [activeView, setActiveView] = useState('settings'); // 'settings', 'crawler', or 'user-report'
  
  // Settings state
  const [tradeShows, setTradeShows] = useState([]);
  const [selectedTradeShow, setSelectedTradeShow] = useState('');
  const [extractionType, setExtractionType] = useState('');
  const [loadingTradeShows, setLoadingTradeShows] = useState(true);
  const [useCase, setUseCase] = useState(''); // 'leads' or 'tradeshow'
  const [fullDetails, setFullDetails] = useState(''); // 'yes' or 'no'

  // User Report state
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState('today');

  // Crawler state
  const [crawlers, setCrawlers] = useState([]);
  const [selectedCrawler, setSelectedCrawler] = useState('');
  const [crawlerTradeShowName, setCrawlerTradeShowName] = useState('');
  const [loadingCrawlers, setLoadingCrawlers] = useState(true);
  const [runningJob, setRunningJob] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);
  const [crawlerLogs, setCrawlerLogs] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [socket, setSocket] = useState(null);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Fetch data when switching views
  useEffect(() => {
    if (activeView === 'user-report') {
      fetchUserReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Fetch user reports when date filter changes
  useEffect(() => {
    if (activeView === 'user-report') {
      fetchUserReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDateFilter, activeView]);

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
        console.log('Fetched settings:', data);
        if (data.settings) {
          if (data.settings.selectedTradeShowId) setSelectedTradeShow(data.settings.selectedTradeShowId);
          if (data.settings.extractionType) setExtractionType(data.settings.extractionType);
          if (data.settings.useCase) setUseCase(data.settings.useCase);
          if (data.settings.fullDetails) setFullDetails(data.settings.fullDetails);
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
      const response = await fetch('/api/findr/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        console.error('Failed to save settings:', await response.text());
      }
    } catch (error) {
      console.error('Error auto-saving settings:', error);
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

  // Crawler functions
  useEffect(() => {
    if (activeView === 'crawler') {
      fetchCrawlers();
      fetchCrawlerHistory();
      fetchTradeShows(); // Fetch trade shows for dropdown
    }
  }, [activeView]);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    if (activeView === 'crawler' && runningJob) {
      const socketInstance = io(API_BASE_URL, {
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('Connected to crawler socket');
        socketInstance.emit('join', runningJob);
      });

      socketInstance.on('crawler:progress', (data) => {
        setJobProgress(data);
        if (data.logs) {
          setCrawlerLogs(prev => [...prev, ...data.logs]);
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from crawler socket');
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [activeView, runningJob]);

  const fetchCrawlers = async () => {
    setLoadingCrawlers(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/findr/crawlers/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCrawlers(data.crawlers || []);
      }
    } catch (error) {
      console.error('Error fetching crawlers:', error);
    } finally {
      setLoadingCrawlers(false);
    }
  };

  const fetchCrawlerHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/findr/crawlers/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobHistory(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching crawler history:', error);
    }
  };

  const handleRunCrawler = async () => {
    if (!selectedCrawler) {
      alert('Please select a crawler');
      return;
    }

    if (!selectedTradeShow || (selectedTradeShow === '__new__' && !crawlerTradeShowName.trim())) {
      alert('Please select a trade show or enter a name for new trade show');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        crawlerId: selectedCrawler,
        tradeShowName: crawlerTradeShowName
      };

      // Add customUrl if enabled
      if (useCustomUrl && customUrl.trim()) {
        requestBody.customUrl = customUrl.trim();
      }

      const response = await fetch('/api/findr/crawlers/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setRunningJob(data.jobId);
        setCrawlerLogs([]);
        setJobProgress({ progress: 0, status: 'starting' });
        alert('Crawler started successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to start crawler: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting crawler:', error);
      alert('Failed to start crawler');
    }
  };

  const handleStopCrawler = async () => {
    if (!runningJob) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/findr/crawlers/stop/${runningJob}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Crawler stopped');
        setRunningJob(null);
        setJobProgress(null);
        fetchCrawlerHistory();
      }
    } catch (error) {
      console.error('Error stopping crawler:', error);
    }
  };

  // Render Settings View
  const renderSettingsView = () => (
    <div className="findr-container">
      <div className="findr-content">
        <div className="findr-card">
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

  // Render Crawler View
  const renderCrawlerView = () => {
    const selectedCrawlerInfo = crawlers.find(c => c.id === selectedCrawler);

    return (
      <div className="findr-crawler-view">
        <div className="crawler-header">
          <h2 className="crawler-title">Findr Crawler</h2>
          <p className="crawler-subtitle">Automate data extraction from trade show websites</p>
        </div>

        <div className="crawler-controls-card">
          <div className="crawler-form">
            <div className="findr-field">
              <label className="findr-label">Select Crawler Script</label>
              <select
                value={selectedCrawler}
                onChange={(e) => setSelectedCrawler(e.target.value)}
                className="findr-select"
                disabled={loadingCrawlers || runningJob}
              >
                <option value="">
                  {loadingCrawlers ? 'Loading crawlers...' : 'Choose a crawler...'}
                </option>
                {crawlers.map((crawler) => (
                  <option key={crawler.id} value={crawler.id}>
                    {crawler.displayName}
                  </option>
                ))}
              </select>
              {selectedCrawlerInfo && (
                <p className="helper-text" style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                  {selectedCrawlerInfo.description}
                </p>
              )}
            </div>

            <div className="findr-field">
              <label className="findr-label">Trade Show</label>
              <select
                value={selectedTradeShow}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTradeShow(value);
                  if (value === '__new__') {
                    setCrawlerTradeShowName('');
                  } else {
                    const show = tradeShows.find(ts => ts._id === value);
                    setCrawlerTradeShowName(show ? show.name : '');
                  }
                }}
                className="findr-select"
                disabled={loadingTradeShows || runningJob}
              >
                <option value="">
                  {loadingTradeShows ? 'Loading trade shows...' : 'Select existing or create new...'}
                </option>
                <option value="__new__">➕ Create New Trade Show</option>
                {tradeShows.map((show) => (
                  <option key={show._id} value={show._id}>
                    {show.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTradeShow === '__new__' && (
              <div className="findr-field">
                <label className="findr-label">New Trade Show Name</label>
                <input
                  type="text"
                  value={crawlerTradeShowName}
                  onChange={(e) => setCrawlerTradeShowName(e.target.value)}
                  className="findr-select"
                  placeholder="Enter trade show name (e.g., Eurobike 2025)"
                  disabled={runningJob}
                  style={{ padding: '10px 12px' }}
                />
                <p className="helper-text" style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                  A new trade show will be created with this name
                </p>
              </div>
            )}

            <div className="findr-field">
              <label className="findr-radio-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={useCustomUrl}
                  onChange={(e) => {
                    setUseCustomUrl(e.target.checked);
                    if (!e.target.checked) {
                      setCustomUrl('');
                    }
                  }}
                  disabled={runningJob}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <span>Use Custom URL (for any trade show website)</span>
              </label>
              <p className="helper-text" style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                Enable this to scrape exhibitor data from any trade show website URL
              </p>
            </div>

            {useCustomUrl && (
              <div className="findr-field">
                <label className="findr-label">Custom Exhibitor List URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="findr-select"
                  placeholder="https://example.com/exhibitors"
                  disabled={runningJob}
                  style={{ padding: '10px 12px' }}
                />
                <p className="helper-text" style={{ marginTop: '4px', fontSize: '12px', color: '#ff9800' }}>
                  ⚠️ Warning: Real scraping may encounter bot protection, CAPTCHAs, or authentication requirements
                </p>
              </div>
            )}

            <div className="crawler-actions">
              {!runningJob ? (
                <button
                  onClick={handleRunCrawler}
                  disabled={!selectedCrawler || !selectedTradeShow || (selectedTradeShow === '__new__' && !crawlerTradeShowName.trim()) || (useCustomUrl && !customUrl.trim())}
                  className="crawler-btn crawler-btn-primary"
                >
                  <FiPlay /> Run Crawler
                </button>
              ) : (
                <>
                  <button
                    onClick={handleStopCrawler}
                    className="crawler-btn crawler-btn-danger"
                  >
                    <FiSquare /> Stop Crawler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {runningJob && jobProgress && (
          <div className="crawler-progress-card">
            <div className="progress-header">
              <h3>Crawler Progress</h3>
              <span className={`status-badge status-${jobProgress.status}`}>
                {jobProgress.status === 'running' && <FiPlay />}
                {jobProgress.status === 'completed' && <FiCheck />}
                {jobProgress.status === 'failed' && <FiAlertCircle />}
                {jobProgress.status}
              </span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${jobProgress.progress || 0}%` }}></div>
              <span className="progress-text">{jobProgress.progress || 0}%</span>
            </div>

            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-label">Current Page:</span>
                <span className="stat-value">{jobProgress.currentPage || 0} / {jobProgress.totalPages || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Extracted:</span>
                <span className="stat-value">{jobProgress.recordsExtracted || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Saved:</span>
                <span className="stat-value">{jobProgress.recordsSaved || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Merged:</span>
                <span className="stat-value">{jobProgress.recordsMerged || 0}</span>
              </div>
            </div>

            {crawlerLogs.length > 0 && (
              <div className="crawler-logs">
                <h4>Logs</h4>
                <div className="logs-container">
                  {crawlerLogs.slice(-20).map((log, index) => (
                    <div key={index} className={`log-entry log-${log.level || 'info'}`}>
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {jobHistory.length > 0 && (
          <div className="crawler-history-card">
            <h3>Recent Crawler Jobs</h3>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Script</th>
                    <th>Trade Show</th>
                    <th>Status</th>
                    <th>Extracted</th>
                    <th>Saved</th>
                    <th>Merged</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {jobHistory.map((job) => (
                    <tr key={job.jobId}>
                      <td>{job.scriptName}</td>
                      <td>{job.tradeShowName}</td>
                      <td>
                        <span className={`status-badge status-${job.status}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{job.recordsExtracted || 0}</td>
                      <td>{job.recordsSaved || 0}</td>
                      <td>{job.recordsMerged || 0}</td>
                      <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

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
          className={`findr-tab ${activeView === 'crawler' ? 'active' : ''}`}
          onClick={() => setActiveView('crawler')}
        >
          Crawler
        </button>
        <button 
          className={`findr-tab ${activeView === 'user-report' ? 'active' : ''}`}
          onClick={() => setActiveView('user-report')}
        >
          User Report
        </button>
      </div>
      
      {activeView === 'settings' && renderSettingsView()}
      {activeView === 'crawler' && renderCrawlerView()}
      {activeView === 'user-report' && renderUserReportView()}
    </div>
  );
}

export default Findr;
