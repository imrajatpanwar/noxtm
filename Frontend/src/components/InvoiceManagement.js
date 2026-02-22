import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiSearch, FiPlus, FiEdit3, FiTrash2, FiFileText,
  FiDollarSign, FiCalendar, FiDownload, FiEye, FiCopy,
  FiSend, FiChevronUp, FiChevronDown, FiMoreVertical,
  FiX, FiCheck, FiClock, FiAlertCircle, FiRepeat,
  FiPercent, FiFilter
} from 'react-icons/fi';
import { toast } from 'sonner';
import './InvoiceManagement.css';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$' };
const PAYMENT_TERMS = [
  { value: 'due-on-receipt', label: 'Due on Receipt' },
  { value: 'net-15', label: 'Net 15' },
  { value: 'net-30', label: 'Net 30' },
  { value: 'net-60', label: 'Net 60' },
  { value: 'net-90', label: 'Net 90' },
];
const STATUS_OPTIONS = ['pending', 'paid', 'overdue', 'cancelled'];

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });
  const [statusDropdown, setStatusDropdown] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const defaultForm = {
    clientName: '', companyName: '', email: '', phone: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    dueDate: '', notes: '', currency: 'USD',
    discount: 0, discountType: 'percentage',
    paymentTerms: 'net-30', taxRate: 10,
    recurring: false, recurringInterval: 'monthly'
  };
  const [invoiceForm, setInvoiceForm] = useState(defaultForm);

  /* ── Fetch ── */
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = '/api/invoices';
      const p = new URLSearchParams();
      if (filterStatus !== 'All') p.append('status', filterStatus.toLowerCase());
      if (searchTerm) p.append('search', searchTerm);
      if (p.toString()) url += '?' + p.toString();

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setInvoices(await res.json());
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [filterStatus, searchTerm]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* ── Close menus on outside click ── */
  useEffect(() => {
    const handler = () => { setStatusDropdown(null); setActionMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  /* ── Form helpers ── */
  const resetForm = () => { setInvoiceForm(defaultForm); setEditingInvoice(null); };

  const handleAddItem = () => {
    setInvoiceForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, price: 0 }] }));
  };
  const handleRemoveItem = (i) => {
    if (invoiceForm.items.length > 1)
      setInvoiceForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };
  const handleUpdateItem = (i, field, val) => {
    setInvoiceForm(f => ({
      ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
    }));
  };

  const subtotal = useMemo(() =>
    invoiceForm.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0), 0),
    [invoiceForm.items]
  );
  const discountAmt = useMemo(() =>
    invoiceForm.discountType === 'percentage' ? subtotal * ((parseFloat(invoiceForm.discount) || 0) / 100) : (parseFloat(invoiceForm.discount) || 0),
    [subtotal, invoiceForm.discount, invoiceForm.discountType]
  );
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * ((parseFloat(invoiceForm.taxRate) || 0) / 100);
  const grandTotal = afterDiscount + taxAmt;

  const cs = (inv) => CURRENCY_SYMBOLS[inv?.currency] || '$';

  /* ── CRUD ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      ...invoiceForm,
      taxRate: (parseFloat(invoiceForm.taxRate) || 0) / 100,
      discount: parseFloat(invoiceForm.discount) || 0
    };
    try {
      const token = localStorage.getItem('token');
      const url = editingInvoice ? `/api/invoices/${editingInvoice._id || editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      if (editingInvoice) {
        setInvoices(inv => inv.map(i => (i._id || i.id) === (saved._id || saved.id) ? saved : i));
        toast.success('Invoice updated');
      } else {
        setInvoices(inv => [saved, ...inv]);
        toast.success('Invoice created');
      }
      setShowModal(false); resetForm();
    } catch { toast.error('Failed to save invoice'); }
  };

  const handleEdit = (inv) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      clientName: inv.clientName, companyName: inv.companyName,
      email: inv.email, phone: inv.phone, items: inv.items,
      dueDate: inv.dueDate, notes: inv.notes || '',
      currency: inv.currency || 'USD',
      discount: inv.discountType === 'percentage' ? (inv.discount || 0) : (inv.discount || 0),
      discountType: inv.discountType || 'percentage',
      paymentTerms: inv.paymentTerms || 'net-30',
      taxRate: ((inv.taxRate || 0.1) * 100),
      recurring: inv.recurring || false,
      recurringInterval: inv.recurringInterval || 'monthly'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setInvoices(inv => inv.filter(i => (i._id || i.id) !== id));
      toast.success('Invoice deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setInvoices(inv => inv.map(i => (i._id || i.id) === id ? updated : i));
      toast.success(`Marked as ${status}`);
    } catch { toast.error('Failed to update status'); }
    setStatusDropdown(null);
  };

  const handleDuplicate = async (inv) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${inv._id || inv.id}/duplicate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const dup = await res.json();
      setInvoices(invs => [dup, ...invs]);
      toast.success('Invoice duplicated');
    } catch { toast.error('Failed to duplicate'); }
    setActionMenu(null);
  };

  const handleSendEmail = async (inv) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${inv._id || inv.id}/send`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Invoice sent to ' + inv.email);
    } catch { toast.error('Failed to send email'); }
    setActionMenu(null);
  };

  const handleDownloadPDF = async (inv) => {
    try {
      toast.success('Generating PDF...');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${inv._id || inv.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${inv.invoiceNumber || inv.id}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
  };

  /* ── Bulk actions ── */
  const toggleSelect = (id) => {
    setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };
  const toggleAll = () => {
    setSelectedIds(s => s.length === filteredInvoices.length ? [] : filteredInvoices.map(i => i._id || i.id));
  };
  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} invoices?`)) return;
    const token = localStorage.getItem('token');
    for (const id of selectedIds) {
      try {
        await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      } catch { /* skip */ }
    }
    setInvoices(inv => inv.filter(i => !selectedIds.includes(i._id || i.id)));
    setSelectedIds([]);
    toast.success('Invoices deleted');
  };
  const bulkStatusChange = async (status) => {
    const token = localStorage.getItem('token');
    const updated = [];
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/invoices/${id}/status`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) updated.push(await res.json());
      } catch { /* skip */ }
    }
    setInvoices(inv => inv.map(i => {
      const u = updated.find(x => (x._id || x.id) === (i._id || i.id));
      return u || i;
    }));
    setSelectedIds([]);
    toast.success(`Marked ${updated.length} invoices as ${status}`);
  };

  /* ── Filter & sort ── */
  const filteredInvoices = useMemo(() => {
    let list = invoices.filter(inv => {
      const q = searchTerm.toLowerCase();
      const matchSearch = inv.clientName.toLowerCase().includes(q) ||
        inv.companyName.toLowerCase().includes(q) || inv.id.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'All' || inv.status === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      const { key, dir } = sortConfig;
      let va = a[key], vb = b[key];
      if (key === 'total' || key === 'subtotal') { va = Number(va); vb = Number(vb); }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [invoices, searchTerm, filterStatus, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <FiChevronUp className="inv-sort-icon inv-sort-idle" />;
    return sortConfig.dir === 'asc'
      ? <FiChevronUp className="inv-sort-icon inv-sort-active" />
      : <FiChevronDown className="inv-sort-icon inv-sort-active" />;
  };

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    pendingAmount: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0),
  }), [invoices]);

  const statusIcon = (s) => {
    switch (s) {
      case 'paid': return <FiCheck />;
      case 'pending': return <FiClock />;
      case 'overdue': return <FiAlertCircle />;
      case 'cancelled': return <FiX />;
      default: return <FiFileText />;
    }
  };

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="inv">
      {/* Header */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Invoices</h1>
          <p className="inv-subtitle">Create, manage and track your invoices</p>
        </div>
        <button className="inv-primary-btn" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="inv-stats">
        {[
          { label: 'Total Invoices', val: stats.total, icon: <FiFileText />, cls: 'total' },
          { label: 'Revenue', val: `$${stats.totalRevenue.toLocaleString()}`, icon: <FiDollarSign />, cls: 'revenue' },
          { label: 'Pending', val: stats.pending, sub: `$${stats.pendingAmount.toLocaleString()}`, icon: <FiClock />, cls: 'pending' },
          { label: 'Paid', val: stats.paid, icon: <FiCheck />, cls: 'paid' },
          { label: 'Overdue', val: stats.overdue, icon: <FiAlertCircle />, cls: 'overdue' },
        ].map(s => (
          <div key={s.cls} className={`inv-stat inv-stat-${s.cls}`}>
            <div className="inv-stat-icon">{s.icon}</div>
            <div className="inv-stat-body">
              <span className="inv-stat-val">{s.val}</span>
              <span className="inv-stat-label">{s.label}</span>
              {s.sub && <span className="inv-stat-sub">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-search">
          <FiSearch />
          <input placeholder="Search invoices..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="inv-filters">
          <FiFilter className="inv-filter-icon" />
          {['All', 'Paid', 'Pending', 'Overdue', 'Cancelled'].map(s => (
            <button key={s} className={`inv-filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="inv-bulk-bar">
          <span>{selectedIds.length} selected</span>
          <div className="inv-bulk-actions">
            <button onClick={() => bulkStatusChange('paid')} className="inv-bulk-btn paid">Mark Paid</button>
            <button onClick={() => bulkStatusChange('pending')} className="inv-bulk-btn pending">Mark Pending</button>
            <button onClick={bulkDelete} className="inv-bulk-btn delete">Delete</button>
          </div>
          <button className="inv-bulk-clear" onClick={() => setSelectedIds([])}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="inv-table-wrap">
        {loading ? (
          <div className="inv-loading"><div className="inv-spinner" /> Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="inv-empty">
            <FiFileText />
            <h3>No invoices found</h3>
            <p>Create your first invoice to get started</p>
            <button className="inv-primary-btn sm" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Create Invoice</button>
          </div>
        ) : (
          <table className="inv-table">
            <thead>
              <tr>
                <th className="inv-th-check">
                  <input type="checkbox" checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleAll} />
                </th>
                <th onClick={() => handleSort('id')} className="inv-sortable">Invoice <SortIcon col="id" /></th>
                <th onClick={() => handleSort('clientName')} className="inv-sortable">Client <SortIcon col="clientName" /></th>
                <th onClick={() => handleSort('total')} className="inv-sortable">Amount <SortIcon col="total" /></th>
                <th onClick={() => handleSort('status')} className="inv-sortable">Status <SortIcon col="status" /></th>
                <th onClick={() => handleSort('dueDate')} className="inv-sortable">Due Date <SortIcon col="dueDate" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const id = inv._id || inv.id;
                return (
                  <tr key={id} className={selectedIds.includes(id) ? 'inv-row-selected' : ''}>
                    <td><input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelect(id)} /></td>
                    <td>
                      <span className="inv-id">{inv.id}</span>
                      {inv.recurring && <span className="inv-recurring-badge"><FiRepeat /> Recurring</span>}
                    </td>
                    <td>
                      <div className="inv-client-cell">
                        <span className="inv-client-name">{inv.clientName}</span>
                        <span className="inv-client-company">{inv.companyName}</span>
                      </div>
                    </td>
                    <td><span className="inv-amount">{cs(inv)}{inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td>
                      <div className="inv-status-cell" onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === id ? null : id); setActionMenu(null); }}>
                        <span className={`inv-badge ${inv.status}`}>{statusIcon(inv.status)} {inv.status}</span>
                        {statusDropdown === id && (
                          <div className="inv-status-dropdown" onClick={e => e.stopPropagation()}>
                            {STATUS_OPTIONS.map(s => (
                              <button key={s} className={`inv-sd-item ${inv.status === s ? 'current' : ''}`} onClick={() => handleStatusChange(id, s)}>
                                {statusIcon(s)} {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className="inv-date"><FiCalendar /> {inv.dueDate}</span></td>
                    <td>
                      <div className="inv-actions">
                        <button className="inv-act-btn" title="Preview" onClick={() => setShowPreview(inv)}><FiEye /></button>
                        <button className="inv-act-btn" title="Download" onClick={() => handleDownloadPDF(inv)}><FiDownload /></button>
                        <button className="inv-act-btn" title="Edit" onClick={() => handleEdit(inv)}><FiEdit3 /></button>
                        <div className="inv-more-wrap">
                          <button className="inv-act-btn" onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === id ? null : id); setStatusDropdown(null); }}><FiMoreVertical /></button>
                          {actionMenu === id && (
                            <div className="inv-action-dropdown" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleDuplicate(inv)}><FiCopy /> Duplicate</button>
                              <button onClick={() => handleSendEmail(inv)}><FiSend /> Send Email</button>
                              <button className="inv-dd-danger" onClick={() => { handleDelete(id); setActionMenu(null); }}><FiTrash2 /> Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="inv-foot-label">Total ({filteredInvoices.length} invoices)</td>
                <td className="inv-foot-total">${filteredInvoices.reduce((s, i) => s + i.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ══════ CREATE / EDIT MODAL ══════ */}
      {showModal && (
        <div className="inv-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-head">
              <h2>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button className="inv-modal-close" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="inv-modal-body">
              {/* Client */}
              <div className="inv-section">
                <h3 className="inv-section-title">Client Details</h3>
                <div className="inv-form-grid">
                  <div className="inv-field">
                    <label>Client Name *</label>
                    <input required value={invoiceForm.clientName} onChange={e => setInvoiceForm(f => ({ ...f, clientName: e.target.value }))} />
                  </div>
                  <div className="inv-field">
                    <label>Company *</label>
                    <input required value={invoiceForm.companyName} onChange={e => setInvoiceForm(f => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div className="inv-field">
                    <label>Email *</label>
                    <input type="email" required value={invoiceForm.email} onChange={e => setInvoiceForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="inv-field">
                    <label>Phone *</label>
                    <input type="tel" required value={invoiceForm.phone} onChange={e => setInvoiceForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="inv-section">
                <h3 className="inv-section-title">Line Items</h3>
                <div className="inv-items-header">
                  <span className="inv-ih-num">#</span>
                  <span className="inv-ih-desc">Description</span>
                  <span className="inv-ih-qty">Qty</span>
                  <span className="inv-ih-price">Price</span>
                  <span className="inv-ih-total">Total</span>
                  <span className="inv-ih-del"></span>
                </div>
                {invoiceForm.items.map((item, i) => (
                  <div key={i} className="inv-item-row">
                    <span className="inv-item-num">{i + 1}</span>
                    <input className="inv-item-desc" placeholder="Item description" required value={item.description} onChange={e => handleUpdateItem(i, 'description', e.target.value)} />
                    <input className="inv-item-qty" type="number" min="1" required value={item.quantity} onChange={e => handleUpdateItem(i, 'quantity', e.target.value)} />
                    <div className="inv-price-wrap">
                      <span>{CURRENCY_SYMBOLS[invoiceForm.currency]}</span>
                      <input type="number" min="0" step="0.01" required value={item.price} onChange={e => handleUpdateItem(i, 'price', e.target.value)} />
                    </div>
                    <span className="inv-item-total">{CURRENCY_SYMBOLS[invoiceForm.currency]}{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</span>
                    {invoiceForm.items.length > 1 && (
                      <button type="button" className="inv-item-del" onClick={() => handleRemoveItem(i)}><FiTrash2 /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="inv-add-item" onClick={handleAddItem}><FiPlus /> Add Line Item</button>
              </div>

              {/* Settings row */}
              <div className="inv-section">
                <h3 className="inv-section-title">Invoice Settings</h3>
                <div className="inv-form-grid cols-3">
                  <div className="inv-field">
                    <label>Currency</label>
                    <select value={invoiceForm.currency} onChange={e => setInvoiceForm(f => ({ ...f, currency: e.target.value }))}>
                      {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>)}
                    </select>
                  </div>
                  <div className="inv-field">
                    <label>Tax Rate (%)</label>
                    <div className="inv-input-icon-wrap">
                      <FiPercent />
                      <input type="number" min="0" max="100" step="0.5" value={invoiceForm.taxRate} onChange={e => setInvoiceForm(f => ({ ...f, taxRate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="inv-field">
                    <label>Payment Terms</label>
                    <select value={invoiceForm.paymentTerms} onChange={e => setInvoiceForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="inv-field">
                    <label>Discount</label>
                    <div className="inv-discount-wrap">
                      <input type="number" min="0" step="0.01" value={invoiceForm.discount} onChange={e => setInvoiceForm(f => ({ ...f, discount: e.target.value }))} />
                      <select value={invoiceForm.discountType} onChange={e => setInvoiceForm(f => ({ ...f, discountType: e.target.value }))}>
                        <option value="percentage">%</option>
                        <option value="fixed">{CURRENCY_SYMBOLS[invoiceForm.currency]}</option>
                      </select>
                    </div>
                  </div>
                  <div className="inv-field">
                    <label>Due Date *</label>
                    <input type="date" required value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <div className="inv-field inv-toggle-field">
                    <label className="inv-toggle-label">
                      <input type="checkbox" checked={invoiceForm.recurring} onChange={e => setInvoiceForm(f => ({ ...f, recurring: e.target.checked }))} />
                      <FiRepeat /> Recurring
                    </label>
                    {invoiceForm.recurring && (
                      <select value={invoiceForm.recurringInterval} onChange={e => setInvoiceForm(f => ({ ...f, recurringInterval: e.target.value }))}>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="inv-totals-card">
                <div className="inv-total-row"><span>Subtotal</span><span>{CURRENCY_SYMBOLS[invoiceForm.currency]}{subtotal.toFixed(2)}</span></div>
                {discountAmt > 0 && <div className="inv-total-row inv-discount-row"><span>Discount ({invoiceForm.discountType === 'percentage' ? `${invoiceForm.discount}%` : `${CURRENCY_SYMBOLS[invoiceForm.currency]}${invoiceForm.discount}`})</span><span>-{CURRENCY_SYMBOLS[invoiceForm.currency]}{discountAmt.toFixed(2)}</span></div>}
                <div className="inv-total-row"><span>Tax ({invoiceForm.taxRate}%)</span><span>{CURRENCY_SYMBOLS[invoiceForm.currency]}{taxAmt.toFixed(2)}</span></div>
                <div className="inv-total-row inv-grand-total"><span>Total</span><span>{CURRENCY_SYMBOLS[invoiceForm.currency]}{grandTotal.toFixed(2)}</span></div>
              </div>

              {/* Notes */}
              <div className="inv-field inv-full">
                <label>Notes</label>
                <textarea rows="3" placeholder="Additional notes..." value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Actions */}
              <div className="inv-modal-foot">
                <button type="button" className="inv-cancel-btn" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="inv-primary-btn">{editingInvoice ? 'Update Invoice' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ PREVIEW MODAL ══════ */}
      {showPreview && (
        <div className="inv-overlay" onClick={() => setShowPreview(null)}>
          <div className="inv-preview" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-head">
              <h2>Invoice Preview</h2>
              <button className="inv-modal-close" onClick={() => setShowPreview(null)}><FiX /></button>
            </div>
            <div className="inv-preview-body">
              <div className="inv-preview-top">
                <div>
                  <h1 className="inv-preview-title">INVOICE</h1>
                  <span className="inv-preview-num">{showPreview.id}</span>
                </div>
                <span className={`inv-badge lg ${showPreview.status}`}>{statusIcon(showPreview.status)} {showPreview.status}</span>
              </div>

              <div className="inv-preview-info">
                <div>
                  <h4>Bill To</h4>
                  <p className="inv-preview-name">{showPreview.clientName}</p>
                  <p>{showPreview.companyName}</p>
                  <p>{showPreview.email}</p>
                  <p>{showPreview.phone}</p>
                </div>
                <div className="inv-preview-dates">
                  <div><span>Date</span><strong>{showPreview.createdAt}</strong></div>
                  <div><span>Due Date</span><strong>{showPreview.dueDate}</strong></div>
                  {showPreview.paymentTerms && <div><span>Terms</span><strong>{showPreview.paymentTerms}</strong></div>}
                  {showPreview.recurring && <div><span>Recurring</span><strong>{showPreview.recurringInterval || 'Monthly'}</strong></div>}
                </div>
              </div>

              <table className="inv-preview-table">
                <thead>
                  <tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {showPreview.items.map((it, i) => (
                    <tr key={i}><td>{it.description}</td><td>{it.quantity}</td><td>{cs(showPreview)}{it.price.toFixed(2)}</td><td>{cs(showPreview)}{(it.quantity * it.price).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="inv-preview-totals">
                <div className="inv-total-row"><span>Subtotal</span><span>{cs(showPreview)}{showPreview.subtotal.toFixed(2)}</span></div>
                {showPreview.discount > 0 && <div className="inv-total-row inv-discount-row"><span>Discount</span><span>-{cs(showPreview)}{((showPreview.discountType === 'percentage' ? showPreview.subtotal * showPreview.discount / 100 : showPreview.discount) || 0).toFixed(2)}</span></div>}
                <div className="inv-total-row"><span>Tax</span><span>{cs(showPreview)}{showPreview.tax.toFixed(2)}</span></div>
                <div className="inv-total-row inv-grand-total"><span>Total</span><span>{cs(showPreview)}{showPreview.total.toFixed(2)}</span></div>
              </div>

              {showPreview.notes && (
                <div className="inv-preview-notes"><h4>Notes</h4><p>{showPreview.notes}</p></div>
              )}

              <div className="inv-preview-actions">
                <button className="inv-primary-btn" onClick={() => handleDownloadPDF(showPreview)}><FiDownload /> Download PDF</button>
                <button className="inv-secondary-btn" onClick={() => handleSendEmail(showPreview)}><FiSend /> Send Email</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
