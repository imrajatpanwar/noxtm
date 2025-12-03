const express = require('express');
const router = express.Router();
const EmailNote = require('../models/EmailNote');
const EmailAssignment = require('../models/EmailAssignment');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/email-notes/
 * Add a note to an assignment
 */
router.post('/', async (req, res) => {
  try {
    const { assignmentId, content, mentions } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!assignmentId || !content) {
      return res.status(400).json({
        error: 'Assignment ID and content are required'
      });
    }

    // Verify assignment exists and belongs to user's company
    const assignment = await EmailAssignment.findOne({
      _id: assignmentId,
      companyId
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Process mentions if provided
    let mentionIds = [];
    if (mentions && Array.isArray(mentions)) {
      // Verify mentioned users exist and belong to same company
      const users = await User.find({
        _id: { $in: mentions },
        companyId
      });

      mentionIds = users.map(u => u._id);
    }

    // Create note
    const note = await EmailNote.create({
      assignmentId,
      content,
      author: userId,
      mentions: mentionIds,
      companyId
    });

    // Populate author and mentions for response
    await note.populate([
      { path: 'author', select: 'name email emailAvatar' },
      { path: 'mentions', select: 'name email' }
    ]);

    res.json({
      success: true,
      note
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-notes/:assignmentId
 * Get all notes for an assignment
 */
router.get('/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const companyId = req.user.companyId;

    // Verify assignment exists and belongs to user's company
    const assignment = await EmailAssignment.findOne({
      _id: assignmentId,
      companyId
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const notes = await EmailNote.getByAssignment(assignmentId);

    res.json({
      notes,
      total: notes.length
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-notes/:id
 * Update a note (edit content)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await EmailNote.findOne({
      _id: id,
      companyId,
      deleted: false
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only author can edit their own note
    if (note.author.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You can only edit your own notes'
      });
    }

    await note.updateContent(content);

    await note.populate([
      { path: 'author', select: 'name email emailAvatar' },
      { path: 'mentions', select: 'name email' }
    ]);

    res.json({
      success: true,
      note
    });

  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-notes/:id
 * Delete a note (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    const note = await EmailNote.findOne({
      _id: id,
      companyId,
      deleted: false
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only author can delete their own note
    if (note.author.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You can only delete your own notes'
      });
    }

    await note.softDelete(userId);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
