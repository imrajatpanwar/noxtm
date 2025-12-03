import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TemplateEditor.css';

const TemplateEditor = ({ template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    body: '',
    category: 'general',
    variables: [],
    isShared: true,
    enabled: true
  });

  const [variableInput, setVariableInput] = useState({ name: '', description: '', defaultValue: '' });
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [testVariables, setTestVariables] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        subject: template.subject || '',
        body: template.body || '',
        category: template.category || 'general',
        variables: template.variables || [],
        isShared: template.isShared !== undefined ? template.isShared : true,
        enabled: template.enabled !== undefined ? template.enabled : true
      });

      // Auto-extract variables for testing
      const extractedVars = extractVariablesFromText(template.subject + ' ' + template.body);
      const testVars = {};
      extractedVars.forEach(varName => {
        const existing = template.variables?.find(v => v.name === varName);
        testVars[varName] = existing?.defaultValue || '';
      });
      setTestVariables(testVars);
    }
  }, [template]);

  const extractVariablesFromText = (text) => {
    const regex = /{{(\w+)}}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };

      if (template) {
        await axios.patch(`/api/email-templates/${template._id}`, payload);
      } else {
        await axios.post('/api/email-templates', payload);
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

  const handleAddVariable = () => {
    if (!variableInput.name.trim()) {
      alert('Variable name is required');
      return;
    }

    // Check for duplicates
    if (formData.variables.some(v => v.name === variableInput.name)) {
      alert('Variable with this name already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, { ...variableInput }]
    }));

    setVariableInput({ name: '', description: '', defaultValue: '' });
    setShowVariableForm(false);
  };

  const handleRemoveVariable = (index) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const handleInsertVariable = (varName) => {
    const placeholder = `{{${varName}}}`;
    // Insert at end of body for simplicity
    setFormData(prev => ({
      ...prev,
      body: prev.body + (prev.body ? ' ' : '') + placeholder
    }));
  };

  const handlePreview = async () => {
    try {
      if (template && template._id) {
        const res = await axios.post(`/api/email-templates/${template._id}/render`, {
          variables: testVariables
        });
        setPreview(res.data.rendered);
      } else {
        // Local preview without backend
        let subject = formData.subject;
        let body = formData.body;

        Object.entries(testVariables).forEach(([key, value]) => {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(placeholder, value || '');
          body = body.replace(placeholder, value || '');
        });

        setPreview({ subject, body });
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      alert('Failed to preview template');
    }
  };

  const autoExtractVariables = () => {
    const text = formData.subject + ' ' + formData.body;
    const extractedVars = extractVariablesFromText(text);

    extractedVars.forEach(varName => {
      // Only add if not already in variables list
      if (!formData.variables.some(v => v.name === varName)) {
        setFormData(prev => ({
          ...prev,
          variables: [...prev.variables, { name: varName, description: '', defaultValue: '' }]
        }));
      }

      // Initialize test variable
      if (!testVariables[varName]) {
        setTestVariables(prev => ({ ...prev, [varName]: '' }));
      }
    });
  };

  return (
    <div className="template-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-layout">
          {/* Left Side: Editor */}
          <div className="editor-main">
            <div className="form-section">
              <h3>Template Information</h3>

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

              <div className="form-row">
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

                <div className="form-group">
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
            </div>

            <div className="form-section">
              <h3>Email Content</h3>

              <div className="form-group">
                <label>Subject Line *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Re: Your question about {{productName}}"
                  required
                />
                <small>Use {'{{variableName}}'} for dynamic content</small>
              </div>

              <div className="form-group">
                <label>Email Body *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Dear {{customerName}},&#10;&#10;Thank you for contacting us..."
                  rows={12}
                  required
                />
                <small>Use {'{{variableName}}'} for dynamic content</small>
              </div>

              <button
                type="button"
                onClick={autoExtractVariables}
                className="btn-extract"
              >
                = Auto-detect Variables
              </button>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Variables</h3>
                <button
                  type="button"
                  onClick={() => setShowVariableForm(!showVariableForm)}
                  className="btn-add-variable"
                >
                  + Add Variable
                </button>
              </div>

              {showVariableForm && (
                <div className="variable-form">
                  <input
                    type="text"
                    value={variableInput.name}
                    onChange={(e) => setVariableInput({ ...variableInput, name: e.target.value })}
                    placeholder="Variable name (e.g., customerName)"
                  />
                  <input
                    type="text"
                    value={variableInput.description}
                    onChange={(e) => setVariableInput({ ...variableInput, description: e.target.value })}
                    placeholder="Description (optional)"
                  />
                  <input
                    type="text"
                    value={variableInput.defaultValue}
                    onChange={(e) => setVariableInput({ ...variableInput, defaultValue: e.target.value })}
                    placeholder="Default value (optional)"
                  />
                  <div className="variable-form-actions">
                    <button type="button" onClick={() => setShowVariableForm(false)} className="btn-cancel-var">
                      Cancel
                    </button>
                    <button type="button" onClick={handleAddVariable} className="btn-save-var">
                      Add
                    </button>
                  </div>
                </div>
              )}

              {formData.variables.length === 0 ? (
                <p className="no-variables">No variables defined yet</p>
              ) : (
                <div className="variables-list">
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="variable-item">
                      <div className="variable-info">
                        <span className="variable-name">{`{{${variable.name}}}`}</span>
                        {variable.description && (
                          <span className="variable-desc">{variable.description}</span>
                        )}
                        {variable.defaultValue && (
                          <span className="variable-default">Default: {variable.defaultValue}</span>
                        )}
                      </div>
                      <div className="variable-actions">
                        <button
                          type="button"
                          onClick={() => handleInsertVariable(variable.name)}
                          className="btn-insert"
                          title="Insert into template"
                        >
                          
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(index)}
                          className="btn-remove"
                          title="Remove variable"
                        >
                          �
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Preview */}
          <div className="editor-sidebar">
            <div className="preview-section">
              <h3>Preview</h3>

              <div className="test-variables">
                <p className="test-label">Test with sample data:</p>
                {extractVariablesFromText(formData.subject + ' ' + formData.body).map(varName => (
                  <div key={varName} className="test-var-input">
                    <label>{`{{${varName}}}`}:</label>
                    <input
                      type="text"
                      value={testVariables[varName] || ''}
                      onChange={(e) => setTestVariables({ ...testVariables, [varName]: e.target.value })}
                      placeholder={`Enter ${varName}`}
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={handlePreview} className="btn-preview">
                =A Preview
              </button>

              {preview && (
                <div className="preview-result">
                  <div className="preview-subject">
                    <strong>Subject:</strong>
                    <p>{preview.subject}</p>
                  </div>
                  <div className="preview-body">
                    <strong>Body:</strong>
                    <p>{preview.body}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateEditor;
