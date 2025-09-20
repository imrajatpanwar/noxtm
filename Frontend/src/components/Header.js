import React from 'react';
import { Link } from 'react-router-dom';
import './header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" className="logo-link">
            <h1>NOXTM</h1>
          </Link>
        </div>
        <nav className="header-nav">
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
          <button className="login-btn">
            Login
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
