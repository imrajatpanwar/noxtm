import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>NOXTM</h3>
            <p>Management of Your Masterpiece</p>
          </div>
          
          <div className="footer-section">
            <h4>Developers &amp; Updates</h4>
            <ul>
              <li><Link to="/documentation" className="footer-link">Documentation</Link></li>
              <li><Link to="/careers" className="footer-link">Career</Link></li>
              <li><Link to="/api-reference" className="footer-link">API Reference</Link></li>
              <li><Link to="/security" className="footer-link">Security</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/legal" className="footer-link">Terms & Conditions</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Account</h4>
            <ul>
              <li><Link to="/login" className="footer-link">Login</Link></li>
              <li><Link to="/signup" className="footer-link">Sign Up</Link></li>
              <li><a href="https://www.linkedin.com/company/noxtm" className="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://www.instagram.com/noxtmofficial/" className="footer-link" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <ul>
              <li>hello@noxtm.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Studio Street</li>
              <li>Creative City, CC 12345</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 Noxtm. All rights reserved. | Version v00.04</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
