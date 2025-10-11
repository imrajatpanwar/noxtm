const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import from parent context (will be passed as middleware)
let EmailLog, authenticateToken, requireAdmin;

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
        const { stdout: postfixOut } = await execPromise('ssh root@185.137.122.61 "systemctl is-active postfix"');
        postfixStatus = postfixOut.trim() === 'active' ? 'running' : 'stopped';
      } catch (e) {
        postfixStatus = 'stopped';
      }

      try {
        const { stdout: opendkimOut } = await execPromise('ssh root@185.137.122.61 "ps aux | grep opendkim | grep -v grep | wc -l"');
        opendkimStatus = parseInt(opendkimOut.trim()) > 0 ? 'running' : 'stopped';
      } catch (e) {
        opendkimStatus = 'stopped';
      }

      try {
        const { stdout: queueOut } = await execPromise('ssh root@185.137.122.61 "mailq | tail -1 | awk \'{print $4}\'"');
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
          from: process.env.EMAIL_FROM || 'noreply@noxtm.com'
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
      const { stdout } = await execPromise('ssh root@185.137.122.61 "mailq"');

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
      const from = process.env.EMAIL_FROM || 'noreply@noxtm.com';
  
      // Send email via SSH to mail server
      const emailCmd = `ssh root@185.137.122.61 "echo '${testBody}' | mail -r '${from}' -s '${testSubject}' '${to}'"`;
      await execPromise(emailCmd);
  
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
          from: process.env.EMAIL_FROM || 'noreply@noxtm.com',
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
      const { to, subject, body, htmlBody } = req.body;
  
      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Recipient and subject are required'
        });
      }
  
      const from = process.env.EMAIL_FROM || 'noreply@noxtm.com';
      const emailBody = htmlBody || body || '';
  
      // Send email via SSH to mail server
      const emailCmd = `ssh root@185.137.122.61 "echo '${emailBody.replace(/'/g, "'\\''")}' | mail -r '${from}' -s '${subject.replace(/'/g, "'\\''")}' '${to}'"`;
      await execPromise(emailCmd);
  
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
          from: process.env.EMAIL_FROM || 'noreply@noxtm.com',
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
      const checks = {};
  
      // Check MX record
      try {
        const { stdout: mxOut } = await execPromise(`nslookup -type=mx ${domain} 8.8.8.8`);
        checks.mx = {
          status: mxOut.includes('mail.noxtm.com') ? 'pass' : 'fail',
          details: mxOut
        };
      } catch (e) {
        checks.mx = { status: 'error', error: e.message };
      }
  
      // Check SPF record
      try {
        const { stdout: spfOut } = await execPromise(`nslookup -type=txt ${domain} 8.8.8.8`);
        checks.spf = {
          status: spfOut.includes('v=spf1') ? 'pass' : 'fail',
          details: spfOut
        };
      } catch (e) {
        checks.spf = { status: 'error', error: e.message };
      }
  
      // Check DKIM record
      try {
        const { stdout: dkimOut } = await execPromise(`nslookup -type=txt mail._domainkey.${domain} 8.8.8.8`);
        checks.dkim = {
          status: dkimOut.includes('v=DKIM1') ? 'pass' : 'fail',
          details: dkimOut
        };
      } catch (e) {
        checks.dkim = { status: 'error', error: e.message };
      }
  
      // Check DMARC record
      try {
        const { stdout: dmarcOut } = await execPromise(`nslookup -type=txt _dmarc.${domain} 8.8.8.8`);
        checks.dmarc = {
          status: dmarcOut.includes('v=DMARC1') ? 'pass' : 'fail',
          details: dmarcOut
        };
      } catch (e) {
        checks.dmarc = { status: 'error', error: e.message };
      }
  
      // Check PTR record
      try {
        const { stdout: ptrOut } = await execPromise('nslookup 185.137.122.61');
        checks.ptr = {
          status: ptrOut.includes('mail.noxtm.com') ? 'pass' : 'fail',
          details: ptrOut
        };
      } catch (e) {
        checks.ptr = { status: 'error', error: e.message };
      }
  
      const allPass = Object.values(checks).every(check => check.status === 'pass');
  
      res.json({
        success: true,
        overallStatus: allPass ? 'pass' : 'partial',
        checks
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
      await execPromise('ssh root@185.137.122.61 "postqueue -f"');
  
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
      await execPromise('ssh root@185.137.122.61 "systemctl restart postfix && systemctl restart opendkim"');

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
