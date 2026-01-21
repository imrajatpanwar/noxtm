const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplate');
const { authenticateToken } = require('../middleware/auth');
const { requireCompanyAccess } = require('../middleware/emailAuth');

// All routes require authentication and company access
router.use(authenticateToken);
router.use(requireCompanyAccess);

// Helper to get user ID and company ID from JWT token
// JWT has userId (not _id), and companyId may not exist
const getUserIds = (req) => {
  const userId = req.user.userId || req.user._id;
  const companyId = req.user.companyId || userId; // Fallback to userId
  return { userId, companyId };
};

/**
 * POST /api/email-templates/
 * Create a new email template
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      body,
      category,
      variables,
      attachments,
      isShared
    } = req.body;

    const { userId, companyId } = getUserIds(req);

    // Validate required fields
    if (!name || !subject || !body) {
      return res.status(400).json({
        error: 'Name, subject, and body are required'
      });
    }

    // Create template
    const template = await EmailTemplate.create({
      name,
      description,
      subject,
      body,
      category: category || 'general',
      variables: variables || [],
      attachments: attachments || [],
      isShared: isShared !== undefined ? isShared : true,
      companyId,
      createdBy: userId
    });

    await template.populate('createdBy', 'name email');

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-templates/
 * Get all templates for company
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = getUserIds(req);
    const { category, isShared, createdBy } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (isShared !== undefined) filters.isShared = isShared === 'true';
    if (createdBy) filters.createdBy = createdBy;

    const templates = await EmailTemplate.getByCompany(companyId, filters);

    res.json({
      templates,
      total: templates.length
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-templates/popular
 * Get popular templates
 */
router.get('/popular', async (req, res) => {
  try {
    const { companyId } = getUserIds(req);
    const limit = parseInt(req.query.limit) || 10;

    const templates = await EmailTemplate.getPopular(companyId, limit);

    res.json({
      templates,
      total: templates.length
    });

  } catch (error) {
    console.error('Error fetching popular templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-templates/stats
 * Get template statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { companyId } = getUserIds(req);

    const stats = await EmailTemplate.getStats(companyId);

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-templates/:id
 * Get template by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = getUserIds(req);

    const template = await EmailTemplate.findOne({ _id: id, companyId })
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Extract variables from template content
    const extractedVariables = template.extractVariables();

    res.json({
      template,
      extractedVariables
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-templates/:id
 * Update template
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, companyId } = getUserIds(req);

    const template = await EmailTemplate.findOne({ _id: id, companyId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const {
      name,
      description,
      subject,
      body,
      category,
      variables,
      attachments,
      enabled,
      isShared
    } = req.body;

    // Update fields
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (subject !== undefined) template.subject = subject;
    if (body !== undefined) template.body = body;
    if (category !== undefined) template.category = category;
    if (variables !== undefined) template.variables = variables;
    if (attachments !== undefined) template.attachments = attachments;
    if (enabled !== undefined) template.enabled = enabled;
    if (isShared !== undefined) template.isShared = isShared;

    template.lastModifiedBy = userId;

    await template.save();

    await template.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-templates/:id
 * Delete template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = getUserIds(req);

    const template = await EmailTemplate.findOne({ _id: id, companyId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-templates/:id/render
 * Render template with variables (preview)
 */
router.post('/:id/render', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;
    const { companyId } = getUserIds(req);

    const template = await EmailTemplate.findOne({ _id: id, companyId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const rendered = template.render(variables || {});

    res.json({
      success: true,
      rendered,
      template: {
        name: template.name,
        category: template.category
      }
    });

  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-templates/:id/use
 * Use template (record usage statistics)
 */
router.post('/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = getUserIds(req);

    const template = await EmailTemplate.findOne({ _id: id, companyId });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Record usage
    await template.recordUsage();

    res.json({
      success: true,
      message: 'Template usage recorded',
      useCount: template.useCount
    });

  } catch (error) {
    console.error('Error recording template usage:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
