import React, { useState, useEffect, useCallback } from 'react';
import './BlogList.css';
import api from '../config/api';

function BlogList({ onEdit, onCreateNew }) {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      params.append('page', filters.page);
      params.append('limit', '10');

      const response = await api.get(`/blogs?${params}`);
      setBlogs(response.data.blogs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load blogs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadBlogs();
    loadCategories();
  }, [loadBlogs, loadCategories]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/blogs/${blogId}`);
      loadBlogs(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete blog:', error);
      alert('Failed to delete blog post. Please try again.');
    }
  };

  const handleStatusChange = async (blogId, newStatus) => {
    try {
      await api.put(`/blogs/${blogId}`, { status: newStatus });
      loadBlogs(); // Refresh the list
    } catch (error) {
      console.error('Failed to update blog status:', error);
      alert('Failed to update blog status. Please try again.');
    }
  };

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.metaDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { class: 'status-draft', text: 'Draft' },
      published: { class: 'status-published', text: 'Published' },
      archived: { class: 'status-archived', text: 'Archived' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  return (
    <div className="blog-list">
      <div className="blog-list-header">
        <div className="header-content">
          <h2>Blog Management</h2>
          <button className="btn-primary" onClick={onCreateNew}>
            Create New Blog
          </button>
        </div>
        
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading blogs...</div>
      ) : (
        <>
          <div className="blogs-grid">
            {filteredBlogs.length === 0 ? (
              <div className="empty-state">
                <h3>No blogs found</h3>
                <p>
                  {searchTerm || filters.status !== 'all' || filters.category !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by creating your first blog post.'
                  }
                </p>
                {!searchTerm && filters.status === 'all' && filters.category === 'all' && (
                  <button className="btn-primary" onClick={onCreateNew}>
                    Create Your First Blog
                  </button>
                )}
              </div>
            ) : (
              filteredBlogs.map(blog => (
                <div key={blog._id} className="blog-card">
                  <div className="blog-card-header">
                    {blog.featuredImage && (
                      <div className="blog-image">
                        <img 
                          src={`${api.defaults.baseURL}${blog.featuredImage.path}`} 
                          alt={blog.featuredImage.altText || blog.title}
                        />
                      </div>
                    )}
                    <div className="blog-meta">
                      {getStatusBadge(blog.status)}
                      <span className="blog-category">{blog.category?.name}</span>
                    </div>
                  </div>
                  
                  <div className="blog-card-content">
                    <h3 className="blog-title">{blog.title}</h3>
                    <p className="blog-description">{blog.metaDescription}</p>
                    
                    <div className="blog-stats">
                      <span className="blog-stat">
                        <strong>{blog.views}</strong> views
                      </span>
                      <span className="blog-stat">
                        <strong>{blog.keywords?.length || 0}</strong> keywords
                      </span>
                    </div>
                    
                    <div className="blog-info">
                      <span className="blog-author">By {blog.author?.username}</span>
                      <span className="blog-date">{formatDate(blog.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="blog-card-actions">
                    <div className="status-actions">
                      {blog.status === 'draft' && (
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleStatusChange(blog._id, 'published')}
                        >
                          Publish
                        </button>
                      )}
                      {blog.status === 'published' && (
                        <button
                          className="btn-small btn-warning"
                          onClick={() => handleStatusChange(blog._id, 'archived')}
                        >
                          Archive
                        </button>
                      )}
                      {blog.status === 'archived' && (
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleStatusChange(blog._id, 'published')}
                        >
                          Republish
                        </button>
                      )}
                    </div>
                    
                    <div className="edit-actions">
                      <button
                        className="btn-small btn-secondary"
                        onClick={() => onEdit(blog._id)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(blog._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
                ({pagination.totalBlogs} total blogs)
              </span>
              
              <button
                className="btn-secondary"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BlogList;