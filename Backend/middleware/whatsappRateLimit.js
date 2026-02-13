const rateLimit = require('express-rate-limit');

// Rate limiter for WhatsApp message sending (API calls)
const whatsappMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.companyId || 'anon'}:wa-msg`,
  message: {
    success: false,
    message: 'Too many messages. Please slow down.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for WhatsApp account operations (link/unlink)
const whatsappAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 account operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.companyId || 'anon'}:wa-acct`,
  message: {
    success: false,
    message: 'Too many account operations. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for campaign starts
const whatsappCampaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 campaign starts per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.companyId || 'anon'}:wa-campaign`,
  message: {
    success: false,
    message: 'Too many campaigns started. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// General API rate limiter for WhatsApp routes
const whatsappApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.companyId || 'anon'}:wa-api`,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  whatsappMessageLimiter,
  whatsappAccountLimiter,
  whatsappCampaignLimiter,
  whatsappApiLimiter
};
