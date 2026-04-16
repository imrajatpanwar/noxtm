import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiX, FiUpload, FiSend, FiTrash2, FiEdit3, FiCalendar, FiMessageCircle, FiActivity, FiChevronDown, FiImage, FiSearch, FiGrid, FiList, FiCopy, FiDownload, FiHash, FiRepeat, FiBookmark, FiCheckSquare, FiClock, FiExternalLink, FiShare2, FiLink, FiRefreshCw, FiLock } from 'react-icons/fi';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'sonner';
import api from '../config/api';
import { Progress } from './ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { PLATFORMS, STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, ACCOUNT_COLORS, WEEKDAYS, PLATFORM_LIMITS, statusClass, getInitials, formatTime, formatDateStr, isToday, getDaysInMonth, getWeekDays, getPostsForDay, defaultPostForm, defaultAccountForm, truncateWords } from './calendarHelpers';
import { useRole } from '../contexts/RoleContext';
import './SocialMediaCalendar.css';
import { confirm } from './ui/alert-dialog';

function SocialMediaCalendar() {
    const { currentUser } = useRole();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [posts, setPosts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showPostModal, setShowPostModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showPostDetail, setShowPostDetail] = useState(null);
    const [showAccountDropdown, setShowAccountDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showHashtagPicker, setShowHashtagPicker] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [postForm, setPostForm] = useState(defaultPostForm());
    const [accountForm, setAccountForm] = useState(defaultAccountForm());
    const [editingPost, setEditingPost] = useState(null);
    const [detailTab, setDetailTab] = useState('details');
    const [commentText, setCommentText] = useState('');
    const [draggedPost, setDraggedPost] = useState(null);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [templateForm, setTemplateForm] = useState({ name: '', content: '', platform: 'Instagram', labels: '', hashtags: '', notes: '' });
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [driveToken, setDriveToken] = useState(null);
    const [driveUser, setDriveUser] = useState(null);
    const [refFolderId, setRefFolderId] = useState(null);
    const [refUploading, setRefUploading] = useState(false);
    const [refUploadProgress, setRefUploadProgress] = useState({});
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [showEditAccountModal, setShowEditAccountModal] = useState(false);
    const [editAccountForm, setEditAccountForm] = useState(defaultAccountForm());
    const [showEditAssigneeDropdown, setShowEditAssigneeDropdown] = useState(false);
    // Share calendar
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareToken, setShareToken] = useState(null);
    const [shareLoading, setShareLoading] = useState(false);
    const fileInputRef = useRef(null);
    const refFileInputRef = useRef(null);
    const accountDropdownRef = useRef(null);
    const assigneeDropdownRef = useRef(null);
    const editAssigneeDropdownRef = useRef(null);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => {
        const h = (e) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) setShowAccountDropdown(false);
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target)) setShowAssigneeDropdown(false);
            if (editAssigneeDropdownRef.current && !editAssigneeDropdownRef.current.contains(e.target)) setShowEditAssigneeDropdown(false);
            if (contextMenu) setContextMenu(null);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [contextMenu]);

    useEffect(() => {
        const h = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.key === 'n' && !e.metaKey && !e.ctrlKey) openPostModal();
            if (e.key === 'Escape') { setShowPostModal(false); setShowPostDetail(null); setShowAccountModal(false); setContextMenu(null); setShowTemplateModal(false); setSelectedPosts([]); }
            if (e.key === 'ArrowLeft') prevMonth();
            if (e.key === 'ArrowRight') nextMonth();
            if (e.key === 't') goToToday();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Google Drive for reference images ──────────────────────────────────
    const driveLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setDriveToken(tokenResponse.access_token);
            try {
                const profile = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } });
                setDriveUser(profile.data);
            } catch (e) { /* ignore */ }
        },
        onError: () => toast.error('Google sign-in failed'),
        scope: 'https://www.googleapis.com/auth/drive.file',
    });

    const disconnectDrive = () => { googleLogout(); setDriveToken(null); setDriveUser(null); setRefFolderId(null); };

    const ensureRefFolder = useCallback(async (token) => {
        if (refFolderId) return refFolderId;
        const FOLDER = 'Noxtm Calendar';
        const search = await axios.get('https://www.googleapis.com/drive/v3/files', {
            headers: { Authorization: `Bearer ${token}` },
            params: { q: `name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, fields: 'files(id,name)' }
        });
        if (search.data.files?.length > 0) { setRefFolderId(search.data.files[0].id); return search.data.files[0].id; }
        const created = await axios.post('https://www.googleapis.com/drive/v3/files',
            { name: FOLDER, mimeType: 'application/vnd.google-apps.folder' },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        setRefFolderId(created.data.id);
        return created.data.id;
    }, [refFolderId]);

    const handleRefImageUpload = async (fileList) => {
        if (!driveToken || !fileList.length) return;
        setRefUploading(true);

        const files = Array.from(fileList);

        // Show local previews immediately so user sees something right away
        const localPreviews = files.map(file => ({
            _localId: `local-${Date.now()}-${Math.random()}`,
            driveFileId: '',
            name: file.name,
            localPreviewUrl: URL.createObjectURL(file),
            thumbnailLink: '',
            webViewLink: '',
            mimeType: file.type,
            uploading: true
        }));
        setPostForm(prev => ({ ...prev, referenceImages: [...prev.referenceImages, ...localPreviews] }));

        try {
            const fId = await ensureRefFolder(driveToken);
            const results = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const preview = localPreviews[i];
                setRefUploadProgress(p => ({ ...p, [file.name]: 0 }));
                try {
                    const form = new FormData();
                    form.append('metadata', new Blob([JSON.stringify({ name: file.name, parents: [fId] })], { type: 'application/json' }));
                    form.append('file', file);
                    const res = await axios.post(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,thumbnailLink,webViewLink,mimeType',
                        form,
                        {
                            headers: { Authorization: `Bearer ${driveToken}` },
                            onUploadProgress: (evt) => {
                                const pct = Math.round((evt.loaded / evt.total) * 100);
                                setRefUploadProgress(p => ({ ...p, [file.name]: pct }));
                            }
                        }
                    );
                    results.push({
                        _localId: preview._localId,
                        driveFileId: res.data.id,
                        name: res.data.name,
                        // Use local preview URL for display — Drive thumbnailLink needs Google auth cookie
                        localPreviewUrl: preview.localPreviewUrl,
                        thumbnailLink: res.data.thumbnailLink || '',
                        webViewLink: res.data.webViewLink || '',
                        mimeType: res.data.mimeType || file.type,
                        uploading: false
                    });
                } catch (fileErr) {
                    console.error('Drive upload failed for', file.name, fileErr.response?.data || fileErr.message);
                    const errMsg = fileErr.response?.data?.error?.message || fileErr.message;
                    toast.error(`Failed to upload "${file.name}": ${errMsg}`);
                    results.push({ ...preview, uploading: false, failed: true });
                }
                setRefUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; });
            }

            // Replace local placeholders with final results
            setPostForm(prev => ({
                ...prev,
                referenceImages: [
                    ...prev.referenceImages.filter(img => !localPreviews.find(lp => lp._localId === img._localId)),
                    ...results
                ]
            }));

            const successCount = results.filter(r => !r.failed).length;
            if (successCount > 0) toast.success(`${successCount} reference image${successCount !== 1 ? 's' : ''} uploaded to Drive`);
        } catch (e) {
            console.error('Drive reference upload error:', e.response?.data || e.message);
            const errMsg = e.response?.data?.error?.message || e.message;
            toast.error(`Upload failed: ${errMsg}`);
            setPostForm(prev => ({
                ...prev,
                referenceImages: prev.referenceImages.map(img =>
                    localPreviews.find(lp => lp._localId === img._localId)
                        ? { ...img, uploading: false, failed: true }
                        : img
                )
            }));
        } finally {
            setRefUploading(false);
        }
    };

    const removeRefImage = (id) => {
        setPostForm(prev => ({
            ...prev,
            referenceImages: prev.referenceImages.filter(img =>
                (img._id || img._localId || img.driveFileId) !== id
            )
        }));
    };
    // ─────────────────────────────────────────────────────────────────────────

    const fetchPosts = useCallback(async () => {
        try {
            const params = { month, year };
            if (selectedAccount !== 'all') params.accountId = selectedAccount;
            const res = await api.get('/social-media-calendar/posts', { params });
            setPosts(res.data.posts || []);
        } catch (err) { console.error(err); }
    }, [currentDate, selectedAccount]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchAccounts = useCallback(async () => {
        try { const r = await api.get('/social-media-calendar/accounts'); setAccounts(r.data.accounts || []); } catch (e) { console.error(e); }
    }, []);
    const fetchTeam = useCallback(async () => {
        try { const r = await api.get('/social-media-calendar/team'); setTeamMembers(r.data.members || []); } catch (e) { console.error(e); }
    }, []);
    const fetchTemplates = useCallback(async () => {
        try { const r = await api.get('/social-media-calendar/templates'); setTemplates(r.data.templates || []); } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { Promise.all([fetchPosts(), fetchAccounts(), fetchTeam(), fetchTemplates()]).finally(() => setLoading(false)); }, [fetchPosts, fetchAccounts, fetchTeam, fetchTemplates]);

    const prevMonth = () => { if (viewMode === 'week') { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); } else setCurrentDate(new Date(year, month - 1, 1)); };
    const nextMonth = () => { if (viewMode === 'week') { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); } else setCurrentDate(new Date(year, month + 1, 1)); };
    const goToToday = () => setCurrentDate(new Date());

    const totalPosts = posts.length;
    const scheduledCount = posts.filter(p => p.status === 'Scheduled' || p.status === 'Published').length;
    const draftCount = posts.filter(p => p.status === 'Draft').length;

    // CRUD handlers
    const handleCreatePost = async () => {
        if (isSubmittingPost) return;
        if (!postForm.title.trim()) return toast.error('Title is required');
        if (!postForm.postDate) return toast.error('Date is required');
        setIsSubmittingPost(true);
        try {
            const payload = { ...postForm, labels: postForm.labels ? postForm.labels.split(',').map(l => l.trim()).filter(Boolean) : [], referenceLinks: postForm.referenceLinks ? postForm.referenceLinks.split('\n').map(l => l.trim()).filter(Boolean) : [], socialMediaAccount: null };
            if (editingPost) { await api.put(`/social-media-calendar/posts/${editingPost._id}`, payload); toast.success('Post updated'); }
            else { await api.post('/social-media-calendar/posts', payload); toast.success(postForm.isRecurring ? 'Recurring posts created' : 'Post created'); }
            setShowPostModal(false); setEditingPost(null); setPostForm(defaultPostForm()); fetchPosts();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save post'); }
        finally { setIsSubmittingPost(false); }
    };

    const handleDeletePost = async (id) => {
        if (!await confirm('Delete this post?')) return;
        try { await api.delete(`/social-media-calendar/posts/${id}`); toast.success('Deleted'); setShowPostDetail(null); setContextMenu(null); fetchPosts(); } catch { toast.error('Failed'); }
    };

    const handleDuplicatePost = async (post) => {
        try {
            await api.post('/social-media-calendar/posts', { title: `${post.title} (Copy)`, content: post.content || '', postDate: post.postDate, postTime: post.postTime || '10:00', platform: post.platform, socialMediaAccount: post.socialMediaAccount?._id || null, labels: post.labels || [], notes: post.notes || '', status: 'Draft', priority: post.priority || 'Medium' });
            toast.success('Duplicated'); setContextMenu(null); fetchPosts();
        } catch { toast.error('Failed'); }
    };

    const handleStatusChange = async (id, status) => {
        try { const r = await api.put(`/social-media-calendar/posts/${id}/status`, { status }); setShowPostDetail(r.data); setShowStatusDropdown(false); fetchPosts(); toast.success(`Status → ${status}`); } catch { toast.error('Failed'); }
    };

    const handleBulkStatus = async (status) => {
        if (selectedPosts.length === 0) return;
        try { await api.post('/social-media-calendar/posts/bulk-status', { postIds: selectedPosts, status }); toast.success(`${selectedPosts.length} posts → ${status}`); setSelectedPosts([]); fetchPosts(); } catch { toast.error('Failed'); }
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.length === 0 || !await confirm(`Delete ${selectedPosts.length} posts?`)) return;
        try { await api.delete('/social-media-calendar/posts/bulk', { data: { postIds: selectedPosts } }); toast.success(`${selectedPosts.length} posts deleted`); setSelectedPosts([]); fetchPosts(); } catch { toast.error('Failed'); }
    };

    const handleFileUpload = async (postId, files) => {
        const fd = new FormData(); for (let f of files) fd.append('files', f);
        try { const r = await api.post(`/social-media-calendar/posts/${postId}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setShowPostDetail(r.data); fetchPosts(); toast.success('Files uploaded'); } catch { toast.error('Failed'); }
    };

    const handleRemoveMedia = async (postId, mediaId) => {
        try { await api.delete(`/social-media-calendar/posts/${postId}/media/${mediaId}`); const r = await api.get(`/social-media-calendar/posts/${postId}`); setShowPostDetail(r.data); toast.success('Removed'); } catch { toast.error('Failed'); }
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;
        try { const r = await api.post(`/social-media-calendar/posts/${postId}/comments`, { content: commentText }); setShowPostDetail(r.data); setCommentText(''); } catch { toast.error('Failed'); }
    };

    const handleCreateAccount = async () => {
        if (!accountForm.name.trim()) return toast.error('Name required');
        try { await api.post('/social-media-calendar/accounts', accountForm); toast.success('Account created'); setShowAccountModal(false); setAccountForm(defaultAccountForm()); fetchAccounts(); } catch { toast.error('Failed'); }
    };

    const handleDeleteAccount = async (id) => {
        if (!await confirm('Delete account and all its posts?')) return;
        try { await api.delete(`/social-media-calendar/accounts/${id}`); toast.success('Deleted'); if (selectedAccount === id) setSelectedAccount('all'); fetchAccounts(); fetchPosts(); } catch { toast.error('Failed'); }
    };

    const openEditAccount = (a, e) => {
        e.stopPropagation();
        setEditingAccount(a);
        setEditAccountForm({ name: a.name, platform: a.platform, handle: a.handle || '', color: a.color || '#1a1a1a', assignedTo: Array.isArray(a.assignedTo) ? a.assignedTo.map(u => u._id || u) : [] });
        setShowAccountDropdown(false);
        setShowEditAssigneeDropdown(false);
        setShowEditAccountModal(true);
    };

    const handleUpdateAccount = async () => {
        if (!editAccountForm.name.trim()) return toast.error('Name required');
        try {
            console.log('[EditAccount] PUT', editingAccount._id, editAccountForm);
            await api.put(`/social-media-calendar/accounts/${editingAccount._id}`, editAccountForm);
            toast.success('Account updated');
            setShowEditAccountModal(false);
            setEditingAccount(null);
            fetchAccounts();
        } catch (err) {
            console.error('[EditAccount] update error:', err?.response?.data, err?.response?.status, err?.message);
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update');
        }
    };

    const handleAssignAccount = async (accountId, userId) => {
        try { await api.put(`/social-media-calendar/accounts/${accountId}/assign`, { assignedTo: userId || null }); toast.success('Account assigned'); fetchAccounts(); fetchPosts(); } catch { toast.error('Failed'); }
    };

    const handleCreateTemplate = async () => {
        if (!templateForm.name.trim()) return toast.error('Name required');
        try { await api.post('/social-media-calendar/templates', { ...templateForm, labels: templateForm.labels ? templateForm.labels.split(',').map(l => l.trim()).filter(Boolean) : [] }); toast.success('Template saved'); setShowTemplateModal(false); fetchTemplates(); } catch { toast.error('Failed'); }
    };

    const handleDeleteTemplate = async (id) => {
        try { await api.delete(`/social-media-calendar/templates/${id}`); toast.success('Template deleted'); fetchTemplates(); } catch { toast.error('Failed'); }
    };

    const handleSaveAsTemplate = (post) => {
        setTemplateForm({ name: post.title, content: post.content || '', platform: post.platform, labels: (post.labels || []).join(', '), hashtags: '', notes: post.notes || '' });
        setShowTemplateModal(true);
    };

    const handleUseTemplate = (tmpl) => {
        setPostForm(prev => ({ ...prev, title: tmpl.name, content: (tmpl.content || '') + (tmpl.hashtags ? '\n\n' + tmpl.hashtags : ''), platform: tmpl.platform, labels: (tmpl.labels || []).join(', '), notes: tmpl.notes || '' }));
    };

    const handleExportCSV = () => { window.open(`${api.defaults.baseURL}/social-media-calendar/posts/export?month=${month}&year=${year}${selectedAccount !== 'all' ? `&accountId=${selectedAccount}` : ''}`, '_blank'); };

    // ── Share calendar ────────────────────────────────────────────────────────
    const openShareDialog = async () => {
        setShowShareDialog(true);
        try {
            const res = await api.get('/social-media-calendar/share');
            setShareToken(res.data.active ? res.data.token : null);
        } catch { /* silent */ }
    };

    const handleCreateShareLink = async () => {
        setShareLoading(true);
        try {
            const res = await api.post('/social-media-calendar/share');
            setShareToken(res.data.token);
            toast.success('Share link created');
        } catch { toast.error('Failed to create link'); }
        finally { setShareLoading(false); }
    };

    const handleRegenerateShareLink = async () => {
        setShareLoading(true);
        try {
            const res = await api.put('/social-media-calendar/share/regenerate');
            setShareToken(res.data.token);
            toast.success('Link regenerated — old link is now invalid');
        } catch { toast.error('Failed to regenerate link'); }
        finally { setShareLoading(false); }
    };

    const handleRemoveShareAccess = async () => {
        setShareLoading(true);
        try {
            await api.delete('/social-media-calendar/share');
            setShareToken(null);
            toast.success('Share access removed');
        } catch { toast.error('Failed to remove access'); }
        finally { setShareLoading(false); }
    };

    const shareUrl = shareToken ? `${window.location.origin}/shared-calendar/${shareToken}` : null;

    // Drag and drop
    const handleDragStart = (e, post) => { setDraggedPost(post); e.dataTransfer.effectAllowed = 'move'; e.target.classList.add('dragging'); };
    const handleDragEnd = (e) => { e.target.classList.remove('dragging'); setDraggedPost(null); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); };
    const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
    const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
    const handleDrop = async (e, date) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        if (!draggedPost) return;
        try { await api.put(`/social-media-calendar/posts/${draggedPost._id}`, { ...draggedPost, postDate: formatDateStr(date), socialMediaAccount: draggedPost.socialMediaAccount?._id || null, labels: draggedPost.labels || [] }); toast.success('Rescheduled'); fetchPosts(); } catch { toast.error('Failed'); }
        setDraggedPost(null);
    };

    const handleContextMenu = (e, post) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, post }); };

    const openPostModal = (date) => {
        setPostForm(defaultPostForm()); setEditingPost(null);
        if (date) setPostForm(prev => ({ ...prev, postDate: formatDateStr(date) }));
        if (selectedAccount !== 'all') { const a = accounts.find(a => a._id === selectedAccount); if (a) setPostForm(prev => ({ ...prev, platform: a.platform })); }
        setShowPostModal(true);
    };

    const openEditPost = (post) => {
        setEditingPost(post);
        setPostForm({ title: post.title, content: post.content || '', postDate: new Date(post.postDate).toISOString().split('T')[0], postTime: post.postTime || '10:00', platform: post.platform, postType: post.postType || 'Static Post', labels: (post.labels || []).join(', '), referenceLinks: (post.referenceLinks || []).join('\n'), status: post.status, priority: post.priority || 'Medium', isRecurring: false, recurringPattern: '', referenceImages: post.referenceImages || [] });
        setShowPostModal(true);
    };

    const openPostDetail = async (post) => {
        try { const r = await api.get(`/social-media-calendar/posts/${post._id}`); setShowPostDetail(r.data); setDetailTab('details'); setShowStatusDropdown(false); } catch { toast.error('Failed'); }
    };

    const toggleSelectPost = (id) => setSelectedPosts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    const selectedAccountObj = accounts.find(a => a._id === selectedAccount);
    const charCount = postForm.content.length;
    const charLimit = PLATFORM_LIMITS[postForm.platform] || 99999;
    const calendarDays = getDaysInMonth(year, month);
    const weekDays = getWeekDays(currentDate);

    // Get hashtag groups for currently selected account
    const currentAccountHashtags = postForm.socialMediaAccount ? accounts.find(a => a._id === postForm.socialMediaAccount)?.hashtagGroups || [] : [];

    if (loading) return <div className="smc-loading"><FiCalendar style={{ marginRight: 8 }} /> Loading calendar...</div>;

    return (
        <div className="smc-container">
            {/* Header */}
            <div className="smc-header">
                <div className="smc-header-left">
                    <div className="smc-header-title-row">
                        <div className="smc-header-icon"><FiCalendar size={20} /></div>
                        <div>
                            <h1>Content Calendar</h1>
                            <div className="smc-header-sub">Plan, schedule & manage your social media content</div>
                        </div>
                    </div>
                    <div className="smc-month-nav">
                        <button onClick={prevMonth}><FiChevronLeft size={14} /></button>
                        <span className="smc-month-title">{viewMode === 'week' ? `Week of ${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })}` : monthName}</span>
                        <button onClick={nextMonth}><FiChevronRight size={14} /></button>
                        <button className="smc-today-btn" onClick={goToToday}>Today</button>
                    </div>
                </div>
                <div className="smc-header-right">
                    <div className="smc-view-switcher">
                        <button className={`smc-view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}><FiGrid size={13} /> Month</button>
                        <button className={`smc-view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}><FiList size={13} /> Week</button>
                    </div>
                    <div className="smc-search-box"><FiSearch /><input placeholder="Search posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                    <div className="smc-account-selector" ref={accountDropdownRef}>
                        <button className="smc-account-btn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                            {selectedAccountObj && <span className="acct-dot" style={{ background: selectedAccountObj.color }} />}
                            <span>{selectedAccountObj ? selectedAccountObj.name : 'All Accounts'}</span><FiChevronDown size={12} />
                        </button>
                        {showAccountDropdown && (
                            <div className="smc-account-dropdown">
                                <div className={`smc-dropdown-item ${selectedAccount === 'all' ? 'active' : ''}`} onClick={() => { setSelectedAccount('all'); setShowAccountDropdown(false); }}>All Accounts</div>
                                {accounts.map(a => (
                                    <div key={a._id} className={`smc-dropdown-item ${selectedAccount === a._id ? 'active' : ''}`} onClick={() => { setSelectedAccount(a._id); setShowAccountDropdown(false); }}>
                                        <span className="acct-dot" style={{ background: a.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                                        <span style={{ flex: 1 }}>{a.name}</span>
                                        {a.assignedTo?.length > 0 && (
                                            <div className="smc-avatar-stack-mini">
                                                {a.assignedTo.slice(0, 3).map((u, i) => (
                                                    <div key={u._id || i} className="smc-avatar-mini" title={u.fullName} style={{ zIndex: 3 - i }}>
                                                        {getInitials(u.fullName)}
                                                    </div>
                                                ))}
                                                {a.assignedTo.length > 3 && <div className="smc-avatar-mini smc-avatar-mini-more">+{a.assignedTo.length - 3}</div>}
                                            </div>
                                        )}
                                        <span className="acct-platform">{a.platform}</span>
                                        {(a.createdBy?._id === currentUser?._id || a.createdBy === currentUser?._id || currentUser?.role === 'Admin') && (
                                            <button className="acct-edit" onClick={e => openEditAccount(a, e)} title="Edit"><FiEdit3 size={12} /></button>
                                        )}
                                        <button className="acct-delete" onClick={e => { e.stopPropagation(); handleDeleteAccount(a._id); }}><FiTrash2 size={12} /></button>
                                    </div>
                                ))}
                                <button className="smc-add-account-link" onClick={() => { setShowAccountDropdown(false); setShowAccountModal(true); }}><FiPlus size={13} /> Add Account</button>
                            </div>
                        )}
                    </div>
                    <button className="smc-btn-icon" onClick={handleExportCSV} title="Export CSV"><FiDownload size={14} /></button>
                    <button className="smc-btn-icon smc-share-btn" onClick={openShareDialog} title="Share calendar"><FiShare2 size={14} /></button>
                    <button className="smc-btn-primary" onClick={() => openPostModal()}><FiPlus size={14} /> New Post</button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedPosts.length > 0 && (
                <div className="smc-toolbar" style={{ background: '#1a1a1a', borderColor: '#333' }}>
                    <div className="smc-filter-group">
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}><FiCheckSquare size={14} style={{ marginRight: 4 }} />{selectedPosts.length} selected</span>
                        {STATUSES.map(s => <button key={s} className="smc-filter-btn" style={{ color: '#fff', borderColor: '#555' }} onClick={() => handleBulkStatus(s)}>{s}</button>)}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="smc-btn-secondary" style={{ borderColor: '#555', color: '#fff' }} onClick={() => setSelectedPosts([])}>Cancel</button>
                        <button className="smc-btn-secondary" style={{ borderColor: '#dc2626', color: '#dc2626' }} onClick={handleBulkDelete}><FiTrash2 size={12} /> Delete All</button>
                    </div>
                </div>
            )}

            {/* Filter Toolbar */}
            {selectedPosts.length === 0 && (
                <div className="smc-toolbar">
                    <div className="smc-filter-group">
                        <button className={`smc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
                        {STATUSES.map(s => <button key={s} className={`smc-filter-btn ${statusFilter === statusClass(s) ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === statusClass(s) ? 'all' : statusClass(s))}>{s}</button>)}
                    </div>
                    <div className="smc-stats">
                        <span className="smc-stat"><FiCalendar size={12} /> <strong>{totalPosts}</strong> posts</span>
                        <span className="smc-stat"><FiClock size={12} /> <strong>{scheduledCount}</strong> scheduled</span>
                        <span className="smc-stat"><FiEdit3 size={12} /> <strong>{draftCount}</strong> drafts</span>
                    </div>
                </div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
                <div className="smc-calendar-wrapper">
                    <div className="smc-weekdays">{WEEKDAYS.map(d => <div key={d} className="smc-weekday">{d}</div>)}</div>
                    <div className="smc-days">
                        {calendarDays.map((dayObj, idx) => {
                            const dayPosts = getPostsForDay(posts, dayObj.date, statusFilter, searchQuery);
                            return (
                                <div key={idx} className={`smc-day-cell ${!dayObj.currentMonth ? 'other-month' : ''} ${isToday(dayObj.date) ? 'today' : ''}`}
                                    onClick={() => dayObj.currentMonth && openPostModal(dayObj.date)}
                                    onDragOver={dayObj.currentMonth ? handleDragOver : undefined} onDragLeave={dayObj.currentMonth ? handleDragLeave : undefined}
                                    onDrop={dayObj.currentMonth ? (e) => handleDrop(e, dayObj.date) : undefined}>
                                    <div className="smc-day-number">{dayObj.day}</div>
                                    <div className="smc-day-posts">
                                        {dayPosts.slice(0, 3).map(post => (
                                            <div key={post._id} className={`smc-post-chip status-${statusClass(post.status)} ${selectedPosts.includes(post._id) ? 'selected' : ''}`}
                                                onClick={e => { e.stopPropagation(); if (selectedPosts.length > 0) toggleSelectPost(post._id); else openPostDetail(post); }}
                                                onContextMenu={e => handleContextMenu(e, post)} draggable onDragStart={e => handleDragStart(e, post)} onDragEnd={handleDragEnd}
                                                title={`${post.title} — ${post.status} (${post.priority})`}>
                                                <span className="chip-dot" style={{ background: post.socialMediaAccount?.color || '#1a1a1a' }} />
                                                <span className="chip-title">{truncateWords(post.title)}</span>
                                                {post.priority === 'High' && <span style={{ color: '#dc2626', fontSize: 9 }}>●</span>}
                                                <span className="chip-platform">{post.platform?.slice(0, 2)}</span>
                                            </div>
                                        ))}
                                        {dayPosts.length > 3 && <div className="smc-more-posts" onClick={e => { e.stopPropagation(); openPostDetail(dayPosts[3]); }}>+{dayPosts.length - 3} more</div>}
                                    </div>
                                    {dayObj.currentMonth && <div className="smc-add-hint"><FiPlus size={12} /></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Week View */}
            {viewMode === 'week' && (
                <div className="smc-week-view">
                    {weekDays.map((date, idx) => {
                        const dayPosts = getPostsForDay(posts, date, statusFilter, searchQuery);
                        return (
                            <div key={idx} className="smc-week-day" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, date)}>
                                <div className={`smc-week-day-label ${isToday(date) ? 'today-label' : ''}`}>{date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                <div className="smc-week-day-content" onClick={() => openPostModal(date)}>
                                    {dayPosts.map(post => (
                                        <div key={post._id} className="smc-week-post" onClick={e => { e.stopPropagation(); openPostDetail(post); }} onContextMenu={e => handleContextMenu(e, post)} draggable onDragStart={e => handleDragStart(e, post)} onDragEnd={handleDragEnd}>
                                            <span className="wp-dot" style={{ background: post.socialMediaAccount?.color || '#1a1a1a' }} />
                                            <span className="wp-title">{truncateWords(post.title)}</span>
                                            <span className="wp-time">{post.postTime}</span>
                                            {post.priority === 'High' && <span style={{ color: '#dc2626', fontSize: 10, fontWeight: 600 }}>HIGH</span>}
                                            <span className="wp-status" style={{ color: STATUS_COLORS[post.status], border: `1px solid ${STATUS_COLORS[post.status]}30`, borderRadius: 4, padding: '2px 6px' }}>{post.status}</span>
                                            {post.socialMediaAccount?.assignedTo?.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>→ {post.socialMediaAccount.assignedTo.map(u => u.fullName).join(', ')}</span>}
                                        </div>
                                    ))}
                                    {dayPosts.length === 0 && <span style={{ color: '#d1d5db', fontSize: 12 }}>No posts</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div className="smc-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <button className="smc-context-item" onClick={() => { openPostDetail(contextMenu.post); setContextMenu(null); }}><FiEdit3 /> View</button>
                    <button className="smc-context-item" onClick={() => { setContextMenu(null); openEditPost(contextMenu.post); }}><FiEdit3 /> Edit</button>
                    <button className="smc-context-item" onClick={() => handleDuplicatePost(contextMenu.post)}><FiCopy /> Duplicate</button>
                    <button className="smc-context-item" onClick={() => { toggleSelectPost(contextMenu.post._id); setContextMenu(null); }}><FiCheckSquare /> Select</button>
                    <button className="smc-context-item" onClick={() => { handleSaveAsTemplate(contextMenu.post); setContextMenu(null); }}><FiBookmark /> Save as Template</button>
                    <div className="smc-context-divider" />
                    <button className="smc-context-item danger" onClick={() => handleDeletePost(contextMenu.post._id)}><FiTrash2 /> Delete</button>
                </div>
            )}

            {/* Create/Edit Post Modal */}
            {showPostModal && (
                <div className="smc-modal-overlay" onClick={() => setShowPostModal(false)}>
                    <div className="smc-modal smc-modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="smc-modal-header">
                            <h3>{editingPost ? 'Edit Post' : 'New Post'}</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {templates.length > 0 && !editingPost && (
                                    <select style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, fontFamily: "'Switzer', sans-serif", color: '#6b7280' }}
                                        onChange={e => { const t = templates.find(t => t._id === e.target.value); if (t) handleUseTemplate(t); }} defaultValue="">
                                        <option value="" disabled>Use Template</option>
                                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                )}
                                <button className="smc-modal-close" onClick={() => setShowPostModal(false)}><FiX size={18} /></button>
                            </div>
                        </div>
                        <div className="smc-modal-body">
                            <div className="smc-form-group"><label>Title *</label><input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} placeholder="Post title..." /></div>
                            <div className="smc-form-group">
                                <label>Content</label>
                                <textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} placeholder="Write your content..." rows={3} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        {currentAccountHashtags.length > 0 && (
                                            <div style={{ position: 'relative' }}>
                                                <button type="button" className="smc-btn-icon" onClick={() => setShowHashtagPicker(!showHashtagPicker)} title="Insert Hashtags"><FiHash size={13} /></button>
                                                {showHashtagPicker && (
                                                    <div className="smc-status-options" style={{ left: 0, minWidth: 200 }}>
                                                        {currentAccountHashtags.map((g, i) => (
                                                            <div key={i} className="smc-status-option" onClick={() => { setPostForm(prev => ({ ...prev, content: prev.content + '\n' + g.hashtags })); setShowHashtagPicker(false); }}>
                                                                <FiHash size={12} />{g.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 11, color: charCount > charLimit ? '#dc2626' : '#9ca3af' }}>{charCount}/{charLimit} ({postForm.platform})</span>
                                </div>
                            </div>
                            <div className="smc-form-row">
                                <div className="smc-form-group"><label>Date *</label><input type="date" value={postForm.postDate} onChange={e => setPostForm({ ...postForm, postDate: e.target.value })} /></div>
                                <div className="smc-form-group"><label>Time</label><input type="time" value={postForm.postTime} onChange={e => setPostForm({ ...postForm, postTime: e.target.value })} /></div>
                            </div>
                            <div className="smc-form-row">
                                <div className="smc-form-group"><label>Platform</label><select value={postForm.platform} onChange={e => setPostForm({ ...postForm, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                <div className="smc-form-group"><label>Post Type</label><select value={postForm.postType} onChange={e => setPostForm({ ...postForm, postType: e.target.value })}><option value="Static Post">Static Post</option><option value="Carousel">Carousel</option><option value="Reel">Reel</option></select></div>
                            </div>
                            <div className="smc-form-row">
                                <div className="smc-form-group"><label>Priority</label><select value={postForm.priority} onChange={e => setPostForm({ ...postForm, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                <div className="smc-form-group"><label>Status</label><select value={postForm.status} onChange={e => setPostForm({ ...postForm, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>
                            {!editingPost && (
                                <div className="smc-form-row">
                                    <div className="smc-form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={postForm.isRecurring} onChange={e => setPostForm({ ...postForm, isRecurring: e.target.checked })} style={{ width: 'auto' }} /> <FiRepeat size={12} /> Recurring Post</label>
                                    </div>
                                    {postForm.isRecurring && (
                                        <div className="smc-form-group"><label>Repeat</label><select value={postForm.recurringPattern} onChange={e => setPostForm({ ...postForm, recurringPattern: e.target.value })}><option value="">Select...</option><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option></select></div>
                                    )}
                                </div>
                            )}
                            <div className="smc-form-group"><label>Labels (comma separated)</label><input value={postForm.labels} onChange={e => setPostForm({ ...postForm, labels: e.target.value })} placeholder="e.g. Product Launch, Sale" /></div>
                            <div className="smc-form-group"><label><FiExternalLink size={12} style={{ marginRight: 4 }} />Reference Links</label><textarea value={postForm.referenceLinks} onChange={e => setPostForm({ ...postForm, referenceLinks: e.target.value })} placeholder="Add URLs (one per line)..." rows={2} /></div>
                            {/* Reference Images */}
                            <div className="smc-form-group">
                                <label><FiImage size={12} style={{ marginRight: 4 }} />Reference Images</label>
                                {!driveToken ? (
                                    <button type="button" className="smc-google-signin-btn" onClick={() => driveLogin()}>
                                        <svg viewBox="0 0 48 48" width="16" height="16" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                                        Sign in with Google to upload reference images
                                    </button>
                                ) : (
                                    <div className="smc-ref-section">
                                        <div className="smc-ref-header">
                                            {driveUser?.picture && <img src={driveUser.picture} alt="" className="smc-ref-avatar" />}
                                            <span className="smc-ref-username">{driveUser?.name || driveUser?.email}</span>
                                            <button type="button" className="smc-ref-signout" onClick={disconnectDrive}>Sign out</button>
                                        </div>
                                        <button type="button" className="smc-ref-upload-btn" onClick={() => refFileInputRef.current?.click()} disabled={refUploading}>
                                            <FiUpload size={13} /> {refUploading ? 'Uploading...' : 'Upload images'}
                                        </button>
                                        <input ref={refFileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files.length) handleRefImageUpload(e.target.files); e.target.value = ''; }} />
                                        {Object.entries(refUploadProgress).map(([name, pct]) => (
                                            <div key={name} className="smc-ref-progress-item">
                                                <div className="smc-ref-progress-meta"><span className="smc-ref-progress-name">{name}</span><span>{pct}%</span></div>
                                                <Progress value={pct} />
                                            </div>
                                        ))}
                                        {postForm.referenceImages.length > 0 && (
                                            <div className="smc-ref-thumbs">
                                                {postForm.referenceImages.map((img, idx) => {
                                                    const imgKey = img._id || img._localId || img.driveFileId || idx;
                                                    // Use local blob URL for preview (Drive thumbnailLink needs Google auth cookie to display)
                                                    const imgSrc = img.localPreviewUrl || img.thumbnailLink || '';
                                                    const removeId = img._id || img._localId || img.driveFileId;
                                                    return (
                                                        <div key={imgKey} className={`smc-ref-thumb${img.uploading ? ' smc-ref-thumb--uploading' : ''}${img.failed ? ' smc-ref-thumb--failed' : ''}`}>
                                                            {imgSrc
                                                                ? <img src={imgSrc} alt={img.name} />
                                                                : <div className="smc-ref-thumb-placeholder"><FiImage size={18} /></div>}
                                                            <button type="button" className="smc-ref-thumb-remove" onClick={() => removeRefImage(removeId)}><FiX size={10} /></button>
                                                            <div className="smc-ref-thumb-name">{img.name}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="smc-modal-footer">
                            <button className="smc-btn-secondary" onClick={() => setShowPostModal(false)}>Cancel</button>
                            <button className="smc-btn-primary" onClick={handleCreatePost} disabled={isSubmittingPost}>{isSubmittingPost ? 'Saving...' : editingPost ? 'Update' : postForm.isRecurring ? 'Create Recurring' : 'Create Post'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Detail Modal */}
            {showPostDetail && (
                <div className="smc-modal-overlay" onClick={() => setShowPostDetail(null)}>
                    <div className="smc-modal smc-modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="smc-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{showPostDetail.title}</h3>
                                {showPostDetail.priority && showPostDetail.priority !== 'Medium' && <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLORS[showPostDetail.priority], border: `1px solid ${PRIORITY_COLORS[showPostDetail.priority]}30`, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{showPostDetail.priority}</span>}
                                <div className="smc-status-dropdown">
                                    <span className={`smc-status-badge s-${statusClass(showPostDetail.status)}`} onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                                        <span className="s-dot" style={{ background: STATUS_COLORS[showPostDetail.status] }} />{showPostDetail.status}<FiChevronDown size={10} />
                                    </span>
                                    {showStatusDropdown && <div className="smc-status-options">{STATUSES.map(s => <div key={s} className="smc-status-option" onClick={() => handleStatusChange(showPostDetail._id, s)}><span className="s-dot" style={{ background: STATUS_COLORS[s] }} />{s}</div>)}</div>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="smc-btn-icon" onClick={() => { setShowPostDetail(null); openEditPost(showPostDetail); }} title="Edit"><FiEdit3 size={14} /></button>
                                <button className="smc-btn-icon" onClick={() => handleDuplicatePost(showPostDetail)} title="Duplicate"><FiCopy size={14} /></button>
                                <button className="smc-btn-icon" onClick={() => { handleSaveAsTemplate(showPostDetail); }} title="Save as Template"><FiBookmark size={14} /></button>
                                <button className="smc-btn-icon" onClick={() => handleDeletePost(showPostDetail._id)} title="Delete" style={{ color: '#dc2626' }}><FiTrash2 size={14} /></button>
                                <button className="smc-modal-close" onClick={() => setShowPostDetail(null)}><FiX size={18} /></button>
                            </div>
                        </div>
                        <div className="smc-tabs">
                            <button className={`smc-tab ${detailTab === 'details' ? 'active' : ''}`} onClick={() => setDetailTab('details')}><FiCalendar size={13} /> Details</button>
                            <button className={`smc-tab ${detailTab === 'media' ? 'active' : ''}`} onClick={() => setDetailTab('media')}><FiImage size={13} /> Reference Images ({showPostDetail.referenceImages?.length || 0})</button>
                            <button className={`smc-tab ${detailTab === 'comments' ? 'active' : ''}`} onClick={() => setDetailTab('comments')}><FiMessageCircle size={13} /> Comments ({showPostDetail.comments?.length || 0})</button>
                            <button className={`smc-tab ${detailTab === 'activity' ? 'active' : ''}`} onClick={() => setDetailTab('activity')}><FiActivity size={13} /> Activity</button>
                        </div>
                        <div className="smc-modal-body">
                            {detailTab === 'details' && (<>
                                {showPostDetail.content && <div className="smc-detail-field"><div className="smc-detail-label">Content</div><div className="smc-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{showPostDetail.content}</div></div>}
                                <div className="smc-detail-row">
                                    <div className="smc-detail-field"><div className="smc-detail-label">Date</div><div className="smc-detail-value">{new Date(showPostDetail.postDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
                                    <div className="smc-detail-field"><div className="smc-detail-label">Time</div><div className="smc-detail-value">{showPostDetail.postTime || '—'}</div></div>
                                </div>
                                <div className="smc-detail-row">
                                    <div className="smc-detail-field"><div className="smc-detail-label">Platform</div><div className="smc-detail-value">{showPostDetail.platform}</div></div>
                                    <div className="smc-detail-field"><div className="smc-detail-label">Post Type</div><div className="smc-detail-value">{showPostDetail.postType || 'Static Post'}</div></div>
                                </div>
                                {/* Account-based assignees */}
                                {showPostDetail.socialMediaAccount?.assignedTo?.length > 0 && (
                                    <div className="smc-detail-field">
                                        <div className="smc-detail-label">Team Members</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {showPostDetail.socialMediaAccount.assignedTo.map((u, i) => (
                                                <div key={u._id || i} className="smc-assignee-info">
                                                    <div className="smc-assignee-avatar">{getInitials(u.fullName)}</div>
                                                    <span className="smc-assignee-name">{u.fullName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {showPostDetail.labels?.length > 0 && <div className="smc-detail-field"><div className="smc-detail-label">Labels</div><div className="smc-labels">{showPostDetail.labels.map((l, i) => <span key={i} className="smc-label-tag">{l}</span>)}</div></div>}
                                {showPostDetail.referenceLinks?.length > 0 && (
                                    <div className="smc-detail-field">
                                        <div className="smc-detail-label"><FiExternalLink size={11} style={{ marginRight: 4 }} />Reference Links</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {showPostDetail.referenceLinks.map((link, i) => (
                                                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="smc-ref-link">{link}</a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="smc-detail-field"><div className="smc-detail-label">Created By</div><div className="smc-detail-value">{showPostDetail.createdBy?.fullName || 'Unknown'}</div></div>
                            </>)}
                            {detailTab === 'media' && (<>
                                {showPostDetail.referenceImages?.length > 0 ? (
                                    <div className="smc-ref-detail-grid">
                                        {showPostDetail.referenceImages.map(img => (
                                            <div key={img._id || img.driveFileId} className="smc-ref-detail-card">
                                                <div className="smc-ref-detail-thumb">
                                                    {img.thumbnailLink
                                                        ? <img src={img.thumbnailLink} alt={img.name} />
                                                        : <div className="smc-ref-thumb-placeholder"><FiImage size={22} /></div>}
                                                </div>
                                                <div className="smc-ref-detail-info">
                                                    <span className="smc-ref-detail-name">{img.name}</span>
                                                    <div className="smc-ref-detail-actions">
                                                        {img.webViewLink && (
                                                            <a href={img.webViewLink} target="_blank" rel="noopener noreferrer" className="smc-ref-detail-btn">
                                                                <FiExternalLink size={12} /> View
                                                            </a>
                                                        )}
                                                        {img.driveFileId && (
                                                            <a href={`https://drive.google.com/uc?export=download&id=${img.driveFileId}`} target="_blank" rel="noopener noreferrer" className="smc-ref-detail-btn smc-ref-detail-btn--dl">
                                                                <FiDownload size={12} /> Download
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="smc-empty">No reference images attached to this post</p>
                                )}
                            </>)}
                            {detailTab === 'comments' && (<>
                                <div className="smc-comments-list">
                                    {showPostDetail.comments?.length > 0 ? showPostDetail.comments.map((c, i) => (
                                        <div key={i} className="smc-comment"><div className="smc-comment-avatar">{getInitials(c.author?.fullName)}</div><div className="smc-comment-body"><div className="smc-comment-author">{c.author?.fullName || 'Unknown'}</div><div className="smc-comment-text">{c.content}</div><div className="smc-comment-time">{formatTime(c.createdAt)}</div></div></div>
                                    )) : <p className="smc-empty">No comments yet</p>}
                                </div>
                                <div className="smc-comment-input"><input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyDown={e => { if (e.key === 'Enter') handleAddComment(showPostDetail._id); }} /><button onClick={() => handleAddComment(showPostDetail._id)}><FiSend size={14} /></button></div>
                            </>)}
                            {detailTab === 'activity' && (
                                <div className="smc-activity-list">
                                    {showPostDetail.activity?.length > 0 ? [...showPostDetail.activity].reverse().map((a, i) => (
                                        <div key={i} className="smc-activity-item"><div className="smc-activity-dot" /><div><div className="smc-activity-details"><strong>{a.user?.fullName || 'System'}</strong> — {a.details}</div><div className="smc-activity-time">{formatTime(a.createdAt)}</div></div></div>
                                    )) : <p className="smc-empty">No activity yet</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Account Modal */}
            {showAccountModal && (
                <div className="smc-modal-overlay" onClick={() => setShowAccountModal(false)}>
                    <div className="smc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="smc-modal-header"><h3>Add Account</h3><button className="smc-modal-close" onClick={() => setShowAccountModal(false)}><FiX size={18} /></button></div>
                        <div className="smc-modal-body">
                            <div className="smc-form-group"><label>Account Name *</label><input value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. Company Instagram" /></div>
                            <div className="smc-form-group"><label>Platform</label><select value={accountForm.platform} onChange={e => setAccountForm({ ...accountForm, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div className="smc-form-group"><label>Handle / URL</label><input value={accountForm.handle} onChange={e => setAccountForm({ ...accountForm, handle: e.target.value })} placeholder="@your_handle" /></div>
                            <div className="smc-form-group">
                                <label>Assign Team Members</label>
                                <div className="smc-assignee-selector" ref={assigneeDropdownRef}>
                                    <div className="smc-assignee-row">
                                        {/* Stacked assigned avatars */}
                                        {accountForm.assignedTo.map(id => {
                                            const m = teamMembers.find(tm => tm._id === id);
                                            if (!m) return null;
                                            return (
                                                <div key={id} className="smc-av-wrap" title={m.fullName}>
                                                    <div className="smc-av-circle smc-av-fallback">{getInitials(m.fullName)}</div>
                                                    <button
                                                        type="button"
                                                        className="smc-av-remove"
                                                        onClick={() => setAccountForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(x => x !== id) }))}
                                                    >×</button>
                                                </div>
                                            );
                                        })}
                                        {/* Dotted + circle */}
                                        <button
                                            type="button"
                                            className={`smc-add-av-btn${showAssigneeDropdown ? ' open' : ''}`}
                                            onClick={() => setShowAssigneeDropdown(v => !v)}
                                            title="Add team member"
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    </div>
                                    {/* Dropdown */}
                                    {showAssigneeDropdown && (
                                        <div className="smc-assignee-dropdown">
                                            {teamMembers.length === 0 && (
                                                <div className="smc-assignee-empty">No team members found</div>
                                            )}
                                            {teamMembers.map(m => {
                                                const selected = accountForm.assignedTo.includes(m._id);
                                                return (
                                                    <div
                                                        key={m._id}
                                                        className={`smc-assignee-opt${selected ? ' smc-assignee-opt--sel' : ''}`}
                                                        onClick={() => setAccountForm(prev => ({
                                                            ...prev,
                                                            assignedTo: selected
                                                                ? prev.assignedTo.filter(x => x !== m._id)
                                                                : [...prev.assignedTo, m._id]
                                                        }))}
                                                    >
                                                        <div className="smc-av-sm smc-av-fallback">{getInitials(m.fullName)}</div>
                                                        <span className="smc-assignee-opt-name">{m.fullName}</span>
                                                        {selected && <span className="smc-assignee-opt-check">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="smc-form-group">
                                <label>Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input type="color" value={accountForm.color} onChange={e => setAccountForm({ ...accountForm, color: e.target.value })} style={{ width: 40, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                                    <span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{accountForm.color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="smc-modal-footer"><button className="smc-btn-secondary" onClick={() => setShowAccountModal(false)}>Cancel</button><button className="smc-btn-primary" onClick={handleCreateAccount}>Create Account</button></div>
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {showEditAccountModal && editingAccount && (
                <div className="smc-modal-overlay" onClick={() => setShowEditAccountModal(false)}>
                    <div className="smc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="smc-modal-header">
                            <h3>Edit Account</h3>
                            <button className="smc-modal-close" onClick={() => setShowEditAccountModal(false)}><FiX size={18} /></button>
                        </div>
                        <div className="smc-modal-body">
                            <div className="smc-form-group"><label>Account Name *</label><input value={editAccountForm.name} onChange={e => setEditAccountForm({ ...editAccountForm, name: e.target.value })} placeholder="e.g. Company Instagram" /></div>
                            <div className="smc-form-group"><label>Platform</label><select value={editAccountForm.platform} onChange={e => setEditAccountForm({ ...editAccountForm, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div className="smc-form-group"><label>Handle / URL</label><input value={editAccountForm.handle} onChange={e => setEditAccountForm({ ...editAccountForm, handle: e.target.value })} placeholder="@your_handle" /></div>
                            <div className="smc-form-group">
                                <label>Assign Team Members</label>
                                <div className="smc-assignee-selector" ref={editAssigneeDropdownRef}>
                                    <div className="smc-assignee-row">
                                        {editAccountForm.assignedTo.map(id => {
                                            const m = teamMembers.find(tm => tm._id === id);
                                            if (!m) return null;
                                            return (
                                                <div key={id} className="smc-av-wrap" title={m.fullName}>
                                                    <div className="smc-av-circle smc-av-fallback">{getInitials(m.fullName)}</div>
                                                    <button type="button" className="smc-av-remove" onClick={() => setEditAccountForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(x => x !== id) }))}>×</button>
                                                </div>
                                            );
                                        })}
                                        <button type="button" className={`smc-add-av-btn${showEditAssigneeDropdown ? ' open' : ''}`} onClick={() => setShowEditAssigneeDropdown(v => !v)} title="Add team member"><FiPlus size={14} /></button>
                                    </div>
                                    {showEditAssigneeDropdown && (
                                        <div className="smc-assignee-dropdown">
                                            {teamMembers.length === 0 && <div className="smc-assignee-empty">No team members found</div>}
                                            {teamMembers.map(m => {
                                                const selected = editAccountForm.assignedTo.includes(m._id);
                                                return (
                                                    <div key={m._id} className={`smc-assignee-opt${selected ? ' smc-assignee-opt--sel' : ''}`}
                                                        onClick={() => setEditAccountForm(prev => ({ ...prev, assignedTo: selected ? prev.assignedTo.filter(x => x !== m._id) : [...prev.assignedTo, m._id] }))}>
                                                        <div className="smc-av-sm smc-av-fallback">{getInitials(m.fullName)}</div>
                                                        <span className="smc-assignee-opt-name">{m.fullName}</span>
                                                        {selected && <span className="smc-assignee-opt-check">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="smc-form-group">
                                <label>Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input type="color" value={editAccountForm.color} onChange={e => setEditAccountForm({ ...editAccountForm, color: e.target.value })} style={{ width: 40, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                                    <span style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{editAccountForm.color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="smc-modal-footer">
                            <button className="smc-btn-secondary" onClick={() => setShowEditAccountModal(false)}>Cancel</button>
                            <button className="smc-btn-primary" onMouseDown={() => setShowEditAssigneeDropdown(false)} onClick={handleUpdateAccount}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save as Template Modal */}
            {showTemplateModal && (
                <div className="smc-modal-overlay" onClick={() => setShowTemplateModal(false)}>
                    <div className="smc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="smc-modal-header"><h3>Save as Template</h3><button className="smc-modal-close" onClick={() => setShowTemplateModal(false)}><FiX size={18} /></button></div>
                        <div className="smc-modal-body">
                            <div className="smc-form-group"><label>Template Name *</label><input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Template name..." /></div>
                            <div className="smc-form-group"><label>Content</label><textarea value={templateForm.content} onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })} rows={3} /></div>
                            <div className="smc-form-group"><label>Platform</label><select value={templateForm.platform} onChange={e => setTemplateForm({ ...templateForm, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div className="smc-form-group"><label>Hashtags</label><input value={templateForm.hashtags} onChange={e => setTemplateForm({ ...templateForm, hashtags: e.target.value })} placeholder="#hashtag1 #hashtag2" /></div>
                        </div>
                        <div className="smc-modal-footer"><button className="smc-btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button><button className="smc-btn-primary" onClick={handleCreateTemplate}>Save Template</button></div>
                    </div>
                </div>
            )}

            {/* Share Calendar Modal */}
            {showShareDialog && (
                <div className="smc-modal-overlay" onClick={() => setShowShareDialog(false)}>
                    <div className="smc-modal smc-share-modal" onClick={e => e.stopPropagation()}>
                        <div className="smc-modal-header">
                            <h3>Share Calendar</h3>
                            <button className="smc-modal-close" onClick={() => setShowShareDialog(false)}><FiX size={18} /></button>
                        </div>
                        <div className="smc-modal-body">
                            <p className="smc-share-desc">Generate a public link so anyone can view this calendar — no login required.</p>
                            {shareToken ? (
                                <div className="smc-share-active">
                                    <div className="smc-share-status">
                                        <div className="smc-share-dot" />
                                        <span>Link active — anyone with this URL can view</span>
                                    </div>
                                    <div className="smc-share-link-row">
                                        <input readOnly value={shareUrl} className="smc-share-link-input" onClick={e => e.target.select()} />
                                        <button className="smc-share-copy-btn" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied!'); }} title="Copy link">
                                            <FiCopy size={14} />
                                        </button>
                                    </div>
                                    <div className="smc-share-actions">
                                        <button className="smc-share-action-btn" onClick={handleRegenerateShareLink} disabled={shareLoading}>
                                            <FiRefreshCw size={13} /> Change link
                                        </button>
                                        <button className="smc-share-action-btn smc-share-action-danger" onClick={handleRemoveShareAccess} disabled={shareLoading}>
                                            <FiLock size={13} /> Remove access
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="smc-share-empty">
                                    <div className="smc-share-empty-icon"><FiLink size={28} /></div>
                                    <p className="smc-share-empty-title">No active share link</p>
                                    <p className="smc-share-empty-desc">Generate a link to let anyone view this calendar without logging in.</p>
                                    <button className="smc-btn-primary smc-share-generate-btn" onClick={handleCreateShareLink} disabled={shareLoading}>
                                        <FiShare2 size={14} /> {shareLoading ? 'Generating…' : 'Generate share link'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SocialMediaCalendar;
