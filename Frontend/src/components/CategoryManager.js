import React, { useState, useEffect } from 'react';
import './CategoryManager.css';
import api from '../config/api';

function CategoryManager({ onClose }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/categories', {
        name: newCategory.name.trim(),
        description: newCategory.description.trim()
      });
      
      setNewCategory({ name: '', description: '' });
      setError('');
      loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      setError(error.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="category-manager">
      <div className="category-manager-content">
        <div className="category-header">
          <h2>Category Management</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="category-form-section">
          <h3>Create New Category</h3>
          <form onSubmit={handleCreateCategory} className="category-form">
            <div className="form-group">
              <label htmlFor="categoryName">Category Name</label>
              <input
                type="text"
                id="categoryName"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
                required
              />
              {newCategory.name && (
                <div className="slug-preview">
                  Slug: <code>/blog/category/{generateSlug(newCategory.name)}</code>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="categoryDescription">Description (Optional)</label>
              <textarea
                id="categoryDescription"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        <div className="categories-list-section">
          <h3>Existing Categories</h3>
          
          {loading ? (
            <div className="loading">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <p>No categories created yet.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map(category => (
                <div key={category._id} className="category-card">
                  <div className="category-info">
                    <h4 className="category-name">{category.name}</h4>
                    <p className="category-slug">Slug: {category.slug}</p>
                    {category.description && (
                      <p className="category-description">{category.description}</p>
                    )}
                  </div>
                  <div className="category-meta">
                    <span className="category-date">
                      Created: {new Date(category.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryManager;