import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiX, FiMessageSquare, FiClock, FiCheck, FiCalendar, FiFlag, FiSend, FiChevronDown, FiChevronRight, FiSearch, FiExternalLink, FiMoreHorizontal, FiBold, FiItalic, FiList } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import './TaskManager.css';
import { confirm } from './ui/alert-dialog';

// Helper function to format relative time
const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(date).toLocaleDateString();
};

// Priority badge component
const PriorityBadge = ({ priority }) => {
    const colors = {
        'Low': { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
        'Medium': { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
        'High': { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
        'Urgent': { bg: '#ffebee', color: '#c62828', border: '#ef9a9a' }
    };
    const style = colors[priority] || colors['Medium'];

    return (
        <span className="priority-badge" style={{
            backgroundColor: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`
        }}>
            <FiFlag size={10} />
            {priority}
        </span>
    );
};

// Status badge component
const StatusBadge = ({ status }) => {
    const statusClass = status?.toLowerCase().replace(/\s+/g, '-') || 'todo';
    return (
        <span className={`status-badge ${statusClass}`}>
            {status}
        </span>
    );
};

// User avatar component
const UserAvatar = ({ user, size = 28 }) => {
    if (!user) return null;

    // Handle different name field possibilities
    const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    // Generate consistent color from name
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    const colorIndex = displayName.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];

    // Handle different profile image field possibilities
    const profileImg = user.profileImage || user.avatar || user.profilePicture;

    return (
        <div
            className="user-avatar"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.4,
                background: profileImg ? 'transparent' : bgColor
            }}
            title={displayName}
        >
            {profileImg ? (
                <img src={profileImg} alt={displayName} />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
};

// Comment thread component
const CommentThread = ({ comments, taskId, onCommentAdded, currentUserId, companyUsers }) => {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [expandedThreads, setExpandedThreads] = useState({});
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);
    const [mentionInputType, setMentionInputType] = useState('main'); // 'main' or 'reply'

    const topLevelComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

    const handleInputChange = (e, isReply = false) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        if (isReply) {
            setReplyContent(value);
        } else {
            setNewComment(value);
        }

        // Check for @ mention
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Check if there's a space after @, if yes, don't show dropdown
            if (!textAfterAt.includes(' ')) {
                setMentionSearch(textAfterAt);
                setMentionPosition(lastAtIndex);
                setShowMentionDropdown(true);
                setMentionInputType(isReply ? 'reply' : 'main');
            } else {
                setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }
    };

    const handleMentionSelect = (user) => {
        const currentValue = mentionInputType === 'reply' ? replyContent : newComment;
        const beforeMention = currentValue.substring(0, mentionPosition);
        const afterMention = currentValue.substring(mentionPosition + mentionSearch.length + 1);
        const newValue = `${beforeMention}@${user.fullName || user.name} ${afterMention}`;
        
        if (mentionInputType === 'reply') {
            setReplyContent(newValue);
        } else {
            setNewComment(newValue);
        }
        
        setShowMentionDropdown(false);
        setMentionSearch('');
    };

    const filteredUsers = companyUsers?.filter(user => {
        const searchLower = mentionSearch.toLowerCase();
        const fullName = (user.fullName || user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
    }) || [];


    const handleSubmitComment = async (e, parentId = null) => {
        e.preventDefault();
        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        try {
            await api.post(`/tasks/${taskId}/comments`, {
                content: content.trim(),
                parentId
            });
            if (parentId) {
                setReplyContent('');
                setReplyingTo(null);
            } else {
                setNewComment('');
            }
            onCommentAdded();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const toggleThread = (commentId) => {
        setExpandedThreads(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const renderComment = (comment, isReply = false) => {
        const replies = getReplies(comment._id);
        const hasReplies = replies.length > 0;
        const isExpanded = expandedThreads[comment._id] !== false; // Default to expanded

        return (
            <div key={comment._id} className={`comment ${isReply ? 'comment-reply' : ''}`}>
                <div className="comment-header">
                    <UserAvatar user={comment.author} size={24} />
                    <span className="comment-author">{comment.author?.fullName || 'Unknown'}</span>
                    <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
                <div className="comment-actions">
                    <button
                        className="reply-btn"
                        onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                    >
                        Reply
                    </button>
                    {hasReplies && (
                        <button
                            className="toggle-replies-btn"
                            onClick={() => toggleThread(comment._id)}
                        >
                            {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                    )}
                </div>

                {replyingTo === comment._id && (
                    <form onSubmit={(e) => handleSubmitComment(e, comment._id)} className="reply-form">
                        <div className="comment-input-wrapper">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => handleInputChange(e, true)}
                                placeholder="Write a reply..."
                                autoFocus
                            />
                            {showMentionDropdown && mentionInputType === 'reply' && (
                                <div className="mention-dropdown">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(user => (
                                            <div
                                                key={user._id}
                                                className="mention-option"
                                                onClick={() => handleMentionSelect(user)}
                                            >
                                                <UserAvatar user={user} size={20} />
                                                <span>{user.fullName || user.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="mention-option no-results">No users found</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={!replyContent.trim()}>
                            <FiSend size={14} />
                        </button>
                    </form>
                )}

                {hasReplies && isExpanded && (
                    <div className="replies">
                        {replies.map(reply => renderComment(reply, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="comment-thread">
            <div className="comments-list">
                {topLevelComments.length === 0 ? (
                    <div className="no-comments">No comments yet. Start the conversation!</div>
                ) : (
                    topLevelComments.map(comment => renderComment(comment))
                )}
            </div>
            <form onSubmit={(e) => handleSubmitComment(e)} className="new-comment-form">
                <div className="comment-input-wrapper">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => handleInputChange(e, false)}
                        placeholder="Add a comment..."
                    />
                    {showMentionDropdown && mentionInputType === 'main' && (
                        <div className="mention-dropdown">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <div
                                        key={user._id}
                                        className="mention-option"
                                        onClick={() => handleMentionSelect(user)}
                                    >
                                        <UserAvatar user={user} size={20} />
                                        <span>{user.fullName || user.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="mention-option no-results">No users found</div>
                            )}
                        </div>
                    )}
                </div>
                <button type="submit" disabled={!newComment.trim()}>
                    <FiSend size={16} />
                </button>
            </form>
        </div>
    );
};

// Create Task Modal
const PRIORITY_CONFIG = {
    Low:    { color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
    Medium: { color: '#d97706', bg: '#fef9c3', dot: '#d97706' },
    High:   { color: '#dc2626', bg: '#fee2e2', dot: '#dc2626' },
    Urgent: { color: '#7c3aed', bg: '#f5f3ff', dot: '#7c3aed' },
};

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, companyUsers }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [assignees, setAssignees] = useState([]);
    const [dueDate, setDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [textFormat, setTextFormat] = useState([]);

    // @mention calendar accounts
    const [calAccounts, setCalAccounts] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionStart, setMentionStart] = useState(0);
    const descTextareaRef = useRef(null);
    const assigneeRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        api.get('/social-media-calendar/accounts').then(res => {
            setCalAccounts(res.data?.accounts || res.data || []);
        }).catch(() => {});
    }, [isOpen]);

    // Close assignee dropdown on outside click
    useEffect(() => {
        if (!showAssigneeDropdown) return;
        const handler = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                setShowAssigneeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAssigneeDropdown]);

    const handleDescChange = (e) => {
        const val = e.target.value;
        setDescription(val);
        const cursor = e.target.selectionStart;
        const before = val.slice(0, cursor);
        const atIdx = before.lastIndexOf('@');
        if (atIdx !== -1 && !before.slice(atIdx + 1).includes(' ')) {
            setMentionQuery(before.slice(atIdx + 1));
            setMentionStart(atIdx);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (accountName) => {
        const ta = descTextareaRef.current;
        if (!ta) return;
        const before = description.slice(0, mentionStart);
        const after = description.slice(ta.selectionStart);
        const newVal = `${before}@${accountName} ${after}`;
        setDescription(newVal);
        setMentionQuery(null);
        ta.focus();
        const newCursor = before.length + accountName.length + 2;
        setTimeout(() => ta.setSelectionRange(newCursor, newCursor), 0);
    };

    const filteredAccounts = mentionQuery !== null
        ? calAccounts.filter(a => a.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
        : [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsSubmitting(true);
        try {
            await api.post('/tasks', { title: title.trim(), description, priority, assignees, dueDate: dueDate || null });
            toast.success('Task created!');
            onTaskCreated();
            onClose();
            setTitle(''); setDescription(''); setPriority('Medium'); setAssignees([]); setDueDate(''); setTextFormat([]);
        } catch {
            toast.error('Failed to create task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAssignee = (userId) => {
        setAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const selectedUsers = companyUsers.filter(u => assignees.includes(u._id));

    if (!isOpen) return null;

    return (
        <div className="ctm-overlay" onClick={onClose}>
            <div className="ctm-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="ctm-header">
                    <span className="ctm-header-title">New Task</span>
                    <button type="button" className="ctm-close-btn" onClick={onClose}>
                        <FiX size={14} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="ctm-body">

                        {/* Title */}
                        <input
                            className="ctm-title-input"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task title…"
                            autoFocus
                            required
                        />

                        {/* Description */}
                        <div>
                            <div className="ctm-label">Description</div>
                            <div className="ctm-desc-card">
                                {/* Toolbar */}
                                <div className="ctm-toolbar">
                                    <button
                                        type="button"
                                        className={`ctm-fmt-btn${textFormat.includes('bold') ? ' active' : ''}`}
                                        onClick={() => setTextFormat(f => f.includes('bold') ? f.filter(x => x !== 'bold') : [...f, 'bold'])}
                                        title="Bold"
                                    >
                                        <FiBold size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`ctm-fmt-btn${textFormat.includes('italic') ? ' active' : ''}`}
                                        onClick={() => setTextFormat(f => f.includes('italic') ? f.filter(x => x !== 'italic') : [...f, 'italic'])}
                                        title="Italic"
                                    >
                                        <FiItalic size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`ctm-fmt-btn${textFormat.includes('list') ? ' active' : ''}`}
                                        onClick={() => setTextFormat(f => f.includes('list') ? f.filter(x => x !== 'list') : [...f, 'list'])}
                                        title="List"
                                    >
                                        <FiList size={13} />
                                    </button>
                                    <div className="ctm-toolbar-sep" />
                                    <span className="ctm-hint">Type <strong>@</strong> to mention a calendar account</span>
                                </div>

                                <textarea
                                    ref={descTextareaRef}
                                    className="ctm-textarea"
                                    value={description}
                                    onChange={handleDescChange}
                                    onKeyDown={e => { if (e.key === 'Escape') setMentionQuery(null); }}
                                    onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
                                    placeholder="Add details, links or references…"
                                    rows={4}
                                    style={{
                                        fontWeight: textFormat.includes('bold') ? 600 : 400,
                                        fontStyle: textFormat.includes('italic') ? 'italic' : 'normal',
                                    }}
                                />

                                {/* @mention dropdown — above */}
                                {mentionQuery !== null && filteredAccounts.length > 0 && (
                                    <div className="ctm-mention-drop">
                                        <div className="ctm-mention-label">Calendar Accounts</div>
                                        {filteredAccounts.map(acc => (
                                            <div key={acc._id} className="ctm-mention-item" onMouseDown={() => insertMention(acc.name)}>
                                                <div className="ctm-mention-icon" style={{ background: acc.color || '#6366f1' }}>
                                                    {acc.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="ctm-mention-name">{acc.name}</div>
                                                    <div className="ctm-mention-sub">{acc.platform}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Priority + Due Date */}
                        <div className="ctm-row">
                            <div>
                                <div className="ctm-label">Priority</div>
                                <div className="ctm-priority-group">
                                    {Object.entries(PRIORITY_CONFIG).map(([p]) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`ctm-priority-pill${priority === p ? ` active-${p.toLowerCase()}` : ''}`}
                                            onClick={() => setPriority(p)}
                                        >
                                            <span className="ctm-priority-dot" />
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="ctm-label">Due Date</div>
                                <input
                                    type="date"
                                    className="ctm-date-input"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Assignees */}
                        <div className="ctm-assignee-area" ref={assigneeRef}>
                            <div className="ctm-label">Assign to</div>
                            <div className="ctm-chips">
                                {selectedUsers.map(user => (
                                    <div key={user._id} className="ctm-chip">
                                        <UserAvatar user={user} size={20} />
                                        <span>{user.fullName || user.email}</span>
                                        <button type="button" className="ctm-chip-remove" onClick={() => toggleAssignee(user._id)}>
                                            <FiX size={11} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" className="ctm-add-btn" onClick={() => setShowAssigneeDropdown(p => !p)}>
                                    <FiPlus size={12} /> Add
                                </button>
                            </div>

                            {/* Dropdown — opens above */}
                            {showAssigneeDropdown && (
                                <div className="ctm-assignee-drop">
                                    <div className="ctm-drop-label">Team Members</div>
                                    {companyUsers.map(user => (
                                        <div key={user._id} className="ctm-assignee-item" onClick={() => toggleAssignee(user._id)}>
                                            <UserAvatar user={user} size={28} />
                                            <span className="ctm-assignee-item-name">{user.fullName || user.name || user.email}</span>
                                            {assignees.includes(user._id) && <FiCheck size={14} className="ctm-check" />}
                                        </div>
                                    ))}
                                    {companyUsers.length === 0 && (
                                        <div className="ctm-no-members">No team members</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="ctm-footer">
                        <button type="button" className="ctm-btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="ctm-btn-create" disabled={!title.trim() || isSubmitting}>
                            {isSubmitting ? 'Creating…' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Task Detail Panel
const TaskDetailPanel = ({ task, onClose, onTaskUpdated, companyUsers, currentUserId }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

    const handleStatusChange = async (newStatus) => {
        try {
            await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAssigneeToggle = async (userId) => {
        try {
            const currentAssigneeIds = task.assignees?.map(a => a._id) || [];
            const newAssignees = currentAssigneeIds.includes(userId)
                ? currentAssigneeIds.filter(id => id !== userId)
                : [...currentAssigneeIds, userId];
            
            await api.put(`/tasks/${task._id}`, { assignees: newAssignees });
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating assignees:', error);
        }
    };

    const handleTitleSave = async () => {
        if (!editedTitle.trim() || editedTitle === task.title) {
            setIsEditingTitle(false);
            setEditedTitle(task.title);
            return;
        }
        try {
            await api.put(`/tasks/${task._id}`, { title: editedTitle.trim() });
            onTaskUpdated();
            setIsEditingTitle(false);
        } catch (error) {
            console.error('Error updating title:', error);
        }
    };

    const handleDelete = async () => {
        if (!await confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/tasks/${task._id}`);
            onTaskUpdated();
            onClose();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    return (
        <div className="task-detail-panel">
            <div className="panel-header-task">
                <button className="panel-close-btn" onClick={onClose}>
                    <FiX size={18} />
                </button>
                <div className="panel-header-content">
                    <div className="panel-title-section">
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                                autoFocus
                                className="panel-title-input"
                            />
                        ) : (
                            <h2 className="panel-title" onClick={() => setIsEditingTitle(true)}>{task.title}</h2>
                        )}
                        {task.description && (
                            <p className="panel-description-header">{task.description}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel-content">
                <div className="panel-field">
                    <label className="panel-label">
                        <span className="panel-label-text">STATUS</span>
                    </label>
                    <div className="panel-status-buttons">
                        {['Todo', 'In Progress', 'In Review', 'Done'].map(status => (
                            <button
                                key={status}
                                className={`panel-status-btn ${task.status === status ? 'active' : ''}`}
                                onClick={() => handleStatusChange(status)}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="panel-meta-row">
                    <div className="panel-meta-left">
                        <div className="panel-field-inline">
                            <label className="panel-label-inline">PRIORITY</label>
                            <PriorityBadge priority={task.priority} />
                        </div>
                        {task.dueDate && (
                            <div className="panel-field-inline">
                                <label className="panel-label-inline">DUE DATE</label>
                                <span className="panel-due-date-inline">
                                    <FiCalendar size={12} />
                                    {new Date(task.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        )}
                        <div className="panel-field-inline">
                            <span className="panel-created-inline">
                                <FiClock size={12} />
                                {formatRelativeTime(task.createdAt)} by {task.createdBy?.fullName || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="panel-section">
                    <div className="panel-section-header">
                        <label className="panel-label">
                            <span className="panel-label-text">ASSIGNEES</span>
                        </label>
                        <button 
                            className="panel-add-btn" 
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            title="Add assignee"
                        >
                            <FiPlus />
                        </button>
                    </div>
                    <div className="panel-assignee-dropdown">
                            {showAssigneeDropdown && (
                                <div className="panel-assignee-menu">
                                    {companyUsers.map(user => {
                                        const isAssigned = task.assignees?.some(a => a._id === user._id);
                                        return (
                                            <div
                                                key={user._id}
                                                className={`panel-assignee-option ${isAssigned ? 'selected' : ''}`}
                                                onClick={() => handleAssigneeToggle(user._id)}
                                            >
                                                <UserAvatar user={user} size={20} />
                                                <span>{user.fullName || user.name || user.email}</span>
                                                {isAssigned && <FiCheck size={14} style={{ marginLeft: 'auto' }} />}
                                            </div>
                                        );
                                    })}
                                    {companyUsers.length === 0 && (
                                        <div className="panel-assignee-option" style={{ cursor: 'default', color: '#9ca3af' }}>
                                            No team members available
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="panel-field-content">
                                {task.assignees?.length > 0 ? (
                                    <div className="panel-assignees">
                                        {task.assignees.map(user => (
                                            <div key={user._id} className="panel-assignee">
                                                <UserAvatar user={user} size={20} />
                                                <span>{user.fullName}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="panel-empty-text">No assignees</span>
                                )}
                            </div>
                        </div>
                    </div>

                <div className="panel-section">
                    <div className="panel-section-header">
                        <label className="panel-label">
                            <FiMessageSquare size={14} />
                        </label>
                        <span className="panel-comments-label">COMMENTS ({task.comments?.length || 0})</span>
                    </div>
                    <CommentThread
                        comments={task.comments || []}
                        taskId={task._id}
                        onCommentAdded={onTaskUpdated}
                        currentUserId={currentUserId}
                        companyUsers={companyUsers}
                    />
                </div>
            </div>

            <div className="panel-delete-section">
                <button className="panel-delete-btn" onClick={handleDelete}>
                    Delete Task
                </button>
            </div>
        </div>
    );
};

// Task Row Component (List-based design)
const TaskRow = ({ task, onClick, onStatusChange }) => {
    const [isChecked, setIsChecked] = useState(task.status === 'Done');

    const handleCheckboxChange = async (e) => {
        e.stopPropagation();
        const newStatus = isChecked ? 'Todo' : 'Done';
        setIsChecked(!isChecked);
        if (onStatusChange) {
            await onStatusChange(task._id, newStatus);
        }
    };

    return (
        <div className="task-row" onClick={onClick}>
            <input
                type="checkbox"
                className="task-row-checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
            />
            <div className="task-row-main">
                <div className="task-row-content">
                    <h4 className="task-row-title">{task.title}</h4>
                    {task.description && (
                        <p className="task-row-description">
                            {task.description.length > 100
                                ? task.description.substring(0, 100) + '...'
                                : task.description}
                        </p>
                    )}
                </div>
                <div className="task-row-meta">
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && (
                        <span className="task-row-due">
                            <FiCalendar size={12} />
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                    <div className="task-row-assignees">
                        {task.assignees?.slice(0, 2).map((user) => (
                                <UserAvatar key={user._id} user={user} size={24} />
                        ))}
                        {task.assignees?.length > 2 && (
                            <span className="more-assignees">+{task.assignees.length - 2}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="task-row-actions">
                <StatusBadge status={task.status} />
                {task.comments?.length > 0 && (
                    <span className="task-row-comments">
                        <FiMessageSquare size={14} />
                        {task.comments.length}
                    </span>
                )}
                <span className="task-row-time">{formatRelativeTime(task.createdAt)}</span>
                <button className="task-row-action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }} title="Open task">
                    <FiExternalLink size={16} />
                </button>
                <button className="task-row-action-btn" title="More options">
                    <FiMoreHorizontal size={16} />
                </button>
            </div>
        </div>
    );
};

// Main Task Manager Component
function TaskManager({ isWidget = false }) {
    const { currentUser } = useRole();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [stats, setStats] = useState({ Todo: 0, 'In Progress': 0, 'In Review': 0, Done: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    // Status order: In Review, Todo, In Progress, Done
    const statuses = ['In Review', 'Todo', 'In Progress', 'Done'];

    const fetchTasks = useCallback(async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data.tasks || []);

            // Calculate stats
            const newStats = { Todo: 0, 'In Progress': 0, 'In Review': 0, Done: 0 };
            (response.data.tasks || []).forEach(task => {
                if (newStats[task.status] !== undefined) {
                    newStats[task.status]++;
                }
            });
            setStats(newStats);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCompanyUsers = useCallback(async () => {
        try {
            const response = await api.get('/users/company-members');
            setCompanyUsers(response.data.members || response.data || []);
        } catch (err) {
            console.error('Error fetching company users:', err);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchCompanyUsers();
    }, [fetchTasks, fetchCompanyUsers]);

    const handleTaskClick = async (task) => {
        try {
            const response = await api.get(`/tasks/${task._id}`);
            setSelectedTask(response.data);
        } catch (err) {
            console.error('Error fetching task details:', err);
        }
    };

    const handleTaskUpdated = () => {
        fetchTasks();
        if (selectedTask) {
            handleTaskClick(selectedTask);
        }
    };

    if (loading) {
        return (
            <div className={`task-manager ${isWidget ? 'widget-mode' : ''}`}>
                <div className="loading-state">Loading tasks...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`task-manager ${isWidget ? 'widget-mode' : ''}`}>
                <div className="error-state">{error}</div>
            </div>
        );
    }

    // Widget mode - simplified view for Overview
    if (isWidget) {
        const recentTasks = tasks.slice(0, 4);
        const totalTasks = tasks.length;
        
        return (
            <div className="task-manager widget-mode">
                <div className="widget-header">
                    <div className="widget-title-row">
                        <h3>Tasks</h3>
                        <span className="task-total">{totalTasks}</span>
                    </div>
                    <button className="create-btn-sm" onClick={() => setIsCreateModalOpen(true)}>
                        <FiPlus size={14} />
                    </button>
                </div>
                <div className="widget-stats-row">
                    {statuses.map(status => (
                        <div key={status} className="stat-chip">
                            <span className="stat-count">{stats[status]}</span>
                            <span className="stat-label">{status === 'In Progress' ? 'Progress' : status === 'In Review' ? 'Review' : status}</span>
                        </div>
                    ))}
                </div>
                <div className="widget-tasks">
                    {recentTasks.length === 0 ? (
                        <div className="empty-state-minimal">
                            <span>No tasks yet</span>
                        </div>
                    ) : (
                        recentTasks.map(task => (
                            <div key={task._id} className="widget-task-item" onClick={() => handleTaskClick(task)}>
                                <div className="task-status-dot" data-status={task.status}></div>
                                <span className="task-title">{task.title}</span>
                                <span className="task-time">{formatRelativeTime(task.createdAt)}</span>
                            </div>
                        ))
                    )}
                </div>

                <CreateTaskModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onTaskCreated={fetchTasks}
                    companyUsers={companyUsers}
                />

                {selectedTask && (
                    <div className="noxtm-overlay" onClick={() => setSelectedTask(null)}>
                        <div className="detail-modal" onClick={e => e.stopPropagation()}>
                            <TaskDetailPanel
                                task={selectedTask}
                                onClose={() => setSelectedTask(null)}
                                onTaskUpdated={handleTaskUpdated}
                                companyUsers={companyUsers}
                                currentUserId={currentUser?._id}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
            fetchTasks();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Filter tasks by search query
    const filteredTasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Full Task Manager view - Single list without status grouping
    return (
        <div className="task-manager task-manager-list">
            <div className="task-manager-header">
                <div className="task-header-left">
                    <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Task Manager</h1>
                    <p className="task-header-subtitle">Manage and track your team's tasks efficiently.</p>
                </div>
                <div className="task-header-right">
                    <div className="task-search-box">
                        <FiSearch size={16} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="create-task-btn" onClick={() => setIsCreateModalOpen(true)}>
                        <FiPlus size={16} />
                        New
                    </button>
                </div>
            </div>

            <div className="task-list-container">
                <div className="task-list">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <TaskRow
                                key={task._id}
                                task={task}
                                onClick={() => handleTaskClick(task)}
                                onStatusChange={handleStatusChange}
                            />
                        ))
                    ) : (
                        <div className="task-list-empty-state">
                            <p>{searchQuery ? 'No tasks match your search.' : 'No tasks yet. Create your first task!'}</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={fetchTasks}
                companyUsers={companyUsers}
            />

            {selectedTask && (
                <div className="noxtm-overlay" onClick={() => setSelectedTask(null)}>
                    <div onClick={e => e.stopPropagation()}>
                        <TaskDetailPanel
                            task={selectedTask}
                            onClose={() => setSelectedTask(null)}
                            onTaskUpdated={handleTaskUpdated}
                            companyUsers={companyUsers}
                            currentUserId={currentUser?._id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskManager;
