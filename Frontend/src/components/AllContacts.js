import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiSearch, FiPhone, FiChevronDown, FiCheck, FiX, FiUser
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
const CONTACT_PAGE_SIZE = 15;
const STATUS_LABELS = {
  new:       'New',
  active:    'Active',
  followup:  'Follow-up',
  converted: 'Converted',
  dead:      'Dead',
};
const STATUS_COLORS = {
  new:       { bg: '#dbeafe', color: '#1d4ed8' },
  active:    { bg: '#dcfce7', color: '#15803d' },
  followup:  { bg: '#fef3c7', color: '#b45309' },
  converted: { bg: '#ede9fe', color: '#7c3aed' },
  dead:      { bg: '#fee2e2', color: '#dc2626' },
};

function StatusDropdown({ contact, onChange }) {
  const [open, setOpen] = useState(false);
  const current = normalizeStatus(contact.status);
  const currentStyle = STATUS_COLORS[current] || { bg: '#f5f5f5', color: '#525252' };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          minWidth: 104, height: 26, padding: '0 8px 0 12px', border: 'none', outline: 'none',
          borderRadius: 999, background: currentStyle.bg, color: currentStyle.color,
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span>{STATUS_LABELS[current] || 'New'}</span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
            minWidth: 144, padding: 6, border: '1px solid #d1d5db', borderRadius: 12,
            background: '#fff', boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)',
          }}
        >
          {STATUS_OPTIONS.map(status => {
            const selected = status === current;
            const optionStyle = STATUS_COLORS[status] || currentStyle;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!selected) onChange(contact, status);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', border: 0, borderRadius: 8,
                  background: selected ? optionStyle.bg : '#fff',
                  color: selected ? optionStyle.color : '#111827',
                  fontSize: 13, fontWeight: selected ? 800 : 600,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 14, display: 'inline-flex' }}>
                  {selected && <FiCheck size={14} />}
                </span>
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AllContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterLabelId, setFilterLabelId] = useState('');
  const [labels, setLabels] = useState([]);
  const loadMoreRef = useRef(null);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get('/contact-labels');
      setLabels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, []);

  const fetchContacts = useCallback(async ({ pageToLoad = 1, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const params = {
        page: pageToLoad,
        limit: CONTACT_PAGE_SIZE,
      };
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      if (filterLabelId) params.labelId = filterLabelId;

      const response = await api.get('/company-data-contacts', { params });
      const payload = response.data;
      const raw = Array.isArray(payload) ? payload : (payload.data || []);
      const data = raw.map(c => ({ ...c, status: normalizeStatus(c.status) }));
      setContacts(prev => {
        if (!append) return data;
        const seen = new Set(prev.map(contact => contact._id));
        const uniqueNext = data.filter(contact => !seen.has(contact._id));
        return [...prev, ...uniqueNext];
      });
      setPage(pageToLoad);
      setHasMore(Boolean(payload.pagination?.hasMore));
      setTotalContacts(payload.pagination?.total ?? data.length);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      if (!append) setContacts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterStatus, searchTerm, filterLabelId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);
  useEffect(() => { fetchContacts({ pageToLoad: 1, append: false }); }, [fetchContacts]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return undefined;
    const target = loadMoreRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          fetchContacts({ pageToLoad: page + 1, append: true });
        }
      },
      { rootMargin: '320px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchContacts, hasMore, loading, loadingMore, page]);

  const handleStatusChange = async (contact, newStatus) => {
    try {
      await api.patch(
        `/company-data-contacts/${contact.companyDataId}/${contact.contactIndex}/status`,
        { status: newStatus }
      );
      toast.success('Status updated');
      await fetchContacts({ pageToLoad: 1, append: false });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const activeFiltersCount = (filterStatus !== 'All' ? 1 : 0) + (filterLabelId ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatus('All');
    setFilterLabelId('');
  };

  return (
    <div>
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
          {loading ? '' : `${contacts.length} of ${totalContacts} contact${totalContacts !== 1 ? 's' : ''}`}
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
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Contact</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Company</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Phone</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Location</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Labels</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(contact => {
                  return (
                    <tr key={contact._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
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
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 13 }}>
                        {contact.sourceType === 'extension' ? 'Extension' : contact.sourceType === 'dashboard' ? 'Dashboard' : contact.sourceType === 'import' ? 'Import' : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusDropdown contact={contact} onChange={handleStatusChange} />
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
      <div ref={loadMoreRef} style={{ minHeight: hasMore || loadingMore ? 1 : 0 }}>
        {loadingMore && (
          <div style={{ marginTop: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.7fr', gap: 12, alignItems: 'center' }}>
                <Skeleton style={{ height: 24, width: '100%' }} />
                <Skeleton style={{ height: 16, width: '100%' }} />
                <Skeleton style={{ height: 16, width: '100%' }} />
                <Skeleton style={{ height: 22, width: 90 }} />
                <Skeleton style={{ height: 16, width: '70%' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AllContacts;
