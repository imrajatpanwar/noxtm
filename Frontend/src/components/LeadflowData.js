import React, { useEffect, useState, useCallback } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { BiSearch, BiExport } from 'react-icons/bi';
import { FiFilter } from 'react-icons/fi';
import { BsCalendar4 } from 'react-icons/bs';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './leadflowData.css';
import { API_BASE_URL } from '../config/apiConfig';

const leadflowData = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Filter data by date range and search term
  const filterData = useCallback(() => {
    let filtered = data;

    // Apply search filter
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

    // Apply date filter
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
    setCurrentPage(1); // Reset to first page on filter change
  }, [data, searchTerm, dateRange, isDateFilterActive]);

  // Update filtered data when data, search term, or date range changes
  useEffect(() => {
    filterData();
  }, [filterData]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all rows from filtered data
      setSelectedRows(filteredData.map(entry => entry._id || entry.profileUrl));
    } else {
      // Deselect all rows
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/scraped-data`);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch scraped data (Status: ${res.status}). Server response: ${errorText.substring(0, 100)}...`);
        }
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setData(json.data || []);
        } catch (parseError) {
          console.error('API Response:', text);
          throw new Error(`Failed to parse JSON response. Received: ${text.substring(0, 100)}...`);
        }
      } catch (err) {
        console.error('leadflowData Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Pagination logic
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const paginatedData = filteredData.slice(startIdx, endIdx);

  return (
    <div className="leadflow-data-page">
      <div className="header-flex">
        <div className="header-left">
          <h2 className="header-title">leadflow Data</h2>
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

      <Container className="leadflow-data-container">
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

        {/* Page info below arrows */}
        {totalCount > 0 && (
          <div style={{ margin: '8px 0 0 0', textAlign: 'left', fontSize: '14px', color: '#555' }}>
            Page {currentPage} of {totalPages}
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}
        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" role="status" />
          </div>
        )}
        {!loading && !error && filteredData.length === 0 && data.length === 0 && (
          <Alert variant="info">No scraped profiles found yet.</Alert>
        )}
        {!loading && !error && filteredData.length === 0 && data.length > 0 && searchTerm.trim() && !isDateFilterActive && (
          <Alert variant="info">No results found for "{searchTerm}". Try a different search term.</Alert>
        )}
        {!loading && !error && filteredData.length === 0 && data.length > 0 && isDateFilterActive && !searchTerm.trim() && (
          <Alert variant="info">No data found for the selected date range.</Alert>
        )}
        {!loading && !error && filteredData.length === 0 && data.length > 0 && isDateFilterActive && searchTerm.trim() && (
          <Alert variant="info">No results found for "{searchTerm}" in the selected date range.</Alert>
        )}
        {!loading && !error && paginatedData.length > 0 && (
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
                      const month = date.toLocaleDateString('en-US', { month: 'short' });
                      const year = date.getFullYear();
                      return `${day} - ${month} - ${year}`;
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
};

export default leadflowData;