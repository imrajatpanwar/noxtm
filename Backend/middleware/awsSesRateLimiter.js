const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 50, 2000);
  },
  lazyConnect: true
});

let redisConnected = false;
redisClient.on('error', (err) => {
  if (!redisConnected) {
    console.warn('⚠️  Redis not available for AWS SES rate limiting (optional for local dev)');
    redisConnected = false;
  }
});
redisClient.on('connect', () => {
  console.log('✓ Redis connected for AWS SES Rate Limiting');
  redisConnected = true;
});

// Try to connect to Redis
redisClient.connect().catch(() => {
  console.warn('⚠️  Redis connection failed - AWS SES rate limiting disabled (optional for local dev)');
});

// Global: 14 emails per second (AWS SES limit)
const globalSESLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'aws_ses_global',
  points: 14,
  duration: 1,
  blockDuration: 0,
  execEvenly: true,
  execEvenlyMinDelayMs: Math.floor(1000 / 14),
});

// Per User: 100 emails per hour
const perUserSESLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'aws_ses_user',
  points: 100,
  duration: 60 * 60,
  blockDuration: 0,
});

// Per Domain: 500 emails per hour
const perDomainSESLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'aws_ses_domain',
  points: 500,
  duration: 60 * 60,
  blockDuration: 0,
});

async function consumeRateLimit(userId, domain = null) {
  try {
    const checks = [
      globalSESLimiter.consume('global', 1),
      perUserSESLimiter.consume(userId, 1)
    ];

    if (domain) {
      checks.push(perDomainSESLimiter.consume(domain, 1));
    }

    const results = await Promise.all(checks);

    return {
      allowed: true,
      limits: {
        global: { remaining: results[0].remainingPoints, resetMs: results[0].msBeforeNext },
        user: { remaining: results[1].remainingPoints, resetMs: results[1].msBeforeNext },
        domain: domain ? { remaining: results[2].remainingPoints, resetMs: results[2].msBeforeNext } : null
      }
    };
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      return {
        allowed: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${Math.ceil(error.msBeforeNext / 1000)} seconds.`,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
        limits: { remaining: error.remainingPoints, resetMs: error.msBeforeNext }
      };
    }
    throw new Error('Rate limiter temporarily unavailable');
  }
}

function awsSESRateLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.user?._id?.toString();
  const domain = req.body?.fromDomain || req.body?.domain;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }

  consumeRateLimit(userId, domain)
    .then(result => {
      if (result.allowed) {
        req.rateLimits = result.limits;
        next();
      } else {
        res.status(429).json({
          success: false,
          error: result.error,
          message: result.message,
          retryAfter: result.retryAfter
        });
      }
    })
    .catch(error => {
      console.error('Rate limit error:', error);
      res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE' });
    });
}

module.exports = {
  consumeRateLimit,
  awsSESRateLimitMiddleware,
  redisClient
};
