const rateLimit = require('express-rate-limit');

// Rate limiter for email verification codes (signup)
const verificationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // Limit each email to 3 verification requests per hour
  message: {
    success: false,
    message: 'Too many verification code requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email address
    return `email:${req.body.email ? req.body.email.toLowerCase() : 'none'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for verification email: ${req.body.email || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Too many verification code requests from this email. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60)
    });
  }
});

// Rate limiter for password reset emails
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // Limit each email to 3 reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email address
    return `reset:${req.body.email ? req.body.email.toLowerCase() : 'none'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for password reset: ${req.body.email || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests from this email. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60)
    });
  }
});

// Rate limiter for company invitations
const invitationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Limit each user to 10 invitation sends per hour
  message: {
    success: false,
    message: 'Too many invitation requests. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by authenticated user ID
    return `invite:${req.user ? req.user.userId.toString() : 'none'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for invitation: ${req.user?.userId || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Too many invitation requests. You can send up to 10 invitations per hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60)
    });
  }
});

// Rate limiter for template email sends
const templateEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 50, // Limit each user to 50 email sends per hour
  message: {
    success: false,
    message: 'Too many email sends. Please try again in an hour.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by authenticated user ID
    return `template:${req.user ? req.user.userId.toString() : 'none'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for template email: ${req.user?.userId || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Too many email sends. You can send up to 50 emails per hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60)
    });
  }
});

// Global rate limiter
const globalEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  verificationEmailLimiter,
  passwordResetLimiter,
  invitationEmailLimiter,
  templateEmailLimiter,
  globalEmailLimiter
};
