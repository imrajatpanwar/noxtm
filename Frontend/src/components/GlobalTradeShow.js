import React, { useState } from 'react';
import './GlobalTradeShow.css';

function GlobalTradeShow() {
  const [shows, setShows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    showName: '',
    showLocation: '',
    showDate: '',
    showDescription: '',
    showLogo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);

  const handleAddShowClick = () => {
    setShowForm(!showForm);
    if (showForm) {
      // Reset form when closing
      setFormData({
        showName: '',
        showLocation: '',
        showDate: '',
        showDescription: '',
        showLogo: null
      });
      setLogoPreview(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        showLogo: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.showName || !formData.showLocation || !formData.showDate) {
      alert('Please fill in all required fields');
      return;
    }

    // Add new show to the list
    const newShow = {
      id: Date.now(),
      name: formData.showName,
      location: formData.showLocation,
      date: formData.showDate,
      description: formData.showDescription,
      logo: logoPreview
    };

    setShows(prev => [...prev, newShow]);
    
    // Reset form
    setFormData({
      showName: '',
      showLocation: '',
      showDate: '',
      showDescription: '',
      showLogo: null
    });
    setLogoPreview(null);
    setShowForm(false);
  };

  const handleDeleteShow = (id) => {
    setShows(prev => prev.filter(show => show.id !== id));
  };

  const handleEditShow = (id) => {
    const showToEdit = shows.find(show => show.id === id);
    if (showToEdit) {
      setFormData({
        showName: showToEdit.name,
        showLocation: showToEdit.location,
        showDate: showToEdit.date,
        showDescription: showToEdit.description,
        showLogo: null
      });
      setLogoPreview(showToEdit.logo);
      setShowForm(true);
      handleDeleteShow(id);
    }
  };

  return (
    <div className="global-trade-show-container">
      <div className="gts-header">
        <h1 className="gts-title">Global Trade Shows</h1>
        <p className="gts-subtitle">Manage and track global trade shows and exhibitions</p>
      </div>

      {/* Add Show Button Section */}
      <div className="gts-action-bar">
        <button 
          onClick={handleAddShowClick}
          className={`gts-btn gts-btn-primary ${showForm ? 'active' : ''}`}
        >
          {showForm ? '✕ Cancel' : '+ Add Trade Show'}
        </button>
        <div className="gts-stats">
          <span className="gts-stat">Total Shows: <strong>{shows.length}</strong></span>
        </div>
      </div>

      {/* Add Show Form */}
      {showForm && (
        <div className="gts-form-container">
          <form onSubmit={handleSubmit} className="gts-form">
            <div className="gts-form-grid">
              <div className="gts-form-group">
                <label className="gts-label">
                  Trade Show Name <span className="gts-required">*</span>
                </label>
                <input
                  type="text"
                  name="showName"
                  value={formData.showName}
                  onChange={handleInputChange}
                  placeholder="e.g., International Tech Expo 2025"
                  required
                  className="gts-input"
                />
              </div>

              <div className="gts-form-group">
                <label className="gts-label">
                  Location <span className="gts-required">*</span>
                </label>
                <input
                  type="text"
                  name="showLocation"
                  value={formData.showLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Las Vegas, USA"
                  required
                  className="gts-input"
                />
              </div>

              <div className="gts-form-group">
                <label className="gts-label">
                  Date <span className="gts-required">*</span>
                </label>
                <input
                  type="date"
                  name="showDate"
                  value={formData.showDate}
                  onChange={handleInputChange}
                  required
                  className="gts-input"
                />
              </div>

              <div className="gts-form-group">
                <label className="gts-label">Trade Show Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="gts-input gts-file-input"
                />
              </div>
            </div>

            <div className="gts-form-group">
              <label className="gts-label">Description</label>
              <textarea
                name="showDescription"
                value={formData.showDescription}
                onChange={handleInputChange}
                placeholder="Add details about this trade show..."
                className="gts-textarea"
                rows="4"
              />
            </div>

            {logoPreview && (
              <div className="gts-logo-preview">
                <p className="gts-preview-label">Logo Preview:</p>
                <img 
                  src={logoPreview} 
                  alt="Logo Preview" 
                  className="gts-preview-image"
                />
              </div>
            )}

            <div className="gts-form-actions">
              <button
                type="submit"
                className="gts-btn gts-btn-success"
              >
                Save Trade Show
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shows List */}
      {shows.length > 0 ? (
        <div className="gts-list-container">
          <h2 className="gts-list-title">Registered Trade Shows ({shows.length})</h2>
          <div className="gts-grid">
            {shows.map(show => (
              <div 
                key={show.id}
                className="gts-card"
              >
                <div className="gts-card-header">
                  {show.logo && (
                    <div className="gts-card-logo">
                      <img 
                        src={show.logo} 
                        alt={show.name}
                        className="gts-card-logo-image"
                      />
                    </div>
                  )}
                </div>
                
                <div className="gts-card-body">
                  <h3 className="gts-card-title">{show.name}</h3>
                  
                  <div className="gts-card-detail">
                    <span className="gts-detail-label">📍 Location:</span>
                    <span className="gts-detail-value">{show.location}</span>
                  </div>
                  
                  <div className="gts-card-detail">
                    <span className="gts-detail-label">📅 Date:</span>
                    <span className="gts-detail-value">{new Date(show.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  
                  {show.description && (
                    <div className="gts-card-description">
                      <p>{show.description}</p>
                    </div>
                  )}
                </div>

                <div className="gts-card-actions">
                  <button
                    onClick={() => handleEditShow(show.id)}
                    className="gts-btn-icon gts-btn-edit"
                    title="Edit"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteShow(show.id)}
                    className="gts-btn-icon gts-btn-delete"
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !showForm && (
          <div className="gts-empty-state">
            <div className="gts-empty-icon">🌍</div>
            <h3>No Trade Shows Yet</h3>
            <p>Get started by adding your first global trade show</p>
          </div>
        )
      )}
    </div>
  );
}

export default GlobalTradeShow;
