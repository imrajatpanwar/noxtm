import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RuleBuilder from './RuleBuilder';
import './RulesManager.css';

const RulesManager = ({ emailAccountId }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchRules();
    fetchStats();
  }, [emailAccountId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const params = emailAccountId ? { emailAccountId } : {};
      const res = await axios.get('/api/assignment-rules', { params });
      setRules(res.data.rules || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/assignment-rules/stats/overview');
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      const res = await axios.patch(`/api/assignment-rules/${ruleId}/toggle`);
      setRules(rules.map(rule =>
        rule._id === ruleId ? { ...rule, enabled: res.data.enabled } : rule
      ));
    } catch (error) {
      console.error('Error toggling rule:', error);
      alert('Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await axios.delete(`/api/assignment-rules/${ruleId}`);
      setRules(rules.filter(rule => rule._id !== ruleId));
      fetchStats();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingRule(null);
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingRule(null);
    fetchRules();
    fetchStats();
  };

  const getConditionsSummary = (conditions) => {
    const parts = [];
    if (conditions.subjectContains && conditions.subjectContains.length > 0) {
      parts.push(`Subject: ${conditions.subjectContains.join(', ')}`);
    }
    if (conditions.fromEmail && conditions.fromEmail.length > 0) {
      parts.push(`From: ${conditions.fromEmail.join(', ')}`);
    }
    if (conditions.fromDomain && conditions.fromDomain.length > 0) {
      parts.push(`Domain: ${conditions.fromDomain.join(', ')}`);
    }
    if (conditions.bodyContains && conditions.bodyContains.length > 0) {
      parts.push(`Body: ${conditions.bodyContains.join(', ')}`);
    }
    if (conditions.timeOfDay) {
      parts.push(`Time: ${conditions.timeOfDay.start}-${conditions.timeOfDay.end}`);
    }
    return parts.length > 0 ? parts.join(' " ') : 'No conditions';
  };

  const getActionsSummary = (actions) => {
    const parts = [];
    if (actions.assignTo) {
      parts.push('Assign to user');
    }
    if (actions.assignToDepartment) {
      parts.push(`Assign to ${actions.assignToDepartment}`);
    }
    if (actions.roundRobin && actions.roundRobin.teamMembers) {
      parts.push(`Round-robin (${actions.roundRobin.teamMembers.length} members)`);
    }
    if (actions.setPriority) {
      parts.push(`Priority: ${actions.setPriority}`);
    }
    if (actions.setDueDate) {
      if (actions.setDueDate.relative) {
        parts.push(`Due: ${actions.setDueDate.relative} ${actions.setDueDate.unit}`);
      }
    }
    if (actions.addTags && actions.addTags.length > 0) {
      parts.push(`Tags: ${actions.addTags.join(', ')}`);
    }
    if (actions.sendTemplate) {
      parts.push('Send template');
    }
    return parts.length > 0 ? parts.join(' " ') : 'No actions';
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="rules-manager">
        <div className="rules-loading">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="rules-manager">
      <div className="rules-header">
        <div className="rules-title">
          <h2>Assignment Rules</h2>
          <p>Automate email assignment based on conditions</p>
        </div>
        <button className="btn-create-rule" onClick={handleCreateNew}>
          + Create Rule
        </button>
      </div>

      {stats && (
        <div className="rules-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalRules || 0}</div>
            <div className="stat-label">Total Rules</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.enabledRules || 0}</div>
            <div className="stat-label">Enabled</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalMatches || 0}</div>
            <div className="stat-label">Total Matches</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalExecutions || 0}</div>
            <div className="stat-label">Executions</div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="no-rules">
          <div className="no-rules-icon">�</div>
          <h3>No assignment rules yet</h3>
          <p>Create your first rule to automate email assignments</p>
          <button className="btn-create-first" onClick={handleCreateNew}>
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="rules-list">
          {rules.map((rule, index) => (
            <div key={rule._id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
              <div className="rule-card-header">
                <div className="rule-priority">#{rule.priority}</div>
                <div className="rule-info">
                  <h3 className="rule-name">{rule.name}</h3>
                  {rule.description && (
                    <p className="rule-description">{rule.description}</p>
                  )}
                </div>
                <div className="rule-actions">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule._id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <button
                    className="btn-icon"
                    onClick={() => handleEditRule(rule)}
                    title="Edit rule"
                  >
                    
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteRule(rule._id)}
                    title="Delete rule"
                  >
                    =�
                  </button>
                </div>
              </div>

              <div className="rule-card-body">
                <div className="rule-section">
                  <div className="section-label">Conditions</div>
                  <div className="section-content">
                    {getConditionsSummary(rule.conditions)}
                  </div>
                </div>

                <div className="rule-section">
                  <div className="section-label">Actions</div>
                  <div className="section-content">
                    {getActionsSummary(rule.actions)}
                  </div>
                </div>
              </div>

              <div className="rule-card-footer">
                <div className="rule-stats-item">
                  <span className="stat-icon">=�</span>
                  {rule.matchCount || 0} matches
                </div>
                <div className="rule-stats-item">
                  <span className="stat-icon"></span>
                  {rule.executionCount || 0} executions
                </div>
                {rule.lastMatchedAt && (
                  <div className="rule-stats-item">
                    <span className="stat-icon">=P</span>
                    Last: {formatDate(rule.lastMatchedAt)}
                  </div>
                )}
                {rule.stopOnMatch && (
                  <div className="rule-badge">Stop on match</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <RuleBuilderModal
          rule={editingRule}
          emailAccountId={emailAccountId}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

// Placeholder for RuleBuilderModal - will be created next
const RuleBuilderModal = ({ rule, emailAccountId, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{rule ? 'Edit Rule' : 'Create New Rule'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <RuleBuilder
            rule={rule}
            emailAccountId={emailAccountId}
            onClose={onClose}
            onSave={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default RulesManager;
