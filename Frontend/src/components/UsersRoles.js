import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import api from '../config/api';
import './UsersRoles.css';

function UsersRoles() {
  const { users, setUsers, updateUserRole, currentUser } = useRole();
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  }, [setUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedUser(null);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        toast.success('User role updated successfully');
        fetchUsers(); // Refresh the list
      } else {
        toast.error('Failed to update user role: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const result = await updateUserRole(userId, null, newStatus);
      if (result.success) {
        toast.success('User status updated successfully');
        fetchUsers(); // Refresh the list
      } else {
        toast.error('Failed to update user status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        const response = await api.delete(`/users/${userId}`);
        if (response.status === 200) {
          setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
          toast.success('User deleted successfully');
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Inactive': return '#6B7280';
      case 'Terminated': return '#EF4444';
      case 'In Review': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return '#8B5CF6';
      case 'Project Manager': return '#10B981';
      case 'Data Analyst': return '#3B82F6';
      case 'Data Miner': return '#8B5CF6';
      case 'Social Media Manager': return '#F59E0B';
      case 'Human Resource': return '#EC4899';
      case 'Graphic Designer': return '#06B6D4';
      case 'Web Developer': return '#10B981';
      case 'SEO Manager': return '#06B6D4';
      default: return '#6B7280';
    }
  };

  return (
    <div className="users-roles-container">
      <div className="users-roles-header">
        <h1>Users & Roles Management</h1>
        <p>Manage user accounts and roles across your organization.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="user-row">
                <td className="user-info" onClick={() => handleUserClick(user)}>
                  <div className="user-avatar">
                    <div className="avatar-icon">👤</div>
                  </div>
                  <div className="user-details">
                    <div className="user-name">{user.name || user.username}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </td>
                <td>
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="actions">
                  {currentUser?.role === 'Admin' && (
                    <>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Data Analyst">Data Analyst</option>
                        <option value="Data Miner">Data Miner</option>
                        <option value="Social Media Manager">Social Media Manager</option>
                        <option value="Human Resource">Human Resource</option>
                        <option value="Graphic Designer">Graphic Designer</option>
                        <option value="Web Developer">Web Developer</option>
                        <option value="SEO Manager">SEO Manager</option>
                      </select>
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Terminated">Terminated</option>
                        <option value="In Review">In Review</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {currentUser?.role !== 'Admin' && (
                    <span className="no-permission">
                      You can view user information but cannot modify roles. Only administrators can change user roles.
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSidePanel && selectedUser && (
        <UserDetailsSidePanel
          user={selectedUser}
          onClose={handleCloseSidePanel}
          isVisible={showSidePanel}
          setUsers={setUsers}
        />
      )}
    </div>
  );
}

// User Details Side Panel Component
function UserDetailsSidePanel({ user, onClose, isVisible, setUsers }) {
  if (!user) return null;

  // Mock additional user data - in real app this would come from API
  const userDetails = {
    ...user,
    currentProjects: 5,
    totalProjects: 21,
    joinDate: '10 - 04 - 2024',
    phone: '+91 9098989281',
    location: 'Coffee Estate Homestay, Mullayanagiri Road, Kaimara, Chikmagalur, Karnataka - 577101, India',
    languages: ['English', 'Hindi'],
    maritalStatus: 'Single',
    employmentId: '0020192',
    responseTime: '24m'
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
          <h3>User Preview</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* User Info */}
        <div className="side-panel-content">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              <div className="avatar-icon-large">👤</div>
            </div>
            <div className="user-info-text">
              <h2>{userDetails.name}</h2>
              <div className="user-status-indicator">
                <span className="status-dot-green"></span>
                <span className="status-text">Online</span>
              </div>
              <p className="user-email-large">{userDetails.email}</p>
            </div>
          </div>

          {/* Project Stats */}
          <div className="project-stats">
            <div className="stat-item">
              <div className="stat-label">Currently</div>
              <div className="stat-value">{userDetails.currentProjects}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Projects</div>
              <div className="stat-value">{userDetails.totalProjects}</div>
            </div>
          </div>

          {/* User Details Section */}
          <div className="details-section">
            <h4>User Details</h4>
            <div className="detail-grid-two-column">
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">E-mail</span>
                  <span className="detail-value">{userDetails.email}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{userDetails.phone}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{userDetails.location}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Languages</span>
                  <span className="detail-value">{userDetails.languages.join(', ')}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Marital Status</span>
                  <span className="detail-value">{userDetails.maritalStatus}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Employment ID</span>
                  <span className="detail-value">{userDetails.employmentId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UsersRoles;
