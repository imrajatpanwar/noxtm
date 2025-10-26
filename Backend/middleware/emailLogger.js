/**
 * Email Logging Middleware
 * Logs all email sends to database and console for monitoring and security auditing
 */

// This will be imported from server.js
let EmailLog = null;

// Initialize the middleware with the EmailLog model
function initializeEmailLogger(emailLogModel) {
  EmailLog = emailLogModel;
}

/**
 * Log email send attempt
 * @param {Object} emailData - Email details (to, from, subject, etc.)
 * @param {Object} result - Result from nodemailer send
 * @param {String} status - 'queued', 'sent', 'failed'
 * @param {Error} error - Error object if send failed
 * @param {Object} metadata - Additional metadata (userId, ip, etc.)
 */
async function logEmail(emailData, result, status = 'queued', error = null, metadata = {}) {
  try {
    // Log to console first for immediate visibility
    const logPrefix = status === 'sent' ? '✅' : status === 'failed' ? '❌' : '📧';
    console.log(`${logPrefix} Email ${status}:`, {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from || process.env.EMAIL_FROM,
      messageId: result?.messageId,
      userId: metadata.userId,
      ip: metadata.ip,
      timestamp: new Date().toISOString()
    });

    // If EmailLog model is not initialized, skip database logging
    if (!EmailLog) {
      console.warn('⚠️  EmailLog model not initialized, skipping database log');
      return null;
    }

    // Prepare log entry
    const logEntry = {
      from: emailData.from || process.env.EMAIL_FROM || 'noreply@noxtm.com',
      to: emailData.to,
      subject: emailData.subject || '(no subject)',
      body: emailData.text || '',
      htmlBody: emailData.html || '',
      status,
      messageId: result?.messageId || null,
      error: error ? error.message : null,
      sentAt: new Date(),
      // Additional metadata
      deliveryInfo: {
        relay: metadata.relay || null,
        delay: metadata.delay || null,
        dsnStatus: metadata.dsnStatus || null
      }
    };

    // Save to database
    const log = new EmailLog(logEntry);
    await log.save();

    return log;
  } catch (err) {
    // Don't let logging errors break the email flow
    console.error('❌ Error logging email:', err.message);
    return null;
  }
}

/**
 * Wrapper function for nodemailer sendMail to automatically log
 * @param {Object} transporter - Nodemailer transporter
 * @param {Object} mailOptions - Email options
 * @param {Object} metadata - Additional metadata (userId, ip, etc.)
 */
async function sendAndLogEmail(transporter, mailOptions, metadata = {}) {
  let result = null;
  let status = 'queued';
  let error = null;

  try {
    // Log as queued first
    await logEmail(mailOptions, null, 'queued', null, metadata);

    // Send email
    result = await transporter.sendMail(mailOptions);
    status = 'sent';

    // Log successful send
    await logEmail(mailOptions, result, 'sent', null, metadata);

    return result;
  } catch (err) {
    error = err;
    status = 'failed';

    // Log failure
    await logEmail(mailOptions, result, 'failed', err, metadata);

    // Re-throw the error so caller can handle it
    throw err;
  }
}

/**
 * Get email statistics for monitoring
 * @param {String} timeframe - '1h', '24h', '7d', '30d'
 */
async function getEmailStats(timeframe = '24h') {
  if (!EmailLog) {
    throw new Error('EmailLog model not initialized');
  }

  const timeframeMs = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  const ms = timeframeMs[timeframe] || timeframeMs['24h'];
  const since = new Date(Date.now() - ms);

  try {
    const [totalSent, totalFailed, totalQueued, recentLogs] = await Promise.all([
      EmailLog.countDocuments({ sentAt: { $gte: since }, status: 'sent' }),
      EmailLog.countDocuments({ sentAt: { $gte: since }, status: 'failed' }),
      EmailLog.countDocuments({ sentAt: { $gte: since }, status: 'queued' }),
      EmailLog.find({ sentAt: { $gte: since } })
        .sort({ sentAt: -1 })
        .limit(50)
        .select('to from subject status sentAt error')
    ]);

    return {
      timeframe,
      totalSent,
      totalFailed,
      totalQueued,
      total: totalSent + totalFailed + totalQueued,
      successRate: totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed) * 100).toFixed(2) + '%' : 'N/A',
      recentLogs
    };
  } catch (err) {
    console.error('Error getting email stats:', err);
    throw err;
  }
}

/**
 * Alert if email volume is unusually high (possible abuse)
 * @param {Number} threshold - Number of emails in last hour that triggers alert
 */
async function checkEmailVolumeAlert(threshold = 100) {
  if (!EmailLog) {
    return { alert: false, message: 'EmailLog model not initialized' };
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await EmailLog.countDocuments({ sentAt: { $gte: oneHourAgo } });

    if (count > threshold) {
      const message = `⚠️  HIGH EMAIL VOLUME ALERT: ${count} emails sent in last hour (threshold: ${threshold})`;
      console.error(message);
      return {
        alert: true,
        count,
        threshold,
        message
      };
    }

    return {
      alert: false,
      count,
      threshold
    };
  } catch (err) {
    console.error('Error checking email volume:', err);
    return { alert: false, error: err.message };
  }
}

module.exports = {
  initializeEmailLogger,
  logEmail,
  sendAndLogEmail,
  getEmailStats,
  checkEmailVolumeAlert
};
