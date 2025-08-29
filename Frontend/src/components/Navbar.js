import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          React MongoDB App
        </Link>
        <div>
          {user ? (
            <>
              <span>Welcome, {user.username}!</span>
              <Link to="/dashboard">Dashboard</Link>
              <button 
                onClick={onLogout}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer',
                  marginLeft: '1rem'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
