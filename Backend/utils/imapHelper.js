const Imap = require('imap');
const nodemailer = require('nodemailer');

/**
 * Test IMAP connection
 * @param {Object} config - IMAP configuration
 * @param {string} config.host - IMAP host
 * @param {number} config.port - IMAP port
 * @param {boolean} config.secure - Use TLS/SSL
 * @param {string} config.username - IMAP username
 * @param {string} config.password - IMAP password
 * @returns {Promise<{success: boolean, message: string, stats?: Object}>}
 */
async function testImapConnection(config) {
  return new Promise((resolve) => {
    try {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.host,
        port: config.port || (config.secure ? 993 : 143),
        tls: config.secure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 10000
      });

      let stats = null;

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return resolve({
              success: false,
              message: `Failed to open INBOX: ${err.message}`
            });
          }

          stats = {
            totalMessages: box.messages.total || 0,
            unreadMessages: box.messages.new || 0
          };

          imap.end();
        });
      });

      imap.once('error', (err) => {
        resolve({
          success: false,
          message: `IMAP connection failed: ${err.message}`
        });
      });

      imap.once('end', () => {
        if (stats) {
          resolve({
            success: true,
            message: 'IMAP connection successful',
            stats: stats
          });
        }
      });

      imap.connect();

      // Timeout after 15 seconds
      setTimeout(() => {
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        if (!stats) {
          resolve({
            success: false,
            message: 'IMAP connection timeout'
          });
        }
      }, 15000);

    } catch (error) {
      resolve({
        success: false,
        message: `IMAP test error: ${error.message}`
      });
    }
  });
}

/**
 * Test SMTP connection
 * @param {Object} config - SMTP configuration
 * @param {string} config.host - SMTP host
 * @param {number} config.port - SMTP port
 * @param {boolean} config.secure - Use TLS/SSL
 * @param {string} config.username - SMTP username
 * @param {string} config.password - SMTP password
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testSmtpConnection(config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || (config.secure ? 465 : 587),
      secure: config.secure !== false,
      auth: {
        user: config.username,
        pass: config.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    await transporter.verify();

    return {
      success: true,
      message: 'SMTP connection successful'
    };
  } catch (error) {
    return {
      success: false,
      message: `SMTP connection failed: ${error.message}`
    };
  }
}

/**
 * Test both IMAP and SMTP connections
 * @param {Object} imapConfig - IMAP configuration
 * @param {Object} smtpConfig - SMTP configuration
 * @returns {Promise<{imap: Object, smtp: Object}>}
 */
async function testEmailAccount(imapConfig, smtpConfig) {
  const results = {};

  if (imapConfig) {
    results.imap = await testImapConnection(imapConfig);
  }

  if (smtpConfig) {
    results.smtp = await testSmtpConnection(smtpConfig);
  }

  return results;
}

/**
 * Fetch inbox messages count via IMAP
 * @param {Object} config - IMAP configuration
 * @returns {Promise<{total: number, unread: number}>}
 */
async function getInboxStats(config) {
  return new Promise((resolve, reject) => {
    try {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.host,
        port: config.port || (config.secure ? 993 : 143),
        tls: config.secure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 10000
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const stats = {
            total: box.messages.total || 0,
            unread: box.messages.new || 0
          };

          imap.end();
          resolve(stats);
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();

      // Timeout
      setTimeout(() => {
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        reject(new Error('Connection timeout'));
      }, 15000);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get preset configurations for popular email providers
 * @param {string} email - Email address
 * @returns {Object|null} - Preset configuration or null
 */
function getEmailProviderPreset(email) {
  const domain = email.split('@')[1]?.toLowerCase();

  const presets = {
    'gmail.com': {
      imap: { host: 'imap.gmail.com', port: 993, secure: true },
      smtp: { host: 'smtp.gmail.com', port: 587, secure: false }
    },
    'outlook.com': {
      imap: { host: 'outlook.office365.com', port: 993, secure: true },
      smtp: { host: 'smtp.office365.com', port: 587, secure: false }
    },
    'hotmail.com': {
      imap: { host: 'outlook.office365.com', port: 993, secure: true },
      smtp: { host: 'smtp.office365.com', port: 587, secure: false }
    },
    'yahoo.com': {
      imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
      smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
    },
    'icloud.com': {
      imap: { host: 'imap.mail.me.com', port: 993, secure: true },
      smtp: { host: 'smtp.mail.me.com', port: 587, secure: false }
    }
  };

  return presets[domain] || null;
}

/**
 * Fetch emails from IMAP mailbox
 * @param {Object} config - IMAP configuration
 * @param {string} folder - Mailbox folder (default: 'INBOX')
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Emails per page (default: 50)
 * @returns {Promise<{emails: Array, total: number}>}
 */
async function fetchEmails(config, folder = 'INBOX', page = 1, limit = 50) {
  return new Promise((resolve, reject) => {
    try {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.host,
        port: config.port || (config.secure ? 993 : 143),
        tls: config.secure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 15000,
        authTimeout: 15000
      });

      let emails = [];
      let totalMessages = 0;

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            return reject(new Error(`Failed to open ${folder}: ${err.message}`));
          }

          totalMessages = box.messages.total;

          if (totalMessages === 0) {
            imap.end();
            return resolve({ emails: [], total: 0 });
          }

          // Calculate message range for pagination
          const start = Math.max(1, totalMessages - (page * limit) + 1);
          const end = Math.max(1, totalMessages - ((page - 1) * limit));

          if (start > end) {
            imap.end();
            return resolve({ emails: [], total: totalMessages });
          }

          const range = `${start}:${end}`;

          const fetch = imap.seq.fetch(range, {
            bodies: ['HEADER', 'TEXT'],
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            let emailData = {
              seqno: seqno,
              seen: false,
              from: null,
              to: null,
              subject: null,
              date: null,
              text: '',
              html: ''
            };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', () => {
                if (info.which === 'HEADER') {
                  const header = Imap.parseHeader(buffer);
                  emailData.from = header.from ? header.from[0] : null;
                  emailData.to = header.to || [];
                  emailData.subject = header.subject ? header.subject[0] : '';
                  emailData.date = header.date ? header.date[0] : null;
                } else if (info.which === 'TEXT') {
                  emailData.text = buffer.substring(0, 500); // Preview only
                  emailData.html = buffer;
                }
              });
            });

            msg.once('attributes', (attrs) => {
              emailData.seen = attrs.flags.includes('\\Seen');
            });

            msg.once('end', () => {
              // Parse from/to addresses
              if (emailData.from) {
                const fromMatch = emailData.from.match(/(.*?)\s*<(.+?)>/) || [];
                emailData.from = {
                  name: fromMatch[1] ? fromMatch[1].trim().replace(/"/g, '') : emailData.from,
                  address: fromMatch[2] || emailData.from
                };
              }

              emails.push(emailData);
            });
          });

          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            imap.end();
            reject(err);
          });

          fetch.once('end', () => {
            imap.end();
          });
        });
      });

      imap.once('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`IMAP error: ${err.message}`));
      });

      imap.once('end', () => {
        clearTimeout(timeoutHandle);
        // Sort by seqno descending (newest first)
        emails.sort((a, b) => b.seqno - a.seqno);
        resolve({ emails, total: totalMessages });
      });

      imap.connect();

      // Timeout
      const timeoutHandle = setTimeout(() => {
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        reject(new Error('IMAP fetch timeout'));
      }, 60000);

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  testImapConnection,
  testSmtpConnection,
  testEmailAccount,
  getInboxStats,
  getEmailProviderPreset,
  fetchEmails
};
