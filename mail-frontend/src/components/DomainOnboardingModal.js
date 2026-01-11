import React, { useState } from 'react';
import api from '../config/api';
import { FiGlobe, FiCheck, FiCopy, FiAlertCircle } from 'react-icons/fi';
import './CreateEmailModal.css';

function DomainOnboardingModal({ onClose, onDomainAdded, userRole }) {
  const [step, setStep] = useState('loading'); // 'loading' | 'welcome' | 'addDomain' | 'dnsInstructions' | 'dkimRecords'
  const [animationClass, setAnimationClass] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [dkimRecords, setDkimRecords] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check for existing domain on component load
  useEffect(() => {
    const checkExistingDomain = async () => {
      try {
        const response = await api.get('/user-domains');
        if (response.data.domains && response.data.domains.length > 0) {
          const domain = response.data.domains[0];
          setNewDomain(domain.domain);
          setDkimRecords(domain.dnsRecords || []);
          setVerificationStatus({
            verified: domain.verificationStatus === 'SUCCESS',
            dkimStatus: domain.dkimVerificationStatus || 'PENDING'
          });
          setStep('dkimRecords');
        } else {
          setStep('welcome');
        }
      } catch (err) {
        console.error('Error checking existing domain:', err);
        setStep('welcome');
      }
    };
    checkExistingDomain();
  }, []);

  // Check verification status
  const handleCheckVerification = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get(`/user-domains/status/${newDomain}`);
      setVerificationStatus({
        verified: response.data.verified,
        dkimStatus: response.data.dkimStatus
      });
      if (response.data.verified) {
        showToast('Domain verified successfully!', 'success');
      } else {
        showToast('Domain not yet verified. Please add DNS records and wait for propagation.', 'info');
      }
    } catch (err) {
      console.error('Error checking verification:', err);
      showToast('Failed to check verification status', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStepChange = (newStep, direction = 'forward') => {
    setAnimationClass(direction === 'forward' ? 'domain-slide-in' : 'domain-slide-in-reverse');
    setStep(newStep);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleBackToDashboard = () => {
    // Redirect to main dashboard (production URL)
    window.location.href = process.env.NODE_ENV === 'production'
      ? 'https://noxtm.com'
      : 'http://localhost:3000';
  };

  const handleNextToDNS = () => {
    // Validate domain format before showing DNS instructions
    if (!newDomain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    if (!domainRegex.test(newDomain.trim())) {
      setError('Invalid domain format');
      return;
    }

    // Just move to DNS step, don't save yet
    setError('');
    setStep('dnsInstructions');
  };

  const handleConfirmAndSave = async () => {
    try {
      setAddingDomain(true);
      setError('');

      const response = await api.post('/user-domains/add', {
        domain: newDomain.trim().toLowerCase()
      });

      // Get DKIM records from response
      const records = response.data.dnsRecords || response.data.domain?.dnsRecords || [];
      setDkimRecords(records);

      showToast('Domain saved successfully! Now configure DKIM records.', 'success');

      // Mark onboarding as seen (non-critical, don't fail if this errors)
      try {
        await api.patch('/users/onboarding-status', {
          hasSeenDomainOnboarding: true
        });
      } catch (onboardingErr) {
        console.warn('Failed to update onboarding status:', onboardingErr.message);
      }

      // Show DKIM records step
      handleStepChange('dkimRecords', 'forward');
    } catch (err) {
      console.error('Error adding domain:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to add domain');
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to add domain', 'error');
    } finally {
      setAddingDomain(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className={`modal-body domain-welcome-body ${animationClass}`}>
      {/* Header with Back button and Title */}
      <div className="domain-welcome-header">
        <button
          onClick={handleBackToDashboard}
          className="domain-back-btn"
        >
          ← Back to Dashboard
        </button>
        <div className="domain-title-section">
          <h2 className="domain-title">
            <img src={VerificationIcon} alt="Verification" className="domain-title-icon" />
            Domain Verification
          </h2>
          <p className="domain-subtitle">
            Secure reputation by verifying your domain ownership.
          </p>
        </div>
      </div>
      
      {/* Divider line */}
      <div className="domain-header-divider"></div>

      {/* Main content */}
      <div className="domain-main-content">
        <h3 className="domain-requirements-title">
          What you'll need to get started:
        </h3>
        <ul className="domain-requirements-list">
          <li>A registered domain name (e.g., yourcompany.com)</li>
          <li>Administrative access to your domain's DNS panel</li>
          <li>Approximately 5-10 minutes for configuration</li>
        </ul>

        <div className="domain-note-box">
          <strong>Note:</strong> DNS changes can take up to 72 hours to propagate globally. You may proceed with the setup now or finish this step later in Settings.
        </div>

        <div className="domain-action-row">
          <button
            className="domain-setup-btn"
            onClick={() => handleStepChange('addDomain', 'forward')}
          >
            Set Up Custom Domain
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddDomainStep = () => (
    <div className={`modal-body domain-add-body ${animationClass}`}>
      {/* Header with Return button and Title */}
      <div className="domain-add-header">
        <button
          onClick={() => handleStepChange('welcome', 'back')}
          className="domain-return-btn"
        >
          ← Return
        </button>
        <div className="domain-title-section">
          <h2 className="domain-title">
            <img src={VerificationIcon} alt="Verification" className="domain-title-icon" />
            Domain Verification
          </h2>
          <p className="domain-subtitle">
            Secure reputation by verifying your domain ownership.
          </p>
        </div>
      </div>
      
      {/* Divider line */}
      <div className="domain-header-divider"></div>

      {/* Main content */}
      <div className="domain-add-content">
        <label className="domain-form-label">Domain Name</label>
        <input
          type="text"
          className="domain-form-input"
          placeholder="yourcompanydomain.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          disabled={addingDomain}
          autoFocus
        />
        <span className="domain-form-helper">
          Enter your domain without http:// or www (e.g., example.com)
        </span>

        {error && (
          <div className="domain-error-box">
            <FiAlertCircle /> {error}
          </div>
        )}

        <div className="domain-action-row" style={{ marginTop: '24px' }}>
          <button
            className="domain-view-dns-btn"
            onClick={handleNextToDNS}
          >
            View SPF Records
          </button>
        </div>
      </div>
    </div>
  );

  const renderDNSInstructionsStep = () => (
    <div className={`modal-body domain-dns-body ${animationClass}`}>
      {/* Header with Return button and Title */}
      <div className="domain-add-header">
        <button
          onClick={() => handleStepChange('addDomain', 'back')}
          className="domain-return-btn"
        >
          ← Return
        </button>
        <div className="domain-title-section">
          <h2 className="domain-title">
            <img src={VerificationIcon} alt="Verification" className="domain-title-icon" />
            Domain Verification
          </h2>
          <p className="domain-subtitle">
            Secure reputation by verifying your domain ownership.
          </p>
        </div>
      </div>
      
      {/* Divider line */}
      <div className="domain-header-divider"></div>

      {/* Main content */}
      <div className="domain-dns-content">
        {/* Domain Name */}
        <h2 className="domain-dns-domain-name">{newDomain}</h2>
        <p className="domain-dns-subtitle">Add SPF Records to Configure into Cloudflare</p>

        {/* SPF Record Type Info */}
        <p className="domain-dns-type-info">
          Type : TXT  &nbsp;|&nbsp;  Name: @ or {newDomain}
        </p>

        {/* SPF Record Value */}
        <div className="domain-dns-record-box">
          <code className="domain-dns-record-value">
            v=spf1 mx  include :amazonses.com ~all
          </code>
          <button
            className="domain-dns-copy-btn"
            onClick={() => copyToClipboard('v=spf1 mx include:amazonses.com ~all')}
          >
            <FiCopy />
          </button>
        </div>

        {/* Important Note */}
        <div className="domain-dns-important-box">
          <strong>Important:</strong> Click "Confirm & Save Domain" below to save this domain to your account. After saving, you'll receive the actual DKIM records to configure along with the SPF record shown above.
        </div>

        {error && (
          <div className="domain-error-box">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* Confirm Button */}
        <div className="domain-action-row" style={{ marginTop: '24px' }}>
          <button
            className="domain-confirm-btn"
            onClick={handleConfirmAndSave}
            disabled={addingDomain}
          >
            {addingDomain ? 'Saving...' : 'Confirm Now'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDKIMRecordsStep = () => (
    <div className={`modal-body domain-dns-body ${animationClass}`}>
      {/* Header with Return button and Title */}
      <div className="domain-add-header">
        <button
          onClick={() => {
            if (onDomainAdded) onDomainAdded();
            onClose();
          }}
          className={`domain-return-btn ${verificationStatus?.verified ? 'domain-done-btn' : ''}`}
        >
          {verificationStatus?.verified ? '✓ Done' : '← Back to Dashboard'}
        </button>
        <div className="domain-title-section">
          <h2 className="domain-title">
            <img src={VerificationIcon} alt="Verification" className="domain-title-icon" />
            {verificationStatus?.verified ? 'Domain Verified' : 'DKIM Configuration'}
          </h2>
          <p className="domain-subtitle">
            {verificationStatus?.verified 
              ? 'Your domain is ready! You can now send emails.' 
              : 'Add these CNAME records to complete verification.'
            }
          </p>
        </div>
      </div>
      
      {/* Divider line */}
      <div className="domain-header-divider"></div>

      {/* Main content */}
      <div className="domain-dns-content">
        {/* Verification Status Box */}
        <div className={`domain-verification-status-box ${verificationStatus?.verified ? 'verified' : 'pending'}`}>
          <div className="domain-verification-status-info">
            <span className="domain-verification-status-icon">
              {verificationStatus?.verified ? <FiCheck /> : <FiAlertCircle />}
            </span>
            <div>
              <strong>{verificationStatus?.verified ? 'Domain Verified' : 'Verification Pending'}</strong>
              <p>{verificationStatus?.verified 
                ? 'Your domain is verified and ready to send emails.' 
                : 'Add the DNS records below and check verification status.'
              }</p>
              {verificationStatus?.dkimStatus && (
                <span className="domain-dkim-status">DKIM: {verificationStatus.dkimStatus}</span>
              )}
            </div>
          </div>
          <button
            className="domain-check-verification-btn"
            onClick={handleCheckVerification}
            disabled={checkingStatus}
          >
            <FiRefreshCw className={checkingStatus ? 'spinning' : ''} />
            {checkingStatus ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Domain Name */}
        <h2 className="domain-dns-domain-name">{newDomain}</h2>
        <p className="domain-dns-subtitle">Add these 3 DKIM CNAME Records to Cloudflare</p>

        {/* DKIM Records */}
        {dkimRecords.length > 0 ? (
          dkimRecords.map((record, index) => (
            <div key={index} className="domain-dkim-record-card">
              <div className="domain-dkim-record-header">
                <strong>DKIM Record {index + 1}</strong>
                <span className="domain-dkim-record-type">CNAME</span>
              </div>
              
              <div className="domain-dkim-field">
                <label>Name:</label>
                <div className="domain-dns-record-box">
                  <code className="domain-dns-record-value">
                    {record.name.replace(`.${newDomain}`, '')}
                  </code>
                  <button
                    className="domain-dns-copy-btn"
                    onClick={() => copyToClipboard(record.name.replace(`.${newDomain}`, ''))}
                  >
                    <FiCopy />
                  </button>
                </div>
              </div>
              
              <div className="domain-dkim-field">
                <label>Value:</label>
                <div className="domain-dns-record-box">
                  <code className="domain-dns-record-value">
                    {record.value}
                  </code>
                  <button
                    className="domain-dns-copy-btn"
                    onClick={() => copyToClipboard(record.value)}
                  >
                    <FiCopy />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="domain-dns-important-box">
            No DKIM records found. Please contact support.
          </div>
        )}

        {/* SPF Record Info */}
        <div className="domain-spf-reminder-box">
          <strong>SPF Record (if not added yet):</strong>
          <p>Type: TXT  |  Name: @ or {newDomain}</p>
          <div className="domain-dns-record-box">
            <code className="domain-dns-record-value">
              v=spf1 mx include:amazonses.com ~all
            </code>
            <button
              className="domain-dns-copy-btn"
              onClick={() => copyToClipboard('v=spf1 mx include:amazonses.com ~all')}
            >
              <FiCopy />
            </button>
          </div>
        </div>

        {/* Info Note */}
        <div className="domain-dns-info-box">
          <strong>ℹ️ Info:</strong> DNS changes can take up to 72 hours to propagate. Use the "Check Status" button above to verify.
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`domain-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {toast.message}
        </div>
      )}

      <div className="modal-overlay domain-onboarding-modal">
        <div className="modal-content">
          {step === 'loading' && (
            <div className="modal-body domain-loading-body">
              <div className="domain-loading-spinner"></div>
              <p>Checking domain status...</p>
            </div>
          )}
          {step === 'welcome' && renderWelcomeStep()}
          {step === 'addDomain' && renderAddDomainStep()}
          {step === 'dnsInstructions' && renderDNSInstructionsStep()}
          {step === 'dkimRecords' && renderDKIMRecordsStep()}
        </div>
      </div>
    </>
  );
}

export default DomainOnboardingModal;
