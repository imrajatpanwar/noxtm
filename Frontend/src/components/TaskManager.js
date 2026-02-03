import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiX, FiMessageSquare, FiClock, FiAlertCircle, FiCheck, FiMoreHorizontal, FiUser, FiCalendar, FiFlag, FiSend, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import './TaskManager.css';

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
    const colors = {
        'Todo': { bg: '#f5f5f5', color: '#616161' },
        'In Progress': { bg: '#e3f2fd', color: '#1565c0' },
        'In Review': { bg: '#f3e5f5', color: '#7b1fa2' },
        'Done': { bg: '#e8f5e9', color: '#2e7d32' }
    };
    const style = colors[status] || colors['Todo'];

    return (
        <span className="status-badge" style={{ backgroundColor: style.bg, color: style.color }}>
            {status}
        </span>
    );
};

// User avatar component
const UserAvatar = ({ user, size = 28 }) => {
    if (!user) return null;
    const initials = user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

    return (
        <div
            className="user-avatar"
            style={{ width: size, height: size, fontSize: size * 0.4 }}
            title={user.fullName}
        >
            {user.profileImage ? (
                <img src={user.profileImage} alt={user.fullName} />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
};

// Comment thread component
const CommentThread = ({ comments, taskId, onCommentAdded, currentUserId }) => {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [expandedThreads, setExpandedThreads] = useState({});

    const topLevelComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

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
                        <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            autoFocus
                        />
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
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                />
                <button type="submit" disabled={!newComment.trim()}>
                    <FiSend size={16} />
                </button>
            </form>
        </div>
    );
};

// Create Task Modal
const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, companyUsers }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [assignees, setAssignees] = useState([]);
    const [dueDate, setDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await api.post('/tasks', {
                title: title.trim(),
                description,
                priority,
                assignees,
                dueDate: dueDate || null
            });
            onTaskCreated();
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setPriority('Medium');
            setAssignees([]);
            setDueDate('');
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAssignee = (userId) => {
        setAssignees(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="create-task-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Task</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            rows={3}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Assign to</label>
                        <div className="assignee-selector">
                            {companyUsers.map(user => (
                                <div
                                    key={user._id}
                                    className={`assignee-option ${assignees.includes(user._id) ? 'selected' : ''}`}
                                    onClick={() => toggleAssignee(user._id)}
                                >
                                    <UserAvatar user={user} size={24} />
                                    <span>{user.fullName}</span>
                                    {assignees.includes(user._id) && <FiCheck size={16} />}
                                </div>
                            ))}
                            {companyUsers.length === 0 && (
                                <div className="no-users">No team members available</div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={!title.trim() || isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Task'}
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

    const handleStatusChange = async (newStatus) => {
        try {
            await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating status:', error);
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
        if (!window.confirm('Are you sure you want to delete this task?')) return;
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
            <div className="panel-header">
                <button className="close-btn" onClick={onClose}>
                    <FiX size={20} />
                </button>
                <button className="delete-btn" onClick={handleDelete}>
                    Delete
                </button>
            </div>

            <div className="panel-content">
                <div className="task-title-section">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                            autoFocus
                            className="title-input"
                        />
                    ) : (
                        <h2 onClick={() => setIsEditingTitle(true)}>{task.title}</h2>
                    )}
                </div>

                <div className="task-meta">
                    <div className="meta-item">
                        <span className="meta-label">Status</span>
                        <div className="status-selector">
                            {['Todo', 'In Progress', 'In Review', 'Done'].map(status => (
                                <button
                                    key={status}
                                    className={`status-option ${task.status === status ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(status)}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Priority</span>
                        <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Assignees</span>
                        <div className="assignees-list">
                            {task.assignees?.length > 0 ? (
                                task.assignees.map(user => (
                                    <div key={user._id} className="assignee-chip">
                                        <UserAvatar user={user} size={20} />
                                        <span>{user.fullName}</span>
                                    </div>
                                ))
                            ) : (
                                <span className="no-assignees">No assignees</span>
                            )}
                        </div>
                    </div>
                    {task.dueDate && (
                        <div className="meta-item">
                            <span className="meta-label">Due Date</span>
                            <span className="due-date">
                                <FiCalendar size={14} />
                                {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    <div className="meta-item">
                        <span className="meta-label">Created</span>
                        <span className="created-info">
                            <FiClock size={14} />
                            {formatRelativeTime(task.createdAt)} by {task.createdBy?.fullName || 'Unknown'}
                        </span>
                    </div>
                </div>

                {task.description && (
                    <div className="task-description">
                        <h4>Description</h4>
                        <p>{task.description}</p>
                    </div>
                )}

                <div className="task-comments">
                    <h4>
                        <FiMessageSquare size={16} />
                        Comments ({task.comments?.length || 0})
                    </h4>
                    <CommentThread
                        comments={task.comments || []}
                        taskId={task._id}
                        onCommentAdded={onTaskUpdated}
                        currentUserId={currentUserId}
                    />
                </div>
            </div>
        </div>
    );
};

// Task Card Component
const TaskCard = ({ task, onClick }) => {
    return (
        <div className="task-card" onClick={onClick}>
            <div className="task-card-header">
                <PriorityBadge priority={task.priority} />
                <span className="task-time">{formatRelativeTime(task.createdAt)}</span>
            </div>
            <h4 className="task-title">{task.title}</h4>
            {task.description && (
                <p className="task-description-preview">
                    {task.description.length > 80
                        ? task.description.substring(0, 80) + '...'
                        : task.description}
                </p>
            )}
            <div className="task-card-footer">
                <div className="task-assignees">
                    {task.assignees?.slice(0, 3).map((user, idx) => (
                        <UserAvatar key={user._id} user={user} size={24} />
                    ))}
                    {task.assignees?.length > 3 && (
                        <span className="more-assignees">+{task.assignees.length - 3}</span>
                    )}
                </div>
                {task.comments?.length > 0 && (
                    <span className="comment-count">
                        <FiMessageSquare size={14} />
                        {task.comments.length}
                    </span>
                )}
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

    const statuses = ['Todo', 'In Progress', 'In Review', 'Done'];

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

    const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

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
        const recentTasks = tasks.slice(0, 5);
        return (
            <div className="task-manager widget-mode">
                <div className="widget-header">
                    <h3>Task Manager</h3>
                    <button className="create-btn-sm" onClick={() => setIsCreateModalOpen(true)}>
                        <FiPlus size={16} />
                    </button>
                </div>
                <div className="widget-stats">
                    {statuses.map(status => (
                        <div key={status} className="stat-item">
                            <span className="stat-count">{stats[status]}</span>
                            <span className="stat-label">{status}</span>
                        </div>
                    ))}
                </div>
                <div className="widget-tasks">
                    {recentTasks.length === 0 ? (
                        <div className="empty-state">
                            <p>No tasks yet</p>
                            <button onClick={() => setIsCreateModalOpen(true)}>Create your first task</button>
                        </div>
                    ) : (
                        recentTasks.map(task => (
                            <div key={task._id} className="widget-task-item" onClick={() => handleTaskClick(task)}>
                                <StatusBadge status={task.status} />
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
                    <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
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

    // Full Task Manager view
    return (
        <div className="task-manager">
            <div className="task-manager-header">
                <h1>Task Manager</h1>
                <button className="create-task-btn" onClick={() => setIsCreateModalOpen(true)}>
                    <FiPlus size={18} />
                    Create Task
                </button>
            </div>

            <div className="kanban-board">
                {statuses.map(status => (
                    <div key={status} className="kanban-column">
                        <div className="column-header">
                            <h3>{status}</h3>
                            <span className="task-count">{stats[status]}</span>
                        </div>
                        <div className="column-content">
                            {getTasksByStatus(status).map(task => (
                                <TaskCard
                                    key={task._id}
                                    task={task}
                                    onClick={() => handleTaskClick(task)}
                                />
                            ))}
                            {getTasksByStatus(status).length === 0 && (
                                <div className="empty-column">No tasks</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={fetchTasks}
                companyUsers={companyUsers}
            />

            {selectedTask && (
                <div className="task-detail-overlay" onClick={() => setSelectedTask(null)}>
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
