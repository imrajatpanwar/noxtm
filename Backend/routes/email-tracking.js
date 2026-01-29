const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmailTracking = require('../models/EmailTracking');
const Campaign = require('../models/Campaign');
const { generateTrackingId, processEmailForTracking } = require('../utils/emailTrackingInjector');

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Simple user agent parser
const parseUserAgent = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  
  let device = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'tablet';
  }
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('outlook') || ua.includes('microsoft')) browser = 'Outlook';
  else if (ua.includes('gmail')) browser = 'Gmail';
  
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'MacOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { device, browser, os };
};

// TRACKING PIXEL ENDPOINT - Called when email is opened
router.get('/pixel/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    
    const deviceInfo = parseUserAgent(userAgent);
    
    const tracking = await EmailTracking.findOne({ trackingId });
    
    if (tracking) {
      const isFirstOpen = !tracking.opened;
      
      tracking.openEvents.push({
        timestamp: new Date(),
        ip: ip,
        userAgent: userAgent,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: { country: 'Unknown', city: 'Unknown' }
      });
      
      tracking.opened = true;
      tracking.openCount += 1;
      
      if (isFirstOpen) {
        tracking.openedAt = new Date();
        tracking.status = 'opened';
        
        // Update campaign stats
        await Campaign.findByIdAndUpdate(tracking.campaignId, {
          $inc: { 'stats.opened': 1 }
        });
      }
      
      await tracking.save();
    }
    
    // Return transparent 1x1 GIF
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(TRACKING_PIXEL);
  } catch (err) {
    console.error('Tracking pixel error:', err);
    res.set('Content-Type', 'image/gif');
    res.send(TRACKING_PIXEL);
  }
});

// LINK CLICK TRACKING
router.get('/click/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    
    if (!url) {
      return res.status(400).send('Missing URL');
    }
    
    const tracking = await EmailTracking.findOne({ trackingId });
    
    if (tracking) {
      const isFirstClick = !tracking.clicked;
      
      tracking.clickEvents.push({
        timestamp: new Date(),
        url: decodeURIComponent(url),
        ip: ip,
        userAgent: userAgent
      });
      
      tracking.clicked = true;
      tracking.clickCount += 1;
      
      if (isFirstClick) {
        tracking.clickedAt = new Date();
        tracking.status = 'clicked';
        
        // Update campaign stats
        await Campaign.findByIdAndUpdate(tracking.campaignId, {
          $inc: { 'stats.clicked': 1 }
        });
      }
      
      await tracking.save();
    }
    
    res.redirect(decodeURIComponent(url));
  } catch (err) {
    console.error('Click tracking error:', err);
    if (req.query.url) {
      res.redirect(decodeURIComponent(req.query.url));
    } else {
      res.status(500).send('Error');
    }
  }
});

// UNSUBSCRIBE ENDPOINT
router.get('/unsubscribe/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const tracking = await EmailTracking.findOne({ trackingId });
    
    if (tracking) {
      tracking.unsubscribed = true;
      tracking.unsubscribedAt = new Date();
      tracking.status = 'unsubscribed';
      await tracking.save();
      
      await Campaign.findByIdAndUpdate(tracking.campaignId, {
        $inc: { 'stats.unsubscribed': 1 }
      });
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 display: flex; justify-content: center; align-items: center; height: 100vh; 
                 margin: 0; background: #f5f5f5; }
          .container { text-align: center; background: white; padding: 40px 60px; 
                       border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
          p { color: #666; margin: 0; }
          .checkmark { font-size: 48px; margin-bottom: 20px; color: #22c55e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>You've been unsubscribed</h1>
          <p>You will no longer receive emails from this campaign.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).send('Error processing unsubscribe request');
  }
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// CREATE TRACKING RECORD
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { campaignId, recipientEmail } = req.body;
    const companyId = req.user.companyId;
    
    const trackingId = generateTrackingId();
    
    const tracking = new EmailTracking({
      campaignId,
      recipientEmail,
      trackingId,
      companyId,
      status: 'pending'
    });
    
    await tracking.save();
    
    const API_URL = process.env.API_URL || 'http://localhost:5000';
    
    res.json({
      success: true,
      trackingId,
      pixelUrl: `${API_URL}/api/tracking/pixel/${trackingId}`,
      unsubscribeUrl: `${API_URL}/api/tracking/unsubscribe/${trackingId}`
    });
  } catch (err) {
    console.error('Create tracking error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE BULK TRACKING RECORDS
router.post('/create-bulk', isAuthenticated, async (req, res) => {
  try {
    const { campaignId, recipients } = req.body;
    const companyId = req.user.companyId;
    
    const trackingRecords = recipients.map(email => ({
      campaignId,
      recipientEmail: email,
      trackingId: generateTrackingId(),
      companyId,
      status: 'pending'
    }));
    
    await EmailTracking.insertMany(trackingRecords);
    
    // Return mapping of email to trackingId
    const trackingMap = {};
    trackingRecords.forEach(record => {
      trackingMap[record.recipientEmail] = record.trackingId;
    });
    
    res.json({
      success: true,
      count: trackingRecords.length,
      trackingMap
    });
  } catch (err) {
    console.error('Create bulk tracking error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET CAMPAIGN TRACKING STATS
router.get('/campaign/:campaignId/stats', isAuthenticated, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const stats = await EmailTracking.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $ne: ['$sentAt', null] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          opened: { $sum: { $cond: ['$opened', 1, 0] } },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
          unsubscribed: { $sum: { $cond: ['$unsubscribed', 1, 0] } },
          totalOpens: { $sum: '$openCount' },
          totalClicks: { $sum: '$clickCount' }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0, sent: 0, delivered: 0, opened: 0, 
      clicked: 0, bounced: 0, unsubscribed: 0,
      totalOpens: 0, totalClicks: 0
    };
    
    result.openRate = result.sent > 0 ? ((result.opened / result.sent) * 100).toFixed(2) : 0;
    result.clickRate = result.opened > 0 ? ((result.clicked / result.opened) * 100).toFixed(2) : 0;
    result.bounceRate = result.sent > 0 ? ((result.bounced / result.sent) * 100).toFixed(2) : 0;
    
    res.json({ success: true, stats: result });
  } catch (err) {
    console.error('Get tracking stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET DETAILED TRACKING FOR A CAMPAIGN
router.get('/campaign/:campaignId/details', isAuthenticated, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 50, filter = 'all' } = req.query;
    
    let query = { campaignId: new mongoose.Types.ObjectId(campaignId) };
    
    switch (filter) {
      case 'opened':
        query.opened = true;
        break;
      case 'not-opened':
        query.opened = false;
        query.status = { $nin: ['pending', 'bounced'] };
        break;
      case 'clicked':
        query.clicked = true;
        break;
      case 'bounced':
        query.status = 'bounced';
        break;
      case 'unsubscribed':
        query.unsubscribed = true;
        break;
    }
    
    const tracking = await EmailTracking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await EmailTracking.countDocuments(query);
    
    res.json({
      success: true,
      data: tracking,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get tracking details error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ALL CAMPAIGNS ANALYTICS
router.get('/analytics/campaigns', isAuthenticated, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get all campaigns with their tracking stats
    const campaigns = await Campaign.find({
      companyId,
      createdAt: { $gte: startDate }
    })
    .select('name status stats trackingEnabled createdAt sentAt recipients')
    .sort({ createdAt: -1 })
    .lean();
    
    // Enrich with tracking data for tracked campaigns
    const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
      if (campaign.trackingEnabled) {
        const trackingStats = await EmailTracking.aggregate([
          { $match: { campaignId: campaign._id } },
          {
            $group: {
              _id: null,
              totalTracked: { $sum: 1 },
              opened: { $sum: { $cond: ['$opened', 1, 0] } },
              clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
              unsubscribed: { $sum: { $cond: ['$unsubscribed', 1, 0] } },
              bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } }
            }
          }
        ]);
        
        campaign.trackingStats = trackingStats[0] || { totalTracked: 0, opened: 0, clicked: 0, unsubscribed: 0, bounced: 0 };
      }
      
      return campaign;
    }));
    
    // Calculate overall stats
    const overallStats = {
      totalCampaigns: campaigns.length,
      totalTracked: campaigns.filter(c => c.trackingEnabled).length,
      totalNotTracked: campaigns.filter(c => !c.trackingEnabled).length,
      totalSent: campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0),
      totalOpened: enrichedCampaigns.reduce((acc, c) => acc + (c.trackingStats?.opened || 0), 0),
      totalClicked: enrichedCampaigns.reduce((acc, c) => acc + (c.trackingStats?.clicked || 0), 0),
      totalBounced: enrichedCampaigns.reduce((acc, c) => acc + (c.trackingStats?.bounced || 0), 0),
      totalUnsubscribed: enrichedCampaigns.reduce((acc, c) => acc + (c.trackingStats?.unsubscribed || 0), 0)
    };
    
    // Calculate rates
    overallStats.avgOpenRate = overallStats.totalSent > 0 
      ? ((overallStats.totalOpened / overallStats.totalSent) * 100).toFixed(2) 
      : 0;
    overallStats.avgClickRate = overallStats.totalOpened > 0 
      ? ((overallStats.totalClicked / overallStats.totalOpened) * 100).toFixed(2) 
      : 0;
    
    res.json({
      success: true,
      campaigns: enrichedCampaigns,
      overallStats
    });
  } catch (err) {
    console.error('Get campaign analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET CAMPAIGN TRENDS
router.get('/analytics/trends', isAuthenticated, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get daily tracking trends
    const trends = await EmailTracking.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sent: { $sum: { $cond: [{ $ne: ['$sentAt', null] }, 1, 0] } },
          opened: { $sum: { $cond: ['$opened', 1, 0] } },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
          unsubscribed: { $sum: { $cond: ['$unsubscribed', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      trends: trends.map(t => ({
        date: t._id,
        sent: t.sent,
        opened: t.opened,
        clicked: t.clicked,
        bounced: t.bounced,
        unsubscribed: t.unsubscribed
      }))
    });
  } catch (err) {
    console.error('Get tracking trends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET TOP PERFORMING LINKS
router.get('/analytics/top-links', isAuthenticated, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { campaignId, limit = 10 } = req.query;
    
    const match = { companyId: new mongoose.Types.ObjectId(companyId) };
    if (campaignId) {
      match.campaignId = new mongoose.Types.ObjectId(campaignId);
    }
    
    const topLinks = await EmailTracking.aggregate([
      { $match: match },
      { $unwind: '$clickEvents' },
      {
        $group: {
          _id: '$clickEvents.url',
          clicks: { $sum: 1 },
          uniqueClicks: { $addToSet: '$recipientEmail' }
        }
      },
      {
        $project: {
          url: '$_id',
          clicks: 1,
          uniqueClicks: { $size: '$uniqueClicks' }
        }
      },
      { $sort: { clicks: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.json({ success: true, topLinks });
  } catch (err) {
    console.error('Get top links error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET DEVICE BREAKDOWN
router.get('/analytics/devices', isAuthenticated, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { campaignId } = req.query;
    
    const match = { companyId: new mongoose.Types.ObjectId(companyId), opened: true };
    if (campaignId) {
      match.campaignId = new mongoose.Types.ObjectId(campaignId);
    }
    
    const deviceStats = await EmailTracking.aggregate([
      { $match: match },
      { $unwind: '$openEvents' },
      {
        $group: {
          _id: {
            device: '$openEvents.device',
            browser: '$openEvents.browser'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Group by device type
    const devices = {};
    const browsers = {};
    
    deviceStats.forEach(stat => {
      const device = stat._id.device || 'unknown';
      const browser = stat._id.browser || 'unknown';
      
      devices[device] = (devices[device] || 0) + stat.count;
      browsers[browser] = (browsers[browser] || 0) + stat.count;
    });
    
    res.json({
      success: true,
      devices: Object.entries(devices).map(([name, count]) => ({ name, count })),
      browsers: Object.entries(browsers).map(([name, count]) => ({ name, count }))
    });
  } catch (err) {
    console.error('Get device stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
