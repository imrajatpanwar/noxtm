const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Company = require('../models/Company');
const EmailVerification = require('../models/EmailVerification');
const NoxtmBotConfig = require('../models/NoxtmBotConfig');
const { NoxtmBotDefaultMemory, LearnedMemory } = require('../models/NoxtmMemory');
const { authenticateToken } = require('../middleware/auth');
const { callClaude } = require('../utils/aiHelpers');

// Default AI model
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// ============ SESSION MANAGEMENT ============
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// Rate limit
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many requests. Please wait a moment.' }
});

// ============ FLOW STATES ============
const STATES = {
  INTRO: 'INTRO',
  // Signup skill states
  COLLECT_NAME: 'COLLECT_NAME',
  COLLECT_EMAIL: 'COLLECT_EMAIL',
  COLLECT_PASSWORD: 'COLLECT_PASSWORD',
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  PLAN_SELECT: 'PLAN_SELECT',
  COMPANY_NAME: 'COMPANY_NAME',
  COMPANY_EMAIL: 'COMPANY_EMAIL',
  COMPANY_INDUSTRY: 'COMPANY_INDUSTRY',
  COMPANY_SIZE: 'COMPANY_SIZE',
  COMPLETE: 'COMPLETE',
};

// ============ HELPERS ============
const extractEmail = (text) => {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  return match ? match[0].toLowerCase() : null;
};

const extractCode = (text) => {
  const match = text.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
};

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Hospitality', 'Consulting', 'Marketing', 'Other'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const PLANS = {
  'Starter': { price: '₹1,699/mo', trial: true, members: 5, storage: '10 GB' },
  'Pro+': { price: '₹2,699/mo', trial: true, members: 60, storage: '50 GB', popular: true },
  'Advance': { price: '₹4,699/mo', trial: false, members: 'Unlimited', storage: '75 GB' },
};

function matchIndustry(text) {
  const lower = text.toLowerCase();
  return INDUSTRIES.find(i => lower.includes(i.toLowerCase())) || null;
}

function matchSize(text) {
  return SIZES.find(s => text.includes(s)) || null;
}

function matchPlan(text) {
  const lower = text.toLowerCase();
  if (lower.includes('starter')) return 'Starter';
  if (lower.includes('pro') || lower.includes('pro+')) return 'Pro+';
  if (lower.includes('advance')) return 'Advance';
  return null;
}

// Build system prompt for Noxtm Bot
function buildNoxtmBotPrompt(state, collected, activeSkill, defaultMemories = [], botConfig = null) {
  let stateInstruction = '';

  switch (state) {
    case STATES.INTRO:
      stateInstruction = 'You just greeted the user. They need to either choose email signup or Google signup. Keep it welcoming and brief.';
      break;
    case STATES.COLLECT_NAME:
      stateInstruction = 'Ask the user for their full name. Be warm and conversational.';
      break;
    case STATES.COLLECT_EMAIL:
      stateInstruction = `The user's name is ${collected.fullName}. Now ask for their email address.`;
      break;
    case STATES.COLLECT_PASSWORD:
      stateInstruction = `Ask ${collected.fullName} to create a password (must be at least 6 characters). Remind them it should be secure.`;
      break;
    case STATES.EMAIL_VERIFY:
      stateInstruction = `A 6-digit verification code was sent to ${collected.email}. Ask them to enter it. If they say they didn't receive it, offer to resend. If they say the email is wrong or want to change it, let them know they can type a new email.`;
      break;
    case STATES.PLAN_SELECT:
      stateInstruction = `${collected.fullName} is now verified! Present the plan options naturally. Don't list prices — the UI will show plan cards. Just say something like "Here are the plans available — pick what works best for you!"`;
      break;
    case STATES.COMPANY_NAME:
      stateInstruction = `Great, ${collected.fullName} chose the ${collected.plan} plan! Now ask for their company/workspace name.`;
      break;
    case STATES.COMPANY_EMAIL:
      stateInstruction = `Company name is "${collected.companyName}". Now ask for the company email address.`;
      break;
    case STATES.COMPANY_INDUSTRY:
      stateInstruction = `Ask what industry "${collected.companyName}" is in. The UI will show industry options as buttons.`;
      break;
    case STATES.COMPANY_SIZE:
      stateInstruction = `Almost done! Ask about team size. The UI will show size options.`;
      break;
    case STATES.COMPLETE:
      stateInstruction = `Everything is set up! Welcome ${collected.fullName} to Noxtm and tell them you're taking them to their dashboard. Be enthusiastic!`;
      break;
  }

  const skillContext = activeSkill ? `\nCurrently using skill: ${activeSkill}` : '';

  // Inject admin default memories as global instructions
  let defaultMemoryInstructions = '';
  if (defaultMemories && defaultMemories.length > 0) {
    defaultMemoryInstructions = '\n\nADMIN INSTRUCTIONS (you MUST follow these):\n' +
      defaultMemories.map(m => `- [${m.category}] ${m.content}`).join('\n');
  }

  // Bot identity from config
  const botName = botConfig?.botName || 'Noxtm Bot';
  const botTitle = botConfig?.botTitle || 'AI Assistant';
  const botIdentityDesc = botConfig?.botIdentity
    ? `\nYour identity: ${botConfig.botIdentity}`
    : '';

  return `You are ${botName}, ${botTitle} for Noxtm — a modern workspace management platform.${botIdentityDesc}
You are warm, friendly, concise (2-3 sentences MAX), and human-like.
NEVER reveal you are an AI or a bot. You are a Noxtm team member.
NEVER use markdown formatting (no **, no ##, no bullets).
Keep responses under 35 words.
Use the user's first name when you know it.
${skillContext}${defaultMemoryInstructions}

Current state: ${state}
Collected data: ${JSON.stringify(collected)}

${stateInstruction}`;
}

// Send verification email via nodemailer (AWS SES SMTP)
async function sendVerificationCode(fullName, email, password) {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new Error('EMAIL_EXISTS');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
  const hashedPassword = await bcrypt.hash(password, salt);

  await EmailVerification.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      email: email.toLowerCase(),
      code,
      userData: { fullName, email: email.toLowerCase(), password: hashedPassword, role: 'User' },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Send email via nodemailer
  try {
    const nodemailer = require('nodemailer');
    const transportConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      tls: { rejectUnauthorized: false }
    };
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transportConfig.auth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
    }
    const transporter = nodemailer.createTransport(transportConfig);
    const firstName = fullName.split(' ')[0];

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0;">Noxtm</h1>
        </div>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome to Noxtm!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for signing up! Please use the verification code below to complete your registration:
          </p>
          <div style="background-color: #ffffff; border: 2px dashed #7c3aed; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </div>
            <div style="font-size: 42px; font-weight: bold; color: #7c3aed; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
          </p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">&copy; 2025 Noxtm. All rights reserved.</p>
        </div>
      </div>`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Noxtm <noreply@noxtm.com>',
      to: email,
      subject: 'Email Verification Code - Noxtm',
      html: htmlBody,
      text: `Hi ${firstName}, your Noxtm verification code is: ${code}. It expires in 10 minutes.`
    });
    console.log('[NoxtmBot] Verification email sent to:', email);
  } catch (e) {
    console.error('[NoxtmBot] Failed to send verification email:', e.message);
  }

  return code;
}

// Verify code and create user
async function verifyCodeAndCreateUser(email, code) {
  const record = await EmailVerification.findOne({ email: email.toLowerCase() });
  if (!record) throw new Error('NO_VERIFICATION');
  if (record.code !== code) throw new Error('INVALID_CODE');

  const tenMinutes = 10 * 60 * 1000;
  if (Date.now() - record.createdAt > tenMinutes) throw new Error('CODE_EXPIRED');

  // Double-check email not taken
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new Error('EMAIL_EXISTS');

  const ud = record.userData || {};
  const fullName = ud.fullName || record.fullName;
  const password = ud.password || record.password;
  if (!fullName || !password) throw new Error('NO_VERIFICATION');

  const user = new User({
    fullName: fullName,
    email: record.email,
    password: password,
    isEmailVerified: true,
    role: 'User',
    permissions: {
      dashboard: true, dataCenter: true, projects: true,
      teamCommunication: true, marketing: true, seoTools: false,
      hrManagement: false, financeManagement: false,
      internalPolicies: false, settingsConfiguration: true,
      digitalMediaManagement: false
    }
  });
  await user.save();
  await EmailVerification.deleteOne({ _id: record._id });

  const token = jwt.sign(
    { userId: user._id, fullName: user.fullName, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production',
    { expiresIn: '24h' }
  );

  return { token, user };
}

// Get the AI model to use (from config or default)
function getModel(session) {
  return session?.aiModel || DEFAULT_MODEL;
}

// ============ MAIN CHAT ENDPOINT ============
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { sessionId, message, flowState, collectedData = {}, conversationHistory = [] } = req.body;

    if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID required' });

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = { flowState: STATES.INTRO, collectedData: {}, createdAt: Date.now(), activeSkill: 'signup' };
      sessions.set(sessionId, session);
    }

    // Use client state (more reliable with page refreshes)
    let currentState = flowState || session.flowState;
    let collected = { ...session.collectedData, ...collectedData };
    const userMsg = (message || '').trim();
    const model = getModel(session);

    // Fetch admin default memories for the bot prompt (non-blocking, empty array on failure)
    let defaultMemories = [];
    let botConfig = null;
    try {
      [defaultMemories, botConfig] = await Promise.all([
        NoxtmBotDefaultMemory.find({ active: true }).sort({ createdAt: -1 }).limit(20).lean(),
        NoxtmBotConfig.findOne({}).lean()
      ]);
    } catch (e) { /* ignore — non-critical */ }

    // Sanitize conversation history - ensure alternating roles for Claude API
    const sanitizedHistory = [];
    for (const msg of (conversationHistory || []).slice(-6)) {
      if (!msg || !msg.role || !msg.content) continue;
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === role) continue;
      sanitizedHistory.push({ role, content: msg.content });
    }

    let reply = '';
    let newState = currentState;
    let action = null;
    let actionData = null;

    switch (currentState) {
      case STATES.INTRO: {
        if (userMsg.toLowerCase().includes('google')) {
          reply = "Great choice! Click the Google button below and I'll be right here when you get back.";
          action = 'GOOGLE_SIGNUP';
        } else {
          // Activate signup skill
          session.activeSkill = 'signup';
          newState = STATES.COLLECT_NAME;
          const msgs = [
            { role: 'system', content: buildNoxtmBotPrompt(STATES.COLLECT_NAME, collected, 'signup', defaultMemories, botConfig) },
            ...sanitizedHistory,
            { role: 'user', content: userMsg || 'I want to sign up with email' }
          ];
          while (msgs.length > 1 && msgs[msgs.length - 1].role === msgs[msgs.length - 2].role && msgs[msgs.length - 1].role !== 'system') {
            msgs.splice(msgs.length - 2, 1);
          }
          try {
            reply = await callClaude(msgs, model, 40);
          } catch (e) {
            console.error('[NoxtmBot] Claude error in INTRO:', e.message);
            reply = "Awesome, let's get you set up! First, what's your full name?";
          }
        }
        break;
      }

      case STATES.COLLECT_NAME: {
        if (userMsg.length >= 2) {
          collected.fullName = userMsg.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          newState = STATES.COLLECT_EMAIL;
          const msgs = [
            { role: 'system', content: buildNoxtmBotPrompt(STATES.COLLECT_EMAIL, collected, 'signup', defaultMemories, botConfig) },
            ...sanitizedHistory.filter(m => m.role !== 'user' || m.content !== userMsg).slice(-4),
            { role: 'user', content: userMsg }
          ];
          try {
            reply = await callClaude(msgs, model, 35);
          } catch (e) {
            console.error('[NoxtmBot] Claude error in COLLECT_NAME:', e.message);
            reply = `Nice to meet you, ${collected.fullName.split(' ')[0]}! What's your email address?`;
          }
        } else {
          reply = "I didn't quite catch that — could you tell me your full name?";
        }
        break;
      }

      case STATES.COLLECT_EMAIL: {
        const email = extractEmail(userMsg);
        if (email) {
          // Check if email already exists
          const exists = await User.findOne({ email: email.toLowerCase() });
          if (exists) {
            reply = `Looks like ${email} already has an account. Want to try a different email, or head to login instead?`;
            action = 'EMAIL_EXISTS';
            break;
          }
          collected.email = email;
          newState = STATES.COLLECT_PASSWORD;
          const msgs = [
            { role: 'system', content: buildNoxtmBotPrompt(STATES.COLLECT_PASSWORD, collected, 'signup', defaultMemories, botConfig) },
            ...sanitizedHistory.filter(m => m.role !== 'user' || m.content !== userMsg).slice(-4),
            { role: 'user', content: userMsg }
          ];
          try {
            reply = await callClaude(msgs, model, 35);
          } catch (e) {
            console.error('[NoxtmBot] Claude error in COLLECT_EMAIL:', e.message);
            reply = `Got it, ${collected.fullName.split(' ')[0]}! Now create a password — at least 6 characters.`;
          }
        } else {
          reply = "Hmm, that doesn't look like a valid email. Could you try again?";
        }
        break;
      }

      case STATES.COLLECT_PASSWORD: {
        if (userMsg.length >= 6) {
          collected.password = userMsg;
          // Send verification code
          try {
            await sendVerificationCode(collected.fullName, collected.email, collected.password);
            newState = STATES.EMAIL_VERIFY;
            reply = `Perfect! I've sent a 6-digit code to ${collected.email}. Drop it here when you get it! If that's not your email, just type "change email" and give me the right one.`;
            // Don't store password in session
            delete collected.password;
          } catch (err) {
            if (err.message === 'EMAIL_EXISTS') {
              reply = `Oops, looks like ${collected.email} is already registered. Want to try a different email?`;
              newState = STATES.COLLECT_EMAIL;
              delete collected.email;
            } else {
              reply = "Something went wrong sending the code. Let me try again — what's your password?";
            }
          }
        } else {
          reply = "Password needs to be at least 6 characters. Give it another shot!";
        }
        break;
      }

      case STATES.EMAIL_VERIFY: {
        const lowerMsg = userMsg.toLowerCase();

        // Check if user wants to change their email
        if (lowerMsg.includes('change email') || lowerMsg.includes('wrong email') || lowerMsg.includes('different email') || lowerMsg.includes('not my email') || lowerMsg.includes('change mail') || lowerMsg.includes('wrong mail')) {
          // Check if they also provided a new email in the same message
          const newEmail = extractEmail(userMsg);
          if (newEmail) {
            const exists = await User.findOne({ email: newEmail.toLowerCase() });
            if (exists) {
              reply = `Looks like ${newEmail} already has an account. Try another email address.`;
              break;
            }
            // Clean up old verification
            await EmailVerification.deleteOne({ email: collected.email?.toLowerCase() });
            collected.email = newEmail;
            newState = STATES.COLLECT_PASSWORD;
            reply = `Got it! I've updated your email to ${newEmail}. Now I need your password again to send the verification code.`;
          } else {
            // Go back to collect email
            newState = STATES.COLLECT_EMAIL;
            delete collected.email;
            // Clean up old verification
            await EmailVerification.deleteOne({ email: collected.email?.toLowerCase() });
            reply = `No problem! What's the correct email address?`;
          }
          break;
        }

        // Check if they just typed a new email directly (without saying "change")
        const possibleNewEmail = extractEmail(userMsg);
        if (possibleNewEmail && possibleNewEmail !== collected.email) {
          // They seem to be trying to change their email
          const exists = await User.findOne({ email: possibleNewEmail.toLowerCase() });
          if (exists) {
            reply = `Looks like ${possibleNewEmail} already has an account. Enter the 6-digit code from ${collected.email}, or say "change email" to use a different one.`;
            break;
          }
          // Clean up old verification
          await EmailVerification.deleteOne({ email: collected.email?.toLowerCase() });
          collected.email = possibleNewEmail;
          newState = STATES.COLLECT_PASSWORD;
          reply = `Switching to ${possibleNewEmail}! I'll need your password again to send a new code.`;
          break;
        }

        const code = extractCode(userMsg);
        if (code) {
          try {
            const { token, user } = await verifyCodeAndCreateUser(collected.email, code);
            collected.userId = user._id.toString();
            newState = STATES.PLAN_SELECT;
            action = 'SHOW_PLANS';
            actionData = { token, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role }, plans: PLANS };
            reply = `You're verified, ${collected.fullName.split(' ')[0]}! Now let's pick the right plan for you. Check these out:`;
          } catch (err) {
            if (err.message === 'INVALID_CODE') {
              reply = "That code doesn't match. Double-check and try again? Or say \"change email\" if you need to use a different email.";
            } else if (err.message === 'CODE_EXPIRED') {
              reply = "That code expired. Want me to send a new one?";
            } else {
              reply = "Something went wrong verifying. Try entering the code again.";
            }
          }
        } else if (lowerMsg.includes('resend')) {
          try {
            reply = "Check your spam folder — the code should be there. If not, say \"change email\" to try a different email, or start fresh.";
          } catch (e) {
            reply = "Having trouble resending. Please check your spam folder or try again.";
          }
        } else {
          reply = `I need the 6-digit code from ${collected.email}. Just paste it here! If that's not your email, say "change email".`;
        }
        break;
      }

      case STATES.PLAN_SELECT: {
        const plan = matchPlan(userMsg);
        if (plan) {
          collected.plan = plan;
          if (PLANS[plan].trial) {
            // Start trial
            try {
              const user = await User.findById(collected.userId);
              if (user) {
                user.subscription = {
                  plan,
                  status: 'trial',
                  billingCycle: 'Monthly',
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                  trialUsed: true
                };
                await user.save();
              }
              newState = STATES.COMPANY_NAME;
              action = 'TRIAL_STARTED';
              actionData = { plan, trialDays: 14 };
              const msgs = [
                { role: 'system', content: buildNoxtmBotPrompt(STATES.COMPANY_NAME, collected, 'signup', defaultMemories, botConfig) },
                { role: 'user', content: `I chose ${plan}` }
              ];
              reply = await callClaude(msgs, model, 35);
            } catch (e) {
              reply = "Had a hiccup activating your trial. Let me try again — which plan did you want?";
            }
          } else {
            // Advance plan — needs payment
            action = 'OPEN_RAZORPAY';
            actionData = { plan };
            reply = `Great choice! The Advance plan requires payment to get started. Let me pull up the checkout for you.`;
          }
        } else {
          reply = "Just tap on one of the plan cards above to select it!";
        }
        break;
      }

      case STATES.COMPANY_NAME: {
        if (userMsg.length >= 2) {
          collected.companyName = userMsg;
          newState = STATES.COMPANY_EMAIL;
          const msgs = [
            { role: 'system', content: buildNoxtmBotPrompt(STATES.COMPANY_EMAIL, collected, 'signup', defaultMemories, botConfig) },
            { role: 'user', content: userMsg }
          ];
          try {
            reply = await callClaude(msgs, model, 35);
          } catch (e) {
            console.error('[NoxtmBot] Claude error in COMPANY_NAME:', e.message);
            reply = `"${collected.companyName}" — love it! What's the company email address?`;
          }
        } else {
          reply = "What would you like to name your workspace?";
        }
        break;
      }

      case STATES.COMPANY_EMAIL: {
        const email = extractEmail(userMsg);
        if (email) {
          collected.companyEmail = email;
          newState = STATES.COMPANY_INDUSTRY;
          reply = "Nice! What industry is your company in? Pick one from below:";
          action = 'SHOW_INDUSTRIES';
          actionData = { industries: INDUSTRIES };
        } else {
          reply = "I need a valid company email. Could you try again?";
        }
        break;
      }

      case STATES.COMPANY_INDUSTRY: {
        const industry = matchIndustry(userMsg) || userMsg;
        if (industry && industry.length >= 2) {
          collected.industry = industry;
          newState = STATES.COMPANY_SIZE;
          reply = "Last one! How big is your team?";
          action = 'SHOW_SIZES';
          actionData = { sizes: SIZES };
        } else {
          reply = "Just pick an industry from the options, or type it in!";
        }
        break;
      }

      case STATES.COMPANY_SIZE: {
        const size = matchSize(userMsg) || userMsg;
        if (size) {
          collected.companySize = size;
          // Create company
          try {
            const user = await User.findById(collected.userId);
            if (!user) throw new Error('User not found');

            const company = new Company({
              companyName: collected.companyName,
              companyEmail: collected.companyEmail,
              industryType: collected.industry,
              size: matchSize(size) || '1-10',
              type: 'Business',
              owner: user._id,
              members: [{ user: user._id, roleInCompany: 'Owner', joinedAt: new Date() }],
              subscription: { plan: collected.plan || 'Trial', status: user.subscription?.status || 'trial', startDate: new Date() }
            });
            await company.save();

            user.companyId = company._id;
            await user.save();

            // Issue a fresh JWT with companyId so the dashboard assistant works
            const freshToken = jwt.sign(
              { userId: user._id, fullName: user.fullName, email: user.email, role: user.role, companyId: company._id },
              process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production',
              { expiresIn: '7d' }
            );

            newState = STATES.COMPLETE;
            action = 'COMPLETE';
            actionData = {
              token: freshToken,
              companyId: company._id.toString(),
              user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, companyId: company._id }
            };

            const msgs = [
              { role: 'system', content: buildNoxtmBotPrompt(STATES.COMPLETE, collected, 'signup', defaultMemories, botConfig) },
              { role: 'user', content: 'Done!' }
            ];
            reply = await callClaude(msgs, model, 40);
          } catch (e) {
            console.error('[NoxtmBot] Company creation error:', e);
            reply = "Oops, something went wrong setting up your workspace. Let me try once more — what's your team size?";
          }
        } else {
          reply = "Pick a team size from the options above!";
        }
        break;
      }

      default:
        reply = "Let's get you started! Would you like to sign up with email or Google?";
        newState = STATES.INTRO;
    }

    // Update session
    session.flowState = newState;
    session.collectedData = collected;
    sessions.set(sessionId, session);

    res.json({
      success: true,
      reply,
      newFlowState: newState,
      action,
      actionData,
      collectedData: collected
    });

  } catch (error) {
    console.error('[NoxtmBot] Chat error:', error);
    res.status(500).json({
      success: false,
      reply: "Something went wrong on my end. Could you try that again?",
      newFlowState: req.body.flowState || 'INTRO'
    });
  }
});

// ============ INTRO MESSAGE ============
router.get('/intro', (req, res) => {
  res.json({
    success: true,
    message: "Hey! I'm Noxtm Bot, your setup assistant. Ready to create your workspace? You can sign up with email or continue with Google — totally up to you!",
    flowState: STATES.INTRO
  });
});

// ============ PAYMENT CALLBACK (after Razorpay) ============
router.post('/payment-complete', authenticateToken, async (req, res) => {
  try {
    const { sessionId, plan } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update session to move to company details
    const session = sessions.get(sessionId);
    if (session) {
      session.flowState = STATES.COMPANY_NAME;
      session.collectedData.plan = plan;
      sessions.set(sessionId, session);
    }

    res.json({ success: true, newFlowState: STATES.COMPANY_NAME });
  } catch (error) {
    console.error('[NoxtmBot] Payment complete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ CONFIG ENDPOINTS ============
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(404).json({ success: false, message: 'Company not found' });

    let config = await NoxtmBotConfig.findOne({ companyId: user.companyId });
    if (!config) {
      config = new NoxtmBotConfig({ companyId: user.companyId });
      await config.save();
    }

    // Don't expose custom API key in response
    const configObj = config.toObject();
    if (configObj.customApiKey) {
      configObj.customApiKey = configObj.customApiKey.substring(0, 8) + '...' + configObj.customApiKey.slice(-4);
      configObj.hasCustomApiKey = true;
    }

    res.json({ success: true, config: configObj });
  } catch (error) {
    console.error('[NoxtmBot] Config fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Access denied' });

    // Check if owner
    const company = await Company.findById(user.companyId);
    const member = company?.members.find(m => m.user.toString() === user._id.toString());
    if (!member || member.roleInCompany !== 'Owner') {
      return res.status(403).json({ success: false, message: 'Only workspace owner can update Noxtm Bot config' });
    }

    // If custom API key is masked (from a previous GET), don't overwrite
    const updateData = { ...req.body, updatedBy: user._id };
    if (updateData.customApiKey && updateData.customApiKey.includes('...')) {
      delete updateData.customApiKey;
    }

    const config = await NoxtmBotConfig.findOneAndUpdate(
      { companyId: user.companyId },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );

    // Sync identity fields to NoxtmChatConfig (used by the Noxtm Assistant in-dashboard chat)
    if (updateData.botName || updateData.botTitle || updateData.botIdentity) {
      try {
        const { NoxtmChatConfig } = require('../models/NoxtmChat');
        const syncData = {};
        if (updateData.botName) syncData.botName = updateData.botName;
        if (updateData.botTitle) syncData.botTitle = updateData.botTitle;
        if (updateData.botIdentity !== undefined) syncData.botIdentity = updateData.botIdentity;
        await NoxtmChatConfig.findOneAndUpdate(
          { companyId: user.companyId },
          syncData,
          { upsert: false }
        );
      } catch (syncErr) {
        console.warn('[NoxtmBot] Identity sync to ChatConfig failed:', syncErr.message);
      }
    }

    // Mask API key in response
    const configObj = config.toObject();
    if (configObj.customApiKey) {
      configObj.customApiKey = configObj.customApiKey.substring(0, 8) + '...' + configObj.customApiKey.slice(-4);
      configObj.hasCustomApiKey = true;
    }

    res.json({ success: true, config: configObj });
  } catch (error) {
    console.error('[NoxtmBot] Config update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ MEMORY MANAGEMENT ENDPOINTS ============

// --- Admin Default Memories (global bot instructions) ---

// GET /api/noxtm-bot/memories/default
router.get('/memories/default', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(404).json({ success: false, message: 'Company not found' });

    const memories = await NoxtmBotDefaultMemory.find({ companyId: user.companyId, active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'fullName email')
      .lean();

    res.json({ success: true, memories });
  } catch (error) {
    console.error('[NoxtmBot] Default memories fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/noxtm-bot/memories/default
router.post('/memories/default', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Access denied' });

    // Only workspace Owner or platform Admin may manage default memories
    const company = await Company.findById(user.companyId);
    const member = company?.members?.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company?.owner && company.owner.toString() === user._id.toString());
    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only workspace owner or admin can add memories' });
    }

    const { content, category } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const memory = await NoxtmBotDefaultMemory.create({
      companyId: user.companyId,
      content: content.trim(),
      category: category || 'instruction',
      createdBy: user._id,
    });

    const populated = await NoxtmBotDefaultMemory.findById(memory._id)
      .populate('createdBy', 'fullName email')
      .lean();

    res.json({ success: true, memory: populated });
  } catch (error) {
    console.error('[NoxtmBot] Default memory create error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/noxtm-bot/memories/default/:id
router.put('/memories/default/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Access denied' });

    const company = await Company.findById(user.companyId);
    const member = company?.members?.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company?.owner && company.owner.toString() === user._id.toString());
    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only workspace owner or admin can edit memories' });
    }

    const { content, category } = req.body;
    const memory = await NoxtmBotDefaultMemory.findOneAndUpdate(
      { _id: req.params.id, companyId: user.companyId },
      { content: content?.trim(), category },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email').lean();

    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found' });

    res.json({ success: true, memory });
  } catch (error) {
    console.error('[NoxtmBot] Default memory update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/noxtm-bot/memories/default/:id
router.delete('/memories/default/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Access denied' });

    const company = await Company.findById(user.companyId);
    const member = company?.members?.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company?.owner && company.owner.toString() === user._id.toString());
    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only workspace owner or admin can delete memories' });
    }

    const memory = await NoxtmBotDefaultMemory.findOneAndDelete({
      _id: req.params.id,
      companyId: user.companyId,
    });

    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found' });

    res.json({ success: true });
  } catch (error) {
    console.error('[NoxtmBot] Default memory delete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- User Memories (per-user learned insights) ---

// GET /api/noxtm-bot/memories/users — Admin/Owner view: all user memories grouped by user
// Non-admin users still see their own memories (grouped under a single group).
router.get('/memories/users', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(404).json({ success: false, message: 'Company not found' });

    // Determine if requester can see every user's memories
    const company = await Company.findById(user.companyId);
    const member = company?.members?.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company?.owner && company.owner.toString() === user._id.toString());
    const canViewAll = isOwner || user.role === 'Admin';

    // Build the set of userIds whose memories we are allowed to return
    let allowedUserIds;
    if (canViewAll) {
      // Every user in this workspace (covers legacy memories that may lack companyId)
      const workspaceUsers = await User.find({ companyId: user.companyId })
        .select('_id fullName email profileImage')
        .lean();
      allowedUserIds = workspaceUsers.map(u => u._id);
      // Index users by id for later enrichment
      var userMap = {};
      workspaceUsers.forEach(u => { userMap[u._id.toString()] = u; });
    } else {
      allowedUserIds = [user._id];
      var userMap = {
        [user._id.toString()]: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
        },
      };
    }

    // Match memories by userId (works even for rows missing companyId) OR by companyId match as a safety net
    const memories = await LearnedMemory.find({
      active: true,
      $or: [
        { userId: { $in: allowedUserIds } },
        { companyId: user.companyId, userId: { $in: allowedUserIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // Group memories by user
    const grouped = {};
    memories.forEach(m => {
      const uid = m.userId?.toString();
      if (!uid) return;
      if (!grouped[uid]) {
        const u = userMap[uid];
        grouped[uid] = {
          userId: uid,
          userName: u?.fullName || 'Unknown User',
          userEmail: u?.email || '',
          userAvatar: u?.profileImage || '',
          user: u ? { _id: u._id, fullName: u.fullName, email: u.email, profileImage: u.profileImage } : null,
          memories: [],
        };
      }
      grouped[uid].memories.push(m);
    });

    // For admin/owner view, also include workspace users that have no memories yet
    // so the UI can render an empty group. Skip this for non-admin callers.
    if (canViewAll) {
      Object.keys(userMap).forEach(uid => {
        if (!grouped[uid]) {
          const u = userMap[uid];
          grouped[uid] = {
            userId: uid,
            userName: u?.fullName || 'Unknown User',
            userEmail: u?.email || '',
            userAvatar: u?.profileImage || '',
            user: u ? { _id: u._id, fullName: u.fullName, email: u.email, profileImage: u.profileImage } : null,
            memories: [],
          };
        }
      });
    }

    // Sort groups: ones with memories first (desc by count), then alphabetical
    const userGroups = Object.values(grouped).sort((a, b) => {
      if (b.memories.length !== a.memories.length) return b.memories.length - a.memories.length;
      return (a.userName || '').localeCompare(b.userName || '');
    });

    res.json({ success: true, userGroups, canViewAll });
  } catch (error) {
    console.error('[NoxtmBot] User memories fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/noxtm-bot/memories/users/:id — Admin/Owner deletes a specific user memory
// Non-admin callers can still delete memories that belong to themselves.
router.delete('/memories/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Access denied' });

    const company = await Company.findById(user.companyId);
    const member = company?.members?.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company?.owner && company.owner.toString() === user._id.toString());
    const canManageAll = isOwner || user.role === 'Admin';

    // Build workspace user ids once (used to scope non-admin-safe lookups)
    const workspaceUserIds = await User.find({ companyId: user.companyId }).distinct('_id');

    // Find the memory first so we can verify scope and ownership
    const existing = await LearnedMemory.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Memory not found' });

    // Verify memory belongs to a user in this workspace
    const belongsToWorkspace = workspaceUserIds.some(uid => uid.toString() === existing.userId?.toString());
    if (!belongsToWorkspace) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    // Non-admin users can only delete their own memories
    if (!canManageAll && existing.userId?.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own memories' });
    }

    // Soft-delete: mark as inactive
    const memory = await LearnedMemory.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    res.json({ success: true, memory });
  } catch (error) {
    console.error('[NoxtmBot] User memory delete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
