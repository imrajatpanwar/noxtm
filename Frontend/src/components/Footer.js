import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Noxtm</h3>
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
              <li>hello@noxtm.com</li>
              <li>+1 (555) 123-4567</li>
              <li>123 Studio Street</li>
              <li>Creative City, CC 12345</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms" className="footer-link">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
              <li><Link to="/cancellation-refunds" className="footer-link">Cancellation & Refunds</Link></li>
              <li><Link to="/shipping" className="footer-link">Shipping</Link></li>
              <li><Link to="/contact" className="footer-link">Contact Us</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Account</h4>
            <ul>
              <li><Link to="/login" className="footer-link">Login</Link></li>
              <li><Link to="/signup" className="footer-link">Sign Up</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 Noxtm. All rights reserved. | Version v00.04</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
