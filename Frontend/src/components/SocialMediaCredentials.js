import React, { useState, useEffect, useCallback } from 'react';
import { FiKey, FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch, FiX, FiCheck, FiUsers, FiCopy, FiMoreVertical, FiShare2 } from 'react-icons/fi';
import api from '../config/api';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import './SocialMediaCredentials.css';
import CredentialsImage from '../assets/Credentials_image.png';
import { confirm } from './ui/alert-dialog';

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
    const [openCardMenuId, setOpenCardMenuId] = useState(null);

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
        setOpenCardMenuId(null);
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
        setOpenCardMenuId(null);
        if (!await confirm('Are you sure you want to delete this credential?')) return;
        try {
            await api.delete(`/social-media-calendar/credentials/${credId}`);
            fetchCredentials();
        } catch (err) {
            console.error('Error deleting credential:', err);
        }
    };

    const openShareModal = async (cred) => {
        setOpenCardMenuId(null);
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

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarSrc = (user) => {
        const src = user?.profileImage || user?.avatarUrl || user?.avatar || user?.image;
        if (!src) return '';
        if (src.startsWith('http') || src.startsWith('data:')) return src;
        const origin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
        return `${origin}${src.startsWith('/') ? src : `/${src}`}`;
    };

    const formatDate = (date) => {
        if (!date) return 'Not available';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getCredentialAccess = (cred) => {
        const owner = cred.createdBy ? [{ ...cred.createdBy, accessRole: 'Owner' }] : [];
        const sharedUsers = (cred.sharedWith || [])
            .map(item => item.user)
            .filter(Boolean)
            .map(user => ({ ...user, accessRole: 'Shared access' }));

        const seen = new Set();
        return [...owner, ...sharedUsers].filter(user => {
            const id = user._id || user.email || user.fullName;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
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
        <div className="sm-credentials" onClick={() => setOpenCardMenuId(null)}>
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
                    {filteredCredentials.map(cred => {
                        const accessUsers = getCredentialAccess(cred);
                        const description = cred.description || 'Keep all your social media logins organised in one secure space. Share access with your team instantly. No more sending passwords over chat or email.';
                        return (
                        <div className="sm-cred-card" key={cred._id}>
                            <div className="sm-cred-card-top">
                                <div className="sm-cred-card-heading">
                                    <div className="sm-cred-card-title-block">
                                        <span className="sm-cred-card-name">{cred.platform || 'Title of the card.'}</span>
                                        <span className="sm-cred-card-date">Updated {formatDate(cred.updatedAt || cred.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="sm-cred-card-tools">
                                    <button
                                        className="sm-cred-mini-avatar-stack"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (cred.isOwner) openShareModal(cred);
                                        }}
                                        title={cred.isOwner ? 'Manage access' : 'People with access'}
                                        type="button"
                                    >
                                        {accessUsers.slice(0, 3).map(user => {
                                            const avatarSrc = getAvatarSrc(user);
                                            return (
                                                <span
                                                    className="sm-cred-mini-avatar"
                                                    key={user._id || user.email}
                                                    title={`${user.fullName || user.email || 'Team member'} • ${user.accessRole}`}
                                                >
                                                    {avatarSrc ? (
                                                        <img src={avatarSrc} alt={user.fullName || user.email || 'Team member'} />
                                                    ) : (
                                                        getInitials(user.fullName || user.email)
                                                    )}
                                                </span>
                                            );
                                        })}
                                        {accessUsers.length > 3 && (
                                            <span className="sm-cred-mini-avatar more">+{accessUsers.length - 3}</span>
                                        )}
                                    </button>
                                    {cred.isOwner ? (
                                        <div className="sm-cred-menu-wrap">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="sm-cred-kebab-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setOpenCardMenuId(prev => prev === cred._id ? null : cred._id);
                                                }}
                                                title="More options"
                                            >
                                                <FiMoreVertical />
                                            </Button>
                                            {openCardMenuId === cred._id && (
                                                <div className="sm-cred-card-menu" onClick={event => event.stopPropagation()}>
                                                    <button type="button" onClick={() => openEditModal(cred)}>
                                                        <FiEdit2 /> Edit
                                                    </button>
                                                    <button type="button" className="danger" onClick={() => handleDelete(cred._id)}>
                                                        <FiTrash2 /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="sm-cred-shared-badge"><FiShare2 /> Shared</span>
                                    )}
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="sm-cred-card-field">
                                <span className="sm-cred-card-field-label">Email / Username</span>
                                <div className="sm-cred-card-value-row">
                                    <span className="sm-cred-card-field-value email">{cred.email}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`sm-cred-card-field-btn${copiedField === 'email-' + cred._id ? ' copied' : ''}`}
                                        onClick={() => handleCopy(cred.email, 'email-' + cred._id)}
                                        title="Copy email"
                                    >
                                        {copiedField === 'email-' + cred._id ? <FiCheck /> : <FiCopy />}
                                    </Button>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="sm-cred-card-field">
                                <span className="sm-cred-card-field-label">Password</span>
                                <div className="sm-cred-card-value-row">
                                    <span className={`sm-cred-card-field-value password${revealedPasswords[cred._id] ? ' revealed' : ''}`}>
                                        {revealedPasswords[cred._id] || '••••••••'}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="sm-cred-card-field-btn"
                                        onClick={() => toggleRevealPassword(cred._id)}
                                        title={revealedPasswords[cred._id] ? 'Hide password' : 'Show password'}
                                    >
                                        {revealedPasswords[cred._id] ? <FiEyeOff /> : <FiEye />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`sm-cred-card-field-btn${copiedField === 'password-' + cred._id ? ' copied' : ''}`}
                                        onClick={() => handleCopyPassword(cred._id)}
                                        title="Copy password"
                                    >
                                        {copiedField === 'password-' + cred._id ? <FiCheck /> : <FiCopy />}
                                    </Button>
                                </div>
                            </div>

                            <p className="sm-cred-card-description">{description}</p>
                        </div>
                    );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="sm-cred-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="sm-cred-modal" onClick={e => e.stopPropagation()}>
                        <div className="sm-cred-modal-header">
                            <div>
                                <h3>{editingCred ? 'Edit Credential' : 'Add Credential'}</h3>
                                <p>{editingCred ? 'Update the login details, card description, and team access.' : 'Save a secure login and choose who can access it.'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="sm-cred-modal-close" onClick={() => setShowModal(false)}>
                                <FiX />
                            </Button>
                        </div>
                        <div className="sm-cred-modal-body">
                            <div className="sm-cred-form-panel">
                                <div className="sm-cred-form-grid">
                                    <div className="sm-cred-form-group">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Mail of Noxtm Studio"
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
                                        <Button variant="ghost" size="icon" className="toggle-btn" type="button" onClick={() => setFormShowPassword(!formShowPassword)}>
                                            {formShowPassword ? <FiEyeOff /> : <FiEye />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="sm-cred-form-group">
                                    <label>Description</label>
                                    <textarea
                                        placeholder="This appears as the bottom text on the credential card."
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="sm-cred-form-group sm-cred-access-group">
                                <div className="sm-cred-access-heading">
                                    <div>
                                        <label>Grant Access To</label>
                                        <p className="sm-cred-access-hint">Only selected users will be able to see this credential.</p>
                                    </div>
                                    <span>{formAccessUsers.length} selected</span>
                                </div>
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
                                                <div className="sm-cred-access-member-avatar">
                                                    {getAvatarSrc(member) ? (
                                                        <img src={getAvatarSrc(member)} alt={member.fullName || member.email || 'Team member'} />
                                                    ) : (
                                                        getInitials(member.fullName || member.email)
                                                    )}
                                                </div>
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
                            <Button variant="outline" className="sm-cred-btn-cancel" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button
                                variant="default"
                                className="sm-cred-btn-save"
                                disabled={!form.platform.trim() || !form.email.trim() || (!editingCred && !form.password)}
                                onClick={handleSave}
                            >
                                {editingCred ? 'Update' : 'Add Credential'}
                            </Button>
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
