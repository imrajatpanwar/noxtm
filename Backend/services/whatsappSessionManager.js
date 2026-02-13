const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppContact = require('../models/WhatsAppContact');
const WhatsAppMessage = require('../models/WhatsAppMessage');

// In-memory session store: accountId -> { socket, retryCount }
const sessions = new Map();

// Cooldown tracking for chatbot: `${accountId}:${contactJid}:${ruleId}` -> timestamp
const chatbotCooldowns = new Map();

// Reference to Socket.IO instance (set via init)
let io = null;

// Reference to chatbot engine (set via init to avoid circular deps)
let chatbotEngine = null;

const SESSIONS_DIR = path.join(__dirname, '..', 'whatsapp-sessions');
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY = 2000; // 2 seconds

/**
 * Initialize the session manager
 * @param {Object} socketIo - Socket.IO server instance
 * @param {Object} engine - Chatbot engine reference
 */
function init(socketIo, engine) {
  io = socketIo;
  chatbotEngine = engine;

  // Ensure sessions directory exists
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * Start a WhatsApp session for an account
 * @param {string} accountId - MongoDB account ID
 * @returns {Promise<Object>} The Baileys socket
 */
async function startSession(accountId) {
  // Don't start if already running
  if (sessions.has(accountId)) {
    const existing = sessions.get(accountId);
    if (existing.socket) {
      console.log(`[WA] Session already active for ${accountId}`);
      return existing.socket;
    }
  }

  const account = await WhatsAppAccount.findById(accountId);
  if (!account) throw new Error('WhatsApp account not found');

  const sessionDir = path.join(SESSIONS_DIR, account.sessionFolder);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
        child: () => ({ level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: console.warn, error: console.error })
      })
    },
    browser: Browsers.ubuntu('Noxtm'),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    logger: {
      level: 'silent',
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
      child: () => ({ level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: console.warn, error: console.error })
    }
  });

  sessions.set(accountId, { socket, retryCount: 0 });

  // --- Event: Credentials update ---
  socket.ev.on('creds.update', saveCreds);

  // --- Event: Connection update ---
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Emit QR code to frontend
    if (qr) {
      console.log(`[WA] QR code generated for ${accountId}`);
      emitToCompany(account.companyId, 'whatsapp:qr', {
        accountId,
        qr
      });
    }

    if (connection === 'open') {
      console.log(`[WA] Connected: ${accountId}`);
      const sessionInfo = sessions.get(accountId);
      if (sessionInfo) sessionInfo.retryCount = 0;

      // Update account in DB
      const me = socket.user;
      await WhatsAppAccount.findByIdAndUpdate(accountId, {
        status: 'connected',
        phoneNumber: me?.id?.split(':')[0] || me?.id?.split('@')[0] || account.phoneNumber,
        displayName: me?.name || account.displayName,
        lastConnected: new Date()
      });

      emitToCompany(account.companyId, 'whatsapp:connection-update', {
        accountId,
        status: 'connected',
        phoneNumber: me?.id?.split(':')[0] || me?.id?.split('@')[0],
        displayName: me?.name
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

      console.log(`[WA] Disconnected: ${accountId}, code: ${statusCode}, reconnect: ${shouldReconnect}`);

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        // User logged out or device removed — clean up session files for fresh re-link
        const sessionDir = path.join(SESSIONS_DIR, accountId);
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          console.log(`[WA] Cleaned session files for ${accountId}`);
        }

        await WhatsAppAccount.findByIdAndUpdate(accountId, {
          status: 'disconnected',
          lastDisconnected: new Date()
        });

        sessions.delete(accountId);

        emitToCompany(account.companyId, 'whatsapp:disconnected', {
          accountId,
          status: 'disconnected',
          reason: statusCode === 401 ? 'device_removed' : 'logged_out'
        });
      } else if (shouldReconnect) {
        // Attempt reconnect with exponential backoff
        const sessionInfo = sessions.get(accountId);
        const retryCount = sessionInfo ? sessionInfo.retryCount + 1 : 1;

        if (retryCount <= MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount - 1);
          console.log(`[WA] Reconnecting ${accountId} in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

          sessions.delete(accountId);

          setTimeout(async () => {
            try {
              await startSession(accountId);
            } catch (err) {
              console.error(`[WA] Reconnect failed for ${accountId}:`, err.message);
            }
          }, delay);

          // Preserve retry count for the new session
          sessions.set(accountId, { socket: null, retryCount });
        } else {
          console.log(`[WA] Max retries reached for ${accountId}`);
          await WhatsAppAccount.findByIdAndUpdate(accountId, {
            status: 'disconnected',
            lastDisconnected: new Date()
          });
          sessions.delete(accountId);

          emitToCompany(account.companyId, 'whatsapp:connection-update', {
            accountId,
            status: 'disconnected',
            reason: 'max_retries'
          });
        }
      }
    }
  });

  // --- Event: Incoming messages ---
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        await handleIncomingMessage(accountId, account.companyId, msg);
      } catch (err) {
        console.error(`[WA] Error handling message for ${accountId}:`, err.message);
      }
    }
  });

  // --- Event: Message status updates ---
  socket.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const { key, update: msgUpdate } = update;
        if (msgUpdate?.status) {
          const statusMap = { 2: 'sent', 3: 'delivered', 4: 'read' };
          const newStatus = statusMap[msgUpdate.status];
          if (newStatus && key.id) {
            await WhatsAppMessage.findOneAndUpdate(
              { whatsappMessageId: key.id },
              { status: newStatus }
            );
          }
        }
      } catch (err) {
        console.error(`[WA] Error updating message status:`, err.message);
      }
    }
  });

  return socket;
}

/**
 * Handle an incoming WhatsApp message
 */
async function handleIncomingMessage(accountId, companyId, msg) {
  // Skip status broadcasts, reactions to own messages, etc.
  if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

  const jid = msg.key.remoteJid;
  const pushName = msg.pushName || '';

  // Determine message type and content
  let type = 'text';
  let content = '';
  let mediaUrl = null;
  let mediaType = null;

  if (msg.message.conversation) {
    content = msg.message.conversation;
  } else if (msg.message.extendedTextMessage) {
    content = msg.message.extendedTextMessage.text;
  } else if (msg.message.imageMessage) {
    type = 'image';
    content = msg.message.imageMessage.caption || '';
    mediaType = msg.message.imageMessage.mimetype;
  } else if (msg.message.videoMessage) {
    type = 'video';
    content = msg.message.videoMessage.caption || '';
    mediaType = msg.message.videoMessage.mimetype;
  } else if (msg.message.audioMessage) {
    type = 'audio';
    mediaType = msg.message.audioMessage.mimetype;
  } else if (msg.message.documentMessage) {
    type = 'document';
    content = msg.message.documentMessage.fileName || '';
    mediaType = msg.message.documentMessage.mimetype;
  } else if (msg.message.stickerMessage) {
    type = 'sticker';
  } else if (msg.message.locationMessage) {
    type = 'location';
    content = `${msg.message.locationMessage.degreesLatitude},${msg.message.locationMessage.degreesLongitude}`;
  } else {
    // Unknown message type - still log it
    content = '[Unsupported message type]';
  }

  // Find or create contact (upsert to avoid race condition with concurrent messages)
  const phoneNumber = jid.split('@')[0];
  let contact = await WhatsAppContact.findOneAndUpdate(
    { accountId, whatsappId: jid },
    {
      $set: {
        companyId,
        accountId,
        whatsappId: jid,
        phoneNumber,
        pushName: pushName || undefined,
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 150),
        lastMessageDirection: 'inbound'
      },
      $inc: { unreadCount: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Save message
  const savedMessage = await WhatsAppMessage.create({
    companyId,
    accountId,
    contactId: contact._id,
    direction: 'inbound',
    type,
    content,
    mediaUrl,
    mediaType,
    whatsappMessageId: msg.key.id,
    status: 'delivered',
    timestamp: new Date(msg.messageTimestamp * 1000 || Date.now())
  });

  // Emit to frontend for live chat
  emitToCompany(companyId, 'whatsapp:new-message', {
    accountId,
    contactId: contact._id.toString(),
    message: {
      _id: savedMessage._id,
      direction: 'inbound',
      type,
      content,
      timestamp: savedMessage.timestamp,
      contact: {
        _id: contact._id,
        pushName: contact.pushName,
        phoneNumber: contact.phoneNumber,
        whatsappId: contact.whatsappId
      }
    }
  });

  // Run chatbot engine
  if (chatbotEngine && content) {
    try {
      const response = await chatbotEngine.processIncomingMessage(accountId, companyId, contact, content, chatbotCooldowns);
      if (response) {
        // Send automated response
        await sendMessage(accountId, jid, response.content, {
          type: response.type || 'text',
          mediaUrl: response.mediaUrl,
          isAutomated: true,
          chatbotRuleId: response.ruleId
        });
      }
    } catch (err) {
      console.error(`[WA] Chatbot error for ${accountId}:`, err.message);
    }
  }
}

/**
 * Send a WhatsApp message
 * @param {string} accountId - Account ID
 * @param {string} jid - WhatsApp JID (e.g. 919876543210@s.whatsapp.net)
 * @param {string} content - Message text
 * @param {Object} options - { type, mediaUrl, mediaType, isAutomated, chatbotRuleId, campaignId }
 * @returns {Promise<Object>} Saved message document
 */
async function sendMessage(accountId, jid, content, options = {}) {
  const session = sessions.get(accountId);
  if (!session || !session.socket) {
    throw new Error('WhatsApp session not connected');
  }

  const account = await WhatsAppAccount.findById(accountId);
  if (!account) throw new Error('Account not found');

  // Check daily limit
  if (!account.checkDailyLimit()) {
    throw new Error('Daily message limit reached');
  }

  // Simulate typing if enabled
  if (account.settings.typingSimulation) {
    try {
      await session.socket.sendPresenceUpdate('composing', jid);
      const typingDelay = 1000 + Math.random() * 2000; // 1-3 seconds
      await new Promise(r => setTimeout(r, typingDelay));
      await session.socket.sendPresenceUpdate('paused', jid);
    } catch (e) {
      // Typing simulation is best-effort
    }
  }

  // Build message content based on type
  let messageContent;
  const type = options.type || 'text';

  switch (type) {
    case 'image':
      messageContent = { image: { url: options.mediaUrl }, caption: content || undefined };
      break;
    case 'video':
      messageContent = { video: { url: options.mediaUrl }, caption: content || undefined };
      break;
    case 'audio':
      messageContent = { audio: { url: options.mediaUrl }, mimetype: 'audio/mpeg' };
      break;
    case 'document':
      messageContent = {
        document: { url: options.mediaUrl },
        fileName: options.mediaFilename || 'document',
        mimetype: options.mediaType || 'application/pdf'
      };
      break;
    default:
      messageContent = { text: content };
  }

  // Send the message
  const result = await session.socket.sendMessage(jid, messageContent);

  // Increment daily counter
  account.incrementDailyCount();
  await account.save();

  // Find or create contact (upsert to avoid race condition)
  let contact = await WhatsAppContact.findOneAndUpdate(
    { accountId, whatsappId: jid },
    {
      $set: {
        companyId: account.companyId,
        accountId,
        whatsappId: jid,
        phoneNumber: jid.split('@')[0],
        lastMessageAt: new Date(),
        lastMessagePreview: (content || '[Media]').substring(0, 150),
        lastMessageDirection: 'outbound'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Save message to DB
  const savedMessage = await WhatsAppMessage.create({
    companyId: account.companyId,
    accountId,
    contactId: contact._id,
    direction: 'outbound',
    type,
    content,
    mediaUrl: options.mediaUrl,
    mediaType: options.mediaType,
    whatsappMessageId: result.key.id,
    status: 'sent',
    isAutomated: options.isAutomated || false,
    chatbotRuleId: options.chatbotRuleId || null,
    campaignId: options.campaignId || null,
    timestamp: new Date()
  });

  // Emit to frontend
  emitToCompany(account.companyId, 'whatsapp:new-message', {
    accountId,
    contactId: contact._id.toString(),
    message: {
      _id: savedMessage._id,
      direction: 'outbound',
      type,
      content,
      status: 'sent',
      timestamp: savedMessage.timestamp,
      isAutomated: options.isAutomated || false
    }
  });

  return savedMessage;
}

/**
 * Stop a session gracefully
 */
async function stopSession(accountId) {
  const session = sessions.get(accountId);
  if (session && session.socket) {
    try {
      session.socket.ev.removeAllListeners();
      await session.socket.logout();
    } catch (e) {
      // Best-effort logout
    }
  }
  sessions.delete(accountId);
  await WhatsAppAccount.findByIdAndUpdate(accountId, {
    status: 'disconnected',
    lastDisconnected: new Date()
  });
}

/**
 * Disconnect session without clearing auth (for reconnect later)
 */
async function disconnectSession(accountId) {
  const session = sessions.get(accountId);
  if (session && session.socket) {
    try {
      session.socket.ev.removeAllListeners();
      session.socket.end(undefined);
    } catch (e) {
      // Best-effort
    }
  }
  sessions.delete(accountId);
}

/**
 * Remove session and delete auth state files
 */
async function removeSession(accountId) {
  await disconnectSession(accountId);

  const account = await WhatsAppAccount.findById(accountId);
  if (account) {
    const sessionDir = path.join(SESSIONS_DIR, account.sessionFolder);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}

/**
 * Restore all connected sessions on server startup
 */
async function restoreAllSessions() {
  try {
    const connectedAccounts = await WhatsAppAccount.find({ status: 'connected' });
    console.log(`[WA] Restoring ${connectedAccounts.length} WhatsApp sessions...`);

    for (const account of connectedAccounts) {
      try {
        await startSession(account._id.toString());
        console.log(`[WA] Restored session for ${account.phoneNumber || account._id}`);
      } catch (err) {
        console.error(`[WA] Failed to restore session ${account._id}:`, err.message);
        await WhatsAppAccount.findByIdAndUpdate(account._id, { status: 'disconnected' });
      }
    }
  } catch (err) {
    console.error('[WA] Error restoring sessions:', err.message);
  }
}

/**
 * Stop all sessions (for graceful shutdown)
 */
async function stopAllSessions() {
  console.log(`[WA] Stopping ${sessions.size} WhatsApp sessions...`);
  for (const [accountId] of sessions) {
    try {
      await disconnectSession(accountId);
    } catch (e) {
      // Best-effort cleanup
    }
  }
}

/**
 * Get session status
 */
function getSessionStatus(accountId) {
  const session = sessions.get(accountId);
  return {
    active: !!session?.socket,
    retryCount: session?.retryCount || 0
  };
}

/**
 * Check if a session is connected
 */
function isConnected(accountId) {
  const session = sessions.get(accountId);
  return !!session?.socket;
}

/**
 * Emit event to all users in a company's WhatsApp room
 */
function emitToCompany(companyId, event, data) {
  if (io) {
    io.to(`whatsapp:${companyId}`).emit(event, data);
  }
}

/**
 * Get active session count
 */
function getActiveSessionCount() {
  let count = 0;
  for (const [, session] of sessions) {
    if (session.socket) count++;
  }
  return count;
}

module.exports = {
  init,
  startSession,
  stopSession,
  disconnectSession,
  removeSession,
  restoreAllSessions,
  stopAllSessions,
  sendMessage,
  getSessionStatus,
  isConnected,
  getActiveSessionCount,
  chatbotCooldowns,
  emitToCompany
};
