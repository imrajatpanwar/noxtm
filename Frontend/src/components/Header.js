import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import './header.css';

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
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
              <NotificationCenter />
              <div className="profile-container" ref={dropdownRef}>
                <button
                  className="profile-circle"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {getProfileImage() ? (
                    <img src={getProfileImage()} alt={user?.name || 'User'} className="profile-circle-img" />
                  ) : (
                    getInitials()
                  )}
                </button>

                {showDropdown && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getProfileImage() ? (
                          <img src={getProfileImage()} alt={user?.name || 'User'} className="profile-dropdown-avatar-img" />
                        ) : (
                          getInitials()
                        )}
                      </div>
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{user?.name || 'User'}</span>
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
