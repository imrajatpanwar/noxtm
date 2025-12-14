import React, { useState, useEffect } from 'react';
import {
    FiSearch, FiPlus, FiFolder, FiUser, FiCalendar, FiDollarSign,
    FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiEye,
    FiCheck, FiClock, FiAlertCircle, FiSend, FiBriefcase,
    FiMail, FiPhone, FiMapPin, FiFileText, FiFlag, FiX, FiUserPlus
} from 'react-icons/fi';
import { toast } from 'sonner';
import './ProjectManagement.css';

const ProjectManagement = () => {
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        totalBudget: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [expandedProject, setExpandedProject] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [newNote, setNewNote] = useState('');

    // Client search state
    const [clients, setClients] = useState([]);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const [formData, setFormData] = useState({
        projectName: '',
        client: {
            name: '',
            companyName: '',
            email: '',
            phone: '',
            address: '',
            notes: ''
        },
        description: '',
        category: 'Other',
        status: 'Not Started',
        priority: 'Medium',
        budget: '',
        currency: 'USD',
        startDate: '',
        endDate: '',
        tags: ''
    });

    const categories = [
        'Web Development',
        'Mobile App',
        'Branding',
        'Marketing',
        'UI/UX Design',
        'Consulting',
        'E-commerce',
        'SEO',
        'Content Creation',
        'Social Media',
        'Software Development',
        'Other'
    ];

    const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

    useEffect(() => {
        fetchProjects();
        fetchStats();
        fetchClients();
    }, [statusFilter, priorityFilter]);

    // Fetch clients from Our Clients
    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/clients', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch clients');

            const data = await response.json();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem('token');
            let url = '/api/projects';
            const params = new URLSearchParams();

            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            if (searchTerm) params.append('search', searchTerm);

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch projects');

            const data = await response.json();
            setProjects(data);
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/projects/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter') {
            fetchProjects();
        }
    };

    const resetForm = () => {
        setFormData({
            projectName: '',
            client: {
                name: '',
                companyName: '',
                email: '',
                phone: '',
                address: '',
                notes: ''
            },
            description: '',
            category: 'Other',
            status: 'Not Started',
            priority: 'Medium',
            budget: '',
            currency: 'USD',
            startDate: '',
            endDate: '',
            tags: ''
        });
        setEditingProject(null);
    };

    const openAddModal = () => {
        resetForm();
        setSelectedClient(null);
        setClientSearchTerm('');
        setShowClientDropdown(false);
        setShowAddModal(true);
    };

    const openEditModal = (project) => {
        setEditingProject(project);
        setSelectedClient(project.client?.clientId ? { _id: project.client.clientId } : null);
        setClientSearchTerm('');
        setShowClientDropdown(false);
        setFormData({
            projectName: project.projectName,
            client: {
                clientId: project.client?.clientId || null,
                name: project.client?.name || '',
                companyName: project.client?.companyName || '',
                email: project.client?.email || '',
                phone: project.client?.phone || '',
                address: project.client?.address || '',
                notes: project.client?.notes || ''
            },
            description: project.description || '',
            category: project.category || 'Other',
            status: project.status || 'Not Started',
            priority: project.priority || 'Medium',
            budget: project.budget?.toString() || '',
            currency: project.currency || 'USD',
            startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
            tags: project.tags?.join(', ') || ''
        });
        setShowAddModal(true);
    };

    // Handle client selection from dropdown
    const handleClientSelect = (client) => {
        setSelectedClient(client);
        setClientSearchTerm('');
        setShowClientDropdown(false);
        setFormData({
            ...formData,
            client: {
                clientId: client._id,
                name: client.clientName,
                companyName: client.companyName || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.location || '',
                notes: ''
            }
        });
    };

    // Clear selected client
    const handleClearClient = () => {
        setSelectedClient(null);
        setFormData({
            ...formData,
            client: {
                clientId: null,
                name: '',
                companyName: '',
                email: '',
                phone: '',
                address: '',
                notes: ''
            }
        });
    };

    // Filter clients based on search
    const filteredClients = clients.filter(client => {
        const search = clientSearchTerm.toLowerCase();
        return (
            client.clientName?.toLowerCase().includes(search) ||
            client.companyName?.toLowerCase().includes(search) ||
            client.email?.toLowerCase().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            const url = editingProject
                ? `/api/projects/${editingProject._id}`
                : '/api/projects';

            const method = editingProject ? 'PUT' : 'POST';

            const projectData = {
                ...formData,
                budget: formData.budget ? parseFloat(formData.budget) : 0,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });

            if (!response.ok) throw new Error('Failed to save project');

            const savedProject = await response.json();

            if (editingProject) {
                setProjects(projects.map(p => p._id === savedProject._id ? savedProject : p));
                toast.success('Project updated successfully');
            } else {
                setProjects([savedProject, ...projects]);
                toast.success('Project created successfully');
            }

            setShowAddModal(false);
            resetForm();
            fetchStats();
        } catch (error) {
            console.error('Error saving project:', error);
            toast.error('Failed to save project');
        }
    };

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete project');

            setProjects(projects.filter(p => p._id !== projectId));
            toast.success('Project deleted successfully');
            fetchStats();
        } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Failed to delete project');
        }
    };

    const handleAddNote = async (projectId) => {
        if (!newNote.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/projects/${projectId}/notes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: newNote })
            });

            if (!response.ok) throw new Error('Failed to add note');

            const note = await response.json();

            setProjects(projects.map(p => {
                if (p._id === projectId) {
                    return { ...p, notes: [...(p.notes || []), note] };
                }
                return p;
            }));

            setNewNote('');
            toast.success('Note added');
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Failed to add note');
        }
    };

    const handleMilestoneStatusChange = async (projectId, milestoneId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update milestone');

            // Refresh project data
            fetchProjects();
            toast.success('Milestone updated');
        } catch (error) {
            console.error('Error updating milestone:', error);
            toast.error('Failed to update milestone');
        }
    };

    const toggleProject = (projectId) => {
        setExpandedProject(expandedProject === projectId ? null : projectId);
        setActiveTab('details');
    };

    const formatCurrency = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        const statusMap = {
            'Not Started': 'not-started',
            'In Progress': 'in-progress',
            'On Hold': 'on-hold',
            'Completed': 'completed',
            'Cancelled': 'cancelled'
        };
        return statusMap[status] || 'not-started';
    };

    const isProjectOverdue = (project) => {
        if (project.status === 'Completed' || project.status === 'Cancelled') return false;
        if (!project.endDate) return false;
        return new Date() > new Date(project.endDate);
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch =
            project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="pm-container">
                <div className="pm-loading">
                    <div className="pm-spinner"></div>
                    <p>Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pm-container">
            {/* Header */}
            <div className="pm-header">
                <div className="pm-title-section">
                    <h1 className="pm-title">Project Management</h1>
                    <p className="pm-subtitle">Manage your projects and track client work</p>
                </div>
                <button className="pm-add-btn" onClick={openAddModal}>
                    <FiPlus /> New Project
                </button>
            </div>

            {/* Stats */}
            <div className="pm-stats-grid">
                <div className="pm-stat-card total">
                    <div className="pm-stat-label">Total Projects</div>
                    <div className="pm-stat-value">{stats.total}</div>
                </div>
                <div className="pm-stat-card active">
                    <div className="pm-stat-label">In Progress</div>
                    <div className="pm-stat-value">{stats.inProgress}</div>
                </div>
                <div className="pm-stat-card completed">
                    <div className="pm-stat-label">Completed</div>
                    <div className="pm-stat-value">{stats.completed}</div>
                </div>
                <div className="pm-stat-card overdue">
                    <div className="pm-stat-label">Overdue</div>
                    <div className="pm-stat-value">{stats.overdue}</div>
                </div>
                <div className="pm-stat-card">
                    <div className="pm-stat-label">Total Budget</div>
                    <div className="pm-stat-value">{formatCurrency(stats.totalBudget)}</div>
                </div>
            </div>

            {/* Controls */}
            <div className="pm-controls">
                <div className="pm-search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search projects, clients..."
                        value={searchTerm}
                        onChange={handleSearch}
                        onKeyDown={handleSearchSubmit}
                    />
                </div>
                <select
                    className="pm-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <select
                    className="pm-filter-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                >
                    <option value="">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                </select>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <div className="pm-empty-state">
                    <FiFolder size={64} />
                    <h3>No Projects Found</h3>
                    <p>Create your first project to get started</p>
                    <button className="pm-add-btn" onClick={openAddModal}>
                        <FiPlus /> New Project
                    </button>
                </div>
            ) : (
                <div className="pm-projects-grid">
                    {filteredProjects.map(project => (
                        <div key={project._id} className="pm-project-card">
                            <div className="pm-project-header" onClick={() => toggleProject(project._id)}>
                                <div className="pm-project-top">
                                    <div>
                                        <h3 className="pm-project-name">{project.projectName}</h3>
                                        <div className="pm-client-name">
                                            <FiUser size={14} />
                                            {project.client?.name}
                                            {project.client?.companyName && ` - ${project.client.companyName}`}
                                        </div>
                                    </div>
                                    <span className={`pm-status-badge ${getStatusClass(project.status)}`}>
                                        {project.status}
                                    </span>
                                </div>

                                <div className="pm-project-meta">
                                    <div className="pm-meta-item">
                                        <span className="pm-category-badge">{project.category}</span>
                                    </div>
                                    <div className="pm-meta-item">
                                        <FiCalendar size={14} />
                                        {formatDate(project.endDate)}
                                        {isProjectOverdue(project) && (
                                            <span className="pm-overdue-indicator">
                                                <FiAlertCircle size={12} /> Overdue
                                            </span>
                                        )}
                                    </div>
                                    <div className="pm-meta-item">
                                        <FiDollarSign size={14} />
                                        {formatCurrency(project.budget, project.currency)}
                                    </div>
                                </div>

                                <div className="pm-progress-section">
                                    <div className="pm-progress-header">
                                        <span className="pm-progress-label">Progress</span>
                                        <span className="pm-progress-value">{project.progress || 0}%</span>
                                    </div>
                                    <div className="pm-progress-bar">
                                        <div
                                            className="pm-progress-fill"
                                            style={{ width: `${project.progress || 0}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="pm-project-actions">
                                    <span className={`pm-priority-badge ${project.priority?.toLowerCase()}`}>
                                        <FiFlag size={10} /> {project.priority}
                                    </span>
                                    <div className="pm-action-btns">
                                        <button className="pm-action-btn view" onClick={(e) => {
                                            e.stopPropagation();
                                            toggleProject(project._id);
                                        }}>
                                            {expandedProject === project._id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                        </button>
                                        <button className="pm-action-btn edit" onClick={(e) => {
                                            e.stopPropagation();
                                            openEditModal(project);
                                        }}>
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button className="pm-action-btn delete" onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(project._id);
                                        }}>
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedProject === project._id && (
                                <div className="pm-project-details">
                                    <div className="pm-details-tabs">
                                        <button
                                            className={`pm-details-tab ${activeTab === 'details' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('details')}
                                        >
                                            <FiBriefcase size={14} /> Client Details
                                        </button>
                                        <button
                                            className={`pm-details-tab ${activeTab === 'milestones' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('milestones')}
                                        >
                                            <FiCheck size={14} /> Milestones ({project.milestones?.length || 0})
                                        </button>
                                        <button
                                            className={`pm-details-tab ${activeTab === 'notes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('notes')}
                                        >
                                            <FiFileText size={14} /> Notes ({project.notes?.length || 0})
                                        </button>
                                    </div>

                                    <div className="pm-tab-content">
                                        {/* Client Details Tab */}
                                        {activeTab === 'details' && (
                                            <div className="pm-client-grid">
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label">Client Name</div>
                                                    <div className="pm-detail-value">{project.client?.name || 'N/A'}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label">Company</div>
                                                    <div className="pm-detail-value">{project.client?.companyName || 'N/A'}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label"><FiMail size={12} /> Email</div>
                                                    <div className="pm-detail-value">{project.client?.email || 'N/A'}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label"><FiPhone size={12} /> Phone</div>
                                                    <div className="pm-detail-value">{project.client?.phone || 'N/A'}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label"><FiMapPin size={12} /> Address</div>
                                                    <div className="pm-detail-value">{project.client?.address || 'N/A'}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label">Start Date</div>
                                                    <div className="pm-detail-value">{formatDate(project.startDate)}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label">End Date</div>
                                                    <div className="pm-detail-value">{formatDate(project.endDate)}</div>
                                                </div>
                                                <div className="pm-detail-item">
                                                    <div className="pm-detail-label">Budget</div>
                                                    <div className="pm-detail-value">{formatCurrency(project.budget, project.currency)}</div>
                                                </div>
                                                {project.description && (
                                                    <div className="pm-detail-item" style={{ gridColumn: '1 / -1' }}>
                                                        <div className="pm-detail-label">Description</div>
                                                        <div className="pm-detail-value">{project.description}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Milestones Tab */}
                                        {activeTab === 'milestones' && (
                                            <div className="pm-milestones-list">
                                                {project.milestones?.length === 0 ? (
                                                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                                                        No milestones yet
                                                    </p>
                                                ) : (
                                                    project.milestones?.map(milestone => (
                                                        <div key={milestone._id} className="pm-milestone-item">
                                                            <div
                                                                className={`pm-milestone-checkbox ${milestone.status.toLowerCase().replace(' ', '-')}`}
                                                                onClick={() => handleMilestoneStatusChange(
                                                                    project._id,
                                                                    milestone._id,
                                                                    milestone.status === 'Completed' ? 'Pending' : 'Completed'
                                                                )}
                                                            >
                                                                {milestone.status === 'Completed' && <FiCheck size={14} />}
                                                                {milestone.status === 'In Progress' && <FiClock size={12} />}
                                                            </div>
                                                            <div className="pm-milestone-info">
                                                                <div className="pm-milestone-title">{milestone.title}</div>
                                                                {milestone.dueDate && (
                                                                    <div className="pm-milestone-date">
                                                                        Due: {formatDate(milestone.dueDate)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* Notes Tab */}
                                        {activeTab === 'notes' && (
                                            <>
                                                <div className="pm-notes-list">
                                                    {project.notes?.length === 0 ? (
                                                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                                                            No notes yet
                                                        </p>
                                                    ) : (
                                                        project.notes?.map(note => (
                                                            <div key={note._id} className="pm-note-item">
                                                                <div className="pm-note-header">
                                                                    <span className="pm-note-author">{note.author}</span>
                                                                    <span className="pm-note-time">{formatDate(note.createdAt)}</span>
                                                                </div>
                                                                <div className="pm-note-text">{note.text}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                <div className="pm-add-note">
                                                    <input
                                                        type="text"
                                                        placeholder="Add a note..."
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleAddNote(project._id)}
                                                    />
                                                    <button onClick={() => handleAddNote(project._id)}>
                                                        <FiSend size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="pm-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pm-modal-header">
                            <h2>{editingProject ? 'Edit Project' : 'New Project'}</h2>
                            <button className="pm-modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="pm-modal-content">
                                {/* Project Details Section */}
                                <div className="pm-form-section">
                                    <div className="pm-form-section-title">
                                        <FiFolder size={16} /> Project Details
                                    </div>
                                    <div className="pm-form-grid">
                                        <div className="pm-form-group full-width">
                                            <label>Project Name <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.projectName}
                                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                                placeholder="Enter project name"
                                            />
                                        </div>
                                        <div className="pm-form-group full-width">
                                            <label>Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Project description..."
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="Not Started">Not Started</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Priority</label>
                                            <select
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Budget</label>
                                            <input
                                                type="number"
                                                value={formData.budget}
                                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Currency</label>
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            >
                                                {currencies.map(curr => (
                                                    <option key={curr} value={curr}>{curr}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Start Date</label>
                                            <input
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>End Date</label>
                                            <input
                                                type="date"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Client Information Section */}
                                <div className="pm-form-section">
                                    <div className="pm-form-section-title">
                                        <FiUser size={16} /> Client Information
                                    </div>

                                    {/* Client Search/Selection */}
                                    <div className="pm-client-selector">
                                        {selectedClient ? (
                                            <div className="pm-selected-client">
                                                <div className="pm-selected-client-info">
                                                    <FiUser size={18} />
                                                    <div className="pm-selected-client-details">
                                                        <span className="pm-selected-client-name">{formData.client.name}</span>
                                                        <span className="pm-selected-client-company">{formData.client.companyName}</span>
                                                    </div>
                                                </div>
                                                <button type="button" className="pm-clear-client-btn" onClick={handleClearClient}>
                                                    <FiX size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="pm-client-search-container">
                                                <div className="pm-client-search-input">
                                                    <FiSearch size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search existing clients from Our Clients..."
                                                        value={clientSearchTerm}
                                                        onChange={(e) => {
                                                            setClientSearchTerm(e.target.value);
                                                            setShowClientDropdown(true);
                                                        }}
                                                        onFocus={() => setShowClientDropdown(true)}
                                                    />
                                                </div>

                                                {showClientDropdown && (
                                                    <div className="pm-client-dropdown">
                                                        {filteredClients.length > 0 ? (
                                                            <>
                                                                <div className="pm-client-dropdown-header">
                                                                    Select from Our Clients ({filteredClients.length})
                                                                </div>
                                                                {filteredClients.slice(0, 5).map(client => (
                                                                    <div
                                                                        key={client._id}
                                                                        className="pm-client-dropdown-item"
                                                                        onClick={() => handleClientSelect(client)}
                                                                    >
                                                                        <div className="pm-client-dropdown-name">
                                                                            <FiUser size={14} />
                                                                            {client.clientName}
                                                                        </div>
                                                                        <div className="pm-client-dropdown-meta">
                                                                            {client.companyName && <span>{client.companyName}</span>}
                                                                            {client.email && <span>• {client.email}</span>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <div className="pm-client-dropdown-empty">
                                                                <FiUserPlus size={20} />
                                                                <p>No clients found</p>
                                                                <span>Enter client details manually below</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="pm-client-dropdown-close"
                                                            onClick={() => setShowClientDropdown(false)}
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pm-form-divider">
                                        <span>or enter client details manually</span>
                                    </div>

                                    <div className="pm-form-grid">
                                        <div className="pm-form-group">
                                            <label>Client Name <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.client.name}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, name: e.target.value, clientId: null }
                                                })}
                                                placeholder="Client name"
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Company Name</label>
                                            <input
                                                type="text"
                                                value={formData.client.companyName}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, companyName: e.target.value }
                                                })}
                                                placeholder="Company name"
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                value={formData.client.email}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, email: e.target.value }
                                                })}
                                                placeholder="client@example.com"
                                            />
                                        </div>
                                        <div className="pm-form-group">
                                            <label>Phone</label>
                                            <input
                                                type="tel"
                                                value={formData.client.phone}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, phone: e.target.value }
                                                })}
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>
                                        <div className="pm-form-group full-width">
                                            <label>Address</label>
                                            <input
                                                type="text"
                                                value={formData.client.address}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, address: e.target.value }
                                                })}
                                                placeholder="Full address"
                                            />
                                        </div>
                                        <div className="pm-form-group full-width">
                                            <label>Client Notes</label>
                                            <textarea
                                                value={formData.client.notes}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    client: { ...formData.client, notes: e.target.value }
                                                })}
                                                placeholder="Additional notes about the client..."
                                                style={{ minHeight: '80px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pm-modal-actions">
                                <button type="button" className="pm-btn-cancel" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="pm-btn-submit">
                                    {editingProject ? 'Update Project' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectManagement;
