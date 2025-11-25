const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CrawlerJob = require('../models/CrawlerJob');
const auth = require('../middleware/auth');
const { getAllCrawlers, getCrawler, crawlerExists } = require('../scripts/crawlers');

// Store active crawler instances
const activeCrawlers = new Map();

/**
 * GET /findr/crawlers/list
 * Get list of all available crawler scripts
 */
router.get('/findr/crawlers/list', auth, async (req, res) => {
  try {
    const crawlers = getAllCrawlers();
    res.json({
      success: true,
      crawlers
    });
  } catch (error) {
    console.error('Error listing crawlers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list crawlers',
      error: error.message
    });
  }
});

/**
 * POST /findr/crawlers/run
 * Start a crawler job
 */
router.post('/findr/crawlers/run', auth, async (req, res) => {
  try {
    const { crawlerId, tradeShowName, customUrl } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!crawlerId || !tradeShowName) {
      return res.status(400).json({
        success: false,
        message: 'Crawler ID and trade show name are required'
      });
    }

    // Validate customUrl if provided
    if (customUrl) {
      try {
        new URL(customUrl);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }
    }

    // Check if crawler exists
    if (!crawlerExists(crawlerId)) {
      return res.status(404).json({
        success: false,
        message: `Crawler "${crawlerId}" not found`
      });
    }

    // Get user's company ID
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyId = user.companyId;

    // Create crawler instance
    const crawler = getCrawler(crawlerId);

    // Set socket.io instance (will be passed from server.js)
    crawler.io = req.app.get('io');

    // Initialize and get job ID
    const jobId = await crawler.initialize(userId, companyId, tradeShowName, crawler.io);

    // Store crawler instance
    activeCrawlers.set(jobId, crawler);

    // Run crawler in background
    crawler.run(userId, companyId, tradeShowName, customUrl).catch(async (error) => {
      console.error(`Crawler ${jobId} failed:`, error);
      const job = await CrawlerJob.findOne({ jobId });
      if (job) {
        job.status = 'failed';
        job.completedAt = new Date();
        await job.save();
        await job.addError(`Crawler execution failed: ${error.message}`);
      }
    }).finally(() => {
      // Remove from active crawlers after completion
      activeCrawlers.delete(jobId);
    });

    res.json({
      success: true,
      message: 'Crawler started successfully',
      jobId
    });

  } catch (error) {
    console.error('Error starting crawler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start crawler',
      error: error.message
    });
  }
});

/**
 * GET /findr/crawlers/status/:jobId
 * Get status of a crawler job
 */
router.get('/findr/crawlers/status/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId;

    // Get user's company ID
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyId = user.companyId;

    // Find job
    const job = await CrawlerJob.findOne({ jobId, companyId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Crawler job not found'
      });
    }

    res.json({
      success: true,
      job: {
        jobId: job.jobId,
        scriptName: job.scriptName,
        tradeShowName: job.tradeShowName,
        tradeShowId: job.tradeShowId,
        status: job.status,
        progress: job.progress,
        currentPage: job.currentPage,
        totalPages: job.totalPages,
        recordsExtracted: job.recordsExtracted,
        recordsSaved: job.recordsSaved,
        recordsMerged: job.recordsMerged,
        errorCount: job.errorCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        logs: job.logs.slice(-50), // Last 50 logs
        errors: job.errors
      }
    });

  } catch (error) {
    console.error('Error getting crawler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crawler status',
      error: error.message
    });
  }
});

/**
 * POST /findr/crawlers/stop/:jobId
 * Stop a running crawler
 */
router.post('/findr/crawlers/stop/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId;

    // Get user's company ID
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyId = user.companyId;

    // Find job
    const job = await CrawlerJob.findOne({ jobId, companyId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Crawler job not found'
      });
    }

    // Check if crawler is active
    const crawler = activeCrawlers.get(jobId);
    if (crawler) {
      await crawler.stop();
    } else {
      // Crawler already finished or not running
      job.status = 'stopped';
      job.stoppedAt = new Date();
      await job.save();
    }

    res.json({
      success: true,
      message: 'Crawler stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping crawler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop crawler',
      error: error.message
    });
  }
});

/**
 * POST /findr/crawlers/pause/:jobId
 * Pause a running crawler
 */
router.post('/findr/crawlers/pause/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId;

    // Get user's company ID
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyId = user.companyId;

    // Find job
    const job = await CrawlerJob.findOne({ jobId, companyId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Crawler job not found'
      });
    }

    // Get active crawler instance
    const crawler = activeCrawlers.get(jobId);
    if (crawler) {
      await crawler.pause();
      res.json({
        success: true,
        message: 'Crawler paused successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Crawler is not currently running'
      });
    }

  } catch (error) {
    console.error('Error pausing crawler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause crawler',
      error: error.message
    });
  }
});

/**
 * GET /findr/crawlers/history
 * Get crawler job history for the user's company
 */
router.get('/findr/crawlers/history', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's company ID
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyId = user.companyId;

    // Get recent jobs (last 20)
    const jobs = await CrawlerJob.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-logs -errors'); // Exclude logs and errors for performance

    res.json({
      success: true,
      jobs: jobs.map(job => ({
        jobId: job.jobId,
        scriptName: job.scriptName,
        tradeShowName: job.tradeShowName,
        status: job.status,
        progress: job.progress,
        recordsExtracted: job.recordsExtracted,
        recordsSaved: job.recordsSaved,
        recordsMerged: job.recordsMerged,
        errorCount: job.errorCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting crawler history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crawler history',
      error: error.message
    });
  }
});

module.exports = router;
