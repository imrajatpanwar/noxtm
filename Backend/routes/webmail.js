const express = require('express');
const router = express.Router();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Import from parent context (will be passed as middleware)
let authenticateToken;

// IMAP Configuration for mail.noxtm.com
const getImapConfig = (username, password) => ({
  user: username,
  password: password,
  host: 'mail.noxtm.com',
  port: 143,
  tls: false,
  tlsOptions: { rejectUnauthorized: false }
});

// Initialize routes with dependencies
function initializeRoutes(dependencies) {
  authenticateToken = dependencies.authenticateToken;

  // ===== WEBMAIL API ENDPOINTS =====

  // Test IMAP connection (no auth required - email credentials are the auth)
  router.post('/connect', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
      const imap = new Imap(getImapConfig(username, password));

      imap.once('ready', () => {
        imap.end();
        res.json({ success: true, message: 'Connection successful' });
      });

      imap.once('error', (err) => {
        res.status(403).json({ success: false, message: 'Invalid email credentials or connection error', error: err.message });
      });

      imap.connect();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Connection failed', error: error.message });
    }
  });

  // Get list of mailboxes/folders
  router.post('/folders', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
      const imap = new Imap(getImapConfig(username, password));

      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          imap.end();
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to get folders', error: err.message });
          }
          res.json({ success: true, folders: boxes });
        });
      });

      imap.once('error', (err) => {
        res.status(500).json({ success: false, message: 'IMAP error', error: err.message });
      });

      imap.connect();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get folders', error: error.message });
    }
  });

  // Get emails from inbox
  router.post('/inbox', async (req, res) => {
    const { username, password, folder = 'INBOX', limit = 50 } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
      const imap = new Imap(getImapConfig(username, password));
      const emails = [];

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            return res.status(500).json({ success: false, message: 'Failed to open mailbox', error: err.message });
          }

          if (box.messages.total === 0) {
            imap.end();
            return res.json({ success: true, emails: [], total: 0 });
          }

          // Fetch last N messages
          const fetchStart = Math.max(1, box.messages.total - limit + 1);
          const fetchEnd = box.messages.total;
          const fetch = imap.seq.fetch(`${fetchStart}:${fetchEnd}`, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            const email = { seqno };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', () => {
                const parsed = Imap.parseHeader(buffer);
                email.from = parsed.from ? parsed.from[0] : '';
                email.to = parsed.to ? parsed.to[0] : '';
                email.subject = parsed.subject ? parsed.subject[0] : '(No Subject)';
                email.date = parsed.date ? parsed.date[0] : '';
              });
            });

            msg.once('attributes', (attrs) => {
              email.uid = attrs.uid;
              email.flags = attrs.flags;
              email.size = attrs.size;
            });

            msg.once('end', () => {
              emails.push(email);
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            res.status(500).json({ success: false, message: 'Fetch error', error: err.message });
          });

          fetch.once('end', () => {
            imap.end();
            // Sort by seqno descending (newest first)
            emails.sort((a, b) => b.seqno - a.seqno);
            res.json({ success: true, emails, total: box.messages.total });
          });
        });
      });

      imap.once('error', (err) => {
        res.status(500).json({ success: false, message: 'IMAP error', error: err.message });
      });

      imap.connect();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch emails', error: error.message });
    }
  });

  // Get single email by UID
  router.post('/email/:uid', async (req, res) => {
    const { username, password, folder = 'INBOX' } = req.body;
    const { uid } = req.params;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
      const imap = new Imap(getImapConfig(username, password));

      imap.once('ready', () => {
        imap.openBox(folder, true, (err) => {
          if (err) {
            imap.end();
            return res.status(500).json({ success: false, message: 'Failed to open mailbox', error: err.message });
          }

          const fetch = imap.fetch(uid, { bodies: '' });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                imap.end();
                if (err) {
                  return res.status(500).json({ success: false, message: 'Failed to parse email', error: err.message });
                }

                res.json({
                  success: true,
                  email: {
                    from: parsed.from?.text || '',
                    to: parsed.to?.text || '',
                    subject: parsed.subject || '(No Subject)',
                    date: parsed.date,
                    text: parsed.text,
                    html: parsed.html,
                    attachments: parsed.attachments?.map(att => ({
                      filename: att.filename,
                      contentType: att.contentType,
                      size: att.size
                    }))
                  }
                });
              });
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            res.status(500).json({ success: false, message: 'Fetch error', error: err.message });
          });
        });
      });

      imap.once('error', (err) => {
        res.status(500).json({ success: false, message: 'IMAP error', error: err.message });
      });

      imap.connect();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch email', error: error.message });
    }
  });

  // Send email via SMTP
  router.post('/send', async (req, res) => {
    const { username, password, to, subject, text, html } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    if (!to || !subject) {
      return res.status(400).json({ success: false, message: 'To and subject are required' });
    }

    try {
      // Create SMTP transporter
      const transporter = nodemailer.createTransport({
        host: 'mail.noxtm.com',
        port: 25,
        secure: false,
        auth: {
          user: username,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Send email
      const info = await transporter.sendMail({
        from: `${username}@noxtm.com`,
        to,
        subject,
        text,
        html
      });

      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: error.message
      });
    }
  });

  // Delete email
  router.post('/delete/:uid', async (req, res) => {
    const { username, password, folder = 'INBOX' } = req.body;
    const { uid } = req.params;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
      const imap = new Imap(getImapConfig(username, password));

      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end();
            return res.status(500).json({ success: false, message: 'Failed to open mailbox', error: err.message });
          }

          imap.addFlags(uid, ['\\Deleted'], (err) => {
            if (err) {
              imap.end();
              return res.status(500).json({ success: false, message: 'Failed to delete email', error: err.message });
            }

            imap.expunge((err) => {
              imap.end();
              if (err) {
                return res.status(500).json({ success: false, message: 'Failed to expunge', error: err.message });
              }
              res.json({ success: true, message: 'Email deleted successfully' });
            });
          });
        });
      });

      imap.once('error', (err) => {
        res.status(500).json({ success: false, message: 'IMAP error', error: err.message });
      });

      imap.connect();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete email', error: error.message });
    }
  });

  return router;
}

module.exports = { initializeRoutes };
