/* global chrome */
import React, { useState, useEffect, useCallback } from 'react';
import { FiLinkedin, FiEdit3, FiTrash2, FiCheck, FiX, FiExternalLink, FiAlertCircle, FiRefreshCw, FiClock, FiShield, FiZap } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './LinkedInManager.css';

// Chrome Extension - Auto-detected via content script
let DETECTED_EXTENSION_ID = null;

function LinkedInManager() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [loggingInId, setLoggingInId] = useState(null);

    // Check if extension is installed via content script DOM attribute or message
    const checkExtension = useCallback(async () => {
        const extAttr = document.documentElement.getAttribute('data-noxtm-extension');
        const extId = document.documentElement.getAttribute('data-noxtm-extension-id');
        if (extAttr === 'true' && extId) {
            DETECTED_EXTENSION_ID = extId;
            setExtensionInstalled(true);
            return;
        }
        setExtensionInstalled(false);
    }, []);

    // Listen for extension messages via content script bridge
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== window) return;
            if (event.data?.type === 'NOXTM_EXTENSION_INSTALLED') {
                DETECTED_EXTENSION_ID = event.data.extensionId;
                setExtensionInstalled(true);
            }
            if (event.data?.type === 'NOXTM_EXTENSION_AUTH_SYNCED') {
                setExtensionInstalled(true);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Helper: send message to extension via content script bridge
    const sendToExtension = (action, payload = {}) => {
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.source !== window) return;
                if (event.data?.type === 'NOXTM_EXTENSION_RESPONSE' && event.data?.action === action) {
                    window.removeEventListener('message', handler);
                    resolve(event.data.response);
                }
            };
            window.addEventListener('message', handler);

            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve({ success: false, error: 'Extension communication timed out' });
            }, 8000);

            window.postMessage({
                direction: 'from-page',
                action,
                payload
            }, '*');
        });
    };

    // Fetch all sessions
    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/linkedin-sessions');
            if (response.data.success) {
                setSessions(response.data.sessions || []);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load LinkedIn accounts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
        checkExtension();
    }, [fetchSessions, checkExtension]);

    // Handle ONE-CLICK LOGIN via extension
    const handleLogin = async (session) => {
        if (!extensionInstalled) {
            toast.error('Chrome Extension not detected. Please install and reload the page.');
            return;
        }

        setLoggingInId(session._id);

        try {
            // Send all cookies if available, fallback to li_at only
            const payload = session.allCookies && session.allCookies.length > 0
                ? { allCookies: session.allCookies }
                : { liAtCookie: session.liAtCookie };

            const response = await sendToExtension('login_request', payload);

            if (response && response.success) {
                toast.success(`Opening ${session.accountName || session.profileName}...`);

                // Mark session as used
                try {
                    await api.put(`/linkedin-sessions/${session._id}/use`);
                    fetchSessions();
                } catch (error) {
                    console.error('Error marking session as used:', error);
                }
            } else {
                toast.error(response?.error || 'Failed to inject session');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Failed to login');
        } finally {
            setLoggingInId(null);
        }
    };

    // Handle edit account name
    const handleStartEdit = (e, session) => {
        e.stopPropagation();
        setEditingId(session._id);
        setEditValue(session.accountName || session.profileName);
    };

    const handleSaveEdit = async (e) => {
        if (e) e.stopPropagation();
        if (!editingId) return;

        try {
            const response = await api.put(`/linkedin-sessions/${editingId}`, {
                accountName: editValue
            });

            if (response.data.success) {
                toast.success('Account name updated');
                fetchSessions();
            }
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Failed to update account name');
        } finally {
            setEditingId(null);
            setEditValue('');
        }
    };

    const handleCancelEdit = (e) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditValue('');
    };

    // Handle delete session
    const handleDelete = async (e, session) => {
        e.stopPropagation();
        if (!window.confirm(`Remove "${session.accountName || session.profileName}"?`)) {
            return;
        }

        try {
            const response = await api.delete(`/linkedin-sessions/${session._id}`);
            if (response.data.success) {
                toast.success('Account removed');
                fetchSessions();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to remove account');
        }
    };

    // Send auth token to extension via content script bridge
    const sendTokenToExtension = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('No auth token found. Please login again.');
            return;
        }

        const response = await sendToExtension('store_token', { token });
        if (response && response.success) {
            toast.success('Connected to extension!');
            setExtensionInstalled(true);
        } else {
            toast.error('Failed to connect. Make sure the extension is installed and reload the page.');
        }
    };

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return 'LI';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Format relative time
    const formatTimeAgo = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const d = new Date(date);
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 30) return `${diffDay}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Session age from creation
    const getSessionAge = (createdAt) => {
        if (!createdAt) return '';
        const now = new Date();
        const created = new Date(createdAt);
        const diffDay = Math.floor((now - created) / 86400000);

        if (diffDay === 0) return 'Today';
        if (diffDay === 1) return '1 day old';
        if (diffDay < 30) return `${diffDay} days old`;
        if (diffDay < 365) return `${Math.floor(diffDay / 30)} months old`;
        return `${Math.floor(diffDay / 365)}y old`;
    };

    return (
        <div className="linkedin-manager">
            {/* Header */}
            <div className="lm-header">
                <div className="lm-header-left">
                    <div className="lm-title-icon">
                        <FiLinkedin />
                    </div>
                    <div>
                        <h2 className="lm-title">LinkedIn Accounts</h2>
                        <p className="lm-subtitle">Manage saved sessions • One-click login</p>
                    </div>
                </div>
                <div className="lm-header-right">
                    <button className="lm-btn-refresh" onClick={fetchSessions} disabled={loading}>
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                    {extensionInstalled ? (
                        <div className="lm-ext-badge connected">
                            <span className="lm-ext-dot"></span>
                            Extension Connected
                        </div>
                    ) : (
                        <button className="lm-btn-connect" onClick={sendTokenToExtension}>
                            <FiZap /> Connect Extension
                        </button>
                    )}
                </div>
            </div>

            {/* Extension Warning */}
            {!extensionInstalled && (
                <div className="lm-ext-warning">
                    <FiAlertCircle className="lm-ext-warning-icon" />
                    <div>
                        <strong>Chrome Extension Required</strong>
                        <p>Install the Noxtm LinkedIn Manager extension to capture and inject sessions. Load unpacked from <code>chrome-extension-linkedin/</code></p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="lm-content">
                {loading ? (
                    <div className="lm-loading">
                        <div className="lm-loading-spinner"></div>
                        <p>Loading accounts...</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="lm-empty">
                        <div className="lm-empty-icon">
                            <FiLinkedin />
                        </div>
                        <h3>No LinkedIn Accounts Saved</h3>
                        <p>Open LinkedIn in your browser, login to an account, then click <strong>"Grab Session"</strong> in the Chrome Extension popup to save it here.</p>
                    </div>
                ) : (
                    <div className="lm-grid">
                        {sessions.map((session) => (
                            <div
                                key={session._id}
                                className={`lm-card ${loggingInId === session._id ? 'logging-in' : ''}`}
                            >
                                <div className="lm-card-top">
                                    <div className="lm-card-avatar">
                                        {session.profileImageUrl ? (
                                            <img src={session.profileImageUrl} alt="" />
                                        ) : (
                                            <span>{getInitials(session.profileName)}</span>
                                        )}
                                        <div className={`lm-card-status-dot ${session.status}`}></div>
                                    </div>
                                    <div className="lm-card-info">
                                        {editingId === session._id ? (
                                            <div className="lm-card-edit">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(e);
                                                        if (e.key === 'Escape') handleCancelEdit(e);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button className="lm-edit-save" onClick={handleSaveEdit}><FiCheck /></button>
                                                <button className="lm-edit-cancel" onClick={handleCancelEdit}><FiX /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="lm-card-name">{session.accountName || session.profileName}</h4>
                                                {session.accountName && session.accountName !== session.profileName && (
                                                    <p className="lm-card-profile">{session.profileName}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="lm-card-actions-top">
                                        <button
                                            className="lm-btn-icon"
                                            onClick={(e) => handleStartEdit(e, session)}
                                            title="Rename"
                                        >
                                            <FiEdit3 />
                                        </button>
                                        <button
                                            className="lm-btn-icon delete"
                                            onClick={(e) => handleDelete(e, session)}
                                            title="Remove"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>

                                <div className="lm-card-meta">
                                    <div className="lm-meta-item">
                                        <FiShield />
                                        <span className={`lm-status-text ${session.status}`}>{session.status}</span>
                                    </div>
                                    <div className="lm-meta-item">
                                        <FiClock />
                                        <span>{session.lastUsed ? `Used ${formatTimeAgo(session.lastUsed)}` : 'Never used'}</span>
                                    </div>
                                    {session.allCookies && session.allCookies.length > 0 && (
                                        <div className="lm-meta-item">
                                            <FiZap />
                                            <span>{session.allCookies.length} cookies</span>
                                        </div>
                                    )}
                                </div>

                                <div className="lm-card-footer">
                                    <span className="lm-session-age">{getSessionAge(session.createdAt)}</span>
                                    <button
                                        className="lm-btn-open"
                                        onClick={() => handleLogin(session)}
                                        disabled={!extensionInstalled || loggingInId === session._id}
                                    >
                                        {loggingInId === session._id ? (
                                            <>
                                                <FiRefreshCw className="spinning" />
                                                Opening...
                                            </>
                                        ) : (
                                            <>
                                                <FiExternalLink />
                                                Open
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LinkedInManager;
