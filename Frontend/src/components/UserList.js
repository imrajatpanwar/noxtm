import React, { useContext } from 'react';
import { MessagingContext } from '../contexts/MessagingContext';
import './UserList.css';

function UserList({ users, onUserClick, searchQuery, onSearchChange, loading }) {
  const { onlineUsers } = useContext(MessagingContext);

  // Debug: Log online users whenever they change
  React.useEffect(() => {
    console.log('👥 UserList: Online users updated:', onlineUsers);
    console.log('👥 UserList: Total online:', onlineUsers.length);
  }, [onlineUsers]);

  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUserOnline = (userId) => {
    const online = onlineUsers.includes(userId) || onlineUsers.includes(userId?.toString());
    return online;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h3>Team Members</h3>
        <span className="user-count">{filteredUsers.length} users</span>
      </div>

      <div className="user-search-box">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="user-search-input"
        />
      </div>

      <div className="user-list-section">
        {loading ? (
          <div className="user-list-loading">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="user-list-empty">
            <div className="empty-icon">👥</div>
            <p>No users found</p>
            <span>
              {searchQuery
                ? 'Try a different search'
                : users.length === 0
                ? 'Complete company setup to see team members'
                : 'No team members available'}
            </span>
          </div>
        ) : (
          <div className="user-list-items">
            {filteredUsers.map(user => {
              const userOnline = isUserOnline(user._id || user.id);

              return (
                <div
                  key={user._id || user.id}
                  className="user-list-item"
                  onClick={() => onUserClick(user)}
                >
                  <div className="user-avatar-container">
                    <div className={`user-avatar ${userOnline ? 'online' : 'offline'}`}>
                      {getInitials(user.fullName || user.username)}
                    </div>
                    <div className={`status-indicator ${userOnline ? 'online' : 'offline'}`} />
                  </div>

                  <div className="user-info">
                    <div className="user-info-header">
                      <span className="user-name">{user.fullName || user.username}</span>
                      {userOnline && <span className="online-badge">Online</span>}
                    </div>
                    <div className="user-info-details">
                      <span className="user-email">{user.email}</span>
                      {user.department && (
                        <span className="user-department">{user.department}</span>
                      )}
                    </div>
                  </div>

                  <button className="user-chat-button" title="Start chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="user-list-footer">
          <div className="online-summary">
            <div className="online-indicator"></div>
            <span>{onlineUsers.length} online</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserList;
