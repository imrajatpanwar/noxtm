const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const execPromise = util.promisify(exec);

// Import from parent context (will be passed as middleware)
let EmailLog, authenticateToken, requireAdmin;

// Helper function to execute command (local or SSH)
const mailServerIP = '185.137.122.61';
const isMailServer = () => {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.address === mailServerIP) return true;
    }
  }
  return false;
};

const execOnMailServer = async (command) => {
  if (isMailServer()) {
    return await execPromise(command);
  } else {
    return await execPromise(`ssh root@${mailServerIP} "${command.replace(/"/g, '\\"')}"`);
  }
};

// Initialize route with dependencies
function initializeRoutes(dependencies) {
  EmailLog = dependencies.EmailLog;
  authenticateToken = dependencies.authenticateToken;
  requireAdmin = dependencies.requireAdmin;

  // ===== NOXTM MAIL API ENDPOINTS =====

  // Get mail server status
  router.get('/status', authenticateToken, async (req, res) => {
    try {
      // Check Postfix status
      let postfixStatus = 'unknown';
      let opendkimStatus = 'unknown';
      let queueSize = 0;

      try {
        const { stdout: postfixOut } = await execOnMailServer('systemctl is-active postfix');
        postfixStatus = postfixOut.trim() === 'active' ? 'running' : 'stopped';
      } catch (e) {
        postfixStatus = 'stopped';
      }

      try {
        const { stdout: opendkimOut } = await execOnMailServer('ps aux | grep opendkim | grep -v grep | wc -l');
        opendkimStatus = parseInt(opendkimOut.trim()) > 0 ? 'running' : 'stopped';
      } catch (e) {
        opendkimStatus = 'stopped';
      }

      try {
        const { stdout: queueOut } = await execOnMailServer('mailq | tail -1 | awk \'{print $4}\'');
        queueSize = parseInt(queueOut.trim()) || 0;
      } catch (e) {
        queueSize = 0;
      }

      // Get today's email stats from database
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sentToday = await EmailLog.countDocuments({
        status: 'sent',
        sentAt: { $gte: today }
      });

      const failedToday = await EmailLog.countDocuments({
        status: 'failed',
        sentAt: { $gte: today }
      });

      const totalSent = await EmailLog.countDocuments({ status: 'sent' });

      res.json({
        success: true,
        status: {
          postfix: postfixStatus,
          opendkim: opendkimStatus,
          overall: (postfixStatus === 'running' && opendkimStatus === 'running') ? 'healthy' : 'degraded'
        },
        stats: {
          sentToday,
          failedToday,
          totalSent,
          queueSize
        },
        server: {
          hostname: 'mail.noxtm.com',
          ip: '185.137.122.61',
          from: process.env.EMAIL_FROM || 'rajat@mail.noxtm.com'
        }
      });
    } catch (error) {
      console.error('Mail status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mail server status',
        error: error.message
      });
    }
  });

  // Get email logs with pagination
  router.get('/logs', authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const status = req.query.status;

      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      const logs = await EmailLog.find(filter)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await EmailLog.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs: total,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('Get email logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get email logs',
        error: error.message
      });
    }
  });

  // Get mail queue
  router.get('/queue', authenticateToken, async (req, res) => {
    try {
      const { stdout } = await execOnMailServer('mailq');

      res.json({
        success: true,
        queue: stdout,
        isEmpty: stdout.includes('Mail queue is empty')
      });
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mail queue',
        error: error.message
      });
    }
  });

  // Send test email
  router.post('/test', authenticateToken, async (req, res) => {
    try {
      const { to, subject, body } = req.body;
  
      if (!to) {
        return res.status(400).json({
          success: false,
          message: 'Recipient email is required'
        });
      }
  
      const testSubject = subject || 'Test Email from Noxtm Mail Server';
      const testBody = body || 'This is a test email sent from Noxtm Mail dashboard.';
      const from = process.env.EMAIL_FROM || 'rajat@mail.noxtm.com';

      // Send email via AWS SES
      const { sendEmailViaSES } = require('../utils/awsSesHelper');
      await sendEmailViaSES({
        from,
        to,
        subject: testSubject,
        text: testBody,
        html: `<p>${testBody}</p>`
      });

      // Log the email
      const emailLog = new EmailLog({
        from,
        to,
        subject: testSubject,
        body: testBody,
        status: 'sent'
      });
      await emailLog.save();

      res.json({
        success: true,
        message: 'Test email sent successfully',
        emailLog
      });
    } catch (error) {
      console.error('Send test email error:', error);

      // Log failed email
      try {
        const emailLog = new EmailLog({
          from: process.env.EMAIL_FROM || 'rajat@mail.noxtm.com',
          to: req.body.to,
          subject: req.body.subject || 'Test Email',
          body: req.body.body || '',
          status: 'failed',
          error: error.message
        });
        await emailLog.save();
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
  
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    }
  });
  
  // Send email (general purpose)
  router.post('/send', authenticateToken, async (req, res) => {
    try {
      const { to, subject, body, htmlBody, from: customFrom } = req.body;

      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Recipient and subject are required'
        });
      }

      // Use custom from if provided, otherwise default to rajat@mail.noxtm.com
      const from = customFrom || 'rajat@mail.noxtm.com';
      const emailBody = htmlBody || body || '';

      // Send email via AWS SES
      const { sendEmailViaSES } = require('../utils/awsSesHelper');
      await sendEmailViaSES({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: htmlBody,
        text: body || htmlBody?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        replyTo: from
      });

      // Log the email
      const emailLog = new EmailLog({
        from,
        to,
        subject,
        body,
        htmlBody,
        status: 'sent'
      });
      await emailLog.save();

      res.json({
        success: true,
        message: 'Email sent successfully',
        emailLog: {
          id: emailLog._id,
          from: emailLog.from,
          to: emailLog.to,
          subject: emailLog.subject,
          status: emailLog.status,
          sentAt: emailLog.sentAt
        }
      });
    } catch (error) {
      console.error('Send email error:', error);

      // Log failed email
      try {
        const emailLog = new EmailLog({
          from: req.body.from || 'rajat@mail.noxtm.com',
          to: req.body.to,
          subject: req.body.subject,
          body: req.body.body,
          htmlBody: req.body.htmlBody,
          status: 'failed',
          error: error.message
        });
        await emailLog.save();
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: error.message
      });
    }
  });
  
  // Get email statistics
  router.get('/stats', authenticateToken, async (req, res) => {
    try {
      const { range } = req.query; // day, week, month, year
  
      let startDate = new Date();
      switch (range) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setHours(0, 0, 0, 0); // Default to today
      }
  
      const sent = await EmailLog.countDocuments({
        status: 'sent',
        sentAt: { $gte: startDate }
      });
  
      const failed = await EmailLog.countDocuments({
        status: 'failed',
        sentAt: { $gte: startDate }
      });
  
      const bounced = await EmailLog.countDocuments({
        status: 'bounced',
        sentAt: { $gte: startDate }
      });
  
      const total = sent + failed + bounced;
      const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;
  
      res.json({
        success: true,
        stats: {
          range,
          sent,
          failed,
          bounced,
          total,
          successRate: parseFloat(successRate)
        }
      });
    } catch (error) {
      console.error('Get email stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get email statistics',
        error: error.message
      });
    }
  });
  
  // Check DNS configuration
  router.get('/dns-check', authenticateToken, async (req, res) => {
    try {
      const domain = 'noxtm.com';
      const result = {};

      // Check MX record
      try {
        const { stdout: mxOut } = await execPromise(`nslookup -type=mx ${domain} 8.8.8.8`);
        const hasMailNoxtm = mxOut.includes('mail.noxtm.com');
        result.mx = {
          valid: hasMailNoxtm,
          current: hasMailNoxtm ? 'mail.noxtm.com' : 'Not configured',
          expected: 'mail.noxtm.com'
        };
      } catch (e) {
        result.mx = { valid: false, current: 'Not configured', expected: 'mail.noxtm.com' };
      }

      // Check SPF record
      try {
        const { stdout: spfOut } = await execPromise(`nslookup -type=txt ${domain} 8.8.8.8`);
        const hasSpf = spfOut.includes('v=spf1') && spfOut.includes('185.137.122.61');
        const spfMatch = spfOut.match(/v=spf1[^"]+/);
        result.spf = {
          valid: hasSpf,
          current: spfMatch ? spfMatch[0] : 'Not configured',
          expected: 'v=spf1 ip4:185.137.122.61 ~all'
        };
      } catch (e) {
        result.spf = { valid: false, current: 'Not configured', expected: 'v=spf1 ip4:185.137.122.61 ~all' };
      }

      // Check DKIM record (selector: mail)
      try {
        const { stdout: dkimOut } = await execPromise(`nslookup -type=txt mail._domainkey.${domain} 8.8.8.8`);
        const hasDkim = dkimOut.includes('v=DKIM1');

        // Get expected DKIM key from server
        let expectedDkim = '';
        try {
          const { stdout: dkimKey } = await execOnMailServer('cat /etc/opendkim/keys/noxtm.com/mail.txt 2>/dev/null || echo ""');
          if (dkimKey) {
            // Extract just the p= value
            const pMatch = dkimKey.match(/p=([A-Za-z0-9+/=]+)/g);
            expectedDkim = pMatch ? pMatch.join('') : dkimKey.trim();
          }
        } catch (e) {
          expectedDkim = 'DKIM key not found on server';
        }

        result.dkim = {
          valid: hasDkim,
          current: hasDkim ? 'Configured (DKIM signature found)' : 'Not configured',
          expected: expectedDkim || 'v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY_HERE'
        };
      } catch (e) {
        result.dkim = { valid: false, current: 'Not configured', expected: 'Add DKIM TXT record' };
      }

      // Check DMARC record
      try {
        const { stdout: dmarcOut } = await execPromise(`nslookup -type=txt _dmarc.${domain} 8.8.8.8`);
        const hasDmarc = dmarcOut.includes('v=DMARC1');
        const dmarcMatch = dmarcOut.match(/v=DMARC1[^"]+/);
        result.dmarc = {
          valid: hasDmarc,
          current: dmarcMatch ? dmarcMatch[0] : 'Not configured',
          expected: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com'
        };
      } catch (e) {
        result.dmarc = { valid: false, current: 'Not configured', expected: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com' };
      }

      // Check PTR record
      try {
        const { stdout: ptrOut } = await execPromise('nslookup 185.137.122.61');
        const hasPtr = ptrOut.includes('mail.noxtm.com');
        result.ptr = {
          valid: hasPtr,
          current: hasPtr ? 'mail.noxtm.com' : 'Not configured',
          expected: 'mail.noxtm.com'
        };
      } catch (e) {
        result.ptr = { valid: false, current: 'Not configured', expected: 'mail.noxtm.com' };
      }

      const allValid = Object.values(result).every(check => check.valid === true);

      res.json({
        success: true,
        allValid,
        ...result
      });
    } catch (error) {
      console.error('DNS check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check DNS configuration',
        error: error.message
      });
    }
  });
  
  // Flush mail queue (admin only)
  router.post('/queue/flush', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await execOnMailServer('postqueue -f');
  
      res.json({
        success: true,
        message: 'Mail queue flushed successfully'
      });
    } catch (error) {
      console.error('Flush queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to flush mail queue',
        error: error.message
      });
    }
  });

  // Restart mail services (admin only)
  router.post('/restart', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await execOnMailServer('systemctl restart postfix && systemctl restart opendkim');

      res.json({
        success: true,
        message: 'Mail services restarted successfully'
      });
    } catch (error) {
      console.error('Restart services error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart mail services',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = { initializeRoutes };
