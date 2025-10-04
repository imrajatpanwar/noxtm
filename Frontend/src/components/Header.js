import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';
import './header.css';

function Header({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Navigate to login page instead of simulating login
    navigate('/login');
  };

  const handleLogout = () => {
    // Call the logout function passed from App.js
    if (onLogout) {
      onLogout();
    }
    // Redirect to home page after logout
    navigate('/');
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
              <button className="login-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
