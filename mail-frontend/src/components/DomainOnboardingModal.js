import React, { useState } from 'react';
import api from '../config/api';
import { FiGlobe, FiCheck, FiCopy, FiAlertCircle } from 'react-icons/fi';
import './CreateEmailModal.css';

function DomainOnboardingModal({ onClose, onDomainAdded, userRole }) {
  const [step, setStep] = useState('welcome'); // 'welcome' | 'addDomain' | 'dnsInstructions'
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

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

      setDnsRecords(response.data.dnsRecords || []);
      showToast('Domain saved successfully! Configure DNS records to verify.', 'success');

      // Mark onboarding as seen
      await api.patch('/users/onboarding-status', {
        hasSeenDomainOnboarding: true
      });

      // Close modal and refresh
      if (onDomainAdded) {
        onDomainAdded();
      }
      onClose();
    } catch (err) {
      console.error('Error adding domain:', err);
      setError(err.response?.data?.error || 'Failed to add domain');
      showToast(err.response?.data?.error || 'Failed to add domain', 'error');
    } finally {
      setAddingDomain(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="modal-body">
      <div style={{
        textAlign: 'center',
        padding: '20px 0'
      }}>
        <FiGlobe style={{ fontSize: '64px', color: '#667eea', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#1a1a1a' }}>
          Welcome! Set Up Your Domain
        </h2>
        <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
          To send emails through our platform, you'll need to verify a domain using AWS SES.
          This ensures your emails are authenticated and improves deliverability.
        </p>
      </div>

      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1a1a1a' }}>
          What you'll need:
        </h3>
        <ul style={{
          margin: '0',
          paddingLeft: '20px',
          color: '#666',
          lineHeight: '1.8'
        }}>
          <li>A domain you own (e.g., yourcompany.com)</li>
          <li>Access to your domain's DNS settings</li>
          <li>About 5-10 minutes to configure DNS records</li>
        </ul>
      </div>

      <div style={{
        padding: '16px',
        background: '#dbeafe',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1e40af',
        marginBottom: '24px'
      }}>
        <strong>Note:</strong> DNS changes can take 5-72 hours to propagate.
        You can skip this for now and set it up later from Settings.
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button className="btn-secondary" onClick={handleBackToDashboard}>
          Back to Dashboard
        </button>
        <button className="btn-primary" onClick={() => setStep('addDomain')}>
          Add Domain
        </button>
      </div>
    </div>
  );

  const renderAddDomainStep = () => (
    <div className="modal-body">
      <div className="form-group">
        <label>Domain Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="example.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          disabled={addingDomain}
          autoFocus
        />
        <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          Enter your domain without http:// or www (e.g., example.com)
        </small>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '14px',
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiAlertCircle /> {error}
        </div>
      )}

      <div style={{
        padding: '12px',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#92400e',
        marginTop: '16px'
      }}>
        <strong>Note:</strong> After adding your domain, you'll receive DNS records
        to configure for verification.
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '24px'
      }}>
        <button className="btn-secondary" onClick={() => setStep('welcome')}>
          Back
        </button>
        <button
          className="btn-primary"
          onClick={handleNextToDNS}
        >
          Next: View DNS Records
        </button>
      </div>
    </div>
  );

  const renderDNSInstructionsStep = () => (
    <div className="modal-body">
      <div style={{
        padding: '12px',
        background: '#fef3c7',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#92400e'
      }}>
        <FiAlertCircle /> Review these DNS records before saving
      </div>

      <div style={{ marginBottom: '16px' }}>
        <strong>Domain:</strong> {newDomain}
      </div>

      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>DNS Records to Configure</h3>

      {/* SPF Record */}
      <div style={{
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <strong style={{ fontSize: '14px' }}>SPF Record (Recommended)</strong>
        </div>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
          Type: <strong>TXT</strong> | Name: <strong>@</strong> or <strong>{newDomain}</strong>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          background: 'white',
          borderRadius: '4px',
          border: '1px solid #e0e0e0'
        }}>
          <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
            v=spf1 mx include:amazonses.com ~all
          </code>
          <button
            className="btn-icon"
            onClick={() => copyToClipboard('v=spf1 mx include:amazonses.com ~all')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#667eea'
            }}
          >
            <FiCopy />
          </button>
        </div>
      </div>

      {/* DKIM Records Placeholder */}
      {dnsRecords && dnsRecords.length > 0 ? (
        dnsRecords.filter(r => r.type === 'CNAME').map((record, index) => (
          <div key={index} style={{
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <strong style={{ fontSize: '14px' }}>DKIM Record {index + 1}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              Type: <strong>CNAME</strong>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Name:</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
                  {record.name}
                </code>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(record.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#667eea'
                  }}
                >
                  <FiCopy />
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Value:</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
                  {record.value}
                </code>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(record.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#667eea'
                  }}
                >
                  <FiCopy />
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div style={{
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>
            DKIM records will be generated after you save the domain.
            You'll receive 3 CNAME records to configure.
          </p>
        </div>
      )}

      <div style={{
        padding: '12px',
        background: '#dbeafe',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af',
        marginTop: '16px'
      }}>
        <strong>Important:</strong> Click "Confirm & Save Domain" below to save this domain to your account.
        After saving, you'll receive the actual DKIM records to configure along with the SPF record shown above.
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '14px',
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiAlertCircle /> {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '24px'
      }}>
        <button className="btn-secondary" onClick={() => setStep('addDomain')}>
          Back
        </button>
        <button
          className="btn-primary"
          onClick={handleConfirmAndSave}
          disabled={addingDomain}
        >
          {addingDomain ? 'Saving...' : 'Confirm & Save Domain'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {toast.message}
        </div>
      )}

      <div className="modal-overlay">
        <div
          className="modal-content"
          style={{ maxWidth: '600px' }}
        >
          <div className="modal-header">
            <h2>
              <FiGlobe /> Domain Verification Setup
            </h2>
          </div>

          {step === 'welcome' && renderWelcomeStep()}
          {step === 'addDomain' && renderAddDomainStep()}
          {step === 'dnsInstructions' && renderDNSInstructionsStep()}
        </div>
      </div>
    </>
  );
}

export default DomainOnboardingModal;
