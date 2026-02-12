const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Note = require('../models/Note');
const User = require('../models/User');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// GET /api/notes/company-users - Get users in same company for assignment
// ============================================
router.get('/company-users', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    
    if (!user || !user.companyId) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({ 
      companyId: user.companyId, 
      _id: { $ne: userId } 
    })
    .select('fullName email profileImage')
    .sort({ fullName: 1 })
    .lean();

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching company users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/notes/assigned - Get notes assigned TO current user
// ============================================
router.get('/assigned', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { status } = req.query;

    const filter = { assignedTo: userId };
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      filter.assignmentStatus = status;
    } else {
      // Default: show pending + accepted
      filter.assignmentStatus = { $in: ['pending', 'accepted'] };
    }

    const notes = await Note.find(filter)
      .populate('userId', 'fullName email profileImage')
      .populate('assignedBy', 'fullName email profileImage')
      .sort({ assignedAt: -1 })
      .lean();

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Error fetching assigned notes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/notes - List notes for current user
// ============================================
router.get('/', async (req, res) => {
  try {
    const { archived, tag, search, page = 1, limit = 50 } = req.query;
    const userId = req.user.userId || req.user._id;

    const filter = { userId };

    // Default: show non-archived only
    filter.archived = archived === 'true';

    if (tag) {
      filter.tags = tag;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .populate('assignedTo', 'fullName email profileImage')
        .populate('assignedBy', 'fullName email profileImage')
        .sort({ pinned: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Note.countDocuments(filter)
    ]);

    res.json({
      success: true,
      notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/notes - Create a new note
// ============================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { title, content, color, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const note = new Note({
      userId,
      companyId: req.user.companyId || null,
      title: title.trim(),
      content: content || '',
      color: color || 'default',
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean).slice(0, 10) : []
    });

    await note.save();

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/notes/:id - Get single note
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const note = await Note.findOne({ _id: req.params.id, userId }).lean();

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/notes/:id - Update a note
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { title, content, color, pinned, archived, tags, assignedTo } = req.body;

    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content;
    if (color !== undefined) update.color = color;
    if (pinned !== undefined) update.pinned = pinned;
    if (archived !== undefined) update.archived = archived;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean).slice(0, 10) : [];

    // Handle assignment
    if (assignedTo !== undefined) {
      if (assignedTo) {
        // Verify target user exists and is in same company
        const currentUser = await User.findById(userId).select('companyId').lean();
        const targetUser = await User.findById(assignedTo).select('companyId').lean();
        
        if (!targetUser) {
          return res.status(400).json({ success: false, message: 'Target user not found' });
        }
        
        if (currentUser.companyId && targetUser.companyId && 
            currentUser.companyId.toString() !== targetUser.companyId.toString()) {
          return res.status(403).json({ success: false, message: 'Can only assign to users in your company' });
        }

        update.assignedTo = assignedTo;
        update.assignedBy = userId;
        update.assignmentStatus = 'pending';
        update.assignedAt = new Date();
      } else {
        // Remove assignment
        update.assignedTo = null;
        update.assignedBy = null;
        update.assignmentStatus = 'none';
        update.assignedAt = null;
      }
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: update },
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'fullName email profileImage')
    .populate('assignedBy', 'fullName email profileImage')
    .lean();

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/notes/:id - Delete a note
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/notes/:id/pin - Toggle pin
// ============================================
router.patch('/:id/pin', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const note = await Note.findOne({ _id: req.params.id, userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    note.pinned = !note.pinned;
    await note.save();

    res.json({ success: true, note: note.toObject() });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/notes/:id/archive - Toggle archive
// ============================================
router.patch('/:id/archive', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const note = await Note.findOne({ _id: req.params.id, userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    note.archived = !note.archived;
    await note.save();

    res.json({ success: true, note: note.toObject() });
  } catch (error) {
    console.error('Error toggling archive:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/notes/:id/respond - Accept or reject an assigned note
// ============================================
router.patch('/:id/respond', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { response } = req.body;

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Response must be accepted or rejected' });
    }

    const note = await Note.findOne({ 
      _id: req.params.id, 
      assignedTo: userId,
      assignmentStatus: 'pending'
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Assigned note not found' });
    }

    note.assignmentStatus = response;
    await note.save();

    const populated = await Note.findById(note._id)
      .populate('userId', 'fullName email profileImage')
      .populate('assignedBy', 'fullName email profileImage')
      .lean();

    res.json({ success: true, note: populated });
  } catch (error) {
    console.error('Error responding to assignment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
