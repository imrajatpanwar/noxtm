import React, { useState, useEffect, useCallback } from 'react';
import './BlogEditor.css';
import api from '../config/api';

function BlogEditor({ blogId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    metaDescription: '',
    keywords: '',
    category: '',
    content: '',
    status: 'draft',
    altText: ''
  });
  const [categories, setCategories] = useState([]);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [slug, setSlug] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadBlog = useCallback(async () => {
    if (!blogId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/blogs/${blogId}`);
      const blog = response.data;
      
      setFormData({
        title: blog.title,
        metaDescription: blog.metaDescription,
        keywords: blog.keywords.join(', '),
        category: blog.category._id,
        content: blog.content,
        status: blog.status,
        altText: blog.featuredImage?.altText || ''
      });
      
      if (blog.featuredImage?.path) {
        setImagePreview(`${api.defaults.baseURL}${blog.featuredImage.path}`);
      }
    } catch (error) {
      console.error('Failed to load blog:', error);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    loadCategories();
    loadBlog();
  }, [loadCategories, loadBlog]);

  useEffect(() => {
    // Auto-generate slug from title
    if (formData.title) {
      const generatedSlug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setSlug(`/blog/${generatedSlug}`);
    } else {
      setSlug('');
    }
  }, [formData.title]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFeaturedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 60) {
      newErrors.title = 'Title must be 60 characters or less';
    }
    
    if (!formData.metaDescription) {
      newErrors.metaDescription = 'Meta description is required';
    } else if (formData.metaDescription.length > 160) {
      newErrors.metaDescription = 'Meta description must be 160 characters or less';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.content) {
      newErrors.content = 'Content is required';
    }
    
    if (formData.keywords) {
      const keywordCount = formData.keywords.split(',').filter(k => k.trim()).length;
      if (keywordCount > 5) {
        newErrors.keywords = 'Maximum 5 keywords allowed';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('metaDescription', formData.metaDescription);
      formDataToSend.append('keywords', formData.keywords);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('altText', formData.altText);
      
      if (featuredImage) {
        formDataToSend.append('featuredImage', featuredImage);
      }
      
      let response;
      if (blogId) {
        response = await api.put(`/blogs/${blogId}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await api.post('/blogs', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      if (onSave) {
        onSave(response.data);
      }
    } catch (error) {
      console.error('Failed to save blog:', error);
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && blogId) {
    return <div className="loading">Loading blog...</div>;
  }

  return (
    <div className="blog-editor">
      <div className="editor-header">
        <h2>{blogId ? 'Edit Blog Post' : 'Create New Blog Post'}</h2>
        <div className="editor-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="blog-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">
              SEO Title <span className="char-count">({formData.title.length}/60)</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              maxLength={60}
              placeholder="Enter blog title (50-60 characters recommended)"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
            {slug && <div className="slug-preview">URL: <code>{slug}</code></div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="metaDescription">
              Meta Description <span className="char-count">({formData.metaDescription.length}/160)</span>
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              value={formData.metaDescription}
              onChange={handleInputChange}
              maxLength={160}
              rows={3}
              placeholder="Enter meta description (150-160 characters recommended)"
              className={errors.metaDescription ? 'error' : ''}
            />
            {errors.metaDescription && <span className="error-message">{errors.metaDescription}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-group half">
            <label htmlFor="keywords">
              Keywords/Tags <span className="helper-text">(Max 5, comma separated)</span>
            </label>
            <input
              type="text"
              id="keywords"
              name="keywords"
              value={formData.keywords}
              onChange={handleInputChange}
              placeholder="keyword1, keyword2, keyword3"
              className={errors.keywords ? 'error' : ''}
            />
            {errors.keywords && <span className="error-message">{errors.keywords}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="featuredImage">Featured Image</label>
            <div className="image-upload-area">
              <input
                type="file"
                id="featuredImage"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              <label htmlFor="featuredImage" className="file-input-label">
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </label>
              
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Featured" />
                  <button 
                    type="button" 
                    className="remove-image"
                    onClick={() => {
                      setImagePreview('');
                      setFeaturedImage(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {(imagePreview || featuredImage) && (
              <div className="form-group">
                <label htmlFor="altText">Image Alt Text</label>
                <input
                  type="text"
                  id="altText"
                  name="altText"
                  value={formData.altText}
                  onChange={handleInputChange}
                  placeholder="Describe the image for accessibility"
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={15}
              placeholder="Write your blog content here... Use proper HTML structure:
&#10;&#10;&lt;h1&gt;Main Title&lt;/h1&gt;
&#10;&lt;p&gt;Introduction paragraph...&lt;/p&gt;
&#10;&#10;&lt;h2&gt;Section Heading&lt;/h2&gt;
&#10;&lt;p&gt;Section content...&lt;/p&gt;
&#10;&#10;&lt;h3&gt;Subsection&lt;/h3&gt;
&#10;&lt;p&gt;Subsection content...&lt;/p&gt;"
              className={errors.content ? 'error' : ''}
            />
            {errors.content && <span className="error-message">{errors.content}</span>}
            <div className="content-help">
              <p><strong>HTML Structure Tips:</strong></p>
              <ul>
                <li>Use &lt;h1&gt; for the main title</li>
                <li>Use &lt;h2&gt; for section headings</li>
                <li>Use &lt;h3&gt; for subsections</li>
                <li>Wrap paragraphs in &lt;p&gt; tags</li>
                <li>Use &lt;ul&gt; and &lt;li&gt; for lists</li>
                <li>Use &lt;strong&gt; and &lt;em&gt; for emphasis</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (blogId ? 'Update Blog' : 'Create Blog')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BlogEditor;