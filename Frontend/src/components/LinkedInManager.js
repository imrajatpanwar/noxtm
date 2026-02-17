import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { toast } from 'sonner';
import { FiSettings, FiMessageSquare, FiZap, FiClock, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import './LinkedInManager.css';

function LinkedInManager() {
    const [settings, setSettings] = useState(null);
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [extensionConnected, setExtensionConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');

    // Check extension connection
    useEffect(() => {
        const checkExtension = () => {
            const isInstalled = document.documentElement.getAttribute('data-noxtm-extension') === 'true';
            setExtensionConnected(isInstalled);
        };

        checkExtension();
        const handler = (event) => {
            if (event.data?.type === 'NOXTM_EXTENSION_INSTALLED') {
                setExtensionConnected(true);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsRes, statsRes, historyRes] = await Promise.all([
                api.get('/linkedin-ai/settings'),
                api.get('/linkedin-ai/stats'),
                api.get('/linkedin-ai/history?limit=10')
            ]);

            if (settingsRes.data.success) setSettings(settingsRes.data.settings);
            if (statsRes.data.success) setStats(statsRes.data.stats);
            if (historyRes.data.success) setHistory(historyRes.data.comments);
        } catch (error) {
            console.error('Error loading LinkedIn AI data:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Save settings
    const saveSettings = async (updates) => {
        setSaving(true);
        try {
            const res = await api.put('/linkedin-ai/settings', updates);
            if (res.data.success) {
                setSettings(res.data.settings);
                toast.success('Settings saved');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (field) => {
        const newValue = !settings[field];
        setSettings(prev => ({ ...prev, [field]: newValue }));
        saveSettings({ [field]: newValue });
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        saveSettings({
            commentTone: settings.commentTone,
            commentMaxLength: settings.commentMaxLength,
            commentLanguage: settings.commentLanguage,
            customInstructions: settings.customInstructions,
            dailyLimit: settings.dailyLimit,
            enabled: settings.enabled
        });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="lim-container">
                <div className="lim-loading">
                    <div className="lim-spinner"></div>
                    <p>Loading AI Commenter settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lim-container">
            {/* Header */}
            <div className="lim-header">
                <div className="lim-header-left">
                    <div>
                        <h1 className="lim-title">AI Commenter</h1>
                        <p className="lim-subtitle">LinkedIn engagement assistant</p>
                    </div>
                </div>
                <div className="lim-header-right">
                    <button className="lim-refresh-btn" onClick={loadData} title="Refresh">
                        <FiRefreshCw size={16} />
                    </button>
                    <span className={`lim-ext-badge ${extensionConnected ? 'connected' : ''}`}>
                        <span className="lim-ext-dot"></span>
                        {extensionConnected ? 'Extension Connected' : 'Extension Not Found'}
                    </span>
                </div>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="lim-stats-row">
                    <div className="lim-stat-card">
                        <FiZap className="lim-stat-icon" />
                        <div className="lim-stat-info">
                            <span className="lim-stat-number">{stats.today}</span>
                            <span className="lim-stat-label">Today</span>
                        </div>
                    </div>
                    <div className="lim-stat-card">
                        <FiTrendingUp className="lim-stat-icon" />
                        <div className="lim-stat-info">
                            <span className="lim-stat-number">{stats.remaining}</span>
                            <span className="lim-stat-label">Remaining</span>
                        </div>
                    </div>
                    <div className="lim-stat-card">
                        <FiMessageSquare className="lim-stat-icon" />
                        <div className="lim-stat-info">
                            <span className="lim-stat-number">{stats.thisWeek}</span>
                            <span className="lim-stat-label">This Week</span>
                        </div>
                    </div>
                    <div className="lim-stat-card">
                        <FiClock className="lim-stat-icon" />
                        <div className="lim-stat-info">
                            <span className="lim-stat-number">{stats.total}</span>
                            <span className="lim-stat-label">All Time</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="lim-tabs">
                <button
                    className={`lim-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <FiSettings size={14} /> Settings
                </button>
                <button
                    className={`lim-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <FiMessageSquare size={14} /> Comment History
                </button>
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && settings && (
                <div className="lim-settings-panel">
                    {/* Enable Toggle */}
                    <div className="lim-setting-row">
                        <div className="lim-setting-info">
                            <label className="lim-setting-label">AI Commenting</label>
                            <span className="lim-setting-desc">Show AI Comment buttons on LinkedIn posts</span>
                        </div>
                        <label className="lim-toggle">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={() => handleToggle('enabled')}
                            />
                            <span className="lim-toggle-slider"></span>
                        </label>
                    </div>

                    {/* Comment Tone */}
                    <div className="lim-setting-group">
                        <label className="lim-setting-label">Comment Tone</label>
                        <div className="lim-tone-grid">
                            {['professional', 'casual', 'thoughtful', 'witty', 'supportive'].map(tone => (
                                <button
                                    key={tone}
                                    className={`lim-tone-btn ${settings.commentTone === tone ? 'active' : ''}`}
                                    onClick={() => handleChange('commentTone', tone)}
                                >
                                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Max Length */}
                    <div className="lim-setting-group">
                        <label className="lim-setting-label">Max Comment Length</label>
                        <div className="lim-range-wrapper">
                            <input
                                type="range"
                                min="50"
                                max="500"
                                value={settings.commentMaxLength}
                                onChange={(e) => handleChange('commentMaxLength', parseInt(e.target.value))}
                                className="lim-range"
                            />
                            <span className="lim-range-value">{settings.commentMaxLength} chars</span>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="lim-setting-group">
                        <label className="lim-setting-label">Language</label>
                        <select
                            value={settings.commentLanguage}
                            onChange={(e) => handleChange('commentLanguage', e.target.value)}
                            className="lim-select"
                        >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                            <option value="Portuguese">Portuguese</option>
                            <option value="Arabic">Arabic</option>
                        </select>
                    </div>

                    {/* Daily Limit */}
                    <div className="lim-setting-group">
                        <label className="lim-setting-label">Daily Limit</label>
                        <input
                            type="number"
                            min="5"
                            max="200"
                            value={settings.dailyLimit}
                            onChange={(e) => handleChange('dailyLimit', parseInt(e.target.value) || 50)}
                            className="lim-input"
                        />
                    </div>

                    {/* Custom Instructions */}
                    <div className="lim-setting-group">
                        <label className="lim-setting-label">Custom Instructions <span className="lim-optional">(optional)</span></label>
                        <textarea
                            value={settings.customInstructions || ''}
                            onChange={(e) => handleChange('customInstructions', e.target.value)}
                            placeholder="e.g. Always mention my expertise in AI/ML when relevant..."
                            className="lim-textarea"
                            maxLength={500}
                        />
                    </div>

                    {/* Save Button */}
                    <button className="lim-save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="lim-history-panel">
                    {history.length === 0 ? (
                        <div className="lim-empty">
                            <FiMessageSquare size={24} />
                            <p>No comments generated yet</p>
                            <span>Go to LinkedIn and click the AI Comment button on any post.</span>
                        </div>
                    ) : (
                        <div className="lim-history-list">
                            {history.map(item => (
                                <div key={item._id} className="lim-history-item">
                                    <div className="lim-history-meta">
                                        <span className="lim-history-author">
                                            Replied to <strong>{item.postAuthor}</strong>
                                        </span>
                                        <span className="lim-history-time">{formatDate(item.createdAt)}</span>
                                    </div>
                                    <div className="lim-history-post-snippet">
                                        {item.postTextSnippet?.substring(0, 100)}...
                                    </div>
                                    <div className="lim-history-comment">
                                        "{item.generatedComment}"
                                    </div>
                                    <div className="lim-history-badges">
                                        <span className={`lim-badge ${item.wasPosted ? 'posted' : 'generated'}`}>
                                            {item.wasPosted ? 'Posted' : 'Generated'}
                                        </span>
                                        <span className="lim-badge tone">{item.tone}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LinkedInManager;
