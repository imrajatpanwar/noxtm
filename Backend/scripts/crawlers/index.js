const EurobikeCrawler = require('./eurobike');
const CESCrawler = require('./ces');

// Registry of all available crawlers
const crawlers = {
  eurobike: {
    class: EurobikeCrawler,
    name: 'Eurobike',
    displayName: 'Eurobike Trade Show',
    description: 'Extract exhibitor data from Eurobike trade show website',
    metadata: {
      fullName: 'Eurobike Frankfurt',
      location: 'Frankfurt, Germany',
      date: '2025-07-13',
      website: 'https://eurobike.com'
    }
  },
  ces: {
    class: CESCrawler,
    name: 'CES',
    displayName: 'CES (Consumer Electronics Show)',
    description: 'Extract exhibitor data from CES trade show',
    metadata: {
      fullName: 'Consumer Electronics Show (CES)',
      location: 'Las Vegas, USA',
      date: '2026-01-07',
      website: 'https://ces.tech'
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
