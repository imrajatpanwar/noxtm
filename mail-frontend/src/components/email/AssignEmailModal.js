import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AssignEmailModal.css';

const AssignEmailModal = ({ email, emailAccountId, onClose, onAssigned }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [formData, setFormData] = useState({
    assignedTo: '',
    priority: 'normal',
    dueDate: '',
    tags: [],
    note: ''
  });

  const [tagInput, setTagInput] = useState('');

  const priorityLevels = [
    { value: 'low', label: 'Low', color: '#718096' },
    { value: 'normal', label: 'Normal', color: '#3182ce' },
    { value: 'high', label: 'High', color: '#ed8936' },
    { value: 'urgent', label: 'Urgent', color: '#e53e3e' }
  ];

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoadingMembers(true);
    try {
      // Fetch company members
      const res = await axios.get('/api/company/members');
      setTeamMembers(res.data.members || []);

      // Auto-select first member if available
      if (res.data.members && res.data.members.length > 0) {
        setFormData(prev => ({ ...prev, assignedTo: res.data.members[0]._id }));
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      alert('Error loading team members: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.assignedTo) {
      alert('Please select a team member to assign');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        emailAccountId,
        emailUid: email.uid,
        emailSubject: email.subject || '(No Subject)',
        emailFrom: email.from?.address || email.from?.text || 'Unknown',
        emailDate: email.date || new Date(),
        emailMessageId: email.messageId,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        tags: formData.tags,
        note: formData.note.trim() || null
      };

      await axios.post('/api/email-assignments/assign', payload);

      alert('✅ Email assigned successfully!');

      if (onAssigned) {
        onAssigned();
      }
      onClose();

    } catch (error) {
      console.error('Error assigning email:', error);
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already assigned')) {
        alert('⚠️ This email is already assigned to a team member');
      } else {
        alert('❌ Error assigning email: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingMembers) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading team members...</div>
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content assign-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Assign Email</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="no-members-warning">
              <p>⚠️ No team members found</p>
              <p>You need at least one team member to assign emails.</p>
              <button className="btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content assign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Email</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Email Preview */}
            <div className="email-preview-card">
              <div className="preview-label">Email:</div>
              <div className="preview-subject">{email.subject || '(No Subject)'}</div>
              <div className="preview-from">
                From: {email.from?.name || email.from?.address || 'Unknown'}
              </div>
            </div>

            {/* Assign To */}
            <div className="form-group">
              <label>Assign To *</label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                required
              >
                <option value="">Select team member</option>
                {teamMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                    {member.department && ` - ${member.department}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="form-group">
              <label>Priority</label>
              <div className="priority-options">
                {priorityLevels.map(level => (
                  <label
                    key={level.value}
                    className={`priority-option ${formData.priority === level.value ? 'selected' : ''}`}
                    style={{
                      borderColor: formData.priority === level.value ? level.color : '#cbd5e0'
                    }}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={level.value}
                      checked={formData.priority === level.value}
                      onChange={handleChange}
                    />
                    <span style={{ color: level.color }}>●</span>
                    <span>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
              <small>Set a deadline for this assignment</small>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label>Tags (Optional)</label>
              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                />
                <button
                  type="button"
                  className="btn-add-tag"
                  onClick={handleAddTag}
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="tags-list">
                  {formData.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <small>Tags help categorize and filter assignments</small>
            </div>

            {/* Note */}
            <div className="form-group">
              <label>Note (Optional)</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows="3"
                placeholder="Add instructions or context for the assignee..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignEmailModal;
