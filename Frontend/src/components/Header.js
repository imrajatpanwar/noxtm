import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSettings, FiLogOut, FiClock, FiCloud } from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import HeaderActiveTeam from './HeaderActiveTeam';
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

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getSavedCoordinates = (user) => {
  if (!user) return null;

  const candidates = [
    [user.latitude, user.longitude],
    [user.lat, user.lng],
    [user.lat, user.lon],
    [user.location?.latitude, user.location?.longitude],
    [user.location?.lat, user.location?.lng],
    [user.coords?.latitude, user.coords?.longitude],
    [user.coordinates?.latitude, user.coordinates?.longitude],
    [user.company?.latitude, user.company?.longitude],
    [user.companyId?.latitude, user.companyId?.longitude],
  ];

  for (const [latValue, lonValue] of candidates) {
    const latitude = toFiniteNumber(latValue);
    const longitude = toFiniteNumber(lonValue);
    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
  }

  return null;
};

const getSavedLocationQuery = (user) => {
  if (!user) return '';

  const company = typeof user.companyId === 'object' ? user.companyId : user.company;
  const locationParts = [
    user.city,
    user.state,
    user.country,
    user.locationName,
    user.location,
    company?.companyCity,
    company?.companyState,
    company?.companyCountry,
    company?.headquarters,
    company?.address,
  ]
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean);

  return [...new Set(locationParts)].join(', ');
};

const getNearestTemperature = (hourly) => {
  const times = hourly?.time || [];
  const temperatures = hourly?.temperature_2m || [];
  if (!times.length || !temperatures.length) return null;

  const now = Date.now();
  let nearestIndex = 0;
  let nearestDiff = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const timestamp = new Date(time).getTime();
    const diff = Math.abs(timestamp - now);
    if (Number.isFinite(timestamp) && diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = index;
    }
  });

  return toFiniteNumber(temperatures[nearestIndex]);
};

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  // showTeamPopup removed - now handled by HeaderActiveTeam component
  const dropdownRef = useRef(null);
  const attTimerRef = useRef(null);
  const { onlineUsers } = useContext(MessagingContext);

  // Attendance timer state
  const [attClockedIn, setAttClockedIn] = useState(false);
  const [attSessionStart, setAttSessionStart] = useState(null);
  const [attElapsed, setAttElapsed] = useState(0);
  const [attTotalMin, setAttTotalMin] = useState(0);
  const [attWorkingHours, setAttWorkingHours] = useState(8);
  const [weatherTemp, setWeatherTemp] = useState(null);

  const handleLogin = () => {
    navigate('/signup');
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

  useEffect(() => {
    if (!user) {
      setWeatherTemp(null);
      return undefined;
    }

    let cancelled = false;

    const fetchWeather = async ({ latitude, longitude }) => {
      try {
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          hourly: 'temperature_2m',
          past_days: '0',
          forecast_days: '7',
          timezone: 'auto',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        const data = await response.json();
        const temperature = getNearestTemperature(data.hourly);
        if (!cancelled) setWeatherTemp(temperature);
      } catch (error) {
        if (!cancelled) {
          console.debug('[HEADER] Failed to fetch weather:', error.message);
          setWeatherTemp(null);
        }
      }
    };

    const geocodeLocation = async (locationQuery) => {
      try {
        const params = new URLSearchParams({
          name: locationQuery,
          count: '1',
          language: 'en',
          format: 'json',
        });
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Geocoding request failed: ${response.status}`);
        const data = await response.json();
        const place = data.results?.[0];
        const latitude = toFiniteNumber(place?.latitude);
        const longitude = toFiniteNumber(place?.longitude);
        if (latitude !== null && longitude !== null) {
          await fetchWeather({ latitude, longitude });
          return true;
        }
      } catch (error) {
        console.debug('[HEADER] Failed to geocode weather location:', error.message);
      }
      return false;
    };

    const savedCoordinates = getSavedCoordinates(user);
    if (savedCoordinates) {
      fetchWeather(savedCoordinates);
      return () => { cancelled = true; };
    }

    const fetchFromBrowserLocation = () => {
      if (!navigator.geolocation) {
        setWeatherTemp(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          if (!cancelled) {
            console.debug('[HEADER] Location unavailable for weather:', error.message);
            setWeatherTemp(null);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 }
      );
    };

    const savedLocationQuery = getSavedLocationQuery(user);
    if (savedLocationQuery) {
      geocodeLocation(savedLocationQuery).then((foundLocation) => {
        if (!foundLocation && !cancelled) fetchFromBrowserLocation();
      });
    } else {
      fetchFromBrowserLocation();
    }

    return () => { cancelled = true; };
  }, [user]);

  const fmtTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const attRemainSec = Math.max(0, attWorkingHours * 3600 - Math.floor(attTotalMin * 60) - attElapsed);
  const attIsOvertime = (attTotalMin * 60 + attElapsed) >= (attWorkingHours * 3600);
  const currentDate = new Date();
  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0] || displayName;
  const hour = currentDate.getHours();
  const dayGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const temperatureLabel = weatherTemp === null ? '--°' : `${Math.round(weatherTemp)}°`;

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
              <Link to="/products" className="nav-item btn-style">
                Products
              </Link>
              <Link to="/security" className="nav-item btn-style">
                Security
              </Link>
              <Link to="/documentation" className="nav-item btn-style">
                Documentation
              </Link>
              <button className="login-btn" onClick={handleLogin}>
                Sign in
              </button>
            </>
          ) : (
            <>
              <HeaderActiveTeam activeUsers={activeUsers} />
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
              <div className="header-greeting" aria-label={`${dayGreeting}, ${firstName}. ${formattedDate}. ${temperatureLabel}.`}>
                <strong>{dayGreeting}, {firstName}</strong>
                <span>{formattedDate} · <FiCloud size={14} /> {temperatureLabel}</span>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
