const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const CompanyData = require('../models/CompanyData');
const socketStore = require('../utils/socketStore');

// Emit task:updated to all company members so their UI refreshes in real-time
function emitTaskUpdate(companyId) {
  if (!companyId) return;
  const io = socketStore.getIo();
  if (io) io.to(`company:${companyId.toString()}`).emit('task:updated');
}

const VALID_TASK_TYPES = ['One Time', 'Daily', 'Calendar', 'Recurring', 'Milestone', 'Sprint'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const VALID_SOURCES = ['Manual', 'Data Center', 'Calendar', 'CRM', 'HR'];
const VALID_RECURRENCES = ['daily', 'weekly', 'monthly', null];
const VALID_ASSIGNMENT_RESPONSES = ['accepted', 'rejected'];
const DATA_CENTER_SOURCE = 'Data Center';

const normalizeTarget = (value, fallback = 100) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
};

const normalizeObjectIdArray = (values = []) => {
    if (!Array.isArray(values)) return [];
    return [...new Set(values
        .map(id => id?._id || id)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => id.toString()))];
};

const sameId = (left, right) => (left?.toString?.() || left?.toString()) === (right?.toString?.() || right?.toString());

const createAssignmentRequests = (assigneeIds, requestedBy, requestComment = '') => (
    normalizeObjectIdArray(assigneeIds)
        .filter(userId => !sameId(userId, requestedBy))
        .map(userId => ({
            user: userId,
            requestedBy,
            status: 'pending',
            requestComment,
            requestedAt: new Date()
        }))
);

const getAcceptedAssignees = (assigneeIds, requestedBy) => (
    normalizeObjectIdArray(assigneeIds).filter(userId => sameId(userId, requestedBy))
);

const populateTaskQuery = (query) => query
    .populate('assignees', 'fullName email profileImage')
    .populate('createdBy', 'fullName email profileImage')
    .populate('comments.author', 'fullName email profileImage')
    .populate('activity.user', 'fullName email profileImage')
    .populate('dailyProgress.user', 'fullName email profileImage')
    .populate('activeUsers', 'fullName email profileImage')
    .populate('assignmentRequests.user', 'fullName email profileImage')
    .populate('assignmentRequests.requestedBy', 'fullName email profileImage');

const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
};

const getAssigneeIds = (task) => {
    const assignees = task.assignees || [];
    return assignees
        .map(assignee => assignee?._id || assignee)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => id.toString());
};

const hasDataCenterSource = (task) => (
    task.source === DATA_CENTER_SOURCE ||
    (Array.isArray(task.labels) && task.labels.includes(DATA_CENTER_SOURCE))
);

const shouldUseDataCenterProgress = (task) => (
    hasDataCenterSource(task) &&
    (
        task.taskType === 'Daily' ||
        Number(task.target) > 0 ||
        (Array.isArray(task.labels) && task.labels.includes(DATA_CENTER_SOURCE))
    )
);

const hydrateDataCenterProgress = async (tasks, companyId) => {
    const taskList = Array.isArray(tasks) ? tasks : [tasks];
    const plainTasks = taskList.map(task => (
        typeof task.toObject === 'function' ? task.toObject({ virtuals: true }) : task
    ));

    const dataCenterTasks = plainTasks.filter(shouldUseDataCenterProgress);
    if (dataCenterTasks.length === 0) return Array.isArray(tasks) ? plainTasks : plainTasks[0];

    const assigneeIds = [...new Set(dataCenterTasks.flatMap(getAssigneeIds))];
    if (assigneeIds.length === 0) return Array.isArray(tasks) ? plainTasks : plainTasks[0];

    const { start, end } = getTodayRange();
    const counts = await CompanyData.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                createdBy: { $in: assigneeIds.map(id => new mongoose.Types.ObjectId(id)) },
                createdAt: { $gte: start, $lt: end }
            }
        },
        {
            $group: {
                _id: '$createdBy',
                count: { $sum: 1 }
            }
        }
    ]);

    const countsByUser = counts.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
    }, {});

    plainTasks.forEach(task => {
        if (!shouldUseDataCenterProgress(task)) return;

        const todayProgress = getAssigneeIds(task).reduce(
            (sum, userId) => sum + (countsByUser[userId] || 0),
            0
        );
        const target = Number(task.target) > 0 ? Number(task.target) : 100;

        task.todayProgress = todayProgress;
        task.progressTarget = target;
        task.progressPercent = Math.min(100, Math.round((todayProgress / target) * 100));
        task.progressSource = DATA_CENTER_SOURCE;
        task.dataCenterAddedToday = todayProgress;
        task.dataCenterProgressByUser = (task.assignees || [])
            .map(assignee => {
                const userId = (assignee?._id || assignee)?.toString();
                return {
                    user: assignee,
                    count: countsByUser[userId] || 0
                };
            })
            .filter(progress => progress.count > 0);
    });

    return Array.isArray(tasks) ? plainTasks : plainTasks[0];
};

// JWT authentication middleware (same as used in other routes)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        token = req.cookies?.auth_token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to ensure company access
const requireCompanyAccess = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.companyId) {
            return res.status(403).json({ message: 'No company associated with this user' });
        }
        req.companyId = user.companyId;
        req.userId = user._id;
        req.currentUser = user;
        next();
    } catch (error) {
        console.error('Company access check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireCompanyAccess);

// GET /api/tasks - List all tasks for company
router.get('/', async (req, res) => {
    try {
        const { status, priority, assignee, search, page = 1, limit = 50 } = req.query;

        const query = { companyId: req.companyId };

        // Non-admin/non-owner users should only see tasks assigned to them or created by them
        const userRole = req.currentUser.role;
        if (userRole !== 'Admin') {
            // Check if user is an Owner in their company
            const Company = require('../models/Company');
            const company = await Company.findById(req.companyId);
            const member = company?.members?.find(m => m.user.toString() === req.userId.toString());
            const isOwner = member && member.roleInCompany === 'Owner';

            if (!isOwner) {
                query.$or = [
                    { assignees: req.userId },
                    { createdBy: req.userId },
                    { 'assignmentRequests.user': req.userId }
                ];
            }
        }

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignee) query.assignees = assignee;
        if (search) {
            query.$text = { $search: search };
        }

        const tasks = await populateTaskQuery(
            Task.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
        );

        const total = await Task.countDocuments(query);

        const hydratedTasks = await hydrateDataCenterProgress(tasks, req.companyId);

        res.json({
            tasks: hydratedTasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Failed to fetch tasks' });
    }
});

// GET /api/tasks/:id - Get single task with comments
router.get('/:id', async (req, res) => {
    try {
        const task = await populateTaskQuery(Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        }));

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const hydratedTask = await hydrateDataCenterProgress(task, req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ message: 'Failed to fetch task' });
    }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
    try {
        const { title, description, status, priority, taskType, assignees, dueDate, labels, target, calendarDate, recurrence, source, requestComment } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const normalizedLabels = Array.isArray(labels) ? labels : [];
        const normalizedTaskType = VALID_TASK_TYPES.includes(taskType) ? taskType : 'One Time';
        const normalizedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
        const normalizedSource = VALID_SOURCES.includes(source)
            ? source
            : normalizedLabels.includes(DATA_CENTER_SOURCE) ? DATA_CENTER_SOURCE : 'Manual';
        const normalizedRecurrence = VALID_RECURRENCES.includes(recurrence) ? recurrence : null;
        const normalizedTarget = (normalizedTaskType === 'Daily' || normalizedSource === DATA_CENTER_SOURCE)
            ? normalizeTarget(target)
            : null;
        const normalizedAssignees = normalizeObjectIdArray(assignees);
        const pendingRequests = createAssignmentRequests(normalizedAssignees, req.userId, requestComment);
        const acceptedAssignees = getAcceptedAssignees(normalizedAssignees, req.userId);

        const task = new Task({
            title: title.trim(),
            description: description || '',
            status: status || 'Todo',
            priority: normalizedPriority,
            taskType: normalizedTaskType,
            assignees: acceptedAssignees,
            assignmentRequests: pendingRequests,
            dueDate: dueDate || null,
            labels: normalizedLabels,
            target: normalizedTarget,
            calendarDate: calendarDate || null,
            recurrence: normalizedRecurrence,
            source: normalizedSource,
            createdBy: req.userId,
            companyId: req.companyId,
            activity: [{
                user: req.userId,
                action: 'created',
                details: 'Task created'
            }, ...(
                pendingRequests.length > 0
                    ? [{
                        user: req.userId,
                        action: 'assignment_requested',
                        details: `${pendingRequests.length} assignment request${pendingRequests.length === 1 ? '' : 's'} sent`
                    }]
                    : []
            )]
        });

        await task.save();

        // Populate the task before returning
        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.status(201).json(hydratedTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Failed to create task' });
    }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
    try {
        const { title, description, priority, dueDate, labels, assignees, taskType, target, calendarDate, recurrence, source, requestComment } = req.body;

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Track changes for activity log
        const changes = [];
        if (title && title !== task.title) changes.push(`title changed to "${title}"`);
        if (priority && VALID_PRIORITIES.includes(priority) && priority !== task.priority) changes.push(`priority changed to ${priority}`);

        // Update fields
        if (title) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (priority && VALID_PRIORITIES.includes(priority)) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate;
        if (Array.isArray(labels)) task.labels = labels;
        if (assignees) {
            const requestedAssignees = normalizeObjectIdArray(assignees);
            const acceptedNow = getAcceptedAssignees(requestedAssignees, req.userId);
            const existingAccepted = (task.assignmentRequests || [])
                .filter(request => request.status === 'accepted')
                .map(request => request.user.toString());
            const existingRequests = new Set((task.assignmentRequests || [])
                .filter(request => request.status !== 'rejected')
                .map(request => request.user.toString()));
            const newRequests = createAssignmentRequests(
                requestedAssignees.filter(userId => !existingRequests.has(userId)),
                req.userId,
                requestComment
            );

            task.assignees = [...new Set([...acceptedNow, ...existingAccepted])]
                .filter(userId => requestedAssignees.includes(userId));
            task.assignmentRequests.push(...newRequests);
            if (newRequests.length > 0) {
                changes.push(`${newRequests.length} assignment request${newRequests.length === 1 ? '' : 's'} sent`);
            }
        }
        if (taskType && VALID_TASK_TYPES.includes(taskType)) {
            task.taskType = taskType;
            if (task.taskType !== 'Daily') task.target = null;
            if (task.taskType === 'Daily' && target === undefined && !task.target) task.target = 100;
        }
        if (calendarDate !== undefined) task.calendarDate = calendarDate;
        if (recurrence !== undefined && VALID_RECURRENCES.includes(recurrence)) task.recurrence = recurrence;
        if (source && VALID_SOURCES.includes(source)) task.source = source;
        if (target !== undefined) {
            const taskUsesTarget = task.taskType === 'Daily' || hasDataCenterSource(task);
            task.target = taskUsesTarget ? normalizeTarget(target) : null;
        }

        if (changes.length > 0) {
            task.activity.push({
                user: req.userId,
                action: 'updated',
                details: changes.join(', ')
            });
        }

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Failed to update task' });
    }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Todo', 'In Progress', 'In Review', 'Done'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const oldStatus = task.status;
        task.status = status;
        task.activity.push({
            user: req.userId,
            action: 'status_changed',
            details: `Status changed from ${oldStatus} to ${status}`
        });

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// PATCH /api/tasks/:id/assignees - Update task assignees
router.patch('/:id/assignees', async (req, res) => {
    try {
        const { assignees, requestComment } = req.body;

        if (!Array.isArray(assignees)) {
            return res.status(400).json({ message: 'Assignees must be an array' });
        }

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const requestedAssignees = normalizeObjectIdArray(assignees);
        const existingAccepted = (task.assignmentRequests || [])
            .filter(request => request.status === 'accepted')
            .map(request => request.user.toString());
        const existingRequests = new Set((task.assignmentRequests || [])
            .filter(request => request.status !== 'rejected')
            .map(request => request.user.toString()));
        const newRequests = createAssignmentRequests(
            requestedAssignees.filter(userId => !existingRequests.has(userId)),
            req.userId,
            requestComment
        );

        task.assignees = [...new Set([
            ...getAcceptedAssignees(requestedAssignees, req.userId),
            ...existingAccepted
        ])].filter(userId => requestedAssignees.includes(userId));
        task.assignmentRequests.push(...newRequests);
        task.activity.push({
            user: req.userId,
            action: newRequests.length > 0 ? 'assignment_requested' : 'assigned',
            details: newRequests.length > 0
                ? `${newRequests.length} assignment request${newRequests.length === 1 ? '' : 's'} sent`
                : 'Assignees updated'
        });

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error updating assignees:', error);
        res.status(500).json({ message: 'Failed to update assignees' });
    }
});

// PATCH /api/tasks/:id/assignment-response - Accept or reject a task request
router.patch('/:id/assignment-response', async (req, res) => {
    try {
        const { status, comment = '' } = req.body;

        if (!VALID_ASSIGNMENT_RESPONSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid assignment response' });
        }

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) return res.status(404).json({ message: 'Task not found' });

        const request = (task.assignmentRequests || []).find(item => (
            item.status === 'pending' && sameId(item.user, req.userId)
        ));

        if (!request) {
            return res.status(404).json({ message: 'Pending assignment request not found' });
        }

        request.status = status;
        request.responseComment = comment.trim();
        request.respondedAt = new Date();

        if (status === 'accepted') {
            const alreadyAssigned = task.assignees.some(userId => sameId(userId, req.userId));
            if (!alreadyAssigned) task.assignees.push(req.userId);
            task.activity.push({
                user: req.userId,
                action: 'assignment_accepted',
                details: 'Assignment request accepted'
            });
        } else {
            task.activity.push({
                user: req.userId,
                action: 'assignment_rejected',
                details: comment.trim() ? `Assignment rejected: ${comment.trim()}` : 'Assignment request rejected'
            });
        }

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));
        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error responding to assignment request:', error);
        res.status(500).json({ message: 'Failed to respond to assignment request' });
    }
});

// PATCH /api/tasks/:id/daily-progress - Update daily task progress for current user
router.patch('/:id/daily-progress', async (req, res) => {
    try {
        const { count } = req.body;
        const normalizedCount = Math.max(0, normalizeTarget(count, 0));
        const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Find or create today's progress entry for this user
        const entryIdx = task.dailyProgress.findIndex(
            p => p.user.toString() === req.userId.toString() && p.date === today
        );

        if (entryIdx >= 0) {
            task.dailyProgress[entryIdx].count = normalizedCount;
        } else {
            task.dailyProgress.push({ user: req.userId, count: normalizedCount, date: today });
        }

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error updating daily progress:', error);
        res.status(500).json({ message: 'Failed to update daily progress' });
    }
});

// PATCH /api/tasks/:id/active - Toggle current user's active status on a task
router.patch('/:id/active', async (req, res) => {
    try {
        const { isActive } = req.body; // boolean

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) return res.status(404).json({ message: 'Task not found' });

        const uid = req.userId.toString();
        const already = task.activeUsers.some(u => u.toString() === uid);

        if (isActive && !already) {
            task.activeUsers.push(req.userId);
        } else if (!isActive && already) {
            task.activeUsers = task.activeUsers.filter(u => u.toString() !== uid);
        }

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error toggling active user:', error);
        res.status(500).json({ message: 'Failed to update active status' });
    }
});

// POST /api/tasks/:id/comments - Add comment (supports threading)
router.post('/:id/comments', async (req, res) => {
    try {
        const { content, parentId } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Validate parentId if provided
        if (parentId) {
            const parentComment = task.comments.id(parentId);
            if (!parentComment) {
                return res.status(400).json({ message: 'Parent comment not found' });
            }
        }

        const comment = {
            author: req.userId,
            content: content.trim(),
            parentId: parentId || null,
            createdAt: new Date()
        };

        task.comments.push(comment);
        task.activity.push({
            user: req.userId,
            action: 'commented',
            details: 'Added a comment'
        });

        await task.save();

        const populatedTask = await populateTaskQuery(Task.findById(task._id));

        const hydratedTask = await hydrateDataCenterProgress(populatedTask, req.companyId);

        emitTaskUpdate(req.companyId);
        res.json(hydratedTask);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        emitTaskUpdate(task.companyId);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Failed to delete task' });
    }
});

// GET /api/tasks/stats/overview - Get task statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Task.aggregate([
            { $match: { companyId: new mongoose.Types.ObjectId(req.companyId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsByStatus = {
            'Todo': 0,
            'In Progress': 0,
            'In Review': 0,
            'Done': 0
        };

        stats.forEach(s => {
            statsByStatus[s._id] = s.count;
        });

        const total = Object.values(statsByStatus).reduce((a, b) => a + b, 0);

        res.json({
            total,
            byStatus: statsByStatus
        });
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(500).json({ message: 'Failed to fetch statistics' });
    }
});

module.exports = router;
