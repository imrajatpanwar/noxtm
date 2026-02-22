import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import { MessagingContext } from '../contexts/MessagingContext';
import api from '../config/api';
import './header.css';

// Header avatar component
const HeaderAvatar = ({ user, size = 32 }) => {
  if (!user) return null;
  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
  const colorIndex = displayName.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];
  const profileImg = user.profileImage || user.avatarUrl || user.photoUrl || user.avatar || user.profilePicture || user.image;

  return (
    <div
      className="header-team-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: profileImg ? 'transparent' : bgColor
      }}
      title={displayName}
    >
      {profileImg ? (
        <img src={profileImg} alt={displayName} />
      ) : (
        <span>{initials}</span>
      )}
      <span className="header-team-active-dot" />
    </div>
  );
};

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showTeamPopup, setShowTeamPopup] = useState(false);
  const dropdownRef = useRef(null);
  const { onlineUsers } = useContext(MessagingContext);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  const handleSettings = () => {
    // Navigate to dashboard first, then dispatch event to change section
    navigate('/dashboard');
    // Use setTimeout to ensure navigation completes before event dispatch
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('dashboard:navigateToSettings'));
    }, 50);
    setShowDropdown(false);
  };

  // Fetch company users for active team display
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/company-members');
        const users = res.data.members || res.data || [];
        setCompanyUsers(Array.isArray(users) ? users : []);
      } catch (err) {
        console.debug('[HEADER] Failed to fetch company users:', err.message);
      }
    };
    fetchUsers();
  }, [user]);

  const activeUsers = companyUsers.filter(u => {
    const userId = u._id || u.id;
    return onlineUsers?.includes(userId?.toString());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar
  const getInitials = () => {
    const userName = user?.fullName || user?.name;
    if (!userName) return 'U';
    const names = userName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  // Get profile image URL
  const getProfileImage = () => {
    return user?.profileImage || user?.avatarUrl || user?.photoUrl || user?.avatar || null;
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" className="logo-link">
            <h1>NOXTM</h1>
          </Link>
        </div>
        <nav className="header-nav">
          {!user ? (
            <>
              <a href="mailto:mail@noxtm.com" className="nav-item">
                mail@noxtm.com
              </a>
              <a href="#products" className="nav-item btn-style">
                Products
              </a>
              <a href="#security" className="nav-item btn-style">
                Security
              </a>
              <Link to="/documentation" className="nav-item btn-style">
                Documentation
              </Link>
              <button className="login-btn" onClick={handleLogin}>
                Login
              </button>
            </>
          ) : (
            <>
              {activeUsers.length > 0 && (
                <div className="header-active-team">
                  <div className="header-active-team-avatars">
                    {activeUsers.slice(0, 5).map((u, index) => (
                      <div
                        key={u._id || u.id}
                        className="header-team-avatar-overlap"
                        style={{ zIndex: 10 - index }}
                      >
                        <HeaderAvatar user={u} size={30} />
                      </div>
                    ))}
                    {activeUsers.length > 5 && (
                      <div
                        className="header-team-more-overlap"
                        onMouseEnter={() => setShowTeamPopup(true)}
                        onMouseLeave={() => setShowTeamPopup(false)}
                      >
                        +{activeUsers.length - 5}
                        {showTeamPopup && (
                          <div className="header-team-popup">
                            {activeUsers.slice(5).map(u => (
                              <div key={u._id || u.id} className="header-team-popup-item">
                                <HeaderAvatar user={u} size={24} />
                                <span>{u.fullName || u.name || u.email}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <NotificationCenter />
              <div className="profile-container" ref={dropdownRef}>
                <button
                  className="profile-circle"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {getProfileImage() ? (
                    <img src={getProfileImage()} alt={user?.fullName || user?.name || 'User'} className="profile-circle-img" />
                  ) : (
                    getInitials()
                  )}
                </button>

                {showDropdown && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getProfileImage() ? (
                          <img src={getProfileImage()} alt={user?.fullName || user?.name || 'User'} className="profile-dropdown-avatar-img" />
                        ) : (
                          getInitials()
                        )}
                      </div>
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{user?.fullName || user?.name || 'User'}</span>
                        <span className="profile-dropdown-email">{user?.email || ''}</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <button className="profile-dropdown-item" onClick={handleSettings}>
                      <FiSettings size={16} />
                      <span>Settings</span>
                    </button>
                    <button className="profile-dropdown-item logout" onClick={handleLogout}>
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
