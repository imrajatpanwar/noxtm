import React, { useState, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import axios from 'axios';
import './UsersRoles.css';

function UsersRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const roles = [
    'Admin',
    'Project Manager', 
    'Data Miner',
    'Data Analyst',
    'Social Media Manager',
    'Human Resource',
    'Graphic Designer',
    'Web Developer',
    'SEO Manager'
  ];

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Transform backend data to match frontend format
      const transformedUsers = response.data.users.map(user => ({
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        access: user.access || []
      }));

      setUsers(transformedUsers);
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      await axios.put(`/api/users/${userId}`, 
        { role: newRole },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role: ' + (error.response?.data?.message || error.message));
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAccessAdd = (userId) => {
    // This would typically open a modal or dropdown to add access
    console.log('Add access for user:', userId);
  };

  const getAccessColor = (access) => {
    const colors = {
      'Data Cluster': '#8B5CF6',
      'Projects': '#10B981',
      'Finance': '#EF4444',
      'Digital Media': '#3B82F6',
      'Marketing': '#F59E0B'
    };
    return colors[access] || '#6B7280';
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="users-roles-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-roles-container">
        <div className="error-container">
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={fetchUsers} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-roles-container">
      <div className="users-roles-header">
        <div className="header-content">
          <div className="header-left">
            <h2>Users & Roles Management</h2>
            <p>Manage user accounts, roles, and permissions across your organization.</p>
          </div>
        </div>

        <div className="table-header">
          <div className="table-header-left">
            <div className="user-count">
              <span className="count-label">All users</span>
              <span className="count-number">{users.length}</span>
            </div>
          </div>
          <div className="table-header-right">
            <div className="search-container">
              <CiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" className="select-all-checkbox" />
              </th>
              <th>User Details</th>
              <th>Access</th>
              <th>Role</th>
              <th>Status</th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={user.status === 'Inactive' ? 'inactive-user' : ''}>
                <td className="checkbox-column">
                  <input type="checkbox" className="user-checkbox" />
                </td>
                <td className="user-details">
                  <div className="user-info">
                    <div className="user-avatar">
                      <div className="avatar-icon">👤</div>
                    </div>
                    <div className="user-text">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="user-access">
                  <div className="access-tags">
                    {user.access.map((access, index) => (
                      <span 
                        key={index} 
                        className="access-tag"
                        style={{ backgroundColor: getAccessColor(access) }}
                      >
                        {access}
                      </span>
                    ))}
                    <button 
                      className="add-access-btn"
                      onClick={() => handleAccessAdd(user.id)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="user-role">
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="user-status">
                  <span className={`status-badge ${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>
                <td className="user-actions">
                  <button className="actions-menu-btn">
                    ⋯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default UsersRoles;
