const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;
const Project = require('../models/Project');
const Company = require('../models/Company');
const EmailTemplate = require('../models/EmailTemplate');
const UserVerifiedDomain = require('../models/UserVerifiedDomain');
const EmailAccount = require('../models/EmailAccount');
const { sendEmailViaSES } = require('../utils/awsSesHelper');

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

// Get project settings
router.get('/settings', auth, async (req, res) => {
    try {
        if (!req.user.companyId) {
            return res.json({ settings: {
                onboardingEmailEnabled: false,
                senderEmailAccountId: '',
                templateId: ''
            }});
        }

        const company = await Company.findById(req.user.companyId);
        if (!company) {
            return res.json({ settings: {
                onboardingEmailEnabled: false,
                senderEmailAccountId: '',
                templateId: ''
            }});
        }

        res.json({ settings: company.projectSettings || {
            onboardingEmailEnabled: false,
            senderEmailAccountId: '',
            templateId: ''
        }});
    } catch (error) {
        console.error('Error fetching project settings:', error);
        res.status(500).json({ message: 'Error fetching project settings', error: error.message });
    }
});

// Update project settings (Manager only)
router.put('/settings', auth, async (req, res) => {
    try {
        // Check if user has manager permissions
        const managerRoles = ['Owner', 'Manager', 'Admin', 'Business Admin'];
        const userRole = req.user.role || req.user.roleInCompany;
        
        if (!managerRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Only managers can modify project settings' });
        }

        if (!req.user.companyId) {
            return res.status(400).json({ message: 'Company ID required to save settings' });
        }

        const { settings } = req.body;

        const company = await Company.findByIdAndUpdate(
            req.user.companyId,
            { $set: { projectSettings: settings } },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.json({ 
            success: true, 
            settings: company.projectSettings,
            message: 'Project settings updated successfully' 
        });
    } catch (error) {
        console.error('Error updating project settings:', error);
        res.status(500).json({ message: 'Error updating project settings', error: error.message });
    }
});

// Helper function to send onboarding email
async function sendOnboardingEmail(project, settings, companyId, userId) {
    try {
        if (!settings.onboardingEmailEnabled) {
            return { sent: false, reason: 'Onboarding email disabled' };
        }

        if (!project.client?.email) {
            console.log('[ONBOARDING_EMAIL] No client email provided, skipping onboarding email');
            return { sent: false, reason: 'No client email' };
        }

        // Get company info
        const company = await Company.findById(companyId);
        const companyName = company?.companyName || 'Our Company';

        // Determine sender email
        let senderEmail = '';
        let senderName = companyName;

        if (settings.senderEmailAccountId?.startsWith('domain:')) {
            // Using auto-generated noreply address
            const domain = settings.senderEmailAccountId.replace('domain:', '');
            senderEmail = `noreply@${domain}`;
        } else if (settings.senderEmailAccountId) {
            // Using specific email account
            const account = await EmailAccount.findById(settings.senderEmailAccountId);
            if (account) {
                senderEmail = account.email;
                senderName = account.displayName || companyName;
            }
        }

        if (!senderEmail) {
            console.log('[ONBOARDING_EMAIL] No sender email configured');
            return { sent: false, reason: 'No sender email configured' };
        }

        // Get or generate email template
        let subject = '';
        let body = '';

        if (settings.templateId === 'default-onboarding') {
            // Use default onboarding template
            subject = `Welcome to ${companyName} - ${project.projectName}`;
            body = generateDefaultOnboardingEmail({
                clientName: project.client.name,
                projectName: project.projectName,
                projectDescription: project.description || 'We look forward to working with you on this project.',
                companyName: companyName,
                startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'To be confirmed',
                endDate: project.endDate ? new Date(project.endDate).toLocaleDateString() : 'To be confirmed'
            });
        } else if (settings.templateId) {
            // Use custom template
            const template = await EmailTemplate.findById(settings.templateId);
            if (template) {
                subject = replaceTemplateVariables(template.subject, {
                    clientName: project.client.name,
                    projectName: project.projectName,
                    projectDescription: project.description || '',
                    companyName: companyName,
                    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
                    endDate: project.endDate ? new Date(project.endDate).toLocaleDateString() : ''
                });
                body = replaceTemplateVariables(template.body, {
                    clientName: project.client.name,
                    projectName: project.projectName,
                    projectDescription: project.description || '',
                    companyName: companyName,
                    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
                    endDate: project.endDate ? new Date(project.endDate).toLocaleDateString() : ''
                });
            }
        }

        if (!subject || !body) {
            console.log('[ONBOARDING_EMAIL] No template content');
            return { sent: false, reason: 'No template content' };
        }

        // Send email via AWS SES
        const fromAddress = `${senderName} <${senderEmail}>`;
        
        await sendEmailViaSES({
            from: fromAddress,
            to: project.client.email,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        });

        console.log(`[ONBOARDING_EMAIL] ✓ Sent onboarding email to ${project.client.email} for project ${project.projectName}`);
        return { sent: true };

    } catch (error) {
        console.error('[ONBOARDING_EMAIL] ✗ Failed to send onboarding email:', error.message);
        return { sent: false, reason: error.message };
    }
}

// Helper function to replace template variables
function replaceTemplateVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, value || '');
    }
    return result;
}

// Generate default onboarding email HTML
function generateDefaultOnboardingEmail({ clientName, projectName, projectDescription, companyName, startDate, endDate }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome Aboard! 🎉</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your project journey begins here</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                                Dear <strong>${clientName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #555; font-size: 15px; line-height: 1.7;">
                                Thank you for choosing <strong>${companyName}</strong>! We're thrilled to welcome you as our client and excited to begin working on your project.
                            </p>
                            
                            <!-- Project Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); border-radius: 10px; margin: 25px 0; border: 1px solid #e0e7ff;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 15px; color: #4f46e5; font-size: 18px; font-weight: 600;">
                                            📋 Project: ${projectName}
                                        </h2>
                                        <p style="margin: 0 0 15px; color: #555; font-size: 14px; line-height: 1.6;">
                                            ${projectDescription}
                                        </p>
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 5px 15px 5px 0;">
                                                    <span style="color: #888; font-size: 12px;">START DATE</span><br>
                                                    <strong style="color: #333; font-size: 14px;">${startDate}</strong>
                                                </td>
                                                <td style="padding: 5px 0 5px 15px; border-left: 1px solid #ddd;">
                                                    <span style="color: #888; font-size: 12px;">TARGET COMPLETION</span><br>
                                                    <strong style="color: #333; font-size: 14px;">${endDate}</strong>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; color: #555; font-size: 15px; line-height: 1.7;">
                                Our team is dedicated to delivering exceptional results. We'll keep you updated on the project progress and are always available if you have any questions.
                            </p>
                            
                            <p style="margin: 20px 0 0; color: #555; font-size: 15px; line-height: 1.7;">
                                Looking forward to a successful collaboration!
                            </p>
                            
                            <p style="margin: 30px 0 0; color: #333; font-size: 15px;">
                                Warm regards,<br>
                                <strong>The ${companyName} Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0; color: #888; font-size: 12px;">
                                This email was sent by ${companyName}.<br>
                                If you have any questions, please reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

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

        // Send onboarding email if enabled (non-blocking)
        let onboardingEmailResult = null;
        if (req.user.companyId) {
            try {
                const company = await Company.findById(req.user.companyId);
                if (company?.projectSettings?.onboardingEmailEnabled) {
                    onboardingEmailResult = await sendOnboardingEmail(
                        populated,
                        company.projectSettings,
                        req.user.companyId,
                        req.user.userId
                    );
                }
            } catch (emailError) {
                console.error('[ONBOARDING_EMAIL] Error in onboarding email process:', emailError);
                onboardingEmailResult = { sent: false, reason: emailError.message };
            }
        }

        // Return project with optional email status
        const response = {
            ...populated.toObject(),
            _onboardingEmail: onboardingEmailResult
        };

        res.status(201).json(response);
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
