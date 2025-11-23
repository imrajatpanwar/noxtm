const Bull = require('bull');
const EmailAccount = require('../models/EmailAccount');
const { fetchEmails } = require('../utils/imapHelper');
const { cacheEmailList, invalidateFolderCache } = require('../utils/emailCache');
const { decrypt } = require('../utils/encryption');

// Create email sync queue (will be null if Redis unavailable)
let emailSyncQueue = null;
let isQueueAvailable = false;

// Check if Redis is disabled
if (process.env.REDIS_ENABLED === 'false') {
  console.warn('⚠️  Background email sync disabled (REDIS_ENABLED=false)');
} else {
  try {
    emailSyncQueue = new Bull('email-sync', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 0, // Don't retry on connection failure
      enableReadyCheck: false,
      lazyConnect: true // Don't connect immediately
    },
    settings: {
      lockDuration: 30000,
      stalledInterval: 30000,
      maxStalledCount: 1
    }
  });
  
  // Try to connect, but don't crash if it fails
  emailSyncQueue.isReady().then(() => {
    console.log('✅ Email sync queue ready');
    isQueueAvailable = true;
  }).catch((error) => {
    console.warn('⚠️  Background email sync disabled (Redis not available)');
    isQueueAvailable = false;
    emailSyncQueue = null; // Disable queue
  });
  
  } catch (error) {
    console.warn('⚠️  Background email sync disabled (Redis not available)');
    isQueueAvailable = false;
    emailSyncQueue = null;
  }
} // End if REDIS_ENABLED check

/**
 * Process email sync jobs
 */
if (emailSyncQueue) {
  emailSyncQueue.process(async (job) => {
    const { accountId, folder = 'INBOX', page = 1, limit = 50 } = job.data;
    
    console.log(`🔄 Background sync started for account ${accountId}, folder ${folder}, page ${page}`);
  
  try {
    const account = await EmailAccount.findById(accountId);
    
    if (!account || account.accountType !== 'noxtm-hosted') {
      throw new Error('Invalid account for sync');
    }
    
    if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
      throw new Error('IMAP settings not configured');
    }
    
    const password = decrypt(account.imapSettings.encryptedPassword);
    const host = account.imapSettings.host || '127.0.0.1';
    
    const imapConfig = {
      host: host,
      port: account.imapSettings.port || 993,
      secure: account.imapSettings.secure !== false,
      username: account.imapSettings.username || account.email,
      password: password
    };
    
    const result = await fetchEmails(imapConfig, folder, page, limit);
    
    // Cache the results
    await cacheEmailList(accountId, folder, page, result.emails, result.total);
    
    console.log(`✅ Background sync completed for ${accountId}: ${result.emails.length} emails cached`);
    
    return { success: true, emailCount: result.emails.length, total: result.total };
    
  } catch (error) {
    console.error(`❌ Background sync failed for account ${accountId}:`, error.message);
    throw error;
  }
  });
} // End if (emailSyncQueue)

/**
 * Schedule background sync for an account
 */
async function scheduleSyncJob(accountId, folder = 'INBOX', page = 1, limit = 50, priority = 'normal') {
  if (!emailSyncQueue || !isQueueAvailable) {
    console.log('⚠️  Background sync skipped (queue not available)');
    return null;
  }
  const priorityMap = {
    high: 1,
    normal: 2,
    low: 3
  };
  
  try {
    const job = await emailSyncQueue.add(
      {
        accountId,
        folder,
        page,
        limit
      },
      {
        priority: priorityMap[priority] || 2,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`📅 Scheduled background sync job ${job.id} for account ${accountId}`);
    return job.id;
    
  } catch (error) {
    console.error('Error scheduling sync job:', error);
    throw error;
  }
}

/**
 * Sync multiple pages in the background
 */
async function syncMultiplePages(accountId, folder = 'INBOX', totalPages = 3) {
  if (!emailSyncQueue || !isQueueAvailable) {
    console.log('⚠️  Background sync skipped (queue not available)');
    return [];
  }
  
  const jobIds = [];
  
  for (let page = 1; page <= totalPages; page++) {
    const jobId = await scheduleSyncJob(accountId, folder, page, 50, page === 1 ? 'high' : 'normal');
    jobIds.push(jobId);
  }
  
  console.log(`📅 Scheduled ${totalPages} background sync jobs for account ${accountId}`);
  return jobIds;
}

/**
 * Invalidate cache and trigger resync
 */
async function invalidateAndResync(accountId, folder = 'INBOX') {
  try {
    // Invalidate existing cache
    await invalidateFolderCache(accountId, folder);
    
    // Schedule immediate resync
    await scheduleSyncJob(accountId, folder, 1, 50, 'high');
    
    console.log(`🔄 Triggered cache invalidation and resync for ${accountId}/${folder}`);
    return true;
  } catch (error) {
    console.error('Error in invalidateAndResync:', error);
    return false;
  }
}

/**
 * Get queue stats
 */
async function getQueueStats() {
  if (!emailSyncQueue || !isQueueAvailable) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };
  }
  
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      emailSyncQueue.getWaitingCount(),
      emailSyncQueue.getActiveCount(),
      emailSyncQueue.getCompletedCount(),
      emailSyncQueue.getFailedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}

// Event handlers (only if queue available)
if (emailSyncQueue) {
  emailSyncQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  emailSyncQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
  });

  emailSyncQueue.on('stalled', (job) => {
    console.warn(`⏸️  Job ${job.id} stalled`);
  });
}

module.exports = {
  emailSyncQueue,
  scheduleSyncJob,
  syncMultiplePages,
  invalidateAndResync,
  getQueueStats
};
