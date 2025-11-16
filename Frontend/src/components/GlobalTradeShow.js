import React, { useState, useEffect } from 'react';
import './GlobalTradeShow.css';
import noTradeShowImage from './image/no-tradeshow.svg';
import uploadIcon from './image/upload_icon.svg';
import defaultAvatar from './image/default-avatar.svg';
import { FiDownload } from 'react-icons/fi';

function GlobalTradeShow({ onNavigate }) {
  const [shows, setShows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [showLeadsAccessDropdown, setShowLeadsAccessDropdown] = useState(false);
  const [selectedShowAccessUsers, setSelectedShowAccessUsers] = useState([]);
  const [selectedShowLeadsAccessUsers, setSelectedShowLeadsAccessUsers] = useState([]);
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const [formData, setFormData] = useState({
    shortName: '',
    fullName: '',
    showDate: '',
    location: '',
    exhibitors: '',
    attendees: '',
    floorPlan: null,
    eacDeadline: '',
    earlyBirdDeadline: '',
    industry: '',
    showAccessPeople: '',
    showLeadsAccessPeople: '',
    showLogo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [showAboutPanel, setShowAboutPanel] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [industryDropdownPosition, setIndustryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const industryInputRef = React.useRef(null);

  const industryOptions = [
    'Solar-Energy Industry',
    'Fashion Industry',
    'Rail Industry',
    'Education Industry',
    'Technology Industry',
    'Cleaning Management Industry',
    'Retail Industry',
    'Wedding Industry',
    'Travel & Tourism Industry',
    'Minerals Industry',
    'Future Battery Technology',
    'Food Industry',
    'Agriculture Industry',
    'Sports Industry',
    'Investment Industry',
    'Electric Mobility',
    'Oil & Gas Industry',
    'Air Travel Industry',
    'Global Retail Industry',
    'Healthcare Industry',
    'Automotive Industry',
    'Electrical Manufacturing',
    'Job and Career Industry',
    'Aerospace and Defense Industry',
    'Manufacturing Industry',
    'Finance Industry',
    'Beauty Industry',
    'Battery Technology Industry',
    'Autonomous Vehicle Industry',
    'Other Industry'
  ];

  // Fetch company users and trade shows on component mount
  useEffect(() => {
    fetchCompanyUsers();
    fetchTradeShows();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.gts-autocomplete-wrapper') && !event.target.closest('.gts-industry-wrapper')) {
        setShowAccessDropdown(false);
        setShowLeadsAccessDropdown(false);
        setShowIndustryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCompanyUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/company/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Company users data:', data.members);
        // Map profileImage to profilePicture for consistency
        const users = (data.members || []).map(user => ({
          ...user,
          name: user.fullName || user.name,
          profilePicture: user.profileImage || user.profilePicture
        }));
        setCompanyUsers(users);
      }
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const fetchTradeShows = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/trade-shows', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Trade shows data:', data.tradeShows);
        setShows(data.tradeShows || []);
      }
    } catch (error) {
      console.error('Error fetching trade shows:', error);
    }
  };

  const validateLogoFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    const maxSize = 100 * 1024; // 100KB

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, and SVG files are allowed for logos';
    }

    if (file.size > maxSize) {
      return 'Logo file size must be less than 100KB';
    }

    return null;
  };

  const validateFloorPlanFile = (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, JPG, and PNG files are allowed for floor plans';
    }

    if (file.size > maxSize) {
      return 'Floor plan file size must be less than 10MB';
    }

    return null;
  };

  const handleUserSelect = (user, field) => {
    if (field === 'showAccess') {
      if (!selectedShowAccessUsers.find(u => u._id === user._id)) {
        const newUsers = [...selectedShowAccessUsers, user];
        setSelectedShowAccessUsers(newUsers);
        setFormData(prev => ({
          ...prev,
          showAccessPeople: newUsers.map(u => u.email).join(', ')
        }));
      }
      setShowAccessDropdown(false);
    } else if (field === 'showLeadsAccess') {
      if (!selectedShowLeadsAccessUsers.find(u => u._id === user._id)) {
        const newUsers = [...selectedShowLeadsAccessUsers, user];
        setSelectedShowLeadsAccessUsers(newUsers);
        setFormData(prev => ({
          ...prev,
          showLeadsAccessPeople: newUsers.map(u => u.email).join(', ')
        }));
      }
      setShowLeadsAccessDropdown(false);
    }
  };

  const removeUser = (userId, field) => {
    if (field === 'showAccess') {
      const newUsers = selectedShowAccessUsers.filter(u => u._id !== userId);
      setSelectedShowAccessUsers(newUsers);
      setFormData(prev => ({
        ...prev,
        showAccessPeople: newUsers.map(u => u.email).join(', ')
      }));
    } else if (field === 'showLeadsAccess') {
      const newUsers = selectedShowLeadsAccessUsers.filter(u => u._id !== userId);
      setSelectedShowLeadsAccessUsers(newUsers);
      setFormData(prev => ({
        ...prev,
        showLeadsAccessPeople: newUsers.map(u => u.email).join(', ')
      }));
    }
  };

  const handleAddShowClick = () => {
    setShowModal(!showModal);
    if (showModal) {
      // Reset form when closing
      setFormData({
        shortName: '',
        fullName: '',
        showDate: '',
        location: '',
        exhibitors: '',
        attendees: '',
        floorPlan: null,
        eacDeadline: '',
        earlyBirdDeadline: '',
        industry: '',
        showAccessPeople: '',
        showLeadsAccessPeople: '',
        showLogo: null
      });
      setLogoPreview(null);
      setFloorPlanName('');
      setErrors({});
      setSelectedShowAccessUsers([]);
      setSelectedShowLeadsAccessUsers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const error = validateLogoFile(file);
      if (error) {
        setErrors(prev => ({ ...prev, showLogo: error }));
        return;
      }

      setErrors(prev => ({ ...prev, showLogo: '' }));
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

  const handleFloorPlanChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const error = validateFloorPlanFile(file);
      if (error) {
        setErrors(prev => ({ ...prev, floorPlan: error }));
        return;
      }

      setErrors(prev => ({ ...prev, floorPlan: '' }));
      setFormData(prev => ({
        ...prev,
        floorPlan: file
      }));
      setFloorPlanName(file.name);
    }
  };

  // Drag and drop handlers for logo
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleIndustryFocus = () => {
    // Close other dropdowns
    setShowAccessDropdown(false);
    setShowLeadsAccessDropdown(false);
    
    if (industryInputRef.current) {
      const rect = industryInputRef.current.getBoundingClientRect();
      const dropdownHeight = 244;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Show above if there's more space above, otherwise show below
      if (spaceAbove > spaceBelow && spaceAbove > dropdownHeight) {
        setIndustryDropdownPosition({
          top: rect.top + window.scrollY - dropdownHeight,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      } else {
        setIndustryDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }
    setShowIndustryDropdown(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const error = validateLogoFile(file);
      if (error) {
        setErrors(prev => ({ ...prev, showLogo: error }));
        return;
      }

      setErrors(prev => ({ ...prev, showLogo: '' }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.shortName || !formData.fullName || !formData.showDate || !formData.location) {
      setErrors({ general: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('shortName', formData.shortName);
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('showDate', formData.showDate);
      formDataToSend.append('location', formData.location);
      if (formData.exhibitors) formDataToSend.append('exhibitors', formData.exhibitors);
      if (formData.attendees) formDataToSend.append('attendees', formData.attendees);
      if (formData.industry) formDataToSend.append('industry', formData.industry);
      if (formData.eacDeadline) formDataToSend.append('eacDeadline', formData.eacDeadline);
      if (formData.earlyBirdDeadline) formDataToSend.append('earlyBirdDeadline', formData.earlyBirdDeadline);

      // Add file uploads
      if (formData.showLogo) {
        formDataToSend.append('showLogo', formData.showLogo);
      }
      if (formData.floorPlan) {
        formDataToSend.append('floorPlan', formData.floorPlan);
      }

      // Add access people arrays
      if (selectedShowAccessUsers.length > 0) {
        formDataToSend.append('showAccessPeople', JSON.stringify(selectedShowAccessUsers.map(u => u._id)));
      }
      if (selectedShowLeadsAccessUsers.length > 0) {
        formDataToSend.append('showLeadsAccessPeople', JSON.stringify(selectedShowLeadsAccessUsers.map(u => u._id)));
      }

      const response = await fetch('http://localhost:5000/api/trade-shows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh trade shows list
        await fetchTradeShows();

        // Reset form
        setFormData({
          shortName: '',
          fullName: '',
          showDate: '',
          location: '',
          exhibitors: '',
          attendees: '',
          floorPlan: null,
          eacDeadline: '',
          earlyBirdDeadline: '',
          industry: '',
          showAccessPeople: '',
          showLeadsAccessPeople: '',
          showLogo: null
        });
        setLogoPreview(null);
        setFloorPlanName('');
        setSelectedShowAccessUsers([]);
        setSelectedShowLeadsAccessUsers([]);
        setShowModal(false);
      } else {
        setErrors({ general: data.message || 'Error creating trade show' });
      }
    } catch (error) {
      console.error('Error creating trade show:', error);
      setErrors({ general: 'Error creating trade show. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      text: text,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, text: '', x: 0, y: 0 });
  };

  const handleCardClick = (show) => {
    if (onNavigate) {
      onNavigate('exhibitor-list', show);
    }
  };

  const handleAboutShowClick = (e, show) => {
    e.stopPropagation(); // Prevent card click
    setSelectedShow(show);
    setShowAboutPanel(true);
  };

  return (
    <div className="global-trade-show-container">
      <div className="gts-header">
        <h1 className="gts-title">Global Trade Show</h1>
        <button 
          onClick={handleAddShowClick}
          className="gts-btn-add"
        >
          + Trade Show
        </button>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="gts-modal-overlay" onClick={handleAddShowClick}>
          <div className="gts-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gts-modal-header">
              <h2>Add Global Trade Show</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="gts-modal-form">
              <div className="gts-modal-body">
                {/* Error Message */}
                {errors.general && (
                  <div className="gts-error-banner">
                    {errors.general}
                  </div>
                )}

                {/* Top Row: Logo on left, form fields and access fields on right */}
                <div className="gts-top-row">
                  {/* Logo Upload Section */}
                  <div className="gts-upload-section">
                    <div
                      className={`gts-upload-box ${isDragging ? 'dragging' : ''}`}
                      onClick={() => document.getElementById('logo-upload').click()}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo Preview" className="gts-upload-preview" />
                      ) : (
                        <>
                          <img src={uploadIcon} alt="Upload" className="gts-upload-icon" />
                          <p className="gts-upload-text">Drop your show logo here</p>
                          <p className="gts-upload-hint">JPG, PNG, SVG (Max: 100KB)</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                        onChange={handleLogoChange}
                        className="gts-file-input-hidden"
                        id="logo-upload"
                      />
                    </div>
                    {errors.showLogo && (
                      <p className="gts-error-message">{errors.showLogo}</p>
                    )}
                  </div>

                  {/* Right side: Two columns - Input fields and Access fields */}
                  <div className="gts-form-access-wrapper">
                    {/* Left Column: Input Fields */}
                    <div className="gts-left-inputs">
                    <div className="gts-modal-field">
                      <label className="gts-modal-label">Trade Show Short Name</label>
                      <input
                        type="text"
                        name="shortName"
                        value={formData.shortName}
                        onChange={handleInputChange}
                        className="gts-modal-input"
                        placeholder=""
                      />
                    </div>

                    <div className="gts-modal-field">
                      <label className="gts-modal-label">Trade Show Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="gts-modal-input"
                        placeholder=""
                        required
                      />
                    </div>

                    {/* Show Date and Location below Full Name */}
                    <div className="gts-modal-row-inline">
                      <div className="gts-modal-field">
                        <label className="gts-modal-label">Show Date</label>
                        <input
                          type="date"
                          name="showDate"
                          value={formData.showDate}
                          onChange={handleInputChange}
                          className="gts-modal-input"
                          required
                        />
                      </div>

                      <div className="gts-modal-field">
                        <label className="gts-modal-label">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="gts-modal-input"
                          placeholder=""
                          required
                        />
                      </div>
                    </div>
                  </div>

                    {/* Right Column: Access Fields */}
                    <div className="gts-right-section">
                      {/* People with Show Access */}
                  <div className="gts-modal-field-full">
                    <div className="gts-field-header">
                      <label className="gts-modal-label">People with Show Access</label>
                      <div className="gts-selected-avatars">
                        {selectedShowAccessUsers.map((user, index) => (
                          <div
                            key={user._id}
                            className="gts-avatar"
                            style={{ zIndex: selectedShowAccessUsers.length - index }}
                            onClick={() => removeUser(user._id, 'showAccess')}
                            onMouseEnter={(e) => handleMouseEnter(e, user.name || user.email)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <img
                              src={user.profilePicture ? (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`) : defaultAvatar}
                              alt={user.name}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="gts-autocomplete-wrapper">
                      <input
                        type="text"
                        name="showAccessSearch"
                        onFocus={() => {
                          setShowAccessDropdown(true);
                          setShowLeadsAccessDropdown(false);
                          setShowIndustryDropdown(false);
                        }}
                        className="gts-search-input"
                        placeholder="Search People..."
                      />
                      {showAccessDropdown && (
                        <div className="gts-dropdown">
                          {companyUsers.length > 0 ? (
                            companyUsers
                              .filter(user => !selectedShowAccessUsers.find(u => u._id === user._id))
                              .map(user => (
                                <div
                                key={user._id}
                                className="gts-dropdown-item"
                                onClick={() => handleUserSelect(user, 'showAccess')}
                              >
                                <div className="gts-dropdown-avatar">
                                  <img
                                    src={user.profilePicture ? (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`) : defaultAvatar}
                                    alt={user.name}
                                  />
                                </div>
                                  <div className="gts-user-info">
                                    <div className="gts-user-name">{user.name}</div>
                                    <div className="gts-user-email">{user.email}</div>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="gts-dropdown-item">No users found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* People with Show Leads Access */}
                  <div className="gts-modal-field-full">
                    <div className="gts-field-header">
                      <label className="gts-modal-label">People with Show Leads Access</label>
                      <div className="gts-selected-avatars">
                        {selectedShowLeadsAccessUsers.map((user, index) => (
                          <div
                            key={user._id}
                            className="gts-avatar"
                            style={{ zIndex: selectedShowLeadsAccessUsers.length - index }}
                            onClick={() => removeUser(user._id, 'showLeadsAccess')}
                            onMouseEnter={(e) => handleMouseEnter(e, user.name || user.email)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <img
                              src={user.profilePicture ? (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`) : defaultAvatar}
                              alt={user.name}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="gts-autocomplete-wrapper">
                      <input
                        type="text"
                        name="showLeadsAccessSearch"
                        onFocus={() => {
                          setShowLeadsAccessDropdown(true);
                          setShowAccessDropdown(false);
                          setShowIndustryDropdown(false);
                        }}
                        className="gts-search-input"
                        placeholder="Search People..."
                      />
                      {showLeadsAccessDropdown && (
                        <div className="gts-dropdown">
                          {companyUsers.length > 0 ? (
                            companyUsers
                              .filter(user => !selectedShowLeadsAccessUsers.find(u => u._id === user._id))
                              .map(user => (
                                <div
                                  key={user._id}
                                  className="gts-dropdown-item"
                                  onClick={() => handleUserSelect(user, 'showLeadsAccess')}
                                >
                                  <div className="gts-dropdown-avatar">
                                    <img
                                      src={user.profilePicture ? (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`) : defaultAvatar}
                                      alt={user.name}
                                    />
                                  </div>
                                  <div className="gts-user-info">
                                    <div className="gts-user-name">{user.name}</div>
                                    <div className="gts-user-email">{user.email}</div>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="gts-dropdown-item">No users found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

                {/* Bottom Section: Full-width fields */}
                <div className="gts-bottom-section">
                {/* Third Row: Exhibitors, Attendees, Floor Plan */}
                <div className="gts-modal-row-3">
                  <div className="gts-modal-field">
                    <label className="gts-modal-label">No. of Exhibitor's</label>
                    <input
                      type="text"
                      name="exhibitors"
                      value={formData.exhibitors}
                      onChange={handleInputChange}
                      className="gts-modal-input"
                      placeholder=""
                    />
                  </div>

                  <div className="gts-modal-field">
                    <label className="gts-modal-label">No. of Attendees</label>
                    <input
                      type="text"
                      name="attendees"
                      value={formData.attendees}
                      onChange={handleInputChange}
                      className="gts-modal-input"
                      placeholder=""
                    />
                  </div>

                  <div className="gts-modal-field">
                    <label className="gts-modal-label">Upload Floor Plan</label>
                    <button
                      type="button"
                      className="gts-choose-file-btn"
                      onClick={() => document.getElementById('floor-plan-upload').click()}
                    >
                      <img src={uploadIcon} alt="Upload" className="gts-upload-icon-small" />
                      {floorPlanName || 'Choose File'}
                    </button>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      onChange={handleFloorPlanChange}
                      className="gts-file-input-hidden"
                      id="floor-plan-upload"
                      style={{display: 'none'}}
                    />
                    {errors.floorPlan && (
                      <p className="gts-error-message">{errors.floorPlan}</p>
                    )}
                  </div>
                </div>

                {/* Fourth Row: Deadlines and Industry */}
                <div className="gts-modal-row-3">
                  <div className="gts-modal-field">
                    <label className="gts-modal-label">EAC Registration Deadline</label>
                    <input
                      type="date"
                      name="eacDeadline"
                      value={formData.eacDeadline}
                      onChange={handleInputChange}
                      className="gts-modal-input"
                    />
                  </div>

                  <div className="gts-modal-field">
                    <label className="gts-modal-label">Early-Bird Service Deadline</label>
                    <input
                      type="date"
                      name="earlyBirdDeadline"
                      value={formData.earlyBirdDeadline}
                      onChange={handleInputChange}
                      className="gts-modal-input"
                    />
                  </div>

                  <div className="gts-modal-field gts-industry-wrapper">
                    <label className="gts-modal-label">Show Industry</label>
                    <input
                      ref={industryInputRef}
                      type="text"
                      placeholder="Search industry..."
                      value={industrySearch}
                      onChange={(e) => {
                        setIndustrySearch(e.target.value);
                        handleIndustryFocus();
                      }}
                      onFocus={handleIndustryFocus}
                      className="gts-modal-input"
                    />
                    {showIndustryDropdown && (
                      <div 
                        className="gts-dropdown gts-industry-dropdown"
                        style={{
                          top: `${industryDropdownPosition.top}px`,
                          left: `${industryDropdownPosition.left}px`,
                          width: `${industryDropdownPosition.width}px`
                        }}
                      >
                        {industryOptions
                          .filter(option =>
                            option.toLowerCase().includes(industrySearch.toLowerCase())
                          )
                          .map((option, index) => (
                            <div
                              key={index}
                              className="gts-dropdown-item"
                              onClick={() => {
                                setFormData({ ...formData, industry: option });
                                setIndustrySearch(option);
                                setShowIndustryDropdown(false);
                              }}
                            >
                              {option}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

              {/* Modal Footer */}
              <div className="gts-modal-footer">
                <button
                  type="button"
                  onClick={handleAddShowClick}
                  className="gts-modal-btn-cancel"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gts-modal-btn-create"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Show'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shows List */}
      {shows.length > 0 ? (
        <div className="gts-shows-list">
          {shows.map(show => (
            <div
              key={show._id}
              className="gts-show-card"
              onClick={() => handleCardClick(show)}
            >
              <div className="gts-card-container">
                {/* Left side: Logo with Title */}
                <div className="gts-card-logo-section">
                  <div className="gts-card-logo">
                    {show.showLogo && show.showLogo.path ? (
                      <img
                        src={`http://localhost:5000${show.showLogo.path}`}
                        alt={show.fullName}
                        className="gts-show-logo"
                      />
                    ) : (
                      <div className="gts-show-logo-placeholder">
                        <span>{show.shortName?.substring(0, 4).toUpperCase() || 'TS'}</span>
                      </div>
                    )}
                  </div>
                  <div className="gts-card-title-wrapper">
                    <h3 className="gts-show-title-small">{show.shortName}</h3>
                    <p className="gts-show-subtitle-small">{show.fullName}</p>
                  </div>
                </div>

                {/* Center: Content */}
                <div className="gts-card-content">
                  {/* Spacer to push content to the right */}
                  <div className="gts-card-spacer"></div>

                  {/* Column 1: Date/Location */}
                  <div className="gts-card-column-left">
                    <div className="gts-card-info-row">
                      <span className="gts-detail-text">{new Date(show.showDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="gts-card-info-row">
                      <span className="gts-detail-text">{show.location}</span>
                    </div>
                  </div>

                  {/* Column 2: Exhibitors/Attendees */}
                  <div className="gts-card-column-middle">
                    <div className="gts-card-info-row">
                      <span className="gts-detail-text">{show.exhibitors || '1400'} Exhibitors</span>
                    </div>
                    <div className="gts-card-info-row">
                      <span className="gts-detail-text">{show.attendees || '142,000'} Attendees</span>
                    </div>
                  </div>

                  {/* Column 3: Floor Plan and About Show */}
                  <div className="gts-card-column-right">
                    <div className="gts-card-info-row">
                      {show.floorPlan && show.floorPlan.path ? (
                        <a
                          href={`http://localhost:5000${show.floorPlan.path}`}
                          download
                          className="gts-link-text"
                        >
                          <FiDownload /> Floor Plan
                        </a>
                      ) : (
                        <span className="gts-link-text"><FiDownload /> Floor Plan</span>
                      )}
                    </div>
                    <div className="gts-card-info-row">
                      <span className="gts-link-text" onClick={(e) => handleAboutShowClick(e, show)}>⊙ About Show</span>
                    </div>
                  </div>

                  {/* Avatars and Category */}
                  <div className="gts-card-column-actions">
                    <div className="gts-avatars-category-row">
                      <div className="gts-card-avatars">
                        {show.showAccessPeople && show.showAccessPeople.length > 0 ? (
                          show.showAccessPeople.slice(0, 2).map((user, index) => (
                            <div key={user._id || index} className="gts-card-avatar">
                              <img
                                src={user.profileImage ? (user.profileImage.startsWith('http') || user.profileImage.startsWith('data:') ? user.profileImage : `http://localhost:5000${user.profileImage}`) : defaultAvatar}
                                alt={user.fullName || user.name}
                              />
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="gts-card-avatar">
                              <img src={defaultAvatar} alt="User" />
                            </div>
                            <div className="gts-card-avatar">
                              <img src={defaultAvatar} alt="User" />
                            </div>
                          </>
                        )}
                      </div>
                      <span className="gts-industry-tag">{show.industry || 'Technology'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showModal && (
          <div className="gts-empty-state">
            <img src={noTradeShowImage} alt="No Trade Shows" className="gts-empty-image" />
            <h3>No Trade Shows Yet - Let's Change That</h3>
            <p>Click + Trade Show to add your first show and start managing Show Details.</p>
          </div>
        )
      )}

      {/* Dynamic Tooltip */}
      {tooltip.show && (
        <div
          className="gts-dynamic-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 999999,
            pointerEvents: 'none'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* About Show Panel */}
      {showAboutPanel && (
        <>
          <div className="gts-about-panel-overlay" onClick={() => setShowAboutPanel(false)} />
          <div className="gts-about-panel">
            <div className="gts-about-panel-header">
              <h2>About {selectedShow?.shortName}</h2>
              <button className="gts-about-panel-close" onClick={() => setShowAboutPanel(false)}>
                ×
              </button>
            </div>

            <div className="gts-about-panel-content">
              <div className="gts-about-panel-section">
                <h3>Trade Show Information</h3>
                <div className="gts-about-panel-grid">
                  <div className="gts-about-panel-item">
                    <label>Full Name</label>
                    <p>{selectedShow?.fullName}</p>
                  </div>
                  <div className="gts-about-panel-item">
                    <label>Short Name</label>
                    <p>{selectedShow?.shortName}</p>
                  </div>
                  <div className="gts-about-panel-item">
                    <label>Industry</label>
                    <p>{selectedShow?.industry || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="gts-about-panel-section">
                <h3>Dates & Location</h3>
                <div className="gts-about-panel-grid">
                  <div className="gts-about-panel-item">
                    <label>Date</label>
                    <p>{selectedShow?.showDate ? new Date(selectedShow.showDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                  <div className="gts-about-panel-item">
                    <label>Location</label>
                    <p>{selectedShow?.location || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="gts-about-panel-section">
                <h3>Statistics</h3>
                <div className="gts-about-panel-grid">
                  <div className="gts-about-panel-item">
                    <label>Number of Exhibitors</label>
                    <p>{selectedShow?.exhibitors || 'N/A'}</p>
                  </div>
                  <div className="gts-about-panel-item">
                    <label>Number of Attendees</label>
                    <p>{selectedShow?.attendees || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedShow?.floorPlan && selectedShow.floorPlan.path && (
                <div className="gts-about-panel-section">
                  <h3>Floor Plan</h3>
                  <a
                    href={`http://localhost:5000${selectedShow.floorPlan.path}`}
                    download
                    className="gts-about-panel-download-btn"
                  >
                    <FiDownload /> Download Floor Plan
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GlobalTradeShow;
