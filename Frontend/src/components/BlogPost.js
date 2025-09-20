import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './BlogPost.css';
import api from '../config/api';

function BlogPost() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBlog = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/blogs/${slug}`);
      setBlog(response.data);
      
      // Update document title and meta description for SEO
      document.title = `${response.data.title} - Noxtm`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', response.data.metaDescription);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = response.data.metaDescription;
        document.getElementsByTagName('head')[0].appendChild(meta);
      }

      // Add keywords meta tag
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (response.data.keywords && response.data.keywords.length > 0) {
        const keywordsString = response.data.keywords.join(', ');
        if (metaKeywords) {
          metaKeywords.setAttribute('content', keywordsString);
        } else {
          const meta = document.createElement('meta');
          meta.name = 'keywords';
          meta.content = keywordsString;
          document.getElementsByTagName('head')[0].appendChild(meta);
        }
      }

    } catch (error) {
      console.error('Failed to load blog:', error);
      setError('Blog post not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      loadBlog();
    }
  }, [slug, loadBlog]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="blog-post-container">
        <div className="loading">Loading blog post...</div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="blog-post-container">
        <div className="error-state">
          <h1>Blog Post Not Found</h1>
          <p>{error || 'The blog post you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-post-container">
      <article className="blog-post">
        <header className="blog-header">
          <div className="blog-meta-info">
            <span className="blog-category">{blog.category?.name}</span>
            <span className="blog-date">{formatDate(blog.publishedAt || blog.createdAt)}</span>
            <span className="blog-author">By {blog.author?.username}</span>
          </div>
          
          <h1 className="blog-title">{blog.title}</h1>
          
          {blog.featuredImage && (
            <div className="blog-featured-image">
              <img 
                src={`${api.defaults.baseURL}${blog.featuredImage.path}`}
                alt={blog.featuredImage.altText || blog.title}
              />
            </div>
          )}

          <div className="blog-description">
            <p>{blog.metaDescription}</p>
          </div>

          {blog.keywords && blog.keywords.length > 0 && (
            <div className="blog-keywords">
              <span className="keywords-label">Tags:</span>
              {blog.keywords.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="blog-content">
          <div 
            className="content-html"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </div>

        <footer className="blog-footer">
          <div className="blog-stats">
            <span className="view-count">{blog.views} views</span>
          </div>
          
          <div className="blog-share">
            <span>Share this post:</span>
            <button 
              className="share-button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: blog.title,
                    text: blog.metaDescription,
                    url: window.location.href
                  });
                } else {
                  // Fallback to copying URL
                  navigator.clipboard.writeText(window.location.href);
                  alert('URL copied to clipboard!');
                }
              }}
            >
              Share
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}

export default BlogPost;