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

// Timezone → Country mapping (covers major timezones)
const TZ_COUNTRY_MAP = {
  'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India', 'Asia/Mumbai': 'India',
  'America/New_York': 'United States', 'America/Chicago': 'United States', 'America/Denver': 'United States',
  'America/Los_Angeles': 'United States', 'America/Phoenix': 'United States',
  'Europe/London': 'United Kingdom', 'Europe/Paris': 'France', 'Europe/Berlin': 'Germany',
  'Europe/Amsterdam': 'Netherlands', 'Europe/Rome': 'Italy', 'Europe/Madrid': 'Spain',
  'Europe/Moscow': 'Russia', 'Europe/Istanbul': 'Turkey', 'Europe/Warsaw': 'Poland',
  'Asia/Tokyo': 'Japan', 'Asia/Shanghai': 'China', 'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Singapore': 'Singapore', 'Asia/Dubai': 'UAE', 'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Seoul': 'South Korea', 'Asia/Bangkok': 'Thailand', 'Asia/Jakarta': 'Indonesia',
  'Asia/Karachi': 'Pakistan', 'Asia/Dhaka': 'Bangladesh', 'Asia/Manila': 'Philippines',
  'Australia/Sydney': 'Australia', 'Australia/Melbourne': 'Australia',
  'Pacific/Auckland': 'New Zealand',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada',
  'America/Sao_Paulo': 'Brazil', 'America/Mexico_City': 'Mexico', 'America/Argentina/Buenos_Aires': 'Argentina',
  'Africa/Lagos': 'Nigeria', 'Africa/Cairo': 'Egypt', 'Africa/Johannesburg': 'South Africa',
  'Africa/Nairobi': 'Kenya',
};

function countryFromTimezone(tz) {
  if (!tz) return null;
  return TZ_COUNTRY_MAP[tz] || null;
}

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

    // Extract social media links
    const socialLinks = {};
    const allLinks = [];
    $('a[href]').each((_, el) => { allLinks.push($(el).attr('href') || ''); });
    const fullHtml = html;

    for (const href of allLinks) {
      if (!socialLinks.linkedin && /linkedin\.com\/(company|in)\//i.test(href)) socialLinks.linkedin = href;
      if (!socialLinks.twitter && /(twitter\.com|x\.com)\//i.test(href)) socialLinks.twitter = href;
      if (!socialLinks.facebook && /facebook\.com\//i.test(href)) socialLinks.facebook = href;
      if (!socialLinks.instagram && /instagram\.com\//i.test(href)) socialLinks.instagram = href;
    }

    // Extract phone numbers
    let phone = '';
    const phonePatterns = [
      /(?:tel:|phone:|call\s*:?\s*)\s*([+\d][\d\s\-().]{7,})/i,
      /\b(\+\d{1,3}[\s\-]?\d{4,}[\d\s\-().]{3,})\b/,
    ];
    for (const pat of phonePatterns) {
      const m = fullHtml.match(pat);
      if (m) { phone = m[1].trim(); break; }
    }
    // Also check href="tel:"
    if (!phone) {
      const telHref = $('a[href^="tel:"]').first().attr('href');
      if (telHref) phone = telHref.replace('tel:', '').trim();
    }

    // Extract address from structured data or meta
    let address = '';
    const ldJson = $('script[type="application/ld+json"]').first().html();
    if (ldJson) {
      try {
        const ld = JSON.parse(ldJson);
        const addr = ld.address || ld?.location?.address;
        if (addr && typeof addr === 'object') {
          address = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean).join(', ');
        } else if (typeof addr === 'string') {
          address = addr;
        }
        // Also try to get phone from LD+JSON
        if (!phone && ld.telephone) phone = ld.telephone;
      } catch (e) { /* ignore */ }
    }

    // Detect tech stack from HTML hints
    const techStack = [];
    if (fullHtml.includes('react') || fullHtml.includes('__NEXT_DATA__')) techStack.push('React');
    if (fullHtml.includes('vue') || fullHtml.includes('Vue.js')) techStack.push('Vue.js');
    if (fullHtml.includes('angular')) techStack.push('Angular');
    if (fullHtml.includes('wp-content') || fullHtml.includes('wordpress')) techStack.push('WordPress');
    if (fullHtml.includes('shopify')) techStack.push('Shopify');
    if (fullHtml.includes('wix.com')) techStack.push('Wix');
    if (fullHtml.includes('squarespace')) techStack.push('Squarespace');
    if (fullHtml.includes('bootstrap')) techStack.push('Bootstrap');
    if (fullHtml.includes('tailwind')) techStack.push('Tailwind CSS');
    if (fullHtml.includes('jquery') || fullHtml.includes('jQuery')) techStack.push('jQuery');
    if ($('meta[name="generator"]').attr('content')) techStack.push($('meta[name="generator"]').attr('content'));

    return {
      title, metaDescription, ogDescription, keywords, firstParagraph, faviconUrl,
      socialLinks, phone, address, techStack,
    };
  } catch (err) {
    console.warn('[Enrich] scrapeHomepage failed for', domain, ':', err.message);
    return null;
  }
}

// ===== PROXYCURL LINKEDIN ENRICHMENT =====
async function enrichFromLinkedIn(linkedinUrl) {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey || !linkedinUrl) return null;

  try {
    const res = await axios.get('https://nubela.co/proxycurl/api/linkedin/company', {
      params: { url: linkedinUrl, use_cache: 'if-present' },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });

    const d = res.data;
    if (!d) return null;

    return {
      companyName: d.name || null,
      description: d.description || null,
      industry: d.industry || null,
      headquarters: d.hq?.city ? `${d.hq.city}, ${d.hq.state || ''}, ${d.hq.country || ''}`.replace(/, ,/g, ',').replace(/,$/, '') : null,
      country: d.hq?.country || null,
      foundedYear: d.founded_year || null,
      size: d.company_size_on_linkedin ? String(d.company_size_on_linkedin) : (d.company_size ? d.company_size[0] : null),
      specialties: d.specialities || [],
      followerCount: d.follower_count || null,
      logoUrl: d.profile_pic_url || null,
      website: d.website || null,
    };
  } catch (err) {
    console.warn('[Enrich] Proxycurl failed:', err.response?.status || err.message);
    return null;
  }
}

// ===== LLM DESCRIPTION + ANALYSIS =====
async function generateDescription(scrapedData, companyName, domain, proxycurlData) {
  try {
    const context = [
      scrapedData?.title && `Website title: ${scrapedData.title}`,
      scrapedData?.metaDescription && `Meta description: ${scrapedData.metaDescription}`,
      scrapedData?.ogDescription && `OG description: ${scrapedData.ogDescription}`,
      scrapedData?.keywords && `Keywords: ${scrapedData.keywords}`,
      scrapedData?.firstParagraph && `First paragraph: ${scrapedData.firstParagraph}`,
      scrapedData?.address && `Address found: ${scrapedData.address}`,
      scrapedData?.phone && `Phone found: ${scrapedData.phone}`,
      proxycurlData?.description && `LinkedIn description: ${proxycurlData.description}`,
      proxycurlData?.industry && `LinkedIn industry: ${proxycurlData.industry}`,
      proxycurlData?.headquarters && `LinkedIn HQ: ${proxycurlData.headquarters}`,
      proxycurlData?.specialties?.length && `LinkedIn specialties: ${proxycurlData.specialties.join(', ')}`,
      proxycurlData?.foundedYear && `Founded: ${proxycurlData.foundedYear}`,
      companyName && `Company name: ${companyName}`,
      `Domain: ${domain}`,
    ].filter(Boolean).join('\n');

    const sys = `You are a company analyst. Given website + LinkedIn metadata, return a JSON object with exactly these fields:
- "description": Professional 1-2 sentence company description (max 150 chars). Don't start with "The".
- "industry": Must be one of: ${INDUSTRIES.join(', ')}. Pick the closest match.
- "country": Country where HQ is based (full name, e.g. "India", "United States"). If unclear, return null.
- "city": City name if found, else null.
- "specialties": Array of 3-5 keyword specialties, e.g. ["SEO","Social Media","Web Design"]. Empty array if unknown.
- "employeeRange": One of "1-10","11-50","51-200","201-500","500+". Guess from context. null if unknown.

Return ONLY valid JSON, no markdown.`;

    const out = await callClaude(
      [{ role: 'system', content: sys }, { role: 'user', content: context }],
      'claude-haiku-4-5-20251001',
      120
    );

    if (!out) return null;

    const cleaned = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate industry
    if (parsed.industry && !INDUSTRIES.includes(parsed.industry)) {
      const lower = parsed.industry.toLowerCase();
      const match = INDUSTRIES.find(i => i.toLowerCase() === lower || i.toLowerCase().includes(lower) || lower.includes(i.toLowerCase()));
      parsed.industry = match || null;
    }

    return {
      description: parsed.description || null,
      industry: parsed.industry || null,
      country: parsed.country || null,
      city: parsed.city || null,
      specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
      employeeRange: parsed.employeeRange || null,
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
    processedLogoPath: null,
    companyName: null,
    industry: null,
    description: null,
    country: null,
    city: null,
    website: `https://${domain}`,
    phone: null,
    address: null,
    socialLinks: {},
    techStack: [],
    specialties: [],
    foundedYear: null,
    size: null,
    headquarters: null,
    annualRevenue: null,
    followerCount: null,
  };

  // Phase 1: Clearbit (name) + scrape homepage — run in parallel
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

  // Apply scraped data
  if (scraped) {
    if (scraped.socialLinks) result.socialLinks = scraped.socialLinks;
    if (scraped.phone) result.phone = scraped.phone;
    if (scraped.address) result.address = scraped.address;
    if (scraped.techStack?.length) result.techStack = scraped.techStack;
  }

  // Phase 2: Proxycurl (if LinkedIn URL found) — runs after scrape
  let proxycurlData = null;
  if (result.socialLinks?.linkedin) {
    proxycurlData = await enrichFromLinkedIn(result.socialLinks.linkedin);
    if (proxycurlData) {
      if (proxycurlData.companyName && !clearbitResult?.companyName) result.companyName = proxycurlData.companyName;
      if (proxycurlData.foundedYear) result.foundedYear = proxycurlData.foundedYear;
      if (proxycurlData.headquarters) result.headquarters = proxycurlData.headquarters;
      if (proxycurlData.specialties?.length) result.specialties = proxycurlData.specialties;
      if (proxycurlData.followerCount) result.followerCount = proxycurlData.followerCount;
      if (proxycurlData.size) result.size = proxycurlData.size;
      if (proxycurlData.website) result.website = proxycurlData.website;
    }
  }

  // Phase 3: Process favicon
  if (scraped?.faviconUrl) {
    const processedPath = await processFavicon(scraped.faviconUrl, domain);
    if (processedPath) result.processedLogoPath = processedPath;
  }
  if (!result.processedLogoPath) {
    const fallbackPath = await processFavicon(`https://${domain}/favicon.ico`, domain);
    if (fallbackPath) result.processedLogoPath = fallbackPath;
  }

  // Phase 4: LLM description generation (uses both scraped + proxycurl data)
  if (scraped || proxycurlData) {
    const llmResult = await generateDescription(scraped, result.companyName, domain, proxycurlData);
    if (llmResult) {
      result.description = llmResult.description;
      result.industry = llmResult.industry;
      result.country = llmResult.country;
      if (llmResult.city) result.city = llmResult.city;
      if (llmResult.specialties?.length && !result.specialties.length) result.specialties = llmResult.specialties;
      if (llmResult.employeeRange && !result.size) result.size = llmResult.employeeRange;
    }
  }

  // Cache the result
  cache.set(domain, { data: result, ts: Date.now() });

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
  countryFromTimezone,
};
