import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiCopy, FiX, FiEye, FiPackage } from 'react-icons/fi';
import './LetterTemplates.css';

/* ──────────────────────────────────────────────
   5 BUILT-IN TEMPLATES (editable before saving)
────────────────────────────────────────────── */
const BUILTIN_TEMPLATES = [
  {
    id: 'builtin-offer',
    name: 'Offer Letter',
    category: 'offer',
    subject: 'Offer of Employment – {{jobTitle}} at {{companyName}}',
    variables: ['employeeName','jobTitle','companyName','department','date','address'],
    content: `Dear {{employeeName}},

We are pleased to offer you the position of {{jobTitle}} in the {{department}} department at {{companyName}}, effective {{date}}.

This offer is contingent upon the successful completion of your background verification and submission of required documents on or before your joining date.

COMPENSATION & BENEFITS
- Gross Monthly Salary: [Amount]
- Annual CTC: [Amount]
- Probation Period: 3 months

TERMS & CONDITIONS
1. You will be required to maintain the confidentiality of all company information.
2. During the probation period, either party may terminate this agreement with 7 days' written notice.
3. Post-probation, 30 days' notice is required from either party.

Please confirm your acceptance of this offer by signing and returning a copy of this letter by {{date}}.

We look forward to welcoming you to the team.

Warm regards,
HR Department
{{companyName}}
{{address}}`
  },
  {
    id: 'builtin-employment',
    name: 'Employment Confirmation',
    category: 'employment',
    subject: 'Confirmation of Employment – {{employeeName}}',
    variables: ['employeeName','jobTitle','companyName','department','date'],
    content: `TO WHOM IT MAY CONCERN

This is to certify that {{employeeName}} has been employed with {{companyName}} as a {{jobTitle}} in the {{department}} department since [joining date].

This letter is being issued upon the request of the employee for the purpose of [purpose: visa / bank / personal].

During their tenure, {{employeeName}} has demonstrated professionalism and dedication to their role.

We confirm that {{employeeName}} is currently on our payroll and their employment is in good standing.

Issued on: {{date}}

Authorized Signatory
{{companyName}}`
  },
  {
    id: 'builtin-warning',
    name: 'Warning Letter',
    category: 'warning',
    subject: 'Warning Letter – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date'],
    content: `CONFIDENTIAL

Date: {{date}}

To,
{{employeeName}}
{{jobTitle}}, {{department}}

Subject: Warning Letter for [Reason for Warning]

Dear {{employeeName}},

This letter serves as an official warning regarding [describe the issue/incident in detail: e.g., repeated tardiness / insubordination / poor performance].

Incident Details:
- Date of Incident: [date]
- Description: [detailed description]

This behavior is in violation of {{companyName}}'s [policy name, e.g., Code of Conduct / Attendance Policy].

You are hereby formally warned that a recurrence of such behavior may result in further disciplinary action, up to and including termination of employment.

You are required to meet with HR on [meeting date/time] to discuss this matter further.

Please acknowledge receipt of this letter by signing below.

Regards,
HR Department
{{companyName}}

__________________________
Employee Signature & Date`
  },
  {
    id: 'builtin-promotion',
    name: 'Promotion Letter',
    category: 'promotion',
    subject: 'Congratulations on Your Promotion – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date'],
    content: `Date: {{date}}

Dear {{employeeName}},

We are delighted to inform you that, in recognition of your outstanding performance and dedication, you have been promoted to the position of [New Job Title] in the {{department}} department, effective [effective date].

REVISED COMPENSATION
- New Designation: [New Job Title]
- New Gross Monthly Salary: [Amount]
- New Annual CTC: [Amount]

Your revised responsibilities will include:
1. [Responsibility 1]
2. [Responsibility 2]
3. [Responsibility 3]

This promotion reflects our confidence in your skills and your valuable contribution to {{companyName}}. We look forward to your continued growth and success.

Please sign and return a copy of this letter as acknowledgement.

Congratulations once again!

Warm Regards,
HR Department
{{companyName}}`
  },
  {
    id: 'builtin-experience',
    name: 'Experience / Relieving Letter',
    category: 'experience',
    subject: 'Experience Certificate – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date'],
    content: `TO WHOM IT MAY CONCERN

Date: {{date}}

This is to certify that {{employeeName}} was employed with {{companyName}} as a {{jobTitle}} in the {{department}} department from [joining date] to [last working date].

During their tenure of [X years/months], {{employeeName}} demonstrated excellent professional skills, integrity, and a strong work ethic. They have successfully discharged their duties and responsibilities.

We thank {{employeeName}} for their valuable contribution to our organization and wish them great success in all their future endeavors.

Issued on: {{date}}

This letter is issued in good faith at the request of the employee.

Sincerely,
HR Department
{{companyName}}`
  }
];

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
    { value: 'offer',       label: 'Offer Letter' },
    { value: 'employment',  label: 'Employment' },
    { value: 'termination', label: 'Termination' },
    { value: 'warning',     label: 'Warning' },
    { value: 'experience',  label: 'Experience' },
    { value: 'promotion',   label: 'Promotion' },
    { value: 'custom',      label: 'Custom' }
  ];

  const defaultVariables = [
    'employeeName','employeeEmail','department','jobTitle',
    'companyName','date','year','address','city','country'
  ];

  const getCategoryClass = (cat) => `lt-cat-${cat || 'custom'}`;

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

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

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

  const openBuiltinModal = (tpl) => {
    setForm({
      name: tpl.name,
      category: tpl.category,
      subject: tpl.subject,
      content: tpl.content,
      variables: tpl.variables || []
    });
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
    setForm(prev => ({ ...prev, content: prev.content + `{{${varName}}}` }));
  };

  // Filter built-in templates by category
  const filteredBuiltins = categoryFilter
    ? BUILTIN_TEMPLATES.filter(t => t.category === categoryFilter)
    : BUILTIN_TEMPLATES;

  if (loading) {
    return (
      <div className="lt">
        <div className="lt-loading">
          <div className="lt-loading-spinner"></div>
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lt">

      {/* ── Header ── */}
      <div className="lt-header">
        <div className="lt-header-left">
          <h2>Letter Templates</h2>
          <p className="lt-subtitle">Use built-in templates or create your own HR letters with variables</p>
        </div>
        <div className="lt-header-right">
          <button className="lt-add-btn" onClick={openAddModal}><FiPlus /> New Template</button>
        </div>
      </div>

      {/* ── Category Filter ── */}
      <div className="lt-filters">
        <span className="lt-filter-label">Filter:</span>
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

      {/* ── Built-in Templates ── */}
      {filteredBuiltins.length > 0 && (
        <div className="lt-section">
          <div className="lt-section-header">
            <FiPackage size={14} style={{ color: '#9ca3af' }} />
            <span className="lt-section-title">Built-in Templates</span>
            <span className="lt-section-badge">{filteredBuiltins.length}</span>
            <span className="lt-section-hint">Click "Use Template" to edit content and save</span>
          </div>
          <div className="lt-grid">
            {filteredBuiltins.map(tpl => (
              <div key={tpl.id} className="lt-card builtin">
                <div className="lt-card-top">
                  <span className={`lt-card-category ${getCategoryClass(tpl.category)}`}>{tpl.category}</span>
                </div>
                <div className="lt-card-body">
                  <h4 className="lt-card-name"><FiFileText />{tpl.name}</h4>
                  {tpl.subject && <p className="lt-card-subject">{tpl.subject}</p>}
                  <p className="lt-card-preview">{tpl.content?.substring(0, 130)}...</p>
                </div>
                <div className="lt-card-footer">
                  <span className="lt-card-vars">{tpl.variables?.length || 0} variables</span>
                  <span className="lt-card-date">Built-in</span>
                </div>
                <button className="lt-use-btn" onClick={() => openBuiltinModal(tpl)}>
                  Use Template →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── My Templates ── */}
      <div className="lt-section">
        <div className="lt-section-header">
          <FiFileText size={14} style={{ color: '#9ca3af' }} />
          <span className="lt-section-title">My Templates</span>
          <span className="lt-section-badge">{templates.length}</span>
        </div>
        <div className="lt-grid">
          {templates.length > 0 ? templates.map(t => (
            <div key={t._id} className="lt-card">
              <div className="lt-card-top">
                <span className={`lt-card-category ${getCategoryClass(t.category)}`}>{t.category}</span>
                <div className="lt-card-actions">
                  <button onClick={() => openGenerateModal(t)} title="Generate Letter"><FiEye /></button>
                  <button onClick={() => openEditModal(t)} title="Edit"><FiEdit2 /></button>
                  <button onClick={() => handleDelete(t._id)} className="delete" title="Delete"><FiTrash2 /></button>
                </div>
              </div>
              <div className="lt-card-body">
                <h4 className="lt-card-name"><FiFileText />{t.name}</h4>
                {t.subject && <p className="lt-card-subject">{t.subject}</p>}
                <p className="lt-card-preview">{t.content?.substring(0, 130)}...</p>
              </div>
              <div className="lt-card-footer">
                <span className="lt-card-vars">{t.variables?.length || 0} variables</span>
                <span className="lt-card-date">{new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )) : (
            <div className="lt-empty">
              <FiFileText size={24} />
              <p>No saved templates yet — use a built-in template above or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="lt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lt-modal lt-modal-large" onClick={e => e.stopPropagation()}>
            <div className="lt-modal-header">
              <h3>{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <button className="lt-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="lt-modal-body">
              <div className="lt-form-row">
                <div className="lt-form-group">
                  <label>Template Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Offer Letter – Engineering"
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
                <label>Subject Line</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Offer of Employment – {{jobTitle}}"
                />
              </div>
              <div className="lt-form-group">
                <label>Content *</label>
                <div className="lt-var-pills">
                  <span className="lt-var-label">Click to insert:</span>
                  {defaultVariables.map(v => (
                    <button key={v} className="lt-var-pill" onClick={() => insertVariable(v)}>
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.content}
                  onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={`Dear {{employeeName}},\n\nWe are pleased to offer you the position of {{jobTitle}} at {{companyName}}...`}
                />
              </div>
            </div>
            <div className="lt-modal-footer">
              <button className="lt-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="lt-save-btn"
                onClick={handleSave}
                disabled={saving || !form.name || !form.content}
              >
                {saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Save Template')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Modal ── */}
      {showGenerate && (
        <div className="lt-modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="lt-modal lt-modal-large" onClick={e => e.stopPropagation()}>
            <div className="lt-modal-header">
              <h3>Generate Letter – {selectedTemplate?.name}</h3>
              <button className="lt-modal-close" onClick={() => setShowGenerate(false)}><FiX /></button>
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
                    <p className="lt-form-hint">Employee data will auto-fill template variables (name, title, department, etc.)</p>
                  </div>
                  <button
                    className="lt-generate-btn"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
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
                  <div className="lt-generated-content">{generatedLetter.content}</div>
                  <div style={{ marginTop: '14px' }}>
                    <button className="lt-cancel-btn" onClick={() => setGeneratedLetter(null)}>Generate Another</button>
                  </div>
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
