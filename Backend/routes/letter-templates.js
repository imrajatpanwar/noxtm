const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LetterTemplate = require('../models/LetterTemplate');
const User = require('../models/User');
const Company = require('../models/Company');

// All routes require authentication
router.use(authenticateToken);

const getCompanyId = async (userId) => {
    const user = await User.findById(userId).select('companyId role').lean();
    return user;
};

// ============================================
// GET /api/letter-templates - List templates
// ============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) return res.json({ success: true, templates: [] });

        const { category } = req.query;
        const filter = { companyId: user.companyId };
        if (category) filter.category = category;

        const templates = await LetterTemplate.find(filter)
            .populate('createdBy', 'fullName email')
            .sort({ category: 1, name: 1 })
            .lean();

        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/letter-templates - Create template
// ============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { name, category, subject, content, variables } = req.body;

        if (!name || !content) {
            return res.status(400).json({ success: false, message: 'Name and content are required' });
        }

        // Auto-detect variables from content
        const detectedVars = (content.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''));
        const allVars = [...new Set([...(variables || []), ...detectedVars])];

        const template = new LetterTemplate({
            companyId: user.companyId,
            name: name.trim(),
            category: category || 'custom',
            subject: subject?.trim(),
            content,
            variables: allVars,
            createdBy: userId
        });

        await template.save();

        const populated = await LetterTemplate.findById(template._id)
            .populate('createdBy', 'fullName email')
            .lean();

        res.status(201).json({ success: true, template: populated });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// PUT /api/letter-templates/:id - Update template
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const template = await LetterTemplate.findOne({ _id: req.params.id, companyId: user.companyId });
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        const { name, category, subject, content, variables } = req.body;
        if (name) template.name = name.trim();
        if (category) template.category = category;
        if (subject !== undefined) template.subject = subject?.trim();
        if (content) {
            template.content = content;
            // Re-detect variables
            const detectedVars = (content.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''));
            template.variables = [...new Set([...(variables || []), ...detectedVars])];
        }

        await template.save();

        const populated = await LetterTemplate.findById(template._id)
            .populate('createdBy', 'fullName email')
            .lean();

        res.json({ success: true, template: populated });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// DELETE /api/letter-templates/:id - Delete template
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await LetterTemplate.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
        if (!result) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/letter-templates/:id/generate - Generate letter for an employee
// ============================================
router.post('/:id/generate', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        const template = await LetterTemplate.findOne({ _id: req.params.id, companyId: user.companyId }).lean();
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        const { employeeId, customValues } = req.body;

        // Get employee data for auto-fill
        let variableValues = { ...(customValues || {}) };

        if (employeeId) {
            const employee = await User.findById(employeeId).select('-password').lean();
            const company = await Company.findById(user.companyId).select('companyName').lean();

            if (employee) {
                variableValues = {
                    employeeName: employee.fullName,
                    employeeEmail: employee.email,
                    department: employee.department || '',
                    jobTitle: employee.jobTitle || '',
                    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '',
                    address: employee.address || '',
                    city: employee.city || '',
                    state: employee.state || '',
                    country: employee.country || '',
                    phoneNumber: employee.phoneNumber || '',
                    companyName: company?.companyName || '',
                    date: new Date().toLocaleDateString(),
                    year: new Date().getFullYear().toString(),
                    ...variableValues // Custom values override auto-filled ones
                };
            }
        }

        // Replace variables in content
        let generatedContent = template.content;
        for (const [key, value] of Object.entries(variableValues)) {
            generatedContent = generatedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
        }

        let generatedSubject = template.subject || '';
        for (const [key, value] of Object.entries(variableValues)) {
            generatedSubject = generatedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
        }

        res.json({
            success: true,
            generated: {
                subject: generatedSubject,
                content: generatedContent,
                templateName: template.name,
                category: template.category,
                generatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error generating letter:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
