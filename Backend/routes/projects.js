const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;
const Project = require('../models/Project');

// Get all projects (with optional filters)
router.get('/', auth, async (req, res) => {
    try {
        const { status, priority, category, search } = req.query;

        const filter = { userId: req.user.userId };

        // Add company filter if user belongs to a company
        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
            delete filter.userId;
        }

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;

        if (search) {
            filter.$text = { $search: search };
        }

        const projects = await Project.find(filter)
            .sort({ createdAt: -1 })
            .populate('team', 'fullName email')
            .lean();

        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
});

// Get project statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const filter = { userId: req.user.userId };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
            delete filter.userId;
        }

        const [total, notStarted, inProgress, onHold, completed, cancelled] = await Promise.all([
            Project.countDocuments(filter),
            Project.countDocuments({ ...filter, status: 'Not Started' }),
            Project.countDocuments({ ...filter, status: 'In Progress' }),
            Project.countDocuments({ ...filter, status: 'On Hold' }),
            Project.countDocuments({ ...filter, status: 'Completed' }),
            Project.countDocuments({ ...filter, status: 'Cancelled' })
        ]);

        // Calculate overdue projects
        const overdueProjects = await Project.countDocuments({
            ...filter,
            status: { $nin: ['Completed', 'Cancelled'] },
            endDate: { $lt: new Date() }
        });

        // Calculate total budget (only for active projects)
        const budgetAgg = await Project.aggregate([
            { $match: { ...filter, status: { $nin: ['Cancelled'] } } },
            { $group: { _id: null, totalBudget: { $sum: '$budget' } } }
        ]);

        const totalBudget = budgetAgg.length > 0 ? budgetAgg[0].totalBudget : 0;

        res.json({
            total,
            notStarted,
            inProgress,
            onHold,
            completed,
            cancelled,
            overdue: overdueProjects,
            totalBudget
        });
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({ message: 'Error fetching project statistics', error: error.message });
    }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOne(filter)
            .populate('team', 'fullName email')
            .populate('client.clientId', 'companyName clientName email phone');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Error fetching project', error: error.message });
    }
});

// Create new project
router.post('/', auth, async (req, res) => {
    try {
        const {
            projectName,
            client,
            description,
            category,
            status,
            priority,
            budget,
            currency,
            startDate,
            endDate,
            team,
            tags
        } = req.body;

        // Validate required fields
        if (!projectName || !client || !client.name) {
            return res.status(400).json({ message: 'Project name and client name are required' });
        }

        const newProject = new Project({
            projectName,
            client,
            description: description || '',
            category: category || 'Other',
            status: status || 'Not Started',
            priority: priority || 'Medium',
            budget: budget || 0,
            currency: currency || 'USD',
            startDate,
            endDate,
            team: team || [],
            tags: tags || [],
            progress: 0,
            milestones: [],
            deliverables: [],
            notes: [],
            userId: req.user.userId,
            companyId: req.user.companyId || null
        });

        await newProject.save();

        const populated = await Project.findById(newProject._id)
            .populate('team', 'fullName email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Error creating project', error: error.message });
    }
});

// Update project
router.put('/:id', auth, async (req, res) => {
    try {
        const {
            projectName,
            client,
            description,
            category,
            status,
            priority,
            budget,
            currency,
            startDate,
            endDate,
            progress,
            team,
            tags
        } = req.body;

        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const updateData = {
            projectName,
            client,
            description,
            category,
            status,
            priority,
            budget,
            currency,
            startDate,
            endDate,
            progress,
            team,
            tags
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const project = await Project.findOneAndUpdate(
            filter,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('team', 'fullName email');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Error updating project', error: error.message });
    }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndDelete(filter);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
});

// Update project progress
router.patch('/:id/progress', auth, async (req, res) => {
    try {
        const { progress } = req.body;

        if (progress === undefined || progress < 0 || progress > 100) {
            return res.status(400).json({ message: 'Progress must be between 0 and 100' });
        }

        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $set: { progress } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
});

// Add milestone
router.post('/:id/milestones', auth, async (req, res) => {
    try {
        const { title, description, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Milestone title is required' });
        }

        const milestone = {
            title,
            description: description || '',
            dueDate,
            status: 'Pending'
        };

        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $push: { milestones: milestone } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(201).json(project.milestones[project.milestones.length - 1]);
    } catch (error) {
        console.error('Error adding milestone:', error);
        res.status(500).json({ message: 'Error adding milestone', error: error.message });
    }
});

// Update milestone
router.patch('/:id/milestones/:milestoneId', auth, async (req, res) => {
    try {
        const { title, description, dueDate, status } = req.body;

        const filter = { _id: req.params.id, 'milestones._id': req.params.milestoneId };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const updateFields = {};
        if (title) updateFields['milestones.$.title'] = title;
        if (description !== undefined) updateFields['milestones.$.description'] = description;
        if (dueDate !== undefined) updateFields['milestones.$.dueDate'] = dueDate;
        if (status) {
            updateFields['milestones.$.status'] = status;
            if (status === 'Completed') {
                updateFields['milestones.$.completedAt'] = new Date();
            }
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $set: updateFields },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project or milestone not found' });
        }

        const updatedMilestone = project.milestones.find(
            m => m._id.toString() === req.params.milestoneId
        );

        res.json(updatedMilestone);
    } catch (error) {
        console.error('Error updating milestone:', error);
        res.status(500).json({ message: 'Error updating milestone', error: error.message });
    }
});

// Delete milestone
router.delete('/:id/milestones/:milestoneId', auth, async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $pull: { milestones: { _id: req.params.milestoneId } } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        console.error('Error deleting milestone:', error);
        res.status(500).json({ message: 'Error deleting milestone', error: error.message });
    }
});

// Add note
router.post('/:id/notes', auth, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'Note text is required' });
        }

        const note = {
            text,
            author: req.user.name || req.user.fullName || 'User',
            createdAt: new Date()
        };

        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $push: { notes: note } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(201).json(project.notes[project.notes.length - 1]);
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ message: 'Error adding note', error: error.message });
    }
});

// Add deliverable
router.post('/:id/deliverables', auth, async (req, res) => {
    try {
        const { name, description, fileUrl } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Deliverable name is required' });
        }

        const deliverable = {
            name,
            description: description || '',
            fileUrl: fileUrl || '',
            deliveredAt: new Date()
        };

        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $push: { deliverables: deliverable } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(201).json(project.deliverables[project.deliverables.length - 1]);
    } catch (error) {
        console.error('Error adding deliverable:', error);
        res.status(500).json({ message: 'Error adding deliverable', error: error.message });
    }
});

// Delete deliverable
router.delete('/:id/deliverables/:deliverableId', auth, async (req, res) => {
    try {
        const filter = { _id: req.params.id };

        if (req.user.companyId) {
            filter.$or = [
                { userId: req.user.userId },
                { companyId: req.user.companyId }
            ];
        } else {
            filter.userId = req.user.userId;
        }

        const project = await Project.findOneAndUpdate(
            filter,
            { $pull: { deliverables: { _id: req.params.deliverableId } } },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Deliverable deleted successfully' });
    } catch (error) {
        console.error('Error deleting deliverable:', error);
        res.status(500).json({ message: 'Error deleting deliverable', error: error.message });
    }
});

module.exports = router;
