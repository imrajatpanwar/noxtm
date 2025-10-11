import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiGlobe, FiCheckCircle, FiXCircle, FiRefreshCw, FiCopy, FiAlertCircle } from 'react-icons/fi';
import './DnsConfiguration.css';

function DnsConfiguration() {
  const [dnsStatus, setDnsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState('');

  const fetchDnsStatus = async () => {
    try {
      setChecking(true);
      const response = await api.get('/noxtm-mail/dns-check');
      setDnsStatus(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to check DNS configuration:', err);
      setError('Failed to check DNS configuration. Please try again.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchDnsStatus();
  }, []);

  const copyToClipboard = (text, recordType) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(recordType);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const getStatusIcon = (isValid) => {
    return isValid ? (
      <FiCheckCircle className="status-icon status-icon-success" />
    ) : (
      <FiXCircle className="status-icon status-icon-error" />
    );
  };

  const getStatusClass = (isValid) => {
    return isValid ? 'status-badge-success' : 'status-badge-error';
  };

  if (loading) {
    return (
      <div className="dns-configuration">
        <div className="dns-header">
          <h2>DNS Configuration</h2>
        </div>
        <div className="dns-loading">
          <FiRefreshCw className="loading-spinner" />
          <p>Checking DNS configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dns-configuration">
        <div className="dns-header">
          <h2>DNS Configuration</h2>
        </div>
        <div className="dns-error">
          <FiAlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={fetchDnsStatus} className="btn-retry">
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dns-configuration">
      {/* Header */}
      <div className="dns-header">
        <h2>
          <FiGlobe className="header-icon" />
          DNS Configuration
        </h2>
        <button
          onClick={fetchDnsStatus}
          className={`btn-refresh ${checking ? 'checking' : ''}`}
          disabled={checking}
        >
          <FiRefreshCw className={checking ? 'spinning' : ''} />
          {checking ? 'Checking...' : 'Check DNS'}
        </button>
      </div>

      {/* Overall Status */}
      <div className="dns-card dns-card-main">
        <h3>Overall DNS Status</h3>
        <div className="status-indicator">
          {getStatusIcon(dnsStatus?.allValid)}
          <span className={`status-badge ${getStatusClass(dnsStatus?.allValid)}`}>
            {dnsStatus?.allValid ? 'ALL CONFIGURED' : 'ISSUES DETECTED'}
          </span>
        </div>
        {!dnsStatus?.allValid && (
          <p className="status-message">
            Some DNS records need attention. Please review the records below and update them in your DNS provider (Cloudflare).
          </p>
        )}
      </div>

      {/* MX Record */}
      <div className="dns-card">
        <div className="card-header">
          <div className="card-title">
            <h3>MX Record (Mail Exchange)</h3>
            {getStatusIcon(dnsStatus?.mx?.valid)}
          </div>
          <span className={`status-badge ${getStatusClass(dnsStatus?.mx?.valid)}`}>
            {dnsStatus?.mx?.valid ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="card-content">
          <div className="record-info">
            <div className="record-row">
              <span className="record-label">Type:</span>
              <span className="record-value">MX</span>
            </div>
            <div className="record-row">
              <span className="record-label">Name:</span>
              <span className="record-value">@</span>
            </div>
            <div className="record-row">
              <span className="record-label">Priority:</span>
              <span className="record-value">10</span>
            </div>
            <div className="record-row">
              <span className="record-label">Value:</span>
              <div className="record-value-actions">
                <code className="record-code">mail.noxtm.com</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard('mail.noxtm.com', 'mx')}
                  title="Copy to clipboard"
                >
                  <FiCopy />
                  {copied === 'mx' && <span className="copied-text">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
          {dnsStatus?.mx?.current && (
            <div className="current-value">
              <strong>Current Value:</strong> {dnsStatus.mx.current}
            </div>
          )}
        </div>
      </div>

      {/* SPF Record */}
      <div className="dns-card">
        <div className="card-header">
          <div className="card-title">
            <h3>SPF Record (Sender Policy Framework)</h3>
            {getStatusIcon(dnsStatus?.spf?.valid)}
          </div>
          <span className={`status-badge ${getStatusClass(dnsStatus?.spf?.valid)}`}>
            {dnsStatus?.spf?.valid ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="card-content">
          <div className="record-info">
            <div className="record-row">
              <span className="record-label">Type:</span>
              <span className="record-value">TXT</span>
            </div>
            <div className="record-row">
              <span className="record-label">Name:</span>
              <span className="record-value">@</span>
            </div>
            <div className="record-row">
              <span className="record-label">Value:</span>
              <div className="record-value-actions">
                <code className="record-code">v=spf1 ip4:185.137.122.61 ~all</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard('v=spf1 ip4:185.137.122.61 ~all', 'spf')}
                  title="Copy to clipboard"
                >
                  <FiCopy />
                  {copied === 'spf' && <span className="copied-text">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
          {dnsStatus?.spf?.current && (
            <div className="current-value">
              <strong>Current Value:</strong> {dnsStatus.spf.current}
            </div>
          )}
          <div className="record-description">
            SPF helps prevent email spoofing by specifying which mail servers are authorized to send email on behalf of your domain.
          </div>
        </div>
      </div>

      {/* DKIM Record */}
      <div className="dns-card">
        <div className="card-header">
          <div className="card-title">
            <h3>DKIM Record (DomainKeys Identified Mail)</h3>
            {getStatusIcon(dnsStatus?.dkim?.valid)}
          </div>
          <span className={`status-badge ${getStatusClass(dnsStatus?.dkim?.valid)}`}>
            {dnsStatus?.dkim?.valid ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="card-content">
          <div className="record-info">
            <div className="record-row">
              <span className="record-label">Type:</span>
              <span className="record-value">TXT</span>
            </div>
            <div className="record-row">
              <span className="record-label">Name:</span>
              <span className="record-value">default._domainkey</span>
            </div>
            <div className="record-row">
              <span className="record-label">Value:</span>
              <div className="record-value-actions">
                <code className="record-code record-code-long">
                  {dnsStatus?.dkim?.expected || 'v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY_HERE'}
                </code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(dnsStatus?.dkim?.expected || '', 'dkim')}
                  title="Copy to clipboard"
                >
                  <FiCopy />
                  {copied === 'dkim' && <span className="copied-text">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
          {dnsStatus?.dkim?.current && (
            <div className="current-value">
              <strong>Current Value:</strong> {dnsStatus.dkim.current.substring(0, 100)}...
            </div>
          )}
          <div className="record-description">
            DKIM adds a digital signature to your emails, allowing receiving mail servers to verify that the email actually came from your domain.
          </div>
        </div>
      </div>

      {/* DMARC Record */}
      <div className="dns-card">
        <div className="card-header">
          <div className="card-title">
            <h3>DMARC Record (Domain-based Message Authentication)</h3>
            {getStatusIcon(dnsStatus?.dmarc?.valid)}
          </div>
          <span className={`status-badge ${getStatusClass(dnsStatus?.dmarc?.valid)}`}>
            {dnsStatus?.dmarc?.valid ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="card-content">
          <div className="record-info">
            <div className="record-row">
              <span className="record-label">Type:</span>
              <span className="record-value">TXT</span>
            </div>
            <div className="record-row">
              <span className="record-label">Name:</span>
              <span className="record-value">_dmarc</span>
            </div>
            <div className="record-row">
              <span className="record-label">Value:</span>
              <div className="record-value-actions">
                <code className="record-code">v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard('v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com', 'dmarc')}
                  title="Copy to clipboard"
                >
                  <FiCopy />
                  {copied === 'dmarc' && <span className="copied-text">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
          {dnsStatus?.dmarc?.current && (
            <div className="current-value">
              <strong>Current Value:</strong> {dnsStatus.dmarc.current}
            </div>
          )}
          <div className="record-description">
            DMARC tells receiving mail servers what to do with emails that fail SPF or DKIM checks, and where to send reports about email authentication results.
          </div>
        </div>
      </div>

      {/* PTR Record */}
      <div className="dns-card">
        <div className="card-header">
          <div className="card-title">
            <h3>PTR Record (Reverse DNS)</h3>
            {getStatusIcon(dnsStatus?.ptr?.valid)}
          </div>
          <span className={`status-badge ${getStatusClass(dnsStatus?.ptr?.valid)}`}>
            {dnsStatus?.ptr?.valid ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="card-content">
          <div className="record-info">
            <div className="record-row">
              <span className="record-label">IP Address:</span>
              <span className="record-value">185.137.122.61</span>
            </div>
            <div className="record-row">
              <span className="record-label">Should Point To:</span>
              <div className="record-value-actions">
                <code className="record-code">mail.noxtm.com</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard('mail.noxtm.com', 'ptr')}
                  title="Copy to clipboard"
                >
                  <FiCopy />
                  {copied === 'ptr' && <span className="copied-text">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
          {dnsStatus?.ptr?.current && (
            <div className="current-value">
              <strong>Current Value:</strong> {dnsStatus.ptr.current}
            </div>
          )}
          <div className="record-description">
            PTR records are managed by your hosting provider (Contabo). Reverse DNS ensures that your IP address resolves back to your mail server hostname.
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="dns-help">
        <h3>Need Help?</h3>
        <ul>
          <li>All DNS records (except PTR) should be configured in your Cloudflare dashboard</li>
          <li>PTR record must be configured in your Contabo control panel</li>
          <li>DNS changes can take up to 48 hours to propagate, but usually happen within minutes</li>
          <li>Use the "Check DNS" button after making changes to verify configuration</li>
        </ul>
      </div>
    </div>
  );
}

export default DnsConfiguration;
