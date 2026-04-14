const mongoose = require('mongoose');
const AssistantAction = require('../models/AssistantAction');
const Task = require('../models/Task');

const PROCESS_INTERVAL = 60 * 1000; // Check every 1 minute
let intervalTimer = null;

/**
 * Start the assistant action processor
 * Runs every minute, finds pending actions where scheduledAt <= now, executes them
 */
function start() {
  if (intervalTimer) return;
  console.log('[AssistantActions] Started action processor (interval: 1 min)');
  intervalTimer = setInterval(processActions, PROCESS_INTERVAL);
  setTimeout(processActions, 10000); // Run 10s after startup
}

function stop() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('[AssistantActions] Stopped action processor');
  }
}

async function processActions() {
  try {
    const pendingActions = await AssistantAction.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() }
    }).limit(20).lean();

    if (pendingActions.length === 0) return;

    console.log(`[AssistantActions] Processing ${pendingActions.length} action(s)`);

    for (const action of pendingActions) {
      // Mark as processing to prevent double-execution
      await AssistantAction.updateOne({ _id: action._id }, { $set: { status: 'processing' } });

      try {
        await executeAction(action);
        await AssistantAction.updateOne(
          { _id: action._id },
          { $set: { status: 'completed', executedAt: new Date() } }
        );
        console.log(`[AssistantActions] Completed: ${action.description}`);
      } catch (err) {
        console.error(`[AssistantActions] Failed action ${action._id}:`, err.message);
        await AssistantAction.updateOne(
          { _id: action._id },
          { $set: { status: 'failed', error: err.message.substring(0, 500) } }
        );
      }
    }
  } catch (err) {
    console.error('[AssistantActions] Process error:', err.message);
  }
}

async function executeAction(action) {
  const { actionType, payload, companyId, createdBy } = action;

  switch (actionType) {
    case 'send_whatsapp': {
      if (!payload.jid || !payload.message) {
        throw new Error('Missing WhatsApp JID or message');
      }
      const sessionManager = require('./whatsappSessionManager');
      const WhatsAppAccount = require('../models/WhatsAppAccount');

      let accountId = payload.whatsappAccountId?.toString();
      if (!accountId) {
        const account = await WhatsAppAccount.findOne({ companyId, status: 'connected' }).lean();
        if (!account) throw new Error('No connected WhatsApp account');
        accountId = account._id.toString();
      }

      if (!sessionManager.isConnected(accountId)) {
        throw new Error('WhatsApp session not connected');
      }

      await sessionManager.sendMessage(accountId, payload.jid, payload.message, {
        type: 'text',
        isAutomated: true,
        chatbotReply: true
      });
      break;
    }

    case 'send_team_message':
    case 'ask_update': {
      if (!payload.recipientUserId || !payload.message) {
        throw new Error('Missing recipient or message for team message');
      }

      const Conversation = mongoose.model('Conversation');
      const Message = mongoose.model('Message');

      // Find or create a direct conversation between bot sender and recipient
      let conversation = await Conversation.findOne({
        companyId,
        type: 'direct',
        'participants.user': { $all: [createdBy, payload.recipientUserId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          companyId,
          type: 'direct',
          participants: [createdBy, payload.recipientUserId].map(id => ({
            user: id,
            joinedAt: new Date(),
            lastReadAt: new Date()
          })),
          createdBy
        });
      }

      await Message.create({
        conversationId: conversation._id,
        companyId,
        sender: createdBy,
        content: payload.message.trim(),
        type: 'text',
        readBy: [{ user: createdBy, readAt: new Date() }]
      });

      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { lastMessage: { content: payload.message.trim(), sender: createdBy, timestamp: new Date() }, updatedAt: new Date() } }
      );

      console.log(`[AssistantActions] ${actionType} sent to ${payload.recipientName}: ${payload.message}`);
      break;
    }

    case 'create_task': {
      await Task.create({
        title: payload.taskTitle || 'Scheduled Task',
        description: payload.message || '',
        priority: payload.taskPriority || 'Medium',
        assignees: payload.taskAssignees || [],
        dueDate: payload.taskDueDate,
        createdBy,
        companyId,
        activity: [{
          user: createdBy,
          action: 'created',
          details: 'Created by Noxtm Assistant (scheduled)'
        }]
      });
      break;
    }

    case 'reminder': {
      // Reminders are logged and can trigger a notification
      console.log(`[AssistantActions] Reminder for user ${createdBy}: ${payload.message}`);
      break;
    }

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

module.exports = { start, stop, processActions };
