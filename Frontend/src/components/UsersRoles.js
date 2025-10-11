import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { FiSearch, FiEdit3, FiUser } from 'react-icons/fi';
import api from '../config/api';
import './UsersRoles.css';

function UsersRoles() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user role
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      fetchUsers(); // Refresh user list
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  // Search users
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (isLoading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-roles-container">
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th><FiUser /> User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>{user.name || 'N/A'}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button
                    className="edit-button"
                    onClick={() => setSelectedUser(user)}
                  >
                    <FiEdit3 /> Edit Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit User Role</h3>
            <p>User: {selectedUser.email}</p>
            <select
              value={selectedUser.role}
              onChange={(e) => handleRoleUpdate(selectedUser._id, e.target.value)}
            >
              <option value="USER">User</option>
              <option value="SOLOHQ">Solo HQ</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div className="modal-actions">
              <button onClick={() => setSelectedUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersRoles;
