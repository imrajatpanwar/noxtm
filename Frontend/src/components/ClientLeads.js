import React, { useState } from 'react';

function ClientLeads() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Website'
  });

  // Mock data for leads
  const [leads, setLeads] = useState([
    { id: 1, name: 'John Smith', email: 'john@example.com', phone: '+1-555-0123', status: 'New', date: '2024-01-15', source: 'Website' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1-555-0124', status: 'In Progress', date: '2024-01-14', source: 'Referral' },
    { id: 3, name: 'Mike Davis', email: 'mike@example.com', phone: '+1-555-0125', status: 'Qualified', date: '2024-01-13', source: 'Social Media' },
    { id: 4, name: 'Emily Brown', email: 'emily@example.com', phone: '+1-555-0126', status: 'Converted', date: '2024-01-12', source: 'Email Campaign' },
    { id: 5, name: 'David Wilson', email: 'david@example.com', phone: '+1-555-0127', status: 'New', date: '2024-01-11', source: 'Website' },
    { id: 6, name: 'Lisa Anderson', email: 'lisa@example.com', phone: '+1-555-0128', status: 'In Progress', date: '2024-01-10', source: 'LinkedIn' },
    { id: 7, name: 'Robert Taylor', email: 'robert@example.com', phone: '+1-555-0129', status: 'Qualified', date: '2024-01-09', source: 'Referral' },
    { id: 8, name: 'Jennifer Martinez', email: 'jennifer@example.com', phone: '+1-555-0130', status: 'New', date: '2024-01-08', source: 'Website' },
  ]);

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

  const handleAddClientClick = () => {
    setShowAddForm(true);
  };

  const handleAddClient = (e) => {
    e.preventDefault();
    if (newClient.name && newClient.email) {
      const newLead = {
        id: leads.length + 1,
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        status: 'New',
        date: new Date().toISOString().split('T')[0],
        source: newClient.source
      };
      setLeads([newLead, ...leads]);
      setNewClient({ name: '', email: '', phone: '', source: 'Website' });
      setShowAddForm(false);
    }
  };

  const getFilteredLeads = () => {
    const today = new Date();
    const filteredLeads = leads.filter(lead => {
      const leadDate = new Date(lead.date);
      
      switch (selectedFilter) {
        case 'all':
          return true;
        case 'today':
          return leadDate.toDateString() === today.toDateString();
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return leadDate.toDateString() === yesterday.toDateString();
        case 'last7days':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return leadDate >= weekAgo;
        case 'last30days':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return leadDate >= monthAgo;
        case 'last90days':
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
          return leadDate >= threeMonthsAgo;
        case 'thismonth':
          return leadDate.getMonth() === today.getMonth() && leadDate.getFullYear() === today.getFullYear();
        case 'lastmonth':
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return leadDate.getMonth() === lastMonth.getMonth() && leadDate.getFullYear() === lastMonth.getFullYear();
        case 'custom':
          if (customDateFrom && customDateTo) {
            return leadDate >= new Date(customDateFrom) && leadDate <= new Date(customDateTo);
          }
          return true;
        default:
          return true;
      }
    });
    
    return filteredLeads;
  };

  const filteredLeads = getFilteredLeads();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Client Leads</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} {option.value === 'all' ? `(${leads.length})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddClientClick}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '4px', 
              border: 'none', 
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: 'none',
              transition: 'none'
            }}
            onMouseEnter={(e) => e.target.style.boxShadow = 'none'}
            onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
          >
            Add Client
          </button>
        </div>
      </div>
      
      {/* Custom Date Range Section */}
      {selectedFilter === 'custom' && (
        <div className="dashboard-card" style={{ marginBottom: '1rem' }}>
          <h3>Custom Date Range</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="To Date"
            />
          </div>
        </div>
      )}

      {/* Add Client Form */}
      {showAddForm && (
        <div className="dashboard-card" style={{ marginBottom: '1rem' }}>
          <h3>Add New Client</h3>
          <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email *</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Source</label>
                <select
                  value={newClient.source}
                  onChange={(e) => setNewClient({...newClient, source: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd', 
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  border: 'none', 
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Add Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads List */}
      <div className="dashboard-card">
        <h3>Leads List ({filteredLeads.length} leads)</h3>
        {filteredLeads.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Phone</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{lead.name}</td>
                    <td style={{ padding: '0.75rem' }}>{lead.email}</td>
                    <td style={{ padding: '0.75rem' }}>{lead.phone}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        backgroundColor: 
                          lead.status === 'New' ? '#e3f2fd' :
                          lead.status === 'In Progress' ? '#fff3e0' :
                          lead.status === 'Qualified' ? '#e8f5e8' :
                          '#f3e5f5',
                        color: 
                          lead.status === 'New' ? '#1976d2' :
                          lead.status === 'In Progress' ? '#f57c00' :
                          lead.status === 'Qualified' ? '#388e3c' :
                          '#7b1fa2'
                      }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{new Date(lead.date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{lead.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
            No leads found for the selected filter.
          </p>
        )}
      </div>
    </>
  );
}

export default ClientLeads;
