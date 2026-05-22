const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');
const LetterTemplate = require('../models/LetterTemplate');
const GeneratedLetter = require('../models/GeneratedLetter');
const User = require('../models/User');
const Company = require('../models/Company');

const getCompanyId = async (userId) => {
    const user = await User.findById(userId).select('companyId role').lean();
    return user;
};

const detectVariables = (text = '') => {
    return [...new Set((text.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')))];
};

const replaceVariables = (text = '', values = {}) => {
    let output = text || '';
    for (const [key, value] of Object.entries(values)) {
        output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return output;
};

const formatCompanyAddress = (company = {}) => {
    return [
        company.address,
        company.companyCity,
        company.companyState,
        company.companyZipCode,
        company.companyCountry
    ].filter(Boolean).join(', ');
};

const getPublicOrigin = (req) => {
    return (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
};

const buildLetterPayload = async ({ template, user, userId, employeeId, customValues }) => {
    const company = await Company.findById(user.companyId).lean();
    const companySnapshot = {
        name: company?.companyName || '',
        email: company?.companyEmail || '',
        phone: company?.companyPhone || '',
        website: company?.companyWebsite || '',
        logo: company?.companyLogo || '',
        address: company?.address || '',
        city: company?.companyCity || '',
        state: company?.companyState || '',
        country: company?.companyCountry || '',
        zipCode: company?.companyZipCode || ''
    };

    let employee = null;
    if (employeeId) {
        employee = await User.findOne({ _id: employeeId, companyId: user.companyId }).select('-password').lean();
    }

    const today = new Date();
    let variableValues = {
        companyName: companySnapshot.name,
        companyEmail: companySnapshot.email,
        companyPhone: companySnapshot.phone,
        companyWebsite: companySnapshot.website,
        companyAddress: formatCompanyAddress(company),
        address: employee?.address || formatCompanyAddress(company),
        date: today.toLocaleDateString(),
        year: today.getFullYear().toString(),
        employeeName: employee?.fullName || '',
        employeeEmail: employee?.email || '',
        department: employee?.department || '',
        jobTitle: employee?.jobTitle || '',
        dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '',
        city: employee?.city || '',
        state: employee?.state || '',
        country: employee?.country || '',
        phoneNumber: employee?.phoneNumber || '',
        ...(customValues || {})
    };

    const generatedContent = replaceVariables(template.content, variableValues);
    const generatedSubject = replaceVariables(template.subject || '', variableValues);

    return {
        subject: generatedSubject,
        content: generatedContent,
        templateName: template.name,
        category: template.category,
        values: variableValues,
        recipient: {
            employeeId: employee?._id,
            name: variableValues.employeeName || employee?.fullName || '',
            email: variableValues.employeeEmail || employee?.email || '',
            jobTitle: variableValues.jobTitle || employee?.jobTitle || '',
            department: variableValues.department || employee?.department || ''
        },
        companySnapshot,
        generatedAt: new Date(),
        createdBy: userId
    };
};

const makeFilename = (letter) => {
    const base = `${letter.templateName || 'letter'}-${letter.recipient?.name || 'public'}`;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'letter';
};

const generateLetterPDF = (letter) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 56 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            doc.font('Helvetica-Bold')
                .fontSize(20)
                .fillColor('#111111')
                .text(letter.companySnapshot?.name || 'Company Letter', { align: 'left' });

            const companyLine = [
                letter.companySnapshot?.email,
                letter.companySnapshot?.phone,
                letter.companySnapshot?.website
            ].filter(Boolean).join('  |  ');

            if (companyLine) {
                doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#666666').text(companyLine);
            }
            if (letter.companySnapshot?.address) {
                doc.fontSize(9).text([
                    letter.companySnapshot.address,
                    letter.companySnapshot.city,
                    letter.companySnapshot.state,
                    letter.companySnapshot.zipCode,
                    letter.companySnapshot.country
                ].filter(Boolean).join(', '));
            }

            doc.moveDown(1.2).strokeColor('#E5E7EB').lineWidth(1)
                .moveTo(56, doc.y).lineTo(539, doc.y).stroke();

            doc.moveDown(1.4)
                .font('Helvetica-Bold')
                .fontSize(15)
                .fillColor('#111111')
                .text(letter.subject || letter.templateName || 'Letter');

            doc.moveDown(0.6)
                .font('Helvetica')
                .fontSize(10)
                .fillColor('#666666')
                .text(`Generated on ${new Date(letter.createdAt || letter.generatedAt).toLocaleDateString()}`);

            doc.moveDown(1.4)
                .font('Helvetica')
                .fontSize(11)
                .fillColor('#222222')
                .text(letter.content || '', {
                    align: 'left',
                    lineGap: 5
                });

            doc.moveDown(2)
                .font('Helvetica')
                .fontSize(10)
                .fillColor('#666666')
                .text('This document was generated through Noxtm.', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// ============================================
// Public generated letter routes
// ============================================
router.get('/public/:token', async (req, res) => {
    try {
        const letter = await GeneratedLetter.findOne({ token: req.params.token }).lean();
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        res.json({ success: true, letter });
    } catch (error) {
        console.error('Error fetching public letter:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/public/:token/download', async (req, res) => {
    try {
        const letter = await GeneratedLetter.findOne({ token: req.params.token }).lean();
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        const pdfBuffer = await generateLetterPDF(letter);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${makeFilename(letter)}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error downloading public letter:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// All routes below require authentication
router.use(authenticateToken);

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

        // Auto-detect variables from subject and content
        const allVars = [...new Set([...(variables || []), ...detectVariables(subject), ...detectVariables(content)])];

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
        }
        if (content || subject !== undefined || variables) {
            template.variables = [...new Set([
                ...(variables || []),
                ...detectVariables(template.subject),
                ...detectVariables(template.content)
            ])];
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
// POST /api/letter-templates/generate-built-in - Generate from built-in template
// ============================================
router.post('/generate-built-in', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        const { template: rawTemplate, employeeId, customValues } = req.body;
        if (!rawTemplate?.name || !rawTemplate?.content) {
            return res.status(400).json({ success: false, message: 'Template name and content are required' });
        }

        const template = {
            name: rawTemplate.name.trim(),
            category: rawTemplate.category || 'custom',
            subject: rawTemplate.subject || '',
            content: rawTemplate.content,
            variables: [
                ...new Set([
                    ...(rawTemplate.variables || []),
                    ...detectVariables(rawTemplate.subject),
                    ...detectVariables(rawTemplate.content)
                ])
            ]
        };

        const payload = await buildLetterPayload({ template, user, userId, employeeId, customValues });
        const token = crypto.randomBytes(18).toString('hex');
        const generatedLetter = await GeneratedLetter.create({
            companyId: user.companyId,
            token,
            templateName: payload.templateName,
            category: payload.category,
            subject: payload.subject,
            content: payload.content,
            values: payload.values,
            recipient: payload.recipient,
            companySnapshot: payload.companySnapshot,
            createdBy: userId
        });

        const publicUrl = `${getPublicOrigin(req)}/public/letters/${token}`;
        const downloadUrl = `/api/letter-templates/public/${token}/download`;

        res.json({
            success: true,
            generated: {
                _id: generatedLetter._id,
                token,
                subject: payload.subject,
                content: payload.content,
                templateName: payload.templateName,
                category: payload.category,
                generatedAt: generatedLetter.createdAt,
                publicUrl,
                downloadUrl,
                recipient: payload.recipient,
                companySnapshot: payload.companySnapshot
            }
        });
    } catch (error) {
        console.error('Error generating built-in letter:', error);
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
        const payload = await buildLetterPayload({ template, user, userId, employeeId, customValues });
        const token = crypto.randomBytes(18).toString('hex');
        const generatedLetter = await GeneratedLetter.create({
            companyId: user.companyId,
            templateId: template._id,
            token,
            templateName: payload.templateName,
            category: payload.category,
            subject: payload.subject,
            content: payload.content,
            values: payload.values,
            recipient: payload.recipient,
            companySnapshot: payload.companySnapshot,
            createdBy: userId
        });

        const publicUrl = `${getPublicOrigin(req)}/public/letters/${token}`;
        const downloadUrl = `/api/letter-templates/public/${token}/download`;

        res.json({
            success: true,
            generated: {
                _id: generatedLetter._id,
                token,
                subject: payload.subject,
                content: payload.content,
                templateName: payload.templateName,
                category: payload.category,
                generatedAt: generatedLetter.createdAt,
                publicUrl,
                downloadUrl,
                recipient: payload.recipient,
                companySnapshot: payload.companySnapshot
            }
        });
    } catch (error) {
        console.error('Error generating letter:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
