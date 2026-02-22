import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSettings, FiLogOut, FiClock } from 'react-icons/fi';
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
    <div className="header-team-avatar-wrap">
      <div
        className="header-team-avatar"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          background: profileImg ? 'transparent' : bgColor
        }}
      >
        {profileImg ? (
          <img src={profileImg} alt={displayName} />
        ) : (
          <span>{initials}</span>
        )}
        <span className="header-team-active-dot" />
      </div>
      <div className="header-team-tooltip">{displayName}</div>
    </div>
  );
};

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showTeamPopup, setShowTeamPopup] = useState(false);
  const dropdownRef = useRef(null);
  const attTimerRef = useRef(null);
  const { onlineUsers } = useContext(MessagingContext);

  // Attendance timer state
  const [attClockedIn, setAttClockedIn] = useState(false);
  const [attSessionStart, setAttSessionStart] = useState(null);
  const [attElapsed, setAttElapsed] = useState(0);
  const [attTotalMin, setAttTotalMin] = useState(0);
  const [attWorkingHours, setAttWorkingHours] = useState(8);

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

  // Attendance timer — fetch today's data
  useEffect(() => {
    if (!user) return;
    const fetchToday = async () => {
      try {
        const res = await api.get('/attendance/today');
        if (res.data.success) {
          setAttClockedIn(!!res.data.isClockedIn);
          setAttSessionStart(res.data.activeSessionStart ? new Date(res.data.activeSessionStart) : null);
          setAttTotalMin(res.data.attendance?.totalMinutes || 0);
          setAttWorkingHours(res.data.workingHoursPerDay || 8);
        }
      } catch (e) { /* silent */ }
    };
    fetchToday();
    const interval = setInterval(fetchToday, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Live timer tick
  useEffect(() => {
    if (attClockedIn && attSessionStart) {
      const tick = () => setAttElapsed(Math.floor((new Date() - new Date(attSessionStart)) / 1000));
      tick();
      attTimerRef.current = setInterval(tick, 1000);
      return () => clearInterval(attTimerRef.current);
    } else {
      setAttElapsed(0);
      if (attTimerRef.current) clearInterval(attTimerRef.current);
    }
  }, [attClockedIn, attSessionStart]);

  const fmtTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const attRemainSec = Math.max(0, attWorkingHours * 3600 - Math.floor(attTotalMin * 60) - attElapsed);
  const attIsOvertime = (attTotalMin * 60 + attElapsed) >= (attWorkingHours * 3600);

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
              {attClockedIn && (
                <div className={`header-timer ${attIsOvertime ? 'overtime' : ''}`}>
                  <span className="header-timer-dot" />
                  <FiClock size={13} />
                  <span className="header-timer-time">{fmtTime(attRemainSec)}</span>
                  <span className="header-timer-label">{attIsOvertime ? 'OT' : 'left'}</span>
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
