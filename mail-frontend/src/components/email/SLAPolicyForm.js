import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './SLAPolicyForm.css';

const SLAPolicyForm = ({ policy, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 100,
    enabled: true,
    targets: {
      firstResponseTime: {
        urgent: 15,
        high: 60,
        normal: 240,
        low: 1440
      },
      resolutionTime: {
        urgent: 120,
        high: 480,
        normal: 1440,
        low: 4320
      }
    },
    businessHours: {
      enabled: false,
      timezone: 'UTC',
      workDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00'
    },
    escalation: {
      enabled: false,
      escalateAtPercent: 75,
      escalateTo: [],
      notificationMethod: 'email'
    },
    conditions: {
      tags: [],
      fromDomains: [],
      department: ''
    }
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  useEffect(() => {
    fetchTeamMembers();

    if (policy) {
      setFormData({
        name: policy.name || '',
        description: policy.description || '',
        priority: policy.priority || 100,
        enabled: policy.enabled !== undefined ? policy.enabled : true,
        targets: policy.targets || formData.targets,
        businessHours: policy.businessHours || formData.businessHours,
        escalation: policy.escalation || formData.escalation,
        conditions: policy.conditions || formData.conditions
      });
    }
  }, [policy]);

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/users/company-members');
      setTeamMembers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (policy) {
        await api.patch(`/sla-policies/${policy._id}`, formData);
      } else {
        await api.post('/sla-policies', formData);
      }

      onSave && onSave();
      onClose();
    } catch (error) {
      console.error('Error saving SLA policy:', error);
      alert('Failed to save policy: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (type, priority, value) => {
    setFormData(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [type]: {
          ...prev.targets[type],
          [priority]: parseInt(value) || 0
        }
      }
    }));
  };

  const handleWorkDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        workDays: prev.businessHours.workDays.includes(day)
          ? prev.businessHours.workDays.filter(d => d !== day)
          : [...prev.businessHours.workDays, day].sort()
      }
    }));
  };

  const handleEscalateToToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      escalation: {
        ...prev.escalation,
        escalateTo: prev.escalation.escalateTo.includes(userId)
          ? prev.escalation.escalateTo.filter(id => id !== userId)
          : [...prev.escalation.escalateTo, userId]
      }
    }));
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        tags: [...prev.conditions.tags, tagInput.trim()]
      }
    }));
    setTagInput('');
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        tags: prev.conditions.tags.filter((_, i) => i !== index)
      }
    }));
  };

  const addDomain = () => {
    if (!domainInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        fromDomains: [...prev.conditions.fromDomains, domainInput.trim()]
      }
    }));
    setDomainInput('');
  };

  const removeDomain = (index) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        fromDomains: prev.conditions.fromDomains.filter((_, i) => i !== index)
      }
    }));
  };

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  return (
    <div className="sla-policy-form">
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label>Policy Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Standard Support SLA"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of this SLA policy"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                min="1"
                max="1000"
              />
              <small>Lower number = higher priority</small>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                Policy enabled
              </label>
            </div>
          </div>
        </div>

        {/* SLA Targets */}
        <div className="form-section">
          <h3>SLA Targets (in minutes)</h3>

          <div className="targets-section">
            <div className="target-type">
              <h4>First Response Time</h4>
              <div className="priority-inputs">
                <div className="priority-input">
                  <label>Urgent</label>
                  <input
                    type="number"
                    value={formData.targets.firstResponseTime.urgent}
                    onChange={(e) => handleTargetChange('firstResponseTime', 'urgent', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>High</label>
                  <input
                    type="number"
                    value={formData.targets.firstResponseTime.high}
                    onChange={(e) => handleTargetChange('firstResponseTime', 'high', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>Normal</label>
                  <input
                    type="number"
                    value={formData.targets.firstResponseTime.normal}
                    onChange={(e) => handleTargetChange('firstResponseTime', 'normal', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>Low</label>
                  <input
                    type="number"
                    value={formData.targets.firstResponseTime.low}
                    onChange={(e) => handleTargetChange('firstResponseTime', 'low', e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="target-type">
              <h4>Resolution Time</h4>
              <div className="priority-inputs">
                <div className="priority-input">
                  <label>Urgent</label>
                  <input
                    type="number"
                    value={formData.targets.resolutionTime.urgent}
                    onChange={(e) => handleTargetChange('resolutionTime', 'urgent', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>High</label>
                  <input
                    type="number"
                    value={formData.targets.resolutionTime.high}
                    onChange={(e) => handleTargetChange('resolutionTime', 'high', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>Normal</label>
                  <input
                    type="number"
                    value={formData.targets.resolutionTime.normal}
                    onChange={(e) => handleTargetChange('resolutionTime', 'normal', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="priority-input">
                  <label>Low</label>
                  <input
                    type="number"
                    value={formData.targets.resolutionTime.low}
                    onChange={(e) => handleTargetChange('resolutionTime', 'low', e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="form-section">
          <h3>Business Hours</h3>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.businessHours.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  businessHours: { ...formData.businessHours, enabled: e.target.checked }
                })}
              />
              Enable business hours calculation
            </label>
          </div>

          {formData.businessHours.enabled && (
            <>
              <div className="form-group">
                <label>Work Days</label>
                <div className="weekdays-selector">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      className={`weekday-btn ${formData.businessHours.workDays.includes(day.value) ? 'active' : ''}`}
                      onClick={() => handleWorkDayToggle(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={formData.businessHours.startTime}
                    onChange={(e) => setFormData({
                      ...formData,
                      businessHours: { ...formData.businessHours, startTime: e.target.value }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={formData.businessHours.endTime}
                    onChange={(e) => setFormData({
                      ...formData,
                      businessHours: { ...formData.businessHours, endTime: e.target.value }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={formData.businessHours.timezone}
                    onChange={(e) => setFormData({
                      ...formData,
                      businessHours: { ...formData.businessHours, timezone: e.target.value }
                    })}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Escalation */}
        <div className="form-section">
          <h3>Escalation</h3>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.escalation.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  escalation: { ...formData.escalation, enabled: e.target.checked }
                })}
              />
              Enable automatic escalation
            </label>
          </div>

          {formData.escalation.enabled && (
            <>
              <div className="form-group">
                <label>Escalate at % of SLA time</label>
                <input
                  type="number"
                  value={formData.escalation.escalateAtPercent}
                  onChange={(e) => setFormData({
                    ...formData,
                    escalation: { ...formData.escalation, escalateAtPercent: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="100"
                />
                <small>e.g., 75 = escalate when 75% of SLA time has elapsed</small>
              </div>

              <div className="form-group">
                <label>Escalate To</label>
                <div className="team-members-list">
                  {teamMembers.map(member => (
                    <label key={member._id} className="member-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.escalation.escalateTo.includes(member._id)}
                        onChange={() => handleEscalateToToggle(member._id)}
                      />
                      <span className="member-name">{member.name}</span>
                      <span className="member-email">{member.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notification Method</label>
                <select
                  value={formData.escalation.notificationMethod}
                  onChange={(e) => setFormData({
                    ...formData,
                    escalation: { ...formData.escalation, notificationMethod: e.target.value }
                  })}
                >
                  <option value="email">Email</option>
                  <option value="slack">Slack</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Conditions */}
        <div className="form-section">
          <h3>Conditions (when this SLA applies)</h3>

          <div className="form-group">
            <label>Tags</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Type tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn-add">Add</button>
            </div>
            <div className="tags-list">
              {formData.conditions.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(index)}>�</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>From Domains</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                placeholder="example.com"
              />
              <button type="button" onClick={addDomain} className="btn-add">Add</button>
            </div>
            <div className="tags-list">
              {formData.conditions.fromDomains.map((domain, index) => (
                <span key={index} className="tag">
                  {domain}
                  <button type="button" onClick={() => removeDomain(index)}>�</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              value={formData.conditions.department}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, department: e.target.value }
              })}
              placeholder="e.g., Support"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Saving...' : (policy ? 'Update Policy' : 'Create Policy')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SLAPolicyForm;
