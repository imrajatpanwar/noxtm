const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const NoxtmSkill = require('../models/NoxtmSkill');
const SkillSession = require('../models/SkillSession');
const SkillAnalytics = require('../models/SkillAnalytics');
const User = require('../models/User');
const Company = require('../models/Company');
const { authenticateToken } = require('../middleware/auth');
const { runSkillTurn } = require('../utils/skillRunner');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { success: false, message: 'Too many requests. Please wait.' }
});

// ===== HELPERS =====

async function loadSkill(slug, companyId, userId) {
  let base;
  if (companyId) {
    base = await NoxtmSkill.findOne({ slug, companyId, enabled: true, variantOf: null });
  }
  if (!base) {
    base = await NoxtmSkill.findOne({ slug, companyId: null, enabled: true, variantOf: null });
  }
  if (!base) return null;

  // Check for A/B variants
  const variants = await NoxtmSkill.find({
    variantOf: base._id,
    enabled: true,
  }).sort({ priority: 1 });

  if (variants.length === 0) return base;

  // Weighted random selection using trafficPercent
  // base gets its own trafficPercent (default 100 minus variants total)
  const allOptions = [base, ...variants];
  const totalWeight = allOptions.reduce((s, v) => s + (v.trafficPercent || 0), 0);
  if (totalWeight <= 0) return base;

  // Deterministic per-user: hash the userId to get consistent variant assignment
  let hash = 0;
  const uid = String(userId || '');
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
  }
  const roll = Math.abs(hash) % totalWeight;

  let cumulative = 0;
  for (const opt of allOptions) {
    cumulative += (opt.trafficPercent || 0);
    if (roll < cumulative) return opt;
  }
  return base;
}

async function isCompanyOwner(userId, companyId) {
  const company = await Company.findById(companyId);
  if (!company) return false;
  const member = company.members.find(m => m.user?.toString() === userId.toString());
  return member?.roleInCompany === 'Owner';
}

async function executeOnComplete(skill, collected, user) {
  const action = skill.onComplete?.action;
  if (!action || action === 'none') return { success: true };

  try {
    if (action === 'createCompany') {
      if (user.companyId) return { success: false, error: 'User already has company' };

      const company = new Company({
        companyName: collected.companyName,
        companyEmail: collected.companyEmail || '',
        companyPhone: collected.companyPhone || '',
        companyWebsite: collected.companyWebsite || '',
        type: collected.type || 'Business',
        industry: collected.industry || '',
        size: collected.size || '1-10',
        description: collected.description || '',
        address: collected.address || '',
        companyCity: collected.companyCity || '',
        companyState: collected.companyState || '',
        companyCountry: collected.companyCountry || '',
        companyZipCode: collected.companyZipCode || '',
        gstin: collected.gstin || '',
        owner: user._id,
        members: [{ user: user._id, roleInCompany: 'Owner', joinedAt: new Date() }],
        subscription: { plan: 'Trial', status: 'inactive', startDate: new Date() },
      });
      await company.save();

      const u = await User.findById(user._id);
      u.companyId = company._id;
      await u.save();

      return { success: true, companyId: company._id.toString() };
    }

    if (action === 'updateCompany') {
      if (!user.companyId) return { success: false, error: 'No company' };
      const updates = {};
      for (const [k, v] of Object.entries(collected)) {
        if (v !== null && v !== undefined && v !== '') updates[k] = v;
      }
      await Company.findByIdAndUpdate(user.companyId, { $set: updates });
      return { success: true };
    }

    if (action === 'updateUser') {
      const updates = {};
      for (const [k, v] of Object.entries(collected)) {
        if (v !== null && v !== undefined && v !== '') updates[k] = v;
      }
      await User.findByIdAndUpdate(user._id, { $set: updates });
      return { success: true };
    }

    return { success: true };
  } catch (err) {
    console.error('[SkillRunner] onComplete error:', err);
    return { success: false, error: err.message };
  }
}

function formatQuestion(q) {
  if (!q) return null;
  return {
    id: q.id,
    type: q.type,
    options: q.options,
    placeholder: q.placeholder,
    uiAction: q.uiAction,
    skippable: q.skippable || !q.required,
    required: q.required,
  };
}

// Update analytics asynchronously (fire-and-forget)
function updateAnalytics(session, skill, auditEntries) {
  setImmediate(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      let analytics = await SkillAnalytics.findOne({ skillId: skill._id, companyId: skill.companyId || null });

      if (!analytics) {
        analytics = new SkillAnalytics({
          skillId: skill._id,
          slug: skill.slug,
          companyId: skill.companyId || null,
          fieldStats: skill.questions.map(q => ({ fieldPath: q.fieldPath })),
        });
      }

      // Session-level metrics
      if (session.complete) {
        analytics.completedSessions += 1;
        const durationMs = new Date(session.lastActiveAt) - new Date(session.createdAt);
        analytics.totalDurationMs += durationMs;
        analytics.avgDurationMs = analytics.totalDurationMs / analytics.completedSessions;
        analytics.totalTurns += session.turnCount || 0;
        analytics.avgTurns = analytics.totalTurns / analytics.completedSessions;
      }

      if (session.resumed) {
        analytics.resumedSessions += 1;
      }

      // Process audit entries
      for (const entry of auditEntries) {
        // Confidence buckets
        if (entry.confidence >= 0.85) analytics.highConfidenceCount += 1;
        else if (entry.confidence >= 0.6) analytics.medConfidenceCount += 1;
        else if (entry.confidence > 0) analytics.lowConfidenceCount += 1;

        // Bulk tracking
        if (entry.method === 'bulk') {
          analytics.bulkExtractionCount += 1;
          analytics.bulkFieldsSaved += 1;
        }

        // Per-field stats
        if (entry.fieldPath) {
          let fs = analytics.fieldStats.find(f => f.fieldPath === entry.fieldPath);
          if (!fs) {
            analytics.fieldStats.push({ fieldPath: entry.fieldPath });
            fs = analytics.fieldStats[analytics.fieldStats.length - 1];
          }

          if (entry.method === 'skip') {
            fs.totalSkipped += 1;
          } else if (!entry.valid) {
            fs.totalRetries += 1;
          } else {
            fs.totalAnswered += 1;
            // Running average confidence
            const prevTotal = fs.totalAnswered - 1;
            fs.avgConfidence = prevTotal > 0
              ? (fs.avgConfidence * prevTotal + entry.confidence) / fs.totalAnswered
              : entry.confidence;

            // Extraction method counts
            if (entry.method && fs.extractionMethods[entry.method] !== undefined) {
              fs.extractionMethods[entry.method] += 1;
            }
          }
        }
      }

      // Overall avg confidence
      const totalWithConfidence = analytics.highConfidenceCount + analytics.medConfidenceCount + analytics.lowConfidenceCount;
      if (totalWithConfidence > 0) {
        const confEntries = auditEntries.filter(e => e.confidence > 0);
        if (confEntries.length > 0) {
          const newAvg = confEntries.reduce((s, e) => s + e.confidence, 0) / confEntries.length;
          analytics.avgConfidence = analytics.avgConfidence > 0
            ? (analytics.avgConfidence * 0.9 + newAvg * 0.1)
            : newAvg;
        }
      }

      // Daily snapshot
      let dayEntry = analytics.dailyStats.find(d => d.date === today);
      if (!dayEntry) {
        if (analytics.dailyStats.length >= 30) analytics.dailyStats.shift();
        analytics.dailyStats.push({ date: today, sessions: 0, completions: 0, avgConfidence: 0 });
        dayEntry = analytics.dailyStats[analytics.dailyStats.length - 1];
      }
      dayEntry.sessions += 1;
      if (session.complete) dayEntry.completions += 1;
      const confEntries = auditEntries.filter(e => e.confidence > 0);
      if (confEntries.length > 0) {
        const dayAvg = confEntries.reduce((s, e) => s + e.confidence, 0) / confEntries.length;
        dayEntry.avgConfidence = dayEntry.avgConfidence > 0
          ? (dayEntry.avgConfidence + dayAvg) / 2
          : dayAvg;
      }

      analytics.lastUpdated = new Date();
      await analytics.save();
    } catch (err) {
      console.error('[SkillAnalytics] update error:', err.message);
    }
  });
}

// ===== ROUTES =====

// Start or resume a skill session
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { slug, sessionId } = req.body;
    if (!slug || !sessionId) {
      return res.status(400).json({ success: false, message: 'slug and sessionId required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const skill = await loadSkill(slug, user.companyId, user._id.toString());
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    if (skill.onComplete?.action === 'createCompany' && user.companyId) {
      return res.json({
        success: true,
        alreadyComplete: true,
        redirect: skill.onComplete.redirect || '/dashboard',
      });
    }

    let session = await SkillSession.findOne({ sessionId, userId: user._id, slug });
    let resumed = false;

    if (!session) {
      const existing = await SkillSession.findOne({
        userId: user._id,
        slug,
        complete: false,
      }).sort({ lastActiveAt: -1 });

      if (existing) {
        existing.sessionId = sessionId;
        existing.lastActiveAt = new Date();
        existing.resumed = true;
        await existing.save();
        session = existing;
        resumed = true;
      } else {
        session = await SkillSession.create({
          sessionId,
          userId: user._id,
          slug,
          skillId: skill._id,
          collected: {},
          skipped: [],
          audit: [],
          currentQuestionId: null,
          turnCount: 0,
        });

        // Count new session in analytics
        await SkillAnalytics.findOneAndUpdate(
          { skillId: skill._id, companyId: skill.companyId || null },
          { $inc: { totalSessions: 1 }, $setOnInsert: { slug: skill.slug, fieldStats: skill.questions.map(q => ({ fieldPath: q.fieldPath })) } },
          { upsert: true }
        );
      }
    } else {
      session.lastActiveAt = new Date();
      if (session.complete) {
        session.collected = {};
        session.skipped = [];
        session.audit = [];
        session.currentQuestionId = null;
        session.complete = false;
        session.turnCount = 0;
        session.avgConfidence = 0;
      } else {
        resumed = Object.keys(session.collected || {}).length > 0;
        if (resumed) session.resumed = true;
      }
      await session.save();
    }

    const result = await runSkillTurn({
      skill,
      session: { collected: session.collected, skipped: session.skipped, currentQuestionId: session.currentQuestionId },
      userMsg: '',
      model: null,
      conversationHistory: [],
    });

    session.currentQuestionId = result.currentQuestionId;
    session.collected = result.collected;
    session.skipped = result.skipped || [];
    session.complete = result.complete || false;
    session.lastActiveAt = new Date();
    await session.save();

    const question = skill.questions.find(q => q.id === result.currentQuestionId);

    res.json({
      success: true,
      reply: result.reply,
      currentQuestionId: result.currentQuestionId,
      question: formatQuestion(question),
      collected: result.collected,
      skipped: result.skipped,
      complete: false,
      resumed,
      skillName: skill.name,
      progress: {
        total: skill.questions.length,
        answered: Object.keys(result.collected).length,
        skipped: (result.skipped || []).length,
      },
    });
  } catch (err) {
    console.error('[NoxtmSkills] start error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Chat turn
router.post('/chat', chatLimiter, authenticateToken, async (req, res) => {
  try {
    const { sessionId, message, conversationHistory = [] } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required' });

    const session = await SkillSession.findOne({ sessionId, userId: req.user.userId });
    if (!session) return res.status(404).json({ success: false, message: 'Session expired. Please restart.' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const skill = await loadSkill(session.slug, user.companyId, user._id.toString());
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    const prevCollectedKeys = Object.keys(session.collected || {});
    const turnNumber = (session.turnCount || 0) + 1;

    const result = await runSkillTurn({
      skill,
      session: { collected: session.collected, skipped: session.skipped, currentQuestionId: session.currentQuestionId },
      userMsg: message || '',
      model: null,
      conversationHistory,
    });

    const newKeys = Object.keys(result.collected).filter(k => !prevCollectedKeys.includes(k));

    // Append audit entries
    const auditEntries = (result.turnAudit || []).map(a => ({
      ...a,
      turn: turnNumber,
      timestamp: new Date(),
    }));
    session.audit = [...(session.audit || []), ...auditEntries];

    // Compute session avg confidence
    const validAudits = session.audit.filter(a => a.valid && a.confidence > 0);
    session.avgConfidence = validAudits.length > 0
      ? validAudits.reduce((s, a) => s + a.confidence, 0) / validAudits.length
      : 0;

    session.currentQuestionId = result.currentQuestionId;
    session.collected = result.collected;
    session.skipped = result.skipped || [];
    session.complete = result.complete || false;
    session.turnCount = turnNumber;
    session.lastActiveAt = new Date();
    await session.save();

    // Fire analytics update
    if (auditEntries.length > 0 || result.complete) {
      updateAnalytics(session, skill, auditEntries);
    }

    let completionResult = null;
    if (result.complete) {
      completionResult = await executeOnComplete(skill, result.collected, user);
    }

    const question = skill.questions.find(q => q.id === result.currentQuestionId);

    // Build confidence info for the turn
    const turnConfidence = auditEntries.length > 0
      ? {
          avg: Math.round((auditEntries.reduce((s, a) => s + a.confidence, 0) / auditEntries.length) * 100) / 100,
          methods: auditEntries.map(a => a.method),
        }
      : null;

    res.json({
      success: true,
      reply: result.reply,
      currentQuestionId: result.currentQuestionId,
      question: formatQuestion(question),
      collected: result.collected,
      skipped: result.skipped,
      newlyExtracted: newKeys,
      bulkExtraction: newKeys.length >= 2,
      confidence: turnConfidence,
      complete: result.complete,
      onComplete: result.complete ? {
        action: result.onComplete?.action,
        redirect: result.onComplete?.redirect,
        result: completionResult,
      } : null,
      progress: {
        total: skill.questions.length,
        answered: Object.keys(result.collected).length,
        skipped: (result.skipped || []).length,
      },
    });
  } catch (err) {
    console.error('[NoxtmSkills] chat error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== ANALYTICS ROUTES =====

// Get analytics for a skill
router.get('/analytics/:skillId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const skill = await NoxtmSkill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    // Only admin or company owner can view analytics
    if (!skill.companyId) {
      if (user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Admin only' });
    } else {
      if (skill.companyId.toString() !== user.companyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Not your skill' });
      }
    }

    const analytics = await SkillAnalytics.findOne({ skillId: skill._id });
    if (!analytics) {
      return res.json({ success: true, analytics: null, message: 'No data yet' });
    }

    res.json({ success: true, analytics });
  } catch (err) {
    console.error('[NoxtmSkills] analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get audit trail for a specific session
router.get('/audit/:sessionId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Admin can view any session, others can only view their own
    const query = { sessionId: req.params.sessionId };
    if (user.role !== 'Admin') query.userId = user._id;

    const session = await SkillSession.findOne(query).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    res.json({
      success: true,
      audit: session.audit || [],
      meta: {
        sessionId: session.sessionId,
        slug: session.slug,
        turnCount: session.turnCount,
        avgConfidence: session.avgConfidence,
        complete: session.complete,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        collected: session.collected,
        skipped: session.skipped,
      },
    });
  } catch (err) {
    console.error('[NoxtmSkills] audit error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List recent sessions for a skill (admin view)
router.get('/sessions/:slug', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'Admin' && !(user.companyId && await isCompanyOwner(user._id, user.companyId))) {
      return res.status(403).json({ success: false, message: 'Admin or Owner only' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { slug: req.params.slug };
    // Company owners see only their company's sessions
    if (user.role !== 'Admin' && user.companyId) {
      const companyUsers = await User.find({ companyId: user.companyId }).select('_id').lean();
      query.userId = { $in: companyUsers.map(u => u._id) };
    }

    const [sessions, total] = await Promise.all([
      SkillSession.find(query)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('sessionId userId slug turnCount complete avgConfidence resumed createdAt lastActiveAt collected skipped')
        .populate('userId', 'fullName email')
        .lean(),
      SkillSession.countDocuments(query),
    ]);

    res.json({
      success: true,
      sessions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('[NoxtmSkills] sessions list error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Abandon / reset a session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await SkillSession.findOne({ sessionId: req.params.sessionId, userId: req.user.userId });
    if (session && !session.complete) {
      // Track abandonment in analytics
      const skill = await NoxtmSkill.findById(session.skillId);
      if (skill) {
        await SkillAnalytics.findOneAndUpdate(
          { skillId: skill._id, companyId: skill.companyId || null },
          { $inc: { abandonedSessions: 1 } }
        );
      }
    }
    await SkillSession.deleteOne({ sessionId: req.params.sessionId, userId: req.user.userId });
    res.json({ success: true });
  } catch (err) {
    console.error('[NoxtmSkills] session delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== SKILL CRUD =====

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { trigger } = req.query;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const query = { enabled: true };
    if (trigger) query.trigger = trigger;

    const globalSkills = await NoxtmSkill.find({ ...query, companyId: null }).sort({ priority: 1 });
    const companySkills = user.companyId
      ? await NoxtmSkill.find({ ...query, companyId: user.companyId }).sort({ priority: 1 })
      : [];

    const bySlug = new Map();
    for (const s of globalSkills) bySlug.set(s.slug, s);
    for (const s of companySkills) bySlug.set(s.slug, s);

    res.json({ success: true, skills: Array.from(bySlug.values()) });
  } catch (err) {
    console.error('[NoxtmSkills] list error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const skill = await NoxtmSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    res.json({ success: true, skill });
  } catch (err) {
    console.error('[NoxtmSkills] get error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) {
      return res.status(403).json({ success: false, message: 'Company required' });
    }
    if (!(await isCompanyOwner(user._id, user.companyId))) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const body = { ...req.body, companyId: user.companyId, isBuiltIn: false, updatedBy: user._id };
    const skill = new NoxtmSkill(body);
    await skill.save();
    res.json({ success: true, skill });
  } catch (err) {
    console.error('[NoxtmSkills] create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const skill = await NoxtmSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    if (!skill.companyId) {
      if (user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Admin only' });
    } else {
      if (skill.companyId.toString() !== user.companyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Not your skill' });
      }
      if (!(await isCompanyOwner(user._id, user.companyId))) {
        return res.status(403).json({ success: false, message: 'Owner only' });
      }
    }

    const { isBuiltIn, companyId, ...updates } = req.body;
    updates.updatedBy = user._id;
    updates.version = (skill.version || 1) + 1;

    Object.assign(skill, updates);
    await skill.save();
    res.json({ success: true, skill });
  } catch (err) {
    console.error('[NoxtmSkills] update error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const skill = await NoxtmSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (skill.isBuiltIn) return res.status(400).json({ success: false, message: 'Cannot delete built-in skill' });

    if (!skill.companyId) {
      if (user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Admin only' });
    } else {
      if (skill.companyId.toString() !== user.companyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Not your skill' });
      }
      if (!(await isCompanyOwner(user._id, user.companyId))) {
        return res.status(403).json({ success: false, message: 'Owner only' });
      }
    }

    await skill.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('[NoxtmSkills] delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/fork', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) {
      return res.status(403).json({ success: false, message: 'Company required' });
    }
    if (!(await isCompanyOwner(user._id, user.companyId))) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const source = await NoxtmSkill.findById(req.params.id);
    if (!source) return res.status(404).json({ success: false, message: 'Skill not found' });

    const clone = new NoxtmSkill({
      companyId: user.companyId,
      slug: source.slug,
      name: source.name,
      description: source.description,
      enabled: source.enabled,
      isBuiltIn: false,
      trigger: source.trigger,
      priority: source.priority,
      targetModel: source.targetModel,
      systemPrompt: source.systemPrompt,
      questions: source.questions,
      onComplete: source.onComplete,
      version: 1,
      updatedBy: user._id,
    });
    await clone.save();
    res.json({ success: true, skill: clone });
  } catch (err) {
    console.error('[NoxtmSkills] fork error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ===== EXPORT / IMPORT =====

// Export a skill as JSON template
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const skill = await NoxtmSkill.findById(req.params.id).lean();
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });

    // Strip internal fields
    const { _id, __v, companyId, updatedBy, createdAt, updatedAt, downloads, isPublished, ...template } = skill;
    template.exportedAt = new Date().toISOString();
    template.exportVersion = 1;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="skill-${skill.slug}.json"`);
    res.json({ success: true, template });
  } catch (err) {
    console.error('[NoxtmSkills] export error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Import a skill from JSON template
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) {
      return res.status(403).json({ success: false, message: 'Company required' });
    }
    if (!(await isCompanyOwner(user._id, user.companyId))) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const { template } = req.body;
    if (!template || !template.slug || !template.name) {
      return res.status(400).json({ success: false, message: 'Invalid template: slug and name required' });
    }

    // Check for existing skill with same slug in company
    const existing = await NoxtmSkill.findOne({ slug: template.slug, companyId: user.companyId });
    if (existing) {
      return res.status(409).json({ success: false, message: `Skill with slug "${template.slug}" already exists. Rename or delete it first.` });
    }

    const { exportedAt, exportVersion, isBuiltIn, variantOf, ...clean } = template;
    const skill = new NoxtmSkill({
      ...clean,
      companyId: user.companyId,
      isBuiltIn: false,
      variantOf: null,
      updatedBy: user._id,
      version: 1,
    });
    await skill.save();
    res.json({ success: true, skill });
  } catch (err) {
    console.error('[NoxtmSkills] import error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ===== A/B VARIANTS =====

// Create a variant of a skill
router.post('/:id/variant', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const base = await NoxtmSkill.findById(req.params.id);
    if (!base) return res.status(404).json({ success: false, message: 'Skill not found' });

    // Must be admin (global) or owner (company)
    if (!base.companyId) {
      if (user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Admin only' });
    } else {
      if (base.companyId.toString() !== user.companyId?.toString()) {
        return res.status(403).json({ success: false, message: 'Not your skill' });
      }
      if (!(await isCompanyOwner(user._id, user.companyId))) {
        return res.status(403).json({ success: false, message: 'Owner only' });
      }
    }

    // Can't create variant of a variant
    if (base.variantOf) {
      return res.status(400).json({ success: false, message: 'Cannot create variant of a variant. Use the base skill.' });
    }

    const variantName = req.body.variantName || `Variant ${Date.now().toString(36)}`;
    const trafficPercent = Math.min(100, Math.max(0, parseInt(req.body.trafficPercent) || 50));

    // Generate unique slug for variant
    const variantSlug = `${base.slug}__${variantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;

    const variant = new NoxtmSkill({
      companyId: base.companyId,
      slug: variantSlug,
      name: `${base.name} — ${variantName}`,
      description: req.body.description || base.description,
      enabled: true,
      isBuiltIn: false,
      trigger: base.trigger,
      priority: base.priority,
      targetModel: base.targetModel,
      systemPrompt: req.body.systemPrompt || base.systemPrompt,
      questions: req.body.questions || base.questions,
      onComplete: req.body.onComplete || base.onComplete,
      variantOf: base._id,
      variantName,
      trafficPercent,
      version: 1,
      updatedBy: user._id,
    });
    await variant.save();

    // Adjust base traffic to accommodate variant
    const allVariants = await NoxtmSkill.find({ variantOf: base._id, enabled: true });
    const variantTotal = allVariants.reduce((s, v) => s + (v.trafficPercent || 0), 0);
    const baseTraffic = Math.max(0, 100 - variantTotal);
    base.trafficPercent = baseTraffic;
    await base.save();

    res.json({ success: true, variant, baseTrafficPercent: baseTraffic });
  } catch (err) {
    console.error('[NoxtmSkills] variant create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// List variants for a skill
router.get('/:id/variants', authenticateToken, async (req, res) => {
  try {
    const base = await NoxtmSkill.findById(req.params.id);
    if (!base) return res.status(404).json({ success: false, message: 'Skill not found' });

    const variants = await NoxtmSkill.find({ variantOf: base._id }).sort({ createdAt: 1 });

    // Pull analytics for comparison
    const ids = [base._id, ...variants.map(v => v._id)];
    const analytics = await SkillAnalytics.find({ skillId: { $in: ids } }).lean();
    const analyticsMap = {};
    for (const a of analytics) analyticsMap[a.skillId.toString()] = a;

    const comparison = [base, ...variants].map(s => ({
      _id: s._id,
      name: s.name,
      variantName: s.variantName || 'Control',
      trafficPercent: s.trafficPercent || 0,
      enabled: s.enabled,
      isBase: !s.variantOf,
      analytics: analyticsMap[s._id.toString()] ? {
        totalSessions: analyticsMap[s._id.toString()].totalSessions,
        completedSessions: analyticsMap[s._id.toString()].completedSessions,
        completionRate: analyticsMap[s._id.toString()].totalSessions > 0
          ? Math.round((analyticsMap[s._id.toString()].completedSessions / analyticsMap[s._id.toString()].totalSessions) * 100)
          : 0,
        avgConfidence: analyticsMap[s._id.toString()].avgConfidence,
        avgTurns: analyticsMap[s._id.toString()].avgTurns,
      } : null,
    }));

    res.json({ success: true, base: base._id, variants: comparison });
  } catch (err) {
    console.error('[NoxtmSkills] variants list error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== MARKETPLACE =====

// Browse published skills (public, no auth required for listing)
router.get('/marketplace/browse', async (req, res) => {
  try {
    const { tag, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isPublished: true, companyId: null, variantOf: null };
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const [skills, total] = await Promise.all([
      NoxtmSkill.find(query)
        .sort({ downloads: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('slug name description trigger targetModel tags author downloads version questions onComplete')
        .lean(),
      NoxtmSkill.countDocuments(query),
    ]);

    // Add question count
    const items = skills.map(s => ({
      ...s,
      questionCount: s.questions?.length || 0,
      questions: undefined,
    }));

    res.json({ success: true, skills: items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('[NoxtmSkills] marketplace error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Publish a skill to marketplace (admin only, global skills only)
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const skill = await NoxtmSkill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (skill.companyId) return res.status(400).json({ success: false, message: 'Only global skills can be published' });

    skill.isPublished = true;
    skill.author = req.body.author || user.fullName || 'Noxtm Team';
    skill.tags = req.body.tags || skill.tags || [];
    await skill.save();

    res.json({ success: true, skill });
  } catch (err) {
    console.error('[NoxtmSkills] publish error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Install a marketplace skill into company
router.post('/marketplace/install/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) {
      return res.status(403).json({ success: false, message: 'Company required' });
    }
    if (!(await isCompanyOwner(user._id, user.companyId))) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const source = await NoxtmSkill.findById(req.params.id);
    if (!source || !source.isPublished) {
      return res.status(404).json({ success: false, message: 'Published skill not found' });
    }

    // Check for existing
    const existing = await NoxtmSkill.findOne({ slug: source.slug, companyId: user.companyId });
    if (existing) {
      return res.status(409).json({ success: false, message: `Skill "${source.slug}" already installed` });
    }

    const installed = new NoxtmSkill({
      companyId: user.companyId,
      slug: source.slug,
      name: source.name,
      description: source.description,
      enabled: true,
      isBuiltIn: false,
      trigger: source.trigger,
      priority: source.priority,
      targetModel: source.targetModel,
      systemPrompt: source.systemPrompt,
      questions: source.questions,
      onComplete: source.onComplete,
      author: source.author,
      tags: source.tags,
      version: 1,
      updatedBy: user._id,
    });
    await installed.save();

    // Increment download count
    await NoxtmSkill.findByIdAndUpdate(source._id, { $inc: { downloads: 1 } });

    res.json({ success: true, skill: installed });
  } catch (err) {
    console.error('[NoxtmSkills] install error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
