import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiClock, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiVideo, FiPhone, FiMapPin, FiStar, FiFilter, FiRefreshCw, FiUserCheck, FiUserX, FiSend, FiChevronLeft, FiChevronRight, FiLink, FiMail, FiPhone as FiPhoneIcon, FiLinkedin, FiFileText } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './InterviewManagement.css';

const INTERVIEW_TYPES = [
  { value: 'phone', label: 'Phone Screening', icon: FiPhone },
  { value: 'video', label: 'Video Interview', icon: FiVideo },
  { value: 'onsite', label: 'On-site Interview', icon: FiMapPin },
  { value: 'technical', label: 'Technical Round', icon: FiCheckCircle },
  { value: 'behavioral', label: 'Behavioral Interview', icon: FiUsers },
  { value: 'panel', label: 'Panel Interview', icon: FiUsers },
  { value: 'final', label: 'Final Interview', icon: FiStar }
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
  { value: 'confirmed', label: 'Confirmed', color: '#10b981' },
  { value: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'completed', label: 'Completed', color: '#6366f1' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  { value: 'no-show', label: 'No Show', color: '#dc2626' },
  { value: 'rescheduled', label: 'Rescheduled', color: '#8b5cf6' }
];

const RECOMMENDATION_COLORS = {
  'strong-yes': '#10b981',
  'yes': '#34d399',
  'neutral': '#f59e0b',
  'no': '#fb923c',
  'strong-no': '#ef4444'
};

function InterviewManagement() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'calendar', 'board'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'pending-feedback', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
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
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/interviews/company-users');
      if (response.data.success) {
        setCompanyUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/interviews', formData);
      if (response.data.success) {
        toast.success('Interview scheduled successfully');
        setShowModal(false);
        resetForm();
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule interview');
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
    if (!window.confirm('Are you sure you want to delete this interview?')) return;
    try {
      const response = await api.delete(`/interviews/${id}`);
      if (response.data.success) {
        toast.success('Interview deleted');
        fetchInterviews();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete interview');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/interviews/${selectedInterview._id}/feedback`, feedbackData);
      if (response.data.success) {
        toast.success('Feedback submitted successfully');
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
    setShowFeedbackModal(true);
  };

  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || '#6b7280';
  };

  const getTypeIcon = (type) => {
    const typeOption = INTERVIEW_TYPES.find(t => t.value === type);
    return typeOption?.icon || FiVideo;
  };

  const filteredInterviews = useMemo(() => {
    let filtered = interviews;
    
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(i => new Date(i.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(i.status));
    } else if (activeTab === 'pending-feedback') {
      filtered = filtered.filter(i => i.status === 'completed' && i.interviewers?.some(int => !int.feedbackSubmitted));
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(i => i.status === 'completed');
    }
    
    return filtered;
  }, [interviews, activeTab]);

  const renderRatingStars = (rating) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <FiStar 
            key={star} 
            className={star <= rating ? 'star-filled' : 'star-empty'}
            fill={star <= rating ? '#f59e0b' : 'none'}
          />
        ))}
      </div>
    );
  };

  const renderFeedbackSlider = (label, field) => (
    <div className="feedback-slider">
      <label>{label}: <span className="slider-value">{feedbackData[field]}</span></label>
      <input
        type="range"
        min="1"
        max="5"
        value={feedbackData[field]}
        onChange={(e) => setFeedbackData({ ...feedbackData, [field]: parseInt(e.target.value) })}
      />
    </div>
  );

  return (
    <div className="interview-management">
      {/* Header */}
      <div className="im-header">
        <div className="im-header-left">
          <h1>Interview Management</h1>
          <p>Manage candidate interviews, scheduling, and evaluations</p>
        </div>
        <div className="im-header-right">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Schedule Interview
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="im-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#3b82f6', color: 'white' }}>
              <FiCalendar />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.scheduled}</span>
              <span className="stat-label">Scheduled</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f59e0b', color: 'white' }}>
              <FiClock />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.todayCount}</span>
              <span className="stat-label">Today</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#6366f1', color: 'white' }}>
              <FiCheckCircle />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f59e0b', color: 'white' }}>
              <FiRefreshCw />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingFeedback}</span>
              <span className="stat-label">Pending Feedback</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="im-filters">
        <div className="im-tabs">
          {[
            { id: 'all', label: 'All Interviews' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'pending-feedback', label: 'Pending Feedback' },
            { id: 'completed', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="im-filter-controls">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInterviews()}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {INTERVIEW_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button className="btn-icon" onClick={fetchInterviews}>
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Interview List */}
      <div className="im-list">
        {loading ? (
          <div className="im-loading">
            <div className="spinner"></div>
            <p>Loading interviews...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="im-empty">
            <FiCalendar size={48} />
            <h3>No interviews found</h3>
            <p>Schedule your first interview to get started</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <FiPlus /> Schedule Interview
            </button>
          </div>
        ) : (
          filteredInterviews.map(interview => {
            const TypeIcon = getTypeIcon(interview.interviewType);
            return (
              <div key={interview._id} className="interview-card" onClick={() => openDetails(interview)}>
                <div className="interview-card-header">
                  <div className="candidate-info">
                    <div className="candidate-avatar">
                      {interview.candidateName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="candidate-details">
                      <h3>{interview.candidateName}</h3>
                      <p>{interview.position}</p>
                      <span className="department">{interview.department}</span>
                    </div>
                  </div>
                  <div className="interview-badges">
                    <span 
                      className="status-badge" 
                      style={{ background: getStatusColor(interview.status) }}
                    >
                      {STATUS_OPTIONS.find(s => s.value === interview.status)?.label}
                    </span>
                    <span className="type-badge">
                      <TypeIcon size={14} />
                      {INTERVIEW_TYPES.find(t => t.value === interview.interviewType)?.label}
                    </span>
                    {interview.interviewRound && interview.totalRounds && (
                      <span className="round-badge">
                        Round {interview.interviewRound}/{interview.totalRounds}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="interview-card-body">
                  <div className="interview-time">
                    <FiCalendar size={16} />
                    <span>
                      {new Date(interview.scheduledAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <FiClock size={16} />
                    <span>
                      {new Date(interview.scheduledAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="duration">({interview.duration} min)</span>
                  </div>
                  
                  {interview.interviewers?.length > 0 && (
                    <div className="interviewers">
                      <FiUsers size={16} />
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
                  )}
                  
                  {interview.overallRating && (
                    <div className="rating-display">
                      {renderRatingStars(Math.round(interview.overallRating))}
                      <span>{interview.overallRating}/5</span>
                    </div>
                  )}
                  
                  {interview.overallRecommendation && interview.overallRecommendation !== 'neutral' && (
                    <div 
                      className="recommendation-badge"
                      style={{ background: RECOMMENDATION_COLORS[interview.overallRecommendation] }}
                    >
                      {interview.overallRecommendation.replace('-', ' ').toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="interview-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-icon" title="Edit" onClick={() => {}}>
                    <FiEdit2 size={16} />
                  </button>
                  <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(interview._id)}>
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="im-pagination">
          <button 
            disabled={pagination.page === 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          >
            <FiChevronLeft />
          </button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button 
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          >
            <FiChevronRight />
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Interview</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-section">
                <h3>Candidate Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Candidate Name *</label>
                    <input
                      type="text"
                      value={formData.candidateName}
                      onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.candidateEmail}
                      onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.candidatePhone}
                      onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn Profile</label>
                    <input
                      type="url"
                      value={formData.candidateLinkedIn}
                      onChange={(e) => setFormData({ ...formData, candidateLinkedIn: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Position Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Position *</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="form-group">
                    <label>Interview Type *</label>
                    <select
                      value={formData.interviewType}
                      onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                      required
                    >
                      {INTERVIEW_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    >
                      <option value="direct">Direct Application</option>
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
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Meeting Link</label>
                    <input
                      type="url"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Conference Room A"
                    />
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
                        <input
                          type="checkbox"
                          checked={formData.interviewers.some(i => i.userId === user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                interviewers: [...formData.interviewers, { userId: user._id, status: 'pending' }]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                interviewers: formData.interviewers.filter(i => i.userId !== user._id)
                              });
                            }
                          }}
                        />
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
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this interview..."
                  rows={3}
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <FiPlus /> Schedule Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedInterview && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Interview Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
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
                  <span 
                    className="status-badge large" 
                    style={{ background: getStatusColor(selectedInterview.status) }}
                  >
                    {STATUS_OPTIONS.find(s => s.value === selectedInterview.status)?.label}
                  </span>
                </div>
              </div>
              
              <div className="detail-grid">
                <div className="detail-item">
                  <FiMail />
                  <div>
                    <label>Email</label>
                    <span>{selectedInterview.candidateEmail}</span>
                  </div>
                </div>
                {selectedInterview.candidatePhone && (
                  <div className="detail-item">
                    <FiPhoneIcon />
                    <div>
                      <label>Phone</label>
                      <span>{selectedInterview.candidatePhone}</span>
                    </div>
                  </div>
                )}
                {selectedInterview.candidateLinkedIn && (
                  <div className="detail-item">
                    <FiLinkedin />
                    <div>
                      <label>LinkedIn</label>
                      <a href={selectedInterview.candidateLinkedIn} target="_blank" rel="noopener noreferrer">
                        View Profile
                      </a>
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <FiCalendar />
                  <div>
                    <label>Date & Time</label>
                    <span>
                      {new Date(selectedInterview.scheduledAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiClock />
                  <div>
                    <label>Duration</label>
                    <span>{selectedInterview.duration} minutes</span>
                  </div>
                </div>
                {selectedInterview.meetingLink && (
                  <div className="detail-item">
                    <FiLink />
                    <div>
                      <label>Meeting Link</label>
                      <a href={selectedInterview.meetingLink} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </div>
                  </div>
                )}
                {selectedInterview.location && (
                  <div className="detail-item">
                    <FiMapPin />
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
                        <div className="avatar">
                          {int.userId?.fullName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="interviewer-info">
                          <span className="name">{int.userId?.fullName}</span>
                          <span className={`status ${int.status}`}>{int.status}</span>
                        </div>
                        {int.feedbackSubmitted ? (
                          <FiCheckCircle className="feedback-given" />
                        ) : (
                          <FiClock className="feedback-pending" />
                        )}
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
                        <span className="date">
                          {new Date(fb.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="feedback-scores">
                        <div className="score">
                          <label>Overall</label>
                          {renderRatingStars(fb.rating)}
                        </div>
                        <div className="score">
                          <label>Technical</label>
                          <span>{fb.technicalSkills}/5</span>
                        </div>
                        <div className="score">
                          <label>Communication</label>
                          <span>{fb.communication}/5</span>
                        </div>
                        <div className="score">
                          <label>Problem Solving</label>
                          <span>{fb.problemSolving}/5</span>
                        </div>
                      </div>
                      {fb.strengths && (
                        <div className="feedback-text">
                          <strong>Strengths:</strong> {fb.strengths}
                        </div>
                      )}
                      {fb.weaknesses && (
                        <div className="feedback-text">
                          <strong>Weaknesses:</strong> {fb.weaknesses}
                        </div>
                      )}
                      {fb.comments && (
                        <div className="feedback-text">
                          <strong>Comments:</strong> {fb.comments}
                        </div>
                      )}
                      <div 
                        className="recommendation"
                        style={{ background: RECOMMENDATION_COLORS[fb.recommendation] }}
                      >
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
                  <select
                    value={selectedInterview.status}
                    onChange={(e) => handleUpdateStatus(selectedInterview._id, e.target.value)}
                    className="status-select"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  
                  {selectedInterview.status === 'completed' && !selectedInterview.feedback?.some(f => 
                    f.interviewerId?._id === selectedInterview.interviewers?.[0]?.userId?._id
                  ) && (
                    <button className="btn-primary" onClick={openFeedback}>
                      <FiSend /> Submit Feedback
                    </button>
                  )}
                  
                  {selectedInterview.status === 'completed' && (
                    <div className="decision-buttons">
                      <button 
                        className="btn-success"
                        onClick={() => handleDecision(selectedInterview._id, 'hired')}
                      >
                        <FiUserCheck /> Hire
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDecision(selectedInterview._id, 'rejected')}
                      >
                        <FiUserX /> Reject
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={() => handleDecision(selectedInterview._id, 'hold')}
                      >
                        Hold
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Interview Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>×</button>
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
                <h3>Feedback Details</h3>
                <div className="form-group">
                  <label>Strengths</label>
                  <textarea
                    value={feedbackData.strengths}
                    onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
                    placeholder="What were the candidate's strengths?"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Areas for Improvement</label>
                  <textarea
                    value={feedbackData.weaknesses}
                    onChange={(e) => setFeedbackData({ ...feedbackData, weaknesses: e.target.value })}
                    placeholder="What areas need improvement?"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Additional Comments</label>
                  <textarea
                    value={feedbackData.comments}
                    onChange={(e) => setFeedbackData({ ...feedbackData, comments: e.target.value })}
                    placeholder="Any other observations?"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h3>Recommendation</h3>
                <div className="recommendation-options">
                  {['strong-yes', 'yes', 'neutral', 'no', 'strong-no'].map(rec => (
                    <label 
                      key={rec} 
                      className={`rec-option ${feedbackData.recommendation === rec ? 'selected' : ''}`}
                      style={{ 
                        borderColor: RECOMMENDATION_COLORS[rec],
                        background: feedbackData.recommendation === rec ? RECOMMENDATION_COLORS[rec] : 'transparent'
                      }}
                    >
                      <input
                        type="radio"
                        name="recommendation"
                        value={rec}
                        checked={feedbackData.recommendation === rec}
                        onChange={(e) => setFeedbackData({ ...feedbackData, recommendation: e.target.value })}
                      />
                      {rec.replace('-', ' ').toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <FiSend /> Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewManagement;
