const Queue = require('bull');
const { sendEmailViaSES } = require('../utils/awsSesHelper');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
};

let emailQueue;
try {
  emailQueue = new Queue('aws-ses-emails', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  });

  emailQueue.on('error', (error) => {
    // Silent - Redis connection error handled
  });
  emailQueue.on('completed', (job, result) => console.log(`✓ Email sent (Job ${job.id}): ${result.MessageId}`));
  emailQueue.on('failed', (job, error) => console.error(`✗ Email failed (Job ${job.id}):`, error.message));

  emailQueue.process(async (job) => {
    const { from, to, subject, html, text, userId, domain, metadata } = job.data;

    const result = await sendEmailViaSES({
      from, to, subject, html, text,
      metadata: { ...metadata, queueJobId: job.id, attempt: job.attemptsMade + 1 }
    });

    return { success: true, MessageId: result.MessageId, attempt: job.attemptsMade + 1 };
  });
} catch (error) {
  console.warn('⚠️  Email queue initialization failed (Redis not available - optional for local dev)');
  emailQueue = null;
}

async function sendEmailWithRetry(emailData) {
  try {
    const result = await sendEmailViaSES(emailData);
    return { success: true, sent: 'immediate', MessageId: result.MessageId };
  } catch (error) {
    if (emailQueue && isRetryableError(error)) {
      const job = await emailQueue.add(emailData);
      return { success: true, sent: 'queued', jobId: job.id };
    }
    throw error;
  }
}

function isRetryableError(error) {
  const errorCode = error.code || error.$metadata?.httpStatusCode;
  if (errorCode === 429 || (errorCode >= 500 && errorCode < 600)) return true;
  if (error.message?.includes('timeout')) return true;
  return false;
}

async function getQueueStats() {
  if (!emailQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, total: 0, available: false };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount()
  ]);

  return { waiting, active, completed, failed, total: waiting + active + completed + failed, available: true };
}

module.exports = { emailQueue, sendEmailWithRetry, getQueueStats };
