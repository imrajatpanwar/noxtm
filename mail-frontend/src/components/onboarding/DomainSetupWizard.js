import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './DomainSetupWizard.css';

/**
 * Domain Setup Wizard - BYOD Onboarding
 *
 * 5-step wizard to guide users through setting up their own domain
 * for email hosting instead of using noxtm.com
 */
const DomainSetupWizard = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [domainName, setDomainName] = useState('');
  const [domainId, setDomainId] = useState(null);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [awsSesInfo, setAwsSesInfo] = useState(null);
  const [, setVerificationResults] = useState(null);

  // CRITICAL: Restore token when wizard mounts (in case it was cleared)
  useEffect(() => {
    if (window.__NOXTM_AUTH_TOKEN__ && !localStorage.getItem('token')) {
      console.warn('[WIZARD] Token missing! Restoring from backup...');
      localStorage.setItem('token', window.__NOXTM_AUTH_TOKEN__);
    }
  }, []);

  // DISABLED: Inbox component already checks domains before showing wizard
  // This duplicate check was causing auth token issues
  // The parent component (Inbox) already verified no domain exists before showing wizard
  // useEffect(() => {
  //   checkExistingDomains();
  // }, []);

  // const checkExistingDomains = async () => {
  //   try {
  //     const response = await api.get('/email-domains');
  //     const verifiedDomain = response.data.data?.find(d => d.verified);

  //     if (verifiedDomain) {
  //       // User already has a verified domain, skip wizard
  //       if (onComplete) {
  //         onComplete(verifiedDomain);
  //       }
  //     }
  //   } catch (err) {
  //     console.error('Error checking existing domains:', err);
  //   }
  // };

  // Step 1: Enter domain name
  const handleDomainSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate domain format
      const domainRegex = /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(domainName)) {
        setError('Please enter a valid domain name (e.g., yourcompany.com)');
        setLoading(false);
        return;
      }

      // Check for reserved domains
      const reservedDomains = ['noxtm.com', 'mail.noxtm.com', 'localhost'];
      if (reservedDomains.includes(domainName.toLowerCase())) {
        setError('This domain is reserved for platform use. Please use your own domain.');
        setLoading(false);
        return;
      }

      // Create domain with AWS SES registration
      const response = await api.post('/email-domains', {
        domain: domainName.toLowerCase(),
        defaultQuota: 1024, // 1GB default
        maxAccounts: 50
      });

      if (response.data.success) {
        setDomainId(response.data.data._id);
        setAwsSesInfo(response.data.awsSes);

        // Fetch DNS instructions
        const dnsResponse = await api.get(`/email-domains/${response.data.data._id}/dns-instructions`);
        setDnsRecords(dnsResponse.data.data.records);

        setCurrentStep(2);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to add domain';

      // SMART HANDLING: If domain already exists, fetch it and proceed
      if (errorMessage.includes('already exists') || errorMessage.includes('Domain already registered')) {
        try {
          // Fetch existing domains to get the domain ID
          const domainsResponse = await api.get('/email-domains');
          const existingDomain = domainsResponse.data.data?.find(
            d => d.domain.toLowerCase() === domainName.toLowerCase()
          );

          if (existingDomain) {
            // Set the existing domain data
            setDomainId(existingDomain._id);
            setAwsSesInfo(existingDomain.awsSes);

            // Fetch DNS instructions for existing domain
            const dnsResponse = await api.get(`/email-domains/${existingDomain._id}/dns-instructions`);
            setDnsRecords(dnsResponse.data.data.records);

            // Show info message instead of error
            setError('ℹ️ This domain is already added to your account. Proceeding to DNS setup...');

            // Automatically proceed to next step after 1.5 seconds
            setTimeout(() => {
              setError('');
              setCurrentStep(2);
            }, 1500);
          } else {
            setError(errorMessage);
          }
        } catch (fetchErr) {
          setError('Domain already exists but could not fetch details. Please refresh the page.');
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify DNS
  const handleVerifyDNS = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post(`/email-domains/${domainId}/verify-dns`);
      setVerificationResults(response.data);

      if (response.data.verified) {
        setCurrentStep(4); // Full verification complete
      } else if (response.data.partiallyVerified) {
        setCurrentStep(3.5); // Partial verification, waiting for AWS SES
      } else {
        setError(response.data.message || 'Verification failed. Please check your DNS records.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify DNS');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-step">
            <div className="wizard-icon">🌐</div>
            <h2>Welcome to Mail Platform</h2>
            <p className="wizard-subtitle">
              To get started, you'll need to add your own domain. This ensures your emails come from your company's domain (e.g., info@yourcompany.com) instead of noxtm.com.
            </p>

            <form onSubmit={handleDomainSubmit} className="wizard-form">
              <div className="form-group">
                <label htmlFor="domain">Your Company Domain</label>
                <input
                  id="domain"
                  type="text"
                  placeholder="yourcompany.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  required
                  disabled={loading}
                  className="wizard-input"
                />
                <span className="input-hint">
                  Enter the domain you want to use for email (without www or http://)
                </span>
              </div>

              {error && <div className="wizard-error">{error}</div>}

              <div className="wizard-actions">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Adding Domain...' : 'Continue'}
                </button>
              </div>
            </form>

            <div className="wizard-info">
              <h4>Why do I need this?</h4>
              <ul>
                <li>Professional emails from your own domain</li>
                <li>Better email deliverability and trust</li>
                <li>Full control over your email infrastructure</li>
                <li>Compliance with email authentication standards</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizard-step">
            <div className="wizard-icon">🔧</div>
            <h2>Configure DNS Records</h2>
            <p className="wizard-subtitle">
              Add these DNS records to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.)
            </p>

            {awsSesInfo?.registered && (
              <div className="aws-ses-status success">
                ✓ Domain registered with AWS SES - DKIM will be verified automatically
              </div>
            )}

            <div className="dns-records-container">
              {dnsRecords?.map((record, index) => (
                <div key={index} className="dns-record-card">
                  <div className="dns-record-header">
                    <span className="dns-type">{record.type}</span>
                    {record.verified && <span className="dns-verified">✓ Verified</span>}
                  </div>

                  <div className="dns-record-details">
                    <div className="dns-field">
                      <label>Name/Host:</label>
                      <code>{record.name}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(record.name)}
                        className="btn-copy"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>

                    <div className="dns-field">
                      <label>Value:</label>
                      <code className="dns-value">{record.value}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(record.value)}
                        className="btn-copy"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>

                    {record.priority && (
                      <div className="dns-field">
                        <label>Priority:</label>
                        <code>{record.priority}</code>
                      </div>
                    )}

                    <p className="dns-purpose">{record.purpose}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="wizard-info">
              <h4>Setup Instructions:</h4>
              <ol>
                <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                <li>Navigate to DNS management or DNS settings</li>
                <li>Add each record listed above with the <strong>exact record type</strong> shown</li>
                <li>Wait 10-30 minutes for DNS propagation</li>
                <li>Click "Verify DNS" below to check configuration</li>
              </ol>

              <div className="wizard-warning" style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                padding: '12px',
                borderRadius: '4px',
                marginTop: '15px'
              }}>
                <strong>⚠️ Important:</strong>
                <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                  <li>For <strong>CNAME records</strong> pointing to AWS SMTP (like <code>email-smtp.eu-north-1.amazonaws.com</code>), you MUST use CNAME type, NOT A record</li>
                  <li>A records require IPv4 addresses (like 192.0.2.1), not hostnames</li>
                  <li>If your DNS provider shows an error like "Valid IPv4 address is required", you're using the wrong record type</li>
                </ul>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary">
                Back
              </button>
              <button onClick={handleVerifyDNS} disabled={loading} className="btn-primary">
                {loading ? 'Verifying...' : 'Verify DNS Configuration'}
              </button>
            </div>
          </div>
        );

      case 3.5:
        return (
          <div className="wizard-step">
            <div className="wizard-icon">✓ ⏳</div>
            <h2>DNS Records Verified!</h2>
            <p className="wizard-subtitle">
              Your DNS records are correctly configured. AWS SES is automatically verifying your DKIM records in the background.
            </p>

            <div className="verification-status">
              <div className="status-item success">
                <span className="status-icon">✓</span>
                <span>Verification Token</span>
              </div>
              <div className="status-item success">
                <span className="status-icon">✓</span>
                <span>MX Records</span>
              </div>
              <div className="status-item success">
                <span className="status-icon">✓</span>
                <span>SPF Records</span>
              </div>
              <div className="status-item pending">
                <span className="status-icon">⏳</span>
                <span>AWS SES DKIM Verification (Automatic)</span>
              </div>
            </div>

            <div className="wizard-info">
              <h4>What's next?</h4>
              <p>
                AWS SES is automatically verifying your DKIM records. This usually completes within 24 hours, but can take up to 72 hours.
              </p>
              <p>
                <strong>You can start using your domain for emails immediately.</strong> The system will automatically detect when AWS SES verification completes. No action needed from you!
              </p>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(2)} className="btn-secondary">
                Back to DNS Records
              </button>
              <button
                onClick={() => onComplete && onComplete({ domain: domainName, id: domainId })}
                className="btn-primary btn-large"
              >
                Continue to Mail App
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wizard-step">
            <div className="wizard-icon success">✓</div>
            <h2>Domain Verified Successfully!</h2>
            <p className="wizard-subtitle">
              Your domain <strong>{domainName}</strong> is now ready to use for email hosting.
            </p>

            <div className="success-message">
              <h3>What's Next?</h3>
              <ul>
                <li>Create email accounts (e.g., info@{domainName}, support@{domainName})</li>
                <li>Send and receive emails from your domain</li>
                <li>Manage your email accounts and settings</li>
              </ul>
            </div>

            <div className="wizard-actions">
              <button
                onClick={() => onComplete && onComplete({ domain: domainName, id: domainId })}
                className="btn-primary btn-large"
              >
                Get Started
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="domain-setup-wizard">
      <div className="wizard-container">
        {/* Progress indicator */}
        <div className="wizard-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Domain</div>
            </div>
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">DNS Setup</div>
            </div>
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Verify</div>
            </div>
            <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
              <div className="step-number">4</div>
              <div className="step-label">Complete</div>
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="wizard-content">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default DomainSetupWizard;
