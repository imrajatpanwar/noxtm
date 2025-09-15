import React from 'react';
import { Link } from 'react-router-dom';
import './header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" className="logo-link">
            <h1>NOXTM STUDIO</h1>
          </Link>
        </div>
        <nav className="header-nav">
          <a href="mailto:hello@noxtmstudio.com" className="nav-item">
            hello@noxtmstudio.com
          </a>
          <a href="#services" className="nav-item btn-style">
            Services
          </a>
          <a href="#portfolio" className="nav-item btn-style">
            Portfolio
          </a>
          <Link to="/blog" className="nav-item btn-style">
            Blog
          </Link>
          <button className="get-started-btn">
            Get Started
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
