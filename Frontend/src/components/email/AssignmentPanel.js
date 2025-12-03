import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EmailNotes from './EmailNotes';
import ActivityTimeline from './ActivityTimeline';
import './AssignmentPanel.css';

const AssignmentPanel = ({ emailAccountId, emailUid, onClose, onUpdate }) => {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'notes' | 'activity'
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (emailAccountId && emailUid) {
      fetchAssignment();
    }
  }, [emailAccountId, emailUid]);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email-assignments/by-email/${emailAccountId}/${emailUid}`);
      setAssignment(res.data.assignment);
    } catch (error) {
      if (error.response?.status === 404) {
        setAssignment(null); // No assignment for this email
      } else {
        console.error('Error fetching assignment:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!assignment) return;

    setUpdating(true);
    try {
      await axios.patch(`/api/email-assignments/${assignment._id}/status`, {
        status: newStatus
      });

      await fetchAssignment();

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!assignment) return;

    setUpdating(true);
    try {
      await axios.patch(`/api/email-assignments/${assignment._id}/priority`, {
        priority: newPriority
      });

      await fetchAssignment();

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error updating priority: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#718096',
      normal: '#3182ce',
      high: '#ed8936',
      urgent: '#e53e3e'
    };
    return colors[priority] || colors.normal;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: '#3182ce',
      in_progress: '#ed8936',
      resolved: '#48bb78',
      closed: '#718096',
      reopened: '#e53e3e'
    };
    return colors[status] || colors.new;
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && assignment?.status !== 'resolved' && assignment?.status !== 'closed';
  };

  if (loading) {
    return (
      <div className="assignment-panel">
        <div className="panel-header">
          <h3>Assignment Details</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-body">
          <div className="loading">Loading assignment...</div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="assignment-panel">
        <div className="panel-header">
          <h3>Assignment Details</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-body">
          <div className="no-assignment">
            <p>📋 This email is not assigned yet</p>
            <small>Use the "Assign" button to assign it to a team member</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-panel">
      <div className="panel-header">
        <h3>Assignment Details</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`panel-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes ({assignment.notesCount || 0})
        </button>
        <button
          className={`panel-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      <div className="panel-body">
        {activeTab === 'details' && (
          <div className="assignment-details">
            {/* Assigned To */}
            <div className="detail-section">
              <label>Assigned To</label>
              <div className="assignee-info">
                <div className="assignee-avatar">
                  {assignment.assignedTo?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="assignee-name">{assignment.assignedTo?.name}</div>
                  <div className="assignee-email">{assignment.assignedTo?.email}</div>
                  {assignment.assignedTo?.department && (
                    <div className="assignee-dept">{assignment.assignedTo.department}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="detail-section">
              <label>Status</label>
              <select
                value={assignment.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className="status-select"
                style={{ borderColor: getStatusColor(assignment.status) }}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="reopened">Reopened</option>
              </select>
            </div>

            {/* Priority */}
            <div className="detail-section">
              <label>Priority</label>
              <select
                value={assignment.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={updating}
                className="priority-select"
                style={{ borderColor: getPriorityColor(assignment.priority) }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="detail-section">
              <label>Due Date</label>
              <div className={`due-date ${isOverdue(assignment.dueDate) ? 'overdue' : ''}`}>
                {formatDate(assignment.dueDate)}
                {isOverdue(assignment.dueDate) && <span className="overdue-badge">Overdue</span>}
              </div>
            </div>

            {/* Tags */}
            {assignment.tags && assignment.tags.length > 0 && (
              <div className="detail-section">
                <label>Tags</label>
                <div className="tags-list">
                  {assignment.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned By */}
            <div className="detail-section">
              <label>Assigned By</label>
              <div className="assigned-by">
                {assignment.assignedBy?.name || 'Unknown'}
              </div>
              <div className="assigned-date">
                {formatDate(assignment.assignedAt)}
              </div>
            </div>

            {/* Resolved Info */}
            {(assignment.status === 'resolved' || assignment.status === 'closed') && assignment.resolvedAt && (
              <div className="detail-section">
                <label>Resolved</label>
                <div className="resolved-info">
                  <div className="resolved-by">
                    By: {assignment.resolvedBy?.name || 'Unknown'}
                  </div>
                  <div className="resolved-date">
                    {formatDate(assignment.resolvedAt)}
                  </div>
                  {assignment.resolutionNote && (
                    <div className="resolution-note">
                      {assignment.resolutionNote}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <EmailNotes assignmentId={assignment._id} />
        )}

        {activeTab === 'activity' && (
          <ActivityTimeline assignmentId={assignment._id} />
        )}
      </div>
    </div>
  );
};

export default AssignmentPanel;
