import React, { useState, useEffect, useCallback } from 'react';
import { FiKey, FiPlus, FiEdit2, FiTrash2, FiUserPlus, FiEye, FiEyeOff, FiMail, FiLock, FiSearch, FiX, FiCheck, FiShield, FiUsers, FiGlobe, FiCopy } from 'react-icons/fi';
import api from '../config/api';
import { Skeleton } from './ui/skeleton';
import './SocialMediaCredentials.css';
import CredentialsImage from '../assets/Credentials_image.png';
import { confirm } from './ui/alert-dialog';

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
    const [copiedField, setCopiedField] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [form, setForm] = useState({ platform: '', email: '', password: '', description: '' });
    const [formAccessUsers, setFormAccessUsers] = useState([]);
    const [formTeamMembers, setFormTeamMembers] = useState([]);
    const [formTeamSearch, setFormTeamSearch] = useState('');

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

    const handleCopy = (text, fieldId) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCopyPassword = async (credId) => {
        if (revealedPasswords[credId]) {
            handleCopy(revealedPasswords[credId], 'password-' + credId);
            return;
        }
        try {
            const res = await api.get('/social-media-calendar/credentials?reveal=true');
            const cred = (res.data.credentials || []).find(c => c._id === credId);
            if (cred) {
                setRevealedPasswords(prev => ({ ...prev, [credId]: cred.decryptedPassword }));
                handleCopy(cred.decryptedPassword, 'password-' + credId);
            }
        } catch (err) {
            console.error('Error copying password:', err);
        }
    };

    const openAddModal = async () => {
        setEditingCred(null);
        setForm({ platform: '', email: '', password: '', description: '' });
        setFormShowPassword(false);
        setFormAccessUsers([]);
        setFormTeamSearch('');
        setShowModal(true);
        try {
            const res = await api.get('/social-media-calendar/team');
            setFormTeamMembers(res.data.members || []);
        } catch (err) { console.error(err); }
    };

    const openEditModal = async (cred) => {
        setEditingCred(cred);
        setForm({
            platform: cred.platform,
            email: cred.email,
            password: '',
            description: cred.description || ''
        });
        setFormShowPassword(false);
        setFormAccessUsers((cred.sharedWith || []).map(s => s.user?._id || s.user));
        setFormTeamSearch('');
        setShowModal(true);
        try {
            const res = await api.get('/social-media-calendar/team');
            setFormTeamMembers(res.data.members || []);
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        try {
            let credId;
            if (editingCred) {
                const payload = { platform: form.platform, email: form.email, description: form.description };
                if (form.password) payload.password = form.password;
                await api.put(`/social-media-calendar/credentials/${editingCred._id}`, payload);
                credId = editingCred._id;
            } else {
                const res = await api.post('/social-media-calendar/credentials', form);
                credId = res.data?._id;
            }

            // Share with selected access users
            if (credId && formAccessUsers.length > 0) {
                const existingIds = editingCred ? (editingCred.sharedWith || []).map(s => s.user?._id || s.user) : [];
                const newUserIds = formAccessUsers.filter(id => !existingIds.includes(id));
                if (newUserIds.length > 0) {
                    await api.post(`/social-media-calendar/credentials/${credId}/share`, { userIds: newUserIds });
                }
            }

            setShowModal(false);
            fetchCredentials();
        } catch (err) {
            console.error('Error saving credential:', err);
            alert(err.response?.data?.message || 'Failed to save credential');
        }
    };

    const handleDelete = async (credId) => {
        if (!await confirm('Are you sure you want to delete this credential?')) return;
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

    // Search filter
    const filteredCredentials = credentials.filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (c.platform || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <div className="sm-credentials">
                <div className="sm-cred-loading" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Skeleton className="tw-h-8 tw-w-48" />
                    <Skeleton className="tw-h-4 tw-w-full" />
                    <Skeleton className="tw-h-4 tw-w-full" />
                    <Skeleton className="tw-h-4 tw-w-3/4" />
                </div>
            </div>
        );
    }

    return (
        <div className="sm-credentials">
            {/* Hero Banner */}
            <div className="sm-cred-hero">
                <div className="sm-cred-hero-left">
                    <h1 className="sm-cred-hero-title">Social media credentials management area</h1>
                    <p className="sm-cred-hero-subtitle">
                        Keep all your social media logins organised in one secure space. Share access with your team instantly<br />
                        No more sending passwords over chat or email.
                    </p>
                    <div className="sm-cred-hero-stats">
                        <div className="sm-cred-hero-stat"><FiKey /> {totalCreds} Credentials</div>
                        <div className="sm-cred-hero-stat"><FiUsers /> {sharedCount} Shared</div>
                        <div className="sm-cred-hero-search">
                            <FiSearch className="sm-cred-hero-search-icon" />
                            <input
                                type="text"
                                placeholder="Search credentials..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="sm-cred-hero-search-input"
                            />
                        </div>
                    </div>
                </div>
                <div className="sm-cred-hero-right">
                    <img src={CredentialsImage} alt="Credentials" className="sm-cred-hero-img" />
                    <button className="sm-cred-hero-add-btn" onClick={openAddModal}>
                        <FiPlus /> Add Credential
                    </button>
                </div>
            </div>

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
                    {filteredCredentials.map(cred => (
                        <div className="sm-cred-card" key={cred._id}>
                            {/* Card Top */}
                            <div className="sm-cred-card-top">
                                <span className="sm-cred-card-name">{cred.description || cred.platform}</span>
                                <span className="sm-cred-card-shared-info">
                                    {!cred.isOwner && cred.createdBy?.fullName && (
                                        <>{cred.createdBy.fullName} Shared with you</>
                                    )}
                                    {cred.isOwner && (
                                        <span className="sm-cred-card-owner-actions">
                                            <button className="sm-cred-card-action-btn" onClick={() => openShareModal(cred)} title="Share"><FiUserPlus /></button>
                                            <button className="sm-cred-card-action-btn" onClick={() => openEditModal(cred)} title="Edit"><FiEdit2 /></button>
                                            <button className="sm-cred-card-action-btn danger" onClick={() => handleDelete(cred._id)} title="Delete"><FiTrash2 /></button>
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Email Field */}
                            <div className="sm-cred-card-field">
                                <span className="sm-cred-card-field-label">E-MAIL/USERNAME :</span>
                                <span className="sm-cred-card-field-value">{cred.email}</span>
                                <div className="sm-cred-card-field-actions">
                                    <button
                                        className={`sm-cred-card-field-btn${copiedField === 'email-' + cred._id ? ' copied' : ''}`}
                                        onClick={() => handleCopy(cred.email, 'email-' + cred._id)}
                                        title="Copy email"
                                    >
                                        {copiedField === 'email-' + cred._id ? <FiCheck /> : <FiCopy />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="sm-cred-card-field">
                                <span className="sm-cred-card-field-label">PASSWORD :</span>
                                <span className={`sm-cred-card-field-value password${revealedPasswords[cred._id] ? ' revealed' : ''}`}>
                                    {revealedPasswords[cred._id] || '••••••••'}
                                </span>
                                <div className="sm-cred-card-field-actions">
                                    <button
                                        className="sm-cred-card-field-btn"
                                        onClick={() => toggleRevealPassword(cred._id)}
                                        title={revealedPasswords[cred._id] ? 'Hide password' : 'Show password'}
                                    >
                                        {revealedPasswords[cred._id] ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                    <button
                                        className={`sm-cred-card-field-btn${copiedField === 'password-' + cred._id ? ' copied' : ''}`}
                                        onClick={() => handleCopyPassword(cred._id)}
                                        title="Copy password"
                                    >
                                        {copiedField === 'password-' + cred._id ? <FiCheck /> : <FiCopy />}
                                    </button>
                                </div>
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
                                <label>Title</label>
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
                                <label>Grant Access To</label>
                                <p className="sm-cred-access-hint">Only selected users will be able to see this credential</p>
                                <div className="sm-cred-access-search">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search team members..."
                                        value={formTeamSearch}
                                        onChange={e => setFormTeamSearch(e.target.value)}
                                    />
                                </div>
                                <div className="sm-cred-access-list">
                                    {formTeamMembers
                                        .filter(m => {
                                            if (!formTeamSearch.trim()) return true;
                                            const q = formTeamSearch.toLowerCase();
                                            return (m.fullName || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
                                        })
                                        .map(member => (
                                            <label key={member._id} className={`sm-cred-access-member ${formAccessUsers.includes(member._id) ? 'selected' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formAccessUsers.includes(member._id)}
                                                    onChange={() => setFormAccessUsers(prev =>
                                                        prev.includes(member._id) ? prev.filter(id => id !== member._id) : [...prev, member._id]
                                                    )}
                                                />
                                                <div className="sm-cred-access-info">
                                                    <span className="sm-cred-access-name">{member.fullName || member.email}</span>
                                                    <span className="sm-cred-access-email">{member.email}</span>
                                                </div>
                                            </label>
                                        ))}
                                    {formTeamMembers.length === 0 && (
                                        <p className="sm-cred-no-results">No team members found</p>
                                    )}
                                </div>
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
