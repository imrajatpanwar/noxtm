const Imap = require('imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const { decode: decodeQuotedPrintable } = require('quoted-printable');
const utf8 = require('utf8');

/**
 * Decode quoted-printable and clean email preview text
 * @param {string} text - Raw text that may contain QP encoding
 * @returns {string} - Decoded clean text
 */
function decodeEmailText(text) {
  if (!text) return '';

  try {
    // Check if text contains quoted-printable patterns (=XX)
    if (/=[0-9A-F]{2}/i.test(text)) {
      // Decode quoted-printable
      const decoded = decodeQuotedPrintable(text);
      // Decode UTF-8
      return utf8.decode(decoded);
    }
    return text;
  } catch (e) {
    // If decoding fails, try to clean up the raw text
    // Remove =XX patterns that couldn't be decoded
    return text.replace(/=[0-9A-F]{2}/gi, '').replace(/=\r?\n/g, '');
  }
}

/**
 * Clean email preview text - remove URLs, HTML, and tracking content
 * @param {string} text - Raw text from email
 * @returns {string} - Clean readable preview text
 */
function cleanEmailPreview(text) {
  if (!text) return '';

  let cleaned = text;

  // Decode quoted-printable first
  cleaned = decodeEmailText(cleaned);

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  // Remove URLs (http, https, ftp)
  cleaned = cleaned.replace(/https?:\/\/[^\s)>\]]+/gi, '');
  cleaned = cleaned.replace(/ftp:\/\/[^\s)>\]]+/gi, '');

  // Remove email addresses in angle brackets
  cleaned = cleaned.replace(/<[^@\s]+@[^>\s]+>/g, '');

  // Remove common tracking patterns
  cleaned = cleaned.replace(/\([^)]*click\.[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\([^)]*tracking[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\([^)]*convertkit[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\([^)]*mail2\.com[^)]*\)/gi, '');

  // Remove base64-like strings (long alphanumeric sequences)
  cleaned = cleaned.replace(/[a-zA-Z0-9]{50,}/g, '');

  // Remove leftover parentheses with just whitespace or dashes
  cleaned = cleaned.replace(/\(\s*-?\s*\)/g, '');
  cleaned = cleaned.replace(/-\s*\(\s*\)/g, '');

  // Remove "View in browser" and similar common phrases
  cleaned = cleaned.replace(/view\s*(this\s*)?(email\s*)?in\s*(your\s*)?(browser|web)/gi, '');
  cleaned = cleaned.replace(/unsubscribe/gi, '');

  // Remove MIME boundaries and headers
  cleaned = cleaned.replace(/^------=.*$/gm, '');
  cleaned = cleaned.replace(/^Content-Type:.*$/gmi, '');
  cleaned = cleaned.replace(/^Content-Transfer-Encoding:.*$/gmi, '');
  cleaned = cleaned.replace(/^Content-Disposition:.*$/gmi, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' ');
  cleaned = cleaned.replace(/^\s*-\s*/g, '');

  return cleaned.trim();
}

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
        connTimeout: 10000,
        authTimeout: 10000,
        socketTimeout: 30000,
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        }
      });

      let emails = [];
      let totalMessages = 0;
      let finished = false;
      let timeoutHandle;

      const safeEnd = () => {
        try {
          imap.end();
        } catch (e) {
          // Ignore end errors
        }
      };

      const resolveOnce = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutHandle);
        // Sort by seqno descending (newest first)
        emails.sort((a, b) => b.seqno - a.seqno);
        resolve({ emails, total: totalMessages });
      };

      const rejectOnce = (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutHandle);
        reject(err);
      };

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
            
            console.log(`📨 Fetching ${targetUIDs.length} emails by UID: [${targetUIDs.slice(0,5).join(',')}...]`);
            
            let messagesReceived = 0;
            let messagesCompleted = 0;
            const startTime = Date.now();
            
            // Fetch by UID instead of sequence number
            // Include first text part for email preview (BODY.PEEK to not mark as read)
            const fetch = imap.fetch(targetUIDs, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', '1.1'],
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              messagesReceived++;
              console.log(`  📬 Message ${messagesReceived}/${targetUIDs.length} started (seqno: ${seqno})`);
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
                  // Check if this is header or body text
                  if (info.which === '1.1') {
                    // This is the first text/plain part - extract preview
                    // Remove MIME headers and boundaries
                    let cleanText = buffer;

                    // Remove MIME boundary markers and headers
                    cleanText = cleanText.replace(/^------=.*$/gm, ''); // Boundary markers
                    cleanText = cleanText.replace(/^Content-Type:.*$/gm, ''); // Content-Type headers
                    cleanText = cleanText.replace(/^Content-Transfer-Encoding:.*$/gm, ''); // Encoding headers
                    cleanText = cleanText.replace(/^Content-Disposition:.*$/gm, ''); // Disposition headers

                    // Clean and decode email preview text
                    cleanText = cleanEmailPreview(cleanText);

                    // Extract preview (150 chars max for better readability)
                    const textPreview = cleanText.length > 150
                      ? cleanText.substring(0, 150) + '...'
                      : cleanText;

                    emailData.preview = textPreview || '';
                  } else if (info.which.includes('HEADER')) {
                    // Parse header fields
                    const header = Imap.parseHeader(buffer);
                    emailData.from = header.from ? header.from[0] : null;
                    emailData.to = header.to || [];
                    emailData.subject = header.subject ? header.subject[0] : '';
                    emailData.date = header.date ? header.date[0] : null;
                  }
                });
              });

              msg.once('attributes', (attrs) => {
                emailData.uid = attrs.uid;
                emailData.seen = attrs.flags.includes('\\Seen');

                // Check for attachments from BODYSTRUCTURE
                if (attrs.struct) {
                  emailData.hasAttachments = checkForAttachments(attrs.struct);
                  // Only set preview from struct if we don't have one from TEXT body
                  if (!emailData.preview || emailData.preview === '') {
                    emailData.preview = extractPreviewFromStructure(attrs.struct);
                  }
                }
              });

              msg.once('end', () => {
                messagesCompleted++;
                console.log(`  ✓ Message ${messagesCompleted}/${targetUIDs.length} completed`);
                
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
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.error(`❌ Fetch error after ${elapsed}s: ${err.message}`);
              console.error(`   Received: ${messagesReceived}, Completed: ${messagesCompleted}`);
              safeEnd();
              rejectOnce(err);
            });

            fetch.once('end', () => {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.log(`✅ Fetch completed: ${emails.length} emails in ${elapsed}s (${messagesReceived} received, ${messagesCompleted} completed)`);
              safeEnd();
              resolveOnce();
            });
          }); // End of search callback
        });
      });

      imap.once('error', (err) => {
        safeEnd();
        rejectOnce(new Error(`IMAP error: ${err.message}`));
      });

      imap.once('end', () => {
        resolveOnce();
      });

      // Timeout - must be declared before imap.connect()
      timeoutHandle = setTimeout(() => {
        safeEnd();
        rejectOnce(new Error('IMAP fetch timeout - mailbox may be too large or slow'));
      }, 75000); // 75 seconds timeout for large mailboxes

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
    let finished = false;
    let connectionClosed = false;
    let timeoutHandle;
    let parsePromise = null;
    let messageFlags = null;

    const finish = (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutHandle);
      if (err) {
        return reject(err);
      }
      resolve(emailData);
    };

    const closeConnection = () => {
      if (connectionClosed) return;
      connectionClosed = true;
      try {
        imap.end();
      } catch (e) {
        // Ignore
      }
    };
    
    imap.once('ready', () => {
      console.log(`📥 [IMAP] Connected for ${config.username}, fetching UID ${uid}`);
      imap.openBox(folder, true, (err) => {
        if (err) {
          closeConnection();
          return reject(new Error(`Failed to open ${folder}: ${err.message}`));
        }
        console.log(`📥 [IMAP] ${config.username} opened ${folder}, requesting UID ${uid}`);
        
        const fetch = imap.fetch([uid], { 
          bodies: '', // Fetch full message
          struct: true,
          uid: true
        });
        
        fetch.on('message', (msg) => {
          console.log(`📥 [IMAP] Message stream started for UID ${uid}`);
          msg.on('body', (stream) => {
            parsePromise = simpleParser(stream)
              .then((parsed) => {
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
                  attachments: parsed.attachments ? parsed.attachments.map((att, index) => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    content: att.content ? att.content.toString('base64') : null,
                    index: index
                  })) : []
                };

                if (messageFlags) {
                  emailData.seen = messageFlags.includes('\\Seen');
                }
              })
              .catch((err) => {
                closeConnection();
                finish(err);
              });
          });
          
          msg.once('attributes', (attrs) => {
            messageFlags = attrs.flags || [];

            if (emailData) {
              emailData.seen = messageFlags.includes('\\Seen');
            }
          });
          
          msg.once('end', () => {
            console.log(`📥 [IMAP] Message stream ended for UID ${uid}`);

            const finalize = () => {
              closeConnection();
              if (emailData) {
                finish();
              } else {
                finish(new Error('Email not parsed'));
              }
            };

            if (parsePromise && typeof parsePromise.then === 'function') {
              parsePromise.then(finalize).catch((err) => {
                closeConnection();
                finish(err);
              });
            } else {
              finalize();
            }
          });
        });
        
        fetch.once('error', (err) => {
          closeConnection();
          finish(err);
        });

        fetch.once('end', () => {
          console.log(`📥 [IMAP] Fetch completed for UID ${uid}`);
          // Ensures the connection closes even if no message was delivered
          closeConnection();
        });
      });
    });
    
    imap.once('error', (err) => {
      finish(new Error(`IMAP error: ${err.message}`));
    });
    
    imap.once('end', () => {
      if (emailData) {
        finish();
      } else {
        finish(new Error('Email not found'));
      }
    });
    
    timeoutHandle = setTimeout(() => {
      closeConnection();
      finish(new Error('IMAP fetch timeout'));
    }, 20000); // 20 seconds for single email
    
    imap.connect();
  });
}

/**
 * Append email to IMAP folder (for saving sent emails)
 * @param {Object} config - IMAP configuration
 * @param {string} folder - Target folder (e.g., 'Sent')
 * @param {Object} emailData - Email data {from, to, cc, bcc, subject, body, date, messageId}
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function appendEmailToFolder(config, folder, emailData) {
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
        // Build RFC822 formatted email message
        const toAddresses = Array.isArray(emailData.to)
          ? emailData.to.join(', ')
          : emailData.to;
        const ccAddresses = emailData.cc && emailData.cc.length > 0
          ? emailData.cc.join(', ')
          : '';
        const bccAddresses = emailData.bcc && emailData.bcc.length > 0
          ? emailData.bcc.join(', ')
          : '';

        const dateStr = emailData.date ? emailData.date.toUTCString() : new Date().toUTCString();

        // Extract plain text from HTML for better preview
        const plainText = emailData.plainText ||
          (emailData.body ? emailData.body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');

        // Create multipart MIME message with both plain text and HTML
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        let message = `From: ${emailData.from}\r\n`;
        message += `To: ${toAddresses}\r\n`;
        if (ccAddresses) message += `Cc: ${ccAddresses}\r\n`;
        if (bccAddresses) message += `Bcc: ${bccAddresses}\r\n`;
        message += `Subject: ${emailData.subject || '(No Subject)'}\r\n`;
        message += `Date: ${dateStr}\r\n`;
        message += `Message-ID: <${emailData.messageId}>\r\n`;
        message += `MIME-Version: 1.0\r\n`;
        message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
        message += `\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset=utf-8\r\n`;
        message += `Content-Transfer-Encoding: 7bit\r\n`;
        message += `\r\n`;
        message += plainText + '\r\n';
        message += `\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/html; charset=utf-8\r\n`;
        message += `Content-Transfer-Encoding: 7bit\r\n`;
        message += `\r\n`;
        message += (emailData.body || '') + '\r\n';
        message += `\r\n`;
        message += `--${boundary}--\r\n`;

        // Attempt to append to folder
        imap.openBox(folder, false, (err, box) => {
          if (err) {
            // Folder might not exist, try to create it
            imap.addBox(folder, (addErr) => {
              if (addErr) {
                imap.end();
                return reject(new Error(`Failed to create ${folder} folder: ${addErr.message}`));
              }

              // Retry opening after creation
              imap.openBox(folder, false, (openErr, newBox) => {
                if (openErr) {
                  imap.end();
                  return reject(new Error(`Failed to open ${folder} after creation: ${openErr.message}`));
                }

                performAppend();
              });
            });
          } else {
            performAppend();
          }
        });

        function performAppend() {
          imap.append(Buffer.from(message), {
            mailbox: folder,
            flags: ['\\Seen']  // Mark as read
          }, (appendErr) => {
            imap.end();

            if (appendErr) {
              return reject(new Error(`Failed to append to ${folder}: ${appendErr.message}`));
            }

            resolve({
              success: true,
              message: `Email appended to ${folder} folder successfully`
            });
          });
        }
      });

      imap.once('error', (err) => {
        reject(new Error(`IMAP connection error: ${err.message}`));
      });

      imap.once('end', () => {
        // Connection ended
      });

      imap.connect();
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
  fetchEmails,
  fetchSingleEmail,
  appendEmailToFolder
};
