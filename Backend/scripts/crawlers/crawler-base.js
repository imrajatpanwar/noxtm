const { CheerioCrawler, Dataset } = require('crawlee');
const CrawlerJob = require('../../models/CrawlerJob');
const TradeShow = require('../../models/TradeShow');
const Exhibitor = require('../../models/Exhibitor');

class BaseCrawler {
  constructor(config) {
    this.config = config;
    this.jobId = null;
    this.io = null; // Socket.io instance
    this.shouldStop = false;
    this.isPaused = false;
    this.extractedData = [];
    this.customUrl = null; // Optional custom URL override
  }

  /**
   * Get the URL to crawl (custom URL or default from config)
   */
  getTargetUrl() {
    return this.customUrl || this.config.baseUrl;
  }

  /**
   * Initialize the crawler job
   */
  async initialize(userId, companyId, tradeShowName, io) {
    this.jobId = `crawler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.io = io;

    // Create crawler job in database
    const job = new CrawlerJob({
      jobId: this.jobId,
      scriptName: this.config.name,
      tradeShowName: tradeShowName,
      tradeShowLocation: this.config.metadata?.location || '',
      tradeShowDate: this.config.metadata?.date || null,
      status: 'pending',
      createdBy: userId,
      companyId: companyId,
      totalPages: this.config.maxPages || 0,
      metadata: this.config.metadata || {}
    });

    await job.save();
    return this.jobId;
  }

  /**
   * Emit real-time progress via socket.io
   */
  emitProgress(data) {
    if (this.io) {
      this.io.to(this.jobId).emit('crawler:progress', {
        jobId: this.jobId,
        ...data
      });
    }
  }

  /**
   * Find or create trade show
   */
  async findOrCreateTradeShow(userId, companyId) {
    const job = await CrawlerJob.findOne({ jobId: this.jobId });

    // Try to find existing trade show
    let tradeShow = await TradeShow.findOne({
      shortName: { $regex: new RegExp(job.tradeShowName, 'i') },
      companyId: companyId
    });

    // Create if not exists
    if (!tradeShow) {
      await job.addLog(`Trade show "${job.tradeShowName}" not found. Creating new...`, 'info');

      tradeShow = new TradeShow({
        shortName: job.tradeShowName,
        fullName: this.config.metadata?.fullName || job.tradeShowName,
        showDate: job.tradeShowDate || new Date(),
        location: job.tradeShowLocation || 'N/A',
        industry: 'Other',
        createdBy: userId,
        companyId: companyId
      });

      await tradeShow.save();
      await job.addLog(`Trade show created successfully (ID: ${tradeShow._id})`, 'success');
    } else {
      await job.addLog(`Found existing trade show (ID: ${tradeShow._id})`, 'info');
    }

    // Update job with trade show ID
    job.tradeShowId = tradeShow._id;
    await job.save();

    return tradeShow;
  }

  /**
   * Save or merge exhibitor data
   */
  async saveOrMergeExhibitor(exhibitorData, tradeShowId, userId, companyId) {
    const job = await CrawlerJob.findOne({ jobId: this.jobId });

    try {
      // Check if exhibitor already exists (by company name + trade show)
      let exhibitor = await Exhibitor.findOne({
        tradeShowId: tradeShowId,
        companyName: { $regex: new RegExp(`^${exhibitorData.companyName}$`, 'i') },
        companyId: companyId
      });

      if (exhibitor) {
        // MERGE: Append contacts if new, update fields if they have new data
        let merged = false;

        // Update basic fields if they're empty or if new data is more complete
        if (!exhibitor.website && exhibitorData.website) {
          exhibitor.website = exhibitorData.website;
          merged = true;
        }
        if (!exhibitor.companyEmail && exhibitorData.companyEmail) {
          exhibitor.companyEmail = exhibitorData.companyEmail;
          merged = true;
        }
        if (!exhibitor.boothNo && exhibitorData.boothNo) {
          exhibitor.boothNo = exhibitorData.boothNo;
          merged = true;
        }
        if (!exhibitor.location && exhibitorData.location) {
          exhibitor.location = exhibitorData.location;
          merged = true;
        }

        // Merge contacts (avoid duplicates by email)
        if (exhibitorData.contacts && exhibitorData.contacts.length > 0) {
          const existingEmails = exhibitor.contacts
            .filter(c => c.email)
            .map(c => c.email.toLowerCase());

          const newContacts = exhibitorData.contacts.filter(c =>
            !c.email || !existingEmails.includes(c.email.toLowerCase())
          );

          if (newContacts.length > 0) {
            exhibitor.contacts.push(...newContacts);
            merged = true;
          }
        }

        if (merged) {
          await exhibitor.save();
          job.recordsMerged += 1;
          await job.save();
          return 'merged';
        } else {
          return 'skipped';
        }
      } else {
        // CREATE NEW
        exhibitor = new Exhibitor({
          tradeShowId,
          companyName: exhibitorData.companyName,
          boothNo: exhibitorData.boothNo || '',
          location: exhibitorData.location || '',
          companyEmail: exhibitorData.companyEmail || '',
          website: exhibitorData.website || '',
          contacts: exhibitorData.contacts || [],
          extractedAt: new Date(),
          createdBy: userId,
          companyId: companyId
        });

        await exhibitor.save();
        job.recordsSaved += 1;
        await job.save();
        return 'created';
      }
    } catch (error) {
      await job.addError(`Failed to save exhibitor "${exhibitorData.companyName}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the crawler
   */
  async stop() {
    this.shouldStop = true;
    const job = await CrawlerJob.findOne({ jobId: this.jobId });
    if (job) {
      job.status = 'stopped';
      job.stoppedAt = new Date();
      await job.save();
      await job.addLog('Crawler stopped by user', 'warning');
    }
  }

  /**
   * Pause the crawler
   */
  async pause() {
    this.isPaused = true;
    const job = await CrawlerJob.findOne({ jobId: this.jobId });
    if (job) {
      job.status = 'paused';
      job.pausedAt = new Date();
      await job.save();
      await job.addLog('Crawler paused', 'info');
    }
  }

  /**
   * Resume the crawler
   */
  async resume() {
    this.isPaused = false;
    const job = await CrawlerJob.findOne({ jobId: this.jobId });
    if (job) {
      job.status = 'running';
      await job.save();
      await job.addLog('Crawler resumed', 'info');
    }
  }

  /**
   * Run the crawler - to be implemented by child classes
   */
  async run(userId, companyId, tradeShowName) {
    throw new Error('run() method must be implemented by child class');
  }
}

module.exports = BaseCrawler;
