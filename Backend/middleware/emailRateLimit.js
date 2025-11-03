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
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Rate limit by email address only
    return req.body.email ? req.body.email.toLowerCase() : 'no-email';
  },
  skip: (req) => !req.body.email, // Skip rate limiting if no email provided
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for verification email: ${req.body.email || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many verification code requests from this email. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) // minutes
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
  keyGenerator: (req, res) => {
    // Rate limit by email address only
    return req.body.email ? req.body.email.toLowerCase() : 'no-email';
  },
  skip: (req) => !req.body.email, // Skip rate limiting if no email provided
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for password reset: ${req.body.email || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests from this email. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) // minutes
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
  keyGenerator: (req, res) => {
    // Rate limit by authenticated user ID only
    return req.user ? req.user.userId.toString() : 'no-user';
  },
  skip: (req) => !req.user, // Skip rate limiting if not authenticated
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for invitation: ${req.user?.userId || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many invitation requests. You can send up to 10 invitations per hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) // minutes
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
  keyGenerator: (req, res) => {
    // Rate limit by authenticated user ID only
    return req.user ? req.user.userId.toString() : 'no-user';
  },
  skip: (req) => !req.user, // Skip rate limiting if not authenticated
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for template email: ${req.user?.userId || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many email sends. You can send up to 50 emails per hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) // minutes
    });
  }
});

// Global email rate limiter (per IP) - prevents brute force from single IP
const globalEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // Limit each IP to 100 email-related requests per hour
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't use keyGenerator - let express-rate-limit handle IP properly
  handler: (req, res) => {
    console.warn(`⚠️  Global rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from your IP address. Please try again in 1 hour.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60) // minutes
    });
  }
});

module.exports = {
  verificationEmailLimiter,
  passwordResetLimiter,
  invitationEmailLimiter,
  templateEmailLimiter,
  globalEmailLimiter
};
