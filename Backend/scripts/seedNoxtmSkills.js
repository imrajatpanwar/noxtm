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
  systemPrompt: `You are Noxtm Bot, a warm friendly workspace setup assistant for Noxtm — a modern workspace platform.
You are helping a new user set up their workspace. Be warm, conversational, concise (under 25 words).
Never reveal you are AI or a bot. No markdown. Use the user's first name if known.`,
  questions: [
    {
      id: 'q_companyName',
      prompt: 'What would you like to name your workspace?',
      fieldPath: 'companyName',
      type: 'text',
      required: true,
      placeholder: 'Company or workspace name',
      validator: 'minLength:2',
      retryPrompt: 'Hmm, need at least 2 characters. What should I call your workspace?',
      extractionHint: 'the company or workspace name',
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
    },
    {
      id: 'q_companyWebsite',
      prompt: 'Do you have a company website? (optional — paste the URL or say skip)',
      fieldPath: 'companyWebsite',
      type: 'url',
      required: false,
      skippable: true,
      placeholder: 'https://yourcompany.com',
      extractionHint: 'a website URL',
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
      placeholder: 'e.g. India, United States',
      extractionHint: 'country name',
    },
    {
      id: 'q_description',
      prompt: 'Give a short description of what the company does (optional):',
      fieldPath: 'description',
      type: 'textarea',
      required: false,
      skippable: true,
      placeholder: 'We help companies...',
      extractionHint: 'short company description',
    },
  ],
  onComplete: {
    action: 'createCompany',
    redirect: '/pricing',
    message: 'All set! Your workspace is ready. Taking you to pick a plan.',
  },
  version: 1,
};

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/noxtm';
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('[Seed] Connected.');

  const existing = await NoxtmSkill.findOne({ slug: 'company-setup', companyId: null });
  if (existing) {
    console.log('[Seed] company-setup skill exists. Updating questions + prompt...');
    existing.name = companySetupSkill.name;
    existing.description = companySetupSkill.description;
    existing.systemPrompt = companySetupSkill.systemPrompt;
    existing.questions = companySetupSkill.questions;
    existing.onComplete = companySetupSkill.onComplete;
    existing.version = (existing.version || 1) + 1;
    await existing.save();
    console.log('[Seed] Updated. version =', existing.version);
  } else {
    const s = new NoxtmSkill(companySetupSkill);
    await s.save();
    console.log('[Seed] Created company-setup skill:', s._id.toString());
  }

  await mongoose.disconnect();
  console.log('[Seed] Done.');
}

run().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
