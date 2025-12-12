const rateLimit = require('express-rate-limit');

// Rate limiter for email verification codes (signup)
const verificationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification code requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for password reset emails
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  validate: {trustProxy: false}, // Disable proxy validation
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for company invitations
const invitationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many invitation requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for template email sends
const templateEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many email sends. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Global rate limiter
const globalEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  verificationEmailLimiter,
  passwordResetLimiter,
  invitationEmailLimiter,
  templateEmailLimiter,
  globalEmailLimiter
};
