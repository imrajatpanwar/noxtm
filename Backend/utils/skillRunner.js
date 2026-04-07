const { callClaude } = require('./aiHelpers');
const { extractDomain, enrichFromDomain, mapEnrichedToFields, countryFromTimezone } = require('./domainEnrich');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// Confidence levels
const CONFIDENCE = {
  REGEX: 1.0,
  EXACT_MATCH: 1.0,
  CONTAINED_MATCH: 0.9,
  DIRECT_TEXT: 0.85,
  LLM_SINGLE: 0.7,
  LLM_BULK: 0.6,
  ENRICH: 0.95,
  FALLBACK: 0.3,
  LOW_THRESHOLD: 0.5,
};

// ===== SKIP / DEFER INTENT =====
const SKIP_PATTERNS = /^\s*(skip|pass|later|none|no thanks?|n\/?a|not now|dunno|don'?t know|idk|no idea|prefer not|leave blank|empty)\s*\.?\s*$/i;
const DEFER_PATTERNS = /^\s*(defer|do it later|come back|remind me|fill later|not yet|next time|postpone)\s*\.?\s*$/i;

function isSkipIntent(msg) {
  if (!msg) return false;
  return SKIP_PATTERNS.test(String(msg).trim());
}

function isDeferIntent(msg) {
  if (!msg) return false;
  return DEFER_PATTERNS.test(String(msg).trim());
}

// ===== TEMPLATE VARS =====
// Interpolate {{varName}} in strings using collected data + user context
function interpolate(str, vars) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{{${key}}}`;
  });
}

// ===== VALIDATORS =====
function validateAnswer(value, question) {
  if (!value && question.required) return { ok: false, reason: 'empty' };
  if (!value) return { ok: true, value: null };

  const v = String(value).trim();

  switch (question.type) {
    case 'email': {
      const m = v.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (!m) return { ok: false, reason: 'invalid_email' };
      return { ok: true, value: m[0].toLowerCase() };
    }
    case 'url': {
      if (!/^https?:\/\//i.test(v) && !/^[\w-]+\.[\w-]+/.test(v)) return { ok: false, reason: 'invalid_url' };
      return { ok: true, value: v };
    }
    case 'phone': {
      const digits = v.replace(/[^\d+]/g, '');
      if (digits.length < 7) return { ok: false, reason: 'invalid_phone' };
      return { ok: true, value: v };
    }
    case 'number': {
      const n = Number(v);
      if (Number.isNaN(n)) return { ok: false, reason: 'not_a_number' };
      return { ok: true, value: n };
    }
    case 'select': {
      if (!question.options || question.options.length === 0) return { ok: true, value: v };
      const match = question.options.find(o => o.toLowerCase() === v.toLowerCase()) ||
                    question.options.find(o => v.toLowerCase().includes(o.toLowerCase())) ||
                    question.options.find(o => o.toLowerCase().includes(v.toLowerCase()));
      if (!match) return { ok: false, reason: 'not_in_options' };
      return { ok: true, value: match };
    }
    case 'multiselect': {
      const parts = v.split(/[,;/]/).map(x => x.trim()).filter(Boolean);
      if (!question.options || question.options.length === 0) return { ok: true, value: parts };
      const matched = parts.map(p => question.options.find(o => o.toLowerCase() === p.toLowerCase())).filter(Boolean);
      if (matched.length === 0) return { ok: false, reason: 'not_in_options' };
      return { ok: true, value: matched };
    }
    default: {
      const minLen = parseMinLen(question.validator);
      if (v.length < minLen) return { ok: false, reason: 'too_short' };
      return { ok: true, value: v };
    }
  }
}

function parseMinLen(validator) {
  if (!validator) return 1;
  const m = String(validator).match(/minLength:(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

// ===== EXTRACTION (with confidence) =====
async function extractValue(userMsg, question, model) {
  const raw = (userMsg || '').trim();
  if (!raw) return { value: null, confidence: 0, method: 'direct' };

  if (question.type === 'email') {
    const m = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) return { value: m[0].toLowerCase(), confidence: CONFIDENCE.REGEX, method: 'regex' };
  }
  if (question.type === 'select' && question.options?.length) {
    const lower = raw.toLowerCase();
    const direct = question.options.find(o => lower === o.toLowerCase());
    if (direct) return { value: direct, confidence: CONFIDENCE.EXACT_MATCH, method: 'regex' };
    const contained = question.options.find(o => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower));
    if (contained) return { value: contained, confidence: CONFIDENCE.CONTAINED_MATCH, method: 'regex' };
  }
  if (question.type === 'number') {
    const m = raw.match(/-?\d+(\.\d+)?/);
    if (m) return { value: Number(m[0]), confidence: CONFIDENCE.REGEX, method: 'regex' };
  }

  if (['text', 'textarea', 'url', 'phone'].includes(question.type)) {
    return { value: raw, confidence: CONFIDENCE.DIRECT_TEXT, method: 'direct' };
  }

  try {
    const hint = question.extractionHint || question.prompt;
    const sys = `Extract ONLY the value requested. Return raw value, no quotes, no explanation. If unclear, return NONE.
Question: ${question.prompt}
What to extract: ${hint}
Type: ${question.type}${question.options?.length ? `\nOptions: ${question.options.join(', ')}` : ''}`;
    const out = await callClaude(
      [{ role: 'system', content: sys }, { role: 'user', content: raw }],
      model || DEFAULT_MODEL,
      20
    );
    const clean = (out || '').trim().replace(/^["']|["']$/g, '');
    if (!clean || clean.toUpperCase() === 'NONE') return { value: null, confidence: 0, method: 'llm' };
    return { value: clean, confidence: CONFIDENCE.LLM_SINGLE, method: 'llm' };
  } catch (e) {
    return { value: raw, confidence: CONFIDENCE.FALLBACK, method: 'llm' };
  }
}

// ===== BULK EXTRACTION =====
async function bulkExtract(userMsg, remainingQuestions, model) {
  const raw = (userMsg || '').trim();
  if (!raw || raw.length < 10 || !remainingQuestions.length) return { fields: {}, confidence: 0 };

  const hasMultipleHints = /[,;\n]/.test(raw) || raw.split(/\s+/).length >= 6;
  if (!hasMultipleHints) return { fields: {}, confidence: 0 };

  try {
    const fieldList = remainingQuestions.map(q =>
      `- ${q.fieldPath} (${q.type}): ${q.prompt}${q.options?.length ? ` [options: ${q.options.join('|')}]` : ''}`
    ).join('\n');

    const sys = `You extract structured data from user messages. Given a list of fields and a user message, return a JSON object with ONLY the fields you can confidently extract from the message. Omit fields you cannot find. Return ONLY valid JSON, no markdown, no explanation.

Fields to extract:
${fieldList}

Rules:
- For select fields, value MUST be one of the given options (exact match).
- For email/url/phone, return the raw string.
- For number, return a JSON number.
- If a field is not clearly present in the message, omit it from the output.
- Output format: {"fieldPath": "value", ...}`;

    const out = await callClaude(
      [{ role: 'system', content: sys }, { role: 'user', content: raw }],
      model || DEFAULT_MODEL,
      200
    );

    if (!out) return { fields: {}, confidence: 0 };
    const cleaned = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { fields: {}, confidence: 0 };

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed !== 'object') return { fields: {}, confidence: 0 };

    const result = {};
    for (const q of remainingQuestions) {
      if (!(q.fieldPath in parsed)) continue;
      const val = parsed[q.fieldPath];
      if (val === null || val === undefined || val === '') continue;
      const validation = validateAnswer(val, q);
      if (validation.ok && validation.value !== null) {
        result[q.fieldPath] = validation.value;
      }
    }
    return { fields: result, confidence: CONFIDENCE.LLM_BULK };
  } catch (e) {
    return { fields: {}, confidence: 0 };
  }
}

// ===== AUTO-ENRICH =====
async function tryAutoEnrich(collected, skill) {
  if (!skill.autoEnrich) return {};

  // Try email domain first, then website domain
  let domain = null;
  if (collected.companyEmail) domain = extractDomain(collected.companyEmail);
  if (!domain && collected.companyWebsite) domain = extractDomain(collected.companyWebsite);
  if (!domain) return {};

  const enriched = await enrichFromDomain(domain);
  if (!enriched) return {};

  const mapped = mapEnrichedToFields(enriched, skill);
  // Only return fields that aren't already collected
  const newFields = {};
  for (const [k, v] of Object.entries(mapped)) {
    if (!collected[k] || collected[k] === '') {
      newFields[k] = v;
    }
  }

  // Attach metadata (not field values — prefixed with _)
  if (enriched.processedLogoPath) newFields._enrichedLogo = enriched.processedLogoPath;
  if (enriched.domain) newFields._enrichedDomain = enriched.domain;
  if (enriched.description) newFields._enrichedDescription = enriched.description;
  if (enriched.industry) newFields._enrichedIndustry = enriched.industry;
  if (enriched.country) newFields._enrichedCountry = enriched.country;
  if (enriched.city) newFields._enrichedCity = enriched.city;
  if (enriched.companyName) newFields._enrichedCompanyName = enriched.companyName;
  if (enriched.website) newFields._enrichedWebsite = enriched.website;
  if (enriched.phone) newFields._enrichedPhone = enriched.phone;
  if (enriched.address) newFields._enrichedAddress = enriched.address;
  if (enriched.socialLinks && Object.keys(enriched.socialLinks).length) newFields._enrichedSocialLinks = enriched.socialLinks;
  if (enriched.techStack?.length) newFields._enrichedTechStack = enriched.techStack;
  if (enriched.specialties?.length) newFields._enrichedSpecialties = enriched.specialties;
  if (enriched.foundedYear) newFields._enrichedFoundedYear = enriched.foundedYear;
  if (enriched.size) newFields._enrichedSize = enriched.size;
  if (enriched.headquarters) newFields._enrichedHeadquarters = enriched.headquarters;
  if (enriched.followerCount) newFields._enrichedFollowerCount = enriched.followerCount;

  return newFields;
}

// ===== LLM FOLLOW-UP =====
// Generate a clarifying question when confidence is low
async function generateFollowUp(question, extractedValue, confidence, model) {
  if (!question.allowFollowUp) return null;
  if (confidence >= 0.85) return null;

  try {
    const hint = question.followUpHint || question.prompt;
    const sys = `You are a friendly assistant. The user answered "${extractedValue}" for the question: "${hint}".
The answer seems uncertain (confidence: ${Math.round(confidence * 100)}%).
Generate a SHORT (under 20 words) clarifying question to confirm or get a better answer.
No markdown. Be natural and conversational.`;
    const out = await callClaude(
      [{ role: 'system', content: sys }, { role: 'user', content: `Confirm: ${extractedValue}` }],
      model || DEFAULT_MODEL,
      25
    );
    return out?.trim() || null;
  } catch (e) {
    return null;
  }
}

// ===== CONDITION EVAL =====
function evaluateCondition(condStr, collected) {
  if (!condStr) return true;
  const parts = String(condStr).split(':');
  const field = parts[0];
  if (parts.length === 1) return Boolean(collected[field]);
  const expected = parts.slice(1).join(':');
  const actual = collected[field];
  if (expected.startsWith('!')) return String(actual).toLowerCase() !== expected.slice(1).toLowerCase();
  return String(actual).toLowerCase() === expected.toLowerCase();
}

// ===== NEXT QUESTION =====
function getNextQuestion(skill, collected, skipped = [], deferred = []) {
  for (const q of skill.questions) {
    if (collected[q.fieldPath] !== undefined && collected[q.fieldPath] !== null && collected[q.fieldPath] !== '') continue;
    if (skipped.includes(q.id)) continue;
    if (deferred.includes(q.id)) continue;
    if (!evaluateCondition(q.condition, collected)) continue;
    return q;
  }
  // If all non-deferred are done but deferred remain, return first deferred
  for (const q of skill.questions) {
    if (collected[q.fieldPath] !== undefined && collected[q.fieldPath] !== null && collected[q.fieldPath] !== '') continue;
    if (skipped.includes(q.id)) continue;
    if (!deferred.includes(q.id)) continue;
    if (!evaluateCondition(q.condition, collected)) continue;
    return q;
  }
  return null;
}

// ===== PROMPT BUILD =====
function buildSkillSystemPrompt(skill, currentQuestion, collected, userContext = {}) {
  const vars = { ...collected, ...userContext };
  const base = interpolate(
    skill.systemPrompt || `You are Noxtm Bot collecting information for ${skill.name}. Be warm, concise, conversational (under 30 words). Never reveal you are AI. No markdown.`,
    vars
  );
  const q = currentQuestion;
  const questionContext = q ? `
Currently asking: ${interpolate(q.prompt, vars)}
Field: ${q.fieldPath} (type: ${q.type}${q.options?.length ? `, options: ${q.options.join(', ')}` : ''})
${q.placeholder ? `Placeholder guidance: ${q.placeholder}` : ''}
${q.skippable ? 'This field is optional — user can say "skip".' : ''}
${q.deferrable ? 'User can say "later" to defer this question.' : ''}` : '';
  return `${base}
Skill: ${skill.name}
Collected so far: ${JSON.stringify(collected)}
${questionContext}

Ask the current question naturally using template variables if present. Keep it under 25 words.`;
}

// ===== MAIN RUNNER =====
async function runSkillTurn({ skill, session, userMsg, model, conversationHistory = [], userContext = {} }) {
  const collected = session.collected || {};
  const skipped = session.skipped || [];
  const deferred = session.deferred || [];
  const useModel = model || DEFAULT_MODEL;
  const turnAudit = [];
  let enrichResult = null;

  // Merge template vars
  const vars = { ...collected, ...userContext };

  let currentQuestion = session.currentQuestionId
    ? skill.questions.find(q => q.id === session.currentQuestionId)
    : getNextQuestion(skill, collected, skipped, deferred);

  // Handle user message
  if (userMsg && currentQuestion) {
    // Skip intent
    if (isSkipIntent(userMsg)) {
      if (currentQuestion.skippable || !currentQuestion.required) {
        turnAudit.push({
          questionId: currentQuestion.id,
          fieldPath: currentQuestion.fieldPath,
          userMessage: userMsg,
          extractedValue: null,
          confidence: 0,
          method: 'skip',
          valid: true,
        });
        skipped.push(currentQuestion.id);
        currentQuestion = getNextQuestion(skill, collected, skipped, deferred);
      } else {
        turnAudit.push({
          questionId: currentQuestion.id,
          fieldPath: currentQuestion.fieldPath,
          userMessage: userMsg,
          extractedValue: null,
          confidence: 0,
          method: 'skip',
          valid: false,
          retryReason: 'required_field',
        });
        return {
          reply: interpolate(`${currentQuestion.prompt.replace(/\?$/, '')} is required to continue — a short answer works.`, vars),
          currentQuestionId: currentQuestion.id,
          collected,
          skipped,
          deferred,
          uiAction: currentQuestion.uiAction || null,
          complete: false,
          turnAudit,
        };
      }
    }
    // Defer intent (progressive profiling)
    else if (isDeferIntent(userMsg) && (currentQuestion.deferrable || (skill.allowDefer && !currentQuestion.required))) {
      turnAudit.push({
        questionId: currentQuestion.id,
        fieldPath: currentQuestion.fieldPath,
        userMessage: userMsg,
        extractedValue: null,
        confidence: 0,
        method: 'defer',
        valid: true,
      });
      deferred.push(currentQuestion.id);
      currentQuestion = getNextQuestion(skill, collected, skipped, deferred);
    }
    else {
      // Try bulk extraction first
      const remaining = skill.questions.filter(q => {
        if (collected[q.fieldPath] !== undefined && collected[q.fieldPath] !== null && collected[q.fieldPath] !== '') return false;
        if (skipped.includes(q.id)) return false;
        if (deferred.includes(q.id)) return false;
        if (!evaluateCondition(q.condition, collected)) return false;
        return true;
      });

      const bulkResult = await bulkExtract(userMsg, remaining, useModel);
      const bulkKeys = Object.keys(bulkResult.fields);

      if (bulkKeys.length >= 2) {
        Object.assign(collected, bulkResult.fields);
        for (const fieldPath of bulkKeys) {
          const q = remaining.find(r => r.fieldPath === fieldPath);
          turnAudit.push({
            questionId: q?.id || fieldPath,
            fieldPath,
            userMessage: userMsg,
            extractedValue: bulkResult.fields[fieldPath],
            confidence: bulkResult.confidence,
            method: 'bulk',
            valid: true,
          });
        }

        // Try auto-enrich after bulk
        enrichResult = await tryAutoEnrich(collected, skill);
        if (enrichResult && Object.keys(enrichResult).filter(k => !k.startsWith('_')).length > 0) {
          for (const [k, v] of Object.entries(enrichResult)) {
            if (!k.startsWith('_')) {
              collected[k] = v;
              turnAudit.push({
                questionId: k,
                fieldPath: k,
                userMessage: '[auto-enriched]',
                extractedValue: v,
                confidence: CONFIDENCE.ENRICH,
                method: 'enrich',
                valid: true,
              });
            }
          }
        }

        currentQuestion = getNextQuestion(skill, collected, skipped, deferred);
      } else {
        // Single-field path
        const extraction = await extractValue(userMsg, currentQuestion, useModel);
        const validation = validateAnswer(extraction.value, currentQuestion);

        if (!validation.ok) {
          turnAudit.push({
            questionId: currentQuestion.id,
            fieldPath: currentQuestion.fieldPath,
            userMessage: userMsg,
            extractedValue: extraction.value,
            confidence: extraction.confidence,
            method: extraction.method,
            valid: false,
            retryReason: validation.reason,
          });

          const retryPrompt = currentQuestion.retryPrompt ||
            `Hmm, that doesn't look right. Could you try again?`;
          return {
            reply: interpolate(retryPrompt, vars),
            currentQuestionId: currentQuestion.id,
            collected,
            skipped,
            deferred,
            uiAction: currentQuestion.uiAction || null,
            complete: false,
            turnAudit,
          };
        }

        // LLM follow-up: re-ask if low confidence
        if (currentQuestion.allowFollowUp && extraction.confidence < CONFIDENCE.LOW_THRESHOLD) {
          const followUp = await generateFollowUp(currentQuestion, validation.value, extraction.confidence, useModel);
          if (followUp) {
            turnAudit.push({
              questionId: currentQuestion.id,
              fieldPath: currentQuestion.fieldPath,
              userMessage: userMsg,
              extractedValue: validation.value,
              confidence: extraction.confidence,
              method: 'followup',
              valid: true,
              retryReason: 'low_confidence_followup',
            });
            return {
              reply: followUp,
              currentQuestionId: currentQuestion.id,
              collected,
              skipped,
              deferred,
              uiAction: currentQuestion.uiAction || null,
              complete: false,
              turnAudit,
              isFollowUp: true,
            };
          }
        }

        turnAudit.push({
          questionId: currentQuestion.id,
          fieldPath: currentQuestion.fieldPath,
          userMessage: userMsg,
          extractedValue: validation.value,
          confidence: extraction.confidence,
          method: extraction.method,
          valid: true,
        });

        collected[currentQuestion.fieldPath] = validation.value;

        // Auto-enrich after email/website collected
        if (currentQuestion.triggerEnrich || ['companyEmail', 'companyWebsite'].includes(currentQuestion.fieldPath)) {
          enrichResult = await tryAutoEnrich(collected, skill);
          if (enrichResult && Object.keys(enrichResult).filter(k => !k.startsWith('_')).length > 0) {
            for (const [k, v] of Object.entries(enrichResult)) {
              if (!k.startsWith('_')) {
                collected[k] = v;
                turnAudit.push({
                  questionId: k,
                  fieldPath: k,
                  userMessage: '[auto-enriched]',
                  extractedValue: v,
                  confidence: CONFIDENCE.ENRICH,
                  method: 'enrich',
                  valid: true,
                });
              }
            }
          }
          // Timezone country fallback: if enrichment didn't find country, use browser timezone
          if (enrichResult && !enrichResult._enrichedCountry && !collected.companyCountry && userContext.timezone) {
            const tzCountry = countryFromTimezone(userContext.timezone);
            if (tzCountry) {
              collected.companyCountry = tzCountry;
              enrichResult._enrichedCountry = tzCountry;
              turnAudit.push({ questionId: 'companyCountry', fieldPath: 'companyCountry', userMessage: '[timezone-detected]', extractedValue: tzCountry, confidence: 0.7, method: 'enrich', valid: true });
            }
          }
        }

        currentQuestion = getNextQuestion(skill, collected, skipped, deferred);
      }
    }
  }

  // Complete
  if (!currentQuestion) {
    return {
      reply: interpolate(skill.onComplete?.message || `All done! Moving to the next step.`, vars),
      currentQuestionId: null,
      collected,
      skipped,
      deferred,
      uiAction: null,
      complete: true,
      onComplete: skill.onComplete,
      turnAudit,
      enrichResult: enrichResult ? {
        logo: enrichResult._enrichedLogo,
        domain: enrichResult._enrichedDomain,
        companyName: enrichResult._enrichedCompanyName,
        description: enrichResult._enrichedDescription,
        industry: enrichResult._enrichedIndustry,
        country: enrichResult._enrichedCountry,
        website: enrichResult._enrichedWebsite,
        pendingConfirmation: true,
      } : null,
    };
  }

  // Generate next-question reply
  const sanitized = [];
  for (const msg of conversationHistory.slice(-6)) {
    if (!msg || !msg.role || !msg.content) continue;
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    if (sanitized.length && sanitized[sanitized.length - 1].role === role) continue;
    sanitized.push({ role, content: msg.content });
  }

  let reply;
  try {
    const sys = buildSkillSystemPrompt(skill, currentQuestion, collected, userContext);
    const msgs = [
      { role: 'system', content: sys },
      ...sanitized,
      { role: 'user', content: userMsg || 'Continue' },
    ];
    while (msgs.length > 1 && msgs[msgs.length - 1].role === msgs[msgs.length - 2].role && msgs[msgs.length - 1].role !== 'system') {
      msgs.splice(msgs.length - 2, 1);
    }
    reply = await callClaude(msgs, useModel, 35);
  } catch (e) {
    reply = interpolate(currentQuestion.prompt, vars);
  }

  return {
    reply,
    currentQuestionId: currentQuestion.id,
    collected,
    skipped,
    deferred,
    uiAction: currentQuestion.uiAction || null,
    complete: false,
    turnAudit,
    enrichResult: enrichResult ? {
      logo: enrichResult._enrichedLogo,
      domain: enrichResult._enrichedDomain,
      companyName: enrichResult._enrichedCompanyName,
      description: enrichResult._enrichedDescription,
      industry: enrichResult._enrichedIndustry,
      country: enrichResult._enrichedCountry,
      city: enrichResult._enrichedCity,
      website: enrichResult._enrichedWebsite,
      phone: enrichResult._enrichedPhone,
      address: enrichResult._enrichedAddress,
      socialLinks: enrichResult._enrichedSocialLinks,
      techStack: enrichResult._enrichedTechStack,
      specialties: enrichResult._enrichedSpecialties,
      foundedYear: enrichResult._enrichedFoundedYear,
      size: enrichResult._enrichedSize,
      headquarters: enrichResult._enrichedHeadquarters,
      followerCount: enrichResult._enrichedFollowerCount,
      pendingConfirmation: true,
    } : null,
  };
}

module.exports = {
  runSkillTurn,
  validateAnswer,
  extractValue,
  bulkExtract,
  getNextQuestion,
  evaluateCondition,
  isSkipIntent,
  isDeferIntent,
  interpolate,
  tryAutoEnrich,
  CONFIDENCE,
};
