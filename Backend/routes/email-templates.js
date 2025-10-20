const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const EmailAuditLog = require('../models/EmailAuditLog');
const nodemailer = require('nodemailer');

// Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get all templates
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, category, enabled } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = type;
    if (category) query.category = category;
    if (enabled !== undefined) query.enabled = enabled === 'true';

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      EmailTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'fullName email')
        .populate('lastModifiedBy', 'fullName email'),
      EmailTemplate.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
});

// Get template by slug
router.get('/slug/:slug', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ slug: req.params.slug, enabled: true });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template', error: error.message });
  }
});

// Get template by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template', error: error.message });
  }
});

// Create template
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const {
      name,
      slug,
      type,
      category,
      subject,
      htmlBody,
      textBody,
      variables,
      fromName,
      fromEmail,
      replyTo
    } = req.body;

    if (!name || !slug || !subject || !htmlBody) {
      return res.status(400).json({ message: 'Name, slug, subject, and HTML body are required' });
    }

    // Check if slug already exists
    const existing = await EmailTemplate.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: 'Template with this slug already exists' });
    }

    const template = new EmailTemplate({
      name,
      slug,
      type,
      category,
      subject,
      htmlBody,
      textBody,
      variables,
      fromName,
      fromEmail,
      replyTo,
      createdBy: req.user._id,
      companyId: req.user.companyId
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
});

// Update template
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const {
      name,
      type,
      category,
      subject,
      htmlBody,
      textBody,
      variables,
      fromName,
      fromEmail,
      replyTo,
      enabled
    } = req.body;

    if (name !== undefined) template.name = name;
    if (type !== undefined) template.type = type;
    if (category !== undefined) template.category = category;
    if (subject !== undefined) template.subject = subject;
    if (htmlBody !== undefined) template.htmlBody = htmlBody;
    if (textBody !== undefined) template.textBody = textBody;
    if (variables !== undefined) template.variables = variables;
    if (fromName !== undefined) template.fromName = fromName;
    if (fromEmail !== undefined) template.fromEmail = fromEmail;
    if (replyTo !== undefined) template.replyTo = replyTo;
    if (enabled !== undefined) template.enabled = enabled;

    template.lastModifiedBy = req.user._id;
    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
});

// Delete template
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template', error: error.message });
  }
});

// Preview template
router.post('/:id/preview', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { variables = {} } = req.body;

    const rendered = template.render(variables);

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ message: 'Failed to preview template', error: error.message });
  }
});

// Send email using template
router.post('/:id/send', isAuthenticated, async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { to, variables = {}, attachments = [] } = req.body;

    if (!to) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    // Render template
    const rendered = template.render(variables);

    // Configure nodemailer
    const transportConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 25,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transportConfig.auth = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Send email
    const info = await transporter.sendMail({
      from: rendered.from,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: rendered.replyTo,
      attachments
    });

    // Update template stats
    template.sendCount += 1;
    template.lastSentAt = new Date();
    await template.save();

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

module.exports = router;
