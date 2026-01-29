const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Generate unique tracking ID
 */
const generateTrackingId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Inject tracking pixel into HTML email
 */
const injectTrackingPixel = (html, trackingId) => {
  const pixelUrl = `${API_URL}/api/tracking/pixel/${trackingId}`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  
  // Inject before closing body tag, or at the end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  }
  return html + pixelHtml;
};

/**
 * Replace links with tracking links
 */
const injectLinkTracking = (html, trackingId) => {
  const linkRegex = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;
  
  return html.replace(linkRegex, (match, before, url, after) => {
    // Skip mailto, tel, and anchor links
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    
    // Skip unsubscribe links (already tracked)
    if (url.includes('/tracking/unsubscribe/')) {
      return match;
    }
    
    const trackingUrl = `${API_URL}/api/tracking/click/${trackingId}?url=${encodeURIComponent(url)}`;
    return `<a ${before}${trackingUrl}${after}>`;
  });
};

/**
 * Add unsubscribe link to email
 */
const addUnsubscribeLink = (html, trackingId) => {
  const unsubscribeUrl = `${API_URL}/api/tracking/unsubscribe/${trackingId}`;
  const unsubscribeHtml = `
    <div style="text-align:center;padding:20px;font-size:12px;color:#999;border-top:1px solid #eee;margin-top:20px;">
      <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a> from this mailing list.
    </div>
  `;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${unsubscribeHtml}</body>`);
  }
  return html + unsubscribeHtml;
};

/**
 * Process email HTML with all tracking
 */
const processEmailForTracking = (html, trackingId, options = {}) => {
  const {
    trackOpens = true,
    trackClicks = true,
    addUnsubscribe = true
  } = options;
  
  let processedHtml = html;
  
  // Add unsubscribe link first (so it doesn't get wrapped in tracking)
  if (addUnsubscribe) {
    processedHtml = addUnsubscribeLink(processedHtml, trackingId);
  }
  
  // Replace links with tracking links
  if (trackClicks) {
    processedHtml = injectLinkTracking(processedHtml, trackingId);
  }
  
  // Add tracking pixel
  if (trackOpens) {
    processedHtml = injectTrackingPixel(processedHtml, trackingId);
  }
  
  return processedHtml;
};

/**
 * Generate tracking URLs for an email
 */
const generateTrackingUrls = (trackingId) => {
  return {
    trackingId,
    pixelUrl: `${API_URL}/api/tracking/pixel/${trackingId}`,
    unsubscribeUrl: `${API_URL}/api/tracking/unsubscribe/${trackingId}`,
    clickBaseUrl: `${API_URL}/api/tracking/click/${trackingId}`
  };
};

module.exports = {
  generateTrackingId,
  injectTrackingPixel,
  injectLinkTracking,
  addUnsubscribeLink,
  processEmailForTracking,
  generateTrackingUrls
};
