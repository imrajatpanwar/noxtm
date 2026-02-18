import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiCopy, FiDownload, FiX, FiSearch, FiEye } from 'react-icons/fi';
import './LetterTemplates.css';

function LetterTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    name: '', category: 'custom', subject: '', content: '', variables: []
  });

  const [generateForm, setGenerateForm] = useState({
    employeeId: '', customValues: {}
  });

  const categories = [
    { value: 'offer', label: 'Offer Letter' },
    { value: 'employment', label: 'Employment' },
    { value: 'termination', label: 'Termination' },
    { value: 'warning', label: 'Warning' },
    { value: 'experience', label: 'Experience' },
    { value: 'promotion', label: 'Promotion' },
    { value: 'custom', label: 'Custom' }
  ];

  const defaultVariables = [
    'employeeName', 'employeeEmail', 'department', 'jobTitle',
    'companyName', 'date', 'year', 'address', 'city', 'country'
  ];

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      const response = await api.get('/letter-templates', { params });
      if (response.data.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/hr/employees');
        if (response.data.success) setEmployees(response.data.employees || []);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    setForm({ name: '', category: 'custom', subject: '', content: '', variables: [] });
    setEditingTemplate(null);
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setForm({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables || []
    });
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.content) return;
    try {
      setSaving(true);
      if (editingTemplate) {
        await api.put(`/letter-templates/${editingTemplate._id}`, form);
      } else {
        await api.post('/letter-templates', form);
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/letter-templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const openGenerateModal = (template) => {
    setSelectedTemplate(template);
    setGenerateForm({ employeeId: '', customValues: {} });
    setGeneratedLetter(null);
    setShowGenerate(true);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    try {
      setGenerating(true);
      const response = await api.post(`/letter-templates/${selectedTemplate._id}/generate`, {
        employeeId: generateForm.employeeId,
        customValues: generateForm.customValues
      });
      if (response.data.success) {
        setGeneratedLetter(response.data.generated);
      }
    } catch (err) {
      console.error('Error generating letter:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyGeneratedLetter = () => {
    if (generatedLetter?.content) {
      navigator.clipboard.writeText(generatedLetter.content);
    }
  };

  const insertVariable = (varName) => {
    setForm(prev => ({
      ...prev,
      content: prev.content + `{{${varName}}}`
    }));
  };

  const getCategoryColor = (category) => {
    const colors = {
      offer: { bg: 'rgba(100,200,100,0.15)', color: '#6c6' },
      employment: { bg: 'rgba(100,100,255,0.15)', color: '#6b6bff' },
      termination: { bg: 'rgba(255,100,100,0.15)', color: '#f66' },
      warning: { bg: 'rgba(255,180,60,0.15)', color: '#fb3' },
      experience: { bg: 'rgba(100,200,255,0.15)', color: '#6cf' },
      promotion: { bg: 'rgba(200,100,255,0.15)', color: '#c6f' },
      custom: { bg: 'rgba(255,255,255,0.08)', color: '#999' }
    };
    return colors[category] || colors.custom;
  };

  if (loading) {
    return (
      <div className="lt">
        <div className="lt-loading"><div className="lt-loading-spinner"></div><p>Loading templates...</p></div>
      </div>
    );
  }

  return (
    <div className="lt">
      <div className="lt-header">
        <div>
          <h2>Letter Templates</h2>
          <p className="lt-subtitle">Create and manage HR letter templates with variables</p>
        </div>
        <button className="lt-add-btn" onClick={openAddModal}><FiPlus /> New Template</button>
      </div>

      {/* Category Filter */}
      <div className="lt-filters">
        <div className="lt-category-pills">
          <button className={!categoryFilter ? 'active' : ''} onClick={() => setCategoryFilter('')}>All</button>
          {categories.map(cat => (
            <button
              key={cat.value}
              className={categoryFilter === cat.value ? 'active' : ''}
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="lt-grid">
        {templates.length > 0 ? templates.map(t => (
          <div key={t._id} className="lt-card">
            <div className="lt-card-header">
              <span
                className="lt-card-category"
                style={{ background: getCategoryColor(t.category).bg, color: getCategoryColor(t.category).color }}
              >
                {t.category}
              </span>
              <div className="lt-card-actions">
                <button onClick={() => openGenerateModal(t)} title="Generate Letter"><FiEye /></button>
                <button onClick={() => openEditModal(t)} title="Edit"><FiEdit2 /></button>
                <button onClick={() => handleDelete(t._id)} className="delete" title="Delete"><FiTrash2 /></button>
              </div>
            </div>
            <div className="lt-card-body">
              <h4><FiFileText /> {t.name}</h4>
              {t.subject && <p className="lt-card-subject">{t.subject}</p>}
              <p className="lt-card-preview">{t.content?.substring(0, 120)}...</p>
            </div>
            <div className="lt-card-footer">
              <span className="lt-card-vars">{t.variables?.length || 0} variables</span>
              <span className="lt-card-date">
                {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )) : (
          <div className="lt-empty">
            <FiFileText size={28} />
            <p>No templates yet. Create your first template!</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="lt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lt-modal lt-modal-large" onClick={e => e.stopPropagation()}>
            <div className="lt-modal-header">
              <h3>{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="lt-modal-body">
              <div className="lt-form-row">
                <div className="lt-form-group">
                  <label>Template Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Offer Letter - Engineering"
                  />
                </div>
                <div className="lt-form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="lt-form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Offer of Employment - {{jobTitle}}"
                />
              </div>
              <div className="lt-form-group">
                <label>Content *</label>
                <div className="lt-var-pills">
                  <span className="lt-var-label">Insert variable:</span>
                  {defaultVariables.map(v => (
                    <button key={v} className="lt-var-pill" onClick={() => insertVariable(v)}>
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.content}
                  onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Dear {{employeeName}},

We are pleased to offer you the position of {{jobTitle}} at {{companyName}}..."
                  rows={12}
                />
              </div>
            </div>
            <div className="lt-modal-footer">
              <button className="lt-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="lt-save-btn" onClick={handleSave} disabled={saving || !form.name || !form.content}>
                {saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create Template')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div className="lt-modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="lt-modal lt-modal-large" onClick={e => e.stopPropagation()}>
            <div className="lt-modal-header">
              <h3>Generate Letter - {selectedTemplate?.name}</h3>
              <button onClick={() => setShowGenerate(false)}><FiX /></button>
            </div>
            <div className="lt-modal-body">
              {!generatedLetter ? (
                <>
                  <div className="lt-form-group">
                    <label>Select Employee</label>
                    <select
                      value={generateForm.employeeId}
                      onChange={e => setGenerateForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>{e.fullName} ({e.email})</option>
                      ))}
                    </select>
                    <p className="lt-form-hint">Employee data will auto-fill template variables</p>
                  </div>
                  <button className="lt-save-btn" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Letter'}
                  </button>
                </>
              ) : (
                <div className="lt-generated">
                  <div className="lt-generated-header">
                    <h4>Generated Letter</h4>
                    <div className="lt-generated-actions">
                      <button onClick={copyGeneratedLetter}><FiCopy /> Copy</button>
                    </div>
                  </div>
                  {generatedLetter.subject && (
                    <div className="lt-generated-subject">
                      <strong>Subject:</strong> {generatedLetter.subject}
                    </div>
                  )}
                  <div className="lt-generated-content">
                    {generatedLetter.content}
                  </div>
                  <button className="lt-cancel-btn" onClick={() => setGeneratedLetter(null)} style={{ marginTop: '16px' }}>
                    Generate Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LetterTemplates;
