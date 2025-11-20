import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiLinkedin, FiInstagram, FiFacebook, FiGlobe, FiPlus } from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';
// import api from '../config/api'; // Will be used when API endpoints are ready
import './LeadsDirectory.css';

function LeadsDirectory() {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    companyName: '',
    clientName: '',
    email: '',
    phone: '',
    designation: '',
    location: '',
    requirements: '',
    status: 'Cold Lead',
    followUp: 'Follow-Up - 00',
    social: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: '',
      website: ''
    }
  });

  const statusOptions = ['All', 'Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'];
  const leadStatusOptions = ['Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'];

  // Update lead status
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/leads/${leadId}/status`, {
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
      
      const updatedLead = await response.json();
      setLeads(leads.map(lead => 
        (lead._id || lead.id) === leadId ? updatedLead : lead
      ));
      
      if (newStatus === 'Qualified (SQL)') {
        toast.success('Lead qualified and converted to client!');
      } else {
        toast.success('Lead status updated');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Update follow-up count
  const handleFollowUpChange = async (leadId, increment) => {
    try {
      const lead = leads.find(l => (l._id || l.id) === leadId);
      const currentNum = parseInt(lead.followUp.match(/\d+/)?.[0] || '0');
      const newNum = Math.max(0, currentNum + increment);
      const newFollowUp = `Follow-Up - ${String(newNum).padStart(2, '0')}`;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/leads/${leadId}/followup`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ followUp: newFollowUp })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow-up');
      }
      
      const updatedLead = await response.json();
      setLeads(leads.map(l => 
        (l._id || l.id) === leadId ? updatedLead : l
      ));
      toast.success('Follow-up updated');
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast.error('Failed to update follow-up');
    }
  };

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/leads';
      const params = new URLSearchParams();
      if (filterStatus !== 'All') {
        params.append('status', filterStatus);
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
        throw new Error('Failed to fetch leads');
      }
      
      const data = await response.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
      // Fallback to empty array on error
      setLeads([
        {
          id: 1,
          companyName: 'Tech Innovations Ltd',
          clientName: 'Michael Chen',
          email: 'michael.chen@techinnovations.com',
          phone: '+1-555-0201',
          designation: 'Chief Technology Officer',
          location: 'San Francisco, CA',
          requirements: 'Enterprise software solution for workflow automation',
          status: 'Warm Lead',
          followUp: 'Follow-Up - 02',
          date: '2024-01-15',
          social: {
            linkedin: 'https://linkedin.com/in/michaelchen',
            twitter: 'https://twitter.com/mchen',
            facebook: '',
            instagram: '',
            website: 'https://techinnovations.com'
          }
        },
        {
          id: 2,
          companyName: 'Finance Solutions Corp',
          clientName: 'Emily Rodriguez',
          email: 'emily.r@financesolutions.com',
          phone: '+1-555-0202',
          designation: 'VP of Operations',
          location: 'New York, NY',
          requirements: 'Financial management and reporting system',
          status: 'Active',
          followUp: 'Follow-Up - 05',
          date: '2024-01-10',
          social: {
            linkedin: 'https://linkedin.com/in/emilyrodriguez',
            twitter: '',
            facebook: 'https://facebook.com/emily.rodriguez',
            instagram: 'https://instagram.com/emily_r',
            website: 'https://financesolutions.com'
          }
        },
        {
          id: 3,
          companyName: 'Healthcare Systems Inc',
          clientName: 'David Thompson',
          email: 'david.t@healthcaresys.com',
          phone: '+1-555-0203',
          designation: 'Director of IT',
          location: 'Boston, MA',
          requirements: 'Patient management system integration',
          status: 'Dead Lead',
          followUp: 'Follow-Up - 01',
          date: '2024-01-12',
          social: {
            linkedin: 'https://linkedin.com/in/davidthompson',
            twitter: 'https://twitter.com/dthompson',
            facebook: '',
            instagram: '',
            website: 'https://healthcaresys.com'
          }
        },
        {
          id: 4,
          companyName: 'Retail Dynamics',
          clientName: 'Sarah Williams',
          email: 'sarah.w@retaildynamics.com',
          phone: '+1-555-0204',
          designation: 'Marketing Manager',
          location: 'Los Angeles, CA',
          requirements: 'E-commerce platform and CRM integration',
          status: 'Cold Lead',
          followUp: 'Follow-Up - 03',
          date: '2024-01-08',
          social: {
            linkedin: 'https://linkedin.com/in/sarahwilliams',
            twitter: 'https://twitter.com/swilliams',
            facebook: 'https://facebook.com/sarah.williams',
            instagram: 'https://instagram.com/sarah_w',
            website: 'https://retaildynamics.com'
          }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm]);

  // Fetch leads from backend
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (newLead.clientName && newLead.email && newLead.companyName) {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newLead)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to add lead');
        }
        
        const savedLead = await response.json();
        setLeads([savedLead, ...leads]);
        
        setNewLead({
          companyName: '',
          clientName: '',
          email: '',
          phone: '',
          designation: '',
          location: '',
          requirements: '',
          status: 'Cold Lead',
          followUp: 'Follow-Up - 00',
          social: {
            linkedin: '',
            twitter: '',
            facebook: '',
            instagram: '',
            website: ''
          }
        });
        setShowAddModal(false);
        toast.success('Lead added successfully!');
      } catch (error) {
        console.error('Error adding lead:', error);
        toast.error(error.message || 'Failed to add lead');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredLeads = (Array.isArray(leads) ? leads : []).filter(lead => {
    const matchesSearch = lead.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="ld-container">
      {/* Header */}
      <div className="ld-header">
        <h1 className="ld-title">Leads Directory</h1>
        <button className="ld-btn-add" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Add Client
        </button>
      </div>

      {/* Search and Filter */}
      <div className="ld-search-filter">
        <div className="ld-search-wrapper">
          <FiSearch className="ld-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ld-search-input"
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="ld-filter-select"
        >
          {statusOptions.map(option => (
            <option key={option} value={option}>
              {option === 'All' ? 'All Status' : option}
            </option>
          ))}
        </select>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="ld-loading">
          <div className="ld-spinner"></div>
          <p>Loading leads...</p>
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="ld-list">
          {filteredLeads.map(lead => (
            <div key={lead._id || lead.id} className="ld-card">
              <div className="ld-card-content">
                {/* Company Name */}
                <div className="ld-field">
                  <div className="ld-field-label">Company Name</div>
                  <div className="ld-field-value">{lead.companyName}</div>
                </div>

                {/* Client Name */}
                <div className="ld-field">
                  <div className="ld-field-label">Client Name</div>
                  <div className="ld-field-value">{lead.clientName}</div>
                </div>

                {/* Email */}
                <div className="ld-field">
                  <div className="ld-field-label">Email</div>
                  <div className="ld-field-value ld-field-email">{lead.email}</div>
                </div>

                {/* Phone */}
                <div className="ld-field">
                  <div className="ld-field-label">Phone</div>
                  <div className="ld-field-value">{lead.phone}</div>
                </div>

                {/* Designation */}
                <div className="ld-field">
                  <div className="ld-field-label">Designation</div>
                  <div className="ld-field-value">{lead.designation}</div>
                </div>

                {/* Location */}
                <div className="ld-field">
                  <div className="ld-field-label">Location</div>
                  <div className="ld-field-value">{lead.location}</div>
                </div>

                {/* Requirements */}
                <div className="ld-field ld-field-requirements">
                  <div className="ld-field-label">Requirements</div>
                  <div className="ld-field-value">{lead.requirements}</div>
                </div>

                {/* Date */}
                <div className="ld-field">
                  <div className="ld-field-label">Date</div>
                  <div className="ld-field-value">{new Date(lead.createdAt || lead.date).toLocaleDateString()}</div>
                </div>

                {/* Follow-Up */}
                <div className="ld-field">
                  <div className="ld-field-label">Follow-Up</div>
                  <div className="ld-followup-stepper">
                    <button 
                      className="ld-stepper-btn"
                      onClick={() => handleFollowUpChange(lead._id || lead.id, -1)}
                      title="Decrease"
                    >
                      −
                    </button>
                    <div className="ld-followup-value">{lead.followUp || 'Follow-Up - 00'}</div>
                    <button 
                      className="ld-stepper-btn"
                      onClick={() => handleFollowUpChange(lead._id || lead.id, 1)}
                      title="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Social */}
                <div className="ld-field">
                  <div className="ld-field-label">Social</div>
                  <div className="ld-social-icons">
                    {lead.social.linkedin && (
                      <a href={lead.social.linkedin} target="_blank" rel="noopener noreferrer" className="ld-social-icon">
                        <FiLinkedin />
                      </a>
                    )}
                    {lead.social.twitter && (
                      <a href={lead.social.twitter} target="_blank" rel="noopener noreferrer" className="ld-social-icon">
                        <FaXTwitter />
                      </a>
                    )}
                    {lead.social.facebook && (
                      <a href={lead.social.facebook} target="_blank" rel="noopener noreferrer" className="ld-social-icon">
                        <FiFacebook />
                      </a>
                    )}
                    {lead.social.instagram && (
                      <a href={lead.social.instagram} target="_blank" rel="noopener noreferrer" className="ld-social-icon">
                        <FiInstagram />
                      </a>
                    )}
                    {lead.social.website && (
                      <a href={lead.social.website} target="_blank" rel="noopener noreferrer" className="ld-social-icon">
                        <FiGlobe />
                      </a>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="ld-field">
                  <div className="ld-field-label">Status</div>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead._id || lead.id, e.target.value)}
                    className={`ld-status-dropdown ${lead.status.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}`}
                  >
                    {leadStatusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ld-no-data">
          <p>No leads found. Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="ld-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-header">
              <h2>Add New Client</h2>
              <button className="ld-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddLead} className="ld-modal-form">
              <div className="ld-form-grid">
                <div className="ld-form-field">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({...newLead, companyName: e.target.value})}
                    required
                  />
                </div>
                <div className="ld-form-field">
                  <label>Client Name *</label>
                  <input
                    type="text"
                    value={newLead.clientName}
                    onChange={(e) => setNewLead({...newLead, clientName: e.target.value})}
                    required
                  />
                </div>
                <div className="ld-form-field">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                    required
                  />
                </div>
                <div className="ld-form-field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  />
                </div>
                <div className="ld-form-field">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={newLead.designation}
                    onChange={(e) => setNewLead({...newLead, designation: e.target.value})}
                  />
                </div>
                <div className="ld-form-field">
                  <label>Location</label>
                  <input
                    type="text"
                    value={newLead.location}
                    onChange={(e) => setNewLead({...newLead, location: e.target.value})}
                  />
                </div>
                <div className="ld-form-field ld-form-field-full">
                  <label>Requirements</label>
                  <textarea
                    value={newLead.requirements}
                    onChange={(e) => setNewLead({...newLead, requirements: e.target.value})}
                    rows="3"
                  />
                </div>
                <div className="ld-form-field">
                  <label>Status</label>
                  <select
                    value={newLead.status}
                    onChange={(e) => setNewLead({...newLead, status: e.target.value})}
                  >
                    <option value="Cold Lead">Cold Lead</option>
                    <option value="Warm Lead">Warm Lead</option>
                    <option value="Qualified (SQL)">Qualified (SQL)</option>
                    <option value="Active">Active</option>
                    <option value="Dead Lead">Dead Lead</option>
                  </select>
                </div>
                <div className="ld-form-field">
                  <label>Follow-Up</label>
                  <input
                    type="text"
                    placeholder="Follow-Up - 01"
                    value={newLead.followUp}
                    onChange={(e) => setNewLead({...newLead, followUp: e.target.value})}
                  />
                </div>
              </div>

              <div className="ld-social-section">
                <h3>Social Media Links</h3>
                <div className="ld-form-grid">
                  <div className="ld-form-field">
                    <label>LinkedIn</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={newLead.social.linkedin}
                      onChange={(e) => setNewLead({...newLead, social: {...newLead.social, linkedin: e.target.value}})}
                    />
                  </div>
                  <div className="ld-form-field">
                    <label>Twitter</label>
                    <input
                      type="url"
                      placeholder="https://twitter.com/..."
                      value={newLead.social.twitter}
                      onChange={(e) => setNewLead({...newLead, social: {...newLead.social, twitter: e.target.value}})}
                    />
                  </div>
                  <div className="ld-form-field">
                    <label>Facebook</label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/..."
                      value={newLead.social.facebook}
                      onChange={(e) => setNewLead({...newLead, social: {...newLead.social, facebook: e.target.value}})}
                    />
                  </div>
                  <div className="ld-form-field">
                    <label>Instagram</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={newLead.social.instagram}
                      onChange={(e) => setNewLead({...newLead, social: {...newLead.social, instagram: e.target.value}})}
                    />
                  </div>
                  <div className="ld-form-field">
                    <label>Website</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={newLead.social.website}
                      onChange={(e) => setNewLead({...newLead, social: {...newLead.social, website: e.target.value}})}
                    />
                  </div>
                </div>
              </div>

              <div className="ld-modal-footer">
                <button type="button" className="ld-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ld-btn-submit">
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsDirectory;
