import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiEdit3, FiUser, FiPlus, FiMail, FiPhone, FiMapPin, FiCalendar, FiStar, FiActivity, FiMoreHorizontal, FiDownload, FiUpload } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './ClientLeads.css';

function ClientLeads() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website',
    notes: ''
  });

  // Leads from backend API (replaces mock data)
  const [leads, setLeads] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      email: 'john@example.com', 
      phone: '+1-555-0123', 
      company: 'Tech Corp',
      status: 'New', 
      date: '2024-01-15', 
      source: 'Website',
      notes: 'Interested in web development services',
      lastContact: '2024-01-15',
      priority: 'Medium'
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      email: 'sarah@example.com', 
      phone: '+1-555-0124', 
      company: 'Marketing Inc',
      status: 'In Progress', 
      date: '2024-01-14', 
      source: 'Referral',
      notes: 'Referred by existing client',
      lastContact: '2024-01-14',
      priority: 'High'
    },
    { 
      id: 3, 
      name: 'Mike Davis', 
      email: 'mike@example.com', 
      phone: '+1-555-0125', 
      company: 'StartupXYZ',
      status: 'Qualified', 
      date: '2024-01-13', 
      source: 'Social Media',
      notes: 'Active on LinkedIn, engaged with our content',
      lastContact: '2024-01-13',
      priority: 'High'
    },
    { 
      id: 4, 
      name: 'Emily Brown', 
      email: 'emily@example.com', 
      phone: '+1-555-0126', 
      company: 'Design Studio',
      status: 'Converted', 
      date: '2024-01-12', 
      source: 'Email Campaign',
      notes: 'Converted to paying customer',
      lastContact: '2024-01-12',
      priority: 'Low'
    },
    { 
      id: 5, 
      name: 'David Wilson', 
      email: 'david@example.com', 
      phone: '+1-555-0127', 
      company: 'Enterprise Ltd',
      status: 'New', 
      date: '2024-01-11', 
      source: 'Website',
      notes: 'Downloaded our whitepaper',
      lastContact: '2024-01-11',
      priority: 'Medium'
    },
    { 
      id: 6, 
      name: 'Lisa Anderson', 
      email: 'lisa@example.com', 
      phone: '+1-555-0128', 
      company: 'Consulting Group',
      status: 'In Progress', 
      date: '2024-01-10', 
      source: 'LinkedIn',
      notes: 'Scheduled demo call for next week',
      lastContact: '2024-01-10',
      priority: 'High'
    },
    { 
      id: 7, 
      name: 'Robert Taylor', 
      email: 'robert@example.com', 
      phone: '+1-555-0129', 
      company: 'Retail Chain',
      status: 'Qualified', 
      date: '2024-01-09', 
      source: 'Referral',
      notes: 'Large enterprise opportunity',
      lastContact: '2024-01-09',
      priority: 'High'
    },
    { 
      id: 8, 
      name: 'Jennifer Martinez', 
      email: 'jennifer@example.com', 
      phone: '+1-555-0130', 
      company: 'Non-Profit Org',
      status: 'New', 
      date: '2024-01-08', 
      source: 'Website',
      notes: 'Looking for affordable solutions',
      lastContact: '2024-01-08',
      priority: 'Low'
    },
  ]);

  // Fetch leads from backend API
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/leads');

      if (response.data && response.data.leads) {
        // Transform backend data to match component structure
        const transformedLeads = response.data.leads.map(lead => ({
          id: lead._id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          company: lead.company || '',
          status: lead.status,
          date: lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '',
          source: lead.source,
          notes: lead.notes || '',
          lastContact: lead.lastContact ? new Date(lead.lastContact).toISOString().split('T')[0] : '',
          priority: lead.priority || 'Medium'
        }));

        setLeads(transformedLeads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      // Keep mock data on error, don't show error toast on initial load
      console.log('Using mock data as fallback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch leads on component mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Calculate statistics
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    qualified: 0,
    converted: 0
  });

  const updateStats = useCallback(() => {
    const total = leads.length;
    const newLeads = leads.filter(lead => lead.status === 'New').length;
    const inProgress = leads.filter(lead => lead.status === 'In Progress').length;
    const qualified = leads.filter(lead => lead.status === 'Qualified').length;
    const converted = leads.filter(lead => lead.status === 'Converted').length;

    setStats({ total, new: newLeads, inProgress, qualified, converted });
  }, [leads]);

  useEffect(() => {
    updateStats();
  }, [leads, updateStats]);

  const filterOptions = [
    { value: 'all', label: 'All Leads' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days (1 Week)' },
    { value: 'last30days', label: 'Last 30 Days (1 Month)' },
    { value: 'last90days', label: 'Last 90 Days (3 Months)' },
    { value: 'thismonth', label: 'This Month' },
    { value: 'lastmonth', label: 'Last Month' },
    { value: 'custom', label: 'Custom Date Range' }
  ];

  const statusOptions = ['All', 'New', 'In Progress', 'Qualified', 'Converted', 'Lost'];
  const sourceOptions = ['All', 'Website', 'Referral', 'Social Media', 'Email Campaign', 'LinkedIn', 'Other'];

  const handleAddClientClick = () => {
    setShowAddForm(true);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (newClient.name && newClient.email) {
      try {
        setIsLoading(true);

        // Send lead to backend API
        const response = await api.post('/leads', {
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone || undefined,
          company: newClient.company || undefined,
          source: newClient.source,
          notes: newClient.notes || undefined,
          status: 'New',
          priority: 'Medium'
        });

        if (response.data && response.data.lead) {
          // Transform backend data
          const savedLead = {
            id: response.data.lead._id,
            name: response.data.lead.name,
            email: response.data.lead.email,
            phone: response.data.lead.phone || '',
            company: response.data.lead.company || '',
            status: response.data.lead.status,
            date: new Date(response.data.lead.createdAt).toISOString().split('T')[0],
            source: response.data.lead.source,
            notes: response.data.lead.notes || '',
            lastContact: new Date(response.data.lead.lastContact).toISOString().split('T')[0],
            priority: response.data.lead.priority || 'Medium'
          };

          setLeads([savedLead, ...leads]);
          setNewClient({ name: '', email: '', phone: '', company: '', source: 'Website', notes: '' });
          setShowAddForm(false);
          toast.success('Lead added successfully!');
        }
      } catch (error) {
        console.error('Error adding lead:', error);
        toast.error(error.response?.data?.message || 'Failed to add lead. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedLead(null);
  };

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        await api.delete(`/leads/${leadId}`);

        setLeads(leads.filter(lead => lead.id !== leadId));
        toast.success('Lead deleted successfully!');
      } catch (error) {
        console.error('Error deleting lead:', error);
        toast.error(error.response?.data?.message || 'Failed to delete lead. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      setIsLoading(true);

      await api.put(`/leads/${leadId}`, { status: newStatus });

      setLeads(leads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
      toast.success('Lead status updated successfully!');
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error(error.response?.data?.message || 'Failed to update lead status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportLeads = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Date', 'Priority', 'Notes'],
      ...filteredLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone,
        lead.company || '',
        lead.status,
        lead.source,
        lead.date,
        lead.priority,
        lead.notes || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads exported successfully!');
  };

  const handleImportLeads = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        const importedLeads = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, '').trim());
            const lead = {};
            headers.forEach((header, index) => {
              lead[header.toLowerCase().replace(' ', '')] = values[index] || '';
            });
            return {
              id: leads.length + Math.random(),
              name: lead.name || '',
              email: lead.email || '',
              phone: lead.phone || '',
              company: lead.company || '',
              status: lead.status || 'New',
              source: lead.source || 'Import',
              date: lead.date || new Date().toISOString().split('T')[0],
              notes: lead.notes || '',
              lastContact: lead.date || new Date().toISOString().split('T')[0],
              priority: lead.priority || 'Medium'
            };
          });

        setLeads([...importedLeads, ...leads]);
        toast.success(`${importedLeads.length} leads imported successfully!`);
      } catch (error) {
        toast.error('Error importing leads. Please check your CSV format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const getFilteredLeads = () => {
    const today = new Date();
    let filteredLeads = leads.filter(lead => {
      const leadDate = new Date(lead.date);
      
      // Date filtering
      let dateMatch = true;
      switch (selectedFilter) {
        case 'all':
          dateMatch = true;
          break;
        case 'today':
          dateMatch = leadDate.toDateString() === today.toDateString();
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateMatch = leadDate.toDateString() === yesterday.toDateString();
          break;
        case 'last7days':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateMatch = leadDate >= weekAgo;
          break;
        case 'last30days':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          dateMatch = leadDate >= monthAgo;
          break;
        case 'last90days':
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
          dateMatch = leadDate >= threeMonthsAgo;
          break;
        case 'thismonth':
          dateMatch = leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear();
          break;
        case 'lastmonth':
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          dateMatch = leadDate.getMonth() === lastMonth.getMonth() && leadDate.getFullYear() === lastMonth.getFullYear();
          break;
        case 'custom':
          if (customDateFrom && customDateTo) {
            dateMatch = leadDate >= new Date(customDateFrom) && leadDate <= new Date(customDateTo);
          }
          break;
        default:
          dateMatch = true;
      }

      // Search filtering
      const matchesSearch = searchTerm === '' || 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm);

      // Status filtering
      const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;

      // Source filtering
      const matchesSource = filterSource === 'All' || lead.source === filterSource;

      return dateMatch && matchesSearch && matchesStatus && matchesSource;
    });
    
    return filteredLeads;
  };

  const filteredLeads = getFilteredLeads();

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return '#3B82F6';
      case 'In Progress': return '#F59E0B';
      case 'Qualified': return '#10B981';
      case 'Converted': return '#8B5CF6';
      case 'Lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="client-leads-container">
      {/* Header */}
      <div className="client-leads-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Client Leads Management</h1>
            <p>Manage and track your client leads with advanced filtering and analytics.</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Leads</div>
            <div className="stat-icon" style={{ backgroundColor: '#3B82F6' }}>
              <FiUser />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-change positive">
            <span>+12%</span>
            <span>from last month</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">New Leads</div>
            <div className="stat-icon" style={{ backgroundColor: '#10B981' }}>
              <FiPlus />
            </div>
          </div>
          <div className="stat-value">{stats.new}</div>
          <div className="stat-change positive">
            <span>+8%</span>
            <span>this week</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">In Progress</div>
            <div className="stat-icon" style={{ backgroundColor: '#F59E0B' }}>
              <FiActivity />
            </div>
          </div>
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-change positive">
            <span>+5%</span>
            <span>active leads</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Converted</div>
            <div className="stat-icon" style={{ backgroundColor: '#8B5CF6' }}>
              <FiStar />
            </div>
          </div>
          <div className="stat-value">{stats.converted}</div>
          <div className="stat-change positive">
            <span>+15%</span>
            <span>conversion rate</span>
          </div>
        </div>
      </div>

      {/* Table Header with Search and Filters */}
      <div className="table-header">
        <div className="table-header-left">
          <h3>All leads ({filteredLeads.length})</h3>
        </div>
        <div className="table-header-right">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
              className="filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value)}
              className="filter-select"
            >
              {sourceOptions.map(source => (
                <option key={source} value={source}>
                  {source}
              </option>
            ))}
          </select>
            <button
              onClick={handleExportLeads}
              className="add-lead-btn"
              style={{ backgroundColor: '#6B7280' }}
            >
              <FiDownload />
              Export
            </button>
            <label className="add-lead-btn" style={{ backgroundColor: '#8B5CF6', cursor: 'pointer' }}>
              <FiUpload />
              Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImportLeads}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={handleAddClientClick}
              className="add-lead-btn"
            >
              <FiPlus />
              Add Lead
            </button>
          </div>
        </div>
      </div>
      
      {/* Custom Date Range Section */}
      {selectedFilter === 'custom' && (
        <div className="custom-date-range">
          <h3>Custom Date Range</h3>
          <div className="date-inputs">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="date-input"
              placeholder="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="date-input"
              placeholder="To Date"
            />
          </div>
        </div>
      )}

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="add-lead-form">
          <h3>Add New Lead</h3>
          <form onSubmit={handleAddClient}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  required
                  className="form-input"
                  placeholder="Enter lead name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  required
                  className="form-input"
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="form-input"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  value={newClient.company}
                  onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                  className="form-input"
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  value={newClient.source}
                  onChange={(e) => setNewClient({...newClient, source: e.target.value})}
                  className="form-select"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  className="form-input"
                  placeholder="Add notes about this lead"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Add Lead
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Table */}
      <div className="leads-table-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading leads...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <table className="leads-table">
              <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Lead Details</th>
                <th>Company</th>
                <th>Status</th>
                <th>Source</th>
                <th>Date</th>
                <th>Priority</th>
                <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                <tr key={lead.id} onClick={() => handleLeadClick(lead)}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="lead-details-cell">
                      <div className="lead-avatar">
                        {lead.name ? lead.name.charAt(0).toUpperCase() : '👤'}
                      </div>
                      <div className="lead-basic-info">
                        <h3 className="lead-name">{lead.name}</h3>
                        <p className="lead-email">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{lead.company || 'N/A'}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(lead.status) }}
                    >
                        {lead.status}
                      </span>
                    </td>
                  <td>
                    <span className="source-badge">{lead.source}</span>
                  </td>
                  <td>{new Date(lead.date).toLocaleDateString()}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getPriorityColor(lead.priority) }}
                    >
                      {lead.priority}
                    </span>
                  </td>
                  <td>
                    <div className="actions-menu">
                      <button 
                        className="actions-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeadClick(lead);
                        }}
                      >
                        <FiMoreHorizontal />
                      </button>
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
        ) : (
          <div className="no-leads-found">
            <FiUser className="no-leads-icon" />
            <h3>No leads found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Lead Details Side Panel */}
      {showSidePanel && selectedLead && (
        <LeadDetailsSidePanel
          lead={selectedLead}
          onClose={handleCloseSidePanel}
          isVisible={showSidePanel}
          onDelete={handleDeleteLead}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// Lead Details Side Panel Component
function LeadDetailsSidePanel({ lead, onClose, isVisible, onDelete, onStatusChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    status: lead.status,
    source: lead.source,
    notes: lead.notes,
    priority: lead.priority
  });

  if (!lead) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return '#3B82F6';
      case 'In Progress': return '#F59E0B';
      case 'Qualified': return '#10B981';
      case 'Converted': return '#8B5CF6';
      case 'Lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handleSaveChanges = () => {
    // In a real app, this would make an API call
    toast.success('Lead updated successfully!');
    setIsEditing(false);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`side-panel-overlay ${isVisible ? 'visible' : ''}`}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className={`user-details-side-panel ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="side-panel-header">
          <div className="header-title">
            <h3>{isEditing ? 'Edit Lead' : 'Lead Details'}</h3>
            <span className="user-id">ID: {lead.id}</span>
          </div>
          <div className="header-actions">
            {!isEditing && (
              <button 
                className="edit-btn"
                onClick={() => setIsEditing(true)}
                title="Edit Lead"
              >
                <FiEdit3 />
              </button>
            )}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Lead Profile Section */}
        <div className="side-panel-content">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              <div className="avatar-icon-large">
                {lead.name ? lead.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className={`status-indicator-large ${lead.status?.toLowerCase().replace(' ', '-')}`}></div>
            </div>
            <div className="user-info-text">
              {isEditing ? (
                <input
                  type="text"
                  value={editedLead.name}
                  onChange={(e) => setEditedLead({...editedLead, name: e.target.value})}
                  className="edit-input name-input"
                />
              ) : (
                <h2>{lead.name}</h2>
              )}
              <div className="user-status-info">
                <span className="status-dot-green"></span>
                <span className="status-text">Last contact: {new Date(lead.lastContact).toLocaleDateString()}</span>
              </div>
              {isEditing ? (
                <input
                  type="email"
                  value={editedLead.email}
                  onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                  className="edit-input email-input"
                />
              ) : (
                <p className="user-email-large">
                  <FiMail className="contact-icon" />
                  {lead.email}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <FiActivity className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{lead.status}</div>
                <div className="stat-label">Current Status</div>
              </div>
            </div>
            <div className="stat-item">
              <FiStar className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{lead.priority}</div>
                <div className="stat-label">Priority Level</div>
              </div>
            </div>
            <div className="stat-item">
              <FiCalendar className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24))}</div>
                <div className="stat-label">Days Active</div>
              </div>
            </div>
          </div>

          {/* Status and Priority Section */}
          <div className="role-status-section">
            <div className="role-status-item">
              <label className="field-label">Status</label>
              {isEditing ? (
                <select
                  value={editedLead.status}
                  onChange={(e) => setEditedLead({...editedLead, status: e.target.value})}
                  className="edit-select"
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              ) : (
                <span 
                  className="role-badge-large"
                  style={{ backgroundColor: getStatusColor(lead.status) }}
                >
                  {lead.status}
                </span>
              )}
            </div>
            <div className="role-status-item">
              <label className="field-label">Priority</label>
              {isEditing ? (
                <select
                  value={editedLead.priority}
                  onChange={(e) => setEditedLead({...editedLead, priority: e.target.value})}
                  className="edit-select"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <span 
                  className="status-badge-large"
                  style={{ backgroundColor: getPriorityColor(lead.priority) }}
                >
                  {lead.priority}
                </span>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="details-section">
            <h4>Contact Information</h4>
            <div className="contact-grid">
              <div className="contact-item">
                <FiMail className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Email</div>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedLead.email}
                      onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                      className="edit-input contact-input"
                    />
                  ) : (
                    <div className="contact-value">{lead.email}</div>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <FiPhone className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Phone</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedLead.phone}
                      onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                      className="edit-input contact-input"
                    />
                  ) : (
                    <div className="contact-value">{lead.phone}</div>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <FiMapPin className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Company</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedLead.company}
                      onChange={(e) => setEditedLead({...editedLead, company: e.target.value})}
                      className="edit-input contact-input"
                    />
                  ) : (
                    <div className="contact-value">{lead.company || 'N/A'}</div>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <FiCalendar className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Created Date</div>
                  <div className="contact-value">{new Date(lead.date).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Lead Information */}
          <div className="details-section">
            <h4>Lead Information</h4>
            <div className="professional-grid">
              <div className="professional-item">
                <div className="professional-label">Source</div>
                {isEditing ? (
                  <select
                    value={editedLead.source}
                    onChange={(e) => setEditedLead({...editedLead, source: e.target.value})}
                    className="edit-select"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Email Campaign">Email Campaign</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div className="professional-value">{lead.source}</div>
                )}
              </div>
              <div className="professional-item">
                <div className="professional-label">Last Contact</div>
                <div className="professional-value">{new Date(lead.lastContact).toLocaleDateString()}</div>
              </div>
              <div className="professional-item">
                <div className="professional-label">Lead ID</div>
                <div className="professional-value">#{lead.id}</div>
              </div>
              <div className="professional-item">
                <div className="professional-label">Days Since Created</div>
                <div className="professional-value">{Math.floor((new Date() - new Date(lead.date)) / (1000 * 60 * 60 * 24))} days</div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="details-section">
            <h4>Notes</h4>
            {isEditing ? (
              <textarea
                value={editedLead.notes}
                onChange={(e) => setEditedLead({...editedLead, notes: e.target.value})}
                className="edit-input"
                rows="4"
                placeholder="Add notes about this lead..."
              />
            ) : (
              <div className="contact-value">{lead.notes || 'No notes available'}</div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing ? (
            <div className="edit-actions">
              <button 
                className="save-btn"
                onClick={handleSaveChanges}
              >
                Save Changes
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setEditedLead({
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    company: lead.company,
                    status: lead.status,
                    source: lead.source,
                    notes: lead.notes,
                    priority: lead.priority
                  });
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="edit-actions">
              <button 
                className="save-btn"
                onClick={() => onStatusChange(lead.id, 'Converted')}
                style={{ backgroundColor: '#10B981' }}
              >
                Mark as Converted
              </button>
              <button 
                className="cancel-btn"
                onClick={() => onDelete(lead.id)}
                style={{ backgroundColor: '#EF4444', color: 'white' }}
              >
                Delete Lead
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ClientLeads;
