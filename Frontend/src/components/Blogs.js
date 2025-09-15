import React, { useState } from 'react';
import BlogList from './BlogList';
import BlogEditor from './BlogEditor';
import CategoryManager from './CategoryManager';
import './Blogs.css';

function Blogs() {
  const [currentView, setCurrentView] = useState('list');
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const handleCreateNew = () => {
    setEditingBlogId(null);
    setCurrentView('editor');
  };

  const handleEdit = (blogId) => {
    setEditingBlogId(blogId);
    setCurrentView('editor');
  };

  const handleSave = (savedBlog) => {
    console.log('Blog saved:', savedBlog);
    setCurrentView('list');
    setEditingBlogId(null);
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingBlogId(null);
  };

  const handleShowCategories = () => {
    setShowCategoryManager(true);
  };

  const handleCloseCategoriesManager = () => {
    setShowCategoryManager(false);
  };

  return (
    <div className="blogs-container">
      {currentView === 'list' && (
        <div>
          <div className="blogs-actions">
            <button className="btn-secondary" onClick={handleShowCategories}>
              Manage Categories
            </button>
          </div>
          <BlogList onEdit={handleEdit} onCreateNew={handleCreateNew} />
        </div>
      )}
      
      {currentView === 'editor' && (
        <BlogEditor 
          blogId={editingBlogId} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
      )}

      {showCategoryManager && (
        <CategoryManager onClose={handleCloseCategoriesManager} />
      )}
    </div>
  );
}

export default Blogs;
