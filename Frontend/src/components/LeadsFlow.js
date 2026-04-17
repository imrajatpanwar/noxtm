import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiMessageCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { Skeleton } from './ui/skeleton';
import api from '../config/api';
import { toast } from 'sonner';
import './LeadsFlow.css';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' },
];

const STATUS_LABELS = {
  new: 'New',
  active: 'Active',
  followup: 'Follow-up',
  converted: 'Converted',
  dead: 'Dead',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  return <span className={`lf-badge ${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export default function LeadsFlow() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, active: 0, followup: 0, converted: 0, dead: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (selectedCampaign) params.campaignId = selectedCampaign;
      if (search.trim()) params.search = search.trim();

      const [leadsRes, campaignsRes, statsRes] = await Promise.all([
        api.get('/whatsapp-leads', { params }),
        api.get('/whatsapp-leads/campaigns'),
        api.get('/whatsapp-leads/stats'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setCampaigns(campaignsRes.data.campaigns || []);
      setStats(statsRes.data.stats || { total: 0, new: 0, active: 0, followup: 0, converted: 0, dead: 0 });
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCampaign, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    window.addEventListener('dashboard:refresh', fetchAll);
    return () => window.removeEventListener('dashboard:refresh', fetchAll);
  }, [fetchAll]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.put(`/whatsapp-leads/${leadId}/status`, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      // Refresh stats
      const statsRes = await api.get('/whatsapp-leads/stats');
      setStats(statsRes.data.stats || stats);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const hasReplied = (lead) => lead.campaigns?.some(c => c.replied);

  return (
    <div className="lf-container">
      {/* Header */}
      <div className="lf-header">
        <div className="lf-header-left">
          <h1 className="lf-title">Leads Flow</h1>
          <p className="lf-subtitle">WhatsApp campaign leads — track replies, status &amp; conversions</p>
        </div>
        <button
          onClick={fetchAll}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', fontFamily: "'Switzer', sans-serif" }}
        >
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="lf-stats">
        <div className="lf-stat-card">
          <div className="lf-stat-value">{stats.total}</div>
          <div className="lf-stat-label">Total Leads</div>
        </div>
        <div className="lf-stat-card">
          <div className="lf-stat-value">{stats.new}</div>
          <div className="lf-stat-label">New</div>
        </div>
        <div className="lf-stat-card active">
          <div className="lf-stat-value">{stats.active}</div>
          <div className="lf-stat-label">Active</div>
        </div>
        <div className="lf-stat-card followup">
          <div className="lf-stat-value">{stats.followup}</div>
          <div className="lf-stat-label">Follow-up</div>
        </div>
        <div className="lf-stat-card converted">
          <div className="lf-stat-value">{stats.converted}</div>
          <div className="lf-stat-label">Converted</div>
        </div>
        <div className="lf-stat-card dead">
          <div className="lf-stat-value">{stats.dead}</div>
          <div className="lf-stat-label">Dead</div>
        </div>
      </div>

      {/* Filters */}
      <div className="lf-filters">
        <div className="lf-search">
          <FiSearch size={14} />
          <input
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="lf-select"
          value={selectedCampaign}
          onChange={e => setSelectedCampaign(e.target.value)}
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <div className="lf-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              className={`lf-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="lf-table-wrap">
        {loading ? (
          <div style={{ padding: '16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: '0 0 160px' }}>
                  <Skeleton style={{ height: 14, marginBottom: 6, borderRadius: 6 }} />
                  <Skeleton style={{ height: 11, width: '60%', borderRadius: 6 }} />
                </div>
                <Skeleton style={{ height: 22, width: 60, borderRadius: 20 }} />
                <Skeleton style={{ height: 20, width: 100, borderRadius: 4 }} />
                <Skeleton style={{ height: 13, width: 70, borderRadius: 6 }} />
                <Skeleton style={{ height: 13, width: 55, borderRadius: 6 }} />
                <Skeleton style={{ height: 26, width: 110, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="lf-empty">
            <div className="lf-empty-icon"><FiMessageCircle size={40} color="#e5e7eb" /></div>
            <p className="lf-empty-title">No leads yet</p>
            <p className="lf-empty-desc">Leads appear here automatically when you run a WhatsApp campaign. Contacts who reply are marked Active.</p>
          </div>
        ) : (
          <table className="lf-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Status</th>
                <th>Campaigns</th>
                <th>Last Campaign</th>
                <th>Reply</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead._id}>
                  <td>
                    <div className="lf-lead-name">{lead.name || '—'}</div>
                    <div className="lf-lead-phone">{lead.phone}</div>
                  </td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>
                    <div className="lf-campaigns-cell">
                      {lead.campaigns?.length > 0 ? (
                        <>
                          {lead.campaigns.slice(0, 2).map((c, i) => (
                            <span key={i} className="lf-campaign-tag" title={c.campaignName}>{c.campaignName || 'Campaign'}</span>
                          ))}
                          {lead.campaigns.length > 2 && (
                            <span className="lf-campaign-count">+{lead.campaigns.length - 2} more</span>
                          )}
                        </>
                      ) : <span className="lf-no-reply">—</span>}
                    </div>
                  </td>
                  <td>{formatDate(lead.lastCampaignAt)}</td>
                  <td>
                    {hasReplied(lead) ? (
                      <span className="lf-replied"><FiCheck size={12} /> Replied</span>
                    ) : (
                      <span className="lf-no-reply">No reply</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="lf-status-select"
                      value={lead.status}
                      onChange={e => handleStatusChange(lead._id, e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="active">Active</option>
                      <option value="followup">Follow-up</option>
                      <option value="converted">Converted</option>
                      <option value="dead">Dead</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
