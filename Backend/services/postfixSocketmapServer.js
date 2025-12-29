// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const net = require('net');
const mongoose = require('mongoose');
const { LRUCache } = require('lru-cache');

// Import models
const EmailDomain = require('../models/EmailDomain');
const EmailAccount = require('../models/EmailAccount');

// Configuration
const PORT = process.env.SOCKETMAP_PORT || 9999;
const HOST = '127.0.0.1'; // Localhost only for security
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

// LRU Cache configuration
const domainCache = new LRUCache({
  max: 1000,           // Max 1000 domains
  ttl: 60 * 1000,      // 60 seconds TTL
  updateAgeOnGet: true // Update TTL on cache hit
});

const mailboxCache = new LRUCache({
  max: 10000,          // Max 10000 mailboxes
  ttl: 60 * 1000,      // 60 seconds TTL
  updateAgeOnGet: true
});

// Statistics
const stats = {
  queries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  domainQueries: 0,
  mailboxQueries: 0
};

// MongoDB connection
console.log(`[SOCKETMAP] Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('[SOCKETMAP] ✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('[SOCKETMAP] ❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.error('[SOCKETMAP] ⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[SOCKETMAP] ✅ MongoDB reconnected');
});

// Socketmap protocol: netstring format
// Request:  <length>:<mapname> <key>,
// Response: <length>:OK <value>,  OR  <length>:NOTFOUND ,

/**
 * Parse netstring format
 * @param {String} data - Raw netstring data
 * @returns {Object} - Parsed map and key
 */
function parseNetstringRequest(data) {
  try {
    const colonIndex = data.indexOf(':');
    if (colonIndex === -1) {
      throw new Error('Invalid netstring format: no colon found');
    }

    const length = parseInt(data.substring(0, colonIndex));
    if (isNaN(length)) {
      throw new Error('Invalid netstring format: invalid length');
    }

    const content = data.substring(colonIndex + 1, colonIndex + 1 + length);
    const parts = content.trim().split(' ');

    if (parts.length < 2) {
      throw new Error('Invalid socketmap request: missing map or key');
    }

    const mapName = parts[0];
    const key = parts.slice(1).join(' ').replace(/,\s*$/, ''); // Handle keys with spaces and remove trailing comma

    return { mapName, key };
  } catch (error) {
    console.error('[SOCKETMAP] Parse error:', error.message);
    return null;
  }
}

/**
 * Format response in netstring format
 * @param {String} response - Response string
 * @returns {String} - Netstring formatted response
 */
function formatNetstringResponse(response) {
  const content = response;
  const length = Buffer.byteLength(content);
  return `${length}:${content},`;
}

/**
 * Query domain validity from MongoDB
 * @param {String} domain - Domain to check
 * @returns {Promise<Boolean>} - True if domain is valid
 */
async function queryDomain(domain) {
  const startTime = Date.now();
  stats.domainQueries++;

  try {
    // Check cache first
    const cached = domainCache.get(domain);
    if (cached !== undefined) {
      stats.cacheHits++;
      console.log(`[SOCKETMAP] Domain cache HIT: ${domain} (${Date.now() - startTime}ms)`);
      return cached;
    }

    stats.cacheMisses++;

    // Query MongoDB
    const emailDomain = await EmailDomain.findOne({
      domain: domain,
      enabled: true,
      verified: true
    }).lean().maxTimeMS(5000); // 5 second timeout

    const isValid = emailDomain !== null;

    // Cache the result
    domainCache.set(domain, isValid);

    console.log(`[SOCKETMAP] Domain query: ${domain} = ${isValid ? 'OK' : 'NOTFOUND'} (${Date.now() - startTime}ms)`);
    return isValid;
  } catch (error) {
    stats.errors++;
    console.error(`[SOCKETMAP] Domain query error for ${domain}:`, error.message);
    // Fail-safe: return false on error
    return false;
  }
}

/**
 * Query mailbox validity from MongoDB
 * @param {String} email - Email address to check
 * @returns {Promise<String|null>} - Maildir path if valid, null otherwise
 */
async function queryMailbox(email) {
  const startTime = Date.now();
  stats.mailboxQueries++;

  try {
    // Check cache first
    const cached = mailboxCache.get(email);
    if (cached !== undefined) {
      stats.cacheHits++;
      console.log(`[SOCKETMAP] Mailbox cache HIT: ${email} (${Date.now() - startTime}ms)`);
      return cached;
    }

    stats.cacheMisses++;

    // Query MongoDB
    const emailAccount = await EmailAccount.findOne({
      email: email,
      enabled: true
    }).lean().maxTimeMS(5000); // 5 second timeout

    if (!emailAccount) {
      mailboxCache.set(email, null);
      console.log(`[SOCKETMAP] Mailbox query: ${email} = NOTFOUND (${Date.now() - startTime}ms)`);
      return null;
    }

    // Extract domain and localpart for Dovecot maildir path
    const [localpart, domain] = email.split('@');
    if (!localpart || !domain) {
      console.error(`[SOCKETMAP] Invalid email format: ${email}`);
      return null;
    }

    // Dovecot maildir format: domain/localpart/
    const maildirPath = `${domain}/${localpart}/`;

    // Cache the result
    mailboxCache.set(email, maildirPath);

    console.log(`[SOCKETMAP] Mailbox query: ${email} = OK ${maildirPath} (${Date.now() - startTime}ms)`);
    return maildirPath;
  } catch (error) {
    stats.errors++;
    console.error(`[SOCKETMAP] Mailbox query error for ${email}:`, error.message);
    // Fail-safe: return null on error
    return null;
  }
}

/**
 * Handle socketmap query
 * @param {String} mapName - Map name (domains or mailboxes)
 * @param {String} key - Query key
 * @returns {Promise<String>} - Response string
 */
async function handleQuery(mapName, key) {
  stats.queries++;

  // Input validation
  if (!key || key.length > 255) {
    console.error(`[SOCKETMAP] Invalid key length: ${key ? key.length : 0}`);
    return 'NOTFOUND ';
  }

  // Sanitize key (prevent injection)
  const sanitizedKey = key.trim().toLowerCase();

  try {
    if (mapName === 'domains') {
      const isValid = await queryDomain(sanitizedKey);
      return isValid ? 'OK ' : 'NOTFOUND ';
    } else if (mapName === 'mailboxes') {
      const maildirPath = await queryMailbox(sanitizedKey);
      return maildirPath ? `OK ${maildirPath}` : 'NOTFOUND ';
    } else {
      console.error(`[SOCKETMAP] Unknown map: ${mapName}`);
      return 'NOTFOUND ';
    }
  } catch (error) {
    stats.errors++;
    console.error(`[SOCKETMAP] Query error:`, error.message);
    return 'NOTFOUND ';
  }
}

// Create TCP server
const server = net.createServer((socket) => {
  const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[SOCKETMAP] Client connected: ${clientId}`);

  // Set timeout
  socket.setTimeout(30000); // 30 seconds

  socket.on('data', async (data) => {
    const requestStr = data.toString().trim();
    console.log(`[SOCKETMAP] Request from ${clientId}: ${requestStr}`);

    // Parse request
    const parsed = parseNetstringRequest(requestStr);
    if (!parsed) {
      console.error(`[SOCKETMAP] Invalid request format from ${clientId}`);
      socket.write(formatNetstringResponse('NOTFOUND '));
      return;
    }

    const { mapName, key } = parsed;

    // Handle query
    const response = await handleQuery(mapName, key);
    const formattedResponse = formatNetstringResponse(response);

    // Send response
    socket.write(formattedResponse);
    console.log(`[SOCKETMAP] Response to ${clientId}: ${response}`);
  });

  socket.on('timeout', () => {
    console.error(`[SOCKETMAP] Socket timeout: ${clientId}`);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error(`[SOCKETMAP] Socket error from ${clientId}:`, err.message);
  });

  socket.on('end', () => {
    console.log(`[SOCKETMAP] Client disconnected: ${clientId}`);
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`[SOCKETMAP] ✅ Server listening on ${HOST}:${PORT}`);
  console.log(`[SOCKETMAP] Ready to handle Postfix socketmap queries`);
});

// Error handling
server.on('error', (err) => {
  console.error('[SOCKETMAP] ❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[SOCKETMAP] Port ${PORT} is already in use`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SOCKETMAP] Shutting down gracefully...');
  server.close(() => {
    console.log('[SOCKETMAP] Server closed');
    mongoose.connection.close(false, () => {
      console.log('[SOCKETMAP] MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n[SOCKETMAP] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[SOCKETMAP] Server closed');
    mongoose.connection.close(false, () => {
      console.log('[SOCKETMAP] MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Log statistics every 5 minutes
setInterval(() => {
  const cacheHitRate = stats.queries > 0
    ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(2)
    : 0;

  console.log(`[SOCKETMAP] Stats: Queries=${stats.queries}, Hits=${stats.cacheHits}, Misses=${stats.cacheMisses}, ` +
    `HitRate=${cacheHitRate}%, Errors=${stats.errors}, Domains=${stats.domainQueries}, Mailboxes=${stats.mailboxQueries}`);
}, 5 * 60 * 1000);

console.log('[SOCKETMAP] Server starting...');
