const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const ANTHROPIC_MODEL_REPLACEMENTS = {
  'claude-3-haiku-20240307': DEFAULT_ANTHROPIC_MODEL,
  'claude-3-5-haiku-20241022': DEFAULT_ANTHROPIC_MODEL,
  'claude-3-sonnet-20240229': 'claude-sonnet-4-6',
  'claude-3-5-sonnet-20240620': 'claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
  'claude-3-7-sonnet-20250219': 'claude-sonnet-4-6',
  'claude-sonnet-4-20250514': 'claude-sonnet-4-6',
  'claude-3-opus-20240229': 'claude-opus-4-7',
  'claude-opus-4-20250514': 'claude-opus-4-7'
};

function normalizeAnthropicModel(model) {
  if (!model) return DEFAULT_ANTHROPIC_MODEL;
  return ANTHROPIC_MODEL_REPLACEMENTS[model] || model;
}

module.exports = {
  DEFAULT_ANTHROPIC_MODEL,
  normalizeAnthropicModel
};
