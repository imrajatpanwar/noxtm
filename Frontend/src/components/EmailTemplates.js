import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiX, FiCopy, FiEye } from 'react-icons/fi';
import './EmailManagement.css';

function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'marketing',
    category: 'general',
    subject: '',
    htmlBody: '',
    textBody: '',
    fromName: 'Noxtm',
    fromEmail: 'noreply@noxtm.com',
    replyTo: '',
    variables: [],
    enabled: true
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || '',
        slug: template.slug || '',
        type: template.type || 'marketing',
        category: template.category || 'general',
        subject: template.subject || '',
        htmlBody: template.htmlBody || '',
        textBody: template.textBody || '',
        fromName: template.fromName || 'Noxtm',
        fromEmail: template.fromEmail || 'noreply@noxtm.com',
        replyTo: template.replyTo || '',
        variables: template.variables || [],
        enabled: template.enabled !== false
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        slug: '',
        type: 'marketing',
        category: 'general',
        subject: '',
        htmlBody: '',
        textBody: '',
        fromName: 'Noxtm',
        fromEmail: 'noreply@noxtm.com',
        replyTo: '',
        variables: [],
        enabled: true
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setShowModal(false);
      setEditingTemplate(null);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name' && !editingTemplate) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug || !formData.subject || !formData.htmlBody) {
      setError('Name, slug, subject, and HTML body are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate._id}`, formData);
      } else {
        await api.post('/email-templates', formData);
      }

      fetchTemplates();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await api.delete(`/email-templates/${templateId}`);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handlePreview = async (template) => {
    try {
      const response = await api.post(`/email-templates/${template._id}/preview`, {
        variables: {}
      });
      setPreviewTemplate({
        ...template,
        rendered: response.data.data
      });
      setShowPreviewModal(true);
    } catch (err) {
      setError('Failed to preview template');
    }
  };

  const handleDuplicate = (template) => {
    handleOpenModal({
      ...template,
      name: `${template.name} (Copy)`,
      slug: `${template.slug}-copy-${Date.now()}`,
      _id: null
    });
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('htmlBody');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.htmlBody;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + `{{${variable}}}` + after;
      
      setFormData(prev => ({ ...prev, htmlBody: newText }));
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const commonVariables = [
    'firstName', 'lastName', 'email', 'companyName', 
    'userName', 'verificationCode', 'resetLink', 'loginLink'
  ];

  if (loading) {
    return (
      <div className="email-management-page">
        <h1><FiFileText /> Email Templates</h1>
        <div className="loading-message">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiFileText /> Email Templates</h1>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <FiPlus /> Create Template
        </button>
      </div>

      {error && !showModal && <div className="error-message">{error}</div>}

      <div className="content-card">
        <div className="templates-grid">
          {templates.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <FiFileText size={64} color="#ccc" />
              <h3>No templates yet</h3>
              <p>Create your first email template to get started</p>
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                <FiPlus /> Create Template
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template._id} className="template-card">
                <div className="template-card-header">
                  <h3>{template.name}</h3>
                  <div className="template-actions">
                    <button className="btn-icon" title="Preview" onClick={() => handlePreview(template)}>
                      <FiEye />
                    </button>
                    <button className="btn-icon" title="Duplicate" onClick={() => handleDuplicate(template)}>
                      <FiCopy />
                    </button>
                    <button className="btn-icon" title="Edit" onClick={() => handleOpenModal(template)}>
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(template._id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <p className="template-subject">
                  <strong>Subject:</strong> {template.subject}
                </p>
                <div className="template-meta">
                  <span className={`status-badge ${template.category}`}>{template.category}</span>
                  <span className="status-badge">{template.type}</span>
                  {template.enabled ? (
                    <span className="status-badge active">Enabled</span>
                  ) : (
                    <span className="status-badge inactive">Disabled</span>
                  )}
                </div>
                <div className="template-stats">
                  <small>📧 Sent: {template.sendCount || 0} times</small>
                  {template.lastSentAt && (
                    <small>Last sent: {new Date(template.lastSentAt).toLocaleDateString()}</small>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="noxtm-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FiFileText /> {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button className="btn-icon" onClick={handleCloseModal} disabled={submitting}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="error-message">{error}</div>}

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Template Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Welcome Email"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Slug *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="welcome-email"
                      required
                      disabled={submitting || editingTemplate}
                    />
                    <small>Unique identifier (cannot be changed)</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      disabled={submitting}
                    >
                      <option value="transactional">Transactional</option>
                      <option value="marketing">Marketing</option>
                      <option value="notification">Notification</option>
                      <option value="newsletter">Newsletter</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      disabled={submitting}
                    >
                      <option value="general">General</option>
                      <option value="welcome">Welcome</option>
                      <option value="verification">Verification</option>
                      <option value="password-reset">Password Reset</option>
                      <option value="invoice">Invoice</option>
                      <option value="alert">Alert</option>
                      <option value="promotional">Promotional</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.enabled}
                      onChange={(e) => handleInputChange('enabled', e.target.value === 'true')}
                      disabled={submitting}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Welcome to {{companyName}}!"
                    required
                    disabled={submitting}
                  />
                  <small>Use {'{{variableName}}'} for dynamic content</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>From Name</label>
                    <input
                      type="text"
                      value={formData.fromName}
                      onChange={(e) => handleInputChange('fromName', e.target.value)}
                      placeholder="Noxtm"
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>From Email</label>
                    <input
                      type="email"
                      value={formData.fromEmail}
                      onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                      placeholder="noreply@noxtm.com"
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Reply-To (Optional)</label>
                    <input
                      type="email"
                      value={formData.replyTo}
                      onChange={(e) => handleInputChange('replyTo', e.target.value)}
                      placeholder="support@noxtm.com"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>HTML Body *</label>
                  <div className="editor-toolbar">
                    <small>Insert variables:</small>
                    {commonVariables.map(variable => (
                      <button
                        key={variable}
                        type="button"
                        className="btn-small"
                        onClick={() => insertVariable(variable)}
                        disabled={submitting}
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="htmlBody"
                    value={formData.htmlBody}
                    onChange={(e) => handleInputChange('htmlBody', e.target.value)}
                    placeholder="<h1>Welcome {{firstName}}!</h1><p>Thank you for joining...</p>"
                    rows={12}
                    required
                    disabled={submitting}
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <small>Write HTML content with inline styles for best email compatibility</small>
                </div>

                <div className="form-group">
                  <label>Plain Text Body (Optional)</label>
                  <textarea
                    value={formData.textBody}
                    onChange={(e) => handleInputChange('textBody', e.target.value)}
                    placeholder="Welcome {{firstName}}! Thank you for joining..."
                    rows={6}
                    disabled={submitting}
                  />
                  <small>Fallback for email clients that don't support HTML</small>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="noxtm-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiEye /> Preview: {previewTemplate.name}</h2>
              <button className="btn-icon" onClick={() => setShowPreviewModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="preview-container">
                <div className="preview-header">
                  <strong>From:</strong> {previewTemplate.rendered?.from || `${previewTemplate.fromName} <${previewTemplate.fromEmail}>`}
                </div>
                <div className="preview-header">
                  <strong>Subject:</strong> {previewTemplate.rendered?.subject || previewTemplate.subject}
                </div>
                <div className="preview-divider"></div>
                <div 
                  className="preview-body"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.rendered?.html || previewTemplate.htmlBody }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowPreviewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailTemplates;
