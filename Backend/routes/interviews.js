const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Interview = require('../models/Interview');
const User = require('../models/User');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// GET /api/interviews/company-users - Get users in same company for assignment
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
    .select('fullName email profileImage role')
    .sort({ fullName: 1 })
    .lean();

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching company users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/interviews - List interviews for current user/company
// ============================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { 
      status, 
      position, 
      interviewType, 
      startDate, 
      endDate, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    const user = await User.findById(userId).select('companyId').lean();
    const companyId = user?.companyId;

    // Build filter
    const filter = {};
    
    // If user is not admin, show interviews they own or are assigned to
    if (req.user.role !== 'Admin' && req.user.role !== 'Business Admin') {
      filter.$or = [
        { owner: userId },
        { 'interviewers.userId': userId }
      ];
    } else if (companyId) {
      // Admin/Business Admin - show all company interviews
      filter.companyId = companyId;
    }

    if (status) {
      filter.status = status;
    }

    if (position) {
      filter.position = { $regex: position, $options: 'i' };
    }

    if (interviewType) {
      filter.interviewType = interviewType;
    }

    if (startDate || endDate) {
      filter.scheduledAt = {};
      if (startDate) filter.scheduledAt.$gte = new Date(startDate);
      if (endDate) filter.scheduledAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { candidateName: { $regex: search, $options: 'i' } },
        { candidateEmail: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .populate('owner', 'fullName email profileImage')
        .populate('interviewers.userId', 'fullName email profileImage')
        .populate('primaryInterviewer', 'fullName email profileImage')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Interview.countDocuments(filter)
    ]);

    res.json({
      success: true,
      interviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/interviews/stats - Get interview statistics
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    const companyId = user?.companyId;

    const filter = {};
    
    if (req.user.role !== 'Admin' && req.user.role !== 'Business Admin') {
      filter.$or = [
        { owner: userId },
        { 'interviewers.userId': userId }
      ];
    } else if (companyId) {
      filter.companyId = companyId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, scheduled, completed, cancelled, todayCount, pendingFeedback] = await Promise.all([
      Interview.countDocuments(filter),
      Interview.countDocuments({ ...filter, status: 'scheduled' }),
      Interview.countDocuments({ ...filter, status: 'completed' }),
      Interview.countDocuments({ ...filter, status: 'cancelled' }),
      Interview.countDocuments({
        ...filter,
        scheduledAt: { $gte: today, $lt: tomorrow }
      }),
      Interview.countDocuments({
        ...filter,
        status: 'completed',
        'interviewers.feedbackSubmitted': false
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        scheduled,
        completed,
        cancelled,
        todayCount,
        pendingFeedback,
        hireRate: total > 0 ? Math.round((completed > 0 ? (await Interview.countDocuments({ ...filter, decision: 'hired' })) / completed * 100 : 0)) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching interview stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/interviews/upcoming - Get upcoming interviews
// ============================================
router.get('/upcoming', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { limit = 5 } = req.query;
    const user = await User.findById(userId).select('companyId').lean();
    const companyId = user?.companyId;

    const filter = {
      scheduledAt: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    };
    
    if (req.user.role !== 'Admin' && req.user.role !== 'Business Admin') {
      filter.$or = [
        { owner: userId },
        { 'interviewers.userId': userId }
      ];
    } else if (companyId) {
      filter.companyId = companyId;
    }

    const interviews = await Interview.find(filter)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .sort({ scheduledAt: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, interviews });
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/interviews - Create a new interview
// ============================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateResume,
      candidateLinkedIn,
      position,
      department,
      jobDescription,
      requiredSkills,
      experience,
      interviewType,
      interviewRound,
      totalRounds,
      scheduledAt,
      duration,
      timezone,
      meetingLink,
      location,
      interviewers,
      primaryInterviewer,
      notes,
      source
    } = req.body;

    // Validation
    if (!candidateName || !candidateName.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate name is required' });
    }
    if (!candidateEmail || !candidateEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate email is required' });
    }
    if (!position || !position.trim()) {
      return res.status(400).json({ success: false, message: 'Position is required' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'Scheduled date and time is required' });
    }

    const interview = new Interview({
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim().toLowerCase(),
      candidatePhone: candidatePhone?.trim(),
      candidateResume: candidateResume?.trim(),
      candidateLinkedIn: candidateLinkedIn?.trim(),
      position: position.trim(),
      department: department?.trim(),
      jobDescription: jobDescription?.trim(),
      requiredSkills: requiredSkills || [],
      experience: experience?.trim(),
      interviewType: interviewType || 'video',
      interviewRound: interviewRound || 1,
      totalRounds: totalRounds || 1,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      timezone: timezone || 'UTC',
      meetingLink: meetingLink?.trim(),
      location: location?.trim(),
      interviewers: interviewers || [],
      primaryInterviewer: primaryInterviewer,
      owner: userId,
      companyId: user?.companyId || null,
      notes: notes?.trim(),
      source: source || 'direct',
      statusHistory: [{
        status: 'scheduled',
        changedAt: new Date(),
        changedBy: userId,
        notes: 'Interview scheduled'
      }]
    });

    await interview.save();

    const populated = await Interview.findById(interview._id)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .populate('primaryInterviewer', 'fullName email profileImage')
      .lean();

    res.status(201).json({ success: true, interview: populated });
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/interviews/:id - Get single interview
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const interview = await Interview.findById(req.params.id)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .populate('primaryInterviewer', 'fullName email profileImage')
      .populate('feedback.interviewerId', 'fullName email profileImage')
      .lean();

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Check access
    const user = await User.findById(userId).select('companyId role').lean();
    const isOwner = interview.owner?._id?.toString() === userId.toString();
    const isInterviewer = interview.interviewers?.some(i => i.userId?._id?.toString() === userId.toString());
    const isAdmin = user?.role === 'Admin' || user?.role === 'Business Admin';
    const isSameCompany = user?.companyId && interview.companyId?.toString() === user.companyId.toString();

    if (!isOwner && !isInterviewer && !(isAdmin && isSameCompany)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, interview });
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/interviews/:id - Update an interview
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Check ownership
    if (interview.owner.toString() !== userId.toString()) {
      // Check if user is admin
      const user = await User.findById(userId).select('role companyId').lean();
      if (user?.role !== 'Admin' && user?.role !== 'Business Admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const allowedFields = [
      'candidateName', 'candidateEmail', 'candidatePhone', 'candidateResume',
      'candidateLinkedIn', 'position', 'department', 'jobDescription', 'requiredSkills',
      'experience', 'interviewType', 'interviewRound', 'totalRounds', 'scheduledAt',
      'duration', 'timezone', 'meetingLink', 'location', 'interviewers',
      'primaryInterviewer', 'notes', 'source', 'status', 'internalNotes'
    ];

    const update = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (['candidateName', 'candidateEmail', 'candidatePhone', 'candidateResume',
            'candidateLinkedIn', 'position', 'department', 'jobDescription',
            'experience', 'meetingLink', 'location', 'notes', 'source', 'internalNotes'].includes(field)) {
          update[field] = req.body[field]?.trim();
        } else if (field === 'requiredSkills' && Array.isArray(req.body[field])) {
          update[field] = req.body[field].map(s => s.trim());
        } else {
          update[field] = req.body[field];
        }
      }
    }

    // Add status history if status changed
    if (update.status && update.status !== interview.status) {
      interview.statusHistory.push({
        status: update.status,
        changedAt: new Date(),
        changedBy: userId,
        notes: `Status changed to ${update.status}`
      });
      update.statusHistory = interview.statusHistory;
    }

    const updated = await Interview.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
    .populate('owner', 'fullName email profileImage')
    .populate('interviewers.userId', 'fullName email profileImage')
    .populate('primaryInterviewer', 'fullName email profileImage')
    .lean();

    res.json({ success: true, interview: updated });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/interviews/:id/status - Update interview status
// ============================================
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { status, notes } = req.body;

    const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Add status history
    interview.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: userId,
      notes: notes || `Status changed to ${status}`
    });

    interview.status = status;
    await interview.save();

    const updated = await Interview.findById(interview._id)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .lean();

    res.json({ success: true, interview: updated });
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/interviews/:id/feedback - Submit interview feedback
// ============================================
router.post('/:id/feedback', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const {
      rating,
      technicalSkills,
      communication,
      problemSolving,
      culturalFit,
      strengths,
      weaknesses,
      comments,
      recommendation
    } = req.body;

    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Check if user is an interviewer
    const isInterviewer = interview.interviewers?.some(
      i => i.userId?.toString() === userId.toString() || i.toString() === userId.toString()
    );
    
    if (!isInterviewer) {
      return res.status(403).json({ success: false, message: 'Only interviewers can submit feedback' });
    }

    // Check if feedback already submitted
    const existingFeedback = interview.feedback?.find(
      f => f.interviewerId?.toString() === userId.toString()
    );

    if (existingFeedback) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted' });
    }

    // Add feedback
    interview.feedback.push({
      interviewerId: userId,
      rating: rating || null,
      technicalSkills: technicalSkills || null,
      communication: communication || null,
      problemSolving: problemSolving || null,
      culturalFit: culturalFit || null,
      strengths: strengths?.trim(),
      weaknesses: weaknesses?.trim(),
      comments: comments?.trim(),
      recommendation: recommendation || 'neutral',
      submittedAt: new Date()
    });

    // Mark interviewer as having submitted feedback
    const interviewerIndex = interview.interviewers.findIndex(
      i => i.userId?.toString() === userId.toString()
    );
    if (interviewerIndex !== -1) {
      interview.interviewers[interviewerIndex].feedbackSubmitted = true;
    }

    // Calculate overall rating
    interview.calculateOverallRating();

    // Update overall recommendation based on feedback
    if (interview.feedback.length > 0) {
      const recommendations = interview.feedback.map(f => f.recommendation);
      const yesCount = recommendations.filter(r => r === 'yes' || r === 'strong-yes').length;
      const noCount = recommendations.filter(r => r === 'no' || r === 'strong-no').length;
      
      if (yesCount > noCount) {
        interview.overallRecommendation = 'yes';
      } else if (noCount > yesCount) {
        interview.overallRecommendation = 'no';
      } else {
        interview.overallRecommendation = 'neutral';
      }
    }

    // If all feedback submitted, mark as completed
    const allFeedbackSubmitted = interview.interviewers?.every(i => i.feedbackSubmitted);
    if (allFeedbackSubmitted && interview.status !== 'completed') {
      interview.status = 'completed';
      interview.statusHistory.push({
        status: 'completed',
        changedAt: new Date(),
        changedBy: userId,
        notes: 'All feedback submitted'
      });
    }

    await interview.save();

    const updated = await Interview.findById(interview._id)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .populate('feedback.interviewerId', 'fullName email profileImage')
      .lean();

    res.json({ success: true, interview: updated });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/interviews/:id/decision - Make hiring decision
// ============================================
router.patch('/:id/decision', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { decision, reason } = req.body;

    const validDecisions = ['pending', 'hired', 'rejected', 'hold'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision' });
    }

    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Only owner or admin can make decision
    if (interview.owner.toString() !== userId.toString()) {
      const user = await User.findById(userId).select('role').lean();
      if (user?.role !== 'Admin' && user?.role !== 'Business Admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    interview.decision = decision;
    interview.decisionReason = reason?.trim();

    await interview.save();

    const updated = await Interview.findById(interview._id)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .lean();

    res.json({ success: true, interview: updated });
  } catch (error) {
    console.error('Error updating decision:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/interviews/:id - Delete an interview
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Check ownership
    if (interview.owner.toString() !== userId.toString()) {
      const user = await User.findById(userId).select('role').lean();
      if (user?.role !== 'Admin' && user?.role !== 'Business Admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    await Interview.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Interview deleted' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/interviews/my-assignments - Get interviews assigned to current user
// ============================================
router.get('/my-assignments', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { status, upcoming } = req.query;

    const filter = {
      'interviewers.userId': userId
    };

    if (status) {
      filter.status = status;
    }

    if (upcoming === 'true') {
      filter.scheduledAt = { $gte: new Date() };
      filter.status = { $in: ['scheduled', 'confirmed'] };
    }

    const interviews = await Interview.find(filter)
      .populate('owner', 'fullName email profileImage')
      .populate('interviewers.userId', 'fullName email profileImage')
      .sort({ scheduledAt: 1 })
      .lean();

    // Add user's assignment info
    const interviewsWithAssignment = interviews.map(interview => {
      const myAssignment = interview.interviewers?.find(
        i => i.userId?._id?.toString() === userId.toString()
      );
      return {
        ...interview,
        myStatus: myAssignment?.status,
        myFeedbackSubmitted: myAssignment?.feedbackSubmitted
      };
    });

    res.json({ success: true, interviews: interviewsWithAssignment });
  } catch (error) {
    console.error('Error fetching my assignments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
