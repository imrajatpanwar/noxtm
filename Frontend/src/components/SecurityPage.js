import React from 'react';
import {
  FiShield, FiLock, FiServer, FiDatabase,
  FiEye, FiKey, FiCheckCircle, FiGlobe,
  FiAlertTriangle, FiCpu, FiActivity, FiHardDrive,
  FiRefreshCw
} from 'react-icons/fi';
import './PublicPages.css';

function SecurityPage() {
  const stats = [
    { value: '99.9%', label: 'Uptime SLA', icon: <FiActivity /> },
    { value: 'AES-256', label: 'Encryption Standard', icon: <FiLock /> },
    { value: 'JWT', label: 'Auth Tokens', icon: <FiKey /> },
    { value: '24/7', label: 'Active Monitoring', icon: <FiEye /> },
  ];

  const practices = [
    {
      icon: <FiLock />, color: '#10b981', title: 'Encryption at Rest & In Transit',
      desc: 'All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Database connections, API traffic, and file storage are fully encrypted end-to-end.',
      details: ['AES-256 encryption for stored data', 'TLS 1.3 for all API traffic', 'Encrypted database connections', 'Secure file storage']
    },
    {
      icon: <FiKey />, color: '#3b82f6', title: 'JWT Authentication',
      desc: 'Stateless token-based authentication with configurable expiration. Tokens are signed, verified server-side, and never stored in cookies by default.',
      details: ['Signed JWT tokens', 'Configurable expiration', 'Server-side verification', 'Secure token storage']
    },
    {
      icon: <FiShield />, color: '#8b5cf6', title: 'Role-Based Access Control',
      desc: 'Granular permission system with section-level access control. Company owners define what each role can see, edit, or manage across the platform.',
      details: ['Section-level permissions', 'Custom role definitions', 'Owner-managed access', 'Middleware enforcement']
    },
    {
      icon: <FiServer />, color: '#06b6d4', title: 'Secure Infrastructure',
      desc: 'Hosted on hardened Linux servers with SSH key-only access, automated security patches, and firewall rules restricting unnecessary ports.',
      details: ['SSH key-only access', 'Automated patching', 'Firewall protection', 'Port restrictions']
    },
    {
      icon: <FiEye />, color: '#f59e0b', title: 'Audit Logging',
      desc: 'Every significant action is logged \u2014 logins, data changes, permission updates, and admin operations. Full audit trail for compliance.',
      details: ['Login tracking', 'Data change logs', 'Permission audit trail', 'Admin operation logs']
    },
    {
      icon: <FiDatabase />, color: '#ec4899', title: 'Data Isolation',
      desc: 'Every company\'s data is logically isolated via companyId scoping. No cross-tenant data leakage. Queries are always filtered at the middleware level.',
      details: ['Tenant-level isolation', 'companyId scoping', 'Middleware filtering', 'Zero cross-tenant access']
    },
    {
      icon: <FiGlobe />, color: '#64748b', title: 'Rate Limiting & DDoS Protection',
      desc: 'API endpoints are rate-limited per user and IP. Email and WhatsApp endpoints have additional throttling. Infrastructure-level DDoS mitigation is active.',
      details: ['Per-user rate limits', 'Per-IP rate limits', 'Communication throttling', 'DDoS mitigation']
    },
    {
      icon: <FiCheckCircle />, color: '#10b981', title: 'Input Validation & Sanitization',
      desc: 'All user inputs are validated and sanitized server-side before database operations. File uploads are type-checked, size-limited, and stored securely.',
      details: ['Server-side validation', 'Input sanitization', 'File type checking', 'Size limit enforcement']
    },
  ];

  const compliance = [
    { icon: <FiLock />, label: 'TLS 1.3 Enforced', desc: 'All connections encrypted' },
    { icon: <FiShield />, label: 'OWASP Top 10', desc: 'Protected against all vectors' },
    { icon: <FiEye />, label: 'Admin Audit Logs', desc: 'Complete action history' },
    { icon: <FiKey />, label: 'Bcrypt Hashing', desc: '12-round password hashing' },
    { icon: <FiAlertTriangle />, label: 'No Third-Party Sharing', desc: 'Your data stays with us' },
    { icon: <FiRefreshCw />, label: 'Regular Backups', desc: 'Daily encrypted backups' },
  ];

  const dataHandling = [
    {
      icon: <FiHardDrive />,
      title: 'Storage',
      desc: 'Data is stored in MongoDB with encrypted connections. Files are stored on the server filesystem with path-based access control. No data is sent to third-party analytics.'
    },
    {
      icon: <FiCpu />,
      title: 'Retention',
      desc: 'Your data is retained for the lifetime of your account. Upon account deletion, all associated data including company data, files, and messages are permanently removed.'
    },
    {
      icon: <FiRefreshCw />,
      title: 'Backups',
      desc: 'Automated daily backups with point-in-time recovery. Backups are encrypted and stored in a separate location from the primary database.'
    },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">

        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge"><FiShield style={{ fontSize: 13 }} /> Security</span>
          <h1>Security at Noxtm</h1>
          <p>
            Your business data is critical. We have built Noxtm with security at every layer \u2014 from infrastructure to application logic \u2014 so you can work with confidence.
          </p>
        </div>

        {/* Stats */}
        <div className="security-stats-grid">
          {stats.map((s, i) => (
            <div className="security-stat-card" key={i}>
              <div className="security-stat-icon">{s.icon}</div>
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Practices */}
        <div className="products-section-heading">
          <span className="products-section-label">Protection</span>
          <h2 className="public-section-title">How we protect your data</h2>
          <p className="public-section-subtitle">Security is not a feature \u2014 it is the foundation of everything we build.</p>
        </div>

        <div className="security-practices-grid">
          {practices.map((p, i) => (
            <div className="security-practice-card" key={i}>
              <div className="security-practice-header">
                <div className="security-practice-icon" style={{ background: p.color + '12', color: p.color }}>
                  {p.icon}
                </div>
                <h3>{p.title}</h3>
              </div>
              <p>{p.desc}</p>
              <div className="security-practice-details">
                {p.details.map((d, di) => (
                  <span key={di}><FiCheckCircle style={{ color: p.color }} /> {d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Compliance */}
        <div className="products-section-heading">
          <span className="products-section-label">Standards</span>
          <h2 className="public-section-title">Standards & compliance</h2>
          <p className="public-section-subtitle">The security measures we follow as standard practice across the platform.</p>
        </div>
        <div className="security-compliance-grid">
          {compliance.map((c, i) => (
            <div className="security-compliance-card" key={i}>
              <div className="security-compliance-card-icon">{c.icon}</div>
              <h4>{c.label}</h4>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Data Handling */}
        <div className="products-section-heading">
          <span className="products-section-label">Data</span>
          <h2 className="public-section-title">Data handling</h2>
          <p className="public-section-subtitle">How Noxtm processes and stores your information.</p>
        </div>
        <div className="security-data-grid">
          {dataHandling.map((d, i) => (
            <div className="security-data-card" key={i}>
              <div className="security-data-icon">{d.icon}</div>
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Responsible Disclosure */}
        <div className="public-cta" style={{ marginTop: 48 }}>
          <FiAlertTriangle style={{ fontSize: 28, color: '#f59e0b', marginBottom: 12 }} />
          <h2>Found a vulnerability?</h2>
          <p>We take security reports seriously. Please disclose responsibly and we will respond promptly.</p>
          <a href="mailto:security@noxtm.com" className="public-btn public-btn-primary" style={{ textDecoration: 'none' }}>
            security@noxtm.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default SecurityPage;
