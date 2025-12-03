import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TemplateEditor from './TemplateEditor';
import './TemplateManager.css';

const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [stats, setStats] = useState(null);

  const categories = ['all', 'support', 'sales', 'general', 'auto-response', 'follow-up'];

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const res = await axios.get('/api/email-templates', { params });
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/email-templates/stats');
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await axios.delete(`/api/email-templates/${templateId}`);
      setTemplates(templates.filter(t => t._id !== templateId));
      fetchStats();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
    fetchTemplates();
    fetchStats();
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      support: '#3182ce',
      sales: '#48bb78',
      general: '#718096',
      'auto-response': '#ed8936',
      'follow-up': '#9f7aea'
    };
    return colors[category] || '#718096';
  };

  if (loading) {
    return (
      <div className="template-manager">
        <div className="template-loading">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="template-manager">
      <div className="template-header">
        <div className="template-title">
          <h2>Email Templates</h2>
          <p>Create and manage reusable email templates</p>
        </div>
        <button className="btn-create-template" onClick={handleCreateNew}>
          + Create Template
        </button>
      </div>

      {stats && (
        <div className="template-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalTemplates || 0}</div>
            <div className="stat-label">Total Templates</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.enabledTemplates || 0}</div>
            <div className="stat-label">Enabled</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalUsage || 0}</div>
            <div className="stat-label">Total Uses</div>
          </div>
        </div>
      )}

      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category}
            className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
            {stats && category !== 'all' && stats.categoryBreakdown && (
              <span className="category-count">{stats.categoryBreakdown[category] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="no-templates">
          <div className="no-templates-icon">=�</div>
          <h3>No templates found</h3>
          <p>Create your first email template to save time responding to emails</p>
          <button className="btn-create-first" onClick={handleCreateNew}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template._id} className="template-card">
              <div className="template-card-header">
                <div className="template-info">
                  <h3 className="template-name">{template.name}</h3>
                  {template.description && (
                    <p className="template-description">{template.description}</p>
                  )}
                </div>
                <span
                  className="category-badge"
                  style={{ backgroundColor: getCategoryBadgeColor(template.category) }}
                >
                  {template.category}
                </span>
              </div>

              <div className="template-card-body">
                <div className="template-subject">
                  <strong>Subject:</strong> {template.subject}
                </div>
                <div className="template-body-preview">
                  {template.body.substring(0, 150)}
                  {template.body.length > 150 && '...'}
                </div>

                {template.variables && template.variables.length > 0 && (
                  <div className="template-variables">
                    <span className="variables-label">Variables:</span>
                    {template.variables.slice(0, 3).map(v => (
                      <span key={v.name} className="variable-tag">
                        {`{{${v.name}}}`}
                      </span>
                    ))}
                    {template.variables.length > 3 && (
                      <span className="more-variables">+{template.variables.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="template-card-footer">
                <div className="template-meta">
                  <span className="meta-item">
                    <span className="meta-icon">=�</span>
                    {template.useCount || 0} uses
                  </span>
                  {template.lastUsedAt && (
                    <span className="meta-item">
                      <span className="meta-icon">=P</span>
                      {formatDate(template.lastUsedAt)}
                    </span>
                  )}
                  {template.isShared && (
                    <span className="shared-badge">Shared</span>
                  )}
                </div>
                <div className="template-actions">
                  <button
                    className="btn-icon-action"
                    onClick={() => handleEditTemplate(template)}
                    title="Edit template"
                  >
                    
                  </button>
                  <button
                    className="btn-icon-action btn-delete-action"
                    onClick={() => handleDeleteTemplate(template._id)}
                    title="Delete template"
                  >
                    =�
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

// Placeholder for TemplateEditorModal - will be created next
const TemplateEditorModal = ({ template, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{template ? 'Edit Template' : 'Create New Template'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <TemplateEditor
            template={template}
            onClose={onClose}
            onSave={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
