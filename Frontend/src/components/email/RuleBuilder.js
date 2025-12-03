import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RuleBuilder.css';

const RuleBuilder = ({ rule, emailAccountId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emailAccountId: emailAccountId || '',
    priority: 100,
    enabled: true,
    stopOnMatch: false,
    conditions: {
      subjectContains: [],
      fromEmail: [],
      fromDomain: [],
      bodyContains: [],
      timeOfDay: null
    },
    actions: {
      assignTo: null,
      assignToDepartment: null,
      roundRobin: null,
      setPriority: null,
      setDueDate: null,
      addTags: [],
      sendTemplate: null
    }
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Temporary input fields for arrays
  const [subjectInput, setSubjectInput] = useState('');
  const [fromEmailInput, setFromEmailInput] = useState('');
  const [fromDomainInput, setFromDomainInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchTeamMembers();
    fetchTemplates();

    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        emailAccountId: rule.emailAccountId || emailAccountId,
        priority: rule.priority || 100,
        enabled: rule.enabled !== undefined ? rule.enabled : true,
        stopOnMatch: rule.stopOnMatch || false,
        conditions: rule.conditions || formData.conditions,
        actions: rule.actions || formData.actions
      });

      if (rule.actions?.roundRobin?.teamMembers) {
        setSelectedMembers(rule.actions.roundRobin.teamMembers.map(m => m._id || m));
      }
    }
  }, [rule]);

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get('/api/users/company-members');
      setTeamMembers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/email-templates');
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare round-robin data
      let actions = { ...formData.actions };
      if (selectedMembers.length > 0) {
        actions.roundRobin = {
          teamMembers: selectedMembers,
          lastAssignedIndex: 0
        };
        actions.assignTo = null;
        actions.assignToDepartment = null;
      }

      const payload = {
        ...formData,
        actions
      };

      if (rule) {
        await axios.patch(`/api/assignment-rules/${rule._id}`, payload);
      } else {
        await axios.post('/api/assignment-rules', payload);
      }

      onSave && onSave();
      onClose();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addToArray = (field, value, setter) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [field]: [...(prev.conditions[field] || []), value.trim()]
      }
    }));
    setter('');
  };

  const removeFromArray = (field, index) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [field]: prev.conditions[field].filter((_, i) => i !== index)
      }
    }));
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        addTags: [...(prev.actions.addTags || []), tagInput.trim()]
      }
    }));
    setTagInput('');
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        addTags: prev.actions.addTags.filter((_, i) => i !== index)
      }
    }));
  };

  const handleMemberToggle = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="rule-builder">
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label>Rule Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., VIP Customer Priority"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of what this rule does"
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
                  checked={formData.stopOnMatch}
                  onChange={(e) => setFormData({ ...formData, stopOnMatch: e.target.checked })}
                />
                Stop processing rules after this one matches
              </label>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="form-section">
          <h3>Conditions (When to apply this rule)</h3>
          <p className="section-hint">Email must match ALL specified conditions</p>

          <div className="form-group">
            <label>Subject Contains</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('subjectContains', subjectInput, setSubjectInput))}
                placeholder="Type keyword and press Enter"
              />
              <button
                type="button"
                onClick={() => addToArray('subjectContains', subjectInput, setSubjectInput)}
                className="btn-add"
              >
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.conditions.subjectContains.map((keyword, index) => (
                <span key={index} className="tag">
                  {keyword}
                  <button type="button" onClick={() => removeFromArray('subjectContains', index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>From Email</label>
            <div className="tag-input-wrapper">
              <input
                type="email"
                value={fromEmailInput}
                onChange={(e) => setFromEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('fromEmail', fromEmailInput, setFromEmailInput))}
                placeholder="sender@example.com"
              />
              <button
                type="button"
                onClick={() => addToArray('fromEmail', fromEmailInput, setFromEmailInput)}
                className="btn-add"
              >
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.conditions.fromEmail.map((email, index) => (
                <span key={index} className="tag">
                  {email}
                  <button type="button" onClick={() => removeFromArray('fromEmail', index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>From Domain</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={fromDomainInput}
                onChange={(e) => setFromDomainInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('fromDomain', fromDomainInput, setFromDomainInput))}
                placeholder="example.com"
              />
              <button
                type="button"
                onClick={() => addToArray('fromDomain', fromDomainInput, setFromDomainInput)}
                className="btn-add"
              >
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.conditions.fromDomain.map((domain, index) => (
                <span key={index} className="tag">
                  {domain}
                  <button type="button" onClick={() => removeFromArray('fromDomain', index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Body Contains</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('bodyContains', bodyInput, setBodyInput))}
                placeholder="Type keyword and press Enter"
              />
              <button
                type="button"
                onClick={() => addToArray('bodyContains', bodyInput, setBodyInput)}
                className="btn-add"
              >
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.conditions.bodyContains.map((keyword, index) => (
                <span key={index} className="tag">
                  {keyword}
                  <button type="button" onClick={() => removeFromArray('bodyContains', index)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-section">
          <h3>Actions (What to do when rule matches)</h3>

          <div className="form-group">
            <label>Assignment Strategy</label>
            <select
              value={
                selectedMembers.length > 0 ? 'roundRobin' :
                formData.actions.assignTo ? 'user' :
                formData.actions.assignToDepartment ? 'department' : ''
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'roundRobin') {
                  // Keep selected members
                } else if (value === 'user' || value === 'department') {
                  setSelectedMembers([]);
                  setFormData(prev => ({
                    ...prev,
                    actions: {
                      ...prev.actions,
                      assignTo: value === 'user' ? '' : null,
                      assignToDepartment: value === 'department' ? '' : null,
                      roundRobin: null
                    }
                  }));
                }
              }}
            >
              <option value="">Select assignment strategy</option>
              <option value="user">Assign to specific user</option>
              <option value="department">Assign to department</option>
              <option value="roundRobin">Round-robin among team</option>
            </select>
          </div>

          {formData.actions.assignTo !== null && selectedMembers.length === 0 && !formData.actions.assignToDepartment && (
            <div className="form-group">
              <label>Assign To User</label>
              <select
                value={formData.actions.assignTo || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actions: { ...formData.actions, assignTo: e.target.value }
                })}
              >
                <option value="">Select user</option>
                {teamMembers.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.actions.assignToDepartment !== null && selectedMembers.length === 0 && (
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={formData.actions.assignToDepartment || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actions: { ...formData.actions, assignToDepartment: e.target.value }
                })}
                placeholder="e.g., Support, Sales"
              />
            </div>
          )}

          {selectedMembers.length > 0 && (
            <div className="form-group">
              <label>Round-Robin Team Members</label>
              <div className="members-selection">
                {teamMembers.map(member => (
                  <label key={member._id} className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member._id)}
                      onChange={() => handleMemberToggle(member._id)}
                    />
                    <span className="member-info">
                      <span className="member-name">{member.name}</span>
                      <span className="member-email">{member.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Set Priority</label>
            <select
              value={formData.actions.setPriority || ''}
              onChange={(e) => setFormData({
                ...formData,
                actions: { ...formData.actions, setPriority: e.target.value || null }
              })}
            >
              <option value="">Don't set priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label>Set Due Date</label>
            <div className="form-row">
              <input
                type="number"
                value={formData.actions.setDueDate?.relative || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  actions: {
                    ...formData.actions,
                    setDueDate: e.target.value ? {
                      relative: parseInt(e.target.value),
                      unit: formData.actions.setDueDate?.unit || 'hours'
                    } : null
                  }
                })}
                placeholder="24"
                min="1"
              />
              <select
                value={formData.actions.setDueDate?.unit || 'hours'}
                onChange={(e) => setFormData({
                  ...formData,
                  actions: {
                    ...formData.actions,
                    setDueDate: formData.actions.setDueDate?.relative ? {
                      ...formData.actions.setDueDate,
                      unit: e.target.value
                    } : null
                  }
                })}
                disabled={!formData.actions.setDueDate?.relative}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Auto-add Tags</label>
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Type tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn-add">
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.actions.addTags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(index)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Send Template Response</label>
            <select
              value={formData.actions.sendTemplate || ''}
              onChange={(e) => setFormData({
                ...formData,
                actions: { ...formData.actions, sendTemplate: e.target.value || null }
              })}
            >
              <option value="">Don't send template</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RuleBuilder;
