import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateTeamAccount.css';

const CreateTeamAccount = ({ onClose, onCreated }) => {
  const [verifiedDomains, setVerifiedDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    domain: '',
    displayName: '',
    description: '',
    purpose: 'general',
    quotaMB: 1024,
    departmentAccess: []
  });

  // Role permissions state
  const [rolePermissions, setRolePermissions] = useState({
    Owner: {
      canRead: true,
      canSend: true,
      canDelete: true,
      canManage: true
    },
    Manager: {
      canRead: true,
      canSend: true,
      canDelete: false,
      canManage: false
    },
    Employee: {
      canRead: true,
      canSend: false,
      canDelete: false,
      canManage: false
    }
  });

  const departments = [
    'Sales', 'Marketing', 'Engineering', 'Support', 'HR',
    'Finance', 'Legal', 'Operations', 'Product', 'Design', 'Other'
  ];

  const purposes = [
    { value: 'shared', label: 'Shared Inbox' },
    { value: 'departmental', label: 'Departmental' },
    { value: 'support', label: 'Customer Support' },
    { value: 'sales', label: 'Sales' },
    { value: 'general', label: 'General' },
    { value: 'personal', label: 'Personal' }
  ];

  useEffect(() => {
    fetchVerifiedDomains();
  }, []);

  const fetchVerifiedDomains = async () => {
    setLoadingDomains(true);
    try {
      const res = await axios.get('/api/email-domains/company');
      const verified = (res.data.domains || []).filter(d => d.verified);
      setVerifiedDomains(verified);

      if (verified.length > 0) {
        setFormData(prev => ({ ...prev, domain: verified[0].domain }));
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      alert('Error loading domains: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (role, permission) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission]
      }
    }));
  };

  const handleDepartmentToggle = (dept) => {
    setFormData(prev => {
      const depts = prev.departmentAccess.includes(dept)
        ? prev.departmentAccess.filter(d => d !== dept)
        : [...prev.departmentAccess, dept];
      return { ...prev, departmentAccess: depts };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.domain) {
      alert('Username and domain are required');
      return;
    }

    // Validate username format (lowercase alphanumeric, dots, dashes)
    if (!/^[a-z0-9._-]+$/.test(formData.username)) {
      alert('Username can only contain lowercase letters, numbers, dots, and dashes');
      return;
    }

    setLoading(true);

    try {
      // Build roleAccess array
      const roleAccess = Object.entries(rolePermissions).map(([role, permissions]) => ({
        role,
        permissions
      }));

      const payload = {
        username: formData.username.toLowerCase().trim(),
        domain: formData.domain,
        displayName: formData.displayName.trim() || formData.username,
        description: formData.description.trim(),
        purpose: formData.purpose,
        quotaMB: parseInt(formData.quotaMB),
        roleAccess,
        departmentAccess: formData.departmentAccess
      };

      const res = await axios.post('/api/email-accounts/create-team', payload);

      alert(`✅ Team email account created successfully!\n\nEmail: ${res.data.account.email}\n\nCredentials have been securely stored.`);

      if (onCreated) {
        onCreated();
      }
      onClose();

    } catch (error) {
      console.error('Error creating team account:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loadingDomains) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading domains...</div>
        </div>
      </div>
    );
  }

  if (verifiedDomains.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Team Email Account</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '24px' }}>
            <div className="no-domains-warning">
              <p>⚠️ No verified domains found</p>
              <p>You need to add and verify a domain before creating team email accounts.</p>
              <button className="btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-team-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Team Email Account</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-sections">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>

              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="support"
                    pattern="[a-z0-9._-]+"
                    required
                  />
                  <small>Lowercase letters, numbers, dots, and dashes only</small>
                </div>

                <div className="form-group flex-1">
                  <label>Domain *</label>
                  <select
                    name="domain"
                    value={formData.domain}
                    onChange={handleInputChange}
                    required
                  >
                    {verifiedDomains.map(domain => (
                      <option key={domain._id} value={domain.domain}>
                        @{domain.domain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="email-preview">
                📧 Email will be: <strong>{formData.username}@{formData.domain}</strong>
              </div>

              <div className="form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="Customer Support Team"
                  required
                />
                <small>Name shown in email clients</small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Handles customer inquiries and support tickets"
                  rows="2"
                />
                <small>Internal description for team members</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Purpose</label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                  >
                    {purposes.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quota (MB)</label>
                  <input
                    type="number"
                    name="quotaMB"
                    value={formData.quotaMB}
                    onChange={handleInputChange}
                    min="256"
                    step="256"
                  />
                  <small>{(formData.quotaMB / 1024).toFixed(2)} GB</small>
                </div>
              </div>
            </div>

            {/* Role Permissions */}
            <div className="form-section">
              <h3>Role-Based Permissions</h3>
              <p className="section-description">
                Configure what each role can do with this email account
              </p>

              <div className="permissions-grid">
                <div className="permission-header">
                  <div className="role-label">Role</div>
                  <div className="perm-label">Read</div>
                  <div className="perm-label">Send</div>
                  <div className="perm-label">Delete</div>
                  <div className="perm-label">Manage</div>
                </div>

                {Object.entries(rolePermissions).map(([role, perms]) => (
                  <div key={role} className="permission-row">
                    <div className="role-name">{role}</div>
                    <div className="perm-checkbox">
                      <input
                        type="checkbox"
                        checked={perms.canRead}
                        onChange={() => handlePermissionToggle(role, 'canRead')}
                      />
                    </div>
                    <div className="perm-checkbox">
                      <input
                        type="checkbox"
                        checked={perms.canSend}
                        onChange={() => handlePermissionToggle(role, 'canSend')}
                      />
                    </div>
                    <div className="perm-checkbox">
                      <input
                        type="checkbox"
                        checked={perms.canDelete}
                        onChange={() => handlePermissionToggle(role, 'canDelete')}
                      />
                    </div>
                    <div className="perm-checkbox">
                      <input
                        type="checkbox"
                        checked={perms.canManage}
                        onChange={() => handlePermissionToggle(role, 'canManage')}
                        disabled={role === 'Owner'}
                        title={role === 'Owner' ? 'Owners always have manage permission' : ''}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="permissions-legend">
                <p><strong>Read:</strong> View emails in inbox</p>
                <p><strong>Send:</strong> Send emails from this account</p>
                <p><strong>Delete:</strong> Delete emails</p>
                <p><strong>Manage:</strong> Edit account settings and permissions</p>
              </div>
            </div>

            {/* Department Access */}
            <div className="form-section">
              <h3>Department Access (Optional)</h3>
              <p className="section-description">
                Restrict access to specific departments. Leave empty for all departments.
              </p>

              <div className="departments-grid">
                {departments.map(dept => (
                  <label key={dept} className="department-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.departmentAccess.includes(dept)}
                      onChange={() => handleDepartmentToggle(dept)}
                    />
                    <span>{dept}</span>
                  </label>
                ))}
              </div>

              {formData.departmentAccess.length > 0 && (
                <div className="selected-departments">
                  <strong>Selected:</strong> {formData.departmentAccess.join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Team Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamAccount;
