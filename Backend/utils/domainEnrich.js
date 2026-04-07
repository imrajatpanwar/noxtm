/**
 * Domain enrichment: extract company data from email/domain.
 * - Scrapes website for favicon (processed via sharp: white bg + square)
 * - Scrapes homepage metadata (title, description, keywords)
 * - Uses Claude Haiku to generate company description + detect industry/country
 * - Falls back to Clearbit Autocomplete for company name detection
 */
const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { callClaude } = require('./aiHelpers');

const AUTOCOMPLETE_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest';

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profile-images');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cache to avoid repeated API calls (in-memory, 1 hour TTL)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

// Industries list (must match seed script options)
const INDUSTRIES = [
  'Technology', 'Marketing', 'Healthcare', 'Finance', 'Education',
  'E-commerce', 'Real Estate', 'Manufacturing', 'Media', 'Consulting',
  'Legal', 'Non-profit', 'Hospitality', 'Retail', 'Automotive',
  'Agriculture', 'Construction', 'Energy', 'Entertainment', 'Food & Beverage',
  'Insurance', 'Logistics', 'Pharmaceutical', 'Sports', 'Telecom',
  'Design', 'SaaS', 'Agency', 'Freelance', 'Other',
];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractDomain(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();

  // From email
  const emailMatch = str.match(/@([\w.-]+\.\w+)/);
  if (emailMatch) {
    const domain = emailMatch[1];
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'live.com'];
    if (freeProviders.includes(domain)) return null;
    return domain;
  }

  // From URL
  const urlMatch = str.match(/(?:https?:\/\/)?(?:www\.)?([\w.-]+\.\w+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

// ===== FAVICON EXTRACTION =====
function extractFaviconUrl(domain, $) {
  if (!$) return `https://${domain}/favicon.ico`;

  // Priority: apple-touch-icon > icon > shortcut icon > fallback
  const selectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="icon"][sizes="192x192"]',
    'link[rel="icon"][sizes="128x128"]',
    'link[rel="icon"][sizes="96x96"]',
    'link[rel="icon"][sizes="64x64"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];

  for (const sel of selectors) {
    const href = $(sel).attr('href');
    if (href) {
      // Resolve relative URLs
      if (href.startsWith('//')) return `https:${href}`;
      if (href.startsWith('/')) return `https://${domain}${href}`;
      if (href.startsWith('http')) return href;
      return `https://${domain}/${href}`;
    }
  }

  return `https://${domain}/favicon.ico`;
}

// ===== PROCESS FAVICON WITH SHARP =====
async function processFavicon(faviconUrl, domain) {
  try {
    const response = await axios.get(faviconUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'User-Agent': USER_AGENT },
      maxRedirects: 3,
    });

    if (!response.data || response.data.length < 100) return null;

    const buffer = Buffer.from(response.data);

    // Check if it's an ICO file (may need special handling)
    const isIco = faviconUrl.endsWith('.ico') || (buffer[0] === 0x00 && buffer[1] === 0x00);

    let imageBuffer;
    if (isIco) {
      // For ICO files, try to process directly — sharp handles most ICO formats
      try {
        imageBuffer = await sharp(buffer)
          .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toBuffer();
      } catch (icoErr) {
        // If ICO fails, try converting with raw pixel extraction
        console.warn('[Favicon] ICO processing failed, trying PNG fallback');
        return null;
      }
    } else {
      imageBuffer = await sharp(buffer)
        .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();
    }

    const filename = `favicon-${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}.png`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, imageBuffer);

    return `/uploads/profile-images/${filename}`;
  } catch (err) {
    console.warn('[Favicon] processFavicon failed:', err.message);
    return null;
  }
}

// ===== SCRAPE HOMEPAGE =====
async function scrapeHomepage(domain) {
  try {
    const res = await axios.get(`https://${domain}`, {
      timeout: 6000,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
      maxRedirects: 3,
      validateStatus: s => s < 400,
    });

    const html = res.data;
    if (!html || typeof html !== 'string') return null;

    const $ = cheerio.load(html);

    const title = $('title').first().text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';
    const keywords = $('meta[name="keywords"]').attr('content')?.trim() || '';

    // Get first meaningful paragraph
    let firstParagraph = '';
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && !firstParagraph) {
        firstParagraph = text.substring(0, 300);
      }
    });

    // Extract favicon URL from parsed HTML
    const faviconUrl = extractFaviconUrl(domain, $);

    return { title, metaDescription, ogDescription, keywords, firstParagraph, faviconUrl };
  } catch (err) {
    console.warn('[Enrich] scrapeHomepage failed for', domain, ':', err.message);
    return null;
  }
}

// ===== LLM DESCRIPTION GENERATION =====
async function generateDescription(scrapedData, companyName, domain) {
  try {
    const context = [
      scrapedData.title && `Website title: ${scrapedData.title}`,
      scrapedData.metaDescription && `Meta description: ${scrapedData.metaDescription}`,
      scrapedData.ogDescription && `OG description: ${scrapedData.ogDescription}`,
      scrapedData.keywords && `Keywords: ${scrapedData.keywords}`,
      scrapedData.firstParagraph && `First paragraph: ${scrapedData.firstParagraph}`,
      companyName && `Company name: ${companyName}`,
      `Domain: ${domain}`,
    ].filter(Boolean).join('\n');

    const sys = `You are a company analyst. Given website metadata, return a JSON object with exactly these fields:
- "description": A professional 1-2 sentence company description (max 120 chars). Don't start with "The".
- "industry": Must be one of: ${INDUSTRIES.join(', ')}. Pick the closest match.
- "country": The country where the company is based (full name, e.g. "India", "United States"). If unclear, return null.

Return ONLY valid JSON, no markdown, no explanation. Example:
{"description":"Digital marketing agency specializing in SEO, social media, and brand strategy.","industry":"Marketing","country":"India"}`;

    const out = await callClaude(
      [{ role: 'system', content: sys }, { role: 'user', content: context }],
      'claude-haiku-4-5-20251001',
      80
    );

    if (!out) return null;

    const cleaned = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate industry
    if (parsed.industry && !INDUSTRIES.includes(parsed.industry)) {
      // Try fuzzy match
      const lower = parsed.industry.toLowerCase();
      const match = INDUSTRIES.find(i => i.toLowerCase() === lower || i.toLowerCase().includes(lower) || lower.includes(i.toLowerCase()));
      parsed.industry = match || null;
    }

    return {
      description: parsed.description || null,
      industry: parsed.industry || null,
      country: parsed.country || null,
    };
  } catch (err) {
    console.warn('[Enrich] generateDescription failed:', err.message);
    return null;
  }
}

// ===== MAIN ENRICHMENT =====
async function enrichFromDomain(domain) {
  if (!domain) return null;

  // Check cache
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const result = {
    domain,
    logoUrl: null,
    processedLogoPath: null,
    companyName: null,
    industry: null,
    description: null,
    country: null,
    website: `https://${domain}`,
  };

  // Run Clearbit (for company name) + scrape homepage in parallel
  const [clearbitResult, scraped] = await Promise.all([
    (async () => {
      try {
        const res = await axios.get(AUTOCOMPLETE_URL, {
          params: { query: domain },
          timeout: 3000,
        });
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const match = res.data.find(c => c.domain === domain) || res.data[0];
          return { companyName: match.name || null };
        }
        return null;
      } catch (e) {
        return null;
      }
    })(),
    scrapeHomepage(domain),
  ]);

  // Company name: Clearbit > fallback from domain
  if (clearbitResult?.companyName) {
    result.companyName = clearbitResult.companyName;
  } else {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      result.companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  // Process favicon from scraped HTML
  if (scraped?.faviconUrl) {
    const processedPath = await processFavicon(scraped.faviconUrl, domain);
    if (processedPath) {
      result.processedLogoPath = processedPath;
    }
  }

  // If no favicon found from HTML, try /favicon.ico directly
  if (!result.processedLogoPath) {
    const fallbackPath = await processFavicon(`https://${domain}/favicon.ico`, domain);
    if (fallbackPath) {
      result.processedLogoPath = fallbackPath;
    }
  }

  // LLM description generation from scraped data
  if (scraped) {
    const llmResult = await generateDescription(scraped, result.companyName, domain);
    if (llmResult) {
      result.description = llmResult.description;
      result.industry = llmResult.industry;
      result.country = llmResult.country;
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
    industry: enriched.industry,
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
