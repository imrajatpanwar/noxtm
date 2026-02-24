const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Bot detection patterns
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /discordbot/i, /slackbot/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /applebot/i, /petalbot/i, /bytespider/i
];

function detectBot(userAgent) {
  if (!userAgent) return { isBot: true, reason: 'No user agent' };
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, reason: `Matched: ${pattern.source}` };
    }
  }
  return { isBot: false, reason: '' };
}

function parseUserAgent(ua) {
  if (!ua) return { browser: { name: 'Unknown', version: '' }, os: { name: 'Unknown', version: '' }, device: { type: 'Unknown', vendor: '', model: '' } };

  let browser = { name: 'Unknown', version: '' };
  let os = { name: 'Unknown', version: '' };
  let device = { type: 'Desktop', vendor: '', model: '' };

  // Browser detection
  if (/Edg\/([\d.]+)/.test(ua)) { browser = { name: 'Edge', version: RegExp.$1 }; }
  else if (/OPR\/([\d.]+)/.test(ua)) { browser = { name: 'Opera', version: RegExp.$1 }; }
  else if (/Chrome\/([\d.]+)/.test(ua)) { browser = { name: 'Chrome', version: RegExp.$1 }; }
  else if (/Firefox\/([\d.]+)/.test(ua)) { browser = { name: 'Firefox', version: RegExp.$1 }; }
  else if (/Safari\/([\d.]+)/.test(ua) && /Version\/([\d.]+)/.test(ua)) { browser = { name: 'Safari', version: RegExp.$1 }; }
  else if (/MSIE ([\d.]+)/.test(ua) || /Trident.*rv:([\d.]+)/.test(ua)) { browser = { name: 'IE', version: RegExp.$1 }; }

  // OS detection
  if (/Windows NT ([\d.]+)/.test(ua)) {
    const v = RegExp.$1;
    const winMap = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    os = { name: 'Windows', version: winMap[v] || v };
  } else if (/Mac OS X ([\d_]+)/.test(ua)) {
    os = { name: 'macOS', version: RegExp.$1.replace(/_/g, '.') };
  } else if (/Android ([\d.]+)/.test(ua)) {
    os = { name: 'Android', version: RegExp.$1 };
  } else if (/iPhone OS ([\d_]+)/.test(ua)) {
    os = { name: 'iOS', version: RegExp.$1.replace(/_/g, '.') };
  } else if (/Linux/.test(ua)) {
    os = { name: 'Linux', version: '' };
  } else if (/CrOS/.test(ua)) {
    os = { name: 'ChromeOS', version: '' };
  }

  // Device detection
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) {
    device.type = 'Mobile';
  } else if (/Tablet|iPad|Android(?!.*Mobile)/.test(ua)) {
    device.type = 'Tablet';
  }

  return { browser, os, device };
}

// Optional auth middleware - extracts user if token exists but doesn't require it
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      decoded._id = decoded._id || decoded.userId;
      decoded.userId = decoded.userId || decoded._id;
      decoded.companyId = decoded.companyId || decoded.company;
      req.user = decoded;
    } catch (e) {
      // Token invalid, continue without user
    }
  }
  next();
}

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    decoded._id = decoded._id || decoded.userId;
    decoded.userId = decoded.userId || decoded._id;
    decoded.companyId = decoded.companyId || decoded.company;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ==========================================
// POST /api/visitors/track - Track a visitor
// ==========================================
router.post('/track', optionalAuth, async (req, res) => {
  try {
    const {
      fingerprint, screenResolution, language, platform,
      referrer, pageUrl, timezone
    } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ success: false, message: 'Fingerprint is required' });
    }

    // Get company ID from authenticated user, or use a default tracking company
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const ua = req.headers['user-agent'] || '';
    const { isBot, reason: botReason } = detectBot(ua);
    const { browser, os, device } = parseUserAgent(ua);

    // Get IP from request
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.ip || 'Unknown';

    // Try to get location from IP using free API (non-blocking)
    let location = { country: 'Unknown', region: '', city: '', timezone: timezone || '' };
    try {
      const http = require('http');
      const geoData = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 2000);
        http.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city,timezone`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            clearTimeout(timeout);
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        }).on('error', (e) => { clearTimeout(timeout); reject(e); });
      });
      if (geoData.country) {
        location = {
          country: geoData.country || 'Unknown',
          region: geoData.regionName || '',
          city: geoData.city || '',
          timezone: geoData.timezone || timezone || ''
        };
      }
    } catch (e) {
      // Geo lookup failed, use defaults
    }

    // Check if visitor with same fingerprint already exists for this company
    const existingVisitor = await Visitor.findOne({ fingerprint, companyId });

    if (existingVisitor) {
      // Update existing visitor
      existingVisitor.lastSeenAt = new Date();
      existingVisitor.isOnline = true;
      existingVisitor.sessionCount += 1;
      existingVisitor.ip = ip;
      existingVisitor.pageUrl = pageUrl || existingVisitor.pageUrl;
      existingVisitor.referrer = referrer || existingVisitor.referrer;
      existingVisitor.location = location;
      if (req.user?.userId) existingVisitor.userId = req.user.userId;
      await existingVisitor.save();

      return res.json({ success: true, visitor: existingVisitor, isNew: false });
    }

    // Create new visitor
    const visitor = new Visitor({
      fingerprint,
      companyId,
      userId: req.user?.userId || null,
      ip,
      userAgent: ua,
      browser,
      os,
      device,
      location,
      isBot,
      botReason,
      screenResolution: screenResolution || '',
      language: language || '',
      platform: platform || '',
      referrer: referrer || '',
      pageUrl: pageUrl || '',
      isOnline: true,
      lastSeenAt: new Date()
    });

    await visitor.save();
    return res.json({ success: true, visitor, isNew: true });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// POST /api/visitors/heartbeat - Keep alive
// ==========================================
router.post('/heartbeat', optionalAuth, async (req, res) => {
  try {
    const { fingerprint } = req.body;
    const companyId = req.user?.companyId;
    if (!fingerprint || !companyId) {
      return res.status(400).json({ success: false });
    }

    await Visitor.findOneAndUpdate(
      { fingerprint, companyId },
      { lastSeenAt: new Date(), isOnline: true },
      { new: true }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

// ==========================================
// POST /api/visitors/offline - Mark offline
// ==========================================
router.post('/offline', optionalAuth, async (req, res) => {
  try {
    const { fingerprint } = req.body;
    const companyId = req.user?.companyId;
    if (!fingerprint || !companyId) {
      return res.status(400).json({ success: false });
    }

    await Visitor.findOneAndUpdate(
      { fingerprint, companyId },
      { isOnline: false, lastSeenAt: new Date() }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

// ==========================================
// GET /api/visitors - Get all visitors (authenticated)
// ==========================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const { page = 1, limit = 50, search, filter, sort = 'lastSeenAt', order = 'desc' } = req.query;
    const query = { companyId };

    // Filters
    if (filter === 'online') query.isOnline = true;
    else if (filter === 'offline') query.isOnline = false;
    else if (filter === 'bot') query.isBot = true;
    else if (filter === 'human') query.isBot = false;

    // Search
    if (search) {
      query.$or = [
        { ip: { $regex: search, $options: 'i' } },
        { 'browser.name': { $regex: search, $options: 'i' } },
        { 'os.name': { $regex: search, $options: 'i' } },
        { 'location.country': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'device.type': { $regex: search, $options: 'i' } },
        { fingerprint: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [visitors, total] = await Promise.all([
      Visitor.find(query)
        .populate('userId', 'fullName email profileImage')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Visitor.countDocuments(query)
    ]);

    return res.json({
      success: true,
      visitors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// GET /api/visitors/stats - Get visitor statistics
// ==========================================
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const mongoose = require('mongoose');
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Mark visitors offline if not seen for 5 minutes
    await Visitor.updateMany(
      { companyId, isOnline: true, lastSeenAt: { $lt: new Date(now.getTime() - 5 * 60 * 1000) } },
      { isOnline: false }
    );

    const [totalVisitors, onlineNow, totalBots, totalHumans, todayVisitors, last7DaysVisitors, last30DaysVisitors, browserStats, osStats, deviceStats, countryStats] = await Promise.all([
      Visitor.countDocuments({ companyId: companyObjId }),
      Visitor.countDocuments({ companyId: companyObjId, isOnline: true }),
      Visitor.countDocuments({ companyId: companyObjId, isBot: true }),
      Visitor.countDocuments({ companyId: companyObjId, isBot: false }),
      Visitor.countDocuments({ companyId: companyObjId, lastSeenAt: { $gte: today } }),
      Visitor.countDocuments({ companyId: companyObjId, lastSeenAt: { $gte: last7Days } }),
      Visitor.countDocuments({ companyId: companyObjId, lastSeenAt: { $gte: last30Days } }),
      Visitor.aggregate([
        { $match: { companyId: companyObjId } },
        { $group: { _id: '$browser.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Visitor.aggregate([
        { $match: { companyId: companyObjId } },
        { $group: { _id: '$os.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Visitor.aggregate([
        { $match: { companyId: companyObjId } },
        { $group: { _id: '$device.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Visitor.aggregate([
        { $match: { companyId: companyObjId } },
        { $group: { _id: '$location.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
    ]);

    return res.json({
      success: true,
      stats: {
        totalVisitors,
        onlineNow,
        totalBots,
        totalHumans,
        todayVisitors,
        last7DaysVisitors,
        last30DaysVisitors,
        browserStats,
        osStats,
        deviceStats,
        countryStats
      }
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// DELETE /api/visitors/:id - Delete a visitor record
// ==========================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const visitor = await Visitor.findOneAndDelete({ _id: req.params.id, companyId });
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }
    return res.json({ success: true, message: 'Visitor deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
