import React from 'react';
import './Home.css';
import { MAIL_LOGIN_URL, getMainAppUrl } from '../config/authConfig';

const Home = () => {
  const handleGetStarted = () => {
    window.location.href = MAIL_LOGIN_URL;
  };

  const handleSignIn = () => {
    window.location.href = MAIL_LOGIN_URL;
  };

  return (
    <div className="mail-home">
      {/* Header Navigation */}
      <header className="mail-home-header">
        <div className="header-container">
          <div className="logo">
            <h2>Noxtm Mail</h2>
          </div>
          <nav className="header-nav">
            <button onClick={handleSignIn} className="btn-signin">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Professional Email Management
            </h1>
            <p className="hero-description">
              Manage personal and team inboxes with powerful analytics,
              SLA monitoring, and seamless collaboration tools.
            </p>
            <div className="hero-buttons">
              <button onClick={handleGetStarted} className="btn-get-started">
                Get Started
              </button>
              <a href={getMainAppUrl()} className="btn-learn-more">
                Learn More
              </a>
            </div>
          </div>
          <div className="hero-image">
            <div className="email-preview-card">
              <div className="card-header">
                <div className="card-dot"></div>
                <div className="card-dot"></div>
                <div className="card-dot"></div>
              </div>
              <div className="card-content">
                <div className="inbox-item">
                  <div className="inbox-icon">📥</div>
                  <div className="inbox-text">
                    <div className="inbox-title">Personal Inbox</div>
                    <div className="inbox-count">12 new messages</div>
                  </div>
                </div>
                <div className="inbox-item">
                  <div className="inbox-icon">👥</div>
                  <div className="inbox-text">
                    <div className="inbox-title">Team Inbox</div>
                    <div className="inbox-count">5 unread</div>
                  </div>
                </div>
                <div className="inbox-item">
                  <div className="inbox-icon">📊</div>
                  <div className="inbox-text">
                    <div className="inbox-title">Analytics</div>
                    <div className="inbox-count">View insights</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="features-heading">Powerful Email Features</h2>
          <p className="features-subheading">
            Everything you need to manage emails efficiently
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📥</div>
              <h3 className="feature-title">Personal Inbox</h3>
              <p className="feature-description">
                Manage your personal emails with advanced filtering,
                search, and organization tools.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3 className="feature-title">Team Collaboration</h3>
              <p className="feature-description">
                Share mailboxes with your team, assign emails,
                and collaborate on responses.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Email Analytics</h3>
              <p className="feature-description">
                Track email metrics, response times, and
                team performance with detailed reports.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">SLA Monitoring</h3>
              <p className="feature-description">
                Set and monitor service level agreements to ensure
                timely responses to customers.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3 className="feature-title">Email Templates</h3>
              <p className="feature-description">
                Create reusable email templates to save time and
                maintain consistent communication.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3 className="feature-title">Assignment Rules</h3>
              <p className="feature-description">
                Automatically route emails to team members based
                on custom rules and conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-heading">Ready to get started?</h2>
          <p className="cta-description">
            Join thousands of teams managing their emails with Noxtm Mail
          </p>
          <button onClick={handleGetStarted} className="btn-cta">
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mail-home-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Noxtm Mail</h4>
              <p>Professional email management platform</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href={getMainAppUrl()}>Main Platform</a></li>
                <li><a href={getMainAppUrl('/pricing')}>Pricing</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href={getMainAppUrl('/blog')}>Blog</a></li>
                <li><a href={getMainAppUrl('/legal/privacy')}>Privacy</a></li>
                <li><a href={getMainAppUrl('/legal/terms')}>Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Noxtm. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
