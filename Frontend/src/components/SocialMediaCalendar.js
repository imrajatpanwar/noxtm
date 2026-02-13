import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiX, FiUpload, FiSend, FiTrash2, FiEdit3, FiCalendar, FiMessageCircle, FiActivity, FiChevronDown, FiImage, FiSearch, FiGrid, FiList, FiCopy, FiDownload, FiHash, FiRepeat, FiBookmark, FiCheckSquare, FiClock } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { PLATFORMS, STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, ACCOUNT_COLORS, WEEKDAYS, PLATFORM_LIMITS, statusClass, getInitials, formatTime, formatDateStr, isToday, getDaysInMonth, getWeekDays, getPostsForDay, defaultPostForm, defaultAccountForm } from './calendarHelpers';
import './SocialMediaCalendar.css';

function SocialMediaCalendar() {
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
    const fileInputRef = useRef(null);
    const accountDropdownRef = useRef(null);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => {
        const h = (e) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) setShowAccountDropdown(false);
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
        if (!postForm.title.trim()) return toast.error('Title is required');
        if (!postForm.postDate) return toast.error('Date is required');
        try {
            const payload = { ...postForm, labels: postForm.labels ? postForm.labels.split(',').map(l => l.trim()).filter(Boolean) : [], socialMediaAccount: postForm.socialMediaAccount || null };
            if (editingPost) { await api.put(`/social-media-calendar/posts/${editingPost._id}`, payload); toast.success('Post updated'); }
            else { await api.post('/social-media-calendar/posts', payload); toast.success(postForm.isRecurring ? 'Recurring posts created' : 'Post created'); }
            setShowPostModal(false); setEditingPost(null); setPostForm(defaultPostForm()); fetchPosts();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save post'); }
    };

    const handleDeletePost = async (id) => {
        if (!window.confirm('Delete this post?')) return;
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
        if (selectedPosts.length === 0 || !window.confirm(`Delete ${selectedPosts.length} posts?`)) return;
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
        if (!window.confirm('Delete account and all its posts?')) return;
        try { await api.delete(`/social-media-calendar/accounts/${id}`); toast.success('Deleted'); if (selectedAccount === id) setSelectedAccount('all'); fetchAccounts(); fetchPosts(); } catch { toast.error('Failed'); }
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
        if (selectedAccount !== 'all') { const a = accounts.find(a => a._id === selectedAccount); if (a) setPostForm(prev => ({ ...prev, socialMediaAccount: selectedAccount, platform: a.platform })); }
        setShowPostModal(true);
    };

    const openEditPost = (post) => {
        setEditingPost(post);
        setPostForm({ title: post.title, content: post.content || '', postDate: new Date(post.postDate).toISOString().split('T')[0], postTime: post.postTime || '10:00', platform: post.platform, socialMediaAccount: post.socialMediaAccount?._id || '', labels: (post.labels || []).join(', '), notes: post.notes || '', status: post.status, priority: post.priority || 'Medium', isRecurring: false, recurringPattern: '' });
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
                    <div className="smc-header-icon"><FiCalendar size={20} /></div>
                    <div>
                        <h1>Content Calendar</h1>
                        <div className="smc-header-sub">Plan, schedule & manage your social media content</div>
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
                                        {a.assignedTo && <span style={{ fontSize: 11, color: '#9ca3af' }}>{a.assignedTo.fullName}</span>}
                                        <span className="acct-platform">{a.platform}</span>
                                        <button className="acct-delete" onClick={e => { e.stopPropagation(); handleDeleteAccount(a._id); }}><FiTrash2 size={12} /></button>
                                    </div>
                                ))}
                                <button className="smc-add-account-link" onClick={() => { setShowAccountDropdown(false); setShowAccountModal(true); }}><FiPlus size={13} /> Add Account</button>
                            </div>
                        )}
                    </div>
                    <button className="smc-btn-icon" onClick={handleExportCSV} title="Export CSV"><FiDownload size={14} /></button>
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
                                                <span className="chip-title">{post.title}</span>
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
                                            <span className="wp-title">{post.title}</span>
                                            <span className="wp-time">{post.postTime}</span>
                                            {post.priority === 'High' && <span style={{ color: '#dc2626', fontSize: 10, fontWeight: 600 }}>HIGH</span>}
                                            <span className="wp-status" style={{ color: STATUS_COLORS[post.status], border: `1px solid ${STATUS_COLORS[post.status]}30`, borderRadius: 4, padding: '2px 6px' }}>{post.status}</span>
                                            {post.socialMediaAccount?.assignedTo && <span style={{ fontSize: 11, color: '#9ca3af' }}>→ {post.socialMediaAccount.assignedTo.fullName}</span>}
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
                                <label>Content / Caption</label>
                                <textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} placeholder="Write your caption..." rows={3} />
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
                                <div className="smc-form-group"><label>Account</label><select value={postForm.socialMediaAccount} onChange={e => setPostForm({ ...postForm, socialMediaAccount: e.target.value })}><option value="">No Account</option>{accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.platform}){a.assignedTo ? ` → ${a.assignedTo.fullName}` : ''}</option>)}</select></div>
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
                            <div className="smc-form-group"><label>Notes</label><textarea value={postForm.notes} onChange={e => setPostForm({ ...postForm, notes: e.target.value })} placeholder="Internal notes..." rows={2} /></div>
                            {/* Account Assignee Info */}
                            {postForm.socialMediaAccount && (() => {
                                const a = accounts.find(ac => ac._id === postForm.socialMediaAccount); return a?.assignedTo ? (
                                    <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="smc-assignee-avatar">{getInitials(a.assignedTo.fullName)}</div>
                                        <div><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Account Manager</div><div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{a.assignedTo.fullName}</div></div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                        <div className="smc-modal-footer">
                            <button className="smc-btn-secondary" onClick={() => setShowPostModal(false)}>Cancel</button>
                            <button className="smc-btn-primary" onClick={handleCreatePost}>{editingPost ? 'Update' : postForm.isRecurring ? 'Create Recurring' : 'Create Post'}</button>
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
                            <button className={`smc-tab ${detailTab === 'media' ? 'active' : ''}`} onClick={() => setDetailTab('media')}><FiImage size={13} /> Media ({showPostDetail.mediaFiles?.length || 0})</button>
                            <button className={`smc-tab ${detailTab === 'comments' ? 'active' : ''}`} onClick={() => setDetailTab('comments')}><FiMessageCircle size={13} /> Comments ({showPostDetail.comments?.length || 0})</button>
                            <button className={`smc-tab ${detailTab === 'activity' ? 'active' : ''}`} onClick={() => setDetailTab('activity')}><FiActivity size={13} /> Activity</button>
                        </div>
                        <div className="smc-modal-body">
                            {detailTab === 'details' && (<>
                                {showPostDetail.content && <div className="smc-detail-field"><div className="smc-detail-label">Caption</div><div className="smc-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{showPostDetail.content}</div></div>}
                                <div className="smc-detail-row">
                                    <div className="smc-detail-field"><div className="smc-detail-label">Date</div><div className="smc-detail-value">{new Date(showPostDetail.postDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div></div>
                                    <div className="smc-detail-field"><div className="smc-detail-label">Time</div><div className="smc-detail-value">{showPostDetail.postTime || '—'}</div></div>
                                </div>
                                <div className="smc-detail-row">
                                    <div className="smc-detail-field"><div className="smc-detail-label">Platform</div><div className="smc-detail-value">{showPostDetail.platform}</div></div>
                                    <div className="smc-detail-field"><div className="smc-detail-label">Account</div><div className="smc-detail-value">{showPostDetail.socialMediaAccount ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: showPostDetail.socialMediaAccount.color, display: 'inline-block' }} />{showPostDetail.socialMediaAccount.name}</span> : <span className="text-muted">None</span>}</div></div>
                                </div>
                                {/* Account-based assignee */}
                                <div className="smc-detail-field">
                                    <div className="smc-detail-label">Account Manager</div>
                                    {showPostDetail.socialMediaAccount?.assignedTo ? (
                                        <div className="smc-assignee-info"><div className="smc-assignee-avatar">{getInitials(showPostDetail.socialMediaAccount.assignedTo.fullName)}</div><span className="smc-assignee-name">{showPostDetail.socialMediaAccount.assignedTo.fullName}</span></div>
                                    ) : <div className="smc-detail-value text-muted">No account manager assigned</div>}
                                </div>
                                {showPostDetail.labels?.length > 0 && <div className="smc-detail-field"><div className="smc-detail-label">Labels</div><div className="smc-labels">{showPostDetail.labels.map((l, i) => <span key={i} className="smc-label-tag">{l}</span>)}</div></div>}
                                {showPostDetail.notes && <div className="smc-detail-field"><div className="smc-detail-label">Notes</div><div className="smc-detail-value" style={{ whiteSpace: 'pre-wrap', color: '#6b7280' }}>{showPostDetail.notes}</div></div>}
                                <div className="smc-detail-field"><div className="smc-detail-label">Created By</div><div className="smc-detail-value">{showPostDetail.createdBy?.fullName || 'Unknown'}</div></div>
                            </>)}
                            {detailTab === 'media' && (<>
                                <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Any team member can upload graphic posts here (JPG, PNG, MP4)</div>
                                    <div className="smc-upload-area" onClick={() => fileInputRef.current?.click()}>
                                        <div className="upload-icon"><FiUpload size={28} /></div>
                                        <p><span>Click to upload</span> or drag & drop</p>
                                        <p className="smc-upload-hint">Images & videos up to 25MB</p>
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { if (e.target.files.length) handleFileUpload(showPostDetail._id, e.target.files); e.target.value = ''; }} />
                                {showPostDetail.mediaFiles?.length > 0 ? (
                                    <div className="smc-media-grid">
                                        {showPostDetail.mediaFiles.map(file => (
                                            <div key={file._id} className="smc-media-item">
                                                {file.mimeType?.startsWith('video') ? <video src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={file.url} alt={file.originalName} />}
                                                <button className="remove-media" onClick={() => handleRemoveMedia(showPostDetail._id, file._id)}>×</button>
                                                {file.uploadedBy && <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>{file.uploadedBy.fullName || 'User'}</div>}
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="smc-empty">No media files yet — upload graphics here</p>}
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
                            <div className="smc-form-group"><label>Assign Team Member</label><select value={accountForm.assignedTo} onChange={e => setAccountForm({ ...accountForm, assignedTo: e.target.value })}><option value="">Unassigned</option>{teamMembers.map(m => <option key={m._id} value={m._id}>{m.fullName}</option>)}</select></div>
                            <div className="smc-form-group"><label>Color</label><div className="smc-color-picker">{ACCOUNT_COLORS.map(c => <div key={c} className={`smc-color-swatch ${accountForm.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setAccountForm({ ...accountForm, color: c })} />)}</div></div>
                        </div>
                        <div className="smc-modal-footer"><button className="smc-btn-secondary" onClick={() => setShowAccountModal(false)}>Cancel</button><button className="smc-btn-primary" onClick={handleCreateAccount}>Create Account</button></div>
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
        </div>
    );
}

export default SocialMediaCalendar;
