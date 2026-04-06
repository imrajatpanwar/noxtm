/**
 * Domain enrichment: extract company data from email/domain.
 * Uses free Clearbit Autocomplete API (no key needed) + logo.clearbit.com.
 * Falls back to basic domain parsing if API fails.
 */
const axios = require('axios');

const LOGO_BASE = 'https://logo.clearbit.com';
const AUTOCOMPLETE_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest';

// Cache to avoid repeated API calls (in-memory, 1 hour TTL)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function extractDomain(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();

  // From email
  const emailMatch = str.match(/@([\w.-]+\.\w+)/);
  if (emailMatch) {
    const domain = emailMatch[1];
    // Skip free email providers
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'live.com'];
    if (freeProviders.includes(domain)) return null;
    return domain;
  }

  // From URL
  const urlMatch = str.match(/(?:https?:\/\/)?(?:www\.)?([\w.-]+\.\w+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

async function enrichFromDomain(domain) {
  if (!domain) return null;

  // Check cache
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const result = {
    domain,
    logoUrl: `${LOGO_BASE}/${domain}`,
    companyName: null,
    industry: null,
    description: null,
    country: null,
    website: null,
  };

  try {
    const res = await axios.get(AUTOCOMPLETE_URL, {
      params: { query: domain },
      timeout: 3000,
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const match = res.data.find(c => c.domain === domain) || res.data[0];
      result.companyName = match.name || null;
      result.website = match.domain ? `https://${match.domain}` : null;
      result.logoUrl = match.logo || result.logoUrl;
    }
  } catch (e) {
    // Fallback: derive company name from domain
    const parts = domain.split('.');
    if (parts.length >= 2) {
      result.companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  // Cache the result
  cache.set(domain, { data: result, ts: Date.now() });

  // Clean old cache entries periodically
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL) cache.delete(k);
    }
  }

  return result;
}

// Map enriched data to skill field paths
function mapEnrichedToFields(enriched, skill) {
  if (!enriched) return {};
  const mapped = {};

  const fieldMap = {
    companyName: enriched.companyName,
    companyWebsite: enriched.website,
    companyCountry: enriched.country,
    description: enriched.description,
  };

  for (const q of (skill?.questions || [])) {
    const val = fieldMap[q.fieldPath];
    if (val && val !== '') {
      mapped[q.fieldPath] = val;
    }
  }

  return mapped;
}

module.exports = {
  extractDomain,
  enrichFromDomain,
  mapEnrichedToFields,
};
