import React from 'react';
import {
  FiShield, FiLock, FiServer, FiDatabase,
  FiEye, FiKey, FiCheckCircle, FiGlobe
} from 'react-icons/fi';
import './PublicPages.css';

function SecurityPage() {
  const stats = [
    { value: '99.9%', label: 'Uptime SLA' },
    { value: 'AES-256', label: 'Encryption' },
    { value: 'JWT', label: 'Auth Tokens' },
    { value: '24/7', label: 'Monitoring' },
  ];

  const practices = [
    {
      icon: <FiLock />, color: 'green', title: 'Encryption at Rest & In Transit',
      desc: 'All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Database connections, API traffic, and file storage are fully encrypted end-to-end.'
    },
    {
      icon: <FiKey />, color: 'blue', title: 'JWT Authentication',
      desc: 'Stateless token-based authentication with configurable expiration. Tokens are signed, verified server-side, and never stored in cookies by default.'
    },
    {
      icon: <FiShield />, color: 'purple', title: 'Role-Based Access Control',
      desc: 'Granular permission system with section-level access control. Company owners define what each role can see, edit, or manage across the platform.'
    },
    {
      icon: <FiServer />, color: 'cyan', title: 'Secure Infrastructure',
      desc: 'Hosted on hardened Linux servers with SSH key-only access, automated security patches, and firewall rules restricting unnecessary ports.'
    },
    {
      icon: <FiEye />, color: 'orange', title: 'Audit Logging',
      desc: 'Every significant action is logged — logins, data changes, permission updates, and admin operations. Full audit trail for compliance and accountability.'
    },
    {
      icon: <FiDatabase />, color: 'rose', title: 'Data Isolation',
      desc: 'Every company\'s data is logically isolated via companyId scoping. No cross-tenant data leakage. Queries are always filtered at the middleware level.'
    },
    {
      icon: <FiGlobe />, color: 'slate', title: 'Rate Limiting & DDoS Protection',
      desc: 'API endpoints are rate-limited per user and IP. Email and WhatsApp endpoints have additional throttling. Infrastructure-level DDoS mitigation is always active.'
    },
    {
      icon: <FiCheckCircle />, color: 'green', title: 'Input Validation & Sanitization',
      desc: 'All user inputs are validated and sanitized server-side before database operations. File uploads are type-checked, size-limited, and stored securely.'
    },
  ];

  const compliance = [
    { icon: '🔒', label: 'TLS 1.3 Enforced' },
    { icon: '🛡️', label: 'OWASP Top 10 Protected' },
    { icon: '📝', label: 'Admin Audit Logs' },
    { icon: '🔐', label: 'Bcrypt Password Hashing' },
    { icon: '🚫', label: 'No Third-Party Data Sharing' },
    { icon: '💾', label: 'Regular Backups' },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">
        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge">Security</span>
          <h1>Security at Noxtm</h1>
          <p>
            Your business data is critical. We've built Noxtm with security at every layer — from infrastructure to application logic — so you can work with confidence.
          </p>
        </div>

        {/* Stats */}
        <div className="security-stats-grid">
          {stats.map((s, i) => (
            <div className="security-stat-card" key={i}>
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Practices */}
        <h2 className="public-section-title">How we protect your data</h2>
        <p className="public-section-subtitle">Security isn't a feature — it's the foundation.</p>
        <div className="public-cards-grid public-cards-grid-2">
          {practices.map((p, i) => (
            <div className="public-card" key={i}>
              <div className={`public-card-icon ${p.color}`}>{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Compliance Badges */}
        <h2 className="public-section-title">Standards & Compliance</h2>
        <p className="public-section-subtitle">The security measures we follow as standard practice.</p>
        <div className="security-compliance-row">
          {compliance.map((c, i) => (
            <div className="security-compliance-badge" key={i}>
              <div className="security-compliance-icon">{c.icon}</div>
              {c.label}
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Data Handling */}
        <h2 className="public-section-title">Data Handling</h2>
        <p className="public-section-subtitle" style={{ maxWidth: '100%' }}>How Noxtm processes and stores your information.</p>
        <div className="public-cards-grid">
          <div className="public-card">
            <h3>Storage</h3>
            <p>Data is stored in MongoDB with encrypted connections. Files are stored on the server filesystem with path-based access control. No data is sent to third-party analytics.</p>
          </div>
          <div className="public-card">
            <h3>Retention</h3>
            <p>Your data is retained for the lifetime of your account. Upon account deletion, all associated data including company data, files, and messages are permanently removed.</p>
          </div>
          <div className="public-card">
            <h3>Backups</h3>
            <p>Automated daily backups with point-in-time recovery. Backups are encrypted and stored in a separate location from the primary database.</p>
          </div>
        </div>

        {/* Responsible Disclosure */}
        <div className="public-cta">
          <h2>Found a vulnerability?</h2>
          <p>We take security reports seriously. Please disclose responsibly.</p>
          <a href="mailto:security@noxtm.com" className="public-btn public-btn-primary" style={{ textDecoration: 'none' }}>
            security@noxtm.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default SecurityPage;
