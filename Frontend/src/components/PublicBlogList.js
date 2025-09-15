import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './PublicBlogList.css';
import api from '../config/api';

function PublicBlogList() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    page: 1
  });
  const [pagination, setPagination] = useState({});

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      params.append('status', 'published'); // Only show published blogs
      if (filters.category !== 'all') params.append('category', filters.category);
      params.append('page', filters.page);
      params.append('limit', '12');

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

  useEffect(() => {
    // Set SEO meta tags for the blog listing page
    document.title = 'Blog - Noxtm Studio';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Discover insights, tips, and latest updates from Noxtm Studio. Read our blog posts on digital marketing, web development, and business growth.');
    }
  }, []);

  const handleCategoryFilter = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      category: categoryId,
      page: 1
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="public-blog-list">
      <div className="blog-header">
        <h1>Our Blog</h1>
        <p>Discover insights, tips, and latest updates from our team</p>
      </div>

      <div className="blog-filters">
        <button
          className={`filter-btn ${filters.category === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryFilter('all')}
        >
          All Posts
        </button>
        {categories.map(category => (
          <button
            key={category._id}
            className={`filter-btn ${filters.category === category._id ? 'active' : ''}`}
            onClick={() => handleCategoryFilter(category._id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading blog posts...</div>
      ) : (
        <>
          {blogs.length === 0 ? (
            <div className="empty-state">
              <h3>No blog posts found</h3>
              <p>Check back soon for new content!</p>
            </div>
          ) : (
            <div className="blog-grid">
              {blogs.map(blog => (
                <article key={blog._id} className="blog-card">
                  <Link to={`/blog/${blog.slug}`} className="blog-card-link">
                    {blog.featuredImage && (
                      <div className="blog-card-image">
                        <img 
                          src={`${api.defaults.baseURL}${blog.featuredImage.path}`}
                          alt={blog.featuredImage.altText || blog.title}
                        />
                      </div>
                    )}
                    
                    <div className="blog-card-content">
                      <div className="blog-card-meta">
                        <span className="blog-card-category">
                          {blog.category?.name}
                        </span>
                        <span className="blog-card-date">
                          {formatDate(blog.publishedAt || blog.createdAt)}
                        </span>
                      </div>
                      
                      <h2 className="blog-card-title">
                        {truncateText(blog.title, 60)}
                      </h2>
                      
                      <p className="blog-card-description">
                        {truncateText(blog.metaDescription, 120)}
                      </p>
                      
                      <div className="blog-card-footer">
                        <span className="blog-card-author">
                          By {blog.author?.username}
                        </span>
                        <span className="blog-card-views">
                          {blog.views} views
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPreviousPage}
              >
                ← Previous
              </button>
              
              <span className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <button
                className="pagination-btn"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNextPage}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PublicBlogList;