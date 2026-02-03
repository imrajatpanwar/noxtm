const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');

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

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignee) query.assignees = assignee;
        if (search) {
            query.$text = { $search: search };
        }

        const tasks = await Task.find(query)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Task.countDocuments(query);

        res.json({
            tasks,
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
        const task = await Task.findOne({
            _id: req.params.id,
            companyId: req.companyId
        })
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage')
            .populate('activity.user', 'fullName email profileImage');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ message: 'Failed to fetch task' });
    }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
    try {
        const { title, description, status, priority, assignees, dueDate, labels } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const task = new Task({
            title: title.trim(),
            description: description || '',
            status: status || 'Todo',
            priority: priority || 'Medium',
            assignees: assignees || [],
            dueDate: dueDate || null,
            labels: labels || [],
            createdBy: req.userId,
            companyId: req.companyId,
            activity: [{
                user: req.userId,
                action: 'created',
                details: 'Task created'
            }]
        });

        await task.save();

        // Populate the task before returning
        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage');

        res.status(201).json(populatedTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Failed to create task' });
    }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
    try {
        const { title, description, priority, dueDate, labels } = req.body;

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
        if (priority && priority !== task.priority) changes.push(`priority changed to ${priority}`);

        // Update fields
        if (title) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (priority) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate;
        if (labels) task.labels = labels;

        if (changes.length > 0) {
            task.activity.push({
                user: req.userId,
                action: 'updated',
                details: changes.join(', ')
            });
        }

        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage');

        res.json(populatedTask);
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

        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage');

        res.json(populatedTask);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// PATCH /api/tasks/:id/assignees - Update task assignees
router.patch('/:id/assignees', async (req, res) => {
    try {
        const { assignees } = req.body;

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

        task.assignees = assignees;
        task.activity.push({
            user: req.userId,
            action: 'assigned',
            details: `Assignees updated`
        });

        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage');

        res.json(populatedTask);
    } catch (error) {
        console.error('Error updating assignees:', error);
        res.status(500).json({ message: 'Failed to update assignees' });
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

        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'fullName email profileImage')
            .populate('createdBy', 'fullName email profileImage')
            .populate('comments.author', 'fullName email profileImage');

        res.json(populatedTask);
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
