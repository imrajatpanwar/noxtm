/**
 * Seed default Noxtm Skills (global / companyId: null).
 * Run: node Backend/scripts/seedNoxtmSkills.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const NoxtmSkill = require('../models/NoxtmSkill');

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Hospitality', 'Consulting', 'Marketing', 'Other'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const TYPES = ['Business', 'Personal', 'Enterprise', 'Educational'];

const companySetupSkill = {
  companyId: null,
  slug: 'company-setup',
  name: 'Company Setup',
  description: 'Collect workspace details after signup: name, email, industry, size, location',
  enabled: true,
  isBuiltIn: true,
  trigger: 'company-setup',
  priority: 1,
  targetModel: 'Company',
  autoEnrich: true,
  allowDefer: true,
  requiredRole: 'any',
  systemPrompt: `You are Noxtm Bot, a warm friendly workspace setup assistant for Noxtm — a modern workspace platform.
You are helping {{userName}} set up their workspace. Be warm, conversational, concise (under 25 words).
Never reveal you are AI or a bot. No markdown. Use the user's first name if known.`,
  questions: [
    {
      id: 'q_companyName',
      prompt: 'What would you like to name your workspace, {{userName}}?',
      fieldPath: 'companyName',
      type: 'text',
      required: true,
      placeholder: 'Company or workspace name',
      validator: 'minLength:2',
      retryPrompt: 'Hmm, need at least 2 characters. What should I call your workspace?',
      extractionHint: 'the company or workspace name',
      allowFollowUp: true,
      followUpHint: 'Confirm the workspace/company name the user wants',
    },
    {
      id: 'q_companyEmail',
      prompt: 'What is the company email address?',
      fieldPath: 'companyEmail',
      type: 'email',
      required: true,
      placeholder: 'contact@company.com',
      retryPrompt: "That doesn't look like a valid email. Mind trying again?",
      extractionHint: 'an email address',
      triggerEnrich: true,
    },
    {
      id: 'q_companyWebsite',
      prompt: 'Do you have a company website? (optional — paste the URL or say skip)',
      fieldPath: 'companyWebsite',
      type: 'url',
      required: false,
      skippable: true,
      deferrable: true,
      placeholder: 'https://yourcompany.com',
      extractionHint: 'a website URL',
      triggerEnrich: true,
    },
    {
      id: 'q_type',
      prompt: 'What type of workspace is this?',
      fieldPath: 'type',
      type: 'select',
      required: true,
      options: TYPES,
      uiAction: 'SHOW_TYPES',
      retryPrompt: 'Please pick one of the options.',
      extractionHint: 'workspace type',
    },
    {
      id: 'q_industry',
      prompt: 'What industry are you in?',
      fieldPath: 'industry',
      type: 'select',
      required: true,
      options: INDUSTRIES,
      uiAction: 'SHOW_INDUSTRIES',
      retryPrompt: 'Pick an industry from the options!',
      extractionHint: 'industry name',
    },
    {
      id: 'q_size',
      prompt: 'How big is your team?',
      fieldPath: 'size',
      type: 'select',
      required: true,
      options: SIZES,
      uiAction: 'SHOW_SIZES',
      retryPrompt: 'Pick a team size from the options!',
      extractionHint: 'team size range',
    },
    {
      id: 'q_companyCountry',
      prompt: 'Which country is the company based in?',
      fieldPath: 'companyCountry',
      type: 'text',
      required: false,
      skippable: true,
      deferrable: true,
      placeholder: 'e.g. India, United States',
      extractionHint: 'country name',
    },
    {
      id: 'q_description',
      prompt: 'Give a short description of what {{companyName}} does (optional):',
      fieldPath: 'description',
      type: 'textarea',
      required: false,
      skippable: true,
      deferrable: true,
      placeholder: 'We help companies...',
      extractionHint: 'short company description',
    },
  ],
  onComplete: {
    action: 'createCompany',
    redirect: '/pricing',
    message: 'All set! {{companyName}} is ready. Taking you to pick a plan.',
    nextSkill: 'invite-team',
    seedMemory: true,
  },
  version: 1,
};

// Post-onboarding: Invite Team skill
const inviteTeamSkill = {
  companyId: null,
  slug: 'invite-team',
  name: 'Invite Your Team',
  description: 'Help new owners invite their first team members after workspace setup',
  enabled: true,
  isBuiltIn: true,
  trigger: 'post-signup',
  priority: 10,
  targetModel: 'Custom',
  requiredRole: 'Owner',
  autoEnrich: false,
  systemPrompt: `You are Noxtm Bot helping {{userName}} invite team members to {{companyName}}.
Be brief, encouraging, casual (under 25 words). No markdown.`,
  questions: [
    {
      id: 'q_inviteEmail1',
      prompt: 'Who should I invite first? Drop their email address.',
      fieldPath: 'inviteEmail1',
      type: 'email',
      required: false,
      skippable: true,
      placeholder: 'teammate@company.com',
      extractionHint: 'an email address to invite',
      retryPrompt: "Hmm, that doesn't look like an email. Try again?",
    },
    {
      id: 'q_inviteEmail2',
      prompt: 'Anyone else? (say skip if done)',
      fieldPath: 'inviteEmail2',
      type: 'email',
      required: false,
      skippable: true,
      placeholder: 'another@company.com',
      extractionHint: 'an email address to invite',
    },
    {
      id: 'q_inviteEmail3',
      prompt: 'One more? (skip to finish)',
      fieldPath: 'inviteEmail3',
      type: 'email',
      required: false,
      skippable: true,
      placeholder: 'one-more@company.com',
      extractionHint: 'an email address to invite',
    },
  ],
  onComplete: {
    action: 'none',
    redirect: '/dashboard',
    message: 'Team invites queued! Head to your dashboard to get started.',
    nextSkill: 'first-project',
  },
  version: 1,
};

// Post-onboarding: First Project skill
const firstProjectSkill = {
  companyId: null,
  slug: 'first-project',
  name: 'Create Your First Project',
  description: 'Guide new users through creating their first workspace project',
  enabled: true,
  isBuiltIn: true,
  trigger: 'post-signup',
  priority: 20,
  targetModel: 'Custom',
  requiredRole: 'Owner',
  autoEnrich: false,
  systemPrompt: `You are Noxtm Bot helping {{userName}} at {{companyName}} create their first project.
Be brief, fun, encouraging (under 25 words). No markdown.`,
  questions: [
    {
      id: 'q_projectName',
      prompt: "Let's create your first project! What should we call it?",
      fieldPath: 'projectName',
      type: 'text',
      required: true,
      placeholder: 'e.g. Product Launch, Q4 Campaign',
      validator: 'minLength:2',
      retryPrompt: 'Need at least 2 characters for a project name.',
      extractionHint: 'a project name',
    },
    {
      id: 'q_projectDescription',
      prompt: 'Give a quick one-liner about this project (optional):',
      fieldPath: 'projectDescription',
      type: 'textarea',
      required: false,
      skippable: true,
      placeholder: 'What this project is about...',
      extractionHint: 'project description',
    },
  ],
  onComplete: {
    action: 'none',
    redirect: '/dashboard',
    message: "Project ready! Let's jump into your dashboard.",
    seedMemory: true,
  },
  version: 1,
};

// Chat Assistant skill — professional conversational agent
const chatAssistantSkill = {
  companyId: null,
  slug: 'chat-assistant',
  name: 'Chat Assistant',
  description: 'Professional conversational assistant for workspace support and general queries',
  enabled: true,
  isBuiltIn: true,
  trigger: 'always',
  priority: 50,
  targetModel: 'Custom',
  requiredRole: 'any',
  autoEnrich: false,
  allowDefer: false,
  systemPrompt: `You are Noxtm Assistant, a professional support specialist for Noxtm — a modern workspace management platform.

IDENTITY AND TONE:
- You are a Noxtm team member, not a bot or AI. Never reveal otherwise.
- Maintain a professional, composed, and respectful tone at all times.
- Address users formally by their name when known (e.g., "Hello, {{userName}}").
- Be concise and direct. Responses must stay under 60 words unless a detailed explanation is required.
- Write in complete, grammatically correct sentences.

STRICT RULES:
- No emojis anywhere in any response. Not a single one.
- No informal language, slang, or casual phrases.
- No markdown formatting (no **, no ##, no bullet dashes, no numbered lists unless explicitly needed for clarity).
- No filler phrases such as "Sure!", "Of course!", "Absolutely!", "Happy to help!", "Great question!", or "Certainly!".
- Never start a response with "I" — restructure to begin with the topic, action, or user's name.
- Never over-apologize. Acknowledge issues once and move to resolution.
- Do not repeat information already stated in the same conversation unless the user explicitly asks.

RESPONSE STRUCTURE:
- Lead with the answer or action, not the context.
- If multi-step guidance is needed, number the steps plainly (1. 2. 3.) with a line break between each.
- Escalate unresolvable issues with: "This matter will be escalated to our support team. Expect a response within 24 hours."

SCOPE:
- Handle workspace queries, account issues, feature explanations, and navigation help.
- For billing or legal matters, direct the user to the appropriate Noxtm support channel without speculating.
- Do not discuss competitors, pricing speculation, or unconfirmed roadmap features.`,
  questions: [],
  onComplete: {
    action: 'none',
    redirect: '',
    message: '',
    seedMemory: false,
  },
  version: 1,
};

async function upsertSkill(data) {
  const existing = await NoxtmSkill.findOne({ slug: data.slug, companyId: null });
  if (existing) {
    console.log(`[Seed] ${data.slug} exists. Updating...`);
    Object.assign(existing, data);
    existing.version = (existing.version || 1) + 1;
    await existing.save();
    console.log(`[Seed] Updated ${data.slug}. version =`, existing.version);
  } else {
    const s = new NoxtmSkill(data);
    await s.save();
    console.log(`[Seed] Created ${data.slug}:`, s._id.toString());
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/noxtm';
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('[Seed] Connected.');

  await upsertSkill(companySetupSkill);
  await upsertSkill(inviteTeamSkill);
  await upsertSkill(firstProjectSkill);
  await upsertSkill(chatAssistantSkill);

  await mongoose.disconnect();
  console.log('[Seed] Done.');
}

run().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
