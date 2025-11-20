const Imap = require('imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');

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
      }, 10000);

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
      }, 10000);

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
        connTimeout: 20000,  // 20 seconds for connection
        authTimeout: 20000,  // 20 seconds for authentication
        keepalive: true      // Keep connection alive for large fetches
      });

      let emails = [];
      let totalMessages = 0;

      imap.once('ready', () => {
        console.log(`📬 IMAP connected for ${config.username}`);
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            console.error(`❌ Failed to open ${folder} for ${config.username}:`, err.message);
            imap.end();
            return reject(new Error(`Failed to open ${folder}: ${err.message}`));
          }

          totalMessages = box.messages.total;
          console.log(`📊 ${config.username} has ${totalMessages} total messages in ${folder}`);

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

          // Helper function to extract preview from BODYSTRUCTURE
          function extractPreviewFromStructure(struct) {
            // Look for text/plain or text/html parts
            if (Array.isArray(struct)) {
              for (let part of struct) {
                if (Array.isArray(part)) {
                  const preview = extractPreviewFromStructure(part);
                  if (preview) return preview;
                } else if (part && part.type === 'text') {
                  return `[${part.subtype || 'text'} content]`;
                }
              }
            } else if (struct && struct.type === 'text') {
              return `[${struct.subtype || 'text'} content]`;
            }
            return '';
          }

          // Helper function to check for attachments
          function checkForAttachments(struct) {
            if (Array.isArray(struct)) {
              for (let part of struct) {
                if (Array.isArray(part)) {
                  if (checkForAttachments(part)) return true;
                } else if (part && part.disposition && part.disposition.type === 'ATTACHMENT') {
                  return true;
                }
              }
            }
            return false;
          }

          // For large mailboxes, use UID-based fetching which is much faster
          // First, search for all UIDs, then fetch the range we need
          console.log(`🔍 Searching for UIDs in range ${start}:${end} of ${totalMessages} messages...`);
          
          imap.search(['ALL'], (err, uids) => {
            if (err) {
              console.error(`❌ Search failed:`, err.message);
              imap.end();
              return reject(new Error(`Search failed: ${err.message}`));
            }
            
            if (!uids || uids.length === 0) {
              console.log(`📭 No UIDs found`);
              imap.end();
              return resolve({ emails: [], total: totalMessages });
            }
            
            // UIDs are already sorted, get the range we need (newest emails)
            const uidStart = Math.max(0, uids.length - (page * limit));
            const uidEnd = Math.max(0, uids.length - ((page - 1) * limit));
            const targetUIDs = uids.slice(uidStart, uidEnd).reverse(); // Newest first
            
            if (targetUIDs.length === 0) {
              console.log(`📭 No UIDs in requested page`);
              imap.end();
              return resolve({ emails: [], total: totalMessages });
            }
            
            console.log(`📨 Fetching ${targetUIDs.length} emails by UID...`);
            
            // Fetch by UID instead of sequence number
            const fetch = imap.fetch(targetUIDs, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              let emailData = {
                uid: null,
                seqno: seqno,
                seen: false,
                from: null,
                to: null,
                subject: null,
                date: null,
                preview: '',
                hasAttachments: false
              };

              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                stream.once('end', () => {
                  // Parse only essential header fields
                  const header = Imap.parseHeader(buffer);
                  emailData.from = header.from ? header.from[0] : null;
                  emailData.to = header.to || [];
                  emailData.subject = header.subject ? header.subject[0] : '';
                  emailData.date = header.date ? header.date[0] : null;
                });
              });

              msg.once('attributes', (attrs) => {
                emailData.uid = attrs.uid;
                emailData.seen = attrs.flags.includes('\\Seen');
                
                // Generate preview from BODYSTRUCTURE
                if (attrs.struct) {
                  emailData.preview = extractPreviewFromStructure(attrs.struct);
                  emailData.hasAttachments = checkForAttachments(attrs.struct);
                }
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
              console.log(`✅ Fetched ${emails.length} emails successfully`);
              imap.end();
            });
          }); // End of search callback
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

      // Timeout - must be declared before imap.connect()
      const timeoutHandle = setTimeout(() => {
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        reject(new Error('IMAP fetch timeout - mailbox may be too large or slow'));
      }, 50000); // 50 seconds timeout for large mailboxes (8000+ emails)

      imap.connect();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fetch single email body by UID
 * @param {Object} config - IMAP configuration
 * @param {number} uid - Email UID
 * @param {string} folder - Folder name
 * @returns {Promise<Object>} Email data with full body
 */
async function fetchSingleEmail(config, uid, folder = 'INBOX') {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port || 993,
      tls: config.secure !== false,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000
    });
    
    let emailData = null;
    
    imap.once('ready', () => {
      imap.openBox(folder, true, (err) => {
        if (err) {
          imap.end();
          return reject(new Error(`Failed to open ${folder}: ${err.message}`));
        }
        
        const fetch = imap.fetch([uid], { 
          bodies: '', // Fetch full message
          struct: true 
        });
        
        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                return reject(err);
              }
              
              emailData = {
                uid: uid,
                from: parsed.from ? {
                  name: parsed.from.value[0].name || '',
                  address: parsed.from.value[0].address || ''
                } : null,
                to: parsed.to ? parsed.to.value.map(t => ({
                  name: t.name || '',
                  address: t.address || ''
                })) : [],
                cc: parsed.cc ? parsed.cc.value : [],
                bcc: parsed.bcc ? parsed.bcc.value : [],
                subject: parsed.subject || '',
                date: parsed.date || null,
                text: parsed.text || '',
                html: parsed.html || '',
                attachments: parsed.attachments ? parsed.attachments.map(att => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size
                })) : []
              };
            });
          });
          
          msg.once('attributes', (attrs) => {
            if (emailData) {
              emailData.seen = attrs.flags.includes('\\Seen');
            }
          });
          
          msg.once('end', () => {
            imap.end();
          });
        });
        
        fetch.once('error', (err) => {
          imap.end();
          reject(err);
        });
      });
    });
    
    imap.once('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`IMAP error: ${err.message}`));
    });
    
    imap.once('end', () => {
      clearTimeout(timeoutHandle);
      if (emailData) {
        resolve(emailData);
      } else {
        reject(new Error('Email not found'));
      }
    });
    
    const timeoutHandle = setTimeout(() => {
      try {
        imap.end();
      } catch (e) {
        // Ignore
      }
      reject(new Error('IMAP fetch timeout'));
    }, 20000); // 20 seconds for single email
    
    imap.connect();
  });
}

module.exports = {
  testImapConnection,
  testSmtpConnection,
  testEmailAccount,
  getInboxStats,
  getEmailProviderPreset,
  fetchEmails,
  fetchSingleEmail
};
