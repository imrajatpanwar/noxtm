import React, { useState, useEffect } from 'react';
import {
    FiSettings, FiMail, FiCheck, FiAlertCircle, FiExternalLink,
    FiX, FiSave, FiLoader, FiChevronRight, FiInfo
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './ProjectSettings.css';

const ProjectSettings = ({ onClose, onNavigateToMail }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        onboardingEmailEnabled: false,
        senderEmailAccountId: '',
        templateId: ''
    });

    // Mail configuration status
    const [mailConfigStatus, setMailConfigStatus] = useState({
        hasVerifiedDomain: false,
        verifiedDomains: [],
        emailAccounts: [],
        templates: [],
        loading: true
    });

    // User role check
    const [isManager, setIsManager] = useState(false);

    useEffect(() => {
        checkUserPermissions();
        fetchSettings();
        fetchMailConfiguration();
    }, []);

    const checkUserPermissions = async () => {
        try {
            const response = await api.get('/users/profile');
            const user = response.data;

            // Owner is fixed; otherwise permissions drive access
            const hasCompanyOwnerRole = user.roleInCompany === 'Owner';
            const hasSettingsPermission = user.permissions && user.permissions.settingsConfiguration === true;
            setIsManager(hasCompanyOwnerRole || hasSettingsPermission);
        } catch (error) {
            console.error('Error checking user permissions:', error);
            setIsManager(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/projects/settings');
            if (response.data.settings) {
                setSettings({
                    onboardingEmailEnabled: response.data.settings.onboardingEmailEnabled || false,
                    senderEmailAccountId: response.data.settings.senderEmailAccountId || '',
                    templateId: response.data.settings.templateId || ''
                });
            }
        } catch (error) {
            console.error('Error fetching project settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMailConfiguration = async () => {
        try {
            // Fetch verified domains
            const domainsResponse = await api.get('/user-verified-domains');
            const verifiedDomains = domainsResponse.data?.domains?.filter(
                d => d.verificationStatus === 'SUCCESS'
            ) || [];

            // Fetch email accounts from verified domains
            let emailAccounts = [];
            if (verifiedDomains.length > 0) {
                try {
                    const accountsResponse = await api.get('/email-accounts/by-verified-domain');
                    emailAccounts = accountsResponse.data?.accounts || [];
                } catch (e) {
                    console.log('No email accounts found on verified domains');
                }
            }

            // Fetch email templates
            let templates = [];
            try {
                const templatesResponse = await api.get('/email-templates');
                templates = templatesResponse.data?.templates || [];
            } catch (e) {
                console.log('No email templates found');
            }

            setMailConfigStatus({
                hasVerifiedDomain: verifiedDomains.length > 0,
                verifiedDomains,
                emailAccounts,
                templates,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching mail configuration:', error);
            setMailConfigStatus(prev => ({ ...prev, loading: false }));
        }
    };

    const handleSaveSettings = async () => {
        // Validate required fields when enabling onboarding email
        if (settings.onboardingEmailEnabled) {
            if (!settings.senderEmailAccountId) {
                toast.error('Please select a sender email account');
                return;
            }
            if (!settings.templateId) {
                toast.error('Please select an email template');
                return;
            }
        }

        setSaving(true);
        try {
            await api.put('/projects/settings', { settings });
            toast.success('Project settings saved successfully');
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleOnboarding = (enabled) => {
        if (enabled && !mailConfigStatus.hasVerifiedDomain) {
            toast.error('Please verify a mail domain first');
            return;
        }
        setSettings(prev => ({ ...prev, onboardingEmailEnabled: enabled }));
    };

    if (!isManager && !loading) {
        return (
            <div className="noxtm-overlay" onClick={onClose}>
                <div className="ps-modal" onClick={e => e.stopPropagation()}>
                    <div className="ps-modal-header">
                        <h2><FiSettings /> Project Settings</h2>
                        <button className="ps-close-btn" onClick={onClose}><FiX /></button>
                    </div>
                    <div className="ps-access-denied">
                        <FiAlertCircle size={48} />
                        <h3>Access Denied</h3>
                        <p>Only managers and administrators can access project settings.</p>
                        <button className="ps-btn-primary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading || mailConfigStatus.loading) {
        return (
            <div className="noxtm-overlay" onClick={onClose}>
                <div className="ps-modal" onClick={e => e.stopPropagation()}>
                    <div className="ps-modal-header">
                        <h2><FiSettings /> Project Settings</h2>
                        <button className="ps-close-btn" onClick={onClose}><FiX /></button>
                    </div>
                    <div className="ps-loading">
                        <FiLoader className="ps-spinner" />
                        <p>Loading settings...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="noxtm-overlay" onClick={onClose}>
            <div className="ps-modal ps-modal-large" onClick={e => e.stopPropagation()}>
                <div className="ps-modal-header">
                    <h2><FiSettings /> Project Settings</h2>
                    <button className="ps-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <div className="ps-modal-content">
                    {/* Onboarding Email Section */}
                    <div className="ps-section">
                        <div className="ps-section-header">
                            <div className="ps-section-title">
                                <FiMail size={20} />
                                <span>Client Onboarding Email</span>
                            </div>
                            <p className="ps-section-desc">
                                Automatically send a welcome email to clients when a new project is created.
                            </p>
                        </div>

                        {/* Mail Domain Status */}
                        {!mailConfigStatus.hasVerifiedDomain ? (
                            <div className="ps-alert ps-alert-warning">
                                <div className="ps-alert-icon">
                                    <FiAlertCircle size={24} />
                                </div>
                                <div className="ps-alert-content">
                                    <h4>Mail Domain Verification Required</h4>
                                    <p>
                                        To enable onboarding emails, you need to verify a mail domain first. 
                                        This ensures emails are sent from your own domain and improves deliverability.
                                    </p>
                                    <button 
                                        className="ps-btn-link"
                                        onClick={() => {
                                            onClose();
                                            if (onNavigateToMail) {
                                                onNavigateToMail();
                                            } else {
                                                // Navigate to mail subdomain
                                                window.open('https://mail.noxtm.com', '_blank');
                                            }
                                        }}
                                    >
                                        <FiExternalLink size={14} />
                                        Go to Mail Settings
                                        <FiChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Enable Toggle */}
                                <div className="ps-setting-row">
                                    <div className="ps-setting-info">
                                        <label>Enable Onboarding Emails</label>
                                        <span className="ps-setting-hint">
                                            Send a welcome email to clients when creating new projects
                                        </span>
                                    </div>
                                    <label className="ps-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.onboardingEmailEnabled}
                                            onChange={(e) => handleToggleOnboarding(e.target.checked)}
                                        />
                                        <span className="ps-toggle-slider"></span>
                                    </label>
                                </div>

                                {/* Configuration Options (shown when enabled) */}
                                {settings.onboardingEmailEnabled && (
                                    <div className="ps-config-options">
                                        {/* Sender Email Selection */}
                                        <div className="ps-form-group">
                                            <label>
                                                <FiMail size={14} />
                                                Sender Email Account <span className="required">*</span>
                                            </label>
                                            <select
                                                value={settings.senderEmailAccountId}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    senderEmailAccountId: e.target.value
                                                }))}
                                            >
                                                <option value="">Select sender email...</option>
                                                {mailConfigStatus.emailAccounts.map(account => (
                                                    <option key={account._id} value={account._id}>
                                                        {account.email} {account.displayName ? `(${account.displayName})` : ''}
                                                    </option>
                                                ))}
                                                {mailConfigStatus.verifiedDomains.map(domain => (
                                                    <option key={`domain-${domain._id}`} value={`domain:${domain.domain}`}>
                                                        noreply@{domain.domain} (Auto-generated)
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="ps-input-hint">
                                                Emails will be sent from this address
                                            </span>
                                        </div>

                                        {/* Template Selection */}
                                        <div className="ps-form-group">
                                            <label>
                                                <FiMail size={14} />
                                                Email Template <span className="required">*</span>
                                            </label>
                                            <select
                                                value={settings.templateId}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    templateId: e.target.value
                                                }))}
                                            >
                                                <option value="">Select template...</option>
                                                <option value="default-onboarding">
                                                    📧 Default Project Onboarding Template
                                                </option>
                                                {mailConfigStatus.templates.map(template => (
                                                    <option key={template._id} value={template._id}>
                                                        {template.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="ps-input-hint">
                                                Template will be personalized with client and project details
                                            </span>
                                        </div>

                                        {/* Template Variables Info */}
                                        <div className="ps-info-box">
                                            <FiInfo size={16} />
                                            <div>
                                                <strong>Available Template Variables:</strong>
                                                <div className="ps-variables-list">
                                                    <code>{'{{clientName}}'}</code> - Client's name
                                                    <code>{'{{projectName}}'}</code> - Project name
                                                    <code>{'{{projectDescription}}'}</code> - Project description
                                                    <code>{'{{companyName}}'}</code> - Your company name
                                                    <code>{'{{startDate}}'}</code> - Project start date
                                                    <code>{'{{endDate}}'}</code> - Project end date
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Verified Domains Status */}
                    {mailConfigStatus.hasVerifiedDomain && (
                        <div className="ps-section ps-section-small">
                            <div className="ps-verified-domains">
                                <span className="ps-status-badge ps-status-success">
                                    <FiCheck size={12} />
                                    {mailConfigStatus.verifiedDomains.length} verified domain(s)
                                </span>
                                <span className="ps-domains-list">
                                    {mailConfigStatus.verifiedDomains.map(d => d.domain).join(', ')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ps-modal-footer">
                    <button className="ps-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        className="ps-btn-primary" 
                        onClick={handleSaveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <FiLoader className="ps-spinner" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FiSave />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;
