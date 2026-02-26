import React, { useState, useEffect, useCallback } from 'react';
import { FiKey, FiPlus, FiEdit2, FiTrash2, FiUserPlus, FiEye, FiEyeOff, FiMail, FiLock, FiSearch, FiX, FiCheck, FiShield, FiUsers, FiGlobe } from 'react-icons/fi';
import api from '../config/api';
import './SocialMediaCredentials.css';

const PLATFORMS = ['Instagram', 'LinkedIn', 'YouTube', 'X', 'Facebook', 'Reddit', 'Other'];

function SocialMediaCredentials() {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [editingCred, setEditingCred] = useState(null);
    const [sharingCred, setSharingCred] = useState(null);
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [formShowPassword, setFormShowPassword] = useState(false);

    // Form state
    const [form, setForm] = useState({ platform: '', email: '', password: '', description: '' });

    // Share modal state
    const [teamMembers, setTeamMembers] = useState([]);
    const [shareSearch, setShareSearch] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [sharingLoading, setSharingLoading] = useState(false);

    const fetchCredentials = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/social-media-calendar/credentials');
            setCredentials(res.data.credentials || []);
        } catch (err) {
            console.error('Error fetching credentials:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const fetchTeamMembers = async () => {
        try {
            const res = await api.get('/social-media-calendar/team');
            setTeamMembers(res.data.members || []);
        } catch (err) {
            console.error('Error fetching team:', err);
        }
    };

    const toggleRevealPassword = async (credId) => {
        if (revealedPasswords[credId]) {
            setRevealedPasswords(prev => ({ ...prev, [credId]: null }));
            return;
        }
        try {
            const res = await api.get('/social-media-calendar/credentials?reveal=true');
            const cred = (res.data.credentials || []).find(c => c._id === credId);
            if (cred) {
                setRevealedPasswords(prev => ({ ...prev, [credId]: cred.decryptedPassword }));
            }
        } catch (err) {
            console.error('Error revealing password:', err);
        }
    };

    const openAddModal = () => {
        setEditingCred(null);
        setForm({ platform: '', email: '', password: '', description: '' });
        setFormShowPassword(false);
        setShowModal(true);
    };

    const openEditModal = (cred) => {
        setEditingCred(cred);
        setForm({
            platform: cred.platform,
            email: cred.email,
            password: '',
            description: cred.description || ''
        });
        setFormShowPassword(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingCred) {
                const payload = { platform: form.platform, email: form.email, description: form.description };
                if (form.password) payload.password = form.password;
                await api.put(`/social-media-calendar/credentials/${editingCred._id}`, payload);
            } else {
                await api.post('/social-media-calendar/credentials', form);
            }
            setShowModal(false);
            fetchCredentials();
        } catch (err) {
            console.error('Error saving credential:', err);
            alert(err.response?.data?.message || 'Failed to save credential');
        }
    };

    const handleDelete = async (credId) => {
        if (!window.confirm('Are you sure you want to delete this credential?')) return;
        try {
            await api.delete(`/social-media-calendar/credentials/${credId}`);
            fetchCredentials();
        } catch (err) {
            console.error('Error deleting credential:', err);
        }
    };

    const openShareModal = async (cred) => {
        setSharingCred(cred);
        setSelectedUsers([]);
        setShareSearch('');
        await fetchTeamMembers();
        setShowShareModal(true);
    };

    const handleShare = async () => {
        if (!sharingCred || selectedUsers.length === 0) return;
        setSharingLoading(true);
        try {
            await api.post(`/social-media-calendar/credentials/${sharingCred._id}/share`, { userIds: selectedUsers });
            setShowShareModal(false);
            fetchCredentials();
        } catch (err) {
            console.error('Error sharing:', err);
        } finally {
            setSharingLoading(false);
        }
    };

    const handleRevoke = async (credId, userId) => {
        try {
            await api.delete(`/social-media-calendar/credentials/${credId}/share/${userId}`);
            fetchCredentials();
        } catch (err) {
            console.error('Error revoking:', err);
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredMembers = teamMembers.filter(m => {
        if (!shareSearch.trim()) return true;
        const q = shareSearch.toLowerCase();
        return (m.fullName || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
    });

    const alreadySharedIds = sharingCred ? (sharingCred.sharedWith || []).map(s => s.user?._id || s.user) : [];

    // Stats
    const totalCreds = credentials.length;
    const sharedCount = credentials.filter(c => c.sharedWith && c.sharedWith.length > 0).length;
    const uniquePlatforms = [...new Set(credentials.map(c => c.platform))].length;

    if (loading) {
        return (
            <div className="sm-credentials">
                <div className="sm-cred-loading">
                    <div className="sm-cred-loading-spinner" />
                    Loading credentials...
                </div>
            </div>
        );
    }

    return (
        <div className="sm-credentials">
            {/* Header */}
            <div className="sm-cred-header">
                <div className="sm-cred-header-left">
                    <h2><FiShield /> Social Media Credentials</h2>
                    <p className="sm-cred-header-subtitle">Securely manage and share your social media login credentials</p>
                </div>
                <button className="sm-cred-add-btn" onClick={openAddModal}>
                    <FiPlus /> Add Credential
                </button>
            </div>

            {/* Stats */}
            {credentials.length > 0 && (
                <div className="sm-cred-stats">
                    <div className="sm-cred-stat-card">
                        <div className="sm-cred-stat-icon total"><FiKey /></div>
                        <div>
                            <span className="sm-cred-stat-value">{totalCreds}</span>
                            <span className="sm-cred-stat-label">Total Credentials</span>
                        </div>
                    </div>
                    <div className="sm-cred-stat-card">
                        <div className="sm-cred-stat-icon shared"><FiUsers /></div>
                        <div>
                            <span className="sm-cred-stat-value">{sharedCount}</span>
                            <span className="sm-cred-stat-label">Shared Access</span>
                        </div>
                    </div>
                    <div className="sm-cred-stat-card">
                        <div className="sm-cred-stat-icon platforms"><FiGlobe /></div>
                        <div>
                            <span className="sm-cred-stat-value">{uniquePlatforms}</span>
                            <span className="sm-cred-stat-label">Platforms</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Grid or Empty State */}
            {credentials.length === 0 ? (
                <div className="sm-cred-empty">
                    <div className="sm-cred-empty-icon-wrap">
                        <FiKey />
                    </div>
                    <h3>No Credentials Yet</h3>
                    <p>Add your social media credentials here and securely share access with your team members.</p>
                    <button className="sm-cred-add-btn" onClick={openAddModal}>
                        <FiPlus /> Add Your First Credential
                    </button>
                </div>
            ) : (
                <div className="sm-cred-grid">
                    {credentials.map(cred => (
                        <div className="sm-cred-card" key={cred._id}>
                            <div className={`sm-cred-card-accent ${cred.platform}`} />
                            <div className="sm-cred-card-inner">
                                {/* Card Header */}
                                <div className="sm-cred-card-header">
                                    <div className="sm-cred-card-header-left">
                                        <div className={`sm-cred-platform-icon ${cred.platform}`}>
                                            <FiGlobe />
                                        </div>
                                        <div className="sm-cred-platform-info">
                                            <span className="sm-cred-platform-name">{cred.platform}</span>
                                            <span className={`sm-cred-ownership-tag ${cred.isOwner ? 'owner' : 'shared'}`}>
                                                {cred.isOwner ? '● Owner' : '● Shared with you'}
                                            </span>
                                        </div>
                                    </div>
                                    {cred.isOwner && (
                                        <div className="sm-cred-card-actions">
                                            <button className="sm-cred-action-btn share-btn" onClick={() => openShareModal(cred)} title="Share Access">
                                                <FiUserPlus />
                                            </button>
                                            <button className="sm-cred-action-btn" onClick={() => openEditModal(cred)} title="Edit">
                                                <FiEdit2 />
                                            </button>
                                            <button className="sm-cred-action-btn danger" onClick={() => handleDelete(cred._id)} title="Delete">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Fields */}
                                <div className="sm-cred-fields">
                                    <div className="sm-cred-field">
                                        <FiMail className="sm-cred-field-icon" />
                                        <span className="sm-cred-field-label">Email</span>
                                        <span className="sm-cred-field-value">{cred.email}</span>
                                    </div>
                                    <div className="sm-cred-field">
                                        <FiLock className="sm-cred-field-icon" />
                                        <span className="sm-cred-field-label">Password</span>
                                        <span className="sm-cred-field-value password">
                                            {revealedPasswords[cred._id] || '••••••••'}
                                        </span>
                                        <button className="sm-cred-field-toggle" onClick={() => toggleRevealPassword(cred._id)}>
                                            {revealedPasswords[cred._id] ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {cred.description && (
                                    <p className="sm-cred-description">{cred.description}</p>
                                )}

                                {/* Shared With */}
                                {cred.isOwner && cred.sharedWith && cred.sharedWith.length > 0 && (
                                    <div className="sm-cred-shared">
                                        <div className="sm-cred-shared-label">
                                            <FiUsers /> Shared with {cred.sharedWith.length} member{cred.sharedWith.length !== 1 ? 's' : ''}
                                        </div>
                                        <div className="sm-cred-shared-list">
                                            {cred.sharedWith.map((s, i) => (
                                                <div className="sm-cred-shared-user" key={i}>
                                                    <div className="sm-cred-shared-avatar">
                                                        {s.user?.profileImage ? (
                                                            <img src={s.user.profileImage} alt="" />
                                                        ) : (
                                                            getInitials(s.user?.fullName)
                                                        )}
                                                    </div>
                                                    <span>{s.user?.fullName || 'User'}</span>
                                                    <button className="sm-cred-shared-revoke" onClick={() => handleRevoke(cred._id, s.user?._id)} title="Revoke Access">
                                                        <FiX />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="sm-cred-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="sm-cred-modal" onClick={e => e.stopPropagation()}>
                        <div className="sm-cred-modal-header">
                            <h3>{editingCred ? 'Edit Credential' : 'Add Credential'}</h3>
                            <button className="sm-cred-modal-close" onClick={() => setShowModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="sm-cred-modal-body">
                            <div className="sm-cred-form-group">
                                <label>Platform</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Instagram, LinkedIn, YouTube"
                                    value={form.platform}
                                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                                />
                            </div>
                            <div className="sm-cred-form-group">
                                <label>Email / Username</label>
                                <input
                                    type="text"
                                    placeholder="Enter email or username"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div className="sm-cred-form-group">
                                <label>Password</label>
                                <div className="sm-cred-password-input">
                                    <input
                                        type={formShowPassword ? 'text' : 'password'}
                                        placeholder={editingCred ? 'Leave blank to keep current' : 'Enter password'}
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                    <button className="toggle-btn" type="button" onClick={() => setFormShowPassword(!formShowPassword)}>
                                        {formShowPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>
                            <div className="sm-cred-form-group">
                                <label>Description</label>
                                <textarea
                                    placeholder="Add a description (e.g., purpose, notes)"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="sm-cred-modal-footer">
                            <button className="sm-cred-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="sm-cred-btn-save"
                                disabled={!form.platform.trim() || !form.email.trim() || (!editingCred && !form.password)}
                                onClick={handleSave}
                            >
                                {editingCred ? 'Update' : 'Add Credential'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Access Modal */}
            {showShareModal && sharingCred && (
                <div className="sm-cred-modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="sm-cred-modal" onClick={e => e.stopPropagation()}>
                        <div className="sm-cred-modal-header">
                            <h3>Share Access — {sharingCred.platform}</h3>
                            <button className="sm-cred-modal-close" onClick={() => setShowShareModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="sm-cred-modal-body">
                            <div className="sm-cred-share-search">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search team members..."
                                    value={shareSearch}
                                    onChange={e => setShareSearch(e.target.value)}
                                />
                            </div>
                            <div className="sm-cred-share-members">
                                {filteredMembers.map(member => {
                                    const isAlreadyShared = alreadySharedIds.includes(member._id);
                                    const isSelected = selectedUsers.includes(member._id);
                                    return (
                                        <div
                                            key={member._id}
                                            className={`sm-cred-share-member ${isSelected ? 'selected' : ''} ${isAlreadyShared ? 'already-shared' : ''}`}
                                            onClick={() => !isAlreadyShared && toggleUserSelection(member._id)}
                                        >
                                            <div className="sm-cred-share-member-avatar">
                                                {member.profileImage ? (
                                                    <img src={member.profileImage} alt="" />
                                                ) : (
                                                    getInitials(member.fullName)
                                                )}
                                            </div>
                                            <div className="sm-cred-share-member-info">
                                                <div className="sm-cred-share-member-name">{member.fullName}</div>
                                                <div className="sm-cred-share-member-email">{member.email}</div>
                                            </div>
                                            {isAlreadyShared ? (
                                                <span className="sm-cred-already-tag">Shared</span>
                                            ) : (
                                                <div className="sm-cred-share-member-check">
                                                    {isSelected && <FiCheck size={14} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredMembers.length === 0 && (
                                    <p className="sm-cred-no-results">No team members found</p>
                                )}
                            </div>
                        </div>
                        <div className="sm-cred-modal-footer">
                            <button className="sm-cred-btn-cancel" onClick={() => setShowShareModal(false)}>Cancel</button>
                            <button
                                className="sm-cred-btn-save"
                                disabled={selectedUsers.length === 0 || sharingLoading}
                                onClick={handleShare}
                            >
                                {sharingLoading ? 'Sharing...' : `Share with ${selectedUsers.length} member${selectedUsers.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SocialMediaCredentials;
