import React, { useState, useEffect, useCallback } from 'react';
import { FiEdit2, FiTrash2, FiMail, FiUsers, FiFileText } from 'react-icons/fi';
import api from '../../config/api';
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

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const res = await api.get('/email-templates', { params });
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/email-templates/stats');
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [selectedCategory, fetchTemplates]);

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await api.delete(`/email-templates/${templateId}`);
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
        <button className="btn-primary" onClick={handleCreateNew}>
          Create Template
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
          <div className="no-templates-icon"><FiFileText size={48} /></div>
          <h3>No templates found</h3>
          <p>Create your first email template to save time responding to emails</p>
          <button className="btn-primary" onClick={handleCreateNew}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="templates-list">
          <div className="templates-list-header">
            <span className="list-col-name">Template</span>
            <span className="list-col-category">Category</span>
            <span className="list-col-subject">Subject</span>
            <span className="list-col-usage">Usage</span>
            <span className="list-col-actions">Actions</span>
          </div>
          {templates.map(template => (
            <div key={template._id} className="template-list-item">
              <div className="list-col-name">
                <div className="template-name-info">
                  <span className="template-name">{template.name}</span>
                  {template.body && template.body.includes('<') && (
                    <span className="html-badge">HTML</span>
                  )}
                  {template.isShared && (
                    <span className="shared-badge"><FiUsers size={10} /></span>
                  )}
                </div>
                {template.description && (
                  <span className="template-description">{template.description}</span>
                )}
              </div>
              <div className="list-col-category">
                <span
                  className="category-badge"
                  style={{ backgroundColor: getCategoryBadgeColor(template.category) }}
                >
                  {template.category}
                </span>
              </div>
              <div className="list-col-subject">
                <span className="subject-text">{template.subject}</span>
              </div>
              <div className="list-col-usage">
                <span className="usage-count">
                  <FiMail size={13} />
                  {template.useCount || 0}
                </span>
              </div>
              <div className="list-col-actions">
                <button
                  className="btn-icon-action"
                  onClick={() => handleEditTemplate(template)}
                  title="Edit template"
                >
                  <FiEdit2 size={15} />
                </button>
                <button
                  className="btn-icon-action btn-delete-action"
                  onClick={() => handleDeleteTemplate(template._id)}
                  title="Delete template"
                >
                  <FiTrash2 size={15} />
                </button>
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
