const { callClaude } = require('./aiHelpers');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// Confidence levels: 1.0 = regex/exact, 0.85 = direct text, 0.7 = LLM single, 0.6 = LLM bulk, 0.3 = fallback
const CONFIDENCE = {
  REGEX: 1.0,
  EXACT_MATCH: 1.0,
  CONTAINED_MATCH: 0.9,
  DIRECT_TEXT: 0.85,
  LLM_SINGLE: 0.7,
  LLM_BULK: 0.6,
  FALLBACK: 0.3,
};

// ===== SKIP INTENT =====
const SKIP_PATTERNS = /^\s*(skip|pass|later|none|no thanks?|n\/?a|not now|dunno|don'?t know|idk|no idea|prefer not|leave blank|empty)\s*\.?\s*$/i;

function isSkipIntent(msg) {
  if (!msg) return false;
  return SKIP_PATTERNS.test(String(msg).trim());
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
// Returns { value, confidence, method }
async function extractValue(userMsg, question, model) {
  const raw = (userMsg || '').trim();
  if (!raw) return { value: null, confidence: 0, method: 'direct' };

  // Regex fast paths
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

  // Direct text types — trust the input
  if (['text', 'textarea', 'url', 'phone'].includes(question.type)) {
    return { value: raw, confidence: CONFIDENCE.DIRECT_TEXT, method: 'direct' };
  }

  // LLM extraction fallback
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

// ===== BULK EXTRACTION (with confidence) =====
// Returns { fields: { fieldPath: value }, confidence, method }
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
function getNextQuestion(skill, collected, skipped = []) {
  for (const q of skill.questions) {
    if (collected[q.fieldPath] !== undefined && collected[q.fieldPath] !== null && collected[q.fieldPath] !== '') continue;
    if (skipped.includes(q.id)) continue;
    if (!evaluateCondition(q.condition, collected)) continue;
    return q;
  }
  return null;
}

// ===== PROMPT BUILD =====
function buildSkillSystemPrompt(skill, currentQuestion, collected) {
  const base = skill.systemPrompt || `You are Noxtm Bot collecting information for ${skill.name}. Be warm, concise, conversational (under 30 words). Never reveal you are AI. No markdown.`;
  const q = currentQuestion;
  const questionContext = q ? `
Currently asking: ${q.prompt}
Field: ${q.fieldPath} (type: ${q.type}${q.options?.length ? `, options: ${q.options.join(', ')}` : ''})
${q.placeholder ? `Placeholder guidance: ${q.placeholder}` : ''}
${q.skippable ? 'This field is optional — user can say "skip".' : ''}` : '';
  return `${base}
Skill: ${skill.name}
Collected so far: ${JSON.stringify(collected)}
${questionContext}

Ask the current question naturally. Keep it under 25 words.`;
}

// ===== MAIN RUNNER =====
// Returns: { reply, currentQuestionId, collected, skipped, complete, onComplete, uiAction, turnAudit[] }
async function runSkillTurn({ skill, session, userMsg, model, conversationHistory = [] }) {
  const collected = session.collected || {};
  const skipped = session.skipped || [];
  const useModel = model || DEFAULT_MODEL;
  const turnAudit = [];

  let currentQuestion = session.currentQuestionId
    ? skill.questions.find(q => q.id === session.currentQuestionId)
    : getNextQuestion(skill, collected, skipped);

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
        currentQuestion = getNextQuestion(skill, collected, skipped);
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
          reply: `${currentQuestion.prompt.replace(/\?$/, '')} is required to continue — a short answer works.`,
          currentQuestionId: currentQuestion.id,
          collected,
          skipped,
          uiAction: currentQuestion.uiAction || null,
          complete: false,
          turnAudit,
        };
      }
    } else {
      // Try bulk extraction first
      const remaining = skill.questions.filter(q => {
        if (collected[q.fieldPath] !== undefined && collected[q.fieldPath] !== null && collected[q.fieldPath] !== '') return false;
        if (skipped.includes(q.id)) return false;
        if (!evaluateCondition(q.condition, collected)) return false;
        return true;
      });

      const bulkResult = await bulkExtract(userMsg, remaining, useModel);
      const bulkKeys = Object.keys(bulkResult.fields);

      if (bulkKeys.length >= 2) {
        // Multi-field extraction
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
        currentQuestion = getNextQuestion(skill, collected, skipped);
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
            reply: retryPrompt,
            currentQuestionId: currentQuestion.id,
            collected,
            skipped,
            uiAction: currentQuestion.uiAction || null,
            complete: false,
            turnAudit,
          };
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
        currentQuestion = getNextQuestion(skill, collected, skipped);
      }
    }
  }

  // Complete
  if (!currentQuestion) {
    return {
      reply: skill.onComplete?.message || `All done! Moving to the next step.`,
      currentQuestionId: null,
      collected,
      skipped,
      uiAction: null,
      complete: true,
      onComplete: skill.onComplete,
      turnAudit,
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
    const sys = buildSkillSystemPrompt(skill, currentQuestion, collected);
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
    reply = currentQuestion.prompt;
  }

  return {
    reply,
    currentQuestionId: currentQuestion.id,
    collected,
    skipped,
    uiAction: currentQuestion.uiAction || null,
    complete: false,
    turnAudit,
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
  CONFIDENCE,
};
