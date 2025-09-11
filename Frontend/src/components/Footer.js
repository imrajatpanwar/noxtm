import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>NOXTM STUDIO</h3>
            <p>Creating digital experiences that inspire and engage.</p>
          </div>
          
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li>Web Design</li>
              <li>Development</li>
              <li>Branding</li>
              <li>Consulting</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contact</h4>
            <ul>
              <li>hello@noxtmstudio.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Studio Street</li>
              <li>Creative City, CC 12345</li>
            </ul>
          </div>
          
          <div className="footer-section combined-section">
            <div className="follow-account-row">
              <div className="follow-section">
                <h4>Follow Us</h4>
                <div className="social-links">
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">LinkedIn</a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">Twitter</a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link">Instagram</a>
                </div>
              </div>
              
              <div className="account-section">
                <h4>Account</h4>
                <ul>
                  <li><Link to="/login" className="footer-link">Login</Link></li>
                  <li><Link to="/signup" className="footer-link">Sign Up</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 NOXTM STUDIO. All rights reserved. | Version v00.02</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
