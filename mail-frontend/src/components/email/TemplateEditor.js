import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './TemplateEditor.css';

const TemplateEditor = ({ template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    body: '',
    category: 'general',
    isShared: true,
    enabled: true
  });

  const [loading, setLoading] = useState(false);

  // Suggested variables for quick insert
  const suggestedVariables = [
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email' },
    { name: 'firstName', label: 'First Name' },
    { name: 'lastName', label: 'Last Name' },
    { name: 'company', label: 'Company' },
    { name: 'productName', label: 'Product' }
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        subject: template.subject || '',
        body: template.body || '',
        category: template.category || 'general',
        isShared: template.isShared !== undefined ? template.isShared : true,
        enabled: template.enabled !== undefined ? template.enabled : true
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template) {
        await api.patch(`/email-templates/${template._id}`, formData);
      } else {
        await api.post('/email-templates', formData);
      }

      onSave && onSave();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (varName) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + `{{${varName}}}`
    }));
  };

  // Format body for preview - convert plain text newlines to <br> if not HTML
  const formatBodyForPreview = (text) => {
    if (!text) return '';

    // Check if content appears to be HTML (contains common HTML tags)
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(text);

    if (hasHtmlTags) {
      // It's HTML, render as-is
      return text;
    } else {
      // It's plain text, convert newlines to <br> and escape HTML
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      return escaped.replace(/\n/g, '<br>');
    }
  };

  return (
    <div className="template-editor-simple">
      <div className="editor-layout">
        {/* Left: Form */}
        <div className="editor-form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Template Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Support Response"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="form-row-inline">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="support">Support</option>
                  <option value="sales">Sales</option>
                  <option value="general">General</option>
                  <option value="auto-response">Auto-response</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isShared}
                    onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                  />
                  Share with team
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Subject Line *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Re: Your question about {{productName}}"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Body *</label>
              <div className="variable-chips">
                <span className="chips-label">Insert:</span>
                {suggestedVariables.map(v => (
                  <button
                    key={v.name}
                    type="button"
                    className="variable-chip"
                    onClick={() => insertVariable(v.name)}
                  >
                    {`{{${v.name}}}`}
                  </button>
                ))}
              </div>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Write your email template here. Use {{name}}, {{email}}, etc. for dynamic content. Supports HTML."
                rows={10}
                required
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Mail Preview */}
        <div className="editor-preview-section">
          <div className="mail-preview">
            <label>Mail Preview</label>
            <div className="preview-container">
              {formData.subject ? (
                <div className="preview-subject">
                  <strong>Subject:</strong> {formData.subject}
                </div>
              ) : (
                <div className="preview-subject preview-placeholder">
                  <strong>Subject:</strong> <span>Your subject line will appear here...</span>
                </div>
              )}
              {formData.body ? (
                <div
                  className="preview-body"
                  dangerouslySetInnerHTML={{ __html: formatBodyForPreview(formData.body) }}
                />
              ) : (
                <div className="preview-body preview-placeholder">
                  Your email content will be previewed here...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
