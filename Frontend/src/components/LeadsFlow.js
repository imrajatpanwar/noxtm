import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiPlus, FiSearch, FiFilter, FiMoreHorizontal, FiEdit2, FiTrash2, FiCopy,
  FiUser, FiUpload, FiGlobe, FiLink, FiArrowRight, FiArrowLeft, FiCheck,
  FiX, FiChevronDown, FiUsers, FiTarget, FiTrendingUp, FiBarChart2,
  FiDownload, FiAlertCircle, FiFileText, FiExternalLink, FiPlay, FiPause,
  FiArchive, FiEye, FiMail, FiPhone, FiMapPin, FiBriefcase, FiHash,
  FiCalendar, FiClock, FiStar, FiCheckCircle, FiInfo
} from 'react-icons/fi';
import api from '../config/api';
import { toast } from 'sonner';
import { useModules } from '../contexts/ModuleContext';
import './LeadsFlow.css';

const LEAD_TYPES = [
  'Founders', 'HR Managers', 'Investors', 'Sales Managers', 'Marketing Heads',
  'CTOs/Tech Leads', 'Business Owners', 'Decision Makers', 'C-Suite Executives'
];

const METHOD_INFO = {
  manual: { icon: FiUser, label: 'Manual Entry', desc: 'Add leads one by one with complete details', color: '#3b82f6' },
  csv: { icon: FiUpload, label: 'CSV/Excel Upload', desc: 'Bulk upload leads from spreadsheet files', color: '#8b5cf6' },
  extension: { icon: FiGlobe, label: 'Chrome Extension', desc: 'Scrape leads from LinkedIn, websites, directories', color: '#f59e0b' },
  'third-party': { icon: FiLink, label: 'Third-Party Sync', desc: 'Connect and sync from CRM, sales tools, databases', color: '#10b981' }
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#a3a3a3' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' }
];

const STATUS_COLORS = {
  draft: { bg: '#f5f5f5', color: '#737373' },
  active: { bg: '#dcfce7', color: '#15803d' },
  paused: { bg: '#fef3c7', color: '#b45309' },
  completed: { bg: '#dbeafe', color: '#1d4ed8' },
  archived: { bg: '#f3e8ff', color: '#7c3aed' }
};

function LeadsFlow() {
  const { isModuleInstalled } = useModules();
  const exhibitOSActive = isModuleInstalled('ExhibitOS');

  // Main state
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  // Trade shows state
  const [tradeShows, setTradeShows] = useState([]);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    method: '', name: '', leadType: '', customLeadType: '',
    tags: [], sourceNotes: '', expectedLeadCount: '',
    priority: 'medium', assignees: [], assignmentRule: 'manual',
    tradeShow: ''
  });
  const [tagInput, setTagInput] = useState('');

  // Post-creation state
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [showCampaignDetail, setShowCampaignDetail] = useState(false);
  const [manualLeadForm, setManualLeadForm] = useState({
    clientName: '', companyName: '', email: '', phone: '',
    designation: '', location: '', requirements: '', linkedIn: ''
  });
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvMapping, setCsvMapping] = useState({});
  const [importProgress, setImportProgress] = useState(null);
  const [campaignLeads, setCampaignLeads] = useState([]);

  // Team members
  const [teamMembers, setTeamMembers] = useState([]);

  // Action menu
  const [activeMenu, setActiveMenu] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterMethod !== 'all') params.method = filterMethod;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/lead-campaigns', { params });
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterMethod, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/lead-campaigns/stats/summary');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get('/lead-campaigns/team/members');
      setTeamMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching team:', err);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); fetchStats(); }, [fetchCampaigns, fetchStats]);

  // Fetch trade shows if ExhibitOS is active
  const fetchTradeShows = useCallback(async () => {
    if (!exhibitOSActive) return;
    try {
      const res = await api.get('/trade-shows');
      setTradeShows(res.data?.tradeShows || []);
    } catch (err) {
      console.error('Error fetching trade shows:', err);
    }
  }, [exhibitOSActive]);

  useEffect(() => { if (exhibitOSActive) fetchTradeShows(); }, [exhibitOSActive, fetchTradeShows]);

  // Open wizard
  const openWizard = () => {
    setWizardStep(1);
    setWizardData({
      method: '', name: '', leadType: '', customLeadType: '',
      tags: [], sourceNotes: '', expectedLeadCount: '',
      priority: 'medium', assignees: [], assignmentRule: 'manual',
      tradeShow: ''
    });
    setTagInput('');
    setIsEditing(false);
    setEditingCampaignId(null);
    setShowWizard(true);
    fetchTeamMembers();
  };

  // Wizard navigation
  const canProceed = () => {
    if (wizardStep === 1) return !!wizardData.method;
    if (wizardStep === 2) return !!wizardData.name && !!(wizardData.leadType || wizardData.customLeadType);
    if (wizardStep === 3) {
      if (wizardData.assignees.length > 0 && wizardData.assignmentRule === 'manual') {
        return getTotalPercentage() === 100;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => { if (canProceed() && wizardStep < 4) setWizardStep(wizardStep + 1); };
  const prevStep = () => { if (wizardStep > 1) setWizardStep(wizardStep - 1); };

  // Create or Update campaign
  const createCampaign = async (asDraft = false) => {
    try {
      const payload = {
        name: wizardData.name,
        method: wizardData.method,
        leadType: wizardData.leadType === 'Custom' ? wizardData.customLeadType : wizardData.leadType,
        tags: wizardData.tags,
        sourceNotes: wizardData.sourceNotes,
        expectedLeadCount: parseInt(wizardData.expectedLeadCount) || 0,
        priority: wizardData.priority,
        assignees: wizardData.assignees,
        assignmentRule: wizardData.assignmentRule,
        status: asDraft ? 'draft' : 'active',
        tradeShow: wizardData.tradeShow || null
      };

      let res;
      if (isEditing && editingCampaignId) {
        res = await api.put(`/lead-campaigns/${editingCampaignId}`, payload);
        toast.success(asDraft ? 'Campaign updated as draft' : 'Campaign updated successfully');
      } else {
        res = await api.post('/lead-campaigns', payload);
        toast.success(asDraft ? 'Campaign saved as draft' : 'Campaign created successfully');
      }

      setShowWizard(false);
      setIsEditing(false);
      setEditingCampaignId(null);
      fetchCampaigns();
      fetchStats();

      if (!asDraft) {
        setActiveCampaign(res.data);
        setShowCampaignDetail(true);
        setCampaignLeads([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEditing ? 'Failed to update campaign' : 'Failed to create campaign'));
    }
  };

  // Delete campaign
  const deleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/lead-campaigns/${id}`);
      toast.success('Campaign deleted');
      fetchCampaigns();
      fetchStats();
      setActiveMenu(null);
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  // Duplicate campaign
  const duplicateCampaign = async (id) => {
    try {
      await api.post(`/lead-campaigns/${id}/duplicate`);
      toast.success('Campaign duplicated');
      fetchCampaigns();
      setActiveMenu(null);
    } catch (err) {
      toast.error('Failed to duplicate campaign');
    }
  };

  // Update campaign status
  const updateCampaignStatus = async (id, status) => {
    try {
      await api.patch(`/lead-campaigns/${id}/status`, { status });
      toast.success(`Campaign ${status}`);
      fetchCampaigns();
      fetchStats();
      setActiveMenu(null);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Open campaign detail
  const openCampaignDetail = async (campaign) => {
    setActiveCampaign(campaign);
    setShowCampaignDetail(true);
    try {
      const res = await api.get(`/lead-campaigns/${campaign._id}/leads`);
      setCampaignLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCampaignLeads([]);
    }
  };

  // Edit campaign - open wizard pre-filled with campaign data
  const editCampaign = (campaign) => {
    const isCustomType = !LEAD_TYPES.includes(campaign.leadType);
    setWizardStep(1);
    setWizardData({
      method: campaign.method || '',
      name: campaign.name || '',
      leadType: isCustomType ? 'Custom' : (campaign.leadType || ''),
      customLeadType: isCustomType ? campaign.leadType : '',
      tags: Array.isArray(campaign.tags) ? campaign.tags : [],
      sourceNotes: campaign.sourceNotes || '',
      expectedLeadCount: campaign.expectedLeadCount?.toString() || '',
      priority: campaign.priority || 'medium',
      assignees: Array.isArray(campaign.assignees) ? campaign.assignees.map(a => ({
        user: a.user?._id || a.user,
        role: a.role || 'viewer',
        percentage: a.percentage || 0
      })) : [],
      assignmentRule: campaign.assignmentRule || 'manual',
      tradeShow: campaign.tradeShow?._id || campaign.tradeShow || ''
    });
    setTagInput('');
    setIsEditing(true);
    setEditingCampaignId(campaign._id);
    setShowWizard(true);
    setShowCampaignDetail(false);
    fetchTeamMembers();
  };

  // Publish draft campaign (make it live/active)
  const publishCampaign = async (campaign) => {
    try {
      await api.patch(`/lead-campaigns/${campaign._id}/status`, { status: 'active' });
      toast.success('Campaign published and is now live!');
      // Refresh and open updated campaign
      const res = await api.get(`/lead-campaigns/${campaign._id}`);
      setActiveCampaign(res.data);
      fetchCampaigns();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish campaign');
    }
  };

  // Add manual lead
  const addManualLead = async () => {
    if (!manualLeadForm.clientName || !manualLeadForm.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      const payload = {
        leads: [{
          ...manualLeadForm,
          social: manualLeadForm.linkedIn ? { linkedin: manualLeadForm.linkedIn } : {}
        }]
      };
      const res = await api.post(`/lead-campaigns/${activeCampaign._id}/leads`, payload);
      toast.success(`Lead added (${res.data.summary.created} new, ${res.data.summary.errors} errors)`);
      setManualLeadForm({ clientName: '', companyName: '', email: '', phone: '', designation: '', location: '', requirements: '', linkedIn: '' });
      setCampaignLeads(prev => [...prev, ...res.data.campaign.leads.slice(-res.data.summary.created)]);
      setActiveCampaign(res.data.campaign);
      fetchStats();
    } catch (err) {
      toast.error('Failed to add lead');
    }
  };

  // CSV handling
  const handleCsvSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV file is empty'); return; }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 11).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });

      setCsvPreview({ headers, rows, totalRows: lines.length - 1 });

      // Auto-map common headers
      const autoMap = {};
      const mapPatterns = {
        clientName: /^(name|full.?name|client.?name|contact.?name|person)/i,
        companyName: /^(company|company.?name|organization|org)/i,
        email: /^(email|e.?mail|email.?address)/i,
        phone: /^(phone|mobile|telephone|cell)/i,
        designation: /^(title|designation|position|job.?title|role)/i,
        location: /^(location|city|address|country|region)/i,
        requirements: /^(requirements|notes|comments|description)/i
      };
      headers.forEach(h => {
        for (const [field, pattern] of Object.entries(mapPatterns)) {
          if (pattern.test(h) && !autoMap[field]) { autoMap[field] = h; break; }
        }
      });
      setCsvMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const importCsvLeads = async () => {
    if (!csvPreview || !activeCampaign) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      const allRows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });

      setImportProgress({ total: allRows.length, processed: 0, created: 0, errors: 0 });

      // Import in batches of 50
      const batchSize = 50;
      let totalCreated = 0, totalErrors = 0;

      for (let i = 0; i < allRows.length; i += batchSize) {
        const batch = allRows.slice(i, i + batchSize).map(row => ({
          clientName: row[csvMapping.clientName] || '',
          companyName: row[csvMapping.companyName] || '',
          email: row[csvMapping.email] || '',
          phone: row[csvMapping.phone] || '',
          designation: row[csvMapping.designation] || '',
          location: row[csvMapping.location] || '',
          requirements: row[csvMapping.requirements] || ''
        })).filter(l => l.email || l.clientName);

        try {
          const res = await api.post(`/lead-campaigns/${activeCampaign._id}/leads`, { leads: batch });
          totalCreated += res.data.summary.created;
          totalErrors += res.data.summary.errors;
          setActiveCampaign(res.data.campaign);
        } catch (err) {
          totalErrors += batch.length;
        }

        setImportProgress({ total: allRows.length, processed: Math.min(i + batchSize, allRows.length), created: totalCreated, errors: totalErrors });
      }

      toast.success(`Import complete: ${totalCreated} leads added, ${totalErrors} errors`);
      try {
        const res = await api.get(`/lead-campaigns/${activeCampaign._id}/leads`);
        setCampaignLeads(Array.isArray(res.data) ? res.data : []);
      } catch (e) { /* ignore */ }
      fetchStats();
    };
    reader.readAsText(csvFile);
  };

  // Percentage distribution helpers
  const distributePercentages = (assignees) => {
    if (assignees.length === 0) return assignees;
    const base = Math.floor(100 / assignees.length);
    const remainder = 100 - (base * assignees.length);
    return assignees.map((a, i) => ({
      ...a,
      percentage: base + (i < remainder ? 1 : 0)
    }));
  };

  const updateAssigneePercentage = (userId, newPercentage) => {
    setWizardData(prev => ({
      ...prev,
      assignees: prev.assignees.map(a =>
        (a.user || a) === userId ? { ...a, percentage: Math.max(0, Math.min(100, parseInt(newPercentage) || 0)) } : a
      )
    }));
  };

  const getTotalPercentage = () => {
    return wizardData.assignees.reduce((sum, a) => sum + (a.percentage || 0), 0);
  };

  // Tag management
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !wizardData.tags.includes(trimmed)) {
      setWizardData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setWizardData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Toggle assignee
  const toggleAssignee = (userId) => {
    setWizardData(prev => {
      const existing = prev.assignees.find(a => (a.user || a) === userId);
      let newAssignees;
      if (existing) {
        newAssignees = prev.assignees.filter(a => (a.user || a) !== userId);
      } else {
        newAssignees = [...prev.assignees, { user: userId, role: 'member', percentage: 0 }];
      }
      return { ...prev, assignees: distributePercentages(newAssignees) };
    });
  };

  // ========================= RENDER =========================

  // Wizard Step 1: Choose Method
  const renderStep1 = () => (
    <div className="lf-wizard-step">
      <h3 className="lf-step-title">Choose Lead Acquisition Method</h3>
      <p className="lf-step-desc">Select how you want to add leads to this campaign</p>
      <div className="lf-method-grid">
        {Object.entries(METHOD_INFO).map(([key, info]) => {
          const Icon = info.icon;
          return (
            <div
              key={key}
              className={`lf-method-card ${wizardData.method === key ? 'lf-method-selected' : ''}`}
              onClick={() => setWizardData(prev => ({ ...prev, method: key }))}
            >
              <div className="lf-method-icon" style={{ background: `${info.color}15`, color: info.color }}>
                <Icon size={24} />
              </div>
              <div className="lf-method-info">
                <h4>{info.label}</h4>
                <p>{info.desc}</p>
              </div>
              {wizardData.method === key && (
                <div className="lf-method-check"><FiCheck size={16} /></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Wizard Step 2: Campaign Config
  const renderStep2 = () => (
    <div className="lf-wizard-step">
      <h3 className="lf-step-title">Campaign Configuration</h3>
      <p className="lf-step-desc">Set up your campaign details and categorization</p>
      <div className="lf-config-form">
        <div className="lf-form-group">
          <label>Campaign Name <span className="lf-req">*</span></label>
          <input
            type="text" placeholder="e.g., Founders - LinkedIn - Jan 2024"
            value={wizardData.name}
            onChange={e => setWizardData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="lf-form-row">
          <div className="lf-form-group">
            <label>Lead Type / Category <span className="lf-req">*</span></label>
            <select
              value={wizardData.leadType}
              onChange={e => setWizardData(prev => ({ ...prev, leadType: e.target.value }))}
            >
              <option value="">Select lead type...</option>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div className="lf-form-group">
            <label>Priority</label>
            <select
              value={wizardData.priority}
              onChange={e => setWizardData(prev => ({ ...prev, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
        {wizardData.leadType === 'Custom' && (
          <div className="lf-form-group">
            <label>Custom Lead Type <span className="lf-req">*</span></label>
            <input
              type="text" placeholder="Enter custom lead type..."
              value={wizardData.customLeadType}
              onChange={e => setWizardData(prev => ({ ...prev, customLeadType: e.target.value }))}
            />
          </div>
        )}
        <div className="lf-form-group">
          <label>Tags</label>
          <div className="lf-tags-input-wrap">
            {wizardData.tags.length > 0 && (
              <div className="lf-tags-list">
                {wizardData.tags.map((tag, i) => (
                  <span key={i} className="lf-tag-chip">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="lf-tag-remove">
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Type and press Enter..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="lf-tag-input"
            />
          </div>
        </div>
        <div className="lf-form-row">
          <div className="lf-form-group">
            <label>Expected Lead Count</label>
            <input
              type="number" placeholder="0"
              value={wizardData.expectedLeadCount}
              onChange={e => setWizardData(prev => ({ ...prev, expectedLeadCount: e.target.value }))}
            />
          </div>
          <div className="lf-form-group">
            <label>Source Notes</label>
            <input
              type="text" placeholder="Where are these leads from?"
              value={wizardData.sourceNotes}
              onChange={e => setWizardData(prev => ({ ...prev, sourceNotes: e.target.value }))}
            />
          </div>
        </div>
        {exhibitOSActive && tradeShows.length > 0 && (
          <div className="lf-form-group">
            <label><FiGlobe size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Link to Trade Show</label>
            <select
              value={wizardData.tradeShow}
              onChange={e => setWizardData(prev => ({ ...prev, tradeShow: e.target.value }))}
            >
              <option value="">No trade show (general campaign)</option>
              {tradeShows.map(ts => (
                <option key={ts._id} value={ts._id}>
                  {ts.shortName} — {ts.fullName} ({new Date(ts.showDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <span className="lf-form-hint" style={{ fontSize: '12px', color: '#737373', marginTop: 4, display: 'block' }}>
              Leads added to this campaign will be linked to the selected trade show
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Wizard Step 3: Assignment
  const renderStep3 = () => (
    <div className="lf-wizard-step">
      <h3 className="lf-step-title">Lead Assignment</h3>
      <p className="lf-step-desc">Assign team members to work on this campaign's leads</p>

      <div className="lf-assignment-section">
        <div className="lf-default-assignee">
          <FiCheckCircle size={16} color="#15803d" />
          <span>You (Campaign Owner) — auto-assigned</span>
        </div>

        <div className="lf-form-group">
          <label>Assignment Rule</label>
          <select
            value={wizardData.assignmentRule}
            onChange={e => setWizardData(prev => ({ ...prev, assignmentRule: e.target.value }))}
          >
            <option value="manual">Manual Selection</option>
            <option value="round-robin">Round-robin Distribution</option>
            <option value="equal">Equal Distribution</option>
            <option value="territory">Based on Territory</option>
            <option value="score">Based on Lead Score</option>
          </select>
        </div>

        <div className="lf-team-list">
          <label>Add Team Members</label>
          {teamMembers.length === 0 ? (
            <p className="lf-no-team">No other team members found</p>
          ) : (
            <div className="lf-members-grid">
              {teamMembers.map(m => {
                const isSelected = wizardData.assignees.some(a => (a.user || a) === m._id);
                return (
                  <div
                    key={m._id}
                    className={`lf-member-card ${isSelected ? 'lf-member-selected' : ''}`}
                    onClick={() => toggleAssignee(m._id)}
                  >
                    <div className="lf-member-avatar">
                      {m.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="lf-member-info">
                      <span className="lf-member-name">{m.name}</span>
                      <span className="lf-member-role">{m.role || 'Member'}</span>
                    </div>
                    {isSelected && <FiCheck size={14} className="lf-member-check" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {wizardData.assignees.length > 0 && wizardData.assignmentRule === 'manual' && (
          <div className="lf-percentage-section">
            <div className="lf-percentage-header">
              <label><FiBarChart2 size={14} /> Lead Distribution (%)</label>
              <button type="button" className="lf-btn-auto-distribute" onClick={() => {
                setWizardData(prev => ({ ...prev, assignees: distributePercentages(prev.assignees) }));
              }}>
                <FiTarget size={12} /> Auto-Distribute
              </button>
            </div>
            <div className="lf-percentage-list">
              {wizardData.assignees.map(a => {
                const member = teamMembers.find(m => m._id === (a.user || a));
                if (!member) return null;
                return (
                  <div key={a.user} className="lf-percentage-row">
                    <div className="lf-percentage-member">
                      <div className="lf-member-avatar-sm">
                        {member.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="lf-percentage-name">{member.name}</span>
                    </div>
                    <div className="lf-percentage-input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={a.percentage || 0}
                        onChange={e => updateAssigneePercentage(a.user, e.target.value)}
                        className="lf-percentage-input"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="lf-percentage-sign">%</span>
                    </div>
                    <div className="lf-percentage-bar">
                      <div className="lf-percentage-bar-fill" style={{ width: `${Math.min(a.percentage || 0, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`lf-percentage-total ${getTotalPercentage() === 100 ? 'lf-pct-valid' : getTotalPercentage() > 100 ? 'lf-pct-over' : 'lf-pct-under'}`}>
              <div className="lf-pct-total-bar">
                <div className="lf-pct-total-fill" style={{ width: `${Math.min(getTotalPercentage(), 100)}%` }} />
              </div>
              <div className="lf-pct-total-info">
                <span className="lf-pct-total-num">{getTotalPercentage()}%</span>
                <span className="lf-pct-total-label">
                  {getTotalPercentage() === 100 ? <><FiCheckCircle size={13} /> Perfectly distributed</> :
                   getTotalPercentage() > 100 ? <><FiAlertCircle size={13} /> {getTotalPercentage() - 100}% over — reduce allocations</> :
                   <><FiAlertCircle size={13} /> {100 - getTotalPercentage()}% remaining to assign</>}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Wizard Step 4: Review
  const renderStep4 = () => {
    const method = METHOD_INFO[wizardData.method];
    const MethodIcon = method?.icon || FiFileText;
    const selectedAssignees = teamMembers.filter(m =>
      wizardData.assignees.some(a => (a.user || a) === m._id)
    );

    return (
      <div className="lf-wizard-step">
        <h3 className="lf-step-title">Review & Confirm</h3>
        <p className="lf-step-desc">Review your campaign details before creating</p>

        <div className="lf-review-card">
          <div className="lf-review-row">
            <span className="lf-review-label">Campaign Name</span>
            <span className="lf-review-value">{wizardData.name}</span>
          </div>
          <div className="lf-review-row">
            <span className="lf-review-label">Acquisition Method</span>
            <span className="lf-review-value lf-review-method">
              <MethodIcon size={16} style={{ color: method?.color }} />
              {method?.label}
            </span>
          </div>
          <div className="lf-review-row">
            <span className="lf-review-label">Lead Type</span>
            <span className="lf-review-value">
              {wizardData.leadType === 'Custom' ? wizardData.customLeadType : wizardData.leadType}
            </span>
          </div>
          <div className="lf-review-row">
            <span className="lf-review-label">Priority</span>
            <span className="lf-review-value" style={{
              color: PRIORITY_OPTIONS.find(p => p.value === wizardData.priority)?.color
            }}>
              {PRIORITY_OPTIONS.find(p => p.value === wizardData.priority)?.label}
            </span>
          </div>
          {wizardData.tags.length > 0 && (
            <div className="lf-review-row">
              <span className="lf-review-label">Tags</span>
              <span className="lf-review-value lf-review-tags">
                {wizardData.tags.map((t, i) =>
                  <span key={i} className="lf-tag">{t}</span>
                )}
              </span>
            </div>
          )}
          {wizardData.tradeShow && (
            <div className="lf-review-row">
              <span className="lf-review-label">Trade Show</span>
              <span className="lf-review-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiGlobe size={14} style={{ color: '#8b5cf6' }} />
                {tradeShows.find(ts => ts._id === wizardData.tradeShow)?.shortName || 'Selected'} — {tradeShows.find(ts => ts._id === wizardData.tradeShow)?.fullName || ''}
              </span>
            </div>
          )}
          {selectedAssignees.length > 0 && (
            <div className="lf-review-row">
              <span className="lf-review-label">Assignees</span>
              <span className="lf-review-value lf-review-assignees">
                {selectedAssignees.map(a => (
                  <span key={a._id} className="lf-assignee-chip">
                    {a.name?.charAt(0)?.toUpperCase()}{' '}{a.name}
                  </span>
                ))}
              </span>
            </div>
          )}
          <div className="lf-review-row">
            <span className="lf-review-label">Assignment Rule</span>
            <span className="lf-review-value" style={{ textTransform: 'capitalize' }}>
              {wizardData.assignmentRule.replace('-', ' ')}
            </span>
          </div>
          {wizardData.assignees.length > 0 && wizardData.assignmentRule === 'manual' && (
            <div className="lf-review-row lf-review-pct-row">
              <span className="lf-review-label">Distribution</span>
              <div className="lf-review-pct-list">
                {wizardData.assignees.map(a => {
                  const member = teamMembers.find(m => m._id === (a.user || a));
                  return member ? (
                    <div key={a.user} className="lf-review-pct-item">
                      <span>{member.name}</span>
                      <span className="lf-review-pct-val">{a.percentage || 0}%</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Campaign Detail View (post-creation)
  const renderCampaignDetail = () => {
    if (!activeCampaign) return null;
    const method = METHOD_INFO[activeCampaign.method];
    const MethodIcon = method?.icon || FiFileText;

    return (
      <div className="lf-detail-view">
        <div className="lf-detail-header">
          <button className="lf-back-btn" onClick={() => { setShowCampaignDetail(false); setActiveCampaign(null); setCsvFile(null); setCsvPreview(null); setImportProgress(null); }}>
            <FiArrowLeft size={18} /> Back to Campaigns
          </button>
          <div className="lf-detail-title-row">
            <div className="lf-detail-title-info">
              <h2>{activeCampaign.name}</h2>
              <div className="lf-detail-meta">
                <span className="lf-status-badge" style={{
                  background: STATUS_COLORS[activeCampaign.status]?.bg,
                  color: STATUS_COLORS[activeCampaign.status]?.color
                }}>
                  {activeCampaign.status}
                </span>
                <span className="lf-detail-method">
                  <MethodIcon size={14} style={{ color: method?.color }} /> {method?.label}
                </span>
                <span className="lf-detail-type">{activeCampaign.leadType}</span>
              </div>
            </div>
            <div className="lf-detail-actions">
              {(activeCampaign.status === 'draft' || activeCampaign.status === 'paused') && (
                <button className="lf-btn-edit" onClick={() => editCampaign(activeCampaign)}>
                  <FiEdit2 size={15} /> Edit Campaign
                </button>
              )}
              {activeCampaign.status === 'draft' && (
                <button className="lf-btn-publish" onClick={() => publishCampaign(activeCampaign)}>
                  <FiPlay size={15} /> Publish Campaign
                </button>
              )}
              {activeCampaign.status === 'active' && (
                <button className="lf-btn-outline" onClick={() => updateCampaignStatus(activeCampaign._id, 'paused')}>
                  <FiPause size={15} /> Pause
                </button>
              )}
              {activeCampaign.status === 'paused' && (
                <button className="lf-btn-publish" onClick={() => updateCampaignStatus(activeCampaign._id, 'active')}>
                  <FiPlay size={15} /> Resume
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="lf-detail-stats">
          <div className="lf-dstat"><span className="lf-dstat-num">{activeCampaign.stats?.total || 0}</span><span className="lf-dstat-label">Total Leads</span></div>
          <div className="lf-dstat"><span className="lf-dstat-num">{activeCampaign.stats?.coldLead || 0}</span><span className="lf-dstat-label">Cold</span></div>
          <div className="lf-dstat"><span className="lf-dstat-num">{activeCampaign.stats?.warmLead || 0}</span><span className="lf-dstat-label">Warm</span></div>
          <div className="lf-dstat"><span className="lf-dstat-num">{activeCampaign.stats?.qualified || 0}</span><span className="lf-dstat-label">Qualified</span></div>
          <div className="lf-dstat"><span className="lf-dstat-num">{activeCampaign.stats?.converted || 0}</span><span className="lf-dstat-label">Converted</span></div>
        </div>

        {/* Method-specific content */}
        {activeCampaign.method === 'manual' && (
          <div className="lf-method-content">
            <h3><FiUser size={18} /> Add Lead Manually</h3>
            <div className="lf-manual-form">
              <div className="lf-form-row">
                <div className="lf-form-group">
                  <label>Full Name <span className="lf-req">*</span></label>
                  <input type="text" placeholder="John Doe" value={manualLeadForm.clientName}
                    onChange={e => setManualLeadForm(p => ({ ...p, clientName: e.target.value }))} />
                </div>
                <div className="lf-form-group">
                  <label>Email <span className="lf-req">*</span></label>
                  <input type="email" placeholder="john@example.com" value={manualLeadForm.email}
                    onChange={e => setManualLeadForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="lf-form-row">
                <div className="lf-form-group">
                  <label>Company</label>
                  <input type="text" placeholder="Company Name" value={manualLeadForm.companyName}
                    onChange={e => setManualLeadForm(p => ({ ...p, companyName: e.target.value }))} />
                </div>
                <div className="lf-form-group">
                  <label>Phone</label>
                  <input type="text" placeholder="+1 234 567 8900" value={manualLeadForm.phone}
                    onChange={e => setManualLeadForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="lf-form-row">
                <div className="lf-form-group">
                  <label>Designation</label>
                  <input type="text" placeholder="CEO, CTO, etc." value={manualLeadForm.designation}
                    onChange={e => setManualLeadForm(p => ({ ...p, designation: e.target.value }))} />
                </div>
                <div className="lf-form-group">
                  <label>Location</label>
                  <input type="text" placeholder="City, Country" value={manualLeadForm.location}
                    onChange={e => setManualLeadForm(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div className="lf-form-group">
                <label>LinkedIn URL</label>
                <input type="text" placeholder="https://linkedin.com/in/..." value={manualLeadForm.linkedIn}
                  onChange={e => setManualLeadForm(p => ({ ...p, linkedIn: e.target.value }))} />
              </div>
              <div className="lf-form-group">
                <label>Requirements / Notes</label>
                <textarea placeholder="Add any notes about this lead..." value={manualLeadForm.requirements}
                  onChange={e => setManualLeadForm(p => ({ ...p, requirements: e.target.value }))} rows={3} />
              </div>
              <button className="lf-btn-primary" onClick={addManualLead}><FiPlus size={16} /> Add Lead</button>
            </div>
          </div>
        )}

        {activeCampaign.method === 'csv' && (
          <div className="lf-method-content">
            <h3><FiUpload size={18} /> CSV / Excel Import</h3>
            {!csvPreview ? (
              <div className="lf-csv-upload" onClick={() => fileInputRef.current?.click()}>
                <FiUpload size={36} />
                <p>Click or drag a CSV file here to upload</p>
                <span className="lf-csv-hint">Supports .csv files</span>
                <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleCsvSelect} />
              </div>
            ) : (
              <div className="lf-csv-preview">
                <div className="lf-csv-info">
                  <FiFileText size={18} />
                  <span>{csvFile?.name} — {csvPreview.totalRows} rows, {csvPreview.headers.length} columns</span>
                </div>

                {/* Column Mapping */}
                <div className="lf-csv-mapping">
                  <h4>Column Mapping</h4>
                  <p className="lf-step-desc">Map your CSV columns to lead fields</p>
                  <div className="lf-mapping-grid">
                    {['clientName', 'companyName', 'email', 'phone', 'designation', 'location', 'requirements'].map(field => (
                      <div key={field} className="lf-mapping-row">
                        <span className="lf-mapping-label">{field === 'clientName' ? 'Name' : field.charAt(0).toUpperCase() + field.slice(1)}</span>
                        <select value={csvMapping[field] || ''} onChange={e => setCsvMapping(p => ({ ...p, [field]: e.target.value }))}>
                          <option value="">-- Skip --</option>
                          {csvPreview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="lf-csv-table-wrap">
                  <table className="lf-csv-table">
                    <thead>
                      <tr>{csvPreview.headers.map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{csvPreview.headers.map(h => <td key={h}>{row[h]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importProgress ? (
                  <div className="lf-import-progress">
                    <div className="lf-progress-bar">
                      <div className="lf-progress-fill" style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }} />
                    </div>
                    <p>{importProgress.processed} / {importProgress.total} processed — {importProgress.created} created, {importProgress.errors} errors</p>
                  </div>
                ) : (
                  <div className="lf-csv-actions">
                    <button className="lf-btn-outline" onClick={() => { setCsvFile(null); setCsvPreview(null); setCsvMapping({}); }}>
                      <FiX size={16} /> Remove File
                    </button>
                    <button className="lf-btn-primary" onClick={importCsvLeads} disabled={!csvMapping.email && !csvMapping.clientName}>
                      <FiUpload size={16} /> Import {csvPreview.totalRows} Leads
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeCampaign.method === 'extension' && (
          <div className="lf-method-content">
            <h3><FiGlobe size={18} /> Chrome Extension</h3>
            <div className="lf-extension-info">
              <div className="lf-ext-step">
                <div className="lf-ext-step-num">1</div>
                <div>
                  <h4>Install the Noxtm Chrome Extension</h4>
                  <p>Go to Chrome Web Store and install the Noxtm Lead Scraper extension</p>
                </div>
              </div>
              <div className="lf-ext-step">
                <div className="lf-ext-step-num">2</div>
                <div>
                  <h4>Navigate to your target website</h4>
                  <p>Open LinkedIn, company directories, or any website with leads</p>
                </div>
              </div>
              <div className="lf-ext-step">
                <div className="lf-ext-step-num">3</div>
                <div>
                  <h4>Start Scraping</h4>
                  <p>Click the extension icon and select this campaign to auto-import leads</p>
                </div>
              </div>
              <div className="lf-ext-campaign-id">
                <FiInfo size={14} />
                <span>Campaign ID: <code>{activeCampaign._id}</code></span>
              </div>
            </div>
          </div>
        )}

        {activeCampaign.method === 'third-party' && (
          <div className="lf-method-content">
            <h3><FiLink size={18} /> Third-Party Integration</h3>
            <div className="lf-integrations-grid">
              {['Salesforce', 'HubSpot', 'ZoomInfo', 'Apollo', 'LinkedIn Sales Nav', 'Pipedrive'].map(provider => (
                <div key={provider} className="lf-integration-card">
                  <div className="lf-integ-icon"><FiExternalLink size={20} /></div>
                  <h4>{provider}</h4>
                  <span className="lf-integ-status">Coming Soon</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Leads Table */}
        {campaignLeads.length > 0 && (
          <div className="lf-campaign-leads">
            <h3>Campaign Leads ({campaignLeads.length})</h3>
            <div className="lf-leads-table-wrap">
              <table className="lf-leads-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignLeads.map(lead => (
                    <tr key={lead._id}>
                      <td>
                        <div className="lf-lead-cell">
                          <div className="lf-lead-avatar">{lead.clientName?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div>
                            <div className="lf-lead-name">{lead.clientName}</div>
                            <div className="lf-lead-designation">{lead.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td>{lead.companyName}</td>
                      <td>{lead.email}</td>
                      <td>{lead.phone}</td>
                      <td>
                        <span className="lf-lead-status" style={{
                          background: lead.status === 'Cold Lead' ? '#dbeafe' :
                            lead.status === 'Warm Lead' ? '#fef3c7' :
                            lead.status === 'Qualified (SQL)' ? '#dcfce7' :
                            lead.status === 'Active' ? '#f3e8ff' : '#fee2e2',
                          color: lead.status === 'Cold Lead' ? '#1d4ed8' :
                            lead.status === 'Warm Lead' ? '#b45309' :
                            lead.status === 'Qualified (SQL)' ? '#15803d' :
                            lead.status === 'Active' ? '#7c3aed' : '#dc2626'
                        }}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========================= MAIN RENDER =========================

  if (showCampaignDetail) return renderCampaignDetail();

  return (
    <div className="lf-container">
      {/* Header */}
      <div className="lf-header">
        <div>
          <h1 className="lf-title">Leads Flow</h1>
          <p className="lf-subtitle">Create and manage lead acquisition campaigns</p>
        </div>
        <button className="lf-btn-primary" onClick={openWizard}>
          <FiPlus size={16} /> Add Lead Campaign
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="lf-stats-grid">
          <div className="lf-stat-card">
            <div className="lf-stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}><FiTarget size={20} /></div>
            <div className="lf-stat-info"><span className="lf-stat-number">{stats.total}</span><span className="lf-stat-label">Total Campaigns</span></div>
          </div>
          <div className="lf-stat-card">
            <div className="lf-stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}><FiPlay size={20} /></div>
            <div className="lf-stat-info"><span className="lf-stat-number">{stats.active}</span><span className="lf-stat-label">Active</span></div>
          </div>
          <div className="lf-stat-card">
            <div className="lf-stat-icon" style={{ background: '#f5f5f5', color: '#737373' }}><FiFileText size={20} /></div>
            <div className="lf-stat-info"><span className="lf-stat-number">{stats.draft}</span><span className="lf-stat-label">Drafts</span></div>
          </div>
          <div className="lf-stat-card">
            <div className="lf-stat-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}><FiUsers size={20} /></div>
            <div className="lf-stat-info"><span className="lf-stat-number">{stats.totalLeads}</span><span className="lf-stat-label">Total Leads</span></div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="lf-toolbar">
        <div className="lf-toolbar-left">
          <div className="lf-search-box">
            <FiSearch size={16} />
            <input type="text" placeholder="Search campaigns..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="lf-toolbar-right">
          <select className="lf-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <select className="lf-filter-select" value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
            <option value="all">All Methods</option>
            <option value="manual">Manual Entry</option>
            <option value="csv">CSV Upload</option>
            <option value="extension">Chrome Extension</option>
            <option value="third-party">Third-Party</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="lf-loading">
          <div className="lf-spinner" />
          <p>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="lf-empty">
          <FiTarget size={48} />
          <h3>No Campaigns Yet</h3>
          <p>Create your first lead acquisition campaign to get started</p>
          <button className="lf-btn-primary" onClick={openWizard}><FiPlus size={16} /> Create Campaign</button>
        </div>
      ) : (
        <div className="lf-campaigns-grid">
          {campaigns.map(c => {
            const method = METHOD_INFO[c.method];
            const MethodIcon = method?.icon || FiFileText;
            return (
              <div key={c._id} className="lf-campaign-card" onClick={() => openCampaignDetail(c)}>
                <div className="lf-cc-header">
                  <div className="lf-cc-method-icon" style={{ background: `${method?.color}15`, color: method?.color }}>
                    <MethodIcon size={18} />
                  </div>
                  <div className="lf-cc-title-area">
                    <h4>{c.name}</h4>
                    <span className="lf-cc-type">{c.leadType}</span>
                    {c.tradeShow && (
                      <span className="lf-cc-tradeshow-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7c3aed', background: '#f3e8ff', padding: '2px 8px', borderRadius: 10, marginTop: 4 }}>
                        <FiGlobe size={11} /> {c.tradeShow.shortName || 'Trade Show'}
                      </span>
                    )}
                  </div>
                  <div className="lf-cc-actions" onClick={e => e.stopPropagation()}>
                    <button className="lf-icon-btn" onClick={() => setActiveMenu(activeMenu === c._id ? null : c._id)}>
                      <FiMoreHorizontal size={16} />
                    </button>
                    {activeMenu === c._id && (
                      <div className="lf-action-menu">
                        <button onClick={() => openCampaignDetail(c)}><FiEye size={14} /> View</button>
                        {(c.status === 'draft' || c.status === 'paused') && (
                          <button onClick={() => { setActiveMenu(null); editCampaign(c); }}><FiEdit2 size={14} /> Edit</button>
                        )}
                        {c.status === 'draft' && (
                          <button onClick={() => { setActiveMenu(null); publishCampaign(c); }}><FiPlay size={14} /> Publish</button>
                        )}
                        <button onClick={() => duplicateCampaign(c._id)}><FiCopy size={14} /> Duplicate</button>
                        {c.status === 'active' && (
                          <button onClick={() => updateCampaignStatus(c._id, 'paused')}><FiPause size={14} /> Pause</button>
                        )}
                        {c.status === 'paused' && (
                          <button onClick={() => updateCampaignStatus(c._id, 'active')}><FiPlay size={14} /> Resume</button>
                        )}
                        {c.status !== 'archived' && (
                          <button onClick={() => updateCampaignStatus(c._id, 'archived')}><FiArchive size={14} /> Archive</button>
                        )}
                        <button className="lf-menu-danger" onClick={() => deleteCampaign(c._id)}><FiTrash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="lf-cc-stats">
                  <div className="lf-cc-stat">
                    <span className="lf-cc-stat-num">{c.stats?.total || 0}</span>
                    <span className="lf-cc-stat-label">Leads</span>
                  </div>
                  <div className="lf-cc-stat">
                    <span className="lf-cc-stat-num">{c.stats?.converted || 0}</span>
                    <span className="lf-cc-stat-label">Converted</span>
                  </div>
                  <div className="lf-cc-stat">
                    <span className="lf-cc-stat-num">{c.stats?.qualified || 0}</span>
                    <span className="lf-cc-stat-label">Qualified</span>
                  </div>
                </div>
                <div className="lf-cc-footer">
                  <span className="lf-status-badge" style={{
                    background: STATUS_COLORS[c.status]?.bg,
                    color: STATUS_COLORS[c.status]?.color
                  }}>
                    {c.status}
                  </span>
                  <span className="lf-cc-date">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  {c.tags?.length > 0 && (
                    <div className="lf-cc-tags">
                      {c.tags.slice(0, 2).map((t, i) => <span key={i} className="lf-tag-sm">{t}</span>)}
                      {c.tags.length > 2 && <span className="lf-tag-sm">+{c.tags.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <div className="noxtm-overlay" onClick={() => setShowWizard(false)}>
          <div className="lf-modal lf-wizard-modal" onClick={e => e.stopPropagation()}>
            {/* Wizard Header */}
            <div className="lf-wizard-modal-header">
              <h3>{isEditing ? 'Edit Campaign' : 'Create Lead Campaign'}</h3>
              <button className="lf-wizard-close" onClick={() => { setShowWizard(false); setIsEditing(false); setEditingCampaignId(null); }}>
                <FiX size={18} />
              </button>
            </div>
            {/* Progress */}
            <div className="lf-wizard-progress">
              {[
                { num: 1, label: 'Method' },
                { num: 2, label: 'Configure' },
                { num: 3, label: 'Assign' },
                { num: 4, label: 'Review' }
              ].map(step => (
                <div key={step.num} className={`lf-wizard-step-ind ${wizardStep === step.num ? 'lf-step-active' : ''} ${wizardStep > step.num ? 'lf-step-done' : ''}`}>
                  <div className="lf-step-circle">
                    {wizardStep > step.num ? <FiCheck size={14} /> : step.num}
                  </div>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="lf-wizard-body">
              {wizardStep === 1 && renderStep1()}
              {wizardStep === 2 && renderStep2()}
              {wizardStep === 3 && renderStep3()}
              {wizardStep === 4 && renderStep4()}
            </div>

            {/* Actions */}
            <div className="lf-wizard-actions">
              <div className="lf-wizard-actions-left">
                {wizardStep > 1 && (
                  <button className="lf-btn-outline" onClick={prevStep}><FiArrowLeft size={14} /> Back</button>
                )}
              </div>
              <div className="lf-wizard-actions-right">
                <button className="lf-btn-outline" onClick={() => setShowWizard(false)}>Cancel</button>
                {wizardStep === 4 ? (
                  <>
                    <button className="lf-btn-outline" onClick={() => createCampaign(true)}>
                      {isEditing ? 'Update as Draft' : 'Save as Draft'}
                    </button>
                    <button className="lf-btn-primary" onClick={() => createCampaign(false)}>
                      {isEditing ? 'Update & Publish' : 'Create Campaign'}
                    </button>
                  </>
                ) : (
                  <button className="lf-btn-primary" onClick={nextStep} disabled={!canProceed()}>
                    Next <FiArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsFlow;
