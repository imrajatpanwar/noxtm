import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiSearch, FiPlus, FiEdit3, FiTrash2, FiFileText, 
  FiDollarSign, FiCalendar, FiDownload, FiEye 
} from 'react-icons/fi';
import { toast } from 'sonner';
import './InvoiceManagement.css';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    companyName: '',
    email: '',
    phone: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    dueDate: '',
    notes: ''
  });

  const fetchInvoices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/invoices';
      
      const params = new URLSearchParams();
      if (filterStatus !== 'All') {
        params.append('status', filterStatus.toLowerCase());
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const resetForm = () => {
    setInvoiceForm({
      clientName: '',
      companyName: '',
      email: '',
      phone: '',
      items: [{ description: '', quantity: 1, price: 0 }],
      dueDate: '',
      notes: ''
    });
    setEditingInvoice(null);
  };

  const handleAddItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (invoiceForm.items.length > 1) {
      setInvoiceForm({
        ...invoiceForm,
        items: invoiceForm.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleUpdateItem = (index, field, value) => {
    const updatedItems = invoiceForm.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setInvoiceForm({ ...invoiceForm, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return invoiceForm.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
    }, 0);
  };

  const calculateTax = (subtotal) => {
    return subtotal * 0.1; // 10% tax
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const invoiceData = {
      clientName: invoiceForm.clientName,
      companyName: invoiceForm.companyName,
      email: invoiceForm.email,
      phone: invoiceForm.phone,
      items: invoiceForm.items,
      dueDate: invoiceForm.dueDate,
      notes: invoiceForm.notes
    };

    try {
      const token = localStorage.getItem('token');
      const url = editingInvoice ? `/api/invoices/${editingInvoice._id || editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save invoice');
      }
      
      const savedInvoice = await response.json();
      
      if (editingInvoice) {
        setInvoices(invoices.map(inv => 
          (inv._id || inv.id) === (savedInvoice._id || savedInvoice.id) ? savedInvoice : inv
        ));
        toast.success('Invoice updated successfully');
      } else {
        setInvoices([savedInvoice, ...invoices]);
        toast.success('Invoice created successfully');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      clientName: invoice.clientName,
      companyName: invoice.companyName,
      email: invoice.email,
      phone: invoice.phone,
      items: invoice.items,
      dueDate: invoice.dueDate,
      notes: invoice.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }
      
      setInvoices(invoices.filter(inv => (inv._id || inv.id) !== invoiceId));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      toast.success('Generating PDF...');
      const token = localStorage.getItem('token');
      const invoiceId = invoice._id || invoice.id;
      
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updatedInvoice = await response.json();
      setInvoices(invoices.map(inv => 
        (inv._id || inv.id) === invoiceId ? updatedInvoice : inv
      ));
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || invoice.status === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    pending: invoices.filter(inv => inv.status === 'pending').length,
    overdue: invoices.filter(inv => inv.status === 'overdue').length,
    totalRevenue: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0)
  };

  return (
    <div className="im-container">
      <div className="im-header">
        <div className="im-title-section">
          <h1 className="im-title">Invoice Management</h1>
          <p className="im-subtitle">Create, manage and track your invoices</p>
        </div>
        <button className="im-add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Create Invoice
        </button>
      </div>

      {/* Statistics */}
      <div className="im-stats">
        <div className="im-stat-card">
          <div className="im-stat-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}>
            <FiFileText />
          </div>
          <div className="im-stat-content">
            <span className="im-stat-label">Total Invoices</span>
            <span className="im-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="im-stat-card">
          <div className="im-stat-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
            <FiDollarSign />
          </div>
          <div className="im-stat-content">
            <span className="im-stat-label">Total Revenue</span>
            <span className="im-stat-value">${stats.totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="im-stat-card">
          <div className="im-stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
            <FiFileText />
          </div>
          <div className="im-stat-content">
            <span className="im-stat-label">Paid</span>
            <span className="im-stat-value">{stats.paid}</span>
          </div>
        </div>
        <div className="im-stat-card">
          <div className="im-stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
            <FiFileText />
          </div>
          <div className="im-stat-content">
            <span className="im-stat-label">Pending</span>
            <span className="im-stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="im-stat-card">
          <div className="im-stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <FiFileText />
          </div>
          <div className="im-stat-content">
            <span className="im-stat-label">Overdue</span>
            <span className="im-stat-value">{stats.overdue}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="im-filters">
        <div className="im-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by invoice ID, client name, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="im-status-filters">
          {['All', 'Paid', 'Pending', 'Overdue'].map(status => (
            <button
              key={status}
              className={`im-filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="im-table-container">
        <table className="im-table">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Client</th>
              <th>Company</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="im-no-data-row">
                  <div className="im-no-data">
                    <FiFileText size={48} />
                    <h3>No Invoices Found</h3>
                    <p>Create your first invoice to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>
                    <span className="im-invoice-id">{invoice.id}</span>
                  </td>
                  <td>{invoice.clientName}</td>
                  <td>{invoice.companyName}</td>
                  <td>
                    <span className="im-amount">${invoice.total.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={`im-status-badge ${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <span className="im-date">
                      <FiCalendar /> {invoice.dueDate}
                    </span>
                  </td>
                  <td>
                    <div className="im-actions">
                      <button 
                        className="im-action-btn view"
                        onClick={() => setShowPreview(invoice)}
                        title="Preview"
                      >
                        <FiEye />
                      </button>
                      <button 
                        className="im-action-btn download"
                        onClick={() => handleDownloadPDF(invoice)}
                        title="Download PDF"
                      >
                        <FiDownload />
                      </button>
                      <button 
                        className="im-action-btn edit"
                        onClick={() => handleEdit(invoice)}
                        title="Edit"
                      >
                        <FiEdit3 />
                      </button>
                      <button 
                        className="im-action-btn delete"
                        onClick={() => handleDelete(invoice._id || invoice.id)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="im-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="im-modal" onClick={(e) => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
              <button className="im-modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="im-modal-form">
              {/* Client Details */}
              <div className="im-form-section">
                <h3>Client Details</h3>
                <div className="im-form-grid">
                  <div className="im-form-group">
                    <label>Client Name *</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.clientName}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                    />
                  </div>
                  <div className="im-form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.companyName}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, companyName: e.target.value })}
                    />
                  </div>
                  <div className="im-form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      required
                      value={invoiceForm.email}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, email: e.target.value })}
                    />
                  </div>
                  <div className="im-form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      required
                      value={invoiceForm.phone}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="im-form-section">
                <h3>Line Items</h3>
                <div className="im-items-list">
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="im-item-row">
                      <div className="im-item-number">{index + 1}</div>
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                        min="1"
                        required
                        className="im-item-qty"
                      />
                      <div className="im-price-input">
                        <span>$</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <span className="im-item-total">
                        ${((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
                      </span>
                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          className="im-remove-item-btn"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="im-add-item-btn" onClick={handleAddItem}>
                  <FiPlus /> Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="im-form-section">
                <div className="im-totals">
                  <div className="im-total-row">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="im-total-row">
                    <span>Tax (10%):</span>
                    <span>${calculateTax(calculateSubtotal()).toFixed(2)}</span>
                  </div>
                  <div className="im-total-row im-total-final">
                    <span>Total:</span>
                    <span>${(calculateSubtotal() + calculateTax(calculateSubtotal())).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="im-form-section">
                <div className="im-form-grid">
                  <div className="im-form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="im-form-group im-full-width">
                    <label>Notes</label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                      rows="3"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="im-modal-actions">
                <button type="button" className="im-btn-cancel" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="im-btn-submit">
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="im-modal-overlay" onClick={() => setShowPreview(null)}>
          <div className="im-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Invoice Preview</h2>
              <button className="im-modal-close" onClick={() => setShowPreview(null)}>×</button>
            </div>
            <div className="im-preview-content">
              <div className="im-preview-header">
                <h1>INVOICE</h1>
                <span className="im-preview-id">{showPreview.id}</span>
              </div>
              
              <div className="im-preview-info">
                <div>
                  <h4>Bill To:</h4>
                  <p><strong>{showPreview.clientName}</strong></p>
                  <p>{showPreview.companyName}</p>
                  <p>{showPreview.email}</p>
                  <p>{showPreview.phone}</p>
                </div>
                <div>
                  <p><strong>Date:</strong> {showPreview.createdAt}</p>
                  <p><strong>Due Date:</strong> {showPreview.dueDate}</p>
                  <p><strong>Status:</strong> <span className={`im-status-badge ${showPreview.status}`}>{showPreview.status}</span></p>
                </div>
              </div>

              <table className="im-preview-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {showPreview.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>${item.price.toFixed(2)}</td>
                      <td>${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="im-preview-totals">
                <div className="im-preview-total-row">
                  <span>Subtotal:</span>
                  <span>${showPreview.subtotal.toFixed(2)}</span>
                </div>
                <div className="im-preview-total-row">
                  <span>Tax:</span>
                  <span>${showPreview.tax.toFixed(2)}</span>
                </div>
                <div className="im-preview-total-row im-preview-final">
                  <span>Total:</span>
                  <span>${showPreview.total.toFixed(2)}</span>
                </div>
              </div>

              {showPreview.notes && (
                <div className="im-preview-notes">
                  <h4>Notes:</h4>
                  <p>{showPreview.notes}</p>
                </div>
              )}

              <button className="im-preview-download" onClick={() => handleDownloadPDF(showPreview)}>
                <FiDownload /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
