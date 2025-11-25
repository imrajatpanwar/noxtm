const NoxtmExhibitorCrawler = require('./noxtm-Exhibitor-Crawler');

// Registry of all available crawlers
const crawlers = {
  noxtmExhibitor: {
    class: NoxtmExhibitorCrawler,
    name: 'NoxtmExhibitor',
    displayName: 'noxtm-Exhibitor-Crawler',
    description: 'Extract exhibitor data from trade show websites',
    metadata: {
      fullName: 'Exhibitor Data Crawler',
      industry: 'Trade Shows'
    }
  }
};

/**
 * Get all available crawlers
 */
function getAllCrawlers() {
  return Object.keys(crawlers).map(key => ({
    id: key,
    ...crawlers[key],
    class: undefined // Don't expose class in API
  }));
}

/**
 * Get a specific crawler instance
 */
function getCrawler(crawlerId) {
  const crawlerConfig = crawlers[crawlerId];
  if (!crawlerConfig) {
    throw new Error(`Crawler "${crawlerId}" not found`);
  }
  return new crawlerConfig.class();
}

/**
 * Check if a crawler exists
 */
function crawlerExists(crawlerId) {
  return crawlers.hasOwnProperty(crawlerId);
}

module.exports = {
  getAllCrawlers,
  getCrawler,
  crawlerExists
};
