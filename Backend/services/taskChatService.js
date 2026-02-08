/**
 * Task Chat Service — conversational task creation via Noxtm Chat Bot
 * 
 * When a user says "create task" (English/Hinglish), the bot walks them
 * step-by-step: title → description → priority → due date → assignee → project → confirm.
 * Each step can be skipped. The user can cancel at any time.
 * 
 * Requires "ChatAutomation" module to be active for the user.
 */

const TaskIntent = require('../models/TaskIntent');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

// ─── Trigger keywords ─────────────────────────────────────
const TASK_TRIGGERS = [
  'create task', 'create a task', 'new task', 'add task', 'add a task',
  'make task', 'make a task', 'task create', 'task banana', 'task banao',
  'task bana do', 'task bana de', 'ek task bana', 'task add karo',
  'task add kar do', 'mujhe task banana hai', 'task create karo',
  'assign task', 'assign a task', 'task assign karo',
  'todo add', 'todo create', 'add todo', 'create todo'
];

const CANCEL_KEYWORDS = ['cancel', 'nahi', 'nah', 'stop', 'ruk', 'band karo', 'mat karo', 'cancel karo', 'skip all'];
const SKIP_KEYWORDS = ['skip', 'chhod do', 'rehne do', 'nahi chahiye', 'skip karo', 'leave it', 'no need', '-'];
const CONFIRM_KEYWORDS = ['yes', 'haan', 'ha', 'confirm', 'done', 'theek hai', 'thik hai', 'ok', 'okay', 'sahi hai', 'create it', 'bana do', 'kar do', 'go ahead'];

// ─── Helpers ───────────────────────────────────────────────
function detectTaskIntent(message) {
  const msg = message.toLowerCase().trim();
  return TASK_TRIGGERS.some(trigger => msg.includes(trigger));
}

function isCancel(message) {
  const msg = message.toLowerCase().trim();
  return CANCEL_KEYWORDS.some(k => msg === k || msg.startsWith(k));
}

function isSkip(message) {
  const msg = message.toLowerCase().trim();
  return SKIP_KEYWORDS.some(k => msg === k || msg.startsWith(k));
}

function isConfirm(message) {
  const msg = message.toLowerCase().trim();
  return CONFIRM_KEYWORDS.some(k => msg === k || msg.startsWith(k));
}

function parsePriority(message) {
  const msg = message.toLowerCase().trim();
  if (['urgent', 'asap', 'jaldi', 'turant', 'abhi'].some(k => msg.includes(k))) return 'Urgent';
  if (['high', 'important', 'zaroori', 'jaruri'].some(k => msg.includes(k))) return 'High';
  if (['medium', 'normal', 'thik', 'theek', 'mid'].some(k => msg.includes(k))) return 'Medium';
  if (['low', 'later', 'baad', 'chill', 'no rush', 'koi jaldi nahi'].some(k => msg.includes(k))) return 'Low';
  const directMap = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
  return directMap[msg] || null;
}

function parseDate(message) {
  const msg = message.toLowerCase().trim();
  const now = new Date();

  if (msg.includes('today') || msg.includes('aaj')) {
    return now.toISOString().split('T')[0];
  }
  if (msg.includes('tomorrow') || msg.includes('kal')) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (msg.includes('next week') || msg.includes('agle hafte')) {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  const daysMatch = msg.match(/in (\d+) days?/i) || msg.match(/(\d+) din/i);
  if (daysMatch) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(daysMatch[1]));
    return d.toISOString().split('T')[0];
  }
  const isoMatch = msg.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return isoMatch[0];
  const dmyMatch = msg.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  return null;
}

// ─── Active intent lookup ─────────────────────────────────
async function getActiveIntent(userId) {
  return await TaskIntent.findOne({
    userId,
    status: { $in: ['collecting', 'confirming'] }
  }).sort({ createdAt: -1 });
}

// ─── Start new task creation ──────────────────────────────
async function startTaskCreation(userId, companyId, message) {
  // Cancel any stale intents
  await TaskIntent.updateMany(
    { userId, status: { $in: ['collecting', 'confirming'] } },
    { status: 'cancelled' }
  );

  const intent = new TaskIntent({ userId, companyId, status: 'collecting', currentStep: 'title' });

  // Try to extract title from the trigger itself, e.g. "create task fix the login bug"
  const msg = message.toLowerCase();
  let extractedTitle = '';
  for (const trigger of TASK_TRIGGERS) {
    if (msg.includes(trigger)) {
      const afterTrigger = message.substring(msg.indexOf(trigger) + trigger.length).trim();
      extractedTitle = afterTrigger.replace(/^[:\-–—\s]+/, '').trim();
      break;
    }
  }

  if (extractedTitle && extractedTitle.length > 2) {
    intent.collectedData.title = extractedTitle;
    intent.currentStep = 'description';
    await intent.save();
    return { handled: true, response: `Task: "${extractedTitle}"\n\nNice! Ab iska description bata do? (ya "skip" bol do)` };
  }

  await intent.save();
  return { handled: true, response: `Task Create Karte Hai!\n\nSabse pehle, task ka title bata do — kya karna hai?` };
}

// ─── Process next step ────────────────────────────────────
async function processTaskStep(userId, companyId, message) {
  const intent = await getActiveIntent(userId);
  if (!intent) return { handled: false };

  if (isCancel(message)) {
    intent.status = 'cancelled';
    await intent.save();
    return { handled: true, response: `Task creation cancelled. Koi baat nahi, jab chahiye tab bol dena!` };
  }

  const step = intent.currentStep;
  const data = intent.collectedData;

  switch (step) {
    case 'title': {
      data.title = message.trim().substring(0, 200);
      intent.currentStep = 'description';
      await intent.save();
      return { handled: true, response: `Title: "${data.title}"\n\nAb description bata do — thoda detail mein kya karna hai? (ya "skip")` };
    }

    case 'description': {
      if (!isSkip(message)) data.description = message.trim().substring(0, 1000);
      intent.currentStep = 'priority';
      await intent.save();
      return {
        handled: true,
        response: `${data.description ? 'Description saved!' : 'Skipped description.'}\n\nPriority kya hogi?\nUrgent | High | Medium | Low\n\n(ya "skip" for Medium default)`
      };
    }

    case 'priority': {
      if (!isSkip(message)) {
        const priority = parsePriority(message);
        if (priority) {
          data.priority = priority;
        } else {
          return { handled: true, response: `Samajh nahi aaya. Please choose:\nUrgent | High | Medium | Low` };
        }
      } else {
        data.priority = 'Medium';
      }
      intent.currentStep = 'dueDate';
      await intent.save();
      return { handled: true, response: `Priority: ${data.priority}\n\nDue date kab hai? (e.g., "tomorrow", "in 3 days", "25/02/2026" ya "skip")` };
    }

    case 'dueDate': {
      if (!isSkip(message)) {
        const date = parseDate(message);
        if (date) {
          data.dueDate = date;
        } else {
          return { handled: true, response: `Date samajh nahi aayi. Try: "tomorrow", "kal", "in 5 days", "25/02/2026" ya "skip"` };
        }
      }
      intent.currentStep = 'assignee';
      await intent.save();

      // Show team members for easy selection
      const teamMembers = await User.find({ companyId }).select('fullName email').limit(15).lean();
      let teamList = '';
      if (teamMembers.length > 1) {
        teamList = '\n\nTeam members:\n' + teamMembers.map((u, i) => `${i + 1}. ${u.fullName} (${u.email})`).join('\n');
      }

      return {
        handled: true,
        response: `${data.dueDate ? `Due: ${data.dueDate}` : 'No due date set.'}\n\nKise assign karna hai? Name/email/number bata do, "me" for yourself, ya "skip"${teamList}`
      };
    }

    case 'assignee': {
      if (!isSkip(message)) {
        const msg = message.toLowerCase().trim();
        if (['me', 'mujhe', 'khud ko', 'myself', 'mujhko'].includes(msg)) {
          data.assigneeId = userId;
          data.assigneeEmail = 'self';
        } else {
          // Try number pick from team list
          const num = parseInt(msg);
          const teamMembers = await User.find({ companyId }).select('fullName email').limit(15).lean();

          if (num && num > 0 && num <= teamMembers.length) {
            data.assigneeId = teamMembers[num - 1]._id;
            data.assigneeEmail = teamMembers[num - 1].email;
          } else {
            // Search by email or name
            const searchQuery = message.trim();
            let foundUser = await User.findOne({ email: { $regex: new RegExp(searchQuery, 'i') }, companyId });
            if (!foundUser) {
              foundUser = await User.findOne({ fullName: { $regex: new RegExp(searchQuery, 'i') }, companyId });
            }
            if (foundUser) {
              data.assigneeId = foundUser._id;
              data.assigneeEmail = foundUser.email;
            } else {
              return { handled: true, response: `"${searchQuery}" nahi mila. Exact email, name, ya number try karo. Ya "skip" / "me" bol do.` };
            }
          }
        }
      } else {
        data.assigneeId = userId;
        data.assigneeEmail = 'self';
      }

      // Check for projects
      intent.currentStep = 'project';
      await intent.save();

      const projects = await Project.find({ companyId }).select('projectName _id').limit(10).lean();
      if (projects.length > 0) {
        const projectList = projects.map((p, i) => `${i + 1}. ${p.projectName}`).join('\n');
        return {
          handled: true,
          response: `${data.assigneeEmail === 'self' ? 'Assigned to: You' : `Assigned to: ${data.assigneeEmail}`}\n\nKis project mein add karna hai?\n\n${projectList}\n\nNumber ya name bata do (ya "skip")`
        };
      } else {
        // No projects, skip to confirm
        intent.currentStep = 'confirm';
        await intent.save();
        return { handled: true, response: buildConfirmation(data) };
      }
    }

    case 'project': {
      if (!isSkip(message)) {
        const msg = message.trim();
        const projects = await Project.find({ companyId }).select('projectName _id').limit(10).lean();

        const num = parseInt(msg);
        if (num && num > 0 && num <= projects.length) {
          data.projectId = projects[num - 1]._id;
          data.projectName = projects[num - 1].projectName;
        } else {
          const found = projects.find(p => p.projectName.toLowerCase().includes(msg.toLowerCase()));
          if (found) {
            data.projectId = found._id;
            data.projectName = found.projectName;
          } else {
            return { handled: true, response: `Project nahi mila. Number ya exact name try karo, ya "skip"` };
          }
        }
      }
      intent.currentStep = 'confirm';
      await intent.save();
      return { handled: true, response: buildConfirmation(data) };
    }

    case 'confirm': {
      if (isConfirm(message)) {
        try {
          const task = await createActualTask(userId, companyId, data);
          intent.status = 'completed';
          intent.createdTaskId = task._id;
          await intent.save();
          return {
            handled: true,
            response: `Task Created Successfully!\n\nTitle: ${task.title}\nTask ID: ${task._id.toString().slice(-6).toUpperCase()}\n\nDashboard mein Tasks section mein dekh sakte ho! Aur kuch chahiye?`
          };
        } catch (err) {
          console.error('[TaskChat] Error creating task:', err);
          intent.status = 'cancelled';
          await intent.save();
          return { handled: true, response: `Sorry, task create karne mein error aa gaya: ${err.message}\n\nDobara try karo — "create task" bol do!` };
        }
      } else if (isCancel(message)) {
        intent.status = 'cancelled';
        await intent.save();
        return { handled: true, response: `Task cancelled. No worries!` };
      } else {
        return { handled: true, response: `"yes" bolo create karne ke liye ya "cancel" bolo band karne ke liye.` };
      }
    }
  }

  return { handled: false };
}

// ─── Build confirmation summary ───────────────────────────
function buildConfirmation(data) {
  let msg = `Task Summary — Confirm Karo!\n\n`;
  msg += `Title: ${data.title}\n`;
  if (data.description) msg += `Description: ${data.description}\n`;
  msg += `Priority: ${data.priority || 'Medium'}\n`;
  if (data.dueDate) msg += `Due: ${data.dueDate}\n`;
  msg += `Assigned to: ${data.assigneeEmail === 'self' ? 'You' : (data.assigneeEmail || 'You')}\n`;
  if (data.projectName) msg += `Project: ${data.projectName}\n`;
  msg += `\n"Yes" to create | "Cancel" to discard`;
  return msg;
}

// ─── Actually create the task in DB ───────────────────────
async function createActualTask(userId, companyId, data) {
  const taskData = {
    title: data.title,
    description: data.description || '',
    priority: data.priority || 'Medium',
    status: 'Todo',
    createdBy: userId,
    assignees: data.assigneeId ? [data.assigneeId] : [userId],
    companyId: companyId,
    activity: [{
      user: userId,
      action: 'created',
      details: 'Task created via Noxtm Chat Bot'
    }]
  };

  if (data.dueDate) {
    taskData.dueDate = new Date(data.dueDate);
  }
  // Note: Task model doesn't have a project field — labels can be used instead
  if (data.projectName) {
    taskData.labels = [`Project: ${data.projectName}`];
  }

  const task = new Task(taskData);
  await task.save();
  return task;
}

module.exports = {
  detectTaskIntent,
  startTaskCreation,
  processTaskStep,
  getActiveIntent
};
