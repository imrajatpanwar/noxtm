import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiClock, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiVideo, FiPhone, FiMapPin, FiStar, FiFilter, FiRefreshCw, FiUserCheck, FiUserX, FiSend, FiChevronLeft, FiChevronRight, FiLink, FiMail, FiPhone as FiPhoneIcon, FiFileText, FiDownload, FiList, FiGrid, FiCopy, FiX, FiArrowUp, FiArrowDown, FiMoreVertical, FiRepeat, FiClipboard } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './InterviewManagement.css';

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone', icon: FiPhone },
  { value: 'video', label: 'Video', icon: FiVideo },
  { value: 'onsite', label: 'On-site', icon: FiMapPin },
  { value: 'technical', label: 'Technical', icon: FiCheckCircle },
  { value: 'behavioral', label: 'Behavioral', icon: FiUsers },
  { value: 'panel', label: 'Panel', icon: FiUsers },
  { value: 'final', label: 'Final', icon: FiStar }
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No Show' },
  { value: 'rescheduled', label: 'Rescheduled' }
];

function InterviewManagement() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('list');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('scheduledAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    candidateLinkedIn: '',
    position: '',
    department: '',
    interviewType: 'video',
    scheduledAt: '',
    duration: 60,
    meetingLink: '',
    location: '',
    interviewers: [],
    notes: '',
    source: 'direct'
  });
  const [editFormData, setEditFormData] = useState({});
  const [rescheduleData, setRescheduleData] = useState({ scheduledAt: '', reason: '' });
  const [feedbackData, setFeedbackData] = useState({
    rating: 3,
    technicalSkills: 3,
    communication: 3,
    problemSolving: 3,
    culturalFit: 3,
    strengths: '',
    weaknesses: '',
    comments: '',
    recommendation: 'neutral'
  });

  useEffect(() => {
    fetchInterviews();
    fetchStats();
    fetchCompanyUsers();
  }, [activeTab, pagination.page, filterStatus, filterType]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('interviewType', filterType);
      if (searchQuery) params.append('search', searchQuery);
      const response = await api.get(`/interviews?${params.toString()}`);
      if (response.data.success) {
        setInterviews(response.data.interviews);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/interviews/stats');
      if (response.data.success) setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/interviews/company-users');
      if (response.data.success) setCompanyUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/interviews', formData);
      if (response.data.success) {
        toast.success('Interview scheduled');
        setShowModal(false);
        resetForm();
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule interview');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/interviews/${selectedInterview._id}`, editFormData);
      if (response.data.success) {
        toast.success('Interview updated');
        setShowEditModal(false);
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update interview');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    try {
      const response = await api.patch(`/interviews/${selectedInterview._id}/reschedule`, rescheduleData);
      if (response.data.success) {
        toast.success('Interview rescheduled');
        setShowRescheduleModal(false);
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reschedule');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await api.patch(`/interviews/${id}/status`, { status });
      if (response.data.success) {
        toast.success('Status updated');
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview?')) return;
    try {
      const response = await api.delete(`/interviews/${id}`);
      if (response.data.success) {
        toast.success('Interview deleted');
        setSelectedIds(prev => prev.filter(i => i !== id));
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete interview');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} interviews?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/interviews/${id}`)));
      toast.success(`${selectedIds.length} interviews deleted`);
      setSelectedIds([]);
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete some interviews');
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      await Promise.all(selectedIds.map(id => api.patch(`/interviews/${id}/status`, { status })));
      toast.success(`${selectedIds.length} interviews updated to ${status}`);
      setSelectedIds([]);
      fetchInterviews();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update some interviews');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/interviews/${selectedInterview._id}/feedback`, feedbackData);
      if (response.data.success) {
        toast.success('Feedback submitted');
        setShowFeedbackModal(false);
        setSelectedInterview(response.data.interview);
        fetchInterviews();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const handleDecision = async (id, decision, reason = '') => {
    try {
      const response = await api.patch(`/interviews/${id}/decision`, { decision, reason });
      if (response.data.success) {
        toast.success(`Candidate marked as ${decision}`);
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to update decision');
    }
  };

  const exportToCSV = () => {
    const headers = ['Candidate', 'Email', 'Position', 'Department', 'Type', 'Status', 'Scheduled At', 'Duration', 'Rating'];
    const rows = filteredInterviews.map(i => [
      i.candidateName,
      i.candidateEmail,
      i.position,
      i.department || '',
      INTERVIEW_TYPES.find(t => t.value === i.interviewType)?.label || i.interviewType,
      STATUS_OPTIONS.find(s => s.value === i.status)?.label || i.status,
      new Date(i.scheduledAt).toLocaleString(),
      `${i.duration} min`,
      i.overallRating || 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interviews-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const copyMeetingLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Link copied');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const duplicateInterview = (interview) => {
    setFormData({
      candidateName: interview.candidateName,
      candidateEmail: interview.candidateEmail,
      candidatePhone: interview.candidatePhone || '',
      candidateLinkedIn: interview.candidateLinkedIn || '',
      position: interview.position,
      department: interview.department || '',
      interviewType: interview.interviewType,
      scheduledAt: '',
      duration: interview.duration,
      meetingLink: interview.meetingLink || '',
      location: interview.location || '',
      interviewers: interview.interviewers?.map(i => ({ userId: i.userId?._id || i.userId, status: 'pending' })) || [],
      notes: interview.notes || '',
      source: interview.source || 'direct'
    });
    setShowDetailsModal(false);
    setShowModal(true);
  };

  const openEditModal = (interview) => {
    setEditFormData({
      candidateName: interview.candidateName,
      candidateEmail: interview.candidateEmail,
      candidatePhone: interview.candidatePhone || '',
      candidateLinkedIn: interview.candidateLinkedIn || '',
      position: interview.position,
      department: interview.department || '',
      interviewType: interview.interviewType,
      duration: interview.duration,
      meetingLink: interview.meetingLink || '',
      location: interview.location || '',
      notes: interview.notes || '',
      source: interview.source || 'direct'
    });
    setShowEditModal(true);
  };

  const openRescheduleModal = (interview) => {
    setSelectedInterview(interview);
    setRescheduleData({ scheduledAt: '', reason: '' });
    setShowRescheduleModal(true);
  };

  const resetForm = () => {
    setFormData({
      candidateName: '',
      candidateEmail: '',
      candidatePhone: '',
      candidateLinkedIn: '',
      position: '',
      department: '',
      interviewType: 'video',
      scheduledAt: '',
      duration: 60,
      meetingLink: '',
      location: '',
      interviewers: [],
      notes: '',
      source: 'direct'
    });
  };

  const openDetails = async (interview) => {
    try {
      const response = await api.get(`/interviews/${interview._id}`);
      if (response.data.success) {
        setSelectedInterview(response.data.interview);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Failed to load interview details');
    }
  };

  const openFeedback = () => {
    setFeedbackData({
      rating: 3, technicalSkills: 3, communication: 3,
      problemSolving: 3, culturalFit: 3, strengths: '',
      weaknesses: '', comments: '', recommendation: 'neutral'
    });
    setShowFeedbackModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInterviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInterviews.map(i => i._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getTypeIcon = (type) => {
    const typeOption = INTERVIEW_TYPES.find(t => t.value === type);
    return typeOption?.icon || FiVideo;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortMenu(false);
  };

  const filteredInterviews = useMemo(() => {
    let filtered = [...interviews];
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(i => new Date(i.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(i.status));
    } else if (activeTab === 'pending-feedback') {
      filtered = filtered.filter(i => i.status === 'completed' && i.interviewers?.some(int => !int.feedbackSubmitted));
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(i => i.status === 'completed');
    }
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'candidateName': aVal = a.candidateName; bVal = b.candidateName; break;
        case 'position': aVal = a.position; bVal = b.position; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'scheduledAt': default: aVal = new Date(a.scheduledAt); bVal = new Date(b.scheduledAt); break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [interviews, activeTab, sortField, sortDirection]);

  // Calendar helpers
  const getCalendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [calendarDate]);

  const getInterviewsForDate = (date) => {
    return interviews.filter(i => {
      const d = new Date(i.scheduledAt);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  };

  const renderRatingStars = (rating) => (
    <div className="rating-stars">
      {[1, 2, 3, 4, 5].map(star => (
        <FiStar key={star} className={star <= rating ? 'star-filled' : 'star-empty'} fill={star <= rating ? '#000' : 'none'} size={14} />
      ))}
    </div>
  );

  const renderFeedbackSlider = (label, field) => (
    <div className="feedback-slider">
      <label>{label}: <span className="slider-value">{feedbackData[field]}</span></label>
      <input type="range" min="1" max="5" value={feedbackData[field]}
        onChange={(e) => setFeedbackData({ ...feedbackData, [field]: parseInt(e.target.value) })} />
    </div>
  );

  // ===================== RENDER =====================
  return (
    <div className="interview-management">
      {/* Header */}
      <div className="intv-header">
        <div className="intv-title-section">
          <h1>Interview Management</h1>
          <p>Schedule, track, and evaluate candidate interviews</p>
        </div>
        <div className="intv-header-actions">
          <button className="intv-export-btn" onClick={exportToCSV}>
            <FiDownload size={16} /> Export
          </button>
          <button className="intv-add-btn" onClick={() => setShowModal(true)}>
            <FiPlus size={16} /> New Interview
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="intv-stats">
          <div className="intv-stat-card">
            <div className="intv-stat-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}>
              <FiCalendar />
            </div>
            <div className="intv-stat-content">
              <span className="intv-stat-label">Scheduled</span>
              <span className="intv-stat-value">{stats.scheduled}</span>
            </div>
          </div>
          <div className="intv-stat-card">
            <div className="intv-stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <FiClock />
            </div>
            <div className="intv-stat-content">
              <span className="intv-stat-label">Today</span>
              <span className="intv-stat-value">{stats.todayCount}</span>
            </div>
          </div>
          <div className="intv-stat-card">
            <div className="intv-stat-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
              <FiCheckCircle />
            </div>
            <div className="intv-stat-content">
              <span className="intv-stat-label">Completed</span>
              <span className="intv-stat-value">{stats.completed}</span>
            </div>
          </div>
          <div className="intv-stat-card">
            <div className="intv-stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
              <FiFileText />
            </div>
            <div className="intv-stat-content">
              <span className="intv-stat-label">Pending Feedback</span>
              <span className="intv-stat-value">{stats.pendingFeedback}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="intv-filters">
        <div className="intv-search-box">
          <FiSearch />
          <input type="text" placeholder="Search candidates, positions..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInterviews()} />
        </div>
        <div className="intv-status-filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'pending-feedback', label: 'Pending Feedback' },
            { id: 'completed', label: 'Completed' }
          ].map(tab => (
            <button key={tab.id} className={`intv-filter-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="intv-extra-controls">
          <select className="intv-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
          <select className="intv-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {INTERVIEW_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>

          {/* Sort */}
          <div className="sort-dropdown">
            <button className="intv-icon-btn" onClick={() => setShowSortMenu(!showSortMenu)} title="Sort">
              {sortDirection === 'asc' ? <FiArrowUp size={16} /> : <FiArrowDown size={16} />}
            </button>
            {showSortMenu && (
              <div className="sort-menu">
                {[
                  { field: 'scheduledAt', label: 'Date' },
                  { field: 'candidateName', label: 'Name' },
                  { field: 'position', label: 'Position' },
                  { field: 'status', label: 'Status' }
                ].map(s => (
                  <button key={s.field} className={sortField === s.field ? 'active-sort' : ''}
                    onClick={() => handleSort(s.field)}>
                    {s.label} {sortField === s.field && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="intv-view-toggle">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List">
              <FiList size={16} />
            </button>
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')} title="Board">
              <FiGrid size={16} />
            </button>
            <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')} title="Calendar">
              <FiCalendar size={16} />
            </button>
          </div>

          <button className="intv-icon-btn" onClick={fetchInterviews} title="Refresh">
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="intv-bulk-bar">
          <span>{selectedIds.length} selected</span>
          <button onClick={() => handleBulkStatusUpdate('confirmed')}>Confirm All</button>
          <button onClick={() => handleBulkStatusUpdate('cancelled')}>Cancel All</button>
          <button className="bulk-danger" onClick={handleBulkDelete}>Delete All</button>
          <button className="bulk-close" onClick={() => setSelectedIds([])}>
            <FiX size={16} />
          </button>
        </div>
      )}

        {/* ========== LIST VIEW ========== */}
        {view === 'list' && (
          <div className="intv-table-container">
            <table className="intv-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={selectedIds.length === filteredInterviews.length && filteredInterviews.length > 0}
                      onChange={toggleSelectAll} />
                  </th>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Interviewers</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">
                    <div className="intv-loading">
                      <div className="spinner"></div>
                      <p>Loading interviews...</p>
                    </div>
                  </td></tr>
                ) : filteredInterviews.length === 0 ? (
                  <tr><td colSpan="7">
                    <div className="intv-no-data">
                      <FiCalendar size={32} />
                      <h3>No interviews found</h3>
                      <p>Schedule your first interview to get started</p>
                      <button className="intv-add-btn" onClick={() => setShowModal(true)}>
                        <FiPlus size={16} /> Schedule Interview
                      </button>
                    </div>
                  </td></tr>
                ) : (
                  filteredInterviews.map(interview => {
                    const TypeIcon = getTypeIcon(interview.interviewType);
                    return (
                      <tr key={interview._id}
                        className={selectedIds.includes(interview._id) ? 'selected-row' : ''}
                        onClick={() => openDetails(interview)}>

                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.includes(interview._id)}
                            onChange={() => toggleSelect(interview._id)} />
                        </td>

                        <td>
                          <div className="candidate-info">
                            <div className="candidate-avatar">
                              {interview.candidateName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="candidate-details">
                              <h3>{interview.candidateName}</h3>
                              <p>{interview.position}</p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`intv-status-badge ${interview.status}`}>
                            {STATUS_OPTIONS.find(s => s.value === interview.status)?.label}
                          </span>
                          {' '}
                          <span className="type-badge">
                            <TypeIcon size={12} />
                            {INTERVIEW_TYPES.find(t => t.value === interview.interviewType)?.label}
                          </span>
                          {interview.interviewRound && interview.totalRounds && (
                            <>
                              {' '}
                              <span className="round-badge">R{interview.interviewRound}/{interview.totalRounds}</span>
                            </>
                          )}
                        </td>

                        <td>
                          <div className="interview-time">
                            <FiCalendar size={13} />
                            <span>
                              {new Date(interview.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <FiClock size={13} />
                            <span>
                              {new Date(interview.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="duration">{interview.duration}m</span>
                          </div>
                        </td>

                        <td>
                          {interview.interviewers?.length > 0 ? (
                            <div className="interviewers">
                              <div className="interviewer-avatars">
                                {interview.interviewers.slice(0, 3).map((int, idx) => (
                                  <div key={idx} className="interviewer-avatar" title={int.userId?.fullName}>
                                    {int.userId?.fullName?.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {interview.interviewers.length > 3 && (
                                  <div className="interviewer-more">+{interview.interviewers.length - 3}</div>
                                )}
                              </div>
                            </div>
                          ) : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>&mdash;</span>}
                        </td>

                        <td>
                          {interview.overallRating ? (
                            <div className="rating-display">
                              {renderRatingStars(Math.round(interview.overallRating))}
                              <span>{interview.overallRating}/5</span>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>&mdash;</span>
                          )}
                        </td>

                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="intv-actions">
                            <button className="intv-action-btn edit" title="Edit" onClick={() => { setSelectedInterview(interview); openEditModal(interview); }}>
                              <FiEdit2 size={14} />
                            </button>
                            <button className="intv-action-btn reschedule" title="Reschedule" onClick={() => openRescheduleModal(interview)}>
                              <FiRepeat size={14} />
                            </button>
                            <button className="intv-action-btn delete" title="Delete" onClick={() => handleDelete(interview._id)}>
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== BOARD VIEW ========== */}
        {view === 'board' && (
          <div className="intv-board">
            {STATUS_OPTIONS.map(status => {
              const items = filteredInterviews.filter(i => i.status === status.value);
              return (
                <div key={status.value} className="board-column">
                  <div className="board-column-header">
                    {status.label}
                    <span className="count">{items.length}</span>
                  </div>
                  <div className="board-column-body">
                    {items.map(interview => (
                      <div key={interview._id} className="board-card" onClick={() => openDetails(interview)}>
                        <div className="board-card-name">{interview.candidateName}</div>
                        <div className="board-card-position">{interview.position}</div>
                        <div className="board-card-meta">
                          <FiCalendar size={12} />
                          {new Date(interview.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          <FiClock size={12} />
                          {new Date(interview.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ color: '#a3a3a3', fontSize: 12, textAlign: 'center', padding: 20 }}>
                        No interviews
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========== CALENDAR VIEW ========== */}
        {view === 'calendar' && (
          <div className="intv-calendar">
            <div className="calendar-header">
              <h3>{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <div className="calendar-nav">
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}>
                  <FiChevronLeft size={14} />
                </button>
                <button onClick={() => setCalendarDate(new Date())}>Today</button>
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}>
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="calendar-day-header">{d}</div>
              ))}
              {getCalendarDays.map((day, idx) => {
                const today = new Date();
                const isToday = day.toDateString() === today.toDateString();
                const isOtherMonth = day.getMonth() !== calendarDate.getMonth();
                const dayInterviews = getInterviewsForDate(day);
                return (
                  <div key={idx} className={`calendar-day ${isToday ? 'today' : ''} ${isOtherMonth ? 'other-month' : ''}`}>
                    <div className="calendar-day-number">{day.getDate()}</div>
                    {dayInterviews.slice(0, 3).map(i => (
                      <div key={i._id} className="calendar-event" onClick={() => openDetails(i)}>
                        {new Date(i.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} {i.candidateName}
                      </div>
                    ))}
                    {dayInterviews.length > 3 && (
                      <div style={{ fontSize: 10, color: '#737373', paddingLeft: 6 }}>+{dayInterviews.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {view === 'list' && pagination.pages > 1 && (
          <div className="intv-pagination">
            <button disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
              <FiChevronLeft size={14} />
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
              <FiChevronRight size={14} />
            </button>
          </div>
        )}

      {/* ======== SCHEDULE MODAL ======== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Interview</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-section">
                <h3>Candidate</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" value={formData.candidateName}
                      onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                      required placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={formData.candidateEmail}
                      onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                      required placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" value={formData.candidatePhone}
                      onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                      placeholder="+1 234 567 8900" />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input type="url" value={formData.candidateLinkedIn}
                      onChange={(e) => setFormData({ ...formData, candidateLinkedIn: e.target.value })}
                      placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Position</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Position *</label>
                    <input type="text" value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required placeholder="Software Engineer" />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Engineering" />
                  </div>
                  <div className="form-group">
                    <label>Type *</label>
                    <select value={formData.interviewType}
                      onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })} required>
                      {INTERVIEW_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Source</label>
                    <select value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                      <option value="direct">Direct</option>
                      <option value="referral">Referral</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="job-portal">Job Portal</option>
                      <option value="agency">Agency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Schedule</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date & Time *</label>
                    <input type="datetime-local" value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Meeting Link</label>
                    <input type="url" value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/..." />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Room A" />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Interviewers</h3>
                <div className="interviewer-select">
                  {companyUsers.length === 0 ? (
                    <p className="no-users">No other users in your company</p>
                  ) : (
                    companyUsers.map(user => (
                      <label key={user._id} className="interviewer-checkbox">
                        <input type="checkbox"
                          checked={formData.interviewers.some(i => i.userId === user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, interviewers: [...formData.interviewers, { userId: user._id, status: 'pending' }] });
                            } else {
                              setFormData({ ...formData, interviewers: formData.interviewers.filter(i => i.userId !== user._id) });
                            }
                          }} />
                        <span className="checkbox-label">
                          <span className="avatar">{user.fullName?.charAt(0).toUpperCase()}</span>
                          <span>{user.fullName}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="form-section">
                <h3>Notes</h3>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes..." rows={3} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><FiPlus size={14} /> Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== EDIT MODAL ======== */}
      {showEditModal && selectedInterview && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Interview</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}></button>
            </div>
            <form onSubmit={handleEdit} className="modal-body">
              <div className="form-section">
                <h3>Candidate</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" value={editFormData.candidateName}
                      onChange={(e) => setEditFormData({ ...editFormData, candidateName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={editFormData.candidateEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, candidateEmail: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" value={editFormData.candidatePhone}
                      onChange={(e) => setEditFormData({ ...editFormData, candidatePhone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input type="url" value={editFormData.candidateLinkedIn}
                      onChange={(e) => setEditFormData({ ...editFormData, candidateLinkedIn: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Position</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Position *</label>
                    <input type="text" value={editFormData.position}
                      onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input type="text" value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={editFormData.interviewType}
                      onChange={(e) => setEditFormData({ ...editFormData, interviewType: e.target.value })}>
                      {INTERVIEW_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select value={editFormData.duration}
                      onChange={(e) => setEditFormData({ ...editFormData, duration: parseInt(e.target.value) })}>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Meeting Link</label>
                    <input type="url" value={editFormData.meetingLink}
                      onChange={(e) => setEditFormData({ ...editFormData, meetingLink: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label>Notes</label>
                  <textarea value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><FiCheckCircle size={14} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== RESCHEDULE MODAL ======== */}
      {showRescheduleModal && selectedInterview && (
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Reschedule Interview</h2>
              <button className="close-btn" onClick={() => setShowRescheduleModal(false)}></button>
            </div>
            <form onSubmit={handleReschedule} className="modal-body">
              <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedInterview.candidateName}</div>
                <div style={{ fontSize: 12, color: '#737373' }}>
                  Currently: {new Date(selectedInterview.scheduledAt).toLocaleString()}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>New Date & Time *</label>
                <input type="datetime-local" value={rescheduleData.scheduledAt}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, scheduledAt: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  placeholder="Reason for rescheduling..." rows={3} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><FiRepeat size={14} /> Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== DETAILS MODAL ======== */}
      {showDetailsModal && selectedInterview && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Interview Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}></button>
            </div>
            <div className="modal-body details-body">
              <div className="detail-section">
                <div className="candidate-header">
                  <div className="candidate-avatar large">
                    {selectedInterview.candidateName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedInterview.candidateName}</h3>
                    <p>{selectedInterview.position}</p>
                    <span className="department">{selectedInterview.department}</span>
                  </div>
                  <span className={`intv-status-badge large ${selectedInterview.status}`}>
                    {STATUS_OPTIONS.find(s => s.value === selectedInterview.status)?.label}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <FiMail size={14} />
                  <div>
                    <label>Email</label>
                    <span>{selectedInterview.candidateEmail}</span>
                  </div>
                </div>
                {selectedInterview.candidatePhone && (
                  <div className="detail-item">
                    <FiPhoneIcon size={14} />
                    <div>
                      <label>Phone</label>
                      <span>{selectedInterview.candidatePhone}</span>
                    </div>
                  </div>
                )}
                {selectedInterview.candidateLinkedIn && (
                  <div className="detail-item">
                    <FiLink size={14} />
                    <div>
                      <label>LinkedIn</label>
                      <a href={selectedInterview.candidateLinkedIn} target="_blank" rel="noopener noreferrer">View Profile</a>
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <FiCalendar size={14} />
                  <div>
                    <label>Date & Time</label>
                    <span>{new Date(selectedInterview.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiClock size={14} />
                  <div>
                    <label>Duration</label>
                    <span>{selectedInterview.duration} minutes</span>
                  </div>
                </div>
                {selectedInterview.meetingLink && (
                  <div className="detail-item">
                    <FiVideo size={14} />
                    <div>
                      <label>Meeting</label>
                      <span>
                        <a href={selectedInterview.meetingLink} target="_blank" rel="noopener noreferrer">Join</a>
                        <button className={`copy-link-btn ${copiedLink ? 'copied' : ''}`}
                          onClick={() => copyMeetingLink(selectedInterview.meetingLink)}>
                          <FiCopy size={10} /> {copiedLink ? 'Copied' : 'Copy'}
                        </button>
                      </span>
                    </div>
                  </div>
                )}
                {selectedInterview.location && (
                  <div className="detail-item">
                    <FiMapPin size={14} />
                    <div>
                      <label>Location</label>
                      <span>{selectedInterview.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedInterview.interviewers?.length > 0 && (
                <div className="detail-section">
                  <h4>Interviewers</h4>
                  <div className="interviewer-list">
                    {selectedInterview.interviewers.map((int, idx) => (
                      <div key={idx} className="interviewer-item">
                        <div className="avatar">{int.userId?.fullName?.charAt(0).toUpperCase()}</div>
                        <div className="interviewer-info">
                          <span className="name">{int.userId?.fullName}</span>
                          <span className={`status ${int.status}`}>{int.status}</span>
                        </div>
                        {int.feedbackSubmitted ? <FiCheckCircle className="feedback-given" /> : <FiClock className="feedback-pending" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInterview.feedback?.length > 0 && (
                <div className="detail-section">
                  <h4>Feedback</h4>
                  {selectedInterview.feedback.map((fb, idx) => (
                    <div key={idx} className="feedback-card">
                      <div className="feedback-header">
                        <span className="reviewer">{fb.interviewerId?.fullName}</span>
                        <span className="date">{new Date(fb.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="feedback-scores">
                        <div className="score"><label>Overall</label>{renderRatingStars(fb.rating)}</div>
                        <div className="score"><label>Technical</label><span>{fb.technicalSkills}/5</span></div>
                        <div className="score"><label>Communication</label><span>{fb.communication}/5</span></div>
                        <div className="score"><label>Problem Solving</label><span>{fb.problemSolving}/5</span></div>
                      </div>
                      {fb.strengths && <div className="feedback-text"><strong>Strengths:</strong> {fb.strengths}</div>}
                      {fb.weaknesses && <div className="feedback-text"><strong>Weaknesses:</strong> {fb.weaknesses}</div>}
                      {fb.comments && <div className="feedback-text"><strong>Comments:</strong> {fb.comments}</div>}
                      <div className="recommendation" style={{ background: '#171717' }}>
                        {fb.recommendation.replace('-', ' ').toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedInterview.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes">{selectedInterview.notes}</p>
                </div>
              )}

              <div className="detail-section">
                <h4>Actions</h4>
                <div className="action-buttons">
                  <select value={selectedInterview.status}
                    onChange={(e) => handleUpdateStatus(selectedInterview._id, e.target.value)} className="status-select">
                    {STATUS_OPTIONS.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>

                  <button className="btn-secondary" onClick={() => { openEditModal(selectedInterview); setShowDetailsModal(false); }}>
                    <FiEdit2 size={13} /> Edit
                  </button>

                  <button className="btn-secondary" onClick={() => { openRescheduleModal(selectedInterview); setShowDetailsModal(false); }}>
                    <FiRepeat size={13} /> Reschedule
                  </button>

                  <button className="btn-secondary" onClick={() => duplicateInterview(selectedInterview)}>
                    <FiCopy size={13} /> Duplicate
                  </button>

                  {selectedInterview.status === 'completed' && !selectedInterview.feedback?.some(f =>
                    f.interviewerId?._id === selectedInterview.interviewers?.[0]?.userId?._id
                  ) && (
                    <button className="btn-primary" onClick={openFeedback}>
                      <FiSend size={13} /> Submit Feedback
                    </button>
                  )}

                  {selectedInterview.status === 'completed' && (
                    <div className="decision-buttons">
                      <button className="btn-success" onClick={() => handleDecision(selectedInterview._id, 'hired')}>
                        <FiUserCheck size={13} /> Hire
                      </button>
                      <button className="btn-danger" onClick={() => handleDecision(selectedInterview._id, 'rejected')}>
                        <FiUserX size={13} /> Reject
                      </button>
                      <button className="btn-secondary" onClick={() => handleDecision(selectedInterview._id, 'hold')}>Hold</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== FEEDBACK MODAL ======== */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}></button>
            </div>
            <form onSubmit={handleSubmitFeedback} className="modal-body">
              <div className="form-section">
                <h3>Ratings</h3>
                {renderFeedbackSlider('Overall Rating', 'rating')}
                {renderFeedbackSlider('Technical Skills', 'technicalSkills')}
                {renderFeedbackSlider('Communication', 'communication')}
                {renderFeedbackSlider('Problem Solving', 'problemSolving')}
                {renderFeedbackSlider('Cultural Fit', 'culturalFit')}
              </div>
              <div className="form-section">
                <h3>Details</h3>
                <div className="form-group">
                  <label>Strengths</label>
                  <textarea value={feedbackData.strengths}
                    onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
                    placeholder="Candidate strengths..." rows={3} />
                </div>
                <div className="form-group">
                  <label>Areas for Improvement</label>
                  <textarea value={feedbackData.weaknesses}
                    onChange={(e) => setFeedbackData({ ...feedbackData, weaknesses: e.target.value })}
                    placeholder="Areas to improve..." rows={3} />
                </div>
                <div className="form-group">
                  <label>Comments</label>
                  <textarea value={feedbackData.comments}
                    onChange={(e) => setFeedbackData({ ...feedbackData, comments: e.target.value })}
                    placeholder="Additional comments..." rows={3} />
                </div>
              </div>
              <div className="form-section">
                <h3>Recommendation</h3>
                <div className="recommendation-options">
                  {['strong-yes', 'yes', 'neutral', 'no', 'strong-no'].map(rec => (
                    <label key={rec} className={`rec-option ${feedbackData.recommendation === rec ? 'selected' : ''}`}>
                      <input type="radio" name="recommendation" value={rec}
                        checked={feedbackData.recommendation === rec}
                        onChange={(e) => setFeedbackData({ ...feedbackData, recommendation: e.target.value })} />
                      {rec.replace('-', ' ').toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><FiSend size={14} /> Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewManagement;
