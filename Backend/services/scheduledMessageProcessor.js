const WhatsAppScheduledMsg = require('../models/WhatsAppScheduledMsg');
const WhatsAppKeypoint = require('../models/WhatsAppKeypoint');
const sessionManager = require('./whatsappSessionManager');

const PROCESS_INTERVAL = 60 * 1000; // Check every 1 minute
let intervalTimer = null;

/**
 * Start the scheduled message processor
 * Runs every minute, finds pending messages where scheduledAt <= now, sends them
 */
function start() {
  if (intervalTimer) return;
  console.log('[Scheduler] Started scheduled message processor (interval: 1 min)');
  intervalTimer = setInterval(processScheduledMessages, PROCESS_INTERVAL);
  // Also run immediately on start
  setTimeout(processScheduledMessages, 5000);
}

function stop() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('[Scheduler] Stopped scheduled message processor');
  }
}

async function processScheduledMessages() {
  try {
    // Find all pending messages where scheduledAt is in the past
    const pendingMessages = await WhatsAppScheduledMsg.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() }
    }).limit(20).lean();

    if (pendingMessages.length === 0) return;

    console.log(`[Scheduler] Processing ${pendingMessages.length} scheduled message(s)`);

    for (const msg of pendingMessages) {
      try {
        // Check if session is connected
        if (!sessionManager.isConnected(msg.accountId.toString())) {
          console.warn(`[Scheduler] Session not connected for account ${msg.accountId}, skipping msg ${msg._id}`);
          continue; // Don't mark as failed, will retry next cycle
        }

        // Send the message
        await sessionManager.sendMessage(msg.accountId.toString(), msg.jid, msg.content, {
          type: 'text',
          isAutomated: true,
          chatbotReply: true
        });

        // Mark as sent
        await WhatsAppScheduledMsg.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', sentAt: new Date() } }
        );

        // Update linked keypoint if exists
        await WhatsAppKeypoint.updateMany(
          { scheduledMsgId: msg._id },
          { $set: { text: `✅ Follow-up sent: ${msg.content.substring(0, 80)}` } }
        );

        console.log(`[Scheduler] Sent scheduled message ${msg._id} to ${msg.jid}`);
      } catch (err) {
        console.error(`[Scheduler] Failed to send message ${msg._id}:`, err.message);
        
        // Mark as failed after error
        await WhatsAppScheduledMsg.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', error: err.message.substring(0, 500) } }
        );
      }
    }
  } catch (err) {
    console.error('[Scheduler] Process error:', err.message);
  }
}

module.exports = { start, stop, processScheduledMessages };
