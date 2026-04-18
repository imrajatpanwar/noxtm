import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiUser, FiPhone, FiActivity, FiChevronRight, FiStar, FiX
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { Skeleton } from './ui/skeleton';

const LEGACY_NORMALIZE = {
  'Cold Lead': 'new', 'Warm Lead': 'followup',
  'Qualified (SQL)': 'converted', 'Active': 'active', 'Dead Lead': 'dead',
};
const normalizeStatus = s => LEGACY_NORMALIZE[s] || s || 'new';

const STATUS_OPTIONS = ['new', 'active', 'followup', 'converted', 'dead'];
const STATUS_LABELS = {
  new:       'New',
  active:    'Active',
  followup:  'Follow-up',
  converted: 'Converted',
  dead:      'Dead',
};
const STATUS_COLORS = {
  new:       { bg: '#dbeafe', color: '#1d4ed8' },
  active:    { bg: '#f3e8ff', color: '#7c3aed' },
  followup:  { bg: '#fef3c7', color: '#b45309' },
  converted: { bg: '#dcfce7', color: '#15803d' },
  dead:      { bg: '#fee2e2', color: '#dc2626' },
};

function AllContacts({ activeTab, tabs, onTabChange }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterLabelId, setFilterLabelId] = useState('');
  const [labels, setLabels] = useState([]);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get('/contact-labels');
      setLabels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      if (filterImportant) params.important = 'true';
      if (filterLabelId) params.labelId = filterLabelId;

      const response = await api.get('/company-data-contacts', { params });
      const raw = Array.isArray(response.data) ? response.data : [];
      const data = raw.map(c => ({ ...c, status: normalizeStatus(c.status) }));
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, filterImportant, filterLabelId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const stats = {
    total: contacts.length,
    new: contacts.filter(c => c.status === 'new').length,
    active: contacts.filter(c => c.status === 'active').length,
    converted: contacts.filter(c => c.status === 'converted').length,
    important: contacts.filter(c => c.isImportant).length,
  };

  const handleToggleImportant = async (contact, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/company-data-contacts/${contact.companyDataId}/${contact.contactIndex}/important`);
      await fetchContacts();
    } catch (error) {
      console.error('Error toggling important:', error);
      toast.error('Failed to update');
    }
  };

  const handleStatusChange = async (contact, newStatus) => {
    try {
      await api.patch(
        `/company-data-contacts/${contact.companyDataId}/${contact.contactIndex}/status`,
        { status: newStatus }
      );
      toast.success('Status updated');
      await fetchContacts();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const activeFiltersCount =
    (filterStatus !== 'All' ? 1 : 0) +
    (filterImportant ? 1 : 0) +
    (filterLabelId ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatus('All');
    setFilterImportant(false);
    setFilterLabelId('');
  };

  const getStatusStyle = (status) => STATUS_COLORS[status] || { bg: '#f5f5f5', color: '#525252' };

  const StatCard = ({ icon: Icon, iconBg, iconColor, value, label, active, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px',
        background: '#fff',
        borderRadius: 8,
        border: active ? '2px solid #f59e0b' : '1px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 8, background: iconBg, flexShrink: 0,
      }}>
        <Icon style={{ color: iconColor, fill: label === 'Important' && active ? iconColor : 'none' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{value}</span>
        <span style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, background: '#fff', margin: '-24px -24px 20px', padding: '24px 24px 0', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>All Contacts</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>Decision makers from all companies</p>
        {/* Tab bar */}
        {tabs && onTabChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', fontSize: 14, fontWeight: 500,
                    color: isActive ? '#09090b' : '#6b7280',
                    background: 'transparent', border: 'none',
                    borderBottom: isActive ? '2px solid #09090b' : '2px solid transparent',
                    marginBottom: -1, cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#09090b'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#6b7280'; }}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon={FiUser} iconBg="#eff6ff" iconColor="#3b82f6" value={stats.total} label="Total Contacts" />
        <StatCard icon={FiActivity} iconBg="#dbeafe" iconColor="#1d4ed8" value={stats.new} label="New" />
        <StatCard icon={FiActivity} iconBg="#f3e8ff" iconColor="#7c3aed" value={stats.active} label="Active" />
        <StatCard icon={FiChevronRight} iconBg="#dcfce7" iconColor="#15803d" value={stats.converted} label="Converted" />
        <StatCard
          icon={FiStar}
          iconBg={filterImportant ? '#fef3c7' : '#fffbeb'}
          iconColor="#f59e0b"
          value={stats.important}
          label="Important"
          active={filterImportant}
          onClick={() => setFilterImportant(!filterImportant)}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={filterLabelId}
          onChange={(e) => setFilterLabelId(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}
        >
          <option value="">All Labels</option>
          {labels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>

        <button
          onClick={() => setFilterImportant(!filterImportant)}
          title="Filter important"
          style={{
            padding: '8px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
            border: filterImportant ? '1px solid #f59e0b' : '1px solid #d1d5db',
            background: filterImportant ? '#fffbeb' : '#fff',
            display: 'flex', alignItems: 'center',
          }}
        >
          <FiStar style={{ fill: filterImportant ? '#f59e0b' : 'none', color: filterImportant ? '#f59e0b' : '#6b7280' }} />
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: '8px 12px', fontSize: 13, color: '#374151', border: '1px solid #d1d5db',
              borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <FiX size={12} /> Clear ({activeFiltersCount})
          </button>
        )}

        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton style={{ height: 32, width: 180 }} />
            <Skeleton style={{ height: 16, width: '100%' }} />
            <Skeleton style={{ height: 16, width: '100%' }} />
            <Skeleton style={{ height: 16, width: '75%' }} />
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FiUser size={44} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: '0 0 4px' }}>No Contacts Found</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              {activeFiltersCount > 0 || searchTerm
                ? 'Try adjusting your filters'
                : 'Contacts from your companies will appear here'}
            </p>
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                onClick={() => { clearAllFilters(); setSearchTerm(''); }}
                style={{
                  marginTop: 12, padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db',
                  borderRadius: 6, background: '#fff', cursor: 'pointer',
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ width: 40, padding: '10px 8px' }}></th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Contact</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Company</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Phone</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Labels</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(contact => {
                  const style = getStatusStyle(contact.status);
                  return (
                    <tr key={contact._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => handleToggleImportant(contact, e)}
                          title={contact.isImportant ? 'Remove from important' : 'Mark as important'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        >
                          <FiStar style={{
                            fill: contact.isImportant ? '#f59e0b' : 'none',
                            color: contact.isImportant ? '#f59e0b' : '#9ca3af',
                          }} />
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: '50%', background: '#dbeafe',
                            color: '#1d4ed8', fontWeight: 600, fontSize: 12, flexShrink: 0,
                          }}>
                            {(contact.fullName || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500, color: '#111827' }}>{contact.fullName}</span>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{contact.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{contact.companyName || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>
                        {contact.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FiPhone size={12} /> {contact.phone}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={contact.status || 'new'}
                          onChange={e => handleStatusChange(contact, e.target.value)}
                          style={{
                            fontSize: 11, fontWeight: 500, borderRadius: 20,
                            padding: '3px 8px', border: 'none', outline: 'none',
                            background: style.bg, color: style.color, cursor: 'pointer',
                          }}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s} style={{ background: '#fff', color: '#111' }}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(contact.labels || []).map(l => (
                            <span
                              key={l._id}
                              style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '2px 8px', fontSize: 11, borderRadius: 4,
                                border: `1px solid ${l.color || '#e5e7eb'}`,
                                background: (l.color || '#e5e7eb') + '1a',
                                color: l.color || '#374151',
                              }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllContacts;
