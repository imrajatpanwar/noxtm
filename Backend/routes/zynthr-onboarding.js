const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Company = require('../models/Company');
const EmailVerification = require('../models/EmailVerification');
const ZynthrConfig = require('../models/ZynthrConfig');
const { authenticateToken } = require('../middleware/auth');
const { callClaude } = require('../utils/aiHelpers');

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

// Build system prompt for Zynthr
function buildZynthrPrompt(state, collected) {
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
      stateInstruction = `A 6-digit verification code was sent to ${collected.email}. Ask them to enter it. If they say they didn't receive it, offer to resend.`;
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

  return `You are Zynthr, the AI setup assistant for Noxtm — a modern workspace management platform.
You are warm, friendly, concise (2-3 sentences MAX), and human-like.
NEVER reveal you are an AI or a bot. You are Zynthr, a team member.
NEVER use markdown formatting (no **, no ##, no bullets).
Keep responses under 35 words.
Use the user's first name when you know it.

Current state: ${state}
Collected data: ${JSON.stringify(collected)}

${stateInstruction}`;
}

// Send verification email (reuses existing email logic)
async function sendVerificationCode(fullName, email, password) {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new Error('EMAIL_EXISTS');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
  const hashedPassword = await bcrypt.hash(password, salt);

  await EmailVerification.findOneAndUpdate(
    { email: email.toLowerCase() },
    { fullName, email: email.toLowerCase(), password: hashedPassword, code, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // Send email via existing SES/SMTP
  try {
    const { sendVerificationEmail } = require('../utils/emailService');
    if (sendVerificationEmail) {
      await sendVerificationEmail(email, fullName, code);
    }
  } catch (e) {
    console.log('[Zynthr] Email service not available, code:', code);
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

  const user = new User({
    fullName: record.fullName,
    email: record.email,
    password: record.password,
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

// ============ MAIN CHAT ENDPOINT ============
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { sessionId, message, flowState, collectedData = {}, conversationHistory = [] } = req.body;

    if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID required' });

    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = { flowState: STATES.INTRO, collectedData: {}, createdAt: Date.now() };
      sessions.set(sessionId, session);
    }

    // Use client state (more reliable with page refreshes)
    let currentState = flowState || session.flowState;
    let collected = { ...session.collectedData, ...collectedData };
    const userMsg = (message || '').trim();

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
          newState = STATES.COLLECT_NAME;
          // Get Claude response for name collection
          const msgs = [
            { role: 'system', content: buildZynthrPrompt(STATES.COLLECT_NAME, collected) },
            ...conversationHistory.slice(-6),
            { role: 'user', content: userMsg || 'I want to sign up with email' }
          ];
          reply = await callClaude(msgs, 'claude-3-haiku-20240307', 40);
        }
        break;
      }

      case STATES.COLLECT_NAME: {
        if (userMsg.length >= 2) {
          collected.fullName = userMsg.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          newState = STATES.COLLECT_EMAIL;
          const msgs = [
            { role: 'system', content: buildZynthrPrompt(STATES.COLLECT_EMAIL, collected) },
            { role: 'user', content: userMsg }
          ];
          reply = await callClaude(msgs, 'claude-3-haiku-20240307', 35);
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
            { role: 'system', content: buildZynthrPrompt(STATES.COLLECT_PASSWORD, collected) },
            { role: 'user', content: userMsg }
          ];
          reply = await callClaude(msgs, 'claude-3-haiku-20240307', 35);
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
            reply = `Perfect! I've sent a 6-digit code to ${collected.email}. Drop it here when you get it!`;
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
        const code = extractCode(userMsg);
        if (code) {
          try {
            const { token, user } = await verifyCodeAndCreateUser(collected.email, code);
            collected.userId = user._id.toString();
            newState = STATES.PLAN_SELECT;
            action = 'STORE_AUTH';
            actionData = { token, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role } };
            reply = `You're verified, ${collected.fullName.split(' ')[0]}! 🎉 Now let's pick the right plan for you. Check these out:`;
            action = 'SHOW_PLANS';
            actionData = { token, user: actionData?.user, plans: PLANS };
          } catch (err) {
            if (err.message === 'INVALID_CODE') {
              reply = "That code doesn't match. Double-check and try again?";
            } else if (err.message === 'CODE_EXPIRED') {
              reply = "That code expired. Want me to send a new one?";
            } else {
              reply = "Something went wrong verifying. Try entering the code again.";
            }
          }
        } else if (userMsg.toLowerCase().includes('resend')) {
          try {
            // Need password from session or re-collect
            reply = "I'll send a fresh code to " + collected.email + ". Check your inbox!";
            // Note: can't resend without password. For MVP, suggest checking spam.
            reply = "Check your spam folder — the code should be there. If not, try signing up again with a fresh start.";
          } catch (e) {
            reply = "Having trouble resending. Please check your spam folder or try again.";
          }
        } else {
          reply = "I need the 6-digit code from your email. Just paste it here!";
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
                { role: 'system', content: buildZynthrPrompt(STATES.COMPANY_NAME, collected) },
                { role: 'user', content: `I chose ${plan}` }
              ];
              reply = await callClaude(msgs, 'claude-3-haiku-20240307', 35);
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
            { role: 'system', content: buildZynthrPrompt(STATES.COMPANY_EMAIL, collected) },
            { role: 'user', content: userMsg }
          ];
          reply = await callClaude(msgs, 'claude-3-haiku-20240307', 35);
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

            newState = STATES.COMPLETE;
            action = 'COMPLETE';
            actionData = { companyId: company._id.toString(), user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, companyId: company._id } };

            const msgs = [
              { role: 'system', content: buildZynthrPrompt(STATES.COMPLETE, collected) },
              { role: 'user', content: 'Done!' }
            ];
            reply = await callClaude(msgs, 'claude-3-haiku-20240307', 40);
          } catch (e) {
            console.error('[Zynthr] Company creation error:', e);
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
    console.error('[Zynthr] Chat error:', error);
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
    message: "Hey! I'm Zynthr, your setup assistant at Noxtm. Ready to create your workspace? You can sign up with email or continue with Google — totally up to you!",
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
    console.error('[Zynthr] Payment complete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============ CONFIG ENDPOINTS ============
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.companyId) return res.status(404).json({ success: false, message: 'Company not found' });

    let config = await ZynthrConfig.findOne({ companyId: user.companyId });
    if (!config) {
      config = new ZynthrConfig({ companyId: user.companyId });
      await config.save();
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('[Zynthr] Config fetch error:', error);
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
      return res.status(403).json({ success: false, message: 'Only workspace owner can update Zynthr config' });
    }

    const config = await ZynthrConfig.findOneAndUpdate(
      { companyId: user.companyId },
      { ...req.body, updatedBy: user._id },
      { upsert: true, new: true }
    );

    res.json({ success: true, config });
  } catch (error) {
    console.error('[Zynthr] Config update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
