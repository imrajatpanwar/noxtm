const redis = require('redis');

// Create Redis client
let redisClient = null;
let isRedisAvailable = false;

async function initializeRedis() {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.warn('⚠️  Redis not available, caching disabled:', error.message);
    isRedisAvailable = false;
    return false;
  }
}

// Cache keys
const CACHE_PREFIX = 'noxtm:email';
const CACHE_TTL = 300; // 5 minutes

function getCacheKey(accountId, folder, page) {
  return `${CACHE_PREFIX}:list:${accountId}:${folder}:${page}`;
}

function getEmailBodyCacheKey(accountId, uid) {
  return `${CACHE_PREFIX}:body:${accountId}:${uid}`;
}

function getStatsKey(accountId) {
  return `${CACHE_PREFIX}:stats:${accountId}`;
}

/**
 * Cache email list
 */
async function cacheEmailList(accountId, folder, page, emails, total) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const key = getCacheKey(accountId, folder, page);
    const data = JSON.stringify({ emails, total, cachedAt: Date.now() });
    await redisClient.setEx(key, CACHE_TTL, data);
    return true;
  } catch (error) {
    console.error('Error caching email list:', error);
    return false;
  }
}

/**
 * Get cached email list
 */
async function getCachedEmailList(accountId, folder, page) {
  if (!isRedisAvailable || !redisClient) return null;
  
  try {
    const key = getCacheKey(accountId, folder, page);
    const cached = await redisClient.get(key);
    
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    console.log(`📦 Cache HIT for ${accountId}/${folder}/page${page} (age: ${Math.round((Date.now() - data.cachedAt) / 1000)}s)`);
    return { emails: data.emails, total: data.total };
  } catch (error) {
    console.error('Error retrieving cached email list:', error);
    return null;
  }
}

/**
 * Cache single email body
 */
async function cacheEmailBody(accountId, uid, emailData) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const key = getEmailBodyCacheKey(accountId, uid);
    const data = JSON.stringify(emailData);
    await redisClient.setEx(key, CACHE_TTL * 2, data); // 10 minutes for email bodies
    return true;
  } catch (error) {
    console.error('Error caching email body:', error);
    return false;
  }
}

/**
 * Get cached email body
 */
async function getCachedEmailBody(accountId, uid) {
  if (!isRedisAvailable || !redisClient) return null;
  
  try {
    const key = getEmailBodyCacheKey(accountId, uid);
    const cached = await redisClient.get(key);
    
    if (!cached) return null;
    
    console.log(`📦 Cache HIT for email body ${accountId}/${uid}`);
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error retrieving cached email body:', error);
    return null;
  }
}

/**
 * Cache inbox stats
 */
async function cacheInboxStats(accountId, stats) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const key = getStatsKey(accountId);
    const data = JSON.stringify(stats);
    await redisClient.setEx(key, CACHE_TTL, data);
    return true;
  } catch (error) {
    console.error('Error caching inbox stats:', error);
    return false;
  }
}

/**
 * Get cached inbox stats
 */
async function getCachedInboxStats(accountId) {
  if (!isRedisAvailable || !redisClient) return null;
  
  try {
    const key = getStatsKey(accountId);
    const cached = await redisClient.get(key);
    
    if (!cached) return null;
    
    console.log(`📦 Cache HIT for inbox stats ${accountId}`);
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error retrieving cached inbox stats:', error);
    return null;
  }
}

/**
 * Invalidate all cache for an account
 */
async function invalidateAccountCache(accountId) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const pattern = `${CACHE_PREFIX}:*:${accountId}:*`;
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
      console.log(`🗑️  Invalidated ${keys.length} cache entries for account ${accountId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error invalidating account cache:', error);
    return false;
  }
}

/**
 * Invalidate cache for specific folder
 */
async function invalidateFolderCache(accountId, folder) {
  if (!isRedisAvailable || !redisClient) return false;
  
  try {
    const pattern = `${CACHE_PREFIX}:list:${accountId}:${folder}:*`;
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
      console.log(`🗑️  Invalidated ${keys.length} cache entries for ${accountId}/${folder}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error invalidating folder cache:', error);
    return false;
  }
}

module.exports = {
  initializeRedis,
  cacheEmailList,
  getCachedEmailList,
  cacheEmailBody,
  getCachedEmailBody,
  cacheInboxStats,
  getCachedInboxStats,
  invalidateAccountCache,
  invalidateFolderCache,
  isRedisAvailable: () => isRedisAvailable
};
