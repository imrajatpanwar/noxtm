import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ActivityTimeline.css';

const ActivityTimeline = ({ assignmentId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assignmentId) {
      fetchActivities();
    }
  }, [assignmentId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email-activity/${assignmentId}`);
      setActivities(res.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      assigned: '👤',
      reassigned: '🔄',
      status_changed: '📊',
      priority_changed: '⚠️',
      note_added: '💬',
      due_date_set: '📅',
      tag_added: '🏷️',
      tag_removed: '🗑️',
      email_replied: '↩️',
      email_forwarded: '➡️'
    };
    return icons[action] || '📌';
  };

  const getActionColor = (action) => {
    const colors = {
      assigned: '#3182ce',
      reassigned: '#ed8936',
      status_changed: '#48bb78',
      priority_changed: '#e53e3e',
      note_added: '#9f7aea',
      due_date_set: '#38b2ac',
      tag_added: '#667eea',
      tag_removed: '#718096',
      email_replied: '#48bb78',
      email_forwarded: '#ed8936'
    };
    return colors[action] || '#718096';
  };

  const formatActionDescription = (activity) => {
    const { action, details, description } = activity;

    if (description) {
      return description;
    }

    switch (action) {
      case 'assigned':
        return `assigned this email${details?.note ? `: ${details.note}` : ''}`;
      case 'reassigned':
        return `reassigned to another team member${details?.note ? `: ${details.note}` : ''}`;
      case 'status_changed':
        return `changed status from "${details?.from}" to "${details?.to}"`;
      case 'priority_changed':
        return `changed priority from "${details?.from}" to "${details?.to}"`;
      case 'note_added':
        return 'added a note';
      case 'due_date_set':
        return details?.to ? `set due date to ${formatDate(details.to)}` : 'removed due date';
      case 'tag_added':
        return `added tags: ${details?.tags?.join(', ')}`;
      case 'tag_removed':
        return `removed tags: ${details?.tags?.join(', ')}`;
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimestamp = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return <div className="activity-loading">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="no-activity">
        <p>No activity yet</p>
        <small>Activity history will appear here</small>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {activities.map((activity, index) => (
        <div key={activity._id} className="activity-item">
          <div className="activity-icon" style={{ backgroundColor: getActionColor(activity.action) }}>
            {getActionIcon(activity.action)}
          </div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-user">
                {activity.userId?.name || 'Unknown'}
              </span>
              <span className="activity-description">
                {formatActionDescription(activity)}
              </span>
            </div>
            <div className="activity-timestamp">
              {formatTimestamp(activity.createdAt)}
            </div>
          </div>
          {index < activities.length - 1 && <div className="activity-line" />}
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
