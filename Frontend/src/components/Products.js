import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPackage, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiDollarSign, FiTag, FiBox, FiFilter, FiChevronLeft,
  FiChevronRight, FiAlertCircle, FiCheck, FiMoreVertical,
  FiHash, FiLayers, FiTrendingUp, FiArchive
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './Products.css';

function Products() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', sku: '', category: 'General',
    price: '', costPrice: '', currency: 'USD', stock: '',
    unit: 'pcs', status: 'active', tags: '', specifications: [{ key: '', value: '' }]
  });

  const fetchProducts = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.append('search', search);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);

      const res = await api.get(`/products?${params}`);
      if (res.data.success) {
        setProducts(res.data.products);
        setCategories(res.data.categories || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterCategory, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/products/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const resetForm = () => {
    setForm({
      name: '', description: '', sku: '', category: 'General',
      price: '', costPrice: '', currency: 'USD', stock: '',
      unit: 'pcs', status: 'active', tags: '', specifications: [{ key: '', value: '' }]
    });
    setEditingProduct(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      category: product.category || 'General',
      price: product.price || '',
      costPrice: product.costPrice || '',
      currency: product.currency || 'USD',
      stock: product.stock || '',
      unit: product.unit || 'pcs',
      status: product.status || 'active',
      tags: (product.tags || []).join(', '),
      specifications: product.specifications?.length > 0 ? product.specifications : [{ key: '', value: '' }]
    });
    setEditingProduct(product);
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      stock: parseInt(form.stock) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      specifications: form.specifications.filter(s => s.key && s.value)
    };

    try {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct._id}`, payload);
        if (res.data.success) {
          toast.success('Product updated');
          setShowModal(false);
          fetchProducts(pagination.page);
          fetchStats();
        }
      } else {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          toast.success('Product created');
          setShowModal(false);
          fetchProducts(1);
          fetchStats();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        toast.success('Product deleted');
        setDeleteConfirm(null);
        fetchProducts(pagination.page);
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      const res = await api.delete('/products', { data: { ids: selectedIds } });
      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedIds([]);
        fetchProducts(pagination.page);
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to delete products');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  const addSpecRow = () => {
    setForm(prev => ({
      ...prev,
      specifications: [...prev.specifications, { key: '', value: '' }]
    }));
  };

  const updateSpec = (index, field, value) => {
    setForm(prev => {
      const specs = [...prev.specifications];
      specs[index] = { ...specs[index], [field]: value };
      return { ...prev, specifications: specs };
    });
  };

  const removeSpec = (index) => {
    setForm(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const formatCurrency = (val, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency
    }).format(val || 0);
  };

  const getStatusLabel = (status) => {
    const map = { active: 'Active', inactive: 'Inactive', draft: 'Draft', 'out-of-stock': 'Out of Stock' };
    return map[status] || status;
  };

  const getStatusClass = (status) => {
    const map = { active: 'pd-status-active', inactive: 'pd-status-inactive', draft: 'pd-status-draft', 'out-of-stock': 'pd-status-oos' };
    return map[status] || '';
  };

  return (
    <div className="pd-wrap">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <div className="pd-header-icon">
            <FiPackage />
          </div>
          <div>
            <h1 className="pd-title">Products</h1>
            <p className="pd-subtitle">Manage your product catalog</p>
          </div>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={openCreate}>
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="pd-stats-row">
          <div className="pd-stat-card">
            <FiPackage className="pd-stat-icon" />
            <div>
              <div className="pd-stat-value">{stats.totalProducts}</div>
              <div className="pd-stat-label">Total Products</div>
            </div>
          </div>
          <div className="pd-stat-card">
            <FiCheck className="pd-stat-icon" />
            <div>
              <div className="pd-stat-value">{stats.activeProducts}</div>
              <div className="pd-stat-label">Active</div>
            </div>
          </div>
          <div className="pd-stat-card">
            <FiAlertCircle className="pd-stat-icon" />
            <div>
              <div className="pd-stat-value">{stats.outOfStock}</div>
              <div className="pd-stat-label">Out of Stock</div>
            </div>
          </div>
          <div className="pd-stat-card">
            <FiLayers className="pd-stat-icon" />
            <div>
              <div className="pd-stat-value">{stats.categories}</div>
              <div className="pd-stat-label">Categories</div>
            </div>
          </div>
          <div className="pd-stat-card">
            <FiTrendingUp className="pd-stat-icon" />
            <div>
              <div className="pd-stat-value">{formatCurrency(stats.totalValue)}</div>
              <div className="pd-stat-label">Inventory Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="pd-toolbar">
        <div className="pd-search-box">
          <FiSearch className="pd-search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pd-search-input"
          />
        </div>
        <div className="pd-filters">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="pd-filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pd-filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
          {selectedIds.length > 0 && (
            <button className="pd-btn pd-btn-danger pd-btn-sm" onClick={handleBulkDelete}>
              <FiTrash2 /> Delete ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="pd-table-container">
        {isLoading ? (
          <div className="pd-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="pd-empty">
            <FiPackage className="pd-empty-icon" />
            <h3>No products yet</h3>
            <p>Create your first product to get started</p>
            <button className="pd-btn pd-btn-primary" onClick={openCreate}>
              <FiPlus /> Add Product
            </button>
          </div>
        ) : (
          <table className="pd-table">
            <thead>
              <tr>
                <th className="pd-th-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id} className={selectedIds.includes(product._id) ? 'pd-row-selected' : ''}>
                  <td className="pd-td-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product._id)}
                      onChange={() => toggleSelect(product._id)}
                    />
                  </td>
                  <td>
                    <div className="pd-product-cell" onClick={() => setViewProduct(product)}>
                      <div className="pd-product-avatar">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="pd-product-name">{product.name}</div>
                        {product.description && (
                          <div className="pd-product-desc">{product.description.substring(0, 60)}{product.description.length > 60 ? '...' : ''}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className="pd-sku">{product.sku || '—'}</span></td>
                  <td><span className="pd-category-badge">{product.category}</span></td>
                  <td className="pd-price">{formatCurrency(product.price, product.currency)}</td>
                  <td>
                    <span className={`pd-stock ${product.stock === 0 ? 'pd-stock-zero' : ''}`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td>
                    <span className={`pd-status-badge ${getStatusClass(product.status)}`}>
                      {getStatusLabel(product.status)}
                    </span>
                  </td>
                  <td>
                    <div className="pd-actions-cell">
                      <button
                        className="pd-action-btn"
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === product._id ? null : product._id); }}
                      >
                        <FiMoreVertical />
                      </button>
                      {activeDropdown === product._id && (
                        <div className="pd-dropdown">
                          <button onClick={() => { setViewProduct(product); setActiveDropdown(null); }}>
                            <FiPackage /> View
                          </button>
                          <button onClick={() => openEdit(product)}>
                            <FiEdit2 /> Edit
                          </button>
                          <button className="pd-dropdown-danger" onClick={() => { setDeleteConfirm(product); setActiveDropdown(null); }}>
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pd-pagination">
          <span className="pd-page-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="pd-page-btns">
            <button
              className="pd-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchProducts(pagination.page - 1)}
            >
              <FiChevronLeft />
            </button>
            <span className="pd-page-current">{pagination.page} / {pagination.pages}</span>
            <button
              className="pd-page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchProducts(pagination.page + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="pd-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'New Product'}</h2>
              <button className="pd-modal-close" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-form-grid">
                <div className="pd-form-group pd-col-span-2">
                  <label>Product Name <span className="pd-required">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="pd-form-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. PRD-001"
                  />
                </div>
                <div className="pd-form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Electronics"
                    list="pd-categories"
                  />
                  <datalist id="pd-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="pd-form-group">
                  <label>Selling Price</label>
                  <div className="pd-input-group">
                    <span className="pd-input-prefix"><FiDollarSign /></span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="pd-form-group">
                  <label>Cost Price</label>
                  <div className="pd-input-group">
                    <span className="pd-input-prefix"><FiDollarSign /></span>
                    <input
                      type="number"
                      value={form.costPrice}
                      onChange={e => setForm({ ...form, costPrice: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="pd-form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="pd-form-group">
                  <label>Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="lbs">Pounds</option>
                    <option value="liters">Liters</option>
                    <option value="meters">Meters</option>
                    <option value="boxes">Boxes</option>
                    <option value="sets">Sets</option>
                    <option value="units">Units</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>
                <div className="pd-form-group pd-col-span-2">
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>
                <div className="pd-form-group pd-col-span-2">
                  <label>Tags</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="Comma separated tags, e.g. new, featured, sale"
                  />
                </div>

                {/* Specifications */}
                <div className="pd-form-group pd-col-span-2">
                  <label>Specifications</label>
                  <div className="pd-specs-list">
                    {form.specifications.map((spec, idx) => (
                      <div key={idx} className="pd-spec-row">
                        <input
                          type="text"
                          value={spec.key}
                          onChange={e => updateSpec(idx, 'key', e.target.value)}
                          placeholder="e.g. Weight"
                        />
                        <input
                          type="text"
                          value={spec.value}
                          onChange={e => updateSpec(idx, 'value', e.target.value)}
                          placeholder="e.g. 500g"
                        />
                        <button className="pd-spec-remove" onClick={() => removeSpec(idx)}>
                          <FiX />
                        </button>
                      </div>
                    ))}
                    <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={addSpecRow}>
                      <FiPlus /> Add Specification
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn pd-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pd-btn pd-btn-primary" onClick={handleSave}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {viewProduct && (
        <div className="pd-modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="pd-modal pd-modal-view" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <h2>{viewProduct.name}</h2>
              <button className="pd-modal-close" onClick={() => setViewProduct(null)}>
                <FiX />
              </button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-view-grid">
                <div className="pd-view-item">
                  <span className="pd-view-label">SKU</span>
                  <span className="pd-view-value">{viewProduct.sku || '—'}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Category</span>
                  <span className="pd-view-value">{viewProduct.category}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Selling Price</span>
                  <span className="pd-view-value">{formatCurrency(viewProduct.price, viewProduct.currency)}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Cost Price</span>
                  <span className="pd-view-value">{formatCurrency(viewProduct.costPrice, viewProduct.currency)}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Stock</span>
                  <span className="pd-view-value">{viewProduct.stock} {viewProduct.unit}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Status</span>
                  <span className={`pd-status-badge ${getStatusClass(viewProduct.status)}`}>
                    {getStatusLabel(viewProduct.status)}
                  </span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Currency</span>
                  <span className="pd-view-value">{viewProduct.currency}</span>
                </div>
                <div className="pd-view-item">
                  <span className="pd-view-label">Created</span>
                  <span className="pd-view-value">{new Date(viewProduct.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {viewProduct.description && (
                <div className="pd-view-desc">
                  <span className="pd-view-label">Description</span>
                  <p>{viewProduct.description}</p>
                </div>
              )}
              {viewProduct.tags?.length > 0 && (
                <div className="pd-view-tags">
                  <span className="pd-view-label">Tags</span>
                  <div className="pd-tag-list">
                    {viewProduct.tags.map((tag, i) => (
                      <span key={i} className="pd-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewProduct.specifications?.length > 0 && (
                <div className="pd-view-specs">
                  <span className="pd-view-label">Specifications</span>
                  <div className="pd-specs-table">
                    {viewProduct.specifications.map((spec, i) => (
                      <div key={i} className="pd-spec-view-row">
                        <span className="pd-spec-key">{spec.key}</span>
                        <span className="pd-spec-val">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn pd-btn-ghost" onClick={() => setViewProduct(null)}>Close</button>
              <button className="pd-btn pd-btn-primary" onClick={() => { openEdit(viewProduct); setViewProduct(null); }}>
                <FiEdit2 /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="pd-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="pd-modal pd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header pd-modal-header-danger">
              <h2>Delete Product</h2>
              <button className="pd-modal-close" onClick={() => setDeleteConfirm(null)}>
                <FiX />
              </button>
            </div>
            <div className="pd-modal-body">
              <p className="pd-delete-msg">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn pd-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="pd-btn pd-btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>
                <FiTrash2 /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
