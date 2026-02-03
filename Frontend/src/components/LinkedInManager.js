/* global chrome */
import React, { useState, useEffect, useCallback } from 'react';
import { FiLinkedin, FiEdit3, FiTrash2, FiCheck, FiX, FiLogIn, FiPlus, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './LinkedInManager.css';

// Chrome Extension ID - Update this with your actual extension ID after loading it
const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE';

function LinkedInManager() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [extensionInstalled, setExtensionInstalled] = useState(false);

    // Check if extension is installed
    const checkExtension = useCallback(async () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try {
                chrome.runtime.sendMessage(EXTENSION_ID, { action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Extension not detected:', chrome.runtime.lastError.message);
                        setExtensionInstalled(false);
                    } else if (response && response.success) {
                        setExtensionInstalled(true);
                    }
                });
            } catch (error) {
                setExtensionInstalled(false);
            }
        } else {
            setExtensionInstalled(false);
        }
    }, []);

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

    // Handle login via extension
    const handleLogin = async (session) => {
        if (!extensionInstalled) {
            toast.error('Chrome Extension not installed. Please install the Noxtm LinkedIn Manager extension.');
            return;
        }

        try {
            // Send message to extension to inject the cookie
            chrome.runtime.sendMessage(
                EXTENSION_ID,
                {
                    action: 'login_request',
                    liAtCookie: session.liAtCookie
                },
                async (response) => {
                    if (chrome.runtime.lastError) {
                        toast.error('Failed to communicate with extension');
                        return;
                    }

                    if (response && response.success) {
                        toast.success(`Logging into ${session.accountName || session.profileName}...`);

                        // Mark session as used
                        try {
                            await api.put(`/linkedin-sessions/${session._id}/use`);
                            fetchSessions(); // Refresh to update lastUsed
                        } catch (error) {
                            console.error('Error marking session as used:', error);
                        }
                    } else {
                        toast.error(response?.error || 'Failed to inject session');
                    }
                }
            );
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Failed to login');
        }
    };

    // Handle edit account name
    const handleStartEdit = (session) => {
        setEditingId(session._id);
        setEditValue(session.accountName || session.profileName);
    };

    const handleSaveEdit = async () => {
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

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    // Handle delete session
    const handleDelete = async (session) => {
        if (!window.confirm(`Are you sure you want to remove "${session.accountName || session.profileName}"?`)) {
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

    // Send auth token to extension
    const sendTokenToExtension = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('No auth token found. Please login again.');
            return;
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(
                EXTENSION_ID,
                { action: 'store_token', token },
                (response) => {
                    if (chrome.runtime.lastError) {
                        toast.error('Failed to connect to extension');
                    } else if (response && response.success) {
                        toast.success('Connected to extension!');
                        setExtensionInstalled(true);
                    }
                }
            );
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="linkedin-manager">
            <div className="linkedin-manager-header">
                <div className="linkedin-manager-title">
                    <FiLinkedin className="linkedin-icon" />
                    <h2>LinkedIn Accounts</h2>
                </div>
                <div className="linkedin-manager-actions">
                    <button className="btn-refresh" onClick={fetchSessions} disabled={loading}>
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                        Refresh
                    </button>
                    {extensionInstalled ? (
                        <span className="extension-status connected">
                            <FiCheck /> Extension Connected
                        </span>
                    ) : (
                        <button className="btn-connect" onClick={sendTokenToExtension}>
                            <FiPlus /> Connect Extension
                        </button>
                    )}
                </div>
            </div>

            {!extensionInstalled && (
                <div className="extension-notice">
                    <FiAlertCircle />
                    <div>
                        <strong>Chrome Extension Required</strong>
                        <p>Install the Noxtm LinkedIn Manager extension to grab and inject sessions.</p>
                        <p className="extension-path">Load from: <code>chrome-extension-linkedin/</code></p>
                    </div>
                </div>
            )}

            <div className="linkedin-manager-content">
                {loading ? (
                    <div className="loading-state">Loading accounts...</div>
                ) : sessions.length === 0 ? (
                    <div className="empty-state">
                        <FiLinkedin className="empty-icon" />
                        <h3>No LinkedIn Accounts</h3>
                        <p>Use the Chrome extension while logged into LinkedIn to grab sessions.</p>
                    </div>
                ) : (
                    <table className="linkedin-table">
                        <thead>
                            <tr>
                                <th>Account Name</th>
                                <th>Profile Name</th>
                                <th>Status</th>
                                <th>Last Used</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => (
                                <tr key={session._id}>
                                    <td className="account-name-cell">
                                        {editingId === session._id ? (
                                            <div className="edit-inline">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                                <button className="btn-icon save" onClick={handleSaveEdit}>
                                                    <FiCheck />
                                                </button>
                                                <button className="btn-icon cancel" onClick={handleCancelEdit}>
                                                    <FiX />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="account-name">
                                                {session.accountName || session.profileName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="profile-name">{session.profileName}</td>
                                    <td>
                                        <span className={`status-badge ${session.status}`}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="last-used">{formatDate(session.lastUsed)}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-login"
                                            onClick={() => handleLogin(session)}
                                            disabled={!extensionInstalled}
                                            title="Login with this account"
                                        >
                                            <FiLogIn /> Login
                                        </button>
                                        <button
                                            className="btn-icon edit"
                                            onClick={() => handleStartEdit(session)}
                                            title="Edit name"
                                        >
                                            <FiEdit3 />
                                        </button>
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => handleDelete(session)}
                                            title="Remove account"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default LinkedInManager;
